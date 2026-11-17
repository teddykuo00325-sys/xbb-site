// 存檔中文 → 顯示文字（2026-11-14，docs/i18n-plan-2026-11-14.md〇、第 5 點）。
// 程式自動產生、寫進資料的句子（餵食摘要、換糧註記、體重、共用食盆／清砂…）必須維持中文原樣：
// 舊資料、備份、比對都靠它。這裡只在「英文介面顯示」時辨識這些固定句型並組出英文。
// - 繁中：原樣輸出，逐字不變。
// - 英文：先查字典整句；再比對下面的固定句型；比對不到就原樣顯示（使用者自己寫的內容不動）。
// - 句型的英文寫在 locales/en/data.js，key 就是句型本身（例如「體重 {amount} 公斤」）。
import {t, isEnglish, missingKeys} from './i18n.js?v=audit1117b';
// 語音存的紀錄文字含「輸入原文：」／"Original input: " 前綴。規則與 voice-quick-model.js 的
// splitRetainedVoiceText／localizeRetainedVoiceText 相同（tool/test-stored-text 會比對兩邊結果）；
// 不直接 import，因為那支會帶進整串畫面模組（含 /cat-photo.js），Node 測試與這個純文字模組都不需要。
const RETAINED_SOURCE_RE = /\n(?:輸入原文：|Original input: )/;
function splitRetainedVoiceText(value) { const s = String(value ?? ''), m = s.match(RETAINED_SOURCE_RE); return m ? {text: s.slice(0, m.index), raw: s.slice(m.index + m[0].length)} : {text: s, raw: null}; }
function localizeRetainedVoiceText(value) { return String(value ?? '').replace(RETAINED_SOURCE_RE, '\n' + (isEnglish() ? 'Original input: ' : '輸入原文：')); }

const CJK = /[一-鿿]/;

/** 查字典；查不到回 null，而且不把使用者內容記成漏翻。 */
function lookup(key, params) {
  if (!isEnglish()) return null;
  const had = missingKeys.has(key);
  if (had) return null;
  const out = t(key, params);
  if (missingKeys.has(key)) { missingKeys.delete(key); return null; }
  return out;
}

// 參數種類：
// USER＝使用者輸入（食品名、備註、原文…）原樣保留，只翻示範資料的固定名稱；
// NUM＝數字或單位這類不含空白的短值；NOPAREN＝括號內的短值；其他＝任意文字（會再遞迴翻譯）。
const USER = new Set(['name', 'note', 'raw', 'question', 'id', 'model']);
const NUM = new Set(['amount', 'count', 'n', 'provided', 'eaten', 'initial', 'added', 'left', 'urine', 'stool', 'version', 'unit', 'unit2']);
const NOPAREN = new Set(['kind']);
// 示範資料的固定名稱：雖然放在食品名這類欄位，但不是使用者內容，英文介面照樣翻。
const DEMO_VALUES = new Set(['雞肉主食罐', '小本本示範', '示範雞肉配方', '雞肉', '雞肉、水、雞肝、礦物質（虛構示範資料）', '雞肉、水、雞肝、礦物質（虛構示範）']);

// 固定句型（順序重要：比較特定的放前面）。
export const STORED_TEMPLATES = Object.freeze([
  '體重 {amount} 公斤',
  '嘔吐 {count} 次',
  '親眼看到嘔吐 {count} 次',
  '吐了 {count} 次',
  '吐毛球 {count} 次',
  '發現嘔吐物（發生時間不確定），已確認 {count} 次',
  '尿尿：{v0}',
  '排便：{v0}',
  '皮下輸液 {qty}',
  // 餵食：主程式包記一餐（hS）
  '{name}｜餵了 {provided} {unit} · 吃了 {eaten} {unit2}',
  '{name}｜餵了 {provided} {unit} · 吃下量未記錄',
  // 餵食：unified-meal 一餐多食品
  '{name}｜餵食量 {qty} · 吃下量 {qty2}',
  // 餵食：照護任務（care-journey-model）
  '{name}（v{version}）｜提供 {qty}，吃下 {qty2}',
  // 生活變化（換糧）註記
  '開始使用 {name}（首次記錄此食品）',
  '開始使用 {name}（{kind}）v{version}',
  '更正餐點食品：{text}',
  '換糧前：{before}；換糧後：{after}；想觀察：{question}',
  '換糧前：{before}；換糧後：{after}',
  '{name}（v{version}，ID {id}）',
  // 多貓共用食盆／家庭清砂
  '共用食盆：開始 {initial} g、期間補入 {added} g、結束剩 {left} g，全家約吃下 {eaten} g（未分到個別毛孩）',
  '共用食盆：補了 {added} g、剩 {left} g，全家約吃下 {eaten} g（未分到個別毛孩）',
  '家庭清砂：尿團 {urine} 團、便便 {stool} 坨（未分到個別毛孩）',
  '共用食盆指派：開始 {initial} g、期間補入 {added} g、結束剩 {left} g，約吃下 {eaten} g',
  '共用食盆指派：補了 {added} g、剩 {left} g，約吃下 {eaten} g',
  '清砂時發現尿團 {n} 團（家庭清砂指派）',
  '清砂時發現便便 {n} 坨（家庭清砂指派）',
  // 文字快記
  '文字快記・{model} 本機整理・已核對',
]);

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function compile(key) {
  const names = [];
  const source = key.split(/(\{\w+\})/).map(part => {
    const m = /^\{(\w+)\}$/.exec(part);
    if (!m) return escapeRe(part);
    names.push(m[1]);
    if (NUM.has(m[1])) return '([^\\s；，、（）]*)';
    if (NOPAREN.has(m[1])) return '([^（）]*)';
    return '([\\s\\S]*?)';
  }).join('');
  return {key, names, re: new RegExp('^' + source + '$')};
}
let compiled = null;
const rules = () => compiled ||= STORED_TEMPLATES.map(compile);

const tidy = s => String(s).replace(/ {2,}/g, ' ').trim();

function userValue(value) {
  return DEMO_VALUES.has(value) ? (lookup(value) ?? value) : value;
}

function translate(text, depth = 0) {
  if (depth > 8 || !text || !CJK.test(text)) return text;
  // 語音紀錄：整理後的文字照常翻；原文是使用者說的話，原樣；前綴換成目前語言。
  const voice = splitRetainedVoiceText(text);
  if (voice.raw !== null) return localizeRetainedVoiceText(translate(voice.text, depth + 1) + '\n輸入原文：' + voice.raw);
  const exact = lookup(text);
  if (exact !== null) return exact;
  for (const {key, names, re} of rules()) {
    const m = re.exec(text);
    if (!m) continue;
    const params = {};
    names.forEach((name, i) => {
      const value = m[i + 1] ?? '';
      params[name] = USER.has(name) ? userValue(value) : translate(value, depth + 1);
    });
    const out = lookup(key, params);
    if (out !== null) return tidy(out);
  }
  // 「40 罐」這類數量＋單位。
  const qty = /^(\d+(?:\.\d+)?)\s+(\S+)$/.exec(text);
  if (qty) { const unit = lookup(qty[2]); if (unit !== null) return `${qty[1]} ${unit}`; }
  // 結構化摘要＋飼主備註用「；」接起來：前半是固定句型才拆開翻，備註原樣（或整句查字典）。
  const semi = text.indexOf('；');
  if (semi > 0) {
    const head = text.slice(0, semi), rest = text.slice(semi + 1);
    const h = translate(head, depth + 1);
    if (h !== head) return h + (lookup('；{note}', {note: translate(rest, depth + 1)}) ?? '; ' + rest);
  }
  // 「 · 」串起來的多段：找最長可翻的前段，其餘再遞迴。
  const segs = text.split(' · ');
  if (segs.length > 1) {
    for (let k = segs.length - 1; k >= 1; k--) {
      const head = segs.slice(0, k).join(' · '), h = translate(head, depth + 1);
      if (h !== head) return h + ' · ' + translate(segs.slice(k).join(' · '), depth + 1);
    }
    const rest = segs.slice(1).join(' · '), r = translate(rest, depth + 1);
    if (r !== rest) return segs[0] + ' · ' + r;
  }
  return text;
}

/**
 * 顯示存在資料裡、由程式產生的中文（紀錄文字、生活變化註記、記錄方式…）。
 * 繁中原樣回傳；英文辨識固定句型組出英文，比對不到原樣顯示。資料本身不改。
 */
export function displayStoredText(value) {
  if (value === undefined || value === null) return value;
  // 「輸入原文」前綴兩種語言都換成目前語言（繁中介面看到英文介面存的語音紀錄也一致）。
  const text = localizeRetainedVoiceText(String(value));
  if (!isEnglish() || !CJK.test(text)) return text;
  return translate(text);
}

/** 使用者內容（食品名、品牌…）：原樣，只翻示範資料的固定名稱。 */
export function displayUserText(value) {
  if (value === undefined || value === null || !isEnglish()) return value;
  return userValue(String(value));
}

/**
 * 已組好的顯示字串（例如「餵食：<紀錄文字> · …」）裡夾著存檔中文：把 values 各自換成顯示文字。
 * 長的先換、全部出現處都換；escape 給 HTML 匯出用（原文與譯文都先跳脫再比對）。
 */
export function withStoredTexts(text, values = [], escape = null) {
  let out = String(text ?? '');
  if (!isEnglish() || !CJK.test(out)) return out;
  const list = [...new Set(values.filter(v => typeof v === 'string' && v.trim().length >= 2 && CJK.test(v)))].sort((a, b) => b.length - a.length);
  for (const value of list) {
    const shown = displayStoredText(value);
    if (shown === value) continue;
    const from = escape ? escape(value) : value, to = escape ? escape(shown) : shown;
    out = out.split(from).join(to);
  }
  return out;
}

/** 一筆紀錄／生活變化裡可能是程式產生的中文欄位（文字與註記）。 */
export const storedFields = row => row ? [row.text, row.note].filter(v => typeof v === 'string') : [];

/**
 * 示範資料的內容：英文介面建立時直接寫英文（示範不是使用者資料）；繁中照舊。
 * 示範的辨識（demo:true、source 含「示範」、familyId food-demo）不靠這些文字。
 */
export function demoValue(zh) {
  return isEnglish() ? (lookup(zh) ?? zh) : zh;
}
