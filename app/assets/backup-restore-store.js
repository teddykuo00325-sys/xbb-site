import {t} from './i18n.js?v=audit1117b';
import {parseBackup,validateRestoreData,restoreInventory,decodeRestoreImages} from './backup-restore-schema.js?v=fish-merge1';
import {APPEARANCE_KEY,appearanceChoice,saveAppearance} from './appearance.js?v=r4';
import {START_VIEW_KEY,saveStartView} from './family-navigation.js?v=r4';
export const RESTORE_ROLLBACK_KEY='pre-json-restore-v1';
// 裝置偏好（2026-11-14b）：外觀（inpaw-appearance-v1）與「開啟時先看」（inpaw.start-view.v1）存在 localStorage，不在照護資料裡。
// 匯出時放進備份檔頂層的 sessionOnlyDemoSettings.devicePreferences（schema 該區是 anyJSON，舊版 App 讀新備份不會被擋）；
// 還原時有這兩項才套回，舊備份沒有就維持這台裝置目前的設定。無效值一律略過，不擋整份還原。
export const DEVICE_PREFERENCES_VERSION=1;
const START_VIEWS=['family','last-cat'];
export function normalizeDevicePreferences(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const out={};
 if(['system','light','dark'].includes(value.appearance))out.appearance=value.appearance;
 if(START_VIEWS.includes(value.startView))out.startView=value.startView;
 return Object.keys(out).length?{version:DEVICE_PREFERENCES_VERSION,...out}:null;
}
export function readDevicePreferences(storage){
 let appearance='system',startView='last-cat';
 try{storage??=globalThis.localStorage;appearance=appearanceChoice(storage?.getItem(APPEARANCE_KEY));startView=storage?.getItem(START_VIEW_KEY)==='family'?'family':'last-cat';}catch{}
 return {version:DEVICE_PREFERENCES_VERSION,appearance,startView};
}
// 匯出端用：把裝置偏好附到 sessionOnlyDemoSettings，不動照護資料。
export function withDevicePreferences(settings={},storage){return {...(settings&&typeof settings==='object'?settings:{}),devicePreferences:readDevicePreferences(storage)};}
export const backupDevicePreferences=backup=>normalizeDevicePreferences(backup?.sessionOnlyDemoSettings?.devicePreferences);
// 套回：外觀立即生效；「開啟時先看」下次開啟時生效。回傳實際套用的項目，失敗不影響已完成的資料還原。
export function applyDevicePreferences(value,{appearance:setAppearance=saveAppearance,startView:setStartView=saveStartView}={}){
 const prefs=normalizeDevicePreferences(value),applied=[];if(!prefs)return applied;
 if(prefs.appearance){try{setAppearance(prefs.appearance);applied.push('appearance');}catch{}}
 if(prefs.startView){try{setStartView(prefs.startView);applied.push('startView');}catch{}}
 return applied;
}
const plans=new WeakMap();
const fail=message=>{throw Error(message)};
function ready(store){if(store.restoreBusy||store.running||store.resetting||store.failed||store.view.status!=='saved'||store.sequence!==store.savedSequence)fail(t('資料仍在保存中或保存失敗，請先完成保存，再匯入或回復。'));}
function fresh(store,record){ready(store);if(store.revision!==record.revision||store.get().data!==record.before)fail(t('資料已變更，這份預覽已失效。請重新讀取備份並確認。'));}
export function assertRestoreUnlocked(store){if(store.restoreBusy)fail(t('正在還原資料，請等候完成後再操作。'));}
export async function readRestoreRollback(open){const db=await open();return new Promise((resolve,reject)=>{let value;const tx=db.transaction('snapshots','readonly');const req=tx.objectStore('snapshots').get(RESTORE_ROLLBACK_KEY);req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=tx.onerror=()=>{db.close();reject(Error(t('無法讀取還原前副本，原資料未更動。')));};});}
// main and its recovery snapshot commit atomically in one IndexedDB transaction.
// No force overwrite, no family/history transforms, and no intermediate active data.
export async function writeRestoreSnapshot(open,target,expectedRevision,{mode='import',rollbackId,expectedBefore,devicePreferences}={}){
 const db=await open();return new Promise((resolve,reject)=>{
  let error,revision;const tx=db.transaction('snapshots','readwrite'),storage=tx.objectStore('snapshots');
  const abort=message=>{error=Error(message);try{tx.abort();}catch{}};
  const request=storage.get('main');request.onsuccess=()=>{
   const old=request.result,current=old?.revision??0;
   if(current!==expectedRevision){abort(t('另一分頁已更新資料，未覆蓋任何資料。請重新整理後再匯入。'));return;}
   if(!Number.isSafeInteger(current)||current<0||current>=Number.MAX_SAFE_INTEGER){abort(t('資料版本計數無效，未覆蓋原資料。'));return;}
   revision=current+1;
   const commit=()=>{try{storage.put({schemaVersion:2,revision,data:target},'main');}catch(e){error=e;tx.abort();}};
   if(mode==='rollback'){
    const backup=storage.get(RESTORE_ROLLBACK_KEY);backup.onsuccess=()=>{if(!backup.result||backup.result.id!==rollbackId){abort(t('還原前副本已變更或已使用，請重新預覽。'));return;}try{storage.delete(RESTORE_ROLLBACK_KEY);commit();}catch(e){error=e;tx.abort();}};
   }else{
    try{storage.put({format:'inpaw-restore-recovery',version:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),snapshot:old??{schemaVersion:2,revision:0,data:expectedBefore},...(devicePreferences?{devicePreferences}:{})},RESTORE_ROLLBACK_KEY);commit();}catch(e){error=e;tx.abort();}
   }
  };
  tx.oncomplete=()=>{db.close();resolve(revision);};
  tx.onabort=()=>{db.close();const e=error||tx.error;reject(e?.name==='QuotaExceededError'?Error(t('本機空間不足，還原未完成，原資料與還原前副本皆未更動。')):e||Error(t('本機還原失敗，原資料未更動。')));};tx.onerror=()=>{};
 });
}
export function createRestoreController(store,{validate,migrate,open,decode=decodeRestoreImages,write=(...args)=>writeRestoreSnapshot(open,...args),read=()=>readRestoreRollback(open),preferences={read:()=>readDevicePreferences(),apply:applyDevicePreferences}}={}){
 const prepare=async(source,mode='import')=>{
  ready(store);const before=store.get().data,revision=store.revision;let data,exportedAt,rollbackId,legacyMigration=false,devicePreferences=null;
  if(mode==='rollback'){
   const backup=await read();if(!backup)fail(t('沒有可回復的匯入前副本。成功匯入後才會產生一份。'));
   if(backup.format!=='inpaw-restore-recovery'||backup.version!==1||typeof backup.id!=='string'||![1,2].includes(backup.snapshot?.schemaVersion))fail(t('還原前副本格式不支援，原資料未更動。'));
   data=validateRestoreData(structuredClone(backup.snapshot.data),validate);exportedAt=backup.createdAt;rollbackId=backup.id;devicePreferences=normalizeDevicePreferences(backup.devicePreferences);
  }else{const backup=parseBackup(source,validate);data=backup.snapshot.data;exportedAt=backup.exportedAt;devicePreferences=backupDevicePreferences(backup);try{validateRestoreData(before,validate);await decode(before);}catch(e){throw Error(t('目前本機資料尚無法安全建立可回復副本，因此未匯入。請先匯出保留原資料。')+e.message);}}
  // Migrate only fields that the existing app already migrates on normal load.
  // Preserve every supplied value; never initialize rewards from an import action.
  legacyMigration=!Object.hasOwn(data,'multiCat');data=validateRestoreData(migrate(structuredClone(data)),validate);await decode(data);
  const record={before,revision,data,mode,rollbackId,devicePreferences,used:false};fresh(store,record);
  const preview=Object.freeze({mode,exportedAt,incoming:restoreInventory(data),current:restoreInventory(before),legacyMigration,devicePreferences});
  plans.set(preview,{store,...record});return preview;
 };
 const commit=async preview=>{
  const record=plans.get(preview);if(!record||record.store!==store||record.used)fail(t('這份還原預覽已失效，請重新讀取。'));fresh(store,record);record.used=true;
  const prior=store.view;store.restoreBusy=true;store.running=true;store.view={...prior,status:'saving',restoring:true};store.emit();
  try{
   let priorPreferences=null;if(record.mode!=='rollback'){try{priorPreferences=normalizeDevicePreferences(preferences.read?.());}catch{}}
   const revision=await write(record.data,record.revision,{mode:record.mode,rollbackId:record.rollbackId,expectedBefore:record.before,...(priorPreferences?{devicePreferences:priorPreferences}:{})});
   let appliedPreferences=[];try{appliedPreferences=preferences.apply?.(record.devicePreferences)||[];}catch{}
   const prefNotice=appliedPreferences.length?t('外觀與「開啟時先看」偏好也已套回。'):'';
   store.revision=revision;store.failed=false;await await globalThis.__deleteSafety?.clear?.();store.view={...prior,data:record.data,status:'saved',error:'',restoring:false,restoreGeneration:(prior.restoreGeneration||0)+1,restoreNotice:record.mode==='rollback'?t('已回復匯入前資料，並完成本機保存。')+prefNotice:t('JSON 備份已還原並完成本機保存。')+prefNotice+t('可到設定回復最近匯入前資料。')};
  }catch(error){store.view=prior;throw error;}
  finally{store.restoreBusy=false;store.running=false;store.emit();}
 };
 return {prepareRestore:source=>prepare(source),prepareRollback:()=>prepare(null,'rollback'),restore:commit};
}

export function attachRestoreController(store,options){Object.assign(store,createRestoreController(store,options));return store;}
