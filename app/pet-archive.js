import {t} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
// Archive is reversible registry metadata. Pet data is never moved or deleted.
export const isPetArchived=pet=>typeof pet?.archivedAt==='string';
export const activePetEntries=multi=>(multi?.cats||[{id:'cat-original'}]).filter(pet=>!isPetArchived(pet));
export const archivedPetEntries=multi=>(multi?.cats||[]).filter(isPetArchived);
export const petArchiveGeneration=pet=>pet?.archiveGeneration??0;
export function validPetArchive(pet){
 if(Object.hasOwn(pet,'archiveGeneration')&&(!Number.isSafeInteger(pet.archiveGeneration)||pet.archiveGeneration<0))return false;
 if(!Object.hasOwn(pet,'archivedAt'))return true;
 return typeof pet.archivedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(pet.archivedAt)&&Number.isFinite(Date.parse(pet.archivedAt))&&new Date(pet.archivedAt).toISOString()===pet.archivedAt;
}
export function requireActivePet(data,id,generation){
 const pet=(data.multiCat?.cats||[{id:'cat-original'}]).find(pet=>pet.id===id);
 if(!pet)throw Error(t('找不到這隻毛孩，未更動資料。'));
 if(isPetArchived(pet))throw Error(t('這隻毛孩已封存，請先到「切換毛孩」的已封存毛孩恢復，再繼續操作。'));
 if(generation!==undefined&&petArchiveGeneration(pet)!==generation)throw Error(t('這隻毛孩的封存狀態已變更，舊畫面無法再保存。請重新開啟操作。'));
 return pet;
}
export function archivePet(multi,id,at=new Date().toISOString()){
 const pet=multi.cats.find(pet=>pet.id===id);
 if(!pet||isPetArchived(pet))throw Error(t('毛孩已封存或不存在，請重新開啟「切換毛孩」。'));
 const active=activePetEntries(multi);
 if(active.length<=1)throw Error(t('至少保留一隻照顧中的毛孩。請先新增或恢復另一隻，再封存這隻毛孩。'));
 const updated={...pet,archivedAt:at,archiveGeneration:petArchiveGeneration(pet)+1};
 if(!validPetArchive(updated))throw Error(t('封存時間或版本無效，資料未更動。'));
 return {...multi,activeId:multi.activeId===id?active.find(other=>other.id!==id).id:multi.activeId,cats:multi.cats.map(row=>row===pet?updated:row)};
}
export function restorePet(multi,id){
 const pet=multi.cats.find(pet=>pet.id===id);
 if(!pet||!isPetArchived(pet))throw Error(t('這隻毛孩已恢復或不存在，請重新開啟「切換毛孩」。'));
 const {archivedAt,...kept}=pet,updated={...kept,archiveGeneration:petArchiveGeneration(pet)+1};
 if(!validPetArchive(updated))throw Error(t('恢復版本無效，資料未更動。'));
 return {...multi,cats:multi.cats.map(row=>row===pet?updated:row)};
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const scope=(data,pet)=>pet.id==='cat-original'?Object.fromEntries(['cat','foodCards','entries','changes','careItems','foodSession'].map(key=>[key,data[key]])):pet.data;
// Every normal store write passes this guard. A stale root/scoped callback may
// neither alter archived content nor overwrite the registry from an old snapshot.
// Explicit JSON restore uses its separate confirmed, CAS-protected controller.
export function assertPetArchiveTransition(before,after){
 for(const old of before.multiCat?.cats||[]){
  const next=after.multiCat?.cats.find(pet=>pet.id===old.id);
  if(!next){if(isPetArchived(old)||petArchiveGeneration(old))throw Error(t('已封存毛孩與恢復歷程不可移除。'));continue;}
  const changed=old.archivedAt!==next.archivedAt;
  if(petArchiveGeneration(next)!==petArchiveGeneration(old)+(changed?1:0))throw Error(t('毛孩封存狀態已變更，請重新開啟操作，避免覆蓋。'));
  if(changed&&!validPetArchive(next))throw Error(t('毛孩封存狀態無效，資料未更動。'));
  if(isPetArchived(old)||isPetArchived(next)){
   if(!equal(scope(before,old),scope(after,next)))throw Error(t('封存毛孩的紀錄、照片、草稿與提醒須完整保留，請恢復後再編輯。'));
   for(const key of ['careJourneys','careAISummaries'])if(!equal((before[key]||[]).filter(row=>row.catId===old.id),(after[key]||[]).filter(row=>row.catId===old.id)))throw Error(t('封存毛孩的照護觀察與摘要須完整保留。'));
  }
 }
 return after;
}
