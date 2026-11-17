import {t, tn, K, isEnglish} from './i18n.js?v=audit1117b';
import {useCloudQuota} from './cloud-quota.js?v=quota-feedback1';
import {devToolsEnabled} from './dev-tools.js?v=1';
import {listCareCats} from './care-journey-model.js?v=photo-simplify1';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {VOICE_KINDS,newVoiceDraft,voiceContext,assertVoiceContext,voiceWarnings,voiceExample,splitVoiceText,saveVoiceBatch,voiceReceipt,undoVoiceBatch,simulateCloudQuickText,futureVoiceRow,splitEnglishVoiceText} from './voice-quick-model.js?v=photo-simplify1';
import {NativeVoiceCapture} from './native-voice-capture.js?v=r4';
import {suggestVoiceDrafts,settleDraft,blockingCount,baseName} from './voice-suggest.js?v=6';
import {GEMMA_MODELS,parseGemmaMeal,useGemmaModels} from './gemma-meal.js?v=r3';
import {DownloadConfirm} from './download-confirm.js?v=r3';
import {VOICE_CLOUD_MODE,cloudCandidates,buildVoiceCloudRequest,parseVoiceCloud,applyVoiceCloud} from './voice-cloud.js?v=ai-names1';
import {savePending,loadPending,clearPending,pendingFresh} from './cloud-return.js?v=203';

// 現在的日期時間：today 是真的今天時用手機時鐘；否則（測試或跨日）只擋晚於 today 的日期。
function clockFor(today){const d=new Date(),p=n=>String(n).padStart(2,'0'),date=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;return date===today?{date,time:`${p(d.getHours())}:${p(d.getMinutes())}`}:{date:today,time:'23:59'};}
export function voiceMissingFields(draft){return [...(!draft.catId?[t('還沒選哪隻毛孩')]:[]),...(!VOICE_KINDS.some(([kind])=>kind===draft.kind)?[t('還沒選紀錄類別')]:[])];}
// 英文介面的語音示範：只列出可以怎麼說，不載入、不分卡、不經中文規則。
const ENGLISH_VOICE_SAMPLES=Object.freeze(['Mochi ate half a can of wet food this morning.','Mochi drank about 30 ml of water.','Mochi threw up once after breakfast.']);
export function fillMissingVoiceTime(rows,clock){return rows.map(row=>row.time||row.timeFuture?row:{...row,date:row.date||clock.date,time:clock.time,timeNote:t('時間未提及，以目前時間暫填請核對'),timeReasons0:[...(row.timeReasons0||[]),t('時間未提及，以目前時間暫填請核對')]});}
export function VoiceQuickFlow({react:R,root,today,date,time,catId,onDirty,onBusy,blocked=false,autoStart=false,children}){
 const h=R.createElement,view=R.useSyncExternalStore(root.subscribe,root.get,root.get),cats=listCareCats(view.data);
 const [raw,setRaw]=R.useState(''),[demo,setDemo]=R.useState(false),[example,setExample]=R.useState(null),[correct,setCorrect]=R.useState(false),[drafts,setDrafts]=R.useState(null),[review,setReview]=R.useState(false),[removed,setRemoved]=R.useState(null),[openRows,setOpenRows]=R.useState(()=>new Set()),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[receipt,setReceipt]=R.useState(null),[busy,setBusy]=R.useState(false),[replace,setReplace]=R.useState(null),[blocker,setBlocker]=R.useState(null);
 const [recordDate,setRecordDate]=R.useState(date),[recordTime,setRecordTime]=R.useState(time);
 // 規則分不準時用進階模式整理（只送文字）。有原生進階模式橋接 window.V161Cloud 時才出現：Android（host-bridge.js）與 iOS（ios-cloud-bridge.js，第 6 包起）都有；純網頁沒有。
 const nativeCloud=typeof window!=='undefined'&&typeof window.V161Cloud?.request==='function'?window.V161Cloud:null;
 const [cloudWait,setCloudWait]=R.useState(false),[cloudStatus,setCloudStatus]=R.useState(''),cloudAbort=R.useRef(null);
 const retainedCloud=R.useRef(null);
 const voiceHost=typeof window!=='undefined'&&typeof window.V161Asr?.request==='function'?window.V161Asr:null;
 const gemmaHost=typeof window!=='undefined'?window.V161Gemma:null;
 // 2026-11-17：這個版本沒有進階模式（網頁／未接線）時，按鈕直接寫「此版本未開放」，不要選了才看到「尚未支援」。
 const [aiMode,setAiMode]=R.useState('cloud'),[confirmDl,setConfirmDl]=R.useState(false);
 const phoneAiOpen=aiMode==='local';
 // 英文介面（docs/i18n-plan M6）：可錄音（原生端用英文辨識），但不套本機中文分卡規則、不提供手機模式；
 // 轉好的英文原句只放進文字框，由使用者選進階模式整理、直接存成一則紀錄，或按句子拆開自己選類別。
 const english=isEnglish();
 const [gemma,setGemma]=useGemmaModels(R,phoneAiOpen?gemmaHost:null,true),[modelChoice,setModelChoice]=R.useState('');
 const [preparing,setPreparing]=R.useState(false),downloadLock=R.useRef(false);
 const downloadModel=GEMMA_MODELS.find(model=>gemma?.models?.some(item=>item.id===model.id&&item.supported!==false&&!item.ready&&!item.block));
 const modelDownload=gemma?.models?.find(item=>item.id===downloadModel?.id);
 const preparePhoneAI=async()=>{
  if(downloadLock.current||gemma?.downloading||!downloadModel)return;
  downloadLock.current=true;setPreparing(true);setError('');
  try{const status=await gemmaHost.request('prepare',{model:downloadModel.id});if(mounted.current)setGemma(status);}
  catch(e){if(mounted.current)setError(tn(e.message)||t('下載尚未完成，文字仍保留。'));}
  finally{downloadLock.current=false;if(mounted.current)setPreparing(false);}
 };
 const readyModels=GEMMA_MODELS.filter(model=>gemma?.models?.some(item=>item.id===model.id&&item.ready&&item.supported!==false));
 const selectedModel=readyModels.find(model=>model.id===modelChoice)||readyModels[0];
 const [editing,setEditing]=R.useState(false),[scenario,setScenario]=R.useState('success'),[asrActive,setAsrActive]=R.useState(false);
 // 原生端可離線辨識時優先使用系統語音；Apple 原生版不提供舊模型入口。
 const [systemVoice,setSystemVoice]=R.useState(false),[systemOffer,setSystemOffer]=R.useState(null);
 // 等狀態探測完成才顯示擷取區；開頁只探測，不錄音、不下載、不送 AI。
 const [systemChecked,setSystemChecked]=R.useState(!voiceHost);
 R.useEffect(()=>{
  if(!voiceHost)return undefined;
  let alive=true;
  voiceHost.request('status',{engine:'system'}).then(s=>{if(!alive)return;const offer=s&&s.engine==='system'&&(s.available===true||s.nativeDefault===true)?{onDevice:s.onDevice===true,nativeDefault:s.nativeDefault===true,localAvailable:s.localAvailable!==false,offlineOnly:s.offlineOnly===true}:null;setSystemOffer(offer);if(offer?.onDevice||offer?.nativeDefault)setSystemVoice(true);}).catch(()=>{}).finally(()=>{if(alive)setSystemChecked(true);});
  return()=>{alive=false;};
 },[]);
 const hasText=!!raw.trim();
 const blocking=drafts?drafts.filter(row=>row.catUnsure||voiceMissingFields(row).length>0).length:0;
 const hasSeveralSentences=raw.split(/[。！？；\n]+/).filter(part=>/[\p{L}\p{N}]/u.test(part)).length>1;
 const owner=catId||cats[0]?.id,ownerName=cats.find(cat=>cat.id===owner)?.profile.name||t('目前毛孩');
 const context=R.useRef(voiceContext(root.get())),running=R.useRef(false),batch=R.useRef(null),saved=R.useRef(false),mounted=R.useRef(true),panel=R.useRef(null);
 const dialog=R.useRef(null),cancelButton=R.useRef(null),trigger=R.useRef(null),editor=R.useRef(null);
 usePhoneDialog(R,dialog,!!replace);
 R.useEffect(()=>{
  if(replace){dialog.current?.showModal?.();cancelButton.current?.focus({preventScroll:true});}
  else dialog.current?.close?.();
 },[replace]);
 R.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;cloudAbort.current?.abort();};},[]);
 const disabled=blocked||busy||asrActive||cloudWait,dirty=()=>{setReview(false);setError('');onDirty?.(true);};
 const edit=(index,patch)=>{dirty();setDrafts(rows=>rows.map((row,i)=>i===index?settleDraft(row,patch):row));};
 const field=(label,element)=>h('label',{className:'cj-field'},h('span',null,label),element);
 const button=(label,action,props={})=>h('button',{type:'button',disabled,onClick:action,...props},label);
 const ask=(kind,event)=>{trigger.current=event?.currentTarget;setReplace(kind);};
 const cancel=()=>{setReplace(null);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));};
 const focusText=()=>{
  setEditing(true);
  if(!drafts&&editor.current){
   // Mobile WebKit opens the keyboard when focus stays inside the tap handler.
   editor.current.hidden=false;
   editor.current.querySelector('textarea')?.focus();
  }else{
   requestAnimationFrame(()=>editor.current?.querySelector('textarea')?.focus());
  }
 };
 const releaseVoiceCloud=async()=>{const held=retainedCloud.current;if(!held||!nativeCloud)return;try{const s=await nativeCloud.request('status');if(s.kind==='text'&&s.mode===VOICE_CLOUD_MODE&&s.meetingId===held.meetingId&&['done','failed','timeout'].includes(s.state)){await nativeCloud.request('ack');if(loadPending('voice')?.meetingId===held.meetingId)clearPending('voice');retainedCloud.current=null;}else if(s.state==='idle'){if(loadPending('voice')?.meetingId===held.meetingId)clearPending('voice');retainedCloud.current=null;}}catch{/* 不讓清除失敗撤銷已保存紀錄，也不碰其他功能的工作。 */}};
 const applyTranscript=text=>{
  const transcript=typeof text==='string'?text.trim():'';
  if(!transcript)return false;
  const next=[raw,transcript].filter(Boolean).join('\n');
  if(next.length>4000){setError(t('文字草稿上限為 4,000 字。請先縮短已輸入的文字，再加入轉寫。'));return false;}
  // 英文：不自動分卡（本機規則只懂中文），原句留在文字框等使用者選。
  if(english){setRaw(next);setEditing(true);setExample(null);setNotice(t('已加入轉寫的英文原句，請核對文字。'));dirty();return true;}
  setRaw(next);setEditing(true);setNotice('');dirty();buildCards(next);return true;
 };
 const loadExample=()=>{void releaseVoiceCloud();quota.clearResult();const next=voiceExample(cats,today);setRaw(next.raw);setEditing(true);setExample(next);setDemo(true);setCorrect(false);setDrafts(null);setReceipt(null);setNotice(t('已載入虛構例句，不代表任何毛孩的真實情況。'));setRemoved(null);batch.current=null;saved.current=false;setReplace(null);dirty();};
 const clear=()=>{void releaseVoiceCloud();quota.clearResult();setRaw('');setEditing(false);setAiMode('cloud');setRecordDate(date);setRecordTime(time);setExample(null);setDemo(false);setCorrect(false);setDrafts(null);setReceipt(null);setRemoved(null);setNotice('');setReplace(null);batch.current=null;saved.current=false;context.current=voiceContext(root.get());dirty();onDirty?.(false);};
 const makeDrafts=()=>{try{dirty();const rows=example&&raw===example.raw?example.rows.map((row,i)=>({...row,...(correct&&i===example.correction.index?{text:row.text.replace(example.correction.from,example.correction.to)}:{})})):splitVoiceText(raw);setDrafts(rows);setRemoved(null);setNotice(example?t('固定範例的八類建議已列出；沒有執行 AI，保存後仍是示範紀錄。'):t('只按句號、分號或換行拆句。毛孩、類別、數字與時間都請自行選填，沒有執行 AI。'));requestAnimationFrame(()=>panel.current?.querySelector('[data-voice-review]')?.focus({preventScroll:true}));}catch(e){setError(tn(e.message));}};
 const runCloud=()=>{try{const result=simulateCloudQuickText(raw,{confirmed:true,outcome:scenario});setReplace(null);setNotice(result.message);setError('');if(result.ok){dirty();setDrafts(result.rows);setRemoved(null);requestAnimationFrame(()=>panel.current?.querySelector('[data-voice-review]')?.focus({preventScroll:true}));}}catch(e){setReplace(null);setError(tn(e.message));}};
 const buildCards=text=>{try{dirty();const rows=english?splitEnglishVoiceText(text).map(row=>({...row,catId:owner||'',date:recordDate,time:recordTime})):suggestVoiceDrafts(splitVoiceText(text),cats,{owner,date:recordDate,time:recordTime,now:clockFor(today)});setDrafts(rows);setRemoved(null);setOpenRows(new Set());requestAnimationFrame(()=>panel.current?.querySelector('[data-voice-review]')?.focus({preventScroll:true}));}catch(e){setError(tn(e.message));}};
 const makeCards=()=>buildCards(raw);
 // 英文、手動分卡：只按句子拆開，毛孩預填目前這隻、類別留空讓使用者選。
 const makeEnglishCards=()=>{buildCards(raw);setNotice(t('英文不支援本機自動分卡：已按句子拆開，請為每張卡選毛孩與類別。'));};
 const askOnline=event=>{if(!drafts)buildCards(raw);ask('voice-cloud-all',event);};
 // ── 規則分不準的句子，用進階模式整理（按下並同意才送；只送那幾句文字） ──
 const CLOUD_ACTIVE=['queued','processing','submitting'];
 const cloudRows=drafts&&!demo&&!saved.current&&nativeCloud?cloudCandidates(drafts):[];
 const cloudAsk=replace==='voice-cloud'||replace==='voice-cloud-all';
 const quota=useCloudQuota(R,cloudAsk&&!!nativeCloud,nativeCloud);
 const cloudRequest=cloudAsk&&drafts?buildVoiceCloudRequest({rows:drafts,cats,today,all:replace==='voice-cloud-all'}):null;
 const takeCloud=async(s,request,base)=>{
  retainedCloud.current={meetingId:s.meetingId};
  let result;
  try{result=applyVoiceCloud(base,request,parseVoiceCloud(s.summary,request),{cats,now:clockFor(today)});}
  catch(e){setBlocker({label:t('文字快記整理結果'),meetingId:s.meetingId,kind:'text',mode:VOICE_CLOUD_MODE});throw e;}
  if(!mounted.current)return;
  dirty();setDrafts(result.rows);setRemoved(null);setOpenRows(new Set());
  setNotice(t('進階模式整理了 {replaced} 句{v1}{v2}。請核對每張卡，按「全部儲存」前不會新增紀錄。', {replaced: result.replaced, v1: result.kept?t('，另有 {kept} 句沒有整理出結果，維持原本的卡片', {kept: result.kept}):'', v2: request.overflow?t('，{overflow} 句超過上限沒有送出', {overflow: request.overflow}):''}));
  requestAnimationFrame(()=>panel.current?.querySelector('[data-voice-review]')?.focus({preventScroll:true}));
 };
 const waitVoiceCloud=async(meetingId,request,base,controller,attempt)=>{
  setCloudStatus(t('已送出，等進階模式回覆…'));
  for(;;){
   await new Promise(resolve=>setTimeout(resolve,2000));
   if(controller.signal.aborted||!mounted.current)return;
   const s=await nativeCloud.request('status');
   if(controller.signal.aborted||!mounted.current)return;
   if(s.meetingId!==meetingId||s.state==='idle'){clearPending('voice');throw Error(t('進階模式整理已中止，原本的卡片仍保留。'));}
   if(s.state==='processing')setCloudStatus(t('進階模式正在整理…'));
   attempt.billing=s.billing||'unknown';
   if(s.state==='done'){attempt.done=true;return takeCloud(s,request,base);}
   if(s.state==='failed'||s.state==='timeout'){await nativeCloud.request('ack');clearPending('voice');throw Error(tn(s.message)||t('進階模式沒有完成整理，原本的卡片仍保留。'));}
  }
 };
 const sendVoiceCloud=async()=>{
  if(running.current||!nativeCloud||!drafts)return;
  const base=drafts,request=buildVoiceCloudRequest({rows:base,cats,today,all:replace==='voice-cloud-all'});
  setReplace(null);
  if(!request)return;
  quota.clearResult();
  running.current=true;setCloudWait(true);setError('');setBlocker(null);setNotice('');setCloudStatus(t('正在送出…'));
  const attempt={sent:false,done:false,billing:'unknown'};
  const controller=new AbortController();cloudAbort.current=controller;
  try{
   const before=await nativeCloud.request('status');
   if(before.state!=='idle'){
    const mine=before.kind==='text'&&before.mode===VOICE_CLOUD_MODE;
    if(!mine){
     // 進階模式只有一個槽位：說出是哪一項。已結束但沒人核對的陪玩結果、或失敗／逾時的項目可以放棄；等你核對的看診摘要／食品結果不能替你丟。
     const label=before.kind==='image'?t('食品照片'):before.mode==='summary'?t('看診摘要'):before.mode==='play-design'?t('陪玩玩法設計'):t('其他項目');
     const ended=['done','failed','timeout'].includes(before.state);
     if(!ended)throw Error(t('進階模式還在處理{label}，請稍候再整理語音。', {label}));
     if(before.mode==='play-design'||before.state!=='done'){setBlocker({label,play:before.mode==='play-design',meetingId:before.meetingId,kind:before.kind,mode:before.mode});throw Error(t('AI 伺服器上還留著{label}{v1}，要先處理才能整理語音。', {label, v1: before.state==='done'?t('做好的結果'):t('沒有完成的工作')}));}
     throw Error(t('AI 伺服器上的{label}結果還等你核對，請先到那個頁面處理完再整理語音。', {label}));
    }
    if(CLOUD_ACTIVE.includes(before.state))throw Error(t('上一次的進階模式整理還在處理，請稍候。'));
    await nativeCloud.request('ack');
   }
   const meetingId='voice-'+crypto.randomUUID();
   attempt.sent=true;
   const sent=await nativeCloud.request('submit',{meetingId,transcript:request.text,mode:VOICE_CLOUD_MODE,lang:'zh-TW'});
   if(sent.error){attempt.billing=sent.billing||'unknown';throw Error(sent.error);}
   savePending('voice',{meetingId,cloudJobId:sent.jobId||'',submittedAt:Date.now()});
   await waitVoiceCloud(meetingId,request,base,controller,attempt);
  }catch(e){attempt.billing=e?.billing||attempt.billing;if(mounted.current)setError(tn(e&&e.message)||t('進階模式暫時無法整理，原本的卡片仍保留。'));}
  finally{running.current=false;if(mounted.current){setCloudWait(false);setCloudStatus('');void quota.settle({outcome:attempt.done?'success':!attempt.sent?'not-sent':controller.signal.aborted?'pending':'failure',billing:attempt.billing});}}
 };
 const discardBlocker=async()=>{
  if(running.current||!blocker)return;
  running.current=true;
  try{const current=await nativeCloud.request('status');if(current.meetingId!==blocker.meetingId||current.kind!==blocker.kind||current.mode!==blocker.mode||!['done','failed','timeout'].includes(current.state))throw Error(t('AI 伺服器上的工作已變更，沒有放棄任何內容。'));await nativeCloud.request('ack');if(blocker.play)clearPending('play');else if(current.mode===VOICE_CLOUD_MODE){clearPending('voice');retainedCloud.current=null;}if(mounted.current){setError('');setNotice(t('已放棄 AI 伺服器上的{label}。請再按一次「用進階模式整理」。', {label: blocker.label}));}}
  catch(e){if(mounted.current)setError(tn(e&&e.message)||t('沒有放棄成功，請稍後再試。'));}
  finally{running.current=false;if(mounted.current)setBlocker(null);}
 };
 const stopCloudWait=()=>{cloudAbort.current?.abort();setNotice(t('已停止等待；進階模式可能仍在處理，結果不會自動套用，原本的卡片仍保留。'));};
 // 離開畫面又回來：原卡片已不在，不能自動套用；完成結果保留到使用者明確放棄。
 R.useEffect(()=>{
  if(!nativeCloud)return undefined;
  const record=loadPending('voice');if(!record)return undefined;
  let alive=true;
  (async()=>{
   const s=await nativeCloud.request('status');
   if(!alive)return;
   const mine=s.kind==='text'&&s.mode===VOICE_CLOUD_MODE&&s.meetingId===record.meetingId;
   if(!mine){if(s.state==='idle'||!pendingFresh(record))clearPending('voice');return;}
   if(CLOUD_ACTIVE.includes(s.state)){if(pendingFresh(record))setNotice(t('上一次的進階模式整理還在處理；因為你離開過畫面，結果不會自動套用，完成後會保留到你明確放棄。'));return;}
   if(s.state==='done'){retainedCloud.current={meetingId:s.meetingId};if(alive){setBlocker({label:t('文字快記整理結果'),meetingId:s.meetingId,kind:s.kind,mode:s.mode});setError(t('上一次的進階模式結果還在等你處理；原始輸入畫面已離開，請明確放棄結果後再重新整理。'));}return;}
   await nativeCloud.request('ack');clearPending('voice');
   if(alive)void quota.settle({outcome:s.state==='done'?'success':'failure',billing:s.billing});
   if(alive)setNotice(t('上一次的進階模式整理已結束，因為你離開過畫面，結果沒有套用；需要的話請重新分卡後再按「用進階模式整理」。'));
  })().catch(()=>{});
  return()=>{alive=false;};
 },[]);
 const act=async action=>{if(running.current||disabled)return;running.current=true;setBusy(true);onBusy?.(true);setError('');try{await action();}catch(e){if(mounted.current)setError(tn(e.message)||t('這次沒有存到，文字還在，請再按一次儲存。'));}finally{running.current=false;if(mounted.current)setBusy(false);onBusy?.(false);}};
 const organizeMeal=()=>act(async()=>{
  if(!selectedModel||demo||saved.current)return;
  quota.clearResult();
  const result=await gemmaHost.request('organize',{model:selectedModel.id,text:raw.trim()});
  if(!mounted.current)return;
  if(result.message)throw Error(result.message);
  const meal=parseGemmaMeal(raw,result.candidate);
  const foods=voiceFoods(cats.find(cat=>cat.id===owner)).filter(food=>food.name===meal.food);
  dirty();setRemoved(null);
  setDrafts([{...newVoiceDraft(raw),catId:owner,kind:'food',date:recordDate,time:recordTime,meal:true,
   foodHint:meal.food,foodId:foods.length===1?foods[0].id:'',provided:meal.provided,eaten:meal.eaten,mealUnit:meal.unit,localModel:selectedModel.id}]);
  setNotice(t('手機模式已整理成餵食草稿。請核對原文、食品與份量。'));
  requestAnimationFrame(()=>panel.current?.querySelector('[data-voice-review]')?.focus({preventScroll:true}));
 });
 const save=()=>act(async()=>{
  if(saved.current)throw Error(t('這批已保存，請勿重複送出。'));
  if(!drafts?.length)throw Error(t('沒有可保存的卡片。'));
  if(drafts.some(row=>row.catUnsure||voiceMissingFields(row).length>0))throw Error(t('還有毛孩或類別尚未確認的卡片，請先確認。'));
  const snapshot=structuredClone(drafts),ids=snapshot.map(row=>row.catId);assertVoiceContext(root.get(),context.current,ids);
  batch.current ||= 'voice-'+crypto.randomUUID();
  await root.atomic(data=>{assertVoiceContext({...root.get(),data},context.current,ids);return saveVoiceBatch(data,snapshot,{id:batch.current,demo,today,clock:clockFor(today)});});
  // Mark durable completion before deriving an undo receipt. A receipt problem
  // must never make the UI invite a duplicate save of the committed batch.
  saved.current=true;onDirty?.(false);await releaseVoiceCloud();
  const result=voiceReceipt(root.get().data,batch.current,snapshot);
  setReceipt(result);setReview(false);setNotice(t('已儲存 {n} 筆{v1}紀錄。{v2}記錯了可以按「取消這批紀錄」。', {n: result.rows.length, v1: demo?t('示範'):'', v2: demo?t('不列入真實統計與看診摘要。'):''}));
 });
 const saveDirect=()=>act(async()=>{
  if(saved.current)throw Error(t('這筆已保存，請開始新的一筆。'));
  const ids=[owner];
  const snapshot=[{...newVoiceDraft(raw),catId:owner,kind:'other',date:recordDate,time:recordTime}];
  assertVoiceContext(root.get(),context.current,ids);
  batch.current ||= 'voice-'+crypto.randomUUID();
  await root.atomic(data=>{assertVoiceContext({...root.get(),data},context.current,ids);return saveVoiceBatch(data,snapshot,{id:batch.current,demo,today,clock:clockFor(today)});});
  saved.current=true;onDirty?.(false);setReview(false);await releaseVoiceCloud();
  setNotice(demo?t('已儲存示範紀錄，不列入真實統計與看診摘要。'):t('已儲存一般紀錄。'));
  setReceipt(voiceReceipt(root.get().data,batch.current,snapshot));
 });
 const undo=()=>act(async()=>{
  if(!receipt)throw Error(t('這批紀錄目前無法撤銷。'));
  const ids=receipt.rows.map(row=>row.catId);assertVoiceContext(root.get(),context.current,ids);
  await root.atomic(data=>{assertVoiceContext({...root.get(),data},context.current,ids);return undoVoiceBatch(data,receipt);});
  setReceipt(null);setNotice(t('已取消這批紀錄，文字還在，可重新分類；其他紀錄不受影響。'));
  // Re-saving is an explicit new review with new identity, never a reused undo.
  batch.current=null;saved.current=false;setReview(false);dirty();
 });
 const select=(label,value,options,change)=>field(label,h('select',{value,disabled,onChange:e=>change(e.target.value)},options.map(([value,text])=>h('option',{key:value,value},text))));
 const quantities=(draft,i)=>{
  if(!['water','weight','vomit'].includes(draft.kind))return null;
  const units={water:[['',t('留空')],['ml','ml'],[K('毫升'),t('毫升')]],weight:[['',t('請選擇')],[K('公斤'),t('公斤')]],vomit:[['',t('留空')],[K('次'),t('次')]]};
  return h('div',{className:'vq-two'},field(draft.kind==='weight'?t('體重（大於 0）'):draft.kind==='vomit'?t('確認的嘔吐次數（可留空）'):t('喝入量（可留空）'),h('input',{value:draft.amount,type:'text',inputMode:'decimal',disabled,onChange:e=>edit(i,{amount:e.target.value}),placeholder:t('不確定不填')})),select(t('單位'),draft.unit,units[draft.kind],unit=>edit(i,{unit})));
 };
 const voiceFoods=cat=>(cat?.data.foodCards||[]).filter(food=>!food.archived&&!food.deletedAt&&!food.demo&&!String(food.source).includes(K('示範')));
 const chipColor=id=>{let n=0;for(const ch of String(id||''))n=(n*31+ch.charCodeAt(0))%360;return `hsl(${n} 45% 82%)`;};
 const whenText=draft=>{const day=draft.date===today?t('今天'):String(draft.date||'').slice(5).replace('-','/');return `${day} ${draft.time||''}`.trim()+(draft.timeFuture?t('（時間待確認）'):draft.timeNote?t('（猜）'):'');};
 const toggleRow=key=>setOpenRows(old=>{const next=new Set(old);if(next.has(key))next.delete(key);else next.add(key);return next;});
 const rowView=(draft,i)=>{
  const cat=cats.find(item=>item.id===draft.catId),missingFields=voiceMissingFields(draft),blockingRow=!!draft.catUnsure||missingFields.length>0,guessedRow=!blockingRow&&(draft.uncertain?.length>0);
  const open=!saved.current&&(blockingRow||openRows.has(draft.key));
  const text=draft.text.length>26?draft.text.slice(0,26)+'…':draft.text;
  const kind=VOICE_KINDS.find(([id])=>id===draft.kind)?.[1]||t('待選類別');
  return h('div',{key:draft.key,className:'vq-row'+(blockingRow?' is-blocking':guessedRow?' is-guessed':'')},
   h('button',{type:'button',className:'vq-row-head',disabled:saved.current||blockingRow,'aria-expanded':open,onClick:()=>toggleRow(draft.key)},
    h('span',{className:'vq-chip','aria-hidden':true,style:{background:chipColor(draft.catId)}},[...(baseName(cat?.profile.name)||'？')][0]),
    h('span',{className:'vq-row-main'},h('strong',null,`${cat?.profile.name||t('待選毛孩')} · ${kind}`),h('span',null,text),h('small',null,whenText(draft))),
    blockingRow?h('span',{className:'vq-unsure-tag'},t('請確認')):guessedRow?h('span',{className:'vq-guess-tag'},t('已猜')):(saved.current?h('span',{className:'vq-saved-mark'},'✓'):h('span',{className:'vq-edit-hint'},open?t('收起'):t('修改')))),
   !saved.current&&futureVoiceRow(draft,clockFor(today))&&h('p',{className:'cj-error','data-voice-future':true},t('這張的時間還沒到，請把日期時間改成現在或更早，才能儲存。')),
   (blockingRow||guessedRow)&&h('p',{className:'vq-muted vq-guess'},(blockingRow?t('請確認：'):t('已猜：'))+[...(draft.uncertain||[]),...missingFields].join(t('、'))+t('。')),
   // 只有真的分不出哪隻毛孩才要按「這樣對」；「已猜」的卡直接可存，點卡片就能改。
   !saved.current&&blockingRow&&h('div',{className:'vq-row-actions'},
    button(t('這樣對'),()=>edit(i,{confirmed:true}),{className:'vq-ok'})),
   open&&card(draft,i));
 };
 const card=(draft,i)=>{
  const cat=cats.find(cat=>cat.id===draft.catId),foods=voiceFoods(cat);
  return h('fieldset',{className:'vq-draft',key:draft.key,disabled:disabled||saved.current},h('legend',null,t('第 {v0} 張 · {v1} · {v2}', {v0: i+1, v1: cat?.profile.name||t('待選毛孩'), v2: VOICE_KINDS.find(([id])=>id===draft.kind)?.[1]||t('待選類別')})),
   h('div',{className:'vq-two'},select(t('哪隻毛孩'),draft.catId,[['',t('請確認毛孩')],...cats.map(cat=>[cat.id,cat.profile.name])],catId=>edit(i,{catId,foodId:''})),select(t('類別'),draft.kind,[['',t('請選擇類別')],...VOICE_KINDS],kind=>edit(i,{kind,amount:'',unit:'',meal:false,foodId:'',provided:'',eaten:'',mealUnit:'',eliminationKind:'unknown'}))),
   h('details',{className:'vq-more',open:!!draft.timeNote||(draft.uncertain||[]).some(r=>/時間|日期|time|date/i.test(r))},h('summary',null,t('日期時間與內容')),
   h('div',{className:'vq-date-fields'},field(t('日期'),h('input',{type:'date',value:draft.date,max:today,disabled,onChange:e=>edit(i,{date:e.target.value})})),field(t('時間'),h('input',{type:'time',value:draft.time,disabled,onChange:e=>edit(i,{time:e.target.value})}))),
   field(t('內容（可改）'),h('textarea',{value:draft.text,disabled,maxLength:4000,onChange:e=>edit(i,{text:e.target.value})})),
   h('details',{className:'vq-source'},h('summary',null,t('查看這項原文與核對提醒')),h('p',{className:'vq-verbatim'},draft.raw),h('ul',null,voiceWarnings(draft.raw).map(warning=>h('li',{key:warning},warning))))),
   draft.timeNote&&h('p',{className:'vq-muted vq-guess'},draft.timeNote+t('。不對請改日期時間。')),
   draft.kind==='food'&&draft.foodHint&&h('p',{className:'vq-muted'},t('從你說的話找到「{foodHint}」，請核對食品卡。', {foodHint: draft.foodHint})),
   draft.kind==='elimination'&&select(t('排泄類型'),draft.eliminationKind,[['unknown',t('未分類，保留原文')],['urine',t('尿尿')],['stool',t('便便')]],eliminationKind=>edit(i,{eliminationKind})),
   quantities(draft,i),
   draft.kind==='food'&&h(R.Fragment,null,
    h('label',{className:'cj-consent'},h('input',{type:'checkbox',checked:draft.meal,disabled,onChange:e=>edit(i,{meal:e.target.checked})}),t('另存成一餐')),
    !draft.meal&&h('p',{className:'vq-muted'},t('目前只存飲食文字，不推估食品、餵食量或吃下量，也不算一餐。')),
    draft.meal&&h('div',{className:'vq-meal'},
     select(t('確認食品卡'),draft.foodId,[['',t('請選這隻毛孩的食品卡')],...foods.map(food=>[food.id,`${food.name} · v${food.version||1}`])],foodId=>edit(i,{foodId})),
     !foods.length&&h('p',{className:'vq-muted'},t('尚無可用食品卡。可取消「另存成一餐」，先保存原文；完整餵食表單仍可建立食品。')),
     h('div',{className:'vq-two vq-meal-amounts'},
      field(t('餵食量'),h('input',{type:'text',inputMode:'decimal',value:draft.provided,disabled,onChange:e=>edit(i,{provided:e.target.value})})),
      field(t('吃下量'),h('input',{type:'text',inputMode:'decimal',value:draft.eaten,disabled,'aria-describedby':`vq-amount-${draft.key}`,onChange:e=>edit(i,{eaten:e.target.value})}))),
     h('p',{id:`vq-amount-${draft.key}`,className:'vq-muted'},t('未知的份量請留空。')),
     select(t('餐次單位'),draft.mealUnit,[['',t('請選擇單位')],...['g',K('公克'),'kg',K('公斤'),'ml',K('毫升'),K('包'),K('罐'),K('顆'),K('片')].filter(v=>!english||v===draft.mealUnit||![K('公克'),K('公斤'),K('毫升')].includes(v)).map(v=>[v,t(v)])],mealUnit=>edit(i,{mealUnit})))),
   !saved.current&&button(t('刪除這張卡片'),()=>{dirty();setRemoved({draft,index:i});setDrafts(rows=>rows.filter((_,n)=>n!==i));},{className:'vq-remove','aria-label':t('刪除第 {v0} 張卡片', {v0: i+1})})
  );
 };
 const saveOptions=!drafts&&hasText&&!saved.current&&h('section',{className:'vq-save'},
    english&&h('h3',null,t('選擇保存方式')),
    english&&h('p',{className:'vq-muted'},t('錄音只會轉成文字。你可以直接保存、自己選類別，或交給 AI 整理。')),
    h('details',{className:'vq-edit-date'},
     h('summary',null,h('span',null,ownerName),h('span',{className:'vq-datetime'},`${recordDate||t('請選日期')} ${recordTime||t('請選時間')}`),h('span',{className:'vq-muted'},t('修改日期時間'))),
     h('div',{className:'vq-date-fields'},field(t('紀錄日期'),h('input',{type:'date',value:recordDate,max:today,disabled,onChange:e=>{setRecordDate(e.target.value);dirty();}})),field(t('紀錄時間'),h('input',{type:'time',value:recordTime,disabled,onChange:e=>{setRecordTime(e.target.value);dirty();}})))),
    english&&button(busy?t('儲存中…'):demo?t('儲存示範紀錄'):t('存成文字筆記'),saveDirect,{className:'secondary-btn','data-voice-save-note':true,disabled:disabled||!recordDate||!recordTime}),
    !demo&&!english&&button(t('分成紀錄卡'),makeCards,{className:'secondary-btn','data-voice-split':true,disabled:disabled||!raw.trim()}),
    !demo&&!english&&h('p',{className:'vq-muted'},t('這是未使用 AI 的分卡預覽，可自行核對後儲存。')),
    !demo&&english&&button(t('自己選類別'),makeEnglishCards,{className:'secondary-btn','data-voice-english-split':true,disabled:disabled||!raw.trim()}),
    english&&h('p',{className:'vq-muted'},t('不用 AI，也不用額度。')),
    !english&&button(busy?t('儲存中…'):demo?t('儲存示範紀錄'):t('不分類，直接存這段文字'),saveDirect,{className:demo?'cj-primary':'vq-link',disabled:disabled||!recordDate||!recordTime}),
    h('p',{className:'vq-muted'},t('以一般紀錄儲存在這支手機。')));
 return h('section',{className:'vq-panel',ref:panel,'aria-label':t('文字與語音快記')},
  h('div',{className:'vq-body'},
   !drafts&&!demo&&!saved.current&&voiceHost&&systemChecked&&h(NativeVoiceCapture,{key:systemVoice?'system':'local',engine:systemVoice?'system':'local',autoStart:autoStart&&!systemVoice,react:R,host:voiceHost,disabled:blocked||busy,onActive:setAsrActive,onTranscript:applyTranscript,onType:editing?undefined:focusText}),
   !drafts&&!demo&&(!voiceHost||english&&!systemChecked)&&!editing&&button(t('直接打字'),focusText,{className:'cj-primary','data-voice-type':true}),
   english&&!voiceHost&&!drafts&&!demo&&!saved.current&&!editing&&h('p',{className:'vq-muted','data-voice-no-mic':true},t('這個版本沒有語音輸入，請直接打字。')),
   saved.current&&!drafts&&h('p',{className:'vq-notice',role:'status'},notice),
   demo&&h('p',{className:'vq-demo-note'},t('以下是虛構例句。即使修改內容，這一批也只會保存為示範紀錄；要記真實觀察，請「開始新的一筆」。')),
   h('div',{ref:editor,hidden:!editing&&!drafts},drafts?null:saved.current?h('details',{className:'vq-said'},h('summary',null,t('你說的話（點開看）')),field(drafts||saved.current?t('你說的話'):t('紀錄文字（可編輯）'),h('textarea',{'data-testid':'voice-raw-text',value:raw,maxLength:4000,disabled,readOnly:!!drafts||saved.current,placeholder:t('例如：小白今天精神很好。'),onChange:e=>{setRaw(e.target.value);setExample(null);setCorrect(false);dirty();}}))):field(drafts||saved.current?t('你說的話'):t('紀錄文字（可編輯）'),h('textarea',{'data-testid':'voice-raw-text',value:raw,maxLength:4000,disabled,readOnly:!!drafts||saved.current,placeholder:t('例如：小白今天精神很好。'),onChange:e=>{setRaw(e.target.value);setExample(null);setCorrect(false);dirty();}}))),
   example&&!drafts&&h('section',{className:'vq-correction'},h('strong',null,t('修字建議示範')),h('p',null,t('「精申」→「精神」。只是內建例句的候選字，不會自動套用。')),h('label',{className:'cj-consent'},h('input',{type:'checkbox',checked:correct,disabled,onChange:e=>{setCorrect(e.target.checked);dirty();}}),t('接受這個修字建議（原文仍保留）'))),
   english&&saveOptions,
   !demo&&hasText&&!saved.current&&h('section',{className:'vq-ai-options','aria-label':t('AI 整理方式')},
    english&&h('h3',null,t('用 AI 整理')),
    h('div',{className:'vq-modes',style:{gridTemplateColumns:english?'1fr':'repeat(2,minmax(0,1fr))'},role:'group','aria-label':t('選擇 AI')},
     button(nativeCloud?t('進階模式'):t('進階模式（此版本未開放）'),()=>setAiMode('cloud'),{'aria-pressed':aiMode==='cloud','data-voice-ai':'cloud'}),
     !english&&button(t('手機模式'),()=>setAiMode('local'),{'aria-pressed':aiMode==='local','data-voice-ai':'local'})),
    english&&h('p',{className:'vq-muted','data-voice-english-note':true},t('英文可用進階模式整理；也可直接保存或自己選類別。')),
    aiMode==='cloud'?h('div',{className:'vq-direct'},
     h('p',{className:'vq-muted'},t('進階模式需連網、免下載整理模型，每次整理使用 1 次額度。確認並同意後才送出文字，不送錄音；錄音轉文字另需下載語音模型。')),
     cloudWait?h(R.Fragment,null,h('p',{role:'status'},cloudStatus||t('進階模式整理中…')),h('button',{type:'button',className:'secondary-btn',onClick:stopCloudWait},t('停止等待'))):
      nativeCloud?button(t('用進階模式整理'),askOnline,{className:'cj-primary','aria-haspopup':'dialog','data-voice-ai-organize':true}):h('p',{role:'status'},english?t('這個版本尚未支援進階模式；可以先直接儲存這段文字。'):t('這個版本尚未支援進階模式；可以改用手機模式，或先手動核對儲存。'))):
     h('div',{className:'vq-direct'},
      h('p',{className:'vq-muted'},t('手機模式需先下載模型，在這支手機整理文字，不用額度，文字不會送到 AI 伺服器；可用功能依裝置與模型支援提供。')),
      !gemmaHost?h('p',{role:'status'},t('此版本尚未支援手機模式整理。')):
       selectedModel?select(t('手機模式所需模型'),selectedModel.id,readyModels.map(model=>[model.id,model.title]),setModelChoice):
        h('div',null,
         h('p',{role:'status'},gemma?.unavailable?t('暫時無法確認模型狀態。'):!gemma?t('正在確認手機模式所需模型…'):gemma.downloading?t('模型下載中，文字會保留，可先儲存。'):downloadModel?t('下載後可離線整理 · {size}。也可先直接儲存。', {size: downloadModel.size}):t('這台手機目前沒有可下載的整理模型，可先直接儲存。')),
         gemma?.downloading&&Number.isFinite(modelDownload?.progress)&&h('progress',{max:1,value:modelDownload.progress,'aria-label':t('手機模式下載進度')}),
         downloadModel&&button(preparing?t('正在準備…'):modelDownload?.message?t('重試下載手機模式所需模型'):t('下載手機模式所需模型'),()=>setConfirmDl(true),{disabled:disabled||preparing||!!gemma?.downloading,hidden:confirmDl}),
         confirmDl&&downloadModel&&h(DownloadConfirm,{R,title:downloadModel.title,size:downloadModel.size,onConfirm:()=>{setConfirmDl(false);preparePhoneAI();},onCancel:()=>setConfirmDl(false)})),
      selectedModel&&button(busy?t('手機模式整理中…'):t('用手機模式整理'),organizeMeal,{className:'cj-primary',disabled:disabled||raw.trim().length>400}),
      raw.trim().length>400&&h('p',{className:'vq-muted'},t('手機模式一次可整理 400 字，請先縮短文字。')))),
   !english&&saveOptions,
   !drafts&&!saved.current&&h('details',{className:'vq-experiments'},
    h('summary',null,t('更多選項')),
    systemOffer&&systemOffer.localAvailable&&!demo&&h('div',{className:'vq-system'},
     h('p',{className:'vq-muted'},(systemOffer.onDevice||systemOffer.offlineOnly)?t('系統離線語音依裝置與語言提供；也可改用內建語音或直接打字。'):t('實驗：改用手機系統的語音辨識。聲音可能被送到手機系統的語音服務（例如 Google），本 App 無法控制，和「錄音會留在這支手機」的說明不同。')),
     button(systemVoice?t('改回內建語音'):((systemOffer.onDevice||systemOffer.offlineOnly)?t('改用手機系統語音'):t('改用手機系統語音（實驗）')),()=>setSystemVoice(v=>!v),{'aria-pressed':systemVoice,disabled:disabled||asrActive})),
    // 英文：不載入中文固定例句；只列幾句英文說法當參考（不分卡、不經中文規則）。
    english?h('details',{className:'vq-source','data-voice-english-samples':true},h('summary',null,t('語音例句')),
     h('p',{className:'vq-muted'},t('可以這樣說（只是參考，不會載入或自動分類）：')),
     h('ul',null,ENGLISH_VOICE_SAMPLES.map(sample=>h('li',{key:sample},sample)))):
    example?button(t('產生核對草稿（示範）'),makeDrafts,{disabled:disabled||!raw.trim()}):
     button(t('只按句子拆開，自己選類別'),makeDrafts,{disabled:disabled||!raw.trim()}),
    !english&&h('details',{className:'vq-source'},h('summary',null,nativeCloud||!devToolsEnabled()?t('語音例句'):t('語音例句與模擬測試')),
     h('p',{className:'vq-muted'},nativeCloud||!devToolsEnabled()?t('固定例句只供體驗。'):t('固定例句只供體驗。進階模式整理僅模擬流程。')),
     h('div',{className:'vq-actions'},button(t('載入固定語音例句'),event=>raw?ask('example',event):loadExample()),!demo&&!nativeCloud&&devToolsEnabled()&&button(t('進階模式整理（模擬）'),event=>ask('cloud',event),{'aria-haspopup':'dialog',disabled:disabled||!hasText}),!nativeCloud&&devToolsEnabled()&&button(t('試試手機模式失敗'),()=>{setNotice(t('示範：手機模式無法處理。原始文字保留，可手動拆項或直接記文字；沒有送到 AI 伺服器。'));})),
     !demo&&!nativeCloud&&devToolsEnabled()&&select(t('進階模式模擬情境'),scenario,[['success',t('成功：產生待核對卡片')],['network',t('沒有網路')],['points',t('額度不足')],['failure',t('整理失敗')]],setScenario)),
    children),
   // 錄完只留：卡片清單＋一顆儲存。你說的話、返回修改、全部改成現在都收進「更多」。（Ian 2026-11-12：說完就存、存完可改）
   drafts&&h('section',null,h('div',{className:'vq-review-head'},h('h3',{'data-voice-review':true,tabIndex:-1},saved.current?t('已儲存 {n} 筆', {n: drafts.length}):t('分成 {n} 張，點卡片可以改', {n: drafts.length}))),h(R.Fragment,null,
    !saved.current&&drafts.some(row=>row.cloud)&&h('p',{className:'vq-muted'},t('部分由進階模式整理，請看一下。')),
    !saved.current&&!drafts.some(row=>row.cloud||row.localModel)&&h('p',{className:'vq-muted'},t('以下是尚未使用 AI 的分卡預覽，可自行核對後儲存。')),
    !saved.current&&aiMode==='cloud'&&cloudRows.length>0&&!cloudWait&&h('div',{className:'vq-cloud-offer'},
     h('p',{className:'vq-muted'},t('也可以只用進階模式整理這 {n} 句待確認文字。', {n: cloudRows.length})),button(t('用進階模式整理這 {n} 句', {n: cloudRows.length}),event=>ask('voice-cloud',event),{className:'vq-cloud-btn','aria-haspopup':'dialog','data-voice-cloud':true}))),
    drafts.map(rowView),
    !drafts.length&&h('p',null,t('卡片都刪掉了，沒有可儲存的內容。')),
    removed&&!saved.current&&button(t('復原剛刪除的卡片'),()=>{dirty();setDrafts(rows=>{const next=[...rows];next.splice(Math.min(removed.index,next.length),0,removed.draft);return next;});setRemoved(null);}),
    h('details',{className:'vq-said'},h('summary',null,t('更多')),
     h('p',{className:'vq-verbatim','data-testid':'voice-raw-text'},raw),
     !saved.current&&h('div',{className:'vq-actions'},
      button(t('返回修改文字'),event=>ask('raw',event),{className:'vq-link'}),
      // 規則很有把握卻分錯時也能用進階模式重整：整段送出（要先同意），只有原生進階模式橋接存在時才有。
      !demo&&nativeCloud&&!cloudWait&&button(t('用進階模式重新整理這段話'),event=>ask('voice-cloud-all',event),{className:'vq-link','aria-haspopup':'dialog','data-voice-cloud-all':true}),
      drafts.some(row=>!row.time&&!row.timeFuture)&&button(t('沒說時間的卡，改成現在（{date} {time}）', {date, time}),()=>{dirty();setDrafts(rows=>fillMissingVoiceTime(rows,clockFor(today)));},{className:'vq-link vq-bulk'}))),
    !saved.current&&h('div',{className:'vq-save-bar'},
     button(busy?t('儲存中…'):blocking>0?t('先確認 {blocking} 張，才能儲存', {blocking}):t('儲存（{n} 筆{v1}）', {n: drafts.length, v1: demo?t('示範'):''}),save,{className:'cj-primary','data-voice-save-all':true,disabled:disabled||!drafts.length||blocking>0}))),
   receipt&&h('div',{className:'vq-receipt'},button(busy?t('取消中…'):t('取消這批紀錄'),undo)),
   raw&&button(t('開始新的一筆'),event=>saved.current?clear():ask('new',event),{className:'vq-new'}),
   h('dialog',{ref:dialog,className:'m-action-dialog vq-return-dialog',role:'alertdialog','aria-label':replace==='cloud'?t('進階模式整理預覽'):cloudAsk?t('進階模式整理同意'):t('保留現有文字'),
    onCancel:event=>{event.preventDefault();event.stopPropagation();cancel();}},
    replace==='cloud'?h(R.Fragment,null,h('h2',null,t('進階模式整理（模擬）')),h('p',null,t('正式整理只會送出下方文字，錄音留在手機。這次是模擬，文字也會留在手機。')),h('pre',{className:'vq-cloud-preview','data-testid':'cloud-raw-preview'},raw),h('div',{className:'vq-actions'},button(t('取消，保留原文'),cancel,{ref:cancelButton}),button(t('確認開始模擬'),runCloud,{className:'cj-primary'}))):cloudAsk?h(R.Fragment,null,h('h2',null,replace==='voice-cloud-all'?t('用進階模式重新整理這段話'):t('用進階模式整理這幾句')),
     h('div',{className:'vq-actions'},button(t('同意並送出'),sendVoiceCloud,{className:'cj-primary',disabled:disabled||!cloudRequest||quota.empty,'data-voice-cloud-send':true}),button(t('取消，不送出'),cancel,{ref:cancelButton,className:'secondary-btn'})),
     h('p',null,t('送到：毛孩小本本的 AI 伺服器，')+quota.line+t('用途：幫下面這幾句分給毛孩、分類，並換成日期時間與數量。')),
     h('p',null,t('只送下面這段文字。不會送出錄音、照片、毛孩的真實編號與其他紀錄；毛孩名字會出現在下面（用 c1、c2 代號對應）。')),
     h('p',null,t('回來的只是草稿，要你核對後才會儲存；整理失敗時，原本的卡片不變。進階模式整理結果在你儲存或放棄時就刪除，沒處理的最多保存 7 天；處理地區與是否用於模型訓練仍待確認。')),
     cloudRequest?.overflow>0&&h('p',null,t('另有 {overflow} 句超過一次可送的上限，不會送出，維持原本的卡片。', {overflow: cloudRequest.overflow})),
     h('pre',{className:'vq-cloud-preview','data-testid':'voice-cloud-preview'},cloudRequest?.text||'')):replace&&h(R.Fragment,null,h('h2',null,replace==='raw'?t('返回修改原始文字？'):t('要開始新的輸入嗎？')),
     h('p',null,replace==='raw'?t('原始文字會保留，這次未儲存的拆項編輯會清除。'):receipt?t('已保存的紀錄會保留。開始新輸入後，請到紀錄頁管理先前的項目。'):t('現有未保存文字與拆項將被替換。')),
     h('div',{className:'vq-actions'},button(t('保留並繼續'),cancel,{ref:cancelButton,className:'secondary-btn'}),
      button(replace==='raw'?t('保留原文，重新拆項'):t('確認開始'),()=>{if(replace==='example')loadExample();else if(replace==='raw'){void releaseVoiceCloud();setDrafts(null);setRemoved(null);setReplace(null);dirty();focusText();}else clear();},{className:'primary'})))),
   quota.resultLine&&h('p',{className:'vq-notice',role:'status','data-voice-quota-result':true},quota.resultLine),
   notice&&(!saved.current||drafts)&&h('p',{className:'vq-notice',role:'status'},notice),error&&h('p',{className:'cj-error',role:'alert'},error),error&&blocker&&button(t('放棄 AI 伺服器上的{label}', {label: blocker.label}),discardBlocker,{className:'secondary-btn','data-voice-cloud-discard':true,disabled:disabled})));
}
