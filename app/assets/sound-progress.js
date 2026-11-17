// Read-only, per-cat history. A shared daily draw is not this cat's progress.
// Pending/failed playback and the legacy silent demo never count as a listen.
export function soundProgress(profile){
 const rows=(profile?.soundGame?.records||[]).filter(row=>row.pending!==true);
 return {playCount:rows.length,trackCount:new Set(rows.map(row=>row.trackId)).size,
  reactionCount:rows.filter(row=>!!row.reaction).length,pendingCount:rows.filter(row=>!row.reaction).length};
}
