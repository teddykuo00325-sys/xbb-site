import {validatePlan, OBSERVATIONS} from './play-lab-rules.js?v=play-personality1';
import {t} from './assets/i18n.js?v=audit1117b';

// Device-local, per-cat example trials only. These functions never infer a
// preference, touch care entries, contact a server, or overwrite a prior version.
export const PLAY_LAB_LIMITS = Object.freeze({plans: 60, sessions: 200});
export const PLAY_LAB_SOUNDS = Object.freeze(['off', 'water', 'rustle', 'cue']);
// Keep stored timestamps in UTC; dates shown to the owner follow this device.
export function playLocalDate(stamp) {
  const date = new Date(stamp);
  if (!Number.isFinite(date.getTime())) return t('日期未知');
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
const observationIds = OBSERVATIONS.map(row => row.id);
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw Error(message); };
const invalid = () => fail(t('陪玩資料無法讀取，原資料已保留。'));
const copy = value => structuredClone(value);
const idValid = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const textValid = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
const stampValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const idsValid = rows => Array.isArray(rows) && rows.length <= observationIds.length && new Set(rows).size === rows.length && rows.every(id => observationIds.includes(id));
const allowedKeys = (value, fields) => object(value) && Object.keys(value).every(key => fields.includes(key));
const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
const stable = value => Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : object(value) ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}' : JSON.stringify(value);
const planValid = value => {
  try { validatePlan(value); return value.source === 'example' || value.source === 'ai'; }
  catch { return false; }
};
const commonValid = row => idValid(row.id) && planValid(row.plan) && idsValid(row.observationIds) && textValid(row.note, 500) && PLAY_LAB_SOUNDS.includes(row.sound) && stampValid(row.createdAt);
// 分段記錄（2026-11-16）：stats.stages 選填，每列對應這次玩法的一個階段，舊紀錄沒有也能讀。
const stageStatsValid = (stages, plan) => {
  if (stages === undefined) return true;
  if (!Array.isArray(stages) || stages.length > 12) return false;
  const ids = new Set(Array.isArray(plan?.states) ? plan.states.map(row => row.id) : []), seen = new Set();
  return stages.every(row => allowedKeys(row, ['id', 'seconds', 'targetTouches', 'coverTouches']) && ids.has(row.id) && !seen.has(row.id) && seen.add(row.id) && typeof row.seconds === 'number' && Number.isFinite(row.seconds) && row.seconds >= 0 && row.seconds <= 60 && integer(row.targetTouches) && integer(row.coverTouches));
};
const planFields =['id', 'title', 'plan', 'parentId', 'revision', 'observationIds', 'note', 'sound', 'createdAt'];
const sessionFields = ['id', 'planId', 'plan', 'observationIds', 'note', 'feedback', 'stats', 'elapsed', 'sound', 'createdAt'];

function assertLab(lab) {
  if (!allowedKeys(lab, ['version', 'plans', 'sessions']) || lab.version !== 1 || !Array.isArray(lab.plans) || lab.plans.length > PLAY_LAB_LIMITS.plans || !Array.isArray(lab.sessions) || lab.sessions.length > PLAY_LAB_LIMITS.sessions) invalid();
  const plans = new Map();
  for (const row of lab.plans) {
    if (!allowedKeys(row, planFields) || !commonValid(row) || !textValid(row.title, 60, true) || plans.has(row.id)) invalid();
    const parent = row.parentId === null ? null : plans.get(row.parentId);
    // A parent must have been saved earlier. This prevents orphan references,
    // cycles and silently replacing the plan from which a revision was made.
    if (row.parentId !== null && !parent || row.revision !== (parent ? parent.revision + 1 : 1)) invalid();
    plans.set(row.id, row);
  }
  const sessions = new Set();
  for (const row of lab.sessions) {
    if (!allowedKeys(row, sessionFields) || !commonValid(row) || sessions.has(row.id) || !idsValid(row.feedback) || !allowedKeys(row.stats, ['targetTouches', 'coverTouches', 'blankTouches', 'stages']) || !['targetTouches', 'coverTouches', 'blankTouches'].every(key => integer(row.stats[key])) || !stageStatsValid(row.stats.stages, row.plan) || typeof row.elapsed !== 'number' || !Number.isFinite(row.elapsed) || row.elapsed < 0 || row.elapsed > 60) invalid();
    if (row.planId !== null) {
      const saved = plans.get(row.planId);
      if (!saved || stable(saved.plan) !== stable(row.plan)) invalid();
    }
    sessions.add(row.id);
  }
  return lab;
}

export function readPlayLab(data) {
  if (!object(data) || !object(data.cat)) invalid();
  if (!own(data.cat, 'playLab')) return {version: 1, plans: [], sessions: []};
  return copy(assertLab(data.cat.playLab));
}

export function validPlayLab(cat) {
  try { readPlayLab({cat}); return true; }
  catch { return false; }
}

function put(data, lab) {
  assertLab(lab);
  return {...data, cat: {...data.cat, playLab: copy(lab)}};
}

export function savePlayPlan(data, {id, title, plan, parentId = null, observationIds = [], note = '', sound = 'off', createdAt = new Date().toISOString()}) {
  const lab = readPlayLab(data);
  if (lab.plans.length >= PLAY_LAB_LIMITS.plans) fail(t('這隻貓的玩法收藏已達 60 個，原收藏已保留。'));
  if (lab.plans.some(row => row.id === id)) fail(t('這個玩法版本已保存，未覆蓋原收藏。'));
  const parent = parentId === null ? null : lab.plans.find(row => row.id === parentId);
  if (parentId !== null && !parent) fail(t('找不到原玩法，未建立新版本。'));
  lab.plans.push({id, title, plan: copy(plan), parentId, revision: parent ? parent.revision + 1 : 1, observationIds: copy(observationIds), note, sound, createdAt});
  return put(data, lab);
}

export function savePlaySession(data, {id, planId = null, plan, observationIds = [], note = '', feedback = [], stats, elapsed, sound = 'off', createdAt = new Date().toISOString()}) {
  const lab = readPlayLab(data);
  if (lab.sessions.length >= PLAY_LAB_LIMITS.sessions) fail(t('這隻貓的陪玩回饋已達 200 筆，原紀錄已保留。'));
  if (lab.sessions.some(row => row.id === id)) fail(t('這次陪玩回饋已保存，未重複新增。'));
  lab.sessions.push({id, planId, plan: copy(plan), observationIds: copy(observationIds), note, feedback: copy(feedback), stats: copy(stats), elapsed, sound, createdAt});
  return put(data, lab);
}

// A trial may be collected after its feedback was saved. Attach only the
// matching favorite; this must never replace feedback or duplicate the session.
export function attachPlaySession(data, sessionId, planId) {
  const lab = readPlayLab(data);
  const session = lab.sessions.find(row => row.id === sessionId);
  const saved = lab.plans.find(row => row.id === planId);
  if (!session || !saved) fail(t('找不到陪玩回饋或收藏，原紀錄未更動。'));
  if (session.planId !== null && session.planId !== planId) fail(t('這次陪玩已連結另一個收藏，原紀錄未更動。'));
  if (stable(session.plan) !== stable(saved.plan)) fail(t('玩法內容不同，未連結收藏，原紀錄未更動。'));
  if (session.planId === planId) return data;
  session.planId = planId;
  return put(data, lab);
}

// Explicit owner actions only. Never evict records automatically at capacity.
export function removePlayPlan(data, planId) {
  const lab = readPlayLab(data);
  if (!lab.plans.some(row => row.id === planId)) fail(t('找不到這個收藏，原資料未更動。'));
  if (lab.plans.some(row => row.parentId === planId)) fail(t('這個收藏還有衍生版本，請先從最新版本開始整理；原收藏已保留。'));
  lab.plans = lab.plans.filter(row => row.id !== planId);
  // Sessions carry the complete original plan and remain readable on their own.
  for (const row of lab.sessions) if (row.planId === planId) row.planId = null;
  return put(data, lab);
}

export function removePlaySession(data, sessionId) {
  const lab = readPlayLab(data);
  if (!lab.sessions.some(row => row.id === sessionId)) fail(t('找不到這筆反應，原資料未更動。'));
  lab.sessions = lab.sessions.filter(row => row.id !== sessionId);
  return put(data, lab);
}
