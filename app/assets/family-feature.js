import {assertPetArchiveTransition} from './pet-archive.js?v=8f5745b7843b';
// Family collaboration is paused. Keep its implementation and saved data so it
// can be restored later, but do not expose it as an available product feature.
export const FAMILY_SHARING_ENABLED=false;
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const recordKeys=['createdBy','createdAt','editedBy','editedAt','handover'];
const careKeys=[...recordKeys,'assigneeId','familyEvents'];
function keepMetadata(before=[],after=[],keys){
 const old=new Map(before.map(row=>[row.id,row]));
 return after.map(row=>{const prior=old.get(row.id);if(!prior)return row;const next={...row};for(const key of keys){if(own(prior,key))next[key]=prior[key];else delete next[key];}return next;});
}
function keepCat(before={},after={}){
 return {...after,...(own(after,'entries')?{entries:keepMetadata(before.entries,after.entries,recordKeys)}:{}),...(own(after,'changes')?{changes:keepMetadata(before.changes,after.changes,recordKeys)}:{}),...(own(after,'careItems')?{careItems:keepMetadata(before.careItems,after.careItems,careKeys)}:{})};
}
// Returning to a single-user UI must not strand a previously selected viewer,
// rewrite their saved identity, or claim that new actions came from that person.
export function preserveFamilyArchive(before,after){
 assertPetArchiveTransition(before,after);
 let next=keepCat(before,after);
 if(own(before,'familySharing'))next.familySharing=before.familySharing;
 if(next.multiCat){const prior=new Map((before.multiCat?.cats||[]).map(cat=>[cat.id,cat.data]));next={...next,multiCat:{...next.multiCat,cats:next.multiCat.cats.map(cat=>cat.id==='cat-original'?cat:{...cat,data:keepCat(prior.get(cat.id),cat.data)}),householdEntries:keepMetadata(before.multiCat?.householdEntries,next.multiCat.householdEntries,recordKeys)}};}
 return next;
}
