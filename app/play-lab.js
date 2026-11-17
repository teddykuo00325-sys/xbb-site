import {useCloudQuota} from './assets/cloud-quota.js?v=quota-feedback1';
import {OBSERVATIONS,chooseExample,validatePlan,createPlaySession,remixPlan,remixOptions,personalityOf,bestStage,stageNameParts} from './play-lab-rules.js?v=play-personality1';
import {readPlayLab,savePlayPlan,savePlaySession,attachPlaySession,removePlayPlan,removePlaySession,playLocalDate,PLAY_LAB_LIMITS} from './play-lab-data.js?v=play-personality1';
import {TopFish,FISH_SIZES} from './fish-game.js?v=audit1117';
import {createFishGameAudio} from './fish-game-audio.js?v=fish-escape2';
import {FISH_WATER_THEMES,FishWaterScenery} from './fish-water-scenery.js?v=water-scenes1';
import {SceneArtwork} from './assets/play-scenes-v47.js?v=8f5745b7843b';
import {readFishPresentation,rememberFishPresentation} from './fish-play-preferences.js?v=fish-escape1';
import {usePhoneDialog} from './assets/audit-followup-v45.js?v=8f5745b7843b';
import {PlayShare} from './play-lab-share.js?v=play-share1';
import {buildPlayDesignRequest,parsePlayDesign,PLAY_DESIGN_MODE} from './play-lab-cloud.js?v=play-personality1';
import {savePending,loadPending,clearPending,pendingFresh} from './assets/cloud-return.js?v=203';
import {createUnlockHold,LockIcon,unlockHoldHandlers} from './play-lab-lock.js?v=lock1';
import {t,tn,isEnglish} from './assets/i18n.js?v=audit1117b';

const id=()=>globalThis.crypto?.randomUUID?.()||`play-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const copy=value=>JSON.parse(JSON.stringify(value));
// 內建玩法名稱存的是中文原值；顯示時逐段翻譯（本機變奏會加「・快一點」等後綴）。
const planTitle=value=>String(value||'').split('・').map(part=>t(part)).join(isEnglish()?' · ':'・');
const flip=(values,value)=>values.includes(value)?values.filter(x=>x!==value):[...values,value];
export function PlayLab({react:R,store,name,paid=false,onBack,onActive=()=>{},initial='describe'}){
 const h=R.createElement,view=R.useSyncExternalStore(store.subscribe,store.get,store.get);
 let library,readError='';try{library=readPlayLab(view.data);}catch(e){readError=tn(e.message);library={plans:[],sessions:[]};}
 const [phase,setPhase]=R.useState(initial),[observations,setObservations]=R.useState([]),[note,setNote]=R.useState('');
 const [resultPending,setResultPending]=R.useState(null),[discardCloud,setDiscardCloud]=R.useState(false);
 const [previewFrom,setPreviewFrom]=R.useState('describe'),[consentFrom,setConsentFrom]=R.useState('describe');
 const [variant,setVariant]=R.useState(0),[plan,setPlan]=R.useState(null),[title,setTitle]=R.useState('');
 const [presentation,setPresentation]=R.useState(()=>readFishPresentation(view.data,{paid,scopeId:store.soundScopeId}));
 const presentationRef=R.useRef(presentation);presentationRef.current=presentation;
 const sound=presentation.soundEnabled?'water':'off',maxSpeed=paid?'fast':'normal';
 const fishSize=FISH_SIZES.find(item=>item.id===presentation.sizeId)||FISH_SIZES[1];
 const [parentId,setParentId]=R.useState(null),[savedId,setSavedId]=R.useState(null),[feedback,setFeedback]=R.useState([]),[feedbackNote,setFeedbackNote]=R.useState('');
 const [snapshot,setSnapshot]=R.useState(null),[sessionSaved,setSessionSaved]=R.useState(false),[busy,setBusy]=R.useState(false);
 const [error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[audioState,setAudioState]=R.useState({error:''}),[leaveOpen,setLeaveOpen]=R.useState(false);
 const [removeTarget,setRemoveTarget]=R.useState(null),removeDialog=R.useRef(null),[shareOpen,setShareOpen]=R.useState(false);
 const nativeCloud=typeof window!=='undefined'?window.V161Cloud:null;
 const quota=useCloudQuota(R,phase==='ai-consent'&&!!nativeCloud,nativeCloud);
 const [aiStatus,setAiStatus]=R.useState(''),aiAbort=R.useRef(null),[previousPlan,setPreviousPlan]=R.useState(null);
 const session=R.useRef(null),audio=R.useRef(null),playDialog=R.useRef(null),leaveDialog=R.useRef(null),field=R.useRef(null),heading=R.useRef(null);
 const mounted=R.useRef(true),lock=R.useRef(false),currentPhase=R.useRef(phase),runId=R.useRef(null),soundEvent=R.useRef(0),active=R.useRef(onActive),leaveAction=R.useRef(null);
 active.current=onActive;currentPhase.current=phase;
 // 陪玩鎖定（2026-11-14，與小魚遊戲共用 play-lab-lock.js）：開始試玩後預設鎖定，只留右上角小鎖頭；
 // 暫停、結束與聲音都收起來，貓拍不到。按住鎖頭 2 秒解鎖；鍵盤 Enter 可直接解鎖。
 const [locked,setLocked]=R.useState(false),[lockHint,setLockHint]=R.useState(''),[holding,setHolding]=R.useState(false),unlockHold=R.useRef(null),hintTimer=R.useRef(null);
 const showLockHint=(message,ms=3500)=>{if(!mounted.current)return;clearTimeout(hintTimer.current);setLockHint(message);if(message&&ms)hintTimer.current=setTimeout(()=>{if(mounted.current)setLockHint('');},ms);};
 const unlockPlay=()=>{unlockHold.current?.cancel();setHolding(false);setLocked(false);showLockHint(t('已解鎖，可以暫停、結束或調整聲音。想再鎖住按「鎖定」。'),4000);};
 if(!unlockHold.current)unlockHold.current=createUnlockHold({onUnlock:()=>{if(mounted.current)unlockPlay();},onHint:message=>showLockHint(message,message===t('繼續按住，2 秒後解鎖…')?0:3500),onHolding:value=>{if(mounted.current)setHolding(value);},timers:{set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}});
 const lockPlay=(message=t('已鎖定畫面。要暫停或結束，按住右上角鎖頭 2 秒。'))=>{unlockHold.current?.cancel();setHolding(false);setLocked(true);showLockHint(message,5000);};
 const playing=phase==='playing'||phase==='paused';
 const reduced=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 R.useEffect(()=>{
  mounted.current=true;audio.current=createFishGameAudio({onError:message=>{if(mounted.current)setAudioState({error:message});}});
  return()=>{mounted.current=false;clearTimeout(hintTimer.current);unlockHold.current?.cancel();aiAbort.current?.abort();audio.current?.dispose();active.current(false);};
 },[]);
 R.useEffect(()=>{active.current(playing);return()=>active.current(false);},[playing]);
 R.useEffect(()=>{if(!playing){heading.current?.closest?.('.play-lab')?.scrollIntoView?.({block:'start',behavior:'instant'});heading.current?.focus({preventScroll:true});}},[phase]);
 R.useEffect(()=>{
  const element=playDialog.current;if(!element)return;
  if(playing&&!element.open)element.showModal();else if(!playing&&element.open)element.close();
 },[playing]);
 R.useEffect(()=>{const element=leaveDialog.current;if(leaveOpen&&!element.open)element.showModal();else if(!leaveOpen&&element.open)element.close();},[leaveOpen]);
 usePhoneDialog(R,playDialog,playing,false);
 usePhoneDialog(R,leaveDialog,leaveOpen,false);
 R.useEffect(()=>{const element=removeDialog.current;if(removeTarget&&!element.open)element.showModal();else if(!removeTarget&&element.open)element.close();},[removeTarget]);
 usePhoneDialog(R,removeDialog,!!removeTarget,false);
 const pause=()=>{if(currentPhase.current==='playing'){currentPhase.current='paused';audio.current?.stop();setPhase('paused');}};
 R.useEffect(()=>{
  const hide=()=>{if(document.hidden)pause();};
  const background=()=>pause();
  document.addEventListener('visibilitychange',hide);window.addEventListener('blur',background);window.addEventListener('pagehide',background);window.addEventListener('inpaw-app-inactive',background);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',background);window.removeEventListener('pagehide',background);window.removeEventListener('inpaw-app-inactive',background);};
 },[]);
 R.useEffect(()=>{
  if(!playing||!field.current||!session.current)return;
  const resize=()=>{const el=field.current;if(el){session.current.resize(el.clientWidth||300,el.clientHeight||340);setSnapshot(session.current.snapshot());}};
  resize();const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(field.current);
  return()=>observer?.disconnect();
 },[playing]);
 const finish=()=>{audio.current?.stop();unlockHold.current?.cancel();setLocked(false);setHolding(false);setLockHint('');currentPhase.current='done';setSnapshot(session.current?.snapshot()||snapshot);setPhase('done');};
 R.useEffect(()=>{
  if(phase!=='playing')return;
  let frame,last=null;
  const tick=now=>{
   if(currentPhase.current!=='playing')return;
   const next=session.current.step(last===null?0:Math.min((now-last)/1000,.1));last=now;setSnapshot(next);
   if(next.soundEvent!==soundEvent.current){soundEvent.current=next.soundEvent;}
   if(next.finished){finish();return;}frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[phase]);
 const button=(text,fn,props={})=>h('button',{type:'button',onClick:()=>{if(!busy&&!props.disabled)fn();},...props,disabled:busy||!!props.disabled},text);
 const go=next=>{audio.current?.stop();if(next==='ai-consent')quota.clearResult();if(next==='describe'||next==='library')setPreviousPlan(null);setPhase(next);setError('');setNotice('');};
 // 玩完後「依這次反應用進階模式再設計」：帶上剛玩過的玩法摘要與這次反應，仍先到同意畫面。
 const redesign=()=>{
  if(!nativeCloud||!plan)return;
  const proceed=()=>{setPreviousPlan({plan:copy(plan),feedback:[...feedback],feedbackNote,stats:copy(snapshot.stats),elapsed:snapshot.elapsed});setConsentFrom('done');go('ai-consent');};
  if(!sessionSaved){leaveAction.current=proceed;setLeaveOpen(true);return;}proceed();
 };
 const requestBack=()=>{
  if(busy)return;
  if(phase==='done'&&!sessionSaved){leaveAction.current=onBack;setLeaveOpen(true);return;}
  if(phase==='preview'){go(previewFrom);return;}
  if(phase==='ai-consent'){go(consentFrom);return;}
  onBack();
 };
 const selectExample=(offset=0)=>{
  quota.clearResult();
  setPreviewFrom('describe');
  try{const next=chooseExample(observations,variant+offset);validatePlan(next);setParentId(savedId||parentId);setVariant(variant+offset);setPlan(next);setTitle(planTitle(next.title));setSavedId(null);setSessionSaved(false);go('preview');}
  catch(e){setError(tn(e.message));}
 };
 const openSaved=(row,replay=false)=>{setPreviewFrom('library');setPlan(copy(row.plan));setTitle(planTitle(row.title));setSavedId(row.id);setParentId(row.id);setObservations([...row.observationIds]);setNote(row.note);setSessionSaved(false);go('preview');setNotice(t('大小、背景與聲音沿用你目前的小魚設定。'));if(replay)start(row.plan);};
 const start=(selectedPlan=plan)=>{
  try{
   validatePlan(selectedPlan);session.current=createPlaySession(selectedPlan,{reducedMotion:reduced(),targetRadius:Math.ceil(Math.hypot(fishSize.width,fishSize.height)/2)+1,maxSpeed});runId.current=id();soundEvent.current=0;
   setSnapshot(session.current.snapshot());setFeedback([]);setFeedbackNote('');setSessionSaved(false);setError('');setNotice('');
   currentPhase.current='playing';audio.current?.setVolume(presentationRef.current.volume);if(presentationRef.current.soundEnabled)void audio.current?.start();lockPlay(t('已鎖定畫面，貓拍不到結束與聲音。要暫停或結束，按住右上角鎖頭 2 秒。'));setPhase('playing');
  }catch(e){setError(tn(e.message));}
 };
 const resume=()=>{currentPhase.current='playing';if(presentationRef.current.soundEnabled)void audio.current?.start();setPhase('playing');};
 const touch=(event,kind,index)=>{
  event.stopPropagation();if(currentPhase.current!=='playing')return;
  // 觸碰位置只在本機給「好奇」的小魚用（游向牠拍過的地方），不保存、不送出。
  const rect=field.current?.getBoundingClientRect?.(),point=rect&&Number.isFinite(event.clientX)&&event.clientX!==0?{x:event.clientX-rect.left,y:event.clientY-rect.top}:null;
  session.current.touch(kind,index,point);const next=session.current.snapshot();setSnapshot(next);
  if(kind==='target'&&presentationRef.current.soundEnabled)audio.current?.hit();
  if(next.soundEvent!==soundEvent.current){soundEvent.current=next.soundEvent;}
 };
 const changePresentation=patch=>{if(busy)return;const next=rememberFishPresentation(store.soundScopeId,{...presentationRef.current,...patch},paid);presentationRef.current=next;setPresentation(next);audio.current?.setVolume(next.volume);if(currentPhase.current==='playing'&&next.soundEnabled){setAudioState({error:''});void audio.current?.start();}else audio.current?.stop();};
 const changeSound=value=>changePresentation({soundEnabled:value!=='off'});
 const acknowledgeResult=async pending=>{
  if(!pending||!nativeCloud)return true;
  const record=loadPending('play');
  if(record&&(record.catId?record.catId!==(store.soundScopeId||''):record.name!==name))throw Error(t('這是另一隻毛孩的玩法，請切換到牠的陪玩處理。'));
  const current=await nativeCloud.request('status');
  if(current.state==='idle'){clearPending('play');if(mounted.current)setResultPending(null);return true;}
  if(current.kind!=='text'||current.mode!==PLAY_DESIGN_MODE||current.state!=='done'||current.meetingId!==pending.meetingId||(pending.jobId&&current.jobId!==pending.jobId))throw Error(t('進階模式項目已變更，沒有刪除其他結果。'));
  const response=await nativeCloud.request('ack');if(response?.error)throw Error(response.error);
  clearPending('play');if(mounted.current){setResultPending(null);setDiscardCloud(false);}return true;
 };
 const discardResult=async()=>{
  if(lock.current||!resultPending)return;lock.current=true;setBusy(true);setError('');
  try{await acknowledgeResult(resultPending);if(mounted.current){go(snapshot&&consentFrom==='done'?'done':'describe');setNotice(t('已放棄AI 伺服器上未儲存的玩法；本機已儲存的內容不受影響。'));}}
  catch(e){if(mounted.current)setError(tn(e.message||t('尚未放棄，請再試一次。')));}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const retryAcknowledge=async()=>{
  if(lock.current||!resultPending||plan?.id!==resultPending.planId||(!savedId&&!sessionSaved))return;
  lock.current=true;setBusy(true);setError('');
  try{await acknowledgeResult(resultPending);if(mounted.current)setNotice(t('進階模式結果已清除，本機內容仍保留。'));}
  catch(e){if(mounted.current)setError(tn(e.message));}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const persist=async(collect=false)=>{
  if(lock.current||readError)return false;lock.current=true;setBusy(true);setError('');setNotice('');
  const newPlanId=savedId||(collect?id():null),hasSession=phase==='done'&&!sessionSaved;
  const row=hasSession?{id:runId.current,planId:newPlanId,plan:copy(plan),observationIds:[...observations],note:feedbackNote,feedback:[...feedback],stats:copy(snapshot.stats),elapsed:snapshot.elapsed,sound}:null;
  const collection=collect&&!savedId?{id:newPlanId,title:title.trim()||plan.title,plan:copy(plan),parentId,observationIds:[...observations],note,sound}:null;
  try{
   await store.atomic(data=>{let next=data;if(collection)next=savePlayPlan(next,collection);if(row)next=savePlaySession(next,row);else if(collection&&phase==='done'&&sessionSaved)next=attachPlaySession(next,runId.current,newPlanId);return next;});
   if(mounted.current){if(collection)setSavedId(newPlanId);if(row)setSessionSaved(true);setNotice(collect?t('玩法已收藏在這隻貓的清單。'):t('這次反應已保存在這支裝置。'));}
   if(resultPending&&plan.id===resultPending.planId){try{await acknowledgeResult(resultPending);}catch(e){if(mounted.current)setNotice(t('本機已儲存；進階模式結果尚未清除，可按「重試清除進階模式結果」。'));}}
  return true;
  }catch(e){if(mounted.current)setError(tn(e.message||t('尚未保存，請再試一次。')));return false;}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const removeSaved=async()=>{
  if(lock.current||!removeTarget||readError)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  const target=removeTarget;
  try{
   await store.atomic(data=>target.kind==='plan'?removePlayPlan(data,target.id):removePlaySession(data,target.id));
   if(mounted.current){
    if(target.kind==='plan'){if(savedId===target.id)setSavedId(null);if(parentId===target.id)setParentId(null);}
    if(target.kind==='session'&&runId.current===target.id)setSessionSaved(false);
    setRemoveTarget(null);setNotice(target.kind==='plan'?t('收藏已刪除，已保存的陪玩反應仍保留。'):t('這筆陪玩反應已刪除，玩法收藏仍保留。'));
   }
  }catch(e){if(mounted.current)setError(tn(e.message||t('尚未刪除，原資料已保留，請重試。')));}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const ACTIVE_STATES=['queued','processing','submitting'];
 const showAiError=async e=>{
  if(!mounted.current)return;
  go(consentFrom);setError(tn(e?.message||t('進階模式暫時無法設計玩法，內建玩法仍可使用。')));
  await quota.settle({outcome:e?.quotaOutcome||'failure',billing:e?.billing});
 };
 const finishDesign=async(s,message)=>{
  const billing=s.billing&&s.billing!=='unknown'?s.billing:'charged';
  let designed;
  try{designed=parsePlayDesign(s.summary,{maxSpeed});}
  catch(e){await nativeCloud.request('ack').catch(()=>{});clearPending('play');throw Object.assign(Error(t('{message} 內建玩法仍可使用。',{message:tn(e.message||t('進階模式回傳的玩法無法使用。'))})),{billing});}
  if(!mounted.current)return;
  setResultPending({meetingId:s.meetingId,jobId:s.jobId||'',planId:designed.id});setDiscardCloud(false);setPreviewFrom('describe');
  setParentId(savedId||parentId);setVariant(0);setPlan(designed);setTitle(planTitle(designed.title));setSavedId(null);setSessionSaved(false);
  go('preview');setNotice(message||t('進階模式設計的玩法已回來，請先看過再試玩。'));
  await quota.settle({outcome:'success',billing});
 };
 const waitForDesign=async(meetingId,controller)=>{
  setAiStatus(t('已送出，等進階模式回覆…'));
  for(;;){
   await new Promise(resolve=>setTimeout(resolve,2000));
   if(controller.signal.aborted||!mounted.current)return;
   const s=await nativeCloud.request('status');
   if(controller.signal.aborted||!mounted.current)return;
   if(s.meetingId!==meetingId||s.state==='idle'){clearPending('play');throw Error(t('進階模式設計已中止，內建玩法仍可使用。'));}
   if(s.state==='processing')setAiStatus(t('進階模式正在設計…'));
   if(s.state==='done')return finishDesign(s);
   if(s.state==='failed'||s.state==='timeout'){await nativeCloud.request('ack');clearPending('play');throw Object.assign(Error(s.message||t('進階模式沒有完成設計，內建玩法仍可使用。')),{billing:s.billing||'unknown',quotaOutcome:s.state==='timeout'?'pending':'failure'});}
  }
 };
 const designWithAI=async()=>{
  if(lock.current||!nativeCloud||readError)return;
  lock.current=true;setBusy(true);setError('');quota.clearResult();
  const controller=new AbortController();aiAbort.current=controller;
  let attempted=false;
  try{
   let before=await nativeCloud.request('status');
   // 語音快記的進階模式整理離開畫面後仍佔著線上的唯一槽位；已結束的語音結果本來就不會再套用（卡片已不在），直接清掉。
   if(before.kind==='text'&&before.mode==='voice-draft'&&before.state!=='idle'){
    if(ACTIVE_STATES.includes(before.state))throw Error(t('語音的進階模式整理還在處理，請稍候再用進階模式設計。'));
    await nativeCloud.request('ack');before=await nativeCloud.request('status');
   }
   const mine=before.kind==='text'&&before.mode===PLAY_DESIGN_MODE;
   if(before.state!=='idle'&&!mine)throw Error(t('進階模式還有其他項目在處理或等你核對（看診摘要或食品照片），請先處理完再用進階模式設計。'));
   if(ACTIVE_STATES.includes(before.state))throw Error(t('上一個玩法還在設計中，請稍候或等完成通知。'));
   if(before.state==='done'){
    const pending=loadPending('play');
    if(!pending||pending.meetingId!==before.meetingId||(pending.cloudJobId&&pending.cloudJobId!==before.jobId))throw Error(t('進階模式還有未處理的玩法，但無法確認屬於哪隻毛孩；未刪除，也未送出新設計。'));
    if(pending&&(pending.catId?pending.catId!==(store.soundScopeId||''):pending.name!==name))throw Error(t('另一隻毛孩還有未儲存的玩法，請先切換到牠的陪玩處理。'));
    if(resultPending?.meetingId===before.meetingId)throw Error(t('上一份玩法尚未儲存。請先收藏、儲存試玩反應，或明確放棄，再設計下一份。'));
    await finishDesign(before,t('上一份玩法尚未儲存。請先收藏、儲存試玩反應，或明確放棄，再設計下一份。'));return;
   }
   if(before.state!=='idle')await nativeCloud.request('ack');
   const request=buildPlayDesignRequest({observationIds:observations,note,sessions:library.sessions,favorites:library.plans,previous:previousPlan,presentation,maxSpeed}),meetingId=id();
   attempted=true;
   const sent=await nativeCloud.request('submit',{meetingId,transcript:request.text,mode:PLAY_DESIGN_MODE,lang:'zh-TW'});
   if(sent.error)throw Object.assign(Error(sent.error),{billing:sent.billing||'unknown'});
   savePending('play',{meetingId,cloudJobId:sent.jobId||'',submittedAt:Date.now(),name,catId:store.soundScopeId||'',observationIds:[...observations],note});
   if(mounted.current){lock.current=false;setBusy(false);go('ai-wait');}
   await waitForDesign(meetingId,controller);
  }catch(e){await showAiError(Object.assign(e,{billing:e.billing||(attempted?'unknown':'not-charged')}));}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const stopWaiting=()=>{aiAbort.current?.abort();go(consentFrom);setNotice(t('已停止等待；進階模式可能仍在處理，回到陪玩時會自動帶回結果。'));void quota.settle({outcome:'pending'});};
 // 離開頁面或重開 App 後回來：帶回（或接著等）上一個設計。
 R.useEffect(()=>{
  if(!nativeCloud||initial!=='describe')return;
  const record=loadPending('play');if(!record)return;
  let alive=true;const controller=new AbortController();
  (async()=>{
   const s=await nativeCloud.request('status');
   if(!alive)return;
   const mine=s.kind==='text'&&s.mode===PLAY_DESIGN_MODE&&s.meetingId===record.meetingId&&(!record.cloudJobId||s.jobId===record.cloudJobId);
   if(!mine){if(s.state==='idle'||!pendingFresh(record))clearPending('play');return;}
   // 用毛孩編號比對（同名或改名不會配錯）；舊紀錄沒有編號才退回比名字。
   if(typeof record.catId==='string'&&record.catId?record.catId!==(store.soundScopeId||''):record.name!==name){setNotice(t('有一份替另一隻毛孩設計的玩法在等待，請切換到那隻毛孩的陪玩。'));return;}
   setObservations((Array.isArray(record.observationIds)?record.observationIds:[]).filter(value=>OBSERVATIONS.some(item=>item.id===value)));setNote(typeof record.note==='string'?record.note.slice(0,500):'');
   if(ACTIVE_STATES.includes(s.state)){
    if(!pendingFresh(record))return;
    aiAbort.current=controller;go('ai-wait');await waitForDesign(record.meetingId,controller);
   }else if(s.state==='done')await finishDesign(s,t('已帶回進階模式設計的玩法，請先看過再試玩。'));
   else if(s.state==='failed'||s.state==='timeout'){await nativeCloud.request('ack');clearPending('play');setError(tn(s.message||t('上一個玩法沒有設計完成，內建玩法仍可使用。')));await quota.settle({outcome:s.state==='timeout'?'pending':'failure',billing:s.billing||'unknown'});}
  })().catch(e=>{if(alive)showAiError(e);});
  return()=>{alive=false;controller.abort();};
 },[]);
 const modify=()=>{setParentId(savedId||parentId);setSavedId(null);setVariant(v=>v+1);if(feedback.length)setObservations([...feedback]);go('describe');};
 const choices=(values,onChange,legend)=>h('fieldset',{className:'pl-choices'},h('legend',null,legend),h('div',null,OBSERVATIONS.map(item=>button(t(item.label),()=>onChange(flip(values,item.id)),{key:item.id,'aria-pressed':values.includes(item.id)}))));
 const soundPicker=h('fieldset',{className:'pl-presentation'},h('legend',null,t('沿用你的小魚設定')),
  h('div',{className:'pl-presentation-fields'},
   h('label',null,t('魚大小'),h('select',{'aria-label':t('陪玩小魚大小'),value:presentation.sizeId,disabled:busy,onChange:e=>changePresentation({sizeId:e.target.value})},FISH_SIZES.map(item=>h('option',{key:item.id,value:item.id},item.label)))),
   h('label',null,t('水域背景'),h('select',{'aria-label':t('陪玩水域背景'),value:presentation.waterTheme,disabled:busy,onChange:e=>changePresentation({waterTheme:e.target.value,scene:'basic'})},FISH_WATER_THEMES.map(item=>h('option',{key:item.id,value:item.id},item.label)))),
   paid&&h('label',null,t('場景'),h('select',{'aria-label':t('AI陪玩場景'),value:presentation.scene,disabled:busy,onChange:e=>changePresentation({scene:e.target.value})},[['basic',t('水域')],['pond',t('池塘')],['night',t('星光')],['garden',t('花園')]].map(([value,label])=>h('option',{key:value,value},label)))),
   button(sound==='off'?t('聲音：關'):t('聲音：開'),()=>changeSound(sound==='off'?'water':'off'),{'aria-pressed':presentation.soundEnabled}),
   h('label',null,t('音量'),h('input',{type:'range',min:0,max:100,value:Math.round(presentation.volume*100),'aria-label':t('AI陪玩聲音音量'),disabled:busy,onChange:e=>changePresentation({volume:Number(e.target.value)/100})}))),
  h('small',null,t('大小、背景與聲音和自由玩小魚共用；用進階模式設計時，也只改速度、路線、停留與躲藏節奏。')));
 const badge=source=>source==='ai'?h('span',{className:'pl-example-badge pl-ai-badge'},t('進階模式設計 · 請先看過再玩')):h('span',{className:'pl-example-badge'},t('內建玩法 · 不使用 AI'));
 const label=badge(plan?.source);
 const requestPreview=buildPlayDesignRequest({observationIds:observations,note,sessions:library.sessions,favorites:library.plans,previous:previousPlan,presentation,maxSpeed});
 // 本機變奏（G1）：在這支手機改現有玩法，不送資料、不用進階模式額度；未保存的反應一樣先確認。
 const remix=option=>{
  const run=()=>{try{const next=remixPlan(plan,option.id,maxSpeed);if(option.id==='theme')changePresentation({scene:'basic',waterTheme:({water:'blue',reef:'reef',open:'blue',night:'moon',sand:'sand'}[next.scene.theme])||'blue'});setParentId(savedId||parentId);setPlan(next);setTitle(planTitle(next.title));setSavedId(null);setSessionSaved(false);go('preview');setNotice(t('已在這支手機調整成「{label}」，不用進階模式額度、不會送出資料。',{label:t(option.label)}));}catch(e){setError(tn(e.message));}};
  if(phase==='done'&&!sessionSaved){leaveAction.current=run;setLeaveOpen(true);return;}
  run();
 };
 const remixChoices=plan?remixOptions(plan,maxSpeed):[];
 const remixPicker=remixChoices.length>0&&h('fieldset',{className:'pl-remix'},h('legend',null,t('在這支手機調整玩法')),h('div',null,remixChoices.map(option=>button(t(option.label),()=>remix(option),{key:option.id,className:'secondary-btn',disabled:busy||!!readError}))),h('small',null,t('不用進階模式額度、不會送出資料；調整後是新的版本，原本的收藏不會被改。')));
 const caught=snapshot?.stats?.targetTouches||0,prey=plan?.scene||plan?.states?.some(s=>s.target.kind==='fish')?t('小魚'):t('小蟲');
 const character=personalityOf(plan),characterChip=character&&h('div',{className:'pl-personality','data-personality':character.id},h('strong',null,t('小魚個性：{label}',{label:t(character.label)})),h('span',null,t(character.touch)+t('；')+t(character.idle)));
 // 分段記錄：顯示時逐段翻譯（例如「繞圈・快速」）。
 const stageLabel=state=>stageNameParts(state).map(part=>t(part)).join(isEnglish()?' · ':'・');
 // 同樣動作的不同階段（例如兩段「衝刺」）合併成一列，最有反應也用合併後的次數，畫面和分享卡才一致。
 const stateById=new Map((plan?.states||[]).map(s=>[s.id,s])),groups=new Map();
 for(const row of snapshot?.stats?.stages||[]){const state=stateById.get(row.id);if(!state)continue;const key=stageLabel(state),g=groups.get(key)||{id:key,label:key,seconds:0,targetTouches:0};g.seconds+=row.seconds;g.targetTouches+=row.targetTouches;groups.set(key,g);}
 const stageRows=[...groups.values()].filter(row=>row.seconds>=.5);
 const best=stageRows.reduce((a,row)=>row.targetTouches>0&&(!a||row.targetTouches>a.targetTouches||(row.targetTouches===a.targetTouches&&row.targetTouches/Math.max(row.seconds,1)>a.targetTouches/Math.max(a.seconds,1)))?row:a,null);
 const finale=snapshot&&h('div',{className:'pl-finale','data-caught':caught>0},h('span',{className:'pl-finale-art','aria-hidden':true},h(TopFish,{react:R,waterStyle:true,appearance:presentation.appearance}),h('span',{className:'pl-finale-bubbles'},'° ° °')),h('strong',null,caught>0?t('這次抓到{prey} {n} 次',{prey,n:caught}):t('{prey}游累了，下次再來',{prey})),best&&h('span',{className:'pl-finale-best'},t('最有反應：{stage}的時候（{n} 次）',{stage:best.label,n:best.targetTouches})),h('small',null,t('玩了 {n} 秒',{n:Math.round(snapshot.elapsed)})+(character?t(' · 小魚個性：{label}',{label:t(character.label)}):'')),
  stageRows.length>1&&h('details',{className:'pl-stage-list'},h('summary',null,t('看各段反應')),h('ol',null,stageRows.map(row=>h('li',{key:row.id,'data-best':best?.id===row.id},h('span',null,row.label),h('span',null,t('{s} 秒 · 抓到 {n} 次',{s:Math.round(row.seconds),n:row.targetTouches})))))));
 const titleBlock=(text,subtitle)=>h('header',{className:'pl-heading'},h('p',{className:'eyebrow'},t('陪 {name} 玩出新花樣',{name})),h('h1',{ref:heading,tabIndex:-1},text),subtitle&&h('p',null,subtitle));
 const sceneTheme=presentation.scene==='basic'?({blue:'water',reef:'reef',moon:'night',sand:'sand'}[presentation.waterTheme]):presentation.scene;
 const scenery=preview=>presentation.scene==='basic'?h(FishWaterScenery,{react:R,theme:presentation.waterTheme,preview}):h(SceneArtwork,{react:R,scene:presentation.scene,preview});
 const coverLabel=sceneTheme==='reef'?t('礁石'):sceneTheme==='sand'?t('小石頭'):plan?.id==='hole-ambush'?t('洞口'):plan?.id==='leaf-trail'?t('落葉'):t('水草');
 const planArt=h('div',{className:'pl-plan-art','data-scene':sceneTheme,'aria-hidden':true},scenery(true),h('span',{className:'pl-art-fish'},h(TopFish,{react:R,waterStyle:true,appearance:presentation.appearance})));
 const nearCapacity=library.plans.length>=PLAY_LAB_LIMITS.plans-5||library.sessions.length>=PLAY_LAB_LIMITS.sessions-10;
 const capacity=h('aside',{className:'pl-capacity','aria-label':t('陪玩收藏容量')},h('p',null,t('玩法收藏 {count}／{plans} · 陪玩反應 {count2}／{sessions}',{count:library.plans.length,plans:PLAY_LAB_LIMITS.plans,count2:library.sessions.length,sessions:PLAY_LAB_LIMITS.sessions})),nearCapacity&&h('p',{role:'status'},t('接近或已達保存上限，可到收藏清單刪除不需要的項目。舊資料不會自動刪除。')),phase!=='library'&&button(t('管理收藏與反應'),()=>{if(phase==='done'&&!sessionSaved){leaveAction.current=()=>go('library');setLeaveOpen(true);return;}go('library');},{className:'secondary-btn'}));
 return h('section',{className:'play-lab','data-testid':'play-lab','data-fish-size':presentation.sizeId,'data-water-theme':presentation.waterTheme,style:{'--pl-fish-width':fishSize.width+'px','--pl-fish-height':fishSize.height+'px'}},
  quota.resultLine&&h('p',{role:'status','data-ai-quota-result':true},quota.resultLine),
  button(phase==='preview'?(previewFrom==='library'?t('‹ 返回收藏'):t('‹ 返回玩法設計')):phase==='ai-consent'?(consentFrom==='done'?t('‹ 返回本次反應'):t('‹ 返回玩法設計')):t('‹ 返回陪玩'),requestBack,{className:'h-back',disabled:busy,'aria-label':t('返回')}),
  resultPending&&h('aside',{className:'pl-disclosure'},h('p',null,t('這份 AI 玩法仍暫存在 AI 伺服器；收藏、儲存試玩反應或放棄後才清除，最多保留 7 天。離開後可回到「幫牠設計玩法」繼續。')),((savedId||sessionSaved)&&plan?.id===resultPending.planId)&&button(t('重試清除進階模式結果'),retryAcknowledge,{className:'secondary-btn'}),!discardCloud?button(t('放棄AI 伺服器上未儲存的玩法'),()=>setDiscardCloud(true),{className:'text-btn'}):h(R.Fragment,null,h('p',null,t('確定放棄這份進階模式玩法？未儲存的設計將無法再帶回。')),button(t('保留玩法'),()=>setDiscardCloud(false),{className:'secondary-btn'}),button(t('確認放棄進階模式玩法'),discardResult,{className:'secondary-btn'}))),
  phase==='describe'&&h(R.Fragment,null,titleBlock(t('幫牠設計玩法'),t('一次一隻小魚，探索游動、探頭與捉迷藏。')),
   h('aside',{className:'pl-disclosure'},nativeCloud?h('span',{className:'pl-example-badge pl-ai-badge'},t('進階模式')):label,h('p',null,nativeCloud?t('用進階模式依觀察設計玩法，送出前會先讓你看過內容並同意。也可直接選內建玩法，不使用 AI、不送出資料。'):t('目前可選內建玩法，不使用 AI，也不會送出任何資料。'))),
   soundPicker,
   choices(observations,setObservations,t('牠平常怎麼玩？（可複選、可略過）')),
   h('label',{className:'pl-field'},h('span',null,t('還觀察到什麼？（選填）')),h('textarea',{value:note,maxLength:500,rows:3,disabled:busy,onChange:e=>{if(!busy)setNote(e.target.value);},placeholder:t('例如：會躲著等，小魚探頭才拍。')})),
   h('p',{className:'pl-muted'},nativeCloud?t('進階模式會依你同意送出的觀察與補充設計；內建玩法只依勾選項目配對，不會理解補充文字。'):t('補充文字可隨收藏保存；內建玩法只依勾選項目配對，不會理解文字內容。')),
   nativeCloud&&button(t('用進階模式設計玩法'),()=>{setConsentFrom('describe');go('ai-consent');},{className:'pl-cloud pl-main',disabled:!!readError}),
   button(t('選擇內建玩法'),()=>selectExample(),{className:(nativeCloud?'secondary-btn':'primary')+' pl-main',disabled:!!readError})),
  phase==='ai-consent'&&h(R.Fragment,null,titleBlock(t('用進階模式幫牠設計玩法'),t('先確認會送出什麼，再決定要不要用進階模式設計。')),
   h('div',{className:'pl-actions'},button(busy?t('送出中…'):t('同意並用進階模式設計'),designWithAI,{className:'pl-cloud',disabled:busy||!!readError||quota.empty}),button(t('返回'),()=>go(consentFrom),{className:'secondary-btn'})),
   h('aside',{className:'pl-disclosure'},h('span',{className:'pl-example-badge pl-ai-badge'},t('進階模式')),
    h('p',null,t('送到：毛孩小本本進階模式，{quota}用途：依下面的內容設計一個陪玩玩法規則。',{quota:quota.line})),
    h('p',null,t('不會自動附上：毛孩名字與編號、照片、錄音、其他照護紀錄。你在觀察或反應欄自行填寫的文字會送出，送出前可在下方確認。回來的只是玩法規則，通過格式檢查、由你看過才會開始，不會執行任何程式。')),
    (requestPreview.recent.length>0||requestPreview.favorites.length>0)&&h('p',null,t('也會送出：{items}。觸碰可能來自貓掌或人手，只用來調整玩法。',{items:[requestPreview.recent.length>0&&t('最近 {n} 次陪玩的反應、玩了幾秒、觸碰次數與你寫的反應補充',{n:requestPreview.recent.length}),requestPreview.favorites.length>0&&t('最近 {n} 個收藏玩法的名稱與動作節奏（不含你取的收藏名稱）',{n:requestPreview.favorites.length})].filter(Boolean).join(t('；'))})),
    previousPlan&&h('p',null,t('這次會多帶剛玩過的玩法摘要（名稱、各階段動作、速度與秒數）、本次秒數與觸碰統計，以及你選的反應和補充文字，用進階模式換一個不同的節奏組合。')),
    h('p',null,t('設計結果在你儲存或放棄時就刪除，沒處理的最多保存 7 天；處理地區與是否用於模型訓練仍待確認。'))),
   h('details',{open:true,className:'pl-consent-list'},h('summary',null,t('本次會送出的文字')),h('pre',{className:'pl-consent-text'},requestPreview.text))),
  phase==='ai-wait'&&h(R.Fragment,null,titleBlock(t('正在用進階模式設計玩法'),t('進階模式處理最久約 8 分鐘；可以先離開，回到陪玩會自動帶回。')),
   h('p',{role:'status'},aiStatus||t('處理中…')),
   h('div',{className:'pl-actions'},button(t('停止等待'),stopWaiting,{className:'secondary-btn'}))),
  phase==='library'&&h(R.Fragment,null,titleBlock(t('牠的玩法收藏'),t('保存在這支裝置，每隻貓各自收藏。')),
   capacity,
   !library.plans.length&&h('div',{className:'pl-empty'},planArt,h('h2',null,t('還沒有收藏玩法')),h('p',null,t('先試一個內建玩法，喜歡再留下來。')),button(t('選擇內建玩法'),()=>go('describe'),{className:'primary'})),
   library.plans.slice().reverse().map(row=>h('article',{className:'pl-library-card',key:row.id},badge(row.plan.source),h('h2',null,planTitle(row.title)),h('p',null,t(row.plan.description)),h('small',null,t('第 {n} 版 · {value} · {count} 次已保存試玩',{n:row.revision,value:playLocalDate(row.createdAt),count:library.sessions.filter(s=>s.planId===row.id).length})),button(t('再玩一次（沿用設定）'),()=>openSaved(row,true),{className:'primary'}),button(t('查看與調整'),()=>openSaved(row),{className:'secondary-btn'}),button(t('刪除收藏'),()=>{setError('');setRemoveTarget({kind:'plan',id:row.id,title:planTitle(row.title)});},{className:'text-btn','aria-label':t('刪除收藏：{title}',{title:planTitle(row.title)})}),library.plans.some(child=>child.parentId===row.id)&&h('small',null,t('有衍生版本，請先從最新版本開始整理。')))),
   h('details',{className:'pl-history'},h('summary',null,t('陪玩反應紀錄（{n} 筆）',{n:library.sessions.length})),library.sessions.slice().reverse().map(row=>h('article',{key:row.id},h('strong',null,planTitle(row.plan.title)),h('small',null,t('{value} · {n} 秒 · {n2} 次螢幕觸碰',{value:playLocalDate(row.createdAt),n:Math.round(row.elapsed),n2:row.stats.targetTouches+row.stats.coverTouches+row.stats.blankTouches})),h('p',null,row.feedback.length?row.feedback.map(x=>t(OBSERVATIONS.find(o=>o.id===x)?.label||x)).join(t('、')):t('未填反應，不推定喜好')),row.note&&h('p',null,row.note),button(t('刪除這筆反應'),()=>{setError('');setRemoveTarget({kind:'session',id:row.id,title:planTitle(row.plan.title)});},{className:'text-btn','aria-label':t('刪除反應：{title} {value}',{title:planTitle(row.plan.title),value:playLocalDate(row.createdAt)})})))),
   button(t('再選一個內建玩法'),()=>{setParentId(null);setSavedId(null);go('describe');},{className:'primary pl-main'})),
  phase==='preview'&&plan&&h(R.Fragment,null,titleBlock(title,t('先看玩法，再決定要不要試。')),
   nearCapacity&&capacity,
   h('article',{className:'pl-plan-card'},label,planArt,h('p',null,t(plan.description)),characterChip,button(t('開始試玩'),start,{className:'primary pl-main',disabled:!!readError}),h('details',{className:'pl-design-details'},h('summary',null,t('設計想法與觀察重點')),h('dl',null,h('dt',null,plan.source==='ai'?t('進階模式設計想法'):t('內建玩法設計想法')),h('dd',null,t(plan.reason)),h('dt',null,t('這次想觀察')),h('dd',null,t(plan.hypothesis))),h('p',{className:'pl-muted'},plan.source==='ai'?t('依你同意送出的內容由進階模式設計，仍需實際觀察牠的反應，不能據此確認偏好。'):t('依選項配對內建玩法，不會使用 AI 分析，也不代表已確認牠的偏好。')))),
   remixPicker,
   soundPicker,
   h('div',{className:'pl-actions'},button(t('換個內建玩法'),()=>selectExample(1),{className:'secondary-btn'}),button(t('我想改一下'),modify,{className:'secondary-btn'})),
   h('label',{className:'pl-field'},h('span',null,t('收藏名稱')),h('input',{value:title,maxLength:60,disabled:busy||!!savedId,onChange:e=>{if(!busy)setTitle(e.target.value);}})),
   button(savedId?t('已在這隻貓的收藏'):t('收藏玩法'),()=>persist(true),{className:'secondary-btn pl-main',disabled:busy||!!savedId||!!readError}),
   button(t('查看牠的收藏'),()=>go('library'),{className:'text-btn pl-main'}),
   h('p',{className:'pl-muted'},t('每回最多 1 分鐘，可提早結束。手機平放穩固處，陪牠一起玩，讓牠自由離開。'))),
  phase==='done'&&snapshot&&h(R.Fragment,null,titleBlock(t('這次先休息'),t('看看牠的反應，喜歡的玩法再留下來。')),label,
   nearCapacity&&capacity,
   finale,
   button(t('分享這次成果'),()=>setShareOpen(true),{className:'secondary-btn pl-main pl-share-result'}),
   shareOpen&&h(PlayShare,{react:R,petName:name,onClose:()=>setShareOpen(false),card:{title,personalityLabel:character?t(character.label):'',caught,seconds:snapshot.elapsed,bestStageLabel:best?best.label:'',bestStageTouches:best?.targetTouches||0,waterTheme:presentation.waterTheme,appearance:presentation.appearance,date:playLocalDate(new Date().toISOString())}}),
   h('div',{className:'pl-session-summary'},h('strong',null,t('{n} 秒',{n:Math.round(snapshot.elapsed)})),h('span',null,t('{n} 次螢幕觸碰',{n:snapshot.stats.targetTouches+snapshot.stats.coverTouches+snapshot.stats.blankTouches})),h('small',null,t('目標 {targetTouches} · 遮蔽物 {coverTouches} · 空白 {blankTouches}',{targetTouches:snapshot.stats.targetTouches,coverTouches:snapshot.stats.coverTouches,blankTouches:snapshot.stats.blankTouches}))),
   h('p',{className:'pl-muted'},t('觸碰可能來自貓掌或人手，次數本身不代表喜歡。')),
   !sessionSaved?h(R.Fragment,null,choices(feedback,setFeedback,t('這次看到什麼？（可不填）')),h('label',{className:'pl-field'},h('span',null,t('補充反應（選填）')),h('textarea',{value:feedbackNote,maxLength:500,rows:2,disabled:busy,onChange:e=>{if(!busy)setFeedbackNote(e.target.value);}})),button(busy?t('正在保存…'):t('保存這次反應'),()=>persist(),{className:'primary pl-main',disabled:busy||!!readError})):h('p',{role:'status',className:'pl-saved'},t('這次反應已保存。')),
   !savedId&&button(busy?t('正在保存…'):t('收藏玩法與本次反應'),()=>persist(true),{className:'secondary-btn pl-main',disabled:busy||!!readError}),
   h('div',{className:'pl-actions'},button(t('再玩一次'),()=>{if(!sessionSaved){leaveAction.current=start;setLeaveOpen(true);return;}start();},{className:'secondary-btn',disabled:busy}),button(t('查看收藏'),()=>{if(!sessionSaved){leaveAction.current=()=>go('library');setLeaveOpen(true);return;}go('library');},{className:'secondary-btn',disabled:busy})),
   remixPicker,
   nativeCloud&&button(t('依這次反應用進階模式再設計'),redesign,{className:'pl-cloud pl-main',disabled:busy||!!readError}),
   button(t('依回饋選另一個內建玩法'),()=>{if(!sessionSaved){setError(t('請先保存這次反應，再探索下一個內建玩法；也可返回陪玩略過保存。'));return;}modify();},{className:'text-btn pl-main',disabled:busy})),
  (readError||error)&&h('p',{className:'pl-error',role:'alert'},readError||error),notice&&h('p',{className:'pl-saved',role:'status'},notice),
  h('dialog',{ref:playDialog,className:'pl-play-dialog','aria-label':t('{name}的陪玩玩法',{name}),onCancel:e=>{e.preventDefault();pause();}},
   h('div',{className:'pl-play-content'},h('header',{className:'pl-play-controls'},h('div',null,h('strong',null,title),h('small',null,(plan?.source==='ai'?t('進階模式設計玩法 · '):t('內建玩法 · '))+(sound==='off'?t('靜音'):t('水聲與命中音效')))),locked?h('div',{className:'pl-lock-layer'},h('button',{type:'button',className:'pl-lock'+(holding?' is-holding':''),'data-play-lock':true,'aria-label':t('畫面已鎖定。按住 2 秒解鎖，或用鍵盤按 Enter 解鎖'),...unlockHoldHandlers(()=>unlockHold.current,unlockPlay)},LockIcon(R),h('span',{className:'pl-lock-ring','aria-hidden':true}))):h(R.Fragment,null,/* 2026-11-17：結束改成要確認（和小魚一致），並把「鎖定」放回最右邊，解鎖後在原位置再點只會重新鎖住。 */button(t('結束'),()=>{if(typeof window.confirm!=='function'||window.confirm(t('要結束這次試玩嗎？')))finish();}),button(t('暫停'),pause,{disabled:phase!=='playing'}),button(h(R.Fragment,null,LockIcon(R),t(' 鎖定')),()=>lockPlay(),{className:'pl-lock-again','aria-label':t('鎖定畫面，避免貓誤觸')}))),
    h('div',{className:'pl-play-field',ref:field,'data-scene':sceneTheme,'data-paused':phase==='paused','aria-label':t('陪玩遊戲區'),onPointerDown:e=>touch(e,'blank',0)},
     scenery(false),h('div',{className:'pl-water-rings','aria-hidden':true}),
     lockHint&&h('p',{className:'pl-lock-hint'+(locked?'':' is-unlocked'),role:'status'},lockHint),
     (snapshot?.covers||[]).map((cover,index)=>h('button',{key:cover.id,type:'button',className:'pl-cover'+(cover.clue?' pl-clue':''),style:{left:cover.x+'px',top:cover.y+'px','--cover-tilt':((index%3-1)*12)+'deg'},'aria-label':t('第 {n} 處{cover}',{n:index+1,cover:coverLabel}),disabled:phase!=='playing',onPointerDown:e=>touch(e,'cover',index),onClick:e=>{if(e.detail===0)touch(e,'cover',index);}},h('svg',{viewBox:'0 0 80 90','aria-hidden':true},sceneTheme==='reef'||sceneTheme==='sand'?h(R.Fragment,null,h('path',{d:'M5 70L13 37L29 21L53 25L73 49L76 73Q40 89 5 70Z',fill:'#8caca2'}),h('path',{d:'M13 37L35 44L53 25M35 44L30 75M35 44L73 49',fill:'none',stroke:'#b5c9b5',strokeWidth:3}),h('ellipse',{cx:52,cy:65,rx:16,ry:10,fill:'#325d59'})):plan?.id==='hole-ambush'?h(R.Fragment,null,h('ellipse',{cx:40,cy:55,rx:34,ry:23,fill:'#bfa98b'}),h('ellipse',{cx:40,cy:55,rx:24,ry:14,fill:'#5b5548'})):h('path',{d:plan?.id==='leaf-trail'?'M8 72Q10 10 70 14Q79 75 8 72ZM9 72L59 27':'M18 84Q7 44 23 13Q45 42 28 84M39 84Q25 27 46 3Q64 40 48 84M54 84Q49 45 67 27Q81 60 64 84',fill:'currentColor',stroke:plan?.id==='leaf-trail'?'#9a8758':'none',strokeWidth:2})),cover.clue&&h('span',{className:'pl-bubbles','aria-hidden':true},'°'))),
     (snapshot?.ripples||[]).map((ripple,index)=>h('span',{key:index,className:'pl-touch-ripple','aria-hidden':true,style:{left:0,top:0,opacity:1-ripple.progress,transform:`translate3d(${ripple.x}px,${ripple.y}px,0) translate(-50%,-50%) scale(${.5+ripple.progress*2})`}})),
     (snapshot?.targets||[]).map((target,index)=>target.visible&&h('button',{key:target.id,type:'button',className:'pl-target','data-target-index':index,'data-reaction':index===0&&snapshot?.reaction||undefined,style:{left:0,top:0,width:fishSize.width+'px',height:fishSize.height+'px',transform:`translate3d(${target.x}px,${target.y}px,0) translate(-50%,-50%) rotate(${target.angle||0}deg)`},'aria-label':target.kind==='bug'?t('碰小蟲目標'):t('碰小魚目標'),disabled:phase!=='playing',onPointerDown:e=>touch(e,'target',index),onKeyDown:e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();},onClick:e=>{if(e.detail===0)touch(e,'target',index);}},target.kind==='bug'?h('svg',{viewBox:'0 0 100 64','aria-hidden':true},h('path',{d:'M30 21L19 10M30 43L19 54M48 20L42 6M48 44L42 58M65 22L75 10M65 42L75 54',stroke:'#665e45',strokeWidth:4,strokeLinecap:'round'}),h('ellipse',{cx:47,cy:32,rx:29,ry:20,fill:'#c1ac68'}),h('circle',{cx:76,cy:32,r:13,fill:'#887b4f'}),h('circle',{cx:81,cy:27,r:2.5,fill:'#fff'})):h(TopFish,{react:R,index,waterStyle:true,appearance:presentation.appearance}))),
     phase==='paused'&&h('div',{className:'pl-pause-panel'},h('h2',null,t('休息一下')),h('p',null,t('畫面與聲音都已暫停。')),button(t('繼續試玩'),resume,{className:'primary'}),locked?h('p',{className:'pl-lock-note'},t('畫面鎖定中。要結束，先按住右上角鎖頭 2 秒解鎖。')):button(t('結束這次試玩'),finish,{className:'secondary-btn'}))),
    h('footer',{className:'pl-play-footer'},h('span',null,snapshot?.stageLabel?t(snapshot.stageLabel):''),h('span',null,t('{n} 秒後休息',{n:Math.max(0,Math.ceil((plan?.durationSeconds||60)-(snapshot?.elapsed||0)))})),!locked&&button(sound==='off'?t('開啟聲音'):t('關閉聲音'),()=>changeSound(sound==='off'?'water':'off'))),
    audioState.error&&h('p',{role:'status',className:'pl-audio-error'},t('{error} 遊戲可繼續。',{error:tn(audioState.error)})))),
  h('dialog',{ref:removeDialog,className:'pl-leave-dialog','aria-label':t('確認刪除陪玩資料'),onCancel:e=>{e.preventDefault();if(!busy)setRemoveTarget(null);}},h('h2',null,removeTarget?.kind==='plan'?t('刪除這個玩法收藏？'):t('刪除這筆陪玩反應？')),h('p',null,removeTarget?.title),h('p',null,removeTarget?.kind==='plan'?t('只刪除此收藏，已保存的陪玩反應與當時玩法快照會保留。有衍生版本時，請先刪除最新版本。刪除後無法復原。'):t('只刪除這一筆反應，玩法收藏及其他反應都會保留。刪除後無法復原。')),error&&h('p',{className:'pl-error',role:'alert'},error),button(t('保留資料'),()=>setRemoveTarget(null),{className:'primary',autoFocus:true}),button(busy?t('正在刪除…'):t('確認刪除'),removeSaved,{className:'secondary-btn',disabled:!!readError})),
  h('dialog',{ref:leaveDialog,className:'pl-leave-dialog','aria-label':t('略過保存'),onCancel:e=>{e.preventDefault();setLeaveOpen(false);}},h('h2',null,t('這次反應尚未保存')),h('p',null,t('略過後，這次試玩與反應不會留下紀錄。若繼續用進階模式再設計，仍會在同意頁列出本次反應與補充文字。')),error&&h('p',{role:'alert',className:'pl-error'},error),button(busy?t('正在保存…'):t('儲存反應並繼續'),async()=>{if(await persist()&&mounted.current){setLeaveOpen(false);leaveAction.current?.();}},{className:'primary',disabled:!!readError}),button(t('留下來'),()=>setLeaveOpen(false),{className:'primary',autoFocus:true}),button(t('略過保存並繼續'),()=>{setLeaveOpen(false);audio.current?.stop();leaveAction.current?.();},{className:'secondary-btn'})));
}
