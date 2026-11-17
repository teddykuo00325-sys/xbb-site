// 看診摘要開頭的「看診與照護」（Ian 2026-11-13 照護為主體的審查 P1；第二輪改寫實際日期）：
// 期間內的看診、目前與即將用藥、期間內吃完或停掉的藥、接下來的照護。只列已記下的內容，不推算日期、不評估。
// 一律寫實際日期（不寫「還有 N 天」），匯出後隔幾天再看也不會錯。
import {careTimeline} from './care-schedule.js?v=photo-simplify1';
import {visitHistory, activeMeds, medOnDay, isLongTerm} from './vet-visit-model.js?v=1';
import {catAgeLabel} from './cat-age.js';
import {t, K, tn} from './i18n.js?v=audit1117b';

const ymd = date => String(date || '').replaceAll('-', '/');
const shortDate = date => `${Number(String(date).slice(5, 7))}/${Number(String(date).slice(8, 10))}`;

/** Actual dose outcomes are separate from prescribed schedules and taken checkmarks. */
export function medOutcomeLines(med, start, end) {
  const outcomes = med?.doseOutcomes;
  if (!outcomes || typeof outcomes !== 'object' || Array.isArray(outcomes)) return [];
  const taken = new Set(Array.isArray(med.taken) ? med.taken : []), lines = [];
  const reasons = {'refused': t('拒吃'), 'spat-out': t('吐出'), 'partial': t('只吃一部分'), 'other': t('其他')};
  for (const [key, value] of Object.entries(outcomes).sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(key) || !value || !['unsuccessful', 'uncertain'].includes(value.status) || taken.has(key)) continue;
    const date = key.slice(0, 10), parsed = new Date(date + 'T12:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || start && date < start || date > end) continue;
    const reason = reasons[value.reason] || '', note = typeof value.note === 'string' ? value.note.slice(0, 500).trim() : '';
    lines.push(t('用藥紀錄：{name} · {date} {time} · {status}{reason}{note}', {
      name: med.name || t('未填藥名'), date: ymd(date), time: key.slice(11), status: value.status === 'unsuccessful' ? t('未成功') : t('不確定'),
      reason: reason ? t('，原因：{reason}', {reason}) : '', note: note ? t('，備註：{note}', {note}) : ''
    }));
  }
  return lines;
}

/** 這隻毛孩的看診與照護重點（文字列）。start：摘要期間的開始日（列出期間內的看診）；沒給就只列最近一次。 */
export function careBriefLines(root, catId, careItems, today, start = '') {
  const lines = [];
  // 歷史摘要只使用截至結束日已發生的實際看診，不能把後來處方倒灌成當時用藥。
  const visits = visitHistory(root, catId).filter(v => v.date <= today && v.demo !== true && !String(v.source || '').includes(K('示範')));
  const inPeriod = start ? visits.filter(v => v.date >= start) : [];
  for (const visit of (inPeriod.length ? inPeriod : visits.slice(0, 1))) {
    const parts = [`${ymd(visit.date)}${visit.reason ? ' ' + visit.reason : ''}`];
    if (visit.notes) parts.push(t('獸醫交代：{notes}', {notes: visit.notes}));
    if (visit.nextVisit) parts.push(t('回診 {nextVisit}', {nextVisit: ymd(visit.nextVisit)}));
    lines.push(t('看診：{parts}', {parts: parts.join(t('，'))}));
  }
  const meds = activeMeds({...root, vetVisits: visits}, catId, today);
  const upcomingMeds = visits.flatMap(v => (v.meds || []).filter(m => today < m.start && medOnDay(m, m.start)));
  for (const {med} of meds) lines.push(`${t('目前用藥：{name}{dose}，每天 {times}，', {name: med.name, dose: med.dose ? ' ' + med.dose : '', times: med.times.join(t('、'))})}${isLongTerm(med) ? t('長期吃（{start} 起）', {start: ymd(med.start)}) : t('吃到 {end}', {end: ymd(med.end)})}`);
  for (const med of upcomingMeds) lines.push(t('即將用藥：{name}{dose}，{start} 起', {name: med.name, dose: med.dose ? ' ' + med.dose : '', start: ymd(med.start)}));
  if (start) {
    for (const v of visits) for (const med of v.meds || []) {
      if (med.stoppedAt && med.stoppedAt >= start && med.stoppedAt <= today) lines.push(t('已停藥：{name}（{stoppedAt} 起）', {name: med.name, stoppedAt: ymd(med.stoppedAt)}));
      else if (!med.stoppedAt && med.end >= start && med.end < today) lines.push(med.doseOutcomes ? t('療程已結束：{name}（排定至 {end}）', {name: med.name, end: ymd(med.end)}) : t('已吃完：{name}（吃到 {end}）', {name: med.name, end: ymd(med.end)}));
    }
  }
  const outcomeLines = visits.flatMap(v => (v.meds || []).flatMap(med => medOutcomeLines(med, start, today)));
  if (outcomeLines.length) lines.push(...outcomeLines, t('已記錄狀況不代表已完成用藥；未記錄不等於沒吃，不推算補餵。'));
  // 回診已經在「看診」那行寫了日期的，照顧時間表就不重複列。
  const listedFollowUps = new Set(visits.map(v => v.nextVisit).filter(Boolean));
  const rows = careTimeline(careItems, today).filter(row => ['overdue', 'due', 'upcoming', 'scheduled'].includes(row.state))
    .filter(row => !(row.label === K('回診') && listedFollowUps.has(row.item.next)));
  for (const row of rows) lines.push(`${t('照顧時間表：{label}', {label: tn(row.label)})} ${row.state === 'overdue' ? t('預定 {next}，已過期', {next: ymd(row.item.next)}) : t('預定 {next}', {next: ymd(row.item.next)})}`);
  return lines;
}

// 看診摘要開頭的基本資料（Ian 2026-11-14 測試回報：年齡、品種、性別、備註裡的過敏都沒進摘要）。
// 只照飼主登記的寫，不推算。2026-11-14：有生日就寫「生日 YYYY/MM/DD（估）・目前約 X 歲 Y 月」（依 today 計算）；
// 沒有生日退回舊的「登記年齡」（登記值、不會隨時間增長）。另加物種、是否結紮（未填不寫）。純函式，匯出檔也直接用。
export const PROFILE_BRIEF_PREFIX = t('基本資料：');
export const PROFILE_NOTE_PREFIX = t('飼主備註：');
const briefToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const birthValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
export function profileBriefLines(profile = {}, today = briefToday()) {
  const parts = [];
  const species = String(profile.species || '').trim();
  if ([K('貓'), K('狗'), K('其他')].includes(species)) parts.push(t(species));
  const age = catAgeLabel(profile, '', today);
  if (birthValid(profile.birthDate) && profile.birthDate <= today && age) parts.push(`${t('生日 {birthDate}', {birthDate: ymd(profile.birthDate)})}${profile.birthEstimated ? t('（估）') : ''}${t('・目前')}${profile.birthEstimated ? t('約 ') + age.replace(/^約 /, '') : ' ' + age}`);
  else {
    const legacy = catAgeLabel({...profile, birthDate: ''}, '', today);
    if (legacy) parts.push(t('登記年齡 {legacy}', {legacy}));
  }
  const breed = String(profile.breed || '').trim();
  if (breed) parts.push(breed);
  const sex = String(profile.sex || '').trim();
  if (sex && sex !== K('未填')) parts.push(t(sex));
  const neutered = String(profile.neutered || '').trim();
  if ([K('已結紮'), K('未結紮')].includes(neutered)) parts.push(t(neutered));
  const lines = parts.length ? [PROFILE_BRIEF_PREFIX + parts.join(t('，'))] : [];
  const note = String(profile.note || '').trim().replace(/\s+/g, ' ');
  if (note) lines.push(PROFILE_NOTE_PREFIX + (note.length > 500 ? note.slice(0, 500) + '…' : note));
  return lines;
}
/** 只有基本資料、沒有看診與照護內容時，不算「有東西可以整理」。 */
export const hasCareContent = lines => (lines || []).some(line => !String(line).startsWith(PROFILE_BRIEF_PREFIX) && !String(line).startsWith(PROFILE_NOTE_PREFIX));

export const CARE_BRIEF_TITLE = t('【看診與照護】');
export const careBriefText = lines => Array.isArray(lines) && lines.length ? [CARE_BRIEF_TITLE, ...lines.map(line => '・' + line)].join('\n') : '';
export {shortDate};
