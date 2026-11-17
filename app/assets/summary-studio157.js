import {useCloudQuota} from './cloud-quota.js?v=quota-feedback1';
import {VetPreparation} from './vet-preparation-ui.js?v=1';
import {summaryScope,sourceKey,prepareSummary,saveSummary,summaryPlainText,downloadSummary,downloadSummaryHTML,savedSummarySources,savedSummariesForCat,summaryMissingObservations,sourceCountText} from './summary-studio157-model.js?v=photo-simplify1';
import {vetShift,VET_LIMITS} from './advanced-vet-model.js?v=photo-simplify1';
import {hasCareContent} from './summary-care-brief.js?v=photo-simplify1';
import {localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';
import {bulletizeSummary} from './summary-bullets.js?v=ai-names1';
import {getCompanyAIStatus,requestCompanyAI,careRequestId} from './company-ai-client.js?v=quota-feedback1';
import {GEMMA_MODELS,useGemmaModels} from './gemma-meal.js?v=r3';
import {savePending,loadPending,clearPending,pendingFresh,statusMatches} from './cloud-return.js?v=203';
import {PHONE_SUMMARY_MODE,CLOUD_SUMMARY_MODE,phoneSummaryScopeLabel,completeSummaryText,completeSummaryDays,summaryReadableSource,summaryCloudInput,phoneSummaryInput,applyPhoneSummary,applyCloudSummary,nativeSummaryText} from './summary-ai179.js?v=ai-names1';
import {t, K, tn, withLocaleMarker} from './i18n.js?v=audit1117b';

export function SummaryStudio157({react:R,root,catId,today=localCalendarDate(),...props}){
 const view=R.useSyncExternalStore(root.subscribe,root.get,root.get);
 return R.createElement(Studio,{...props,key:catId,react:R,root,catId,today,view});
}

function Studio({react:R,root,catId,today,onRecord,onSwitch,healthNotices,trends,proTools,view,draftRef,onDiscard,openLatest=false}){
 const h=R.createElement,saved=savedSummariesForCat(view.data,catId);
 const [readerId,setReaderId]=R.useState(()=>openLatest?saved[0]?.id:null);
 const [days,setDays]=R.useState(14),[excluded,setExcluded]=R.useState([]);
 const [custom,setCustom]=R.useState(false),[range,setRange]=R.useState({start:vetShift(today,-13),end:today});
 const [draft,setDraft]=R.useState(null),[cloudPreview,setCloudPreview]=R.useState(null);
 const [cloudStatus,setCloudStatus]=R.useState(null),[phoneOpen,setPhoneOpen]=R.useState(false);
 const [editText,setEditText]=R.useState(false);
 R.useEffect(()=>{setEditText(false);},[Boolean(draft)]);
 const [reviewed,setReviewed]=R.useState(false),[busy,setBusy]=R.useState(false);
 const [notice,setNotice]=R.useState(''),[error,setError]=R.useState('');
 const lock=R.useRef(false),heading=R.useRef(null),pendingCloud=R.useRef(null),requestIdentity=R.useRef(null),cloudHold=R.useRef(false);
 const gemmaHost=typeof window!=='undefined'?window.V161Gemma:null;
 const nativeCloud=typeof window!=='undefined'?window.V161Cloud:null;
 const cloudReady=Boolean(nativeCloud)||Boolean(cloudStatus?.ready);
 // The older company gateway has its own summary allowance. Read it afresh through
 // the same quota interface; never derive a successful request's balance locally.
 const legacyQuota=R.useRef({request:async()=>{
  const status=await getCompanyAIStatus(),remaining=status?.quota?.summary?.remaining;
  if(!status.ready||!Number.isInteger(remaining)||remaining<0)return null;
  const now=Date.now(),limit=status.plan==='pro'?100:5;
  return {quota:true,now,plan:status.plan==='pro'?'sub':'free',planUntil:now+60000,
   period:new Date(now+8*3600000).toISOString().slice(0,7),used:Math.max(0,limit-remaining),pack:Math.max(0,remaining-limit)};
 }});
 const quota=useCloudQuota(R,!!cloudPreview&&cloudReady,nativeCloud||legacyQuota.current);
 // 手機模式和進階模式並列（2026-11-16）：主畫面一打開就讀模型「狀態」（只讀 status，不下載、不推論），卡片才知道要顯示可用或需先下載。
 const phoneVisible=phoneOpen||(!readerId&&!draft&&!cloudPreview);
 const [gemma]=useGemmaModels(R,phoneVisible?gemmaHost:null,phoneVisible);
 const readyModels=GEMMA_MODELS.filter(model=>gemma?.models?.some(item=>item.id===model.id&&item.ready&&item.supported!==false));
 const [modelId,setModelId]=R.useState('');
 const phoneModel=readyModels.find(model=>model.id===modelId)||readyModels[0];
 const reader=saved.find(summary=>summary.id===readerId),start=custom?range.start:vetShift(today,1-days),end=custom?range.end:today;
 let scope,scopeError='';
 try{scope=summaryScope(view.data,{catId,start,end,today});}catch(error){scopeError=tn(error.message);}
 const selected=scope?.sources.filter(source=>!excluded.includes(sourceKey(source)))||[];
 const brief=scope?.careBrief||[],hasSelected=selected.length>0;
 const canPrepare=!scopeError&&(hasSelected||hasCareContent(brief))&&view.status==='saved';
 const preview=canPrepare?prepareSummary(view.data,{catId,start,end,today},selected.map(sourceKey)):null;
 const hasDraft=Boolean(draft);

 R.useEffect(()=>{
  if(nativeCloud||reader||hasDraft)return;
  const controller=new AbortController();
  getCompanyAIStatus({signal:controller.signal}).then(status=>{
   if(!controller.signal.aborted)setCloudStatus(status);
  }).catch(()=>{if(!controller.signal.aborted)setCloudStatus({ready:false});});
  return()=>controller.abort();
 },[reader?.id,hasDraft]);
 R.useEffect(()=>()=>pendingCloud.current?.abort(),[]);
 // Back on this page (or app start): bring back a cloud result that finished while the user was away.
 R.useEffect(()=>{
  if(!nativeCloud)return;
  let alive=true;
  const controller=new AbortController();
  (async()=>{
   const s=await nativeCloud.request('status');
   if(!alive)return;
   const record=loadPending('summary');
   const mine=statusMatches(record,s,'text')&&record.catId===catId&&record.preview;
   if(['play-design','voice-draft'].includes(s.mode)&&s.kind==='text'){
    if(s.state!=='idle')setNotice(t('陪玩或語音快記的進階模式整理還在處理或等你查看，先到那邊處理後再整理摘要。'));
   }else if(['queued','processing','submitting'].includes(s.state)){
    if(mine&&pendingFresh(record)){
     setReaderId(null);setCloudPreview(record.preview);
     pendingCloud.current=controller;
     await run(async()=>{try{await waitNativeCloud(record.preview,record.meetingId,controller);}finally{pendingCloud.current=null;}});
    }else setNotice(t('上一份進階模式整理還在處理，完成後會通知你；處理完成前無法再送出新的。'));
   }else if(s.state==='done'&&s.kind==='text'){
    if(mine){
     setReaderId(null);
     await run(()=>takeNativeResult(s,record.preview,t('已帶回進階模式整理結果，請核對後儲存。')));
    }else if(statusMatches(record,s,'text')){
     setNotice(t('有一份其他毛孩的進階模式整理結果在等你核對，請切換到該毛孩的看診摘要。'));
    }else{await nativeCloud.request('ack');clearPending('summary');}
   }else if(s.state==='failed'||s.state==='timeout'){
    if(s.kind==='text'){await nativeCloud.request('ack');clearPending('summary');setNotice(tn(s.message)||t('上一份進階模式整理未完成，原內容仍保留。'));await quota.settle({outcome:s.state==='timeout'?'pending':'failure',billing:s.billing||'unknown'});}
   }else if(s.state==='idle'&&record&&!pendingFresh(record))clearPending('summary');
  })().catch(()=>{});
  return()=>{alive=false;};
 },[]);
 R.useEffect(()=>{heading.current?.focus();},[hasDraft,reader?.id,Boolean(cloudPreview)]);
 R.useEffect(()=>{
  if(!hasDraft)return;
  if(draftRef)draftRef.current=true;
  const guard=event=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',guard);
  return()=>{if(draftRef)draftRef.current=false;window.removeEventListener('beforeunload',guard);};
 },[hasDraft,draftRef]);

 const run=async action=>{
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch(error){setError(tn(error.message)||t('整理未完成，已保留原始紀錄。'));}
  finally{lock.current=false;setBusy(false);}
 };
 const richLines=text=>bulletizeSummary(text).split('\n').map((line,i,all)=>h('span',{key:i,className:line&&!line.startsWith('• ')?'ss157-h':undefined},line+(i<all.length-1?'\n':'')));
 const button=(text,onClick,{disabled=false,secondary=false,...props}={})=>
  h('button',{type:'button',className:secondary?'ss157-secondary':'ss157-primary',onClick,disabled:disabled||busy,...props},text);
 // The user is done with a brought-back cloud draft (saved or discarded): delete the cloud copy.
 // A failure here never blocks the user; the native bridge retries later.
 const releaseCloud=()=>{
  if(!cloudHold.current)return;
  cloudHold.current=false;
  const record=loadPending('summary');
  if(!record||!nativeCloud)return;
  (async()=>{const state=await nativeCloud.request('status');
   if(state.kind==='text'&&!['voice-draft','play-design'].includes(state.mode)&&statusMatches(record,state,'text')&&['done','failed','timeout'].includes(state.state))await nativeCloud.request('ack');
   const current=loadPending('summary');if(current?.meetingId===record.meetingId)clearPending('summary');
  })().catch(()=>{});
 };
 const reset=()=>{releaseCloud();setDraft(null);setCloudPreview(null);setReviewed(false);setError('');setNotice('');quota.clearResult();};
 const changeDays=value=>{setCustom(false);setDays(value);setExcluded([]);reset();};
 const changeRange=(key,value)=>{setRange(current=>({...current,[key]:value}));setExcluded([]);reset();};
 const snapshot=()=>{
  const current=root.get();
  if(current.status!=='saved')throw Error(t('原紀錄尚未完成儲存，請先重試。'));
  return prepareSummary(current.data,{catId,start,end,today},selected.map(sourceKey));
 };
 const showDraft=value=>{setCloudPreview(null);setReviewed(false);setDraft(value);};
 const read=summary=>{reset();setReaderId(summary.id);};
 const edit=(key,value)=>{setDraft(current=>({...current,[key]:value}));setReviewed(false);};
 const makePhoneSummary=()=>run(async()=>{
  if(!phoneModel)return;
  const base=draft||snapshot();
  const result=await gemmaHost.request('summary',{model:phoneModel.id,text:phoneSummaryInput(base)});
  if(result.message)throw Error(result.message);
  showDraft(applyPhoneSummary(base,result.candidate));
 });
 const openCloudPreview=(base)=>run(()=>{
  if(cloudReady)setCloudPreview(base||snapshot());
 });
 const makeNativeCloudSummary=async()=>{
  const input=summaryCloudInput(cloudPreview);
  const rows=input.report.sourceFacts.map((fact,index)=>K(`來源 ${index+1}｜${fact.date||K('日期未知')} ${fact.time||''}｜${fact.text}`));
  const transcript=withLocaleMarker(K(`${input.text}\n毛孩：${cloudPreview.catName}\n期間：${String(cloudPreview.start||'').replaceAll('-','/')} 至 ${String(cloudPreview.end||'').replaceAll('-','/')}\n\n${rows.join('\n')}`));
  if(transcript.length>40000)throw Error(t('這段期間的紀錄太多，進階模式無法一次整理。請縮短期間或取消勾選部分紀錄後再試。'));
  const controller=new AbortController();
  pendingCloud.current=controller;
  let attempted=false;
  try{
   const before=await nativeCloud.request('status');
   if(['queued','processing','submitting'].includes(before.state))throw Error(t('上一份進階模式整理還在處理，請等完成通知後再試。'));
   if(before.state==='done'&&before.kind==='image')throw Error(before.mode==='med-bag'?t('還有一份藥袋的進階模式結果等你核對，請先到照護分頁按「藥袋解讀」（或「＋ 新增」→「記看診」）處理。'):t('還有一份食品照片的進階模式結果等你核對，請先到食品卡處理。'));
   if(before.kind==='text'&&['play-design','voice-draft'].includes(before.mode)&&before.state!=='idle')throw Error(t('陪玩或語音快記的進階模式整理還在處理或等你查看，請先到那邊處理。'));
   // 另一份看診摘要（例如別隻毛孩）還在等核對：直接 ack 會把那份結果丟掉，等於白用一次。
   if(before.state==='done'&&before.kind==='text')throw Error(t('還有一份看診摘要的進階模式結果等你核對（可能是另一隻毛孩），請先切換到那隻毛孩的看診摘要核對或放棄。'));
   if(before.state!=='idle')await nativeCloud.request('ack');
   const meetingId=careRequestId();
   attempted=true;
   const sent=await nativeCloud.request('submit',{meetingId,transcript,mode:'summary',lang:'zh-TW',prompt:input.text});
   if(sent.error)throw Object.assign(Error(sent.error),{billing:sent.billing||'unknown'});
   savePending('summary',{meetingId,cloudJobId:sent.jobId||'',submittedAt:Date.now(),catId:cloudPreview.catId,preview:cloudPreview});
   await waitNativeCloud(cloudPreview,meetingId,controller);
  }catch(error){
   if(!error.quotaHandled)await quota.settle({outcome:error.quotaOutcome||'failure',billing:error.billing||(attempted?'unknown':'not-charged')});
   error.quotaHandled=true;throw error;
  }finally{pendingCloud.current=null;}
 };
 // The finished result stays in the native bridge until the user saves or discards the draft.
 const takeNativeResult=async(state,preview,message='')=>{
  const billing=state.billing&&state.billing!=='unknown'?state.billing:'charged';
  cloudHold.current=true;
  let summary;
  try{summary=nativeSummaryText(bulletizeSummary(nativeSummaryText(state.summary)));}
  catch(error){await quota.settle({outcome:'failure',billing});throw Object.assign(error,{billing,quotaHandled:true});}
  showDraft({...preview,text:summary,question:preview.question||'',mode:CLOUD_SUMMARY_MODE});
  if(message)setNotice(message);
  await quota.settle({outcome:'success',billing});
 };
 const waitNativeCloud=async(preview,meetingId,controller)=>{
  for(;;){
   await new Promise(resolve=>setTimeout(resolve,2000));
   if(controller.signal.aborted){await quota.settle({outcome:'pending'});throw Object.assign(Error(t('已停止等待，進階模式可能仍在處理，原內容仍保留。')),{quotaHandled:true,quotaOutcome:'pending'});}
   const state=await nativeCloud.request('status');
   if(state.meetingId!==meetingId||state.state==='idle'){clearPending('summary');throw Error(t('進階模式整理已中止，原內容仍保留。'));}
   if(state.state==='done')return takeNativeResult(state,preview);
   if(state.state==='failed'||state.state==='timeout'){
    await nativeCloud.request('ack');clearPending('summary');
    await quota.settle({outcome:state.state==='timeout'?'pending':'failure',billing:state.billing||'unknown'});
    throw Object.assign(Error(tn(state.message)||t('進階模式整理未完成，原內容仍保留。')),{quotaHandled:true,billing:state.billing||'unknown'});
   }
  }
 };
 const stopWaiting=()=>{pendingCloud.current?.abort();clearPending('summary');nativeCloud?.request('cancel').catch(()=>{});};
 const makeCloudSummary=()=>run(async()=>{
  if(!cloudReady||!cloudPreview)return;
  quota.clearResult();
  if(nativeCloud){
   try{return await makeNativeCloudSummary();}
   catch(error){if(!error.quotaHandled)await quota.settle({outcome:'not-sent'});throw error;}
  }
  const input=summaryCloudInput(cloudPreview);
  const key=JSON.stringify(input);
  if(requestIdentity.current?.key!==key)requestIdentity.current={key,id:careRequestId()};
  const controller=new AbortController();
  pendingCloud.current=controller;
  let completed=false;
  try{
   const result=await requestCompanyAI({...input,consent:true,requestId:requestIdentity.current.id},{signal:controller.signal});
   completed=true;
   if(controller.signal.aborted){await quota.settle({outcome:'success',billing:result.billing||'charged'});return;}
   const candidate=applyCloudSummary(cloudPreview,result);
   requestIdentity.current=null;
   showDraft({...candidate,text:bulletizeSummary(candidate.text)});
   await quota.settle({outcome:'success',billing:result.billing||'charged'});
  }catch(error){
   await quota.settle({outcome:error.quotaOutcome||'failure',billing:error.billing||(completed?'charged':'unknown')});throw error;
  }finally{pendingCloud.current=null;}
 });
 const save=()=>run(async()=>{
  if(root.get().status!=='saved')throw Error(t('仍有未儲存的資料，請先重試本機儲存。'));
  const id=crypto.randomUUID();
  await root.atomic(data=>saveSummary(data,draft,{reviewed,id,today}));
  reset();setReaderId(id);setNotice(t('已儲存在這支手機。'));
 });

 const sources=(rows,full=false,review=false)=>h('ol',{className:'ss157-sources'+(review?' ss157-review-list':''),tabIndex:review?0:undefined,'aria-label':review?t('這份摘要選取的原始紀錄'):undefined},rows.map((source,index)=>h('li',{key:sourceKey(source)},
  h('strong',null,`${t('來源')} ${review&&draft?draft.sources.findIndex(item=>sourceKey(item)===sourceKey(source))+1:index+1}${source.date?' · '+source.date:''}${source.time?' '+source.time:''}`),h('p',null,summaryReadableSource(source)),
  full&&source.raw&&h('details',null,h('summary',null,t('查看原始欄位')),h('pre',null,source.raw)))));
 const packageTools=h(R.Fragment,null,h(VetPreparation,{key:catId,react:R,root,catId,name:scope?.catName||t('毛孩')}),proTools&&h('details',{className:'ss158-pro'},
  h('summary',null,h('span',{className:'ss158-pro-label'},h('strong',null,t('更多工具')),
   h('span',null,t('換糧前後對照、詳細紀錄與匯出')))),proTools));
 const history=saved.filter(summary=>summary.id!==reader?.id);
 const historyList=history.length>0&&h('details',{className:'ss157-history'},
  h('summary',null,t('已儲存摘要 · {count}', {count: history.length})),
  h('div',{className:'ss157-actions'},history.map(summary=>
   button(t('{start} 至 {end}', {start: String(summary.start||'').replaceAll('-','/'), end: String(summary.end||'').replaceAll('-','/')}),()=>read(summary),{key:summary.id,secondary:true}))));
 // 看診與照護（最近看診、目前用藥、接下來的照護）：固定放在摘要最前面。
 const briefBlock=lines=>Array.isArray(lines)&&lines.length>0&&h('div',{className:'ss157-care-brief'},h('h3',null,t('看診與照護')),h('ul',null,lines.map((line,i)=>h('li',{key:i},line))));
 const quotaMessage=quota.resultLine&&h('p',{role:'status','data-ai-quota-result':true},quota.resultLine);
 const messages=h(R.Fragment,null,error&&h('p',{role:'alert',className:'ss157-error'},error),
  notice&&h('p',{role:'status'},notice));
 const completeSummary=(summary,rows)=>[PHONE_SUMMARY_MODE,CLOUD_SUMMARY_MODE].includes(summary.mode)&&
  h('details',null,h('summary',null,`${t('完整期間摘要 · {rows}', {rows: sourceCountText(rows)})}${summary.careBrief?.length?t(' · 已納入看診與照護'):''}`),h('div',{className:'ss159-days'},completeSummaryDays(rows).map(day=>h('details',{key:day.date,className:'ss159-day'},h('summary',null,h('strong',null,day.label),h('span',null,day.summary)),h('ol',null,day.items.map((item,index)=>h('li',{key:index},h('time',null,item.time),h('span',null,item.text))))))));
 if(reader){
  const missing=summaryMissingObservations(reader),exportData={...reader,catName:reader.catName||scope?.catName};
  return h('section',{className:'ss157 ss158','aria-label':t('已儲存看診摘要')},
   h('h2',{ref:heading,tabIndex:-1},reader.catName||scope?.catName||t('已儲存摘要')),
   quotaMessage,
   h('p',{className:'ss158-range'},`${t('{start} 至 {end} · {reader}', {start: String(reader.start||'').replaceAll('-','/'), end: String(reader.end||'').replaceAll('-','/'), reader: sourceCountText(savedSummarySources(reader))})}${reader.careBrief?.length?t(' · 已納入看診與照護'):''}`),
   h('div',{className:'ss157-actions'},button(t('整理新的摘要'),()=>{reset();setReaderId(null);},{secondary:true})),
   briefBlock(reader.careBrief),
   h('h3',null,t('想問獸醫')),h('p',null,reader.question||t('未填寫')),
   missing?.length>0&&h('p',null,h('strong',null,t('未記錄或未知：')),missing.join(t('、'))),
   missing?.length>0&&h('small',null,t('未記錄不代表正常或沒有發生。')),
   h('h3',null,reader.mode===PHONE_SUMMARY_MODE?t('手機模式近期重點'):t('這段期間的摘要')),
   reader.mode===PHONE_SUMMARY_MODE&&h('p',null,phoneSummaryScopeLabel(savedSummarySources(reader))),h('pre',null,reader.mode===CLOUD_SUMMARY_MODE?bulletizeSummary(reader.text).split('\n').map((line,i,all)=>h('span',{key:i,className:line&&!line.startsWith('• ')?'ss157-h':undefined},line+(i<all.length-1?'\n':''))):reader.text),
   Array.isArray(reader.sourceSnapshots)&&completeSummary(reader,savedSummarySources(reader)),
   h('details',null,h('summary',null,t('查看儲存時的來源')),sources(savedSummarySources(reader),true)),
   h('div',{className:'ss157-actions'},
    button(t('下載列印版 HTML'),()=>run(()=>{downloadSummaryHTML(exportData);setNotice(t('已準備列印版，可列印或另存 PDF。'));})),
    button(t('複製完整摘要'),()=>run(async()=>{
     if(!navigator.clipboard?.writeText)throw Error(t('此裝置目前無法直接複製，請改用匯出。'));
     await navigator.clipboard.writeText(summaryPlainText(exportData));setNotice(t('已複製摘要與來源。'));
    }),{secondary:true}),
    button(t('匯出文字檔'),()=>run(()=>{downloadSummary(exportData);setNotice(t('已準備文字檔。'));}),{secondary:true})),
   messages,historyList,packageTools);
 }
 if(cloudPreview){
  return h('section',{className:'ss157 ss158','aria-label':t('確認進階模式整理範圍')},
   h('h2',{ref:heading,tabIndex:-1},t('確認這次要整理的資料')),
   quotaMessage,
   h('p',{className:'ss158-range'},t('{catName} · {start} 至 {end}', {catName: cloudPreview.catName, start: String(cloudPreview.start||'').replaceAll('-','/'), end: String(cloudPreview.end||'').replaceAll('-','/')})),
    h('p',null,t('確認後會送出這隻毛孩本次選取的 {count} 筆原始紀錄、下列看診與照護重點、你填的問題及毛孩名字到毛孩小本本的 AI 伺服器，由進階模式整理，{line}照片與錄音留在手機；整理結果在你儲存或放棄時就刪除，沒處理的最多保存 7 天。', {count: cloudPreview.sources.length, line: quota.line})),
   h('div',{className:'ss157-actions'},
    button(busy?t('整理中…'):t('同意並開始整理'),makeCloudSummary,{disabled:!cloudReady||quota.empty,className:'ss157-cloud'}),
    nativeCloud&&busy?h('button',{type:'button',className:'ss157-secondary',onClick:stopWaiting},t('停止等待'))
     :button(t('返回'),()=>{setCloudPreview(null);setError('');},{secondary:true})),
   nativeCloud&&busy&&h('p',{role:'status'},t('進階模式處理最久約 8 分鐘；可以先離開，完成或失敗會發通知。')),
   // 看診與照護放在來源清單前面：清單是框內捲動，放後面時來源多就被擠到最下面（2026-11-16 A33 曾疊在一起）。
   briefBlock(cloudPreview.careBrief),
   h('details',{open:true,className:'ss157-consent-list'},h('summary',null,t('查看本次會送出的文字 · {count} 筆', {count: cloudPreview.sources.length})),sources(cloudPreview.sources)),
   cloudPreview.question&&h('p',null,t('你想問獸醫：')+cloudPreview.question),
   messages);
 }
 if(draft){
  const mode=draft.mode===PHONE_SUMMARY_MODE?t('手機模式整理'):draft.mode===CLOUD_SUMMARY_MODE?t('進階模式已整理重點'):t('依紀錄整理');
  return h('section',{className:'ss157 ss158','aria-label':t('核對看診摘要')},
   h('h2',{ref:heading,tabIndex:-1},t('核對看診摘要')),
   quotaMessage,
   h('p',{className:'ss158-range'},t('{catName} · {start} 至 {end} · {mode}', {catName: draft.catName, start: String(draft.start||'').replaceAll('-','/'), end: String(draft.end||'').replaceAll('-','/'), mode})),
   h('p',{role:'status'},`${draft.sources.length?t('已選 {sources}', {sources: sourceCountText(draft.sources)}):t('沒有選日常紀錄，只整理看診與照護')} · ${reviewed?t('已核對'):t('尚待你核對')}${t('。先閱讀摘要，再展開日期核對原始紀錄。')}`),
   draft.mode===PHONE_SUMMARY_MODE&&h('p',null,phoneSummaryScopeLabel(draft.sources)),
   briefBlock(draft.careBrief),
   draft.mode===CLOUD_SUMMARY_MODE&&!editText?h('div',{className:'ss157-rich'},h('strong',{className:'ss157-rich-label'},t('進階模式整理結果')),h('pre',{className:'ss157-rich-text'},richLines(draft.text)),button(t('修改文字'),()=>setEditText(true),{secondary:true})):
   h(R.Fragment,null,
    h('label',null,t('看診重點'),h('textarea',{rows:6,ref:el=>{if(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px';}},style:{overflow:'hidden',resize:'none'},value:draft.text,maxLength:50000,disabled:busy,onChange:event=>edit('text',event.target.value)})),
    draft.mode===CLOUD_SUMMARY_MODE&&button(t('完成修改'),()=>setEditText(false),{secondary:true})),
   cloudReady&&draft.mode!==CLOUD_SUMMARY_MODE&&h('div',{className:'ss179-actions'},button(t('進階模式幫我整理重點'),()=>openCloudPreview(draft),{className:'ss157-cloud'}),h('small',null,t('把零散紀錄整理成看診重點，串起近期變化，列出可以問獸醫的問題。使用 1 次進階模式額度。'))),
   completeSummary(draft,draft.sources),
   h('label',null,t('想問獸醫（選填）'),h('textarea',{rows:3,value:draft.question,maxLength:2000,disabled:busy,placeholder:t('例如：還需要補記哪些資訊？'),onChange:event=>edit('question',event.target.value)})),
   h('details',{className:'ss157-review', 'aria-label':t('核對原始紀錄')},
    h('summary',null,t('核對原始紀錄 · {sources}', {sources: sourceCountText(draft.sources)})),
    [...new Set(draft.sources.map(source=>source.date||t('日期未知')))].map(date=>{
     const rows=draft.sources.filter(source=>(source.date||t('日期未知'))===date);
     return h('details',{key:date},h('summary',null,t('{date} · {count} 筆', {date, count: rows.length})),sources(rows,true,true));
    })),
   h('label',{className:'ss157-check'},h('input',{type:'checkbox',checked:reviewed,disabled:busy,onChange:event=>setReviewed(event.target.checked)}),
    h('span',null,t('我已核對摘要與來源'))),
   h('div',{className:'ss157-actions'},
    // 2026-11-16 精簡：核對頁只留儲存與返回；複製、列印版在儲存後的摘要頁。
    button(busy?t('儲存中…'):t('儲存摘要'),save,{disabled:!reviewed||!draft.text.trim()||view.status!=='saved'}),
    button(t('返回選擇期間'),()=>onDiscard?onDiscard(reset):reset(),{secondary:true})),
   h('p',{className:'ss200-after-save'},t('儲存後可以複製、下載列印版或匯出文字檔。')),
   messages);
 }
 // 2026-11-16（Ian：「看診摘要好複雜」「手機模式也要並列讓使用者選」）：
 // 主畫面只留 期間 → 怎麼整理（進階／手機並列，另有不用 AI 直接存）→ 這段期間的紀錄 → 更多；緊急就醫提醒一定在外面。
 // 功能沒有刪：回診準備清單、換糧對照與匯出、趨勢圖、已儲存摘要、資料限制都收進「更多」。
 const phoneState=!gemmaHost?'unsupported':phoneModel?'ready':gemma?.unavailable?'unknown':gemma?'missing':'checking';
 const phoneNote={ready:t('不用額度，在手機處理'),missing:t('需先下載模型（約 2.6 GB）'),unsupported:t('這個裝置暫不支援'),unknown:t('暫時讀不到模型狀態'),checking:t('正在確認模型…')}[phoneState];
 const modeCard=(kind,title,what,note,action)=>h('div',{className:'ss200-mode','data-mode':kind},h('strong',null,title),h('p',null,what),h('small',null,note),action);
 return h('section',{className:'ss157 ss158 ss200','aria-label':t('看診摘要工作區')},
  h('div',{className:'ss200-title'},h('h2',{ref:heading,tabIndex:-1},t('{name}的看診摘要',{name:scope?.catName||t('目前毛孩')})),
   onSwitch&&button(t('切換毛孩'),onSwitch,{secondary:true,className:'ss200-switch'})),
  quotaMessage,
  h('div',{className:'ss158-period ss200-period',role:'group','aria-label':t('摘要期間')},
   h('div',{className:'ss158-presets ss179-presets'},[7,14].map(value=>
    button(t('近 {value} 天', {value}),()=>changeDays(value),{secondary:true,'aria-pressed':!custom&&value===days,key:value})),
    button(t('自選日期'),()=>{setCustom(true);setExcluded([]);reset();},{secondary:true,'aria-pressed':custom})),
   custom&&h('div',{className:'av-dates'},[[t('開始日期'),'start'],[t('結束日期'),'end']].map(([label,key])=>h('label',{key},label,h('input',{type:'date',value:range[key],max:today,disabled:busy,'aria-label':t('摘要')+label,onChange:event=>changeRange(key,event.target.value)})))),
   h('p',{className:'ss158-range'},t('{start} 至 {end}', {start: String(start||'').replaceAll('-','/'), end: String(end||'').replaceAll('-','/')}),scope?.sources.length>0&&` · ${t('已選 {selected}',{selected:sourceCountText(selected)})}`)),
  scopeError?h('p',{role:'alert'},scopeError):!scope?.sources.length&&!brief.length?
   h('div',{className:'ss157-empty'},h('h3',null,t('這段期間還沒有紀錄')),onRecord&&button(t('先記下一筆'),onRecord)):
   h(R.Fragment,null,
    h('section',{className:'ss200-modes','aria-labelledby':'ss200-modes-title'},
     h('h3',{id:'ss200-modes-title'},t('怎麼整理？')),
     h('div',{className:'ss200-mode-grid'},
      modeCard('cloud',t('進階模式'),t('完整重點與可以問獸醫的問題'),cloudReady?t('需連網，用 1 次額度'):t('目前無法使用'),
       button(t('用進階模式整理'),()=>openCloudPreview(),{className:'ss157-cloud',disabled:!canPrepare||!cloudReady})),
      modeCard('phone',t('手機模式'),t('挑出 3 個重點'),phoneNote,
       h(R.Fragment,null,
        phoneState==='ready'&&readyModels.length>1&&h('label',{className:'ss200-model'},t('手機模式所需模型'),h('select',{value:phoneModel.id,disabled:busy,onChange:event=>setModelId(event.target.value)},
         readyModels.map(model=>h('option',{key:model.id,value:model.id},model.title)))),
        phoneState==='ready'?button(busy?t('處理中…'):t('用手機模式整理'),makePhoneSummary,{secondary:true,disabled:!canPrepare||!hasSelected}):
        phoneState==='missing'&&h('p',{className:'ss200-mode-hint'},t('到「設定」→「AI 與下載」下載後就能用'))))),
     h('button',{type:'button',className:'ss200-direct',disabled:!canPrepare||busy,onClick:()=>run(()=>showDraft(snapshot()))},t('不用 AI，直接存這份紀錄 ›'))),
    h('details',{className:'ss200-records'},h('summary',null,t('看這段期間的紀錄 · {selected}', {selected: sourceCountText(selected)})),
     briefBlock(brief),preview&&h('pre',null,preview.text),
     scope.sources.length>0&&h(R.Fragment,null,h('p',{className:'ss200-records-hint'},t('取消勾選的紀錄不會放進摘要。')),
      h('div',{className:'ss157-picks'},scope.sources.map(source=>h('label',{key:sourceKey(source)},
       h('input',{type:'checkbox',checked:!excluded.includes(sourceKey(source)),disabled:busy,
        onChange:event=>setExcluded(values=>event.target.checked?values.filter(key=>key!==sourceKey(source)):[...values,sourceKey(source)])}),
       h('span',null,h('strong',null,`${source.date} ${source.time}`),h('span',null,summaryReadableSource(source))))))))),
  view.status!=='saved'&&h('p',{role:'alert'},t('原始紀錄尚未完成本機儲存。')),
  messages,healthNotices,
  h('p',{className:'ss158-safety ss157-urgent',role:'note'},t('呼吸困難、昏倒或無法排尿，請立即聯絡獸醫，不要等摘要。')),
  h('details',{className:'ss200-more'},h('summary',null,h('strong',null,t('更多')),h('span',null,t('回診準備清單、換糧對照與匯出、趨勢圖、已儲存摘要'))),
   historyList,packageTools,
   trends&&h('details',{className:'ss158-trends'},h('summary',null,t('查看趨勢圖與計算方式')),h('p',null,t('圖表另有觀察期間：體重近 3 個月，便便與餵食近 7 天，喝水量、尿團數與皮下輸液每日加總可切近 7／30 天；不隨上方摘要期間改變。各圖均標明日期與計算方式。')),trends),
   h('details',{className:'ss157-safety'},h('summary',null,t('資料範圍與計算限制')),
    h('p',null,VET_LIMITS),h('p',null,t('未記錄不代表沒有發生。摘要供看診時核對，原始紀錄可隨時查看。')))));
}
