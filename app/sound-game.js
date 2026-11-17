import {t,K} from './assets/i18n.js?v=audit1117b';
// Pure sound rules. The root owns one device-local daily draw; each cat keeps
// only its own listening history and explicitly chosen preferences.
// Catalog v3 (2026-11-12): nature sounds retired, cat/household sounds added.
export const SOUND_TRACK_IDS = Object.freeze(['can', 'bag', 'meow', 'scratch', 'box', 'toy', 'jingle', 'plastic', 'wood', 'chimes', 'hum', 'paper', 'cloth']);
// Earlier catalogs stay frozen: saved daily draws are validated against their own order.
const CATALOG_V2 = Object.freeze(['can', 'bag', 'bird', 'rustle', 'rain', 'drops', 'chimes', 'hum', 'stream', 'drizzle', 'paper', 'cloth']);
const legacyTracks = Object.freeze(CATALOG_V2.slice(0, 8));
export const RETIRED_TRACK_IDS = Object.freeze(['bird', 'rustle', 'rain', 'drops', 'stream', 'drizzle']);
// Every ID ever shipped stays valid so old favorites, avoids and reaction records are never discarded.
const knownTracks = Object.freeze([...new Set([...SOUND_TRACK_IDS, ...CATALOG_V2])]);
const tracks = SOUND_TRACK_IDS;
const CURRENT_CATALOG_VERSION = 3;
const preferences = ['favorite', 'avoid', 'neutral'];
const reactions = [K('轉頭／靠近'), K('繼續休息'), K('走開或不安'), K('沒明顯反應')];
const careCategories = [K('飲食'), K('嘔吐'), K('體重'), K('喝水'), K('排泄'), K('其他'), K('照護施作')];
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const idValid = value => typeof value === 'string' && value.length > 0 && value.length <= 512;
const integer = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
const stampValid = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const idsValid = (value, maxLength = 512) => Array.isArray(value) && value.every(id => typeof id === 'string' && id.length > 0 && id.length <= maxLength) && new Set(value).size === value.length;
const list = value => Array.isArray(value) ? value : [];
const put = (data, game) => ({...data, cat: {...data.cat, soundGame: game}});
const entryKey = (scope, id) => `entry:${JSON.stringify([scope, id])}`;
const doseKey = (scope, id, date) => `care:${JSON.stringify([scope, id, date])}`;
const householdKey = id => `household:${JSON.stringify([id])}`;

export function localDay(now = new Date()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw Error(t('日期無法讀取。'));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validPreferences(value) {
  return object(value) && Object.entries(value).every(([id, p]) => knownTracks.includes(id) && preferences.includes(p));
}
function validRecords(g, legacy = false) {
  return idsValid(g.usedIds) && Array.isArray(g.records) && new Set(g.records.map(r => r?.id)).size === g.records.length
    && g.records.every(r => object(r) && idValid(r.id) && g.usedIds.includes(r.id) && knownTracks.includes(r.trackId)
      && stampValid(r.at) && dateValid(r.day) && (r.reaction === null || reactions.includes(r.reaction))
      && (legacy ? object(g.days[r.day]) && r.charged === true : !own(r, 'pending') || typeof r.pending === 'boolean'));
}
export function validSoundGame(cat) {
  if (!object(cat)) return false;
  if (!own(cat, 'soundGame')) return true;
  const g = cat.soundGame;
  if (!object(g) || !stampValid(g.activatedAt) || !validPreferences(g.preferences)) return false;
  if (g.version === 2) return validRecords(g);
  // Read v1 without discarding records, preferences, or its anti-reuse ledger.
  return g.version === 1 && integer(g.balance, 5) && [3, 5].includes(g.walletCap)
    && idsValid(g.baselineIds) && idsValid(g.claimedIds)
    && object(g.days) && Object.entries(g.days).every(([day, d]) => dateValid(day) && object(d) && d.granted === true && integer(d.explorations, 3) && integer(d.rewards, 2))
    && validRecords(g, true);
}

function makeSeed() {
  const values = new Uint32Array(4);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 0x100000000);
  return [...values].map(n => n.toString(16).padStart(8, '0')).join('');
}
function dailyOrder(seed, day, catalogVersion = CURRENT_CATALOG_VERSION) {
  let state = 2166136261;
  for (const c of `${seed}:${day}`) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let n = Math.imul(state ^ state >>> 15, state | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 0x100000000;
  };
  const order = [...(catalogVersion === 1 ? legacyTracks : catalogVersion === 2 ? CATALOG_V2 : tracks)];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Accept the root data object, like validSoundGame accepts the cat object.
// Missing state is valid for legacy backups and is initialized on load.
export function validSoundDaily(data) {
  if (!object(data)) return false;
  if (!own(data, 'soundDaily')) return true;
  const d = data.soundDaily;
  return object(d) && d.version === 1 && stampValid(d.activatedAt) && typeof d.seed === 'string' && /^[a-f0-9]{32}$/.test(d.seed)
    && idsValid(d.seenIds, 2048) && object(d.days)
    && Object.entries(d.days).every(([day, value]) => {
      if (!dateValid(day) || !object(value) || !idsValid(value.baseIds) || value.baseIds.length !== 2 || !value.baseIds.every(id => knownTracks.includes(id))) return false;
      // Missing catalogVersion is an existing eight-track draw. Never reroll saved days.
      if (own(value, 'catalogVersion') && ![1, 2, 3].includes(value.catalogVersion)) return false;
      const order = dailyOrder(d.seed, day, value.catalogVersion ?? 1);
      return value.baseIds.every((id, i) => id === order[i]) && (value.bonusId === null || value.bonusId === order[2]);
    });
}

function scopes(data) {
  return [{id: 'cat-original', data}, ...list(data.multiCat?.cats).filter(c => c?.id !== 'cat-original' && idValid(c?.id) && object(c.data)).map(c => ({id: c.id, data: c.data}))];
}
function rewardRows(data) {
  const rows = [];
  for (const scope of scopes(data)) {
    const owners = [scope.id, scope.data.cat?.id].filter(idValid);
    for (const row of list(scope.data.entries)) {
      if (object(row) && idValid(row.id)) rows.push({key: entryKey(scope.id, row.id), kind: 'entry', row, owners, scope: scope.id});
    }
    for (const item of list(scope.data.careItems)) {
      if (!object(item) || !idValid(item.id)) continue;
      for (const date of new Set([...list(item.history), item.last].filter(dateValid))) {
        rows.push({key: doseKey(scope.id, item.id, date), kind: 'dose', row: item, date, owners, scope: scope.id});
      }
    }
  }
  // These IDs are observed, but never rewardable. Later attribution/editing of
  // an old household note must not be mistaken for a genuinely new record.
  for (const row of list(data.multiCat?.householdEntries)) {
    if (object(row) && idValid(row.id)) rows.push({key: householdKey(row.id), kind: 'household', row});
  }
  return rows;
}
function legacySeenIds(data) {
  const result = [];
  for (const scope of scopes(data)) {
    const game = scope.data.cat?.soundGame;
    const old = game?.version === 1 ? game : game?.legacy;
    for (const key of [...list(old?.baselineIds), ...list(old?.claimedIds)]) {
      if (typeof key !== 'string') continue;
      if (key.startsWith('entry:') && idValid(key.slice(6))) result.push(entryKey(scope.id, key.slice(6)));
      else if (key.startsWith('care:')) {
        try {
          const [id, date] = JSON.parse(key.slice(5));
          if (idValid(id) && dateValid(date)) result.push(doseKey(scope.id, id, date));
        } catch { /* Unknown legacy metadata remains preserved in the archive. */ }
      }
    }
  }
  return result;
}
function syncDaily(data, now) {
  if (!validSoundDaily(data)) throw Error(t('每日聲音資料無法讀取，原資料已保留。'));
  const day = localDay(now);
  let daily = data.soundDaily;
  if (!daily) daily = {version: 1, activatedAt: new Date(now).toISOString(), seed: makeSeed(), days: {}, seenIds: [...new Set([...rewardRows(data).map(r => r.key), ...legacySeenIds(data)])]};
  if (!own(daily.days, day)) daily = {...daily, days: {...daily.days, [day]: {catalogVersion: CURRENT_CATALOG_VERSION, baseIds: dailyOrder(daily.seed, day).slice(0, 2), bonusId: null}}};
  return daily === data.soundDaily ? data : {...data, soundDaily: daily};
}
function migrateGame(g, now) {
  if (!g) return {version: 2, activatedAt: new Date(now).toISOString(), usedIds: [], records: [], preferences: {}};
  if (g.version === 2) return g;
  const {activatedAt, usedIds, records, preferences, ...legacy} = g;
  return {version: 2, activatedAt, usedIds, records, preferences, legacy};
}
export function syncGame(data, paid = false, now = new Date()) {
  if (!validSoundGame(data.cat)) throw Error(t('聲音探索資料無法讀取，原資料已保留。'));
  // Initialize the ledger before migration so deleted legacy IDs also survive.
  data = syncDaily(data, now);
  const next = migrateGame(data.cat.soundGame, now);
  return next === data.cat.soundGame ? data : put(data, next);
}

function eligibleCare(candidate, seen, now) {
  if (candidate.kind === 'household') return false;
  const r = candidate.row, day = localDay(now);
  if (r.category === K('交接') || r.kind === K('交接') || r.source === K('家庭交接') || r.handover) return false;
  if (r.demo || r.isDemo || /示範|demo/i.test(String(r.source || '') + String(r.category || '')) || /聲音|sound/i.test(String(r.source || '') + String(r.category || '')) || r.sound || r.trackId) return false;
  if (candidate.kind === 'dose' && /示範|demo/i.test(String(r.note || ''))) return false;
  if (own(r, 'catId') && (r.catId === null || !candidate.owners.includes(r.catId))) return false;
  if (r.draft || r.confirmed === false || r.ownership === 'unconfirmed' || r.deleted || r.deletedAt || r.isDeleted || ['draft', 'deleted', 'unconfirmed'].includes(r.status)) return false;
  const date = candidate.kind === 'dose' ? candidate.date : r.date;
  if (!dateValid(date) || date > day) return false;
  if (candidate.kind === 'dose') return typeof r.name === 'string' && !!r.name.trim();
  if (seen.has(householdKey(r.id)) || !careCategories.includes(r.category) || typeof r.text !== 'string' || !r.text.trim() || typeof r.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) return false;
  if (new Date(`${date}T${r.time}:00`).getTime() > new Date(now).getTime()) return false;
  // Backdated observations saved now count; importing an explicitly old
  // createdAt record does not turn it into a new care action.
  if (r.createdAt && (!stampValid(r.createdAt) || localDay(r.createdAt) !== day || Date.parse(r.createdAt) > new Date(now).getTime())) return false;
  return true;
}

// Call this inside the central durable store transaction, including writes
// made before the sound page has ever opened. All cats share this one bonus.
export function awardCareTransition(beforeRoot, afterRoot, now = new Date()) {
  if (!validSoundDaily(afterRoot)) throw Error(t('每日聲音資料無法讀取，原資料已保留。'));
  const baseline = syncDaily(beforeRoot, now), daily = baseline.soundDaily, day = localDay(now);
  const beforeRows = rewardRows(beforeRoot), afterRows = rewardRows(afterRoot);
  const seen = new Set([...daily.seenIds, ...beforeRows.map(r => r.key), ...legacySeenIds(beforeRoot)]);
  const afterKeys = new Set(afterRows.map(r => r.key));
  const editedDoseItems = new Set(beforeRows.filter(r => r.kind === 'dose' && !afterKeys.has(r.key)).map(r => JSON.stringify([r.scope, r.row.id])));
  const candidates = afterRows.filter(r => !seen.has(r.key));
  // Observe every ID, including drafts and malformed/future records. Editing,
  // deleting or re-adding one later can never create another reward.
  const allSeen = new Set([...seen, ...afterRows.map(r => r.key)]);
  const value = daily.days[day];
  const reward = value.bonusId === null && candidates.some(r => eligibleCare(r, allSeen, now)
    && !(r.kind === 'dose' && editedDoseItems.has(JSON.stringify([r.scope, r.row.id]))));
  const changedSeen = allSeen.size !== daily.seenIds.length;
  if (!reward && !changedSeen && afterRoot.soundDaily === daily) return afterRoot;
  const next = reward || changedSeen ? {...daily,
    seenIds: changedSeen ? [...allSeen] : daily.seenIds,
    days: reward ? {...daily.days, [day]: {...value, bonusId: dailyOrder(daily.seed, day, value.catalogVersion ?? 1)[2]}} : daily.days
  } : daily;
  return {...afterRoot, soundDaily: next};
}

export function summary(data, paid = false, now = new Date()) {
  if (!validSoundGame(data.cat) || !validSoundDaily(data)) throw Error(t('聲音探索資料無法讀取，原資料已保留。'));
  const day = localDay(now), daily = data.soundDaily, g = data.cat.soundGame;
  // Rendering never generates a seed or writes data. The store/hook initializes
  // first; a midnight render can derive its deterministic draw before the save.
  const value = daily ? daily.days[day] || {catalogVersion: CURRENT_CATALOG_VERSION, baseIds: dailyOrder(daily.seed, day).slice(0, 2), bonusId: null} : {baseIds: [], bonusId: null};
  return {day, paid: !!paid, baseIds: [...value.baseIds], bonusId: value.bonusId, rewardUnlocked: value.bonusId !== null,
    // Retired sounds from a draw saved before the catalog change are simply not offered today.
    allowedIds: (paid ? [...tracks] : [...value.baseIds, ...(value.bonusId ? [value.bonusId] : [])]).filter(id => tracks.includes(id)), records: g?.records || [], preferences: g?.preferences || {}};
}
// Legacy callers are harmless: rewards are granted only by a care-save diff.
export function claimRewards(data, paid = false, now = new Date()) { return syncGame(data, paid, now); }

export function explore(data, {id, trackId, paid = false, now = new Date()}) {
  data = syncGame(data, paid, now);
  const g = data.cat.soundGame, day = localDay(now);
  if (!idValid(id) || g.usedIds.includes(id)) throw Error(t('這次探索已處理，請重新開始。'));
  if (!tracks.includes(trackId)) throw Error(t('找不到這段聲音。'));
  if (!summary(data, paid, now).allowedIds.includes(trackId)) throw Error(t('這段聲音不在今天開放的清單中；Pro 可隨時選擇全部 13 種聲音。'));
  if (g.preferences[trackId] === 'avoid') throw Error(t('這段聲音已設為避開，請先調整偏好。'));
  return put(data, {...g, usedIds: [...g.usedIds, id], records: [{id, trackId, at: new Date(now).toISOString(), day, reaction: null, pending: true}, ...g.records]});
}
function game(data) {
  if (!validSoundGame(data.cat) || !data.cat.soundGame) throw Error(t('請先開啟聲音探索。'));
  return migrateGame(data.cat.soundGame, new Date());
}
export function confirmPlayback(data, id) {
  const g = game(data), row = g.records.find(r => r.id === id);
  if (!row || row.pending !== true) return data;
  return put(data, {...g, records: g.records.map(r => r.id === id ? {...r, pending: false} : r)});
}
export function refund(data, id) {
  const g = game(data), row = g.records.find(r => r.id === id);
  if (!row || row.pending !== true || row.reaction !== null) return data;
  return put(data, {...g, records: g.records.filter(r => r.id !== id)});
}
export function setPreference(data, trackId, value, paid = false) {
  const g = game(data);
  if (!knownTracks.includes(trackId) || !preferences.includes(value)) throw Error(t('請選擇有效的聲音偏好。'));
  return put(data, {...g, preferences: {...g.preferences, [trackId]: value}});
}
export function report(data, id, reaction, preference, paid = false) {
  const g = game(data), row = g.records.find(r => r.id === id);
  if (!row) throw Error(t('這筆探索已刪除，請重新查看。'));
  if (!reactions.includes(reaction)) throw Error(t('請選擇這次的反應。'));
  // Explicit favorites are available to every account. They do not change the
  // daily playback draw or override avoidance; reactions never imply a choice.
  const next = preference !== undefined ? setPreference(data, row.trackId, preference, paid).cat.soundGame : g;
  return put(data, {...next, records: g.records.map(r => r.id === id ? {...r, reaction, pending: false} : r)});
}
export function deleteRecord(data, id) {
  const g = game(data);
  return put(data, {...g, records: g.records.filter(r => r.id !== id)});
}
