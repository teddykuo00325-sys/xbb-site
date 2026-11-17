// Pending cloud result record (Android native cloud bridge only).
// The page stores one record per kind when a cloud job is submitted, so a finished result can be
// brought back after the user left the page. The result itself stays in the native bridge until the
// user saves or discards the draft; this record only says which screen and item it belongs to.
export const PENDING_MAX_MS = 8 * 60 * 1000;
const keyOf = kind => 'xbb.cloudPending.' + kind;

export function savePending(kind, record) {
 try { localStorage.setItem(keyOf(kind), JSON.stringify({...record, kind})); } catch { /* storage blocked: the result is simply not restorable */ }
}
export function loadPending(kind) {
 try {
  const record = JSON.parse(localStorage.getItem(keyOf(kind)) || 'null');
  return record && typeof record === 'object' ? record : null;
 } catch { return null; }
}
export function clearPending(kind) {
 try { localStorage.removeItem(keyOf(kind)); } catch { /* ignore */ }
}
export const pendingFresh = (record, now = Date.now()) =>
 !!record && Number.isFinite(record.submittedAt) && now - record.submittedAt >= 0 && now - record.submittedAt < PENDING_MAX_MS;

// Does a native status snapshot belong to this record? (same kind, request id and, when known, cloud job id)
export const statusMatches = (record, status, nativeKind) =>
 !!record && !!status && status.kind === nativeKind && status.meetingId === record.meetingId &&
 (!record.cloudJobId || status.jobId === record.cloudJobId);
