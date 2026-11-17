// A meal edit stores the original entry IDs for every existing part.
// Rebase only drafts affected by a deletion; keep other user input intact.
function rebase(feeding, entries, deletedId) {
  if (!feeding) return feeding;
  const removed=feeding.removedPartIds;
  if(removed?.some(id=>!entries.has(id)))feeding={...feeding,removedPartIds:removed.filter(id=>entries.has(id))};
  const parts = Array.isArray(feeding.parts) ? feeding.parts : [];
  const missing = id => !!id && !entries.has(id);
  if (deletedId ? feeding.id !== deletedId && !parts.some(part => part.id === deletedId)
    : !missing(feeding.id) && !parts.some(part => missing(part.id))) return feeding;

  const kept = parts.filter(part => !missing(part.id));
  const original = kept.find(part => part.id === feeding.id) || kept.find(part => part.id);
  if (!deletedId) {
    // Legacy repair is limited to a mixed draft with a verifiable surviving
    // meal. A wholly unknown or cross-meal reference is still rejected.
    const group = entries.get(original?.id)?.mealGroupId;
    if (!group || kept.some(part => part.id && entries.get(part.id)?.mealGroupId !== group)) return feeding;
  }
  const first = kept[0];
  if (!first) return null;
  const {foodId, quickName, quickCategory, provided, eaten, unit, noEatingConfirmed} = first;
  return {...feeding, id:original?.id || '', foodId, quickName, quickCategory:quickCategory || undefined,
    provided, eaten, unit, noEatingConfirmed, parts:kept};
}

function repairScope(scope, deletedId) {
  const drafts = scope.cat.mealDrafts;
  const session = scope.foodSession;
  const mealSession = session?.feedPending || session?.foodPending && session.foodOrigin === 'feed';
  if (!drafts?.length && !mealSession) return scope;
  const entries = new Map(scope.entries.map(row => [row.id, row]));
  let changed = false;
  const mealDrafts = drafts?.flatMap(draft => {
    const feeding = rebase(draft.feeding, entries, deletedId);
    if (feeding === draft.feeding) return [draft];
    changed = true;
    return feeding ? [{...draft, feeding}] : draft.foodDraft ? [{...draft, feeding:emptyMeal(draft.feeding)}] : [];
  });
  let foodSession = session;
  if (mealSession) {
    const feeding = rebase(session.feeding, entries, deletedId);
    if (feeding !== session.feeding) {
      changed = true;
      const origin = session.feedOrigin;
      const feedOrigin = origin?.screen === 'entry' && origin.id !== feeding?.id
        ? feeding?.id ? {...origin, id:feeding.id} : {screen:origin.parent || 'records'}
        : origin;
      foodSession = feeding ? {...session, feeding, feedOrigin} : session.foodPending
        ? {...session, screen:'list', feedOrigin, feeding:emptyMeal(session.feeding),
          feedPending:false, feedDirty:false, foodOrigin:session.foodOrigin === 'feed' ? 'list' : session.foodOrigin}
        : null;
    }
  }
  return changed ? {...scope, ...(drafts && {cat:{...scope.cat, mealDrafts}}), foodSession} : scope;
}

function emptyMeal({date, time, unit}) {
  return {id:'', foodId:'', date, time, unit, provided:'', eaten:'', note:'', change:false};
}

export function repairLegacyMealDrafts(data) {
  const root = repairScope(data);
  const multi = root.multiCat;
  if (!multi) return root;
  let changed = false;
  const cats = multi.cats.map(pet => {
    if (pet.id === 'cat-original' || !pet.data) return pet;
    const data = repairScope(pet.data);
    if (data === pet.data) return pet;
    changed = true;
    return {...pet, data};
  });
  return changed ? {...root, multiCat:{...multi, cats}} : root;
}

export function deleteRecordAndRepairDrafts(data, id) {
  return repairScope({...data, entries:data.entries.filter(row => row.id !== id),
    changes:data.changes.filter(change => !(change.sourceEntryId === id && change.sourceType === 'feeding'))}, id);
}
