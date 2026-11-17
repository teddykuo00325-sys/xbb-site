// 看診紀錄與吃藥療程（Ian 2026-11-13：大家比較在意看診與疫苗驅蟲）。純計算，不連網。
// 資料放在根層 vetVisits（和 careJourneys 一樣用 catId 分毛孩）：
// {id, catId, date, reason, notes, nextVisit, meds:[{id, name, dose, times:['08:00'], start, end, taken:['2026-11-13T08:00']}], createdAt}
// 原則：藥名、劑量、次數、天數都照獸醫交代由飼主填，App 不推算、不建議；只負責提醒與勾選。
import {t, K} from './i18n.js?v=audit1117b';
export const MED_MAX = 10;
export const MED_TIMES_MAX = 4;
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const validDate = v => typeof v === 'string' && DATE.test(v) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v;
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const fail = message => { throw Error(message); };

export const DOSE_OUTCOME_STATUSES = Object.freeze(['unrecorded', 'taken', 'unsuccessful', 'uncertain']);
export const DOSE_OUTCOME_REASONS = Object.freeze(['', 'refused', 'spat-out', 'partial', 'other']);
export const DOSE_OUTCOME_NOTE_MAX = 500;
export const DOSE_OUTCOME_MAX = 500;
const validDoseKey = key => typeof key === 'string' && key.length === 16 && validDate(key.slice(0, 10)) && key[10] === 'T' && TIME.test(key.slice(11));
const validOutcomeStamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z');

/** Recorded exceptions are separate from the legacy taken array; no entry means unknown, not a failed dose. */
export function doseOutcome(med, key) {
  if ((med?.taken || []).includes(key)) return {status: 'taken', reason: '', note: ''};
  const row = med?.doseOutcomes?.[key];
  return row && ['unsuccessful', 'uncertain'].includes(row.status)
    ? {status: row.status, reason: row.reason || '', note: row.note || '', ...(row.updatedAt ? {updatedAt: row.updatedAt} : {})}
    : {status: 'unrecorded', reason: '', note: ''};
}
function checkedOutcomes(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > DOSE_OUTCOME_MAX) fail(t('用藥狀態格式不符，未更動資料。'));
  const result = {};
  for (const [key, row] of Object.entries(value)) {
    if (!validDoseKey(key) || !row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(k => !['status', 'reason', 'note', 'updatedAt'].includes(k)) || !['unsuccessful', 'uncertain'].includes(row.status) || !DOSE_OUTCOME_REASONS.includes(row.reason) || typeof row.note !== 'string' || row.note.length > DOSE_OUTCOME_NOTE_MAX || !validOutcomeStamp(row.updatedAt)) fail(t('用藥狀態格式不符，未更動資料。'));
    result[key] = {...row};
  }
  return result;
}

export function blankMed() { return {name: '', dose: '', times: ['08:00'], start: '', end: ''}; }

// 長期用藥（Ian 2026-11-14：腎、甲狀腺、心臟病是終身用藥，不能逼飼主亂填天數）。
// 用固定的遠期結束日表示「直到獸醫說停」：日期比較、提醒、備份格式都不用改；停藥照舊用 stoppedAt。
export const LONG_TERM_END = '9999-12-31';
export const isLongTerm = med => med?.end === LONG_TERM_END;
/** 給人看的結束說明：長期藥顯示「長期吃」，一般療程顯示「吃到 M/D」。 */
export const medUntilText = med => isLongTerm(med) ? t('長期吃（直到獸醫說停）') : t('吃到 {end}/{end2}', {end: Number(String(med?.end || '').slice(5, 7)), end2: Number(String(med?.end || '').slice(8, 10))});

/** 檢查並整理一筆看診紀錄；回傳要存的資料。 */
export function buildVisit(input, {catId, today, makeId = () => globalThis.crypto.randomUUID(), now = new Date().toISOString(), allowEmpty = false}) {
  if (!catId) fail(t('找不到這隻毛孩，請返回重新開啟。'));
  const date = input.date || today;
  if (!validDate(date) || date > today) fail(t('看診日期請填今天或以前。'));
  const nextVisit = input.nextVisit || '';
  if (nextVisit && (!validDate(nextVisit) || nextVisit <= date)) fail(t('下次回診日期要晚於這次看診。'));
  const meds = (input.meds || []).filter(m => clean(m.name, 60)).slice(0, MED_MAX).map(m => {
    const name = clean(m.name, 60), times = [...new Set((m.times || []).filter(t => TIME.test(t)))].sort().slice(0, MED_TIMES_MAX);
    const start = m.start || date, end = m.end || '';
    if (!times.length) fail(t('「{name}」至少要有一個吃藥時間。', {name}));
    if (!validDate(start) || !validDate(end)) fail(t('「{name}」請填吃幾天（照獸醫交代的天數），長期吃的藥請勾「長期吃」。', {name}));
    if (end < start) fail(t('「{name}」的結束日期不能早於開始日期。', {name}));
    const doseOutcomes = checkedOutcomes(m.doseOutcomes);
    const taken = Array.isArray(m.taken) ? m.taken.filter(v => typeof v === 'string').slice(0, 500) : [];
    if (doseOutcomes && Object.keys(doseOutcomes).some(key => taken.includes(key))) fail(t('同一次用藥有互相衝突的狀態，未更動資料。'));
    return {id: m.id || makeId(), name, dose: clean(m.dose, 60), times, start, end, taken, ...(doseOutcomes ? {doseOutcomes} : {})};
  });
  const reason = clean(input.reason, 200), notes = clean(input.notes, 1000);
  if (!allowEmpty && !reason && !notes && !meds.length && !nextVisit) fail(t('至少填一項：看診原因、獸醫交代、用藥或下次回診。'));
  return {id: input.id || makeId(), catId, date, reason, notes, nextVisit, meds, createdAt: input.createdAt || now};
}

/** 吃幾天 ↔ 結束日期（開始那天算第 1 天）。天數是飼主照獸醫說的填，這裡只換算日期。 */
export function medEnd(start, days) {
  const d = new Date(start + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.max(1, Math.floor(days)) - 1);
  return d.toISOString().slice(0, 10);
}
export const medDays = (start, end) => Math.round((Date.parse(end + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 864e5) + 1;

/** 照顧時間表上的「回診」項目（一次性；做完了就結束）。 */
export function followUpItem(date, {makeId = () => globalThis.crypto.randomUUID(), note = ''} = {}) {
  return {id: makeId(), kind: K('其他'), name: K('回診'), last: '', next: date, lead: 1, note, enabled: true, history: []};
}

/** 只排回診日：加一筆回診到這隻毛孩的照顧時間表（data 是這隻毛孩的資料）。 */
export function addFollowUp(data, date, {today, makeId} = {}) {
  if (!validDate(date) || (today && date < today)) fail(t('回診日期請填今天或以後。'));
  const items = Array.isArray(data.careItems) ? data.careItems : [];
  if (items.some(x => !x.deletedAt && x.kind === K('其他') && x.name === K('回診') && x.next === date && x.enabled === true)) fail(t('這天已經排了回診。'));
  return {...data, careItems: [...items, followUpItem(date, {makeId})]};
}

/** 存一筆看診：寫進 vetVisits；有下次回診日期就同時加一筆「回診」照護項目（進時間表與手機提醒）。 */
export function saveVisit(root, visit, {scope, makeId = () => globalThis.crypto.randomUUID()}) {
  const visits = Array.isArray(root.vetVisits) ? root.vetVisits : [];
  if (visits.some(v => v.id === visit.id)) fail(t('這筆看診已經存過了。'));
  let next = {...root, vetVisits: [...visits, visit]};
  if (visit.nextVisit) {
    const item = {...followUpItem(visit.nextVisit, {makeId, note: visit.reason ? t('上次看診：{reason}', {reason: visit.reason}) : ''}), fromVisit: visit.id};
    next = scope(next, data => ({...data, careItems: [...(data.careItems || []), item]}));
  }
  return next;
}

// 藥在某天還要不要吃：在療程內，而且還沒停藥（stoppedAt 那天起不吃）。
export const medOnDay = (med, date) => med.start <= date && date <= med.end && !(med.stoppedAt && date >= med.stoppedAt);

/** 某隻毛孩今天還在吃的藥（每一份藥一列），含今天各時間點有沒有吃。 */
export function activeMeds(root, catId, today) {
  const out = [];
  for (const visit of (root?.vetVisits || []).filter(v => v.catId === catId && !v.deletedAt)) {
    for (const med of visit.meds || []) {
      if (!medOnDay(med, today)) continue;
      const slots = med.times.map(time => { const key = `${today}T${time}`, outcome = doseOutcome(med, key); return {time, key, taken: outcome.status === 'taken', ...outcome}; });
      out.push({visitId: visit.id, med, slots, left: daysBetween(today, med.end)});
    }
  }
  return out.sort((a, b) => a.med.end.localeCompare(b.med.end) || a.med.name.localeCompare(b.med.name));
}

const shiftDay = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** 審查 P2：昨天還有沒勾的吃藥時間（漏勾可以補）。 */
export function yesterdayMeds(root, catId, today) {
  const day = shiftDay(today, -1), out = [];
  for (const visit of (root?.vetVisits || []).filter(v => v.catId === catId && !v.deletedAt)) {
    for (const med of visit.meds || []) {
      if (!medOnDay(med, day)) continue;
      const slots = med.times.map(time => { const key = `${day}T${time}`, outcome = doseOutcome(med, key); return {time, key, taken: outcome.status === 'taken', ...outcome}; });
      if (slots.some(s => s.status === 'unrecorded')) out.push({visitId: visit.id, med, slots, day});
    }
  }
  return out;
}

/** 審查 P2：療程結束後 3 天內，提示「療程已結束」（停藥的不算）。 */
export function finishedMeds(root, catId, today) {
  const out = [];
  for (const visit of (root?.vetVisits || []).filter(v => v.catId === catId && !v.deletedAt)) {
    for (const med of visit.meds || []) {
      if (med.stoppedAt || med.end >= today) continue;
      const ago = daysBetween(med.end, today);
      if (ago >= 1 && ago <= 3) {
        const total = med.times.length * (daysBetween(med.start, med.end) + 1);
        const outcomes = Object.entries(med.doseOutcomes || {}).filter(([key]) => key.slice(0, 10) >= med.start && key.slice(0, 10) <= med.end);
        out.push({visitId: visit.id, med, taken: (med.taken || []).length, total,
          unsuccessful: outcomes.filter(([, row]) => row.status === 'unsuccessful').length,
          uncertain: outcomes.filter(([, row]) => row.status === 'uncertain').length});
      }
    }
  }
  return out;
}

const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);

/** 這隻毛孩的看診紀錄（新的在前；已刪除的不列）。 */
export function visitHistory(root, catId) {
  return (root?.vetVisits || []).filter(v => v.catId === catId && !v.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** 一份藥目前的狀態文字。 */
export function medStatus(med, today) {
  if (med.stoppedAt && med.stoppedAt <= today) return K('已停藥');
  if (today < med.start) return K('還沒開始');
  if (today > med.end) return K('療程結束');
  return K('吃藥中');
}

/** 改一筆看診（原因、獸醫交代、用藥）；下次回診日不在這裡改（已經在照顧時間表，請到那裡改）。 */
export function updateVisit(root, visit) {
  const old = (root.vetVisits || []).find(v => v.id === visit.id && !v.deletedAt);
  if (!old) fail(t('找不到這筆看診，請重新整理。'));
  if (old.meds.some(m => ((m.taken || []).length || Object.keys(m.doseOutcomes || {}).length) && !visit.meds.some(next => next.id === m.id))) fail(t('這份藥已有用藥紀錄，請保留並使用停藥，避免刪除歷史。'));
  const meds = visit.meds.map(m => {
    const before = old.meds.find(x => x.id === m.id);
    return before ? {...m, taken: before.taken || [], ...(before.doseOutcomes ? {doseOutcomes: before.doseOutcomes} : {}), ...(before.stoppedAt ? {stoppedAt: before.stoppedAt} : {})} : m;
  });
  return {...root, vetVisits: root.vetVisits.map(v => v.id === visit.id ? {...visit, meds, nextVisit: old.nextVisit, catId: old.catId, createdAt: old.createdAt} : v)};
}

// 這筆看診排出來、還沒做完的回診（舊資料沒有 fromVisit：同一天、還沒做過的回診也算）。
const visitFollowUp = (visit, item) => item.kind === K('其他') && item.name === K('回診') && !item.last && !(item.history || []).length
  && (item.fromVisit ? item.fromVisit === visit.id : item.next === visit.nextVisit);

/** 刪除（先標記，可以復原）；刪掉後這筆的吃藥提醒也停，它排的回診（還沒做完的）也一起拿掉。 */
export function deleteVisit(root, id, now = new Date().toISOString(), {scope} = {}) {
  const visit = (root.vetVisits || []).find(v => v.id === id && !v.deletedAt);
  if (!visit) fail(t('找不到這筆看診，請重新整理。'));
  let removed = [], next = root;
  if (scope && visit.nextVisit) next = scope(next, data => {
    const items = Array.isArray(data.careItems) ? data.careItems : [];
    removed = items.filter(item => visitFollowUp(visit, item));
    return removed.length ? {...data, careItems: items.filter(item => !removed.includes(item))} : data;
  });
  return {...next, vetVisits: next.vetVisits.map(v => v.id === id ? {...v, deletedAt: now, ...(removed.length ? {removedFollowUps: removed} : {})} : v)};
}
export function restoreVisit(root, id, {scope} = {}) {
  const back = (root.vetVisits || []).find(v => v.id === id)?.removedFollowUps || [];
  let next = {...root, vetVisits: (root.vetVisits || []).map(v => {
    if (v.id !== id) return v;
    const {deletedAt, removedFollowUps, ...rest} = v;
    return rest;
  })};
  if (scope && back.length) next = scope(next, data => {
    const items = Array.isArray(data.careItems) ? data.careItems : [];
    return {...data, careItems: [...items, ...back.filter(b => !items.some(x => x.id === b.id))]};
  });
  return next;
}

/** 停藥（照獸醫說的）：今天起不再列出、不再提醒；療程與已吃紀錄保留。 */
export function stopMed(root, visitId, medId, today) {
  let found = false;
  const vetVisits = (root.vetVisits || []).map(v => v.id !== visitId ? v : {...v, meds: v.meds.map(m => {
    if (m.id !== medId) return m;
    found = true;
    return {...m, stoppedAt: today};
  })});
  if (!found) fail(t('找不到這份藥，請重新整理。'));
  return {...root, vetVisits};
}

/** 復原停藥（剛按錯停藥時用）。 */
export function resumeMed(root, visitId, medId) {
  let found = false;
  const vetVisits = (root.vetVisits || []).map(v => v.id !== visitId ? v : {...v, meds: v.meds.map(m => {
    if (m.id !== medId) return m;
    found = true;
    const {stoppedAt, ...rest} = m;
    return rest;
  })});
  if (!found) fail(t('找不到這份藥，請重新整理。'));
  return {...root, vetVisits};
}

/** Set a single scheduled dose outcome. Other dates, medications and pets remain untouched. */
export function setDoseOutcome(root, visitId, medId, key, value, today, {now = new Date().toISOString(), catId, archiveGeneration} = {}) {
  if (!validDate(today) || !validDoseKey(key) || key.slice(0, 10) > today) fail(t('只能記今天或以前的吃藥。'));
  const visit = (root?.vetVisits || []).find(v => v.id === visitId && !v.deletedAt), med = visit?.meds?.find(m => m.id === medId);
  if (!visit || !med) fail(t('找不到這份藥，請重新整理。'));
  const pet = root.multiCat?.cats?.find(p => p.id === visit.catId);
  if (root.multiCat && (!pet || pet.archivedAt || archiveGeneration !== undefined && (pet.archiveGeneration || 0) !== archiveGeneration) || catId !== undefined && visit.catId !== catId) fail(t('毛孩狀態已變更，請重新開啟用藥紀錄。'));
  const current = doseOutcome(med, key), historical = current.status !== 'unrecorded';
  if (!historical && (!medOnDay(med, key.slice(0, 10)) || !(med.times || []).includes(key.slice(11)))) fail(t('這個時間不在用藥排程內，未更動資料。'));
  if (!value || !DOSE_OUTCOME_STATUSES.includes(value.status)) fail(t('請選擇有效的用藥狀態。'));
  const reason = value.reason ?? '', note = value.note ?? '';
  if (!DOSE_OUTCOME_REASONS.includes(reason)) fail(t('請選擇有效的用藥原因。'));
  if (typeof note !== 'string' || note.length > DOSE_OUTCOME_NOTE_MAX) fail(t('用藥備註最多 500 字。'));
  if (!validOutcomeStamp(now)) fail(t('用藥紀錄時間無效，未更動資料。'));
  const taken = new Set(med.taken || []), doseOutcomes = {...(med.doseOutcomes || {})};
  taken.delete(key); delete doseOutcomes[key];
  if (value.status === 'taken') {
    if (taken.size >= 500) fail(t('已達這份藥的紀錄上限，請保留備份後再整理療程。'));
    taken.add(key);
  } else if (value.status !== 'unrecorded') {
    if (Object.keys(doseOutcomes).length >= DOSE_OUTCOME_MAX) fail(t('已達這份藥的紀錄上限，請保留備份後再整理療程。'));
    doseOutcomes[key] = {status: value.status, reason, note: note.trim(), updatedAt: now};
  }
  const {doseOutcomes: _old, ...rest} = med;
  const updated = {...rest, taken: [...taken].sort(), ...(Object.keys(doseOutcomes).length ? {doseOutcomes} : {})};
  return {...root, vetVisits: root.vetVisits.map(v => v.id !== visitId ? v : {...v, meds: v.meds.map(m => m.id === medId ? updated : m)})};
}

/** Keep the existing quick check behavior, clearing any exception for the same dose. */
export function toggleDose(root, visitId, medId, key, today) {
  const med = root?.vetVisits?.find(v => v.id === visitId && !v.deletedAt)?.meds?.find(m => m.id === medId);
  return setDoseOutcome(root, visitId, medId, key, {status: doseOutcome(med, key).status === 'taken' ? 'unrecorded' : 'taken'}, today);
}

/** 吃藥提醒（交給手機排程）：從現在起、療程內每個時間點各一則；呼叫端再和其他提醒一起取前 60 筆。 */
export function medReminderPlan(root, catName, now = Date.now(), horizonDays = 14) {
  const out = [];
  const nameOf = typeof catName === 'function' ? catName : () => catName;
  for (const visit of (root?.vetVisits || []).filter(v => !v.deletedAt)) {
    for (const med of visit.meds || []) {
      for (let i = 0; i <= horizonDays; i++) {
        const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!medOnDay(med, date)) continue;
        for (const time of med.times) {
          const [h, m] = time.split(':').map(Number);
          const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
          if (at <= now || doseOutcome(med, `${date}T${time}`).status !== 'unrecorded') continue;
          out.push({id: `${visit.catId}.${visit.id}.${med.id}.${date}T${time}`, at,
            title: t('{catId}：吃藥時間到了（{name}）', {catId: nameOf(visit.catId), name: med.name}),
            body: t('{dose}吃完後在毛孩小本本勾「吃了」。', {dose: med.dose ? med.dose + '，' : ''})});
        }
      }
    }
  }
  return out;
}
