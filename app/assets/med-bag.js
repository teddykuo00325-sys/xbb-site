// 拍藥袋給線上解讀（Ian 2026-11-13）：最多 3 包拼成一張照片、算 1 次額度；結果帶進「＋ 記看診」表單的藥卡，
// 每一種藥都要飼主「核對過了」才能存。照片解讀完線上就刪；App 只把結果文字放進表單，不另外保存照片。
// 走原生 V161Cloud 的 submit／status（和食品照片同一條照片佇列，用 mode=med-bag 分流）。
// 語言（2026-11-14）：英文介面送 lang='en'（job 既有欄位），worker 只補「藥袋原文照抄不翻譯」的提示；繁中照舊送 zh-TW。

import {t, isEnglish} from './i18n.js?v=audit1117b';
export const MED_BAG_MODE = 'med-bag';
export const MED_BAG_MAX_PHOTOS = 3;
export const MED_BAG_PENDING = 'xbb.cloudPending.med';
const MAX_EDGE = 2048, MAX_BYTES = 660000, PENDING_MAX_MS = 8 * 60 * 1000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const validDate = value => typeof value === 'string' && DATE.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
// 新 worker 保留原頻率。按需不建固定提醒；只有頻率而沒有原文明示鐘點時，不接受 AI 猜出的排程。
export function medBagTimes(row) {
  const times = [...new Set((Array.isArray(row?.times) ? row.times : []).filter(t => typeof t === 'string' && t.length === 5 && TIME.test(t)))].sort().slice(0, 4);
  const schedule = str(row?.scheduleText, 60), source = schedule + ' ' + str(row?.note, 30);
  if (!schedule) return []; // 舊 worker 沒有時間原文，候選鐘點不能直接變成固定提醒。
  if (/需要時|必要時|視需要|按需|疼痛時|\bPRN\b/i.test(source)) return [];
  if (schedule || /每\s*(?:\d+(?:\.\d+)?|[一二兩三四五六七八九十]+)\s*(?:個)?\s*小時|\bq\s*\d+\s*h\b|(?:一天|每日|每天|每\s*日)\s*(?:\d+|[一二兩三四五六七八九十]+)\s*次/i.test(source)) {
    const printed = new Set([...source.matchAll(/(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g)].map(m => m[1].padStart(2, '0') + ':' + m[2]));
    return times.filter(t => printed.has(t));
  }
  return [];
}

/** 線上回傳的文字 → {meds, nextVisit}；格式不對回 null（App 端再檢查一次，不只信線上）。 */
export function parseMedBag(text) {
  let data;
  try { data = typeof text === 'string' ? JSON.parse(text) : text; } catch { return null; }
  if (!data || data.schema !== 'med-bag.v1' || !Array.isArray(data.meds)) return null;
  const meds = data.meds.slice(0, 10).map(m => {
   const times = medBagTimes(m), candidates = [...new Set((Array.isArray(m?.times) ? m.times : []).filter(t => typeof t === 'string' && t.length === 5 && TIME.test(t) && !times.includes(t)))].sort().slice(0, 4);
   return {
    name: str(m?.name, 60), dose: str(m?.dose, 60), note: str(m?.note, 30),
    times,
    days: Number.isInteger(m?.days) && m.days >= 1 && m.days <= 90 ? m.days : null,
    ...(str(m?.scheduleText, 60) ? {scheduleText: str(m.scheduleText, 60)} : {}),
    ...(candidates.length ? {timeCandidates: candidates} : {}),
   };
  }).filter(m => m.name);
  if (!meds.length) return null;
  const nextVisit = validDate(data.nextVisit) ? data.nextVisit : '';
  return {meds, nextVisit};
}

/** 解讀結果 → 表單的藥卡（標記待核對）。藥袋沒寫的時間、天數留空，讓飼主照獸醫說的補。 */
export function bagToMeds(result) {
  return result.meds.map(m => ({
    name: m.name, dose: m.note ? (m.dose ? t('{dose}（{note}）', {dose: m.dose, note: m.note}) : m.note) : m.dose,
    times: m.times, start: '', end: '', days: m.days ? String(m.days) : '', fromBag: true, reviewed: false,
    ...(m.scheduleText ? {fromBagScheduleText: m.scheduleText} : {}),
    ...(m.timeCandidates?.length ? {fromBagTimeCandidates: [...m.timeCandidates]} : {}),
  }));
}

/** 存檔前：藥袋帶入的每一種藥都要核對過。 */
export function unreviewedBagMeds(meds) {
  return (meds || []).filter(m => m.fromBag && !m.reviewed && String(m.name || '').trim());
}

// ── 照片：最多 3 張拼成一張（1 張照原比例；2 張左右並排；3 張 2×2），最長邊 2048、JPEG 660 KB 內 ──
export function bagLayout(sizes) {
  const n = sizes.length;
  if (n === 1) { const s = Math.min(1, MAX_EDGE / Math.max(sizes[0].width, sizes[0].height)); return {width: Math.round(sizes[0].width * s), height: Math.round(sizes[0].height * s), cells: [{x: 0, y: 0, w: Math.round(sizes[0].width * s), h: Math.round(sizes[0].height * s)}]}; }
  const cols = 2, rows = n === 2 ? 1 : 2, cw = MAX_EDGE / cols, ch = n === 2 ? MAX_EDGE : MAX_EDGE / 2;
  const cells = sizes.map((s, i) => {
    const k = Math.min(cw / s.width, ch / s.height), w = Math.round(s.width * k), h = Math.round(s.height * k);
    return {x: (i % cols) * cw + Math.round((cw - w) / 2), y: Math.floor(i / cols) * ch + Math.round((ch - h) / 2), w, h};
  });
  return {width: MAX_EDGE, height: rows * ch, cells};
}

export async function composeBagPhotos(files, {w = globalThis} = {}) {
  if (!files?.length || files.length > MED_BAG_MAX_PHOTOS) throw Error(t('請拍 1 到 3 張藥袋照片。'));
  const bitmaps = [];
  try {
    for (const file of files) bitmaps.push(await w.createImageBitmap(file, {imageOrientation: 'from-image'}));
  } catch { bitmaps.forEach(b => b.close?.()); throw Error(t('照片讀不出來，請換一張再試。')); }
  const layout = bagLayout(bitmaps.map(b => ({width: b.width, height: b.height})));
  const draw = scale => {
    const canvas = w.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(layout.width * scale)); canvas.height = Math.max(1, Math.round(layout.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    bitmaps.forEach((b, i) => { const c = layout.cells[i]; ctx.drawImage(b, c.x * scale, c.y * scale, c.w * scale, c.h * scale); });
    return canvas;
  };
  const toBlob = (canvas, q) => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', q));
  try {
    let scale = 1;
    for (let round = 0; round < 4; round++, scale *= 0.85) {
      const canvas = draw(scale);
      for (const q of [0.85, 0.75, 0.65, 0.55]) {
        const blob = await toBlob(canvas, q);
        if (blob && blob.size <= MAX_BYTES) {
          const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = '';
          for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const thumbCanvas = draw(Math.min(1, 640 / layout.width));
          return {base64: w.btoa(binary), thumb: thumbCanvas.toDataURL('image/jpeg', 0.6)};
        }
      }
    }
    throw Error(t('照片太大，請少拍一張或靠近一點再拍。'));
  } finally { bitmaps.forEach(b => b.close?.()); }
}

// ── 等待與帶回（離開頁面、App 重開都接得回來）──
const storage = () => { try { return globalThis.localStorage; } catch { return null; } };
export function loadMedPending() {
  try { const r = JSON.parse(storage()?.getItem(MED_BAG_PENDING) || 'null'); return r && typeof r === 'object' ? r : null; } catch { return null; }
}
export function saveMedPending(record) { try { storage()?.setItem(MED_BAG_PENDING, JSON.stringify(record)); } catch { /* 存不下就只是不能接回 */ } }
export function clearMedPending() { try { storage()?.removeItem(MED_BAG_PENDING); } catch { /* ignore */ } }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const busyText = s => s.kind === 'image' ? (s.mode === MED_BAG_MODE ? t('藥袋') : t('食品照片')) : s.mode === 'play-design' ? t('陪玩設計') : s.mode === 'voice-draft' ? t('語音快記') : t('看診摘要');
const failText = summary => {
  let code = '';
  try { code = JSON.parse(summary || 'null')?.code || ''; } catch { /* not JSON */ }
  if (code === 'quota') return t('這個月的進階模式額度用完了。可以手動加藥，或到方案頁看額度包。');
  if (code === 'unreadable') return t('藥袋上的字讀不出來。請拍清楚藥名和用法那一面再試，或手動加藥。');
  return t('線上暫時無法解讀，請稍後再試，或手動加藥。');
};

/** 送出：先確認線上沒有別份在處理或等核對，才送。回傳 meetingId。 */
export async function submitMedBag(cloud, base64, draft) {
  let attempted=false;
  try {
  const before = await cloud.request('status');
  if (['queued', 'processing', 'submitting'].includes(before.state)) throw Error(t('進階模式正在處理上一份，請等完成後再拍藥袋。'));
  if (before.state === 'done') {
    const mine = loadMedPending();
    if (!(mine && before.meetingId === mine.meetingId)) throw Error(t('還有一份{before}的線上結果等你處理，請先到那邊查看後再拍藥袋。', {before: busyText(before)}));
    await cloud.request('ack');
  } else if (before.state !== 'idle') await cloud.request('ack');
  const meetingId = 'med-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36));
  attempted=true;
  const sent = await cloud.request('submit', {meetingId, imageB64: base64, mode: MED_BAG_MODE, lang: isEnglish() ? 'en' : 'zh-TW'});
  if (sent?.error) throw Object.assign(Error(sent.error),{billing:sent.billing||'unknown'});
  saveMedPending({meetingId, cloudJobId: sent?.jobId || '', submittedAt: Date.now(), ...draft});
  return meetingId;
  } catch(error) {
    if(!attempted)error.billing='not-charged';
    throw error;
  }
}

/**
 * 等結果（或接回離開前送出的那一份）。回傳 {result} 或 null（沒有可接回的）；失敗丟 Error（訊息給飼主看）。
 * signal 中止只是停止等待，線上照樣處理，回來還接得到。
 */
export async function waitMedBag(cloud, {signal, interval = 2000} = {}) {
  for (;;) {
    const record = loadMedPending();
    if (!record) return null;
    const s = await cloud.request('status');
    const mine = s.kind === 'image' && s.meetingId === record.meetingId && (!record.cloudJobId || !s.jobId || s.jobId === record.cloudJobId);
    if (!mine) { clearMedPending(); return null; }
    if (s.state === 'done') {
      const result = parseMedBag(s.summary);
      if (result) return {result, record, billing:s.billing&&s.billing!=='unknown'?s.billing:'charged'};
      await cloud.request('ack'); clearMedPending();
      throw Object.assign(Error(failText(s.summary)),{billing:s.billing&&s.billing!=='unknown'?s.billing:'charged'});
    }
    if (s.state === 'failed' || s.state === 'timeout') {
      await cloud.request('ack'); clearMedPending();
      throw Object.assign(Error(s.state === 'timeout' ? t('線上等太久沒有回應，請再試一次，或手動加藥。') : failText(s.summary)),{billing:s.billing||'unknown'});
    }
    if (!(Date.now() - record.submittedAt < PENDING_MAX_MS)) {
      await cloud.request('cancel'); clearMedPending();
      throw Object.assign(Error(t('線上等太久沒有回應。請再試一次，或手動加藥。')),{billing:'unknown'});
    }
    if (signal?.aborted) return null;
    await sleep(interval);
    if (signal?.aborted) return null;
  }
}

/** 結果已經帶進表單並存好（或飼主放棄）：讓線上刪掉這份結果。 */
export async function releaseMedBag(cloud) {
  const record = loadMedPending();
  clearMedPending();
  if (!record || !cloud) return;
  try {
    const s = await cloud.request('status');
    if (s.kind === 'image' && s.meetingId === record.meetingId) {
      // 還在處理（飼主先停止等待、自己填完存了）：取消，結果不會再帶回來；已經好了就讓線上刪掉。
      if (['queued', 'processing', 'submitting'].includes(s.state)) await cloud.request('cancel');
      else if (s.state !== 'idle') await cloud.request('ack');
    }
  } catch { /* 原生之後會再清 */ }
}
