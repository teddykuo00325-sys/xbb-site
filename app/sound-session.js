import {syncGame,explore,confirmPlayback,refund,summary,localDay} from '/xbb-site/app/sound-game.js?v=8f5745b7843b';
import {t,tn} from './assets/i18n.js?v=audit1117b';

// A started recording must never be mistaken for a failed play after a remount.
// Keep the success marker before the async save, and retry the appropriate write.
const repairsByScope=new Map();
const repairStorageKey='inpaw-sound-record-repairs';
function repairJournal(key){
 if(repairsByScope.has(key))return repairsByScope.get(key);
 const repairs=new Map();
 if(typeof key==='string')try{
  const saved=JSON.parse(sessionStorage.getItem(repairStorageKey)||'{}')[key];
  if(saved&&typeof saved==='object')for(const [id,kind] of Object.entries(saved))if(['confirm','cleanup'].includes(kind))repairs.set(id,kind);
  // Old sessions may still have an unsuccessful pending-record cleanup.
  const old=JSON.parse(sessionStorage.getItem('inpaw-sound-refunds')||'{}')[key];
  if(typeof old==='string'&&!repairs.has(old))repairs.set(old,'cleanup');
 }catch{}
 repairsByScope.set(key,repairs);return repairs;
}
function persistRepairs(key,repairs){
 if(typeof key!=='string')return;
 try{
  const all=JSON.parse(sessionStorage.getItem(repairStorageKey)||'{}');
  if(repairs.size)all[key]=Object.fromEntries(repairs);else delete all[key];
  sessionStorage.setItem(repairStorageKey,JSON.stringify(all));
  const old=JSON.parse(sessionStorage.getItem('inpaw-sound-refunds')||'{}');delete old[key];
  sessionStorage.setItem('inpaw-sound-refunds',JSON.stringify(old));
 }catch{}
}
const savedView=view=>view.status===undefined||view.status==='saved';
function persistedSummary(data,paid,now){
 const value=summary(data,paid,now);
 if(data.soundDaily?.days?.[value.day])return value;
 return {...value,baseIds:[],bonusId:null,rewardUnlocked:false,allowedIds:paid?value.allowedIds:[]};
}

// The scoped store permanently captures cat ownership, including async repairs.
export function createSoundSession({store,player,paid=false,now=()=>new Date(),onChange=()=>{},onReport=()=>{},id=()=>globalThis.crypto.randomUUID()}){
 const key=store.soundScopeId||store,repairs=repairJournal(key);
 let active=null,pending=0,disposed=false,refreshPromise=null;
 const isPaid=()=>typeof paid==='function'?!!paid():!!paid;
 const change=(message='')=>{if(!disposed)onChange({busy:pending>0,message,hasRefund:repairs.size>0});};
 const remember=(recordId,kind)=>{if(kind==='confirm'||repairs.get(recordId)!=='confirm')repairs.set(recordId,kind);persistRepairs(key,repairs);};
 const forget=recordId=>{repairs.delete(recordId);persistRepairs(key,repairs);};
 const runBusy=async action=>{pending++;change();try{return await action();}finally{pending--;change();}};
 const reportOnce=session=>{
  if(session.finished&&session.started&&session.confirmed&&!session.reported&&!disposed){session.reported=true;onReport(session.id);}
 };
 const confirm=session=>{
  if(session.confirmPromise)return session.confirmPromise;
  remember(session.id,'confirm');
  session.confirmPromise=runBusy(async()=>{
   if(!await session.saved){forget(session.id);return false;}
   try{
    await store.atomic(data=>confirmPlayback(data,session.id));forget(session.id);session.confirmed=true;reportOnce(session);return true;
   }catch(error){
    if(active===session)player.stop();
    change(t('播放紀錄尚未保存：{message}。請按「重試保存播放紀錄」。',{message:tn(error.message)}));return false;
   }
  });return session.confirmPromise;
 };
 const cleanup=session=>{
  if(session.started)return confirm(session);
  if(session.cleanupPromise)return session.cleanupPromise;
  remember(session.id,'cleanup');
  session.cleanupPromise=runBusy(async()=>{
   if(!await session.saved){forget(session.id);return true;}
   // A late actual-playing notification must preserve the played history.
   if(session.started)return confirm(session);
   try{await store.atomic(data=>refund(data,session.id));forget(session.id);change(t('這次未能播放，未播放的紀錄已清除。'));return true;}
   catch(error){change(t('未播放紀錄的清理尚未保存：{message}。請按「重試保存播放紀錄」。',{message:tn(error.message)}));return false;}
  });return session.cleanupPromise;
 };
 const finish=session=>{session.finished=true;if(session.started){void confirm(session);reportOnce(session);}else void cleanup(session);};
 const permitted=(session,date)=>{
  const data=store.get().data,rights=persistedSummary(data,isPaid(),date);
  return (isPaid()||session.day===rights.day)&&rights.allowedIds.includes(session.trackId)&&data.cat.soundGame?.preferences[session.trackId]!=='avoid';
 };
 const stopExpired=date=>{if(active&&!permitted(active,date))player.stop();};
 const refresh=()=>{
  if(disposed)return Promise.resolve(false);
  const date=now();stopExpired(date);
  if(refreshPromise)return refreshPromise;
  if(pending||!savedView(store.get()))return Promise.resolve(false);
  const current=store.get().data;
  if(syncGame(current,isPaid(),date)===current)return Promise.resolve(true);
  refreshPromise=runBusy(async()=>{
   try{await store.atomic(data=>syncGame(data,isPaid(),date));return true;}
   catch(error){player.stop();change(t('每日聲音尚未保存：{message}',{message:tn(error.message)}));return false;}
  }).finally(()=>{refreshPromise=null;});return refreshPromise;
 };
 if(repairs.size)change(t('上次播放紀錄尚未保存，請按「重試保存播放紀錄」。'));
 return {
  get busy(){return pending>0;},get hasRefund(){return repairs.size>0;},refresh,
  async play(track,replay=false){
   if(disposed)return;
   let state=player.getState();
   // Cancellation is always immediate, even while the initial record saves.
   if(active?.trackId===track.id&&state.phase==='loading'){player.stop();return;}
   const date=now(),view=store.get(),data=view.data,paidNow=isPaid(),rights=persistedSummary(data,paidNow,date);
   stopExpired(date);
   if(!data.soundDaily?.days?.[rights.day]){void refresh();throw Error(t('今天的聲音清單正在更新，保存後請再按播放。'));}
   if(!rights.allowedIds.includes(track.id))throw Error(t('這段聲音不在今天開放的清單中；Pro 可隨時選擇全部 13 種聲音。'));
   if(data.cat.soundGame?.preferences[track.id]==='avoid')throw Error(t('這段已列為避開。請先在收藏與紀錄中解除。'));
   state=player.getState();
   if(active?.trackId===track.id&&state.phase==='playing')return player.toggle(track);
   if(pending)return;
   if(repairs.size)throw Error(t('請先重試保存上次的播放紀錄。'));
   if(!savedView(store.get()))throw Error(store.get().error||t('請先完成本機保存，再播放聲音。'));
   if(active?.trackId===track.id&&state.phase==='paused')return player.toggle(track);
   if(replay&&data.cat.soundGame?.preferences[track.id]!=='favorite')throw Error(t('請先收藏這段聲音。'));
   player.stop();
   if(pending)return;
   const session={id:id(),trackId:track.id,day:rights.day,started:false,confirmed:false,finished:false,reported:false,armed:false};
   // Validate synchronously, then call native play within the click activation.
   // Every new play has its own history row; pause/resume keeps the same row.
   explore(store.get().data,{id:session.id,trackId:track.id,paid:paidNow,now:date});
   let resolveSaved;
   session.saved=new Promise(resolve=>{resolveSaved=resolve;});
   active=session;pending++;change();
   let saving;
   try{saving=Promise.resolve(store.atomic(d=>explore(d,{id:session.id,trackId:track.id,paid:paidNow,now:date})));}
   catch(error){resolveSaved(false);active=null;pending--;change();throw error;}
   void saving.then(()=>resolveSaved(true),()=>resolveSaved(false));
   const playing=Promise.resolve(!disposed&&active===session&&!session.finished?player.toggle(track):undefined).catch(()=>{if(active===session)player.stop();});
   try{await saving;}
   catch(error){if(active===session)player.stop();forget(session.id);throw error;}
   finally{pending--;change();}
   if(disposed||session.finished){await (session.confirmPromise||session.cleanupPromise);return;}
   // A reservation can finish after midnight or after an entitlement change.
   stopExpired(now());
   if(session.finished){await (session.confirmPromise||session.cleanupPromise);return;}
   await playing;
   await (session.confirmPromise||session.cleanupPromise);
  },
  observe(state){
   const session=active;if(!session||state.id!==session.trackId)return;
   if(state.phase==='loading')session.armed=true;
   if(!session.armed&&state.phase==='idle')return;
   if(state.phase==='playing'){
    if(!permitted(session,now())){player.stop();void refresh();return;}
    session.started=true;void confirm(session);
   }
   if(state.error||state.phase==='ended'||state.phase==='idle'){
    active=null;finish(session);
   }
  },
  async retryRefund(){
   if(pending||disposed)return;
   await runBusy(async()=>{
    for(const [recordId,kind] of [...repairs])try{
     await store.atomic(data=>kind==='confirm'?confirmPlayback(data,recordId):refund(data,recordId));forget(recordId);
    }catch(error){change(t('播放紀錄尚未保存：{message}。請再試一次。',{message:tn(error.message)}));return;}
    change(t('播放紀錄已保存。'));
   });
  },
  dispose(){if(disposed)return;disposed=true;const session=active;active=null;player.stop();if(session)finish(session);}
 };
}

export function useSoundGame(R,{store,paid,player}){
 const view=R.useSyncExternalStore(store.subscribe,store.get,store.get);
 const [busy,setBusy]=R.useState(false),[hasRefund,setHasRefund]=R.useState(false),[notice,setNotice]=R.useState(''),[reportId,setReportId]=R.useState(null),[library,setLibrary]=R.useState(false),[day,setDay]=R.useState(localDay);
 const controller=R.useRef(null),lock=R.useRef(false),paidRef=R.useRef(paid);paidRef.current=paid;
 const transact=async(transform,quiet=false)=>{if(lock.current||controller.current?.busy||controller.current?.hasRefund)return false;lock.current=true;setBusy(true);try{await store.atomic(transform);if(!quiet)setNotice(t('已保存於這台裝置。'));return true;}catch(e){setNotice(tn(e.message));return false;}finally{lock.current=false;setBusy(false);}};
 R.useEffect(()=>{
  const session=createSoundSession({store,paid:()=>paidRef.current,player:player.current,onChange:({busy,message,hasRefund})=>{setBusy(busy);setHasRefund(hasRefund);if(message)setNotice(message);},onReport:setReportId});
  controller.current=session;return()=>{session.dispose();if(controller.current===session)controller.current=null;};
 },[store]);
 R.useEffect(()=>{
  let timer;
  const check=()=>{setDay(localDay());void controller.current?.refresh();schedule();};
  const schedule=()=>{clearTimeout(timer);const now=new Date(),midnight=new Date(now);midnight.setHours(24,0,0,0);timer=setTimeout(check,Math.max(1,midnight-now));};
  const visibility=()=>{if(!globalThis.document?.hidden)check();};
  schedule();const interval=setInterval(check,15000);
  globalThis.document?.addEventListener('visibilitychange',visibility);globalThis.window?.addEventListener('focus',check);
  return()=>{clearTimeout(timer);clearInterval(interval);globalThis.document?.removeEventListener('visibilitychange',visibility);globalThis.window?.removeEventListener('focus',check);};
 },[store]);
 R.useEffect(()=>{if(!lock.current)void controller.current?.refresh();},[store,paid,day,busy,view.status,view.data.soundDaily]);
 // Never draw during render. A new day's cards appear only after its save.
 const game=view.data.cat.soundGame||{records:[],preferences:{}},info=persistedSummary(view.data,paid,new Date());
 return {game,summary:info,busy,notice,hasRefund,reportId,setReportId,library,setLibrary,transact,
  retryRefund:()=>controller.current?.retryRefund(),observe:state=>controller.current?.observe(state),
  play:(track,replay=false)=>{if(lock.current)return;setNotice('');void controller.current?.play(track,replay).catch(e=>setNotice(tn(e.message)));}};
}
