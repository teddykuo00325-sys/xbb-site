// Cloud care client (food label scan, lab report reading).
// Firebase sign-in, App Check and Firestore live in native code; this file only talks to the
// native `CloudCare` bridge. See docs/CLOUD-APP-FLOW-P1-P2.md.
//
//   CloudCare.status()                  -> JSON {signedIn, eligible:{food,report}, online}
//   CloudCare.signIn()                  -> starts native Google sign-in, then dispatches cloudcare:status
//   CloudCare.submit(kind, jpegBase64)  -> JSON {requestId}
//   CloudCare.cancel(requestId)
//   window event cloudcare:update  detail {requestId, status: queued|running|completed|failed, code?, payload?}
//
// Without the native bridge the cloud entry stays hidden. A local mock exists so the screens can be
// built and checked before the backend exists; it only runs when explicitly switched on
// (localStorage xbb.cloudMock=1 or ?cloudmock=1) and its results are always labelled as samples.

import {t, K, isEnglish} from './i18n.js?v=audit1117b';
export const KINDS = Object.freeze({food:'food', report:'report'});
export const MAX_EDGE = 2048;
export const MAX_JPEG_BYTES = 660000;

const STATUS_MESSAGES = Object.freeze({
 unreadable: {title:t('這張照片沒有讀到可用的資料'), body:t('請拍清楚、避開反光後重拍，或改用手動核對。'), retry:true},
 unavailable: {title:t('進階模式暫時無法使用'), body:t('稍後再試，或先手動核對。照片沒有留在 AI 伺服器。'), retry:true},
 expired: {title:t('等待太久，已取消'), body:t('這次沒有結果。可以重新送出，或改用手動核對。'), retry:true},
 offline: {title:t('目前沒有網路'), body:t('連上網路後再試，或先手動核對。'), retry:true},
 denied: {title:t('目前無法使用進階模式功能'), body:t('這個進階模式功能還沒開放。可先手動核對，本機功能不受影響。'), retry:false},
 too_large: {title:t('照片太大，無法送出'), body:t('請重拍或換一張清楚但較小的照片。'), retry:false},
 cancelled: {title:t('已取消'), body:t('沒有送出任何資料。'), retry:true},
 signed_out: {title:t('進階模式還沒準備好'), body:t('請稍後再試，或先手動核對。照片沒有送出。'), retry:true},
 busy: {title:t('進階模式還有一份結果沒處理'), body:t('請先到看診摘要、陪玩或語音頁核對或放棄那份結果，再送這張照片。照片沒有送出。'), retry:true}
});
export function failureMessage(code){return STATUS_MESSAGES[code]||STATUS_MESSAGES.unavailable;}

export class CloudError extends Error{constructor(code,billing='unknown'){super(code);this.name='CloudError';this.code=code;this.billing=billing;}}

export const CONSENT = Object.freeze({
 food:{
  title:t('送出這張照片辨識？'),
  sends:t('只送出你剛才選的這一張包裝照片。'),
  to:t('毛孩小本本的 AI 伺服器。'),
  use:t('讀出名稱、淨重與營養標示，並估算乾物質成分，供你核對。結果只是候選，確認後才會存進食品卡。'),
  keep:t('照片在 AI 伺服器開始處理時就移除；辨識結果在你帶入或放棄時就刪除，沒處理的最多保存 7 天。你的其他紀錄不會被送出。'),
  cost:t('會用 1 次額度。'),
  reminder:'',
  accept:t('同意並送出這張照片'),
  decline:t('不送出，改手動核對')
 },
 report:{
  title:t('送出這張報告照片？'),
  sends:t('只送出你剛才選的這一張報告照片。'),
  to:t('毛孩小本本的 AI 伺服器。'),
  use:t('抄錄檢驗項目、數值、單位與報告上的參考範圍，並標出高於或低於範圍的項目。這是整理，不是診斷。'),
  keep:t('照片在 AI 伺服器開始處理時就移除；辨識結果在你帶入或放棄時就刪除，沒處理的最多保存 7 天。你的其他紀錄不會被送出。'),
  cost:t('會用 1 次額度。'),
  reminder:t('報告可能印有毛孩或飼主姓名與院所。送出前可以先遮住不需要的部分。'),
  accept:t('同意並送出這張照片'),
  decline:t('不送出')
 }
});

const win=()=>globalThis;
const nativeBridge=w=>{const b=w?.CloudCare;return b&&typeof b.submit==='function'&&typeof b.status==='function'?b:null;};
const storageGet=(w,key)=>{try{return w.localStorage?.getItem(key);}catch{return null;}};
export function mockEnabled(w=win()){
 try{if(new URL(w.location?.href||'http://x/').searchParams.get('cloudmock')==='1')return true;}catch{}
 return storageGet(w,'xbb.cloudMock')==='1';
}
export function mockScenario(w=win()){return storageGet(w,'xbb.cloudMockScenario')||'success';}
// 'native' | 'mock' | 'off'
export function cloudMode(w=win()){return nativeBridge(w)?'native':mockEnabled(w)?'mock':'off';}

const parse=value=>{if(value&&typeof value==='object')return value;try{return JSON.parse(String(value));}catch{return null;}};

export async function cloudStatus(kind,w=win()){
 const mode=cloudMode(w);
 if(mode==='off')return {mode,ok:false,reason:'off'};
 if(mode==='mock'){
  const scenario=mockScenario(w);
  if(scenario==='signedout')return {mode,ok:false,reason:'signed_out'};
  if(scenario==='denied')return {mode,ok:false,reason:'denied'};
  if(scenario==='offline')return {mode,ok:false,reason:'offline'};
  return {mode,ok:true,reason:''};
 }
 const s=parse(nativeBridge(w).status())||{};
 if(s.online===false)return {mode,ok:false,reason:'offline'};
 if(!s.signedIn)return {mode,ok:false,reason:'signed_out'};
 if(!s.eligible?.[kind])return {mode,ok:false,reason:'denied'};
 return {mode,ok:true,reason:''};
}
export const STATUS_REASONS=Object.freeze({
 signed_out:{title:t('進階模式還沒準備好'),body:t('請稍後再試，或先手動核對，本機功能不受影響。'),action:'signIn'},
 denied:{title:t('這個進階模式功能還沒開放'),body:t('可以先手動核對，本機功能不受影響。')},
 offline:{title:t('目前沒有網路'),body:t('連上網路後再試，或先手動核對。')}
});
export function startSignIn(w=win()){
 const bridge=nativeBridge(w);
 if(bridge&&typeof bridge.signIn==='function'){bridge.signIn();return true;}
 return false;
}

// Rotate to upright, shrink to MAX_EDGE, strip metadata by re-encoding, and fit MAX_JPEG_BYTES.
export async function prepareJpeg(file,{maxEdge=MAX_EDGE,maxBytes=MAX_JPEG_BYTES,w=win()}={}){
 if(!file||!file.size)throw new CloudError('too_large');
 const bitmap=await w.createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>{throw new CloudError('unreadable');});
 let scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
 for(const quality of [0.9,0.8,0.7,0.6,0.5]){
  const canvas=w.document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(blob&&blob.size<=maxBytes){
   const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
   for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
   bitmap.close?.();
   return {base64:w.btoa(binary),bytes:blob.size,width:canvas.width,height:canvas.height};
  }
  scale*=0.85;
 }
 bitmap.close?.();
 throw new CloudError('too_large');
}

// Resolves with the completed payload. Rejects with CloudError(code). `onUpdate(status)` sees queued/running.
export function submitCloudJob(kind,jpegBase64,{onUpdate=()=>{},onBilling=()=>{},signal,w=win(),mockDelay=1200}={}){
 if(!Object.values(KINDS).includes(kind))return Promise.reject(new CloudError('unavailable'));
 const mode=cloudMode(w);
 if(mode==='off')return Promise.reject(new CloudError('denied'));
 return mode==='mock'?mockJob(kind,{onUpdate,signal,w,mockDelay}):nativeJob(kind,jpegBase64,{onUpdate,onBilling,signal,w});
}

function nativeJob(kind,jpegBase64,{onUpdate,onBilling,signal,w}){
 return new Promise((resolve,reject)=>{
  const bridge=nativeBridge(w);
  let id=null,done=false;
  const finish=fn=>value=>{if(done)return;done=true;w.removeEventListener('cloudcare:update',listener);signal?.removeEventListener('abort',abort);fn(value);};
  let billing='unknown';
  const receiveBilling=value=>{billing=value||'unknown';onBilling(billing);};
  const ok=finish(resolve),fail=finish(code=>reject(new CloudError(code,billing)));
  const listener=event=>{
   const d=event.detail||{};
   if(!id||d.requestId!==id)return;
   receiveBilling(d.billing);
   if(d.status==='completed')ok(d.payload);
   else if(d.status==='failed')fail(String(d.code||'unavailable'));
   else onUpdate(d.status);
  };
  // abort(DETACH_REASON) only stops listening (the user left the page); any other abort cancels the cloud job.
  const abort=()=>{if(id&&signal?.reason!==DETACH_REASON)bridge.cancel(id);fail('cancelled');};
  w.addEventListener('cloudcare:update',listener);
  signal?.addEventListener('abort',abort,{once:true});
  // 英文介面多傳 {lang:'en'}，原生橋接放進 job.lang，worker 回英文說明（2026-11-14）；繁中呼叫方式不變，舊橋接會忽略第三個參數。
  try{id=parse(isEnglish()?bridge.submit(kind,jpegBase64,{lang:'en'}):bridge.submit(kind,jpegBase64))?.requestId;}catch{id=null;}
  if(!id)fail('unavailable');else if(signal?.aborted)abort();
 });
}

export const DETACH_REASON='detach';

// After the page was left or the app restarted: bring back (or re-attach to) the last cloud job.
// Resolves {payload} for a finished result, null when there is nothing to bring back, and rejects with
// CloudError for a job that ended without a usable result. `onUpdate('resumed'|'running')` fires while it is still running.
export async function resumeCloudJob(kind,{onUpdate=()=>{},onBilling=()=>{},signal,w=win()}={}){
 const bridge=nativeBridge(w);
 if(kind!==KINDS.food||!bridge||typeof bridge.resume!=='function')return null;
 let first;
 try{first=parse(await bridge.resume());}catch{return null;}
 if(!first?.requestId)return null;
 onBilling(first.billing||'unknown');
 if(first.status==='completed')return {payload:first.payload};
 if(first.status==='failed')throw new CloudError(String(first.code||'unavailable'),first.billing);
 return new Promise((resolve,reject)=>{
  const id=first.requestId;let done=false;
  const finish=fn=>value=>{if(done)return;done=true;w.removeEventListener('cloudcare:update',listener);signal?.removeEventListener('abort',abort);fn(value);};
  let billing=first.billing||'unknown';
  const ok=finish(payload=>resolve({payload})),fail=finish(code=>reject(new CloudError(code,billing)));
  const listener=event=>{
   const d=event.detail||{};
   if(d.requestId!==id)return;
   billing=d.billing||'unknown';onBilling(billing);
   if(d.status==='completed')ok(d.payload);
   else if(d.status==='failed')fail(String(d.code||'unavailable'));
   else onUpdate(d.status);
  };
  const abort=()=>{if(signal?.reason!==DETACH_REASON)bridge.cancel(id);fail('cancelled');};
  w.addEventListener('cloudcare:update',listener);
  signal?.addEventListener('abort',abort,{once:true});
  onUpdate('resumed');
  if(signal?.aborted)abort();
 });
}

function mockJob(kind,{onUpdate,signal,w,mockDelay}){
 return new Promise((resolve,reject)=>{
  const scenario=mockScenario(w);
  const timers=[];let done=false;
  const end=fn=>value=>{if(done)return;done=true;timers.forEach(clearTimeout);signal?.removeEventListener('abort',abort);fn(value);};
  const ok=end(resolve),fail=end(code=>reject(new CloudError(code)));
  const abort=()=>fail('cancelled');
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)return abort();
  const wait=scenario==='slow'?mockDelay*8:mockDelay;
  onUpdate('queued');
  timers.push(setTimeout(()=>onUpdate('running'),Math.round(wait*0.3)));
  timers.push(setTimeout(()=>{
   if(['unreadable','unavailable','expired'].includes(scenario))return fail(scenario);
   ok(mockPayload(kind,scenario));
  },wait));
 });
}

// ---- Sample payloads (mock only). Fictional label and report; shapes match the backend schemas. ----
const f=(key,value,source,extra={})=>({key,value,source,...extra});
const nutrient=(name,value,bound,unit='%',basis=K('每 100 g'))=>f('nutrient:'+name,String(value),`${t(name)}${bound===K('最低值')||bound===K('最高值')?(isEnglish()?' ':'')+(bound===K('最低值')?t('最低'):t('最高')):''} ${value}${unit}`,{unit,basis,bound});
export function mockFoodPayload(scenario='success'){
 const protein=scenario==='below'?18:32;
 const fields=[
  f('name',t('示範雞肉配方'),t('示範雞肉配方')),f('brand',t('小本本示範'),t('小本本示範')),f('flavor',t('雞肉'),t('雞肉口味')),
  f('netWeight','1500',t('淨重 1.5 kg（虛構示範）'),{unit:'g'}),
  f('ingredients',t('雞肉、雞肝、糙米、魚油、維生素E'),t('原料：雞肉、雞肝、糙米、魚油、維生素E')),
  nutrient(K('蛋白質'),protein,K('最低值')),nutrient(K('脂肪'),12,K('最低值')),nutrient(K('纖維'),3,K('最高值')),nutrient(K('水分'),10,K('最高值')),
  nutrient(K('鈣'),1.2,K('標示值')),nutrient(K('磷'),0.9,K('標示值')),nutrient(K('熱量'),3800,K('標示值'),'kcal',K('每 kg'))
 ];
 const dm=v=>Math.round(v/0.9*100)/100;
 const nuts=[[K('蛋白質'),protein,K('最低值')],[K('脂肪'),12,K('最低值')],[K('纖維'),3,K('最高值')],[K('鈣'),1.2,K('標示值')],[K('磷'),0.9,K('標示值')]]
  .map(([key,v,bound])=>({key,bound,asFedPct:v,dryMatterPct:dm(v)}));
 const status=(profile,key,min)=>{const row=nuts.find(n=>n.key===key);return {key,minimumDryMatterPct:min,dryMatterPct:row.dryMatterPct,status:row.dryMatterPct<min?'below':'reached'};};
 return {status:'completed',schema:'food-ocr.v1',fields,analysis:{
  schema:'food-analysis.v1',moisturePct:10,nutrients:nuts,
  energy:{kcalPer100g:380,kcalPerKg:3800,bound:K('標示值')},calciumPhosphorusRatio:1.33,
  reference:[
   {profile:'adult',label:t('AAFCO 貓成貓維持期最低值（乾物質）'),items:[status('adult',K('蛋白質'),26),status('adult',K('脂肪'),9),status('adult',K('鈣'),0.6),status('adult',K('磷'),0.5)]},
   {profile:'growth',label:t('AAFCO 貓幼貓／懷孕哺乳期最低值（乾物質）'),items:[status('growth',K('蛋白質'),30),status('growth',K('脂肪'),9),status('growth',K('鈣'),1),status('growth',K('磷'),0.8)]}
  ],
  ingredients:[{text:t('雞肉'),category:K('肉類')},{text:t('雞肝'),category:K('內臟')},{text:t('糙米'),category:K('穀物')},{text:t('魚油'),category:K('油脂')},{text:t('維生素E'),category:K('維生素礦物')}],
  notes:[t('以包裝標示的保證值估算，不是實測，也不代表成品一定達到。')]
 }};
}
const row=(id,abbr,name,value,unit,low,high,printed,status,reason,raw,extra={})=>({id,abbr,name,value,unit,rangeLow:low,rangeHigh:high,printedFlag:printed,status,reason,raw,...extra});
export function mockReportPayload(){
 const rows=[
  row('r1','BUN',t('血液尿素氮'),'42','mg/dL','16','36','H','high','','BUN 42 H mg/dL 16-36',{question:t('血液尿素氮偏高，可能的原因是什麼？需要複檢或追加檢查嗎？')}),
  row('r2','CREA',t('肌酸酐'),'2.3','mg/dL','0.8','2.4','','ok','','CREA 2.3 mg/dL 0.8-2.4'),
  row('r3','GLU',t('血糖'),'123','mg/dL','71','159','','ok','','GLU 123 mg/dL 71-159'),
  row('r4','ALP',t('鹼性磷酸酶'),'10','U/L','14','111','','low',t('報告沒有標示，由數值與報告上的參考範圍比對得出。'),'ALP 10 U/L 14-111',{question:t('鹼性磷酸酶偏低，可能的原因是什麼？需要複檢或追加檢查嗎？')}),
  row('r5','ALT',t('丙胺酸轉胺酶'),'84','U/L','12','130','H','pending',t('報告標示與數值對照範圍的結果不一致，請對照原報告。'),'ALT 84 H U/L 12-130'),
  row('r6','ALB',t('白蛋白'),'','g/dL','2.3','3.9','','pending',t('數值看不清楚或缺漏，保留空白，不推測。'),'ALB 3.? g/dL 2.3-3.9'),
  row('r7','PHOS',t('磷'),'5.8','mg/dL','','','','pending',t('報告上沒有清楚的參考範圍，不自行補入或判讀高低。'),'PHOS 5.8 mg/dL')
 ];
 const count=s=>rows.filter(r=>r.status===s).length;
 return {status:'completed',schema:'report-read.v1',header:{petName:K('小花'),date:'2026-10-28'},rows,
  summary:{total:rows.length,high:count('high'),low:count('low'),ok:count('ok'),pending:count('pending')}};
}
export function mockPayload(kind,scenario){return kind==='food'?mockFoodPayload(scenario):mockReportPayload();}

// ---- Defensive shaping of backend payloads for display ----
const text=(v,limit)=>typeof v==='string'&&v.length<=limit?v:'';
const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export const CATEGORY_ORDER=Object.freeze([K('肉類'),K('內臟'),K('魚類海鮮'),K('蛋奶'),K('穀物'),K('豆類'),K('蔬果'),K('油脂'),K('纖維'),K('維生素礦物'),K('添加物'),K('其他')]);
const REFERENCE_WORDS=Object.freeze({reached:t('標示值高於參考下限'),below:t('標示值低於參考下限'),unknown:t('無法比較')});
const BOUND_WORDS=Object.freeze({標示值:'',最低值:t('（最低）'),最高值:t('（最高）')});

// View model for the 成分解讀 card. Wording is about the label guarantee, never "good" or "bad".
export function foodAnalysisView(analysis){
 if(!analysis||analysis.schema!=='food-analysis.v1')return null;
 const nutrients=(Array.isArray(analysis.nutrients)?analysis.nutrients:[]).slice(0,10).map(n=>({
  label:text(n.key,10),bound:BOUND_WORDS[n.bound]??'',asFed:num(n.asFedPct),dryMatter:num(n.dryMatterPct)
 })).filter(n=>n.label);
 const references=(Array.isArray(analysis.reference)?analysis.reference:[]).slice(0,4).map(block=>({
  label:text(block.label,60),
  items:(Array.isArray(block.items)?block.items:[]).slice(0,10).map(item=>({
   label:text(item.key,10),minimum:num(item.minimumDryMatterPct),dryMatter:num(item.dryMatterPct),
   status:REFERENCE_WORDS[item.status]?item.status:'unknown',statusText:REFERENCE_WORDS[item.status]||REFERENCE_WORDS.unknown
  })).filter(item=>item.label)
 })).filter(block=>block.label&&block.items.length);
 const groups=new Map();
 for(const item of Array.isArray(analysis.ingredients)?analysis.ingredients:[]){
  const category=CATEGORY_ORDER.includes(item?.category)?item.category:null,name=text(item?.text,60);
  if(category&&name)groups.set(category,[...(groups.get(category)||[]),name]);
 }
 const energy=analysis.energy&&num(analysis.energy.kcalPer100g)!==null?{per100g:analysis.energy.kcalPer100g,perKg:num(analysis.energy.kcalPerKg)}:null;
 return {
  moisture:num(analysis.moisturePct),nutrients,references,
  ratio:num(analysis.calciumPhosphorusRatio),energy,
  ingredientGroups:CATEGORY_ORDER.filter(c=>groups.has(c)).map(c=>({category:c,items:groups.get(c)})),
  notes:(Array.isArray(analysis.notes)?analysis.notes:[]).map(n=>text(n,120)).filter(Boolean).slice(0,6)
 };
}

// View model for the report result. Unknown statuses become pending so nothing is shown as checked by accident.
const REPORT_STATUS=Object.freeze({high:t('高於報告範圍'),low:t('低於報告範圍'),ok:t('在報告範圍內'),pending:t('待確認')});
export function reportRangeText(low,high){
 if(low&&high)return `${low}–${high}`;
 if(high)return `≤ ${high}`;
 if(low)return `≥ ${low}`;
 return t('未標示');
}
export function reportView(payload){
 if(payload?.schema!=='report-read.v1'||!Array.isArray(payload.rows))return null;
 const rows=payload.rows.slice(0,60).map((r,i)=>{
  const status=REPORT_STATUS[r?.status]?r.status:'pending';
  const value=text(r?.value,20),unit=text(r?.unit,16);
  return {
   id:text(r?.id,12)||'r'+(i+1),abbr:text(r?.abbr,16),name:text(r?.name,40),value,unit,
   low:text(r?.rangeLow,20),high:text(r?.rangeHigh,20),range:reportRangeText(text(r?.rangeLow,20),text(r?.rangeHigh,20)),
   printedFlag:r?.printedFlag==='H'||r?.printedFlag==='L'?r.printedFlag:'',
   status,statusText:REPORT_STATUS[status],raw:text(r?.raw,200),
   reason:status==='pending'&&!text(r?.reason,120)?t('資料不完整，請對照原報告。'):text(r?.reason,120),
   question:status==='high'||status==='low'?text(r?.question,160):'',
   explanation:text(r?.explanation,200)
  };
 }).filter(r=>r.raw);
 if(!rows.length)return null;
 const count=s=>rows.filter(r=>r.status===s).length;
 return {
  header:{petName:text(payload.header?.petName,40),date:text(payload.header?.date,40)},rows,
  summary:{total:rows.length,high:count('high'),low:count('low'),ok:count('ok'),pending:count('pending')}
 };
}
// Compare what the report says with the selected pet/date. Never auto-accepts a mismatch.
export function identityCheck(header,pet,date){
 const name=(header?.petName||'').trim(),day=(header?.date||'').trim();
 return {
  petKnown:!!name,dateKnown:!!day,
  petMatches:!name||name===pet,
  dateMatches:!day||day.replace(/\//g,'-').slice(0,10)===date
 };
}
