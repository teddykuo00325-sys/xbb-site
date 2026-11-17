import englishDictionary from './locales/en/index.js?v=audit1117b';
// 多語言核心（2026-11-14，docs/i18n-plan-2026-11-14.md M1）。
// 做法：key 就是繁體中文原句（gettext 式）。繁中不查字典、原樣輸出，所以畫面逐字不變；
// 英文查 locales/en/ 字典，找不到就退回中文並記錄在 missingKeys。
// 存進資料的值（例如類別「排泄」）不翻譯；顯示時用 t(值) 查字典即可。
// 語言：預設跟著手機（navigator.languages），設定頁可改；改完重新載入頁面套用。

export const LOCALES = Object.freeze(['zh-Hant', 'en']);
export const DEFAULT_LOCALE = 'zh-Hant';
export const LOCALE_KEY = 'inpaw.locale';
export const LOCALE_CHOICES = Object.freeze(['auto', ...LOCALES]);

/** 手機語言 → 支援的語言：中文（含簡中、港澳）一律繁中，其他語言用英文。 */
export function matchLocale(languages = []) {
  for (const raw of languages) {
    const lang = String(raw || '').toLowerCase();
    if (!lang) continue;
    if (lang.startsWith('zh')) return 'zh-Hant';
    if (lang.startsWith('en')) return 'en';
  }
  return languages.some(Boolean) ? 'en' : DEFAULT_LOCALE;
}

export function readLocaleChoice(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(LOCALE_KEY); return LOCALE_CHOICES.includes(v) ? v : 'auto'; } catch { return 'auto'; }
}

export function resolveLocale(choice = readLocaleChoice(), nav = globalThis.navigator) {
  if (LOCALES.includes(choice)) return choice;
  // Node（測試）沒有 document：不看執行機器的系統語言，固定繁中，測試結果才不會因機器而異。
  if (typeof globalThis.document === 'undefined' && nav === globalThis.navigator) return DEFAULT_LOCALE;
  const langs = nav ? (nav.languages?.length ? [...nav.languages] : [nav.language]) : [];
  return matchLocale(langs);
}

let current = resolveLocale();
// The dictionary is bundled locally. Synchronous module initialization avoids
// WebKit evaluating shared model constants before the async locale is ready.
let dict = current === 'en' ? englishDictionary : {};
export const missingKeys = new Set();
try { if (globalThis.document?.documentElement) document.documentElement.lang = current; } catch {}

export const getLocale = () => current;
export const isEnglish = () => current === 'en';

/** 測試用：直接指定語言與字典（不讀 localStorage、不重新載入）。 */
export function setLocaleForTest(locale, dictionary = {}) {
  current = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  dict = dictionary || {};
  missingKeys.clear();
}

/** 存下使用者選的語言；reload=true 時重新載入頁面套用。 */
export function saveLocaleChoice(choice, {reload = true, storage = globalThis.localStorage} = {}) {
  const value = LOCALE_CHOICES.includes(choice) ? choice : 'auto';
  try { value === 'auto' ? storage?.removeItem(LOCALE_KEY) : storage?.setItem(LOCALE_KEY, value); } catch {}
  if (reload) try { globalThis.location?.reload(); } catch {}
  return value;
}

const fill = (text, params) => params ? String(text).replace(/\{(\w+)\}/g, (m, k) => Object.hasOwn(params, k) ? String(params[k] ?? '') : m) : String(text);
// 單複數依 count／n；都沒有時用第一個「看起來是數字」的參數（例如 {days}、{lead}），避免 1 days 這類錯誤。
const pluralNumber = params => {
  if (!params) return 0;
  if (params.count !== undefined) return Number(params.count);
  if (params.n !== undefined) return Number(params.n);
  for (const [k, v] of Object.entries(params)) if (k !== 'context' && v !== '' && v !== null && Number.isFinite(Number(v))) return Number(v);
  return 0;
};
const plural = (value, params) => {
  if (!value || typeof value !== 'object') return value;
  const n = pluralNumber(params);
  let rule = 'other';
  try { rule = new Intl.PluralRules(current).select(n); } catch {}
  return value[rule] ?? value.other ?? value.one ?? '';
};

/**
 * 翻譯：key 是繁中原句，可含 {name} 這類參數。
 * 英文字典的值可以是字串，或 {one, other} 依 count／n 選單複數。
 */
export function t(key, params) {
  const source = String(key ?? '');
  if (current === DEFAULT_LOCALE || !source) return fill(source, params);
  // 語境：同一句中文在不同地方要不同英文時，呼叫端傳 {context:'speed'}，字典寫 'speed|一般'。
  const ctx = params?.context ? dict[params.context + '|' + source] : undefined;
  const hit = ctx !== undefined && ctx !== '' ? ctx : dict[source];
  if (hit === undefined || hit === '') { missingKeys.add(source); return fill(source, params); }
  return fill(plural(hit, params), params);
}

/**
 * 翻譯「執行時才知道內容」的訊息（原生回傳的錯誤、throw 出來的 message）：
 * 完整查不到時，試「前半句＋細節」（以「：」或「（代碼 」切開），細節原樣保留。
 * 繁中原樣輸出；本來就不是中文的訊息也原樣輸出、不記成漏翻。
 */
export function tn(message) {
  const text = String(message ?? '');
  if (current === DEFAULT_LOCALE || !text || !/[一-鿿]/.test(text)) return text;
  if (Object.hasOwn(dict, text)) return t(text);
  for (const sep of ['（代碼 ', '：']) {
    const at = text.indexOf(sep);
    if (at <= 0) continue;
    const head = text.slice(0, at + sep.length);
    if (!Object.hasOwn(dict, head)) continue;
    const rest = text.slice(at + sep.length);
    if (sep === '（代碼 ') {
      const close = rest.indexOf('）');
      if (close >= 0) { const tail = rest.slice(close); return t(head) + rest.slice(0, close) + (Object.hasOwn(dict, tail) ? t(tail) : ')'); }
    }
    return t(head) + rest;
  }
  missingKeys.add(text);
  return text;
}

/**
 * 送進階模式（雲端 AI）的文字：英文介面時在最前面加語言標記，worker 會改用英文回覆（docs/i18n-plan M5）。
 * 繁中原樣回傳，舊 worker 收到也只會多看到一行標記。標記必須在其他標記（例如自由陪玩）之前。
 */
export const LOCALE_EN_MARKER = '[XBB_LOCALE_EN]\n';
export function withLocaleMarker(transcript) {
  const text = String(transcript ?? '');
  return current === 'en' && !text.startsWith(LOCALE_EN_MARKER) ? LOCALE_EN_MARKER + text : text;
}

/** 固定輸出繁中原句（只填參數、不翻譯）：程式產生後要「寫進資料」的文字用這個，英文介面也存中文，顯示時再翻。 */
export const tz = (key, params) => fill(String(key ?? ''), params);

/** 標記「這是存進資料的值，不是顯示文字」：原樣回傳，只給掃描工具辨識用。 */
export const K = value => value;

// 日期與星期：繁中維持原本寫法（週六、11/14），英文用 Intl。
const toDate = value => value instanceof Date ? value : new Date(String(value).length === 10 ? value + 'T12:00:00' : value);
const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
export function weekdayLabel(value) {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  if (current === DEFAULT_LOCALE) return '週' + ZH_WEEKDAYS[d.getDay()];
  try { return new Intl.DateTimeFormat('en', {weekday: 'short'}).format(d); } catch { return ''; }
}
/** 英文用的完整日期（例如 Nov 14, 2026）；繁中回傳 YYYY/MM/DD。 */
export function longDate(value) {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  if (current === DEFAULT_LOCALE) return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  try { return new Intl.DateTimeFormat('en', {year: 'numeric', month: 'short', day: 'numeric'}).format(d); } catch { return ''; }
}

// 開發檢查：?dev=1 時可在主控台看漏翻的字串。
try { if (current !== DEFAULT_LOCALE) globalThis.__inpawMissingKeys = missingKeys; } catch {}
