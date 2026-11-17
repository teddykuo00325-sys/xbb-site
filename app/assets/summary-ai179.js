import {careDoneName} from './record-quantity.js?v=1';
import {t, K} from './i18n.js?v=audit1117b';
import {displayStoredText,withStoredTexts,storedFields} from './stored-text.js?v=i18n1';
export const PHONE_SUMMARY_MODE = 'phone-ai-v1';
export const CLOUD_SUMMARY_MODE = 'cloud-ai-v1';
export const PHONE_SUMMARY_RECORDS = 8;
export const SUMMARY_FACT_RULES=K('只整理來源明確記載的事實，問題也不能夾帶沒有依據的判斷。未填、未記錄是未知，不是沒有使用餵食器或沒有發生；提供量大於吃下量只表示該餐沒有全部吃完，沒有相較平常的來源時，不得寫食量或攝取量下降、減少。只有處方不能寫已按時服藥、持續服用或方案維持不變，服藥情況僅能依已勾選紀錄描述。保留藥名、劑量、明確鐘點、日期和未知值；不要補出未記載的器具、診斷、原因或改藥建議。');
export function nativeSummaryText(value){
 if(typeof value!=='string'||!value.trim())throw Error(t('進階模式沒有回傳可核對的摘要文字；原紀錄與待核對結果保留，可重試或明確放棄。'));
 const text=value.trim();
 if(text.length>12000)throw Error(t('進階模式摘要超過可核對長度，沒有截斷或保存；請縮短紀錄範圍後再試。'));
 return text;
}

export function phoneSummaryScopeLabel(sources) {
  const recent = sources.slice(-PHONE_SUMMARY_RECORDS);
  if (!recent.length) return t('手機模式近期重點 · 0 筆');
  const dates = recent.map(source => source.date).filter(Boolean).sort();
  return `${t('手機模式近期重點 · {count} 筆', {count: recent.length})}${dates.length ? ` ${t('· {dates} 至 {dates2}', {dates: dates[0], dates2: dates.at(-1)})}` : t(' · 日期未保留')}`;
}

export function completeSummaryText(summary, sources) {
  return `${summary.catName || t('毛孩')}${t('的看診摘要')}\n${t('{start} 至 {end}', {start: String(summary.start||'').replaceAll('-','/'), end: String(summary.end||'').replaceAll('-','/')})}\n\n` +
    sources.map((source, index) => `${index + 1}. ${source.date} ${source.time || t('時間未記錄')} · ${summaryReadableSource(source)}`).join('\n');
}

export function completeSummaryDays(sources) {
  const days = new Map();
  sources.forEach(source => {
    const key = source.date || t('日期未記錄');
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(source);
  });
  return [...days].map(([date, rows]) => {
    const counts = new Map();
    const items = rows.map(source => {
      const text = summaryReadableSource(source);
      const match = /^([^：:\s]{1,8})[：:]/.exec(text);
      const label = match ? match[1] : (source.kind === 'change' ? t('生活變化') : t('其他'));
      counts.set(label, (counts.get(label) || 0) + 1);
      return {time: source.time || t('時間未記錄'), text};
    });
    const label = /^\d{4}-(\d{2})-(\d{2})$/.test(date) ? date.slice(5).replace('-', '/') : date;
    return {date, label, summary: [...counts].map(([name, count]) => `${name} ${count}`).join(t('、')), items};
  });
}

// 2026-11-14：來源原文裡程式產生的中文（餵食、體重等）在英文介面翻成英文；使用者內容不動。
export function summaryReadableSource(source) {
  let parsed = null;
  try { parsed = JSON.parse(source?.raw || 'null'); } catch {}
  return withStoredTexts(summaryReadableSourceRaw(source), parsed ? storedFields(parsed) : []);
}
function summaryReadableSourceRaw(source) {
  let row;
  try { row = JSON.parse(source.raw || 'null'); } catch { return source.text; }
  if (!row) return source.text;
  if (source.kind === 'change' && row.sourceEntryId) {
    const suffix = t(' · 關聯原紀錄 ') + row.sourceEntryId;
    if (source.text.endsWith(suffix)) return source.text.slice(0, -suffix.length);
  }
  // 疫苗與驅蟲完成：舊摘要的來源文字寫「當次名稱…未保存」，改用飼主填的提醒名稱（藥名、劑量）。
  if (source.kind === 'care') return `${t('疫苗與驅蟲完成：{row}（', {row: careDoneName(row)})}${row.kind || t('照護')}）`;
  if (source.kind !== 'record' || !row.feeding) return source.text;
  const {provided, eaten, unit, noEatingConfirmed} = row.feeding;
  const amount = value => String(value ?? '').trim() ? [value, unit].filter(Boolean).join(' ') : t('未記錄');
  const description = String(row.text || t('未填說明'));
  const served = t('餵食量 ') + amount(provided);
  const consumed = t('吃下 ') + amount(eaten);
  // 餵食紀錄的標題本來就寫「餵食量 40 g · 吃下量 30 g」，不再重複一次（Ian 2026-11-14）。
  const quantities = description.includes(served) && (description.includes(consumed) || description.includes(K('吃下量 ') + amount(eaten)))
    ? '' : ' · ' + served + '／' + consumed;
  return `${t('餵食：{description}{quantities}', {description, quantities})}${noEatingConfirmed===true?t(' · 已確認沒有進食'):''}`;
}

export function summaryCloudFacts(draft) {
  return [...draft.sources.map(source => {
    const {id, kind, date, time} = source;
    return {id, kind, date, time, text: summaryReadableSource(source)};
  }), ...(draft.careBrief||[]).map((text,index)=>({id:'brief-'+index,kind:'care-brief',date:'',time:'',text:String(text)}))];
}
export function summaryCloudInput(draft) {
  const {catId, catName, start, end} = draft;
  return {
    task: 'summary',
    text: K('依本次紀錄整理看診重點與近期變化，合併重複敘述，列出可詢問獸醫的問題；引用提供的紀錄，保留日期、用藥與照護資訊。未記錄保持未知，不推論病因，不建議調藥。\n')+SUMMARY_FACT_RULES+(draft.question?t('\n飼主想問獸醫：')+draft.question:''),
    cats: [{id: catId, name: catName}],
    report: {start, end, sourceFacts: summaryCloudFacts(draft)},
  };
}

export function phoneSummaryInput(draft) {
  const recent = draft.sources.slice(-PHONE_SUMMARY_RECORDS);
  return recent.map((source, index) => {
    const readable = summaryReadableSource(source);
    const text = readable.length > 88 ? readable.slice(0, 88) + '…' : readable;
    return `${index + 1}. ${source.date} ${text}`;
  }).join('\n');
}

export function applyPhoneSummary(draft, candidate) {
  const recent = draft.sources.slice(-PHONE_SUMMARY_RECORDS);
  let highlights;
  try {
    const json = candidate.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
    ({highlights} = JSON.parse(json));
  } catch {
    throw Error(t('手機模式的結果暫時無法核對。可直接核對並儲存紀錄。'));
  }
  if (!Array.isArray(highlights) || !highlights.length || highlights.length > 3 ||
      new Set(highlights).size !== highlights.length ||
      highlights.some(number => !Number.isInteger(number) || number < 1 || number > recent.length)) {
    throw Error(t('手機模式回傳的紀錄範圍無法核對。可直接核對並儲存紀錄。'));
  }
  const first = draft.sources.length - recent.length;
  const text = highlights.map(number => {
    const source = recent[number - 1];
    return t('{date} {time} · {source}（來源 {number}）', {date: source.date, time: source.time || '', source: summaryReadableSource(source), number: first + number});
  }).join('\n');
  return {...draft, text, mode: PHONE_SUMMARY_MODE};
}

export function applyCloudSummary(draft, result) {
  const sourceKey = ({kind, id}) => kind + ':' + id;
  const numbers = new Map(summaryCloudFacts(draft).map((source, index) => [sourceKey(source), index + 1]));
  const references = [...new Set(result.sources.map(source => numbers.get(sourceKey(source))))];
  if (references.includes(undefined)) throw Error(t('進階模式引用超出本次選取範圍。'));
  const questions = Array.isArray(result.questions)
    ? result.questions.filter(question => typeof question === 'string').join('\n')
    : typeof result.question === 'string' ? result.question : '';
  return {...draft, text: `${result.summary.trim()}\n\n${t('引用紀錄：')}${references.map(number => t('來源 ') + number).join(t('、'))}`,
    question: draft.question || questions.slice(0, 2000), mode: CLOUD_SUMMARY_MODE};
}
