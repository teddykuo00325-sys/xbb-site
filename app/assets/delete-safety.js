import {t, tn} from './i18n.js?v=audit1117b';
// One-slot safety copy taken right before a destructive action (delete a record, clear records, reset, delete a
// household note...). It lives next to the app data in the same IndexedDB (`xiaobenben-local`, store `snapshots`)
// under its own key, is overwritten by the next one and cleared after a backup restore. Nothing leaves the device.
//
// Rules this file keeps:
// - the copy is finished (awaited) before the delete runs, so it always holds the data as it was;
// - if the copy cannot be made, the old one is removed (it would be misleading) and the caller is told (`false`);
// - 「復原」 puts back what that action removed and keeps everything added or changed since (2026-11-17; it used to roll
//   the whole data back, silently dropping later records); only the newest copy exists.
const DB='xiaobenben-local',STORE='snapshots',MAIN='main',KEY='pre-delete-v1';
export const SAFETY_SCOPE_NOTE=t('會把刪掉的資料放回來，刪除之後新增或修改的紀錄都會保留；只保留最近一次。');

const isObj=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isDead=row=>!!(row.deleted||row.deletedAt||row.isDeleted);
const idRows=rows=>rows.every(row=>isObj(row)&&typeof row.id==='string'&&row.id);
/** Current data plus whatever the copy still had: removed or soft-deleted rows (matched by id) come back, nothing newer is lost.
 *  Plain values and arrays without ids keep the current version. */
export function mergeRestoredData(current,copy){
 if(Array.isArray(current)&&Array.isArray(copy)){
  if(!copy.length||!idRows(copy)||!idRows(current))return current;
  const old=new Map(copy.map(row=>[row.id,row])),have=new Set(current.map(row=>row.id));
  const rows=current.map(row=>{const before=old.get(row.id);if(!before)return row;if(isDead(row)&&!isDead(before))return before;return mergeRestoredData(row,before);});
  for(const row of copy)if(!have.has(row.id))rows.push(row);
  return rows;
 }
 if(isObj(current)&&isObj(copy)){
  const out={...current};
  for(const key of Object.keys(copy))out[key]=Object.hasOwn(current,key)?mergeRestoredData(current[key],copy[key]):copy[key];
  return out;
 }
 return current;
}

const open=()=>new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB);
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
const run=(db,mode,fn)=>new Promise((resolve,reject)=>{
 let result;
 const tx=db.transaction(STORE,mode);
 fn(tx.objectStore(STORE),value=>{result=value;});
 tx.oncomplete=()=>resolve(result);
 tx.onerror=()=>reject(tx.error);
 tx.onabort=()=>reject(tx.error||Error('aborted'));
});

let lastKept=false;

export async function clearDeleteSafetyCopy(){
 let db;
 try{db=await open();await run(db,'readwrite',store=>{store.delete(KEY);});return true;}
 catch{return false;}
 finally{db?.close();}
}

// Resolves true when a fresh copy exists, false when it could not be made (the stale one is removed).
export async function keepDeleteSafetyCopy(label){
 let db,ok=false;
 try{
  db=await open();
  await run(db,'readwrite',(store)=>{
   const read=store.get(MAIN);
   read.onsuccess=()=>{
    if(read.result){
     store.put({format:'inpaw-delete-safety',version:1,createdAt:new Date().toISOString(),label:String(label||'').slice(0,40),snapshot:read.result},KEY);
     ok=true;
    }
   };
  });
 }catch{ok=false;}
 finally{db?.close();}
 if(!ok)await clearDeleteSafetyCopy();
 lastKept=ok;
 return ok;
}

// {createdAt,label} of the saved copy, or null.
export async function readDeleteSafetyCopy(){
 let db;
 try{
  db=await open();
  const copy=await run(db,'readonly',(store,done)=>{const read=store.get(KEY);read.onsuccess=()=>done(read.result||null);});
  return copy&&copy.format==='inpaw-delete-safety'&&copy.snapshot?{createdAt:copy.createdAt,label:copy.label}:null;
 }catch{return null;}
 finally{db?.close();}
}

// Puts back what the action removed (keeping later additions), then reloads so the app reads it fresh.
export async function restoreDeleteSafetyCopy({reload=()=>globalThis.location?.reload()}={}){
 const db=await open();
 try{
  const copy=await run(db,'readonly',(store,done)=>{const read=store.get(KEY);read.onsuccess=()=>done(read.result||null);});
  if(!copy||copy.format!=='inpaw-delete-safety'||!copy.snapshot)throw Error(t('沒有可以復原的副本。'));
  await run(db,'readwrite',(store)=>{
   const read=store.get(MAIN);
   read.onsuccess=()=>{
    const current=read.result;
    const merged=isObj(current)&&isObj(current.data)&&isObj(copy.snapshot.data)
     ?{...current,revision:Number.isSafeInteger(current.revision)?current.revision+1:1,data:mergeRestoredData(current.data,copy.snapshot.data)}
     :copy.snapshot;
    store.put(merged,MAIN);store.delete(KEY);
   };
  });
 }finally{db.close();}
 reload();
 return true;
}

// A small bar after the action: 「已刪除　復原」. Only offers 復原 when a copy really exists; otherwise says so plainly.
export function showSafetySnack(message,{doc=globalThis.document,kept=lastKept,ms=8000,restore=restoreDeleteSafetyCopy}={}){
 if(!doc?.body)return null;
 doc.getElementById('inpaw-snack')?.remove();
 const bar=doc.createElement('div');
 bar.id='inpaw-snack';bar.className='inpaw-snack';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
 let timer;
 const close=()=>{clearTimeout(timer);bar.remove();};
 const arm=()=>{clearTimeout(timer);timer=setTimeout(close,ms);};
 const text=doc.createElement('span');
 const button=(label,onClick,primary)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;if(primary)b.className='is-primary';b.addEventListener('click',onClick);return b;};
 const ask=()=>{
  bar.replaceChildren();
  text.textContent=t('{note}確定要復原嗎？', {note: SAFETY_SCOPE_NOTE});
  const error=doc.createElement('small');
  bar.append(text,button(t('確定復原'),async()=>{try{await restore();}catch(e){error.textContent=tn(e?.message)||t('復原失敗，請再試一次。');if(!error.isConnected)bar.append(error);}},true),button(t('先不要'),close));
  arm();
 };
 text.textContent=kept?message:t('{message}（這次沒有留下可復原的副本）', {message});
 bar.append(text);
 if(kept)bar.append(button(t('復原'),ask,true));
 bar.append(button(t('關閉'),close));
 doc.body.append(bar);
 arm();
 return bar;
}

// Runs before a destructive action; always resolves (true = copy exists).
export function guardDelete(label){return keepDeleteSafetyCopy(label);}

if(typeof window!=='undefined')window.__deleteSafety=Object.freeze({keep:keepDeleteSafetyCopy,guard:guardDelete,clear:clearDeleteSafetyCopy,read:readDeleteSafetyCopy,restore:restoreDeleteSafetyCopy,snack:(message,options)=>showSafetySnack(message,options)});
