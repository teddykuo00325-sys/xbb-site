import {t, K, withLocaleMarker} from './i18n.js?v=audit1117b';
// 語音／文字快記「規則分不準時，用進階模式整理」：只負責組出送出的文字，以及把線上回傳的文字變成待核對卡片。
// 這個檔案不連網、不碰原生橋接；送出與等待在 voice-quick-ui.js。
// 只送「規則不確定」的句子（合計 1,000 字內）、毛孩名字（用 c1、c2 代號，不送真實編號）、今天日期與時區。
// 不送錄音、照片、其他紀錄。線上回來的只是 JSON 文字，絕不執行；一律逐項驗證，不合格的丟棄。
import {settleDraft,baseName,clampFutureWhen,FUTURE_TIME_REASON} from './voice-suggest.js?v=6';

export const VOICE_CLOUD_MODE = 'voice-draft';
export const VOICE_CLOUD_LIMITS = Object.freeze({sentenceChars: 1000, sentences: 24, draftsPerSentence: 6, resultMax: 12000, totalRows: 24});

// 八類，和 voice-quick-model.js 的 VOICE_KINDS 一致（測試會比對；這裡不 import 它，讓本檔保持純函式）。
const KINDS = ['food', 'water', 'elimination', 'weight', 'vomit', 'appetite', 'mood', 'other'];
const ELIMINATION = ['unknown', 'urine', 'stool'];
const DRAFT_KEYS = ['s', 'text', 'cat', 'kind', 'date', 'time', 'amount', 'unit', 'eliminationKind'];
const squash = text => String(text || '').replace(/\s+/g, ' ').trim();
const fail = message => { throw new Error(message); };

// 還有疑慮、而且還沒給進階模式整理過的卡片。
export const cloudCandidates = rows => (Array.isArray(rows) ? rows : []).filter(row => row && !row.cloud && row.uncertain?.length > 0);

export function localTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei'; } catch { return 'Asia/Taipei'; }
}

// 回傳 null＝沒有可送的句子。sent：送出的句子（keys 對回卡片）；catMap：代號→真實毛孩 id（只留在手機）。
// overflow：超過字數或張數上限而沒送的句數，這些卡片維持規則版結果。
// all=true：使用者在「更多」按「請線上重新整理這段話」（Ian 2026-11-13）→ 送全部卡片，不只不確定的；
// 兩種都一樣：同一句被拆成好幾張（「兩隻都…」各一張）時只送一次，線上結果整組換掉那幾張。
export function buildVoiceCloudRequest({rows = [], cats = [], today = '', timeZone = localTimeZone(), all = false} = {}) {
  const catMap = {}, catLines = [];
  cats.forEach(cat => {
    const name = baseName(cat?.profile?.name) || squash(cat?.profile?.name);   // 括號註記（「（示範）」）不送
    if (!name || !cat?.id) return;
    const code = 'c' + (catLines.length + 1);
    catMap[code] = cat.id;
    catLines.push(`${code}：${name}`);
  });
  const sent = [];
  let used = 0, overflow = 0;
  const pool = all ? (Array.isArray(rows) ? rows : []).filter(Boolean) : cloudCandidates(rows);
  const byText = new Map();
  for (const row of pool) {
    const text = squash(row.text);
    if (!text) continue;
    // 相同文字可能是兩次獨立觀察，只合併同一原句衍生的多貓卡。
    const sourceKey = row.sourceSentenceKey || (row.shared ? 'legacy-shared:'+text : 'independent:'+row.key);
    const groupKey = sourceKey+'\n'+text;
    const same = byText.get(groupKey);
    if (same) { same.keys.push(row.key); continue; }
    if (sent.length >= VOICE_CLOUD_LIMITS.sentences || used + text.length > VOICE_CLOUD_LIMITS.sentenceChars) { overflow++; continue; }
    used += text.length;
    const item = {id: 's' + (sent.length + 1), key: row.key, keys: [row.key], text};
    sent.push(item);
    byText.set(groupKey, item);
  }
  if (!sent.length) return null;
  // 英文介面加語言標記（M5）：只加在送出的 transcript；sent 裡的原句不動，本機比對照舊。
  const text = withLocaleMarker([
    K('任務：整理飼主說的話，指派毛孩並抽出紀錄。'),
    K(`今天：${today}（時區 ${timeZone}）`),
    K('毛孩：'),
    ...(catLines.length ? catLines : [K('（沒有）')]),
    K('句子：'),
    ...sent.map(item => `${item.id}：${item.text}`)
  ].join('\n'));
  return {text, sent, catMap, overflow, today, timeZone};
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) fail(t('線上沒有回傳整理結果。'));
  if (raw.length > VOICE_CLOUD_LIMITS.resultMax) fail(t('線上回傳的內容太長，無法使用。'));
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end < start) fail(t('線上回傳的內容不是整理結果的格式。'));
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { fail(t('線上回傳的內容不是整理結果的格式。')); }
}

const validDate = (value, today) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return '';
  return !today || value <= today ? value : '';
};
const validTime = value => (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '');

// 數量只認和手動核對相同的組合；不合格就清掉數量，不猜。
function quantity(kind, amount, unit) {
  const a = typeof amount === 'string' || typeof amount === 'number' ? String(amount).trim() : '';
  const u = typeof unit === 'string' ? unit.trim() : '';
  if (!a || !/^\d+(?:\.\d+)?$/.test(a) || !Number.isFinite(Number(a))) return {amount: '', unit: ''};
  const units = {water: ['ml', K('毫升')], weight: [K('公斤')], vomit: [K('次')]};
  if (!units[kind]?.includes(u)) return {amount: '', unit: ''};
  if (kind === 'weight' && Number(a) <= 0) return {amount: '', unit: ''};
  if (kind === 'vomit' && (!/^\d+$/.test(a) || Number(a) < 1)) return {amount: '', unit: ''};
  return {amount: a, unit: u};
}

// 回傳 {bySentence: Map(句子代號→合格欄位陣列), rejected}。每一項：text 必須逐字出現在送出的那一句；
// 不合格（句子代號不對、text 不在原句、類別不在八類）整項丟棄；毛孩代號不認得就留空（要使用者選）；
// 日期、時間、數量不合格就清空，改沿用卡片原本的值。
export function parseVoiceCloud(resultText, request) {
  const data = extractJson(resultText);
  if (data === null || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.drafts)) fail(t('線上回傳的內容不是整理結果的格式。'));
  const sentById = new Map(request.sent.map(item => [item.id, item]));
  const bySentence = new Map();
  let rejected = 0;
  for (const item of data.drafts) {
    if (item === null || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !DRAFT_KEYS.includes(key))) { rejected++; continue; }
    const sentence = sentById.get(item.s);
    const text = typeof item.text === 'string' ? squash(item.text) : '';
    if (!sentence || !text || !sentence.text.includes(text) || !KINDS.includes(item.kind)) { rejected++; continue; }
    const list = bySentence.get(sentence.id) || [];
    if (list.length >= VOICE_CLOUD_LIMITS.draftsPerSentence) { rejected++; continue; }
    const kind = item.kind;
    const {amount, unit} = quantity(kind, item.amount, item.unit);
    list.push({
      text, kind, amount, unit,
      cat: typeof item.cat === 'string' && Object.hasOwn(request.catMap, item.cat) ? item.cat : '',
      date: validDate(item.date, request.today), time: validTime(item.time),
      eliminationKind: kind === 'elimination' && ELIMINATION.includes(item.eliminationKind) ? item.eliminationKind : 'unknown'
    });
    bySentence.set(sentence.id, list);
  }
  if (!bySentence.size) fail(t('線上沒有整理出可用的結果，原本的卡片仍保留。'));
  return {bySentence, rejected};
}

// 把線上結果換進卡片：有結果的句子換成線上卡，沒結果的維持規則版。
// 線上卡一律標「已猜」（不擋儲存），但沒有判斷出毛孩時要擋（使用者選了才放行）。
export function applyVoiceCloud(rows, request, parsed, {cats = [], now = null} = {}) {
  const sentByKey = new Map(request.sent.flatMap(item => (item.keys || [item.key]).map(key => [key, item])));
  const onlyCat = cats.length === 1 ? cats[0].id : '';
  let serial = 0, replaced = 0;
  const out = [], done = new Set();
  for (const row of rows) {
    const sentence = sentByKey.get(row.key);
    const items = sentence ? parsed.bySentence.get(sentence.id) : null;
    if (!items?.length) { out.push(row); continue; }
    if (done.has(sentence.id)) continue;   // 同一句拆出的其他卡，已整組換成線上結果
    done.add(sentence.id);
    replaced++;
    for (const item of items) {
      const catId = onlyCat || request.catMap[item.cat] || '';
      const missingDate=!item.date&&!row.date,missingTime=!item.time&&!row.time;
      const assumedNote=[missingDate&&(now?.date||request.today)?t('日期未提及，以目前日期暫填請核對'):'',missingTime&&now?.time?t('時間未提及，以目前時間暫填請核對'):''].filter(Boolean).join(t('；'));
      const when=clampFutureWhen({date:item.date||row.date||now?.date||request.today,time:item.time||row.time||now?.time||'',note:assumedNote||t('日期或時間依進階模式整理設定，請核對'),flags:[]},now);
      const {date,time}=when;
      const changed = date !== row.date || time !== row.time;
      const draft = {
        ...row, key: `draft-cloud-${serial++}-${sentence.id}`,
        raw: row.raw, text: item.text, catId, kind: item.kind, date, time,
        amount: item.amount, unit: item.unit, eliminationKind: item.eliminationKind,
        timeNote: when.future ? when.note : assumedNote|| (changed ? t('日期或時間依進階模式整理設定，請核對') : ''),
        timeFuture:when.future===true,timeNoteBefore:when.noteBefore||'',
        suggested: true, cloud: true, shared: false, assumed: false, inherited: false, confirmed: false,
        guess: {catId, kind: item.kind},
        catReasons0: catId ? [] : [t('線上沒有判斷出是哪隻毛孩，請選一隻')],
        kindReasons0: [t('進階模式整理的，請核對毛孩、類別、日期與數量')],
        timeReasons0: when.future ? [FUTURE_TIME_REASON] : assumedNote ? [assumedNote] : []
      };
      out.push(settleDraft(draft));
    }
  }
  if (out.length > VOICE_CLOUD_LIMITS.totalRows) fail(t('整理後超過 {totalRows} 張卡，沒有套用；請分次輸入。', {totalRows: VOICE_CLOUD_LIMITS.totalRows}));
  return {rows: out, replaced, kept: request.sent.length - replaced};
}
