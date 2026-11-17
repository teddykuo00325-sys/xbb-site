// 照顧時間表與手機提醒（Ian 2026-11-13：大家比較在意驅蟲、疫苗、看診，不是每天記餵食）。
// 純計算：首頁時間表的排序與文字、要交給手機排程的通知清單。不連網、不寫資料。
// 原則照舊：下次日期由飼主依獸醫確認填寫，這裡不推算療程或間隔。手機通知在提前天數（lead，預設 3 天）那天一次、當天一次；
// 2026-11-14 起時間用該項目的「提醒時間」（HH:MM）；沒填或是舊資料的自由文字（例如「晚餐後」）就用早上 9 點。
// 和其他模組用同一個版本字串，才不會載成兩份；health-summary 也會 import 時間表（循環 import），careState 只在執行時呼叫，安全。
import {careState} from './health-summary-v31.js?v=photo-simplify1';
import {calendarDay} from './today-overview-v29.js?v=8f5745b7843b';
import {medReminderPlan} from './vet-visit-model.js?v=1';
import {t, K, tn} from './i18n.js?v=audit1117b';

export const REMINDER_HOUR = 9;
export const REMINDER_MAX = 60;
const CARE_KINDS = [K('疫苗'), K('驅蟲'), K('體內驅蟲'), K('體外驅蟲'), K('其他')];
const ORDER = {overdue: 0, due: 1, upcoming: 2, scheduled: 3, 'needs-scheduling': 4, unscheduled: 5, snoozed: 6, paused: 7};

const isDemo = item => item?.demo === true || String(item?.source || '').includes(K('示範'));
const live = item => item && typeof item === 'object' && !item.deletedAt && !isDemo(item) && CARE_KINDS.includes(item.kind) && typeof item.name === 'string';

export function careLabel(item) {
  const name = String(item?.name || '').trim();
  if (name) return name;
  if (item?.kind === K('疫苗')) return t('疫苗');
  if (item?.kind === K('體內驅蟲') || item?.kind === K('驅蟲') && item?.careSubtype === 'internal') return t('體內驅蟲');
  if (item?.kind === K('體外驅蟲') || item?.kind === K('驅蟲') && item?.careSubtype === 'external') return t('體外驅蟲');
  return item?.kind || t('照護');
}

const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
// 不是今年的日期要寫年份（「還有 365 天（11/13）」看起來像今天）。
const datedLabel = (date, today) => date.slice(0, 4) === String(today).slice(0, 4) ? shortDate(date) : `${date.slice(0, 4)}/${shortDate(date)}`;

/** 一筆照護項目在首頁時間表上的狀態與文字。 */
export function timelineRow(item, today) {
  const state = careState(item, today);
  const next = calendarDay(item.next), now = calendarDay(today);
  const days = next !== null && now !== null ? next - now : null;
  let text;
  if (state === 'overdue') text = t('已過期 {days} 天（{today}）', {days: -days, today: datedLabel(item.next, today)});
  else if (state === 'due') text = t('今天');
  else if (state === 'upcoming' || state === 'scheduled') text = t('還有 {days} 天（{today}）', {days, today: datedLabel(item.next, today)});
  else if (state === 'needs-scheduling') text = t('已完成，還沒排下次日期');
  else if (state === 'unscheduled') text = t('還沒設定日期');
  else if (state === 'snoozed') text = t('暫時延後');
  else text = t('已暫停提醒');
  return {id: item.id, item, label: careLabel(item), state, days, text, urgent: state === 'overdue' || state === 'due', canComplete: ['overdue', 'due', 'upcoming'].includes(state)};
}

/** 這隻毛孩的時間表：過期 → 今天 → 快到了 → 已排 → 待排日期；暫停的不列。 */
export function careTimeline(items, today) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(live).filter(item => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id); return true;
  }).map(item => timelineRow(item, today)).filter(row => row.state !== 'paused')
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.item.next || '9999').localeCompare(b.item.next || '9999') || a.label.localeCompare(b.label));
}

/** 審查 P2：暫停提醒的項目不上時間表，但首頁要提示還有幾項（避免以為不見了）。 */
export function pausedCount(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(live).filter(item => item.id && !seen.has(item.id) && seen.add(item.id)).filter(item => item.enabled !== true).length;
}

/** 全家的毛孩與各自的照護項目（第一隻在根層，其他在 multiCat.cats[].data；封存的不提醒）。 */
export function careByCat(root) {
  const data = root || {};
  const cats = Array.isArray(data.multiCat?.cats) ? data.multiCat.cats : null;
  if (!cats) return [{id: 'cat-original', name: data.cat?.name || t('毛孩'), items: data.careItems || []}];
  return cats.filter(cat => !cat.archivedAt).map(cat => {
    const scope = cat.id === 'cat-original' ? data : cat.data;
    return {id: cat.id, name: scope?.cat?.name || t('毛孩'), items: scope?.careItems || []};
  });
}

// 和 reminder-protection.js 的 reminderTimeKeys／reminderClock 同一套規則（這裡不 import，避免拉進畫面元件）。
const TIME_KEYS = ['reminderTime', 'remindTime', 'notificationTime', 'notifyTime', 'time', 'reminder_time', 'remind_time', 'notification_time', 'notify_time'];
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
/** 這個提醒要在幾點通知：第一個合法的 HH:MM；沒有就 null（用早上 9 點）。 */
export function reminderClockOf(item) {
  for (const key of TIME_KEYS) if (item && Object.hasOwn(item, key) && typeof item[key] === 'string' && CLOCK.test(item[key])) return item[key];
  return null;
}
const atTime = (date, offsetDays = 0, clock = null) => {
  const [y, m, d] = date.split('-').map(Number);
  const [hour, minute] = clock ? clock.split(':').map(Number) : [REMINDER_HOUR, 0];
  return new Date(y, m - 1, d + offsetDays, hour, minute, 0, 0).getTime();
};

/**
 * 要交給手機排程的通知（在手機上排，不連網）：每個已排日期的項目，提前 lead 天一次、當天一次；時間用提醒時間，沒有就早上 9 點。
 * 已過的時間不排；最多 REMINDER_MAX 筆，越近越先。
 */
export function reminderPlan(root, now = Date.now()) {
  const cats = careByCat(root), names = Object.fromEntries(cats.map(cat => [cat.id, cat.name]));
  // 吃藥療程（看診紀錄裡的用藥）：只提醒還在的毛孩；只排近 MED_HORIZON_DAYS 天（每次打開首頁會往後補），
  // 而且疫苗、驅蟲、回診優先佔名額，吃藥不會把它們擠掉。
  const meds = medReminderPlan(root, id => names[id], now, MED_HORIZON_DAYS).filter(row => names[row.id.split('.')[0]]);
  const out = [];
  for (const cat of cats) {
    for (const item of (cat.items || []).filter(live)) {
      if (item.enabled !== true || calendarDay(item.next) === null) continue;
      const last = [item.last, ...(item.history || [])].filter(v => calendarDay(v) !== null).sort().at(-1);
      if (last && item.next <= last) continue;   // 已經做過、還沒排下次
      if (item.snoozedUntil && Date.parse(item.snoozedUntil) > now) continue;
      const label = tn(careLabel(item)), lead = Math.max(0, Math.min(60, Number(item.lead) || 0));
      const clock = reminderClockOf(item), due = atTime(item.next, 0, clock);
      const after = isFollowUp(item) ? t('看完後在毛孩小本本按「做完了」，記下這次看診。') : t('做完後在毛孩小本本按「做完了」，再填下次日期。');
      if (lead > 0) out.push({id: `${cat.id}.${item.id}.lead`, at: atTime(item.next, -lead, clock), title: t('{name}：{label}還有 {lead} 天', {name: cat.name, label, lead}),
        body: t('預定 {next}。{after}', {next: shortDate(item.next), after})});
      out.push({id: `${cat.id}.${item.id}.due`, at: due, title: t('{name}：{label}今天到期', {name: cat.name, label}),
        body: after});
    }
  }
  const care = out.filter(row => row.at > now).sort((a, b) => a.at - b.at).slice(0, REMINDER_MAX);
  const room = REMINDER_MAX - care.length;
  return [...care, ...meds.filter(row => row.at > now).sort((a, b) => a.at - b.at).slice(0, Math.max(0, room))].sort((a, b) => a.at - b.at);
}
export const MED_HORIZON_DAYS = 5;

/** 照顧時間表的篩選：全部／疫苗／驅蟲（含體內、體外）／回診（含其他照護）。 */
export const CARE_FILTERS = [K('全部'), K('疫苗'), K('驅蟲'), K('回診')];
export function careKindMatch(item, filter) {
  const kind = String(item?.kind || '');
  if (filter === K('全部')) return true;
  if (filter === K('驅蟲')) return kind.includes(K('驅蟲'));
  if (filter === K('回診')) return kind === K('其他');
  return kind === filter;
}

/** 一次性的回診（看診時加的「回診」項目）：做完了就結束，不填下次日期。 */
export const isFollowUp = item => item?.kind === K('其他') && String(item?.name || '').trim() === K('回診');

// 從「全部提醒」頁按回診的「做完了」：先記下是哪一項，照護分頁的時間表一出現就開「記下這次看診」。
let pendingFollowUp = null;
export function setPendingFollowUp(id) { pendingFollowUp = id || null; }
export function takePendingFollowUp() { const id = pendingFollowUp; pendingFollowUp = null; return id; }

let lastSent = '', lastStatus = null;
/** 有沒有原生通知橋接（網頁預覽沒有）；沒有時畫面不能說「手機會通知／已排好」（2026-11-14b）。 */
export function hasReminderBridge(cloud = typeof window !== 'undefined' ? window.V161Cloud : null) {
  return Boolean(cloud && typeof cloud.request === 'function');
}
/** 把通知清單交給手機（內容沒變就不送，回傳上次的狀態）。沒有原生橋接（網頁版）時什麼都不做。 */
export async function syncReminders(root, cloud = typeof window !== 'undefined' ? window.V161Cloud : null, now = Date.now()) {
  if (!cloud || typeof cloud.request !== 'function') return null;
  const items = reminderPlan(root, now);
  const key = JSON.stringify(items);
  if (key === lastSent) return lastStatus;
  try {
    const status = await cloud.request('reminders', {items});
    lastSent = key; lastStatus = status && typeof status === 'object' ? status : null;
    return lastStatus;
  } catch { return null; }
}
/** 直接問手機「現在通知開了沒」，並更新快取（Ian 2026-11-13：開了通知卡片還一直跳）。
 *  原因：syncReminders 在清單沒變時回傳快取，權限之後改成允許（系統詢問按允許、或去 iOS／Android 設定開），
 *  快取仍是 allowed:false，換頁回來卡片又出現。權限狀態一律以這裡的即時結果為準。 */
export async function reminderStatus(cloud = typeof window !== 'undefined' ? window.V161Cloud : null) {
  if (!cloud || typeof cloud.request !== 'function') return null;
  try {
    const status = await cloud.request('reminderStatus');
    if (!status || typeof status !== 'object') return null;
    if (lastStatus) lastStatus = {...lastStatus, ...status};
    return status;
  } catch { return null; }
}
/** 權限剛開：沒權限時排的通知會被系統拒收，清單沒變也要重送一次。 */
export function forceReminderSync(root, cloud, now) { lastSent = ''; return syncReminders(root, cloud, now); }
export function resetReminderSyncForTest() { lastSent = ''; lastStatus = null; }

// 在任何一頁存檔（提醒頁、看診、建立毛孩…）都同步手機提醒，不必回到首頁。每個資料庫只註冊一次。
const watched = new WeakSet();
export function watchReminders(root, cloud) {
  if (!root || typeof root.subscribe !== 'function' || watched.has(root)) return false;
  watched.add(root);
  root.subscribe(() => {
    const view = root.get?.();
    if (view?.status === 'saved' && view.data) syncReminders(view.data, cloud).catch(() => {});
  });
  return true;
}
