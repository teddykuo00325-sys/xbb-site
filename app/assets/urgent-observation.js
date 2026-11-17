import {t, K} from './i18n.js?v=audit1117b';
// 記到高風險狀況時，存檔當下給一行溫和提醒（Ian 2026-11-14 測試回報：頻繁進砂盆、血便存完只顯示「已記下」）。
// 只看飼主自己選的選項，不推論原因、不是診斷；任何存檔路徑（記一筆、一鍵快記、語音）存進來的新紀錄都會檢查。
import {eliminationKind} from './elimination-observation.js?v=8f5745b7843b';
import {stoolState} from './health-summary-v31.js?v=photo-simplify1';

const FRESH_MS = 2 * 60 * 1000;
export const URGENT_FOOTNOTE = t('這是一般提醒，不是診斷。');

/** 這筆紀錄需要當下提醒的話，回傳提醒文字；不需要就回傳空字串。 */
export function urgentObservationMessage(row) {
  if (!row || typeof row !== 'object' || row.deletedAt || row.draft) return '';
  if (row.category === K('排泄')) {
    const kind = eliminationKind(row);
    if (kind === 'urine' && (row.urineStatus === 'frequent' || /尿不出/.test(String(row.text || ''))))
      return t('記下了「頻繁進砂盆、排出情況不確定」。如果一直進砂盆卻尿不出來（公貓尤其要注意），請盡快聯絡獸醫，不要等紀錄累積。');
    if (kind === 'stool' && stoolState(row) === 'blood')
      return t('記下了「血便」。如果持續出血，或同時精神、食慾變差、嘔吐，請盡快聯絡獸醫。');
  }
  if (row.feeding?.noEatingConfirmed === true)
    return t('記下了「確認完全沒有進食」。持續不吃請儘速聯絡獸醫，不要等紀錄累積；幼貓或有既有疾病的貓更要及早聯絡。');
  return '';
}

const localDay = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// 有 createdAt 的看建立時間；手動記一筆沒有 createdAt，就看紀錄日期是不是今天或昨天（補記更早的不跳）。
const fresh = (row, now) => {
  const ms = Date.parse(row?.createdAt || '');
  if (Number.isFinite(ms)) return now - ms >= -60000 && now - ms <= FRESH_MS;
  return row?.date === localDay(now) || row?.date === localDay(now - 864e5);
};
// 一次多出很多筆（還原備份、匯入）不是「剛記下」，只更新基準、不跳提醒。
const BULK = 3;

/** 從「之前看過的 id」和目前紀錄，找出剛存進來、需要提醒的那幾筆。 */
export function newUrgentMessages(seen, entries, now = Date.now()) {
  const out = [];
  const added = (entries || []).filter(row => row?.id && !seen.has(row.id));
  added.forEach(row => seen.add(row.id));
  if (added.length > BULK) return out;
  for (const row of added) {
    if (!fresh(row, now)) continue;
    const message = urgentObservationMessage(row);
    if (message && !out.includes(message)) out.push(message);
  }
  return out;
}

// 追蹤狀態放在模組層：存檔後畫面常會重新掛載，放在元件裡會被清掉、等於永遠不跳。
const watcher = {root: null, unsubscribe: null, seen: null, present: new Set(), messages: [], listeners: new Set()};
const notify = () => watcher.listeners.forEach(fn => fn());
function check() {
  const entries = watcher.root?.get?.()?.data?.entries || [];
  const ids = new Set(entries.map(row => row?.id).filter(Boolean));
  // 第一次載入，或切換到另一隻毛孩（上次看到的紀錄一筆都不在了）：只記基準，不跳提醒。
  const switched = watcher.present.size > 0 && ids.size > 0 && ![...watcher.present].some(id => ids.has(id));
  watcher.present = ids;
  if (!watcher.seen || switched) { watcher.seen = new Set([...(watcher.seen || []), ...ids]); return; }
  const found = newUrgentMessages(watcher.seen, entries).filter(m => !watcher.messages.includes(m));
  if (found.length) { watcher.messages = [...watcher.messages, ...found]; notify(); }
}
function watch(root) {
  if (!root?.get || !root?.subscribe || watcher.root === root) return;
  watcher.unsubscribe?.();
  watcher.root = root;
  check();
  const off = root.subscribe(check);
  watcher.unsubscribe = typeof off === 'function' ? off : null;
}
export function dismissUrgent() { watcher.messages = []; notify(); }

/** 掛在主畫面：訂閱本機資料，新存進的高風險紀錄跳出提醒卡。 */
export function UrgentObservationNotice({react: R, root}) {
  const h = R.createElement;
  const [messages, setMessages] = R.useState(() => watcher.messages), ref = R.useRef(null);
  R.useEffect(() => {
    watch(root);
    const show = () => setMessages(watcher.messages);
    watcher.listeners.add(show); show();
    return () => { watcher.listeners.delete(show); };
  }, [root]);
  // 用 dialog 的 top layer 顯示：主畫面在會捲動／有 transform 的容器裡，position:fixed 會定位錯。
  R.useEffect(() => { const d = ref.current; if (d && !d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } } }, [messages.length > 0]);
  if (!messages.length) return null;
  return h('dialog', {ref, className: 'urgent-observation', role: 'alertdialog', 'aria-label': t('請留意'), 'data-testid': 'urgent-observation',
      onCancel: e => { e.preventDefault(); dismissUrgent(); },
      style: {width: 'min(calc(100vw - 32px), 520px)', background: '#fff4e5', color: '#4a2c00',
        border: '2px solid #d9822b', borderRadius: 16, padding: '16px 18px', boxShadow: '0 8px 24px rgba(0,0,0,.25)'}},
    h('strong', {style: {display: 'block', fontSize: 17, marginBottom: 6}}, t('請留意')),
    messages.map(message => h('p', {key: message, style: {margin: '0 0 8px', fontSize: 15, lineHeight: 1.6}}, message)),
    h('p', {style: {margin: '0 0 10px', fontSize: 13, color: '#6b4a1f'}}, URGENT_FOOTNOTE),
    h('button', {type: 'button', className: 'primary', style: {width: '100%', minHeight: 44}, onClick: dismissUrgent}, t('知道了')));
}
