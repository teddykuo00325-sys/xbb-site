// Cloud path for 看懂報告: photo -> consent -> wait -> result check.
// Results are organised from what the report itself prints. High/low is the backend's comparison with the
// report's own range; nothing here diagnoses. Edited rows lose their high/low mark (same rule as the demo).
import {cloudMode,cloudStatus,STATUS_REASONS,startSignIn,prepareJpeg,submitCloudJob,CONSENT,failureMessage,reportView,reportRangeText,identityCheck} from '../assets/cloud-care.js?v=quota-feedback1';
import {loadQuota,quotaLine,settleQuota} from '../assets/cloud-quota.js?v=quota-feedback1';
import {t, tn} from '/xbb-site/app/assets/i18n.js?v=audit1117b';

export const reportCloudAvailable=()=>cloudMode()!=='off';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const MAX_PICK=12*1024*1024;

export function mountReportCloud(host,{pet,date,onBack}){
 const mode=cloudMode();
 const state={stage:'capture',photo:null,gate:null,phase:'',failure:null,view:null,drafts:{},questions:new Set(),identityOk:{pet:false,date:false},notice:'',quota:null,quotaResult:''};
 let controller=null,destroyed=false;
 let quotaGeneration=0;
 const quotaCloud=mode==='native'?globalThis.V161Cloud:null;
 const q=sel=>host.querySelector(sel);
 const sampleTag=()=>mode==='mock'?`<p class="cc-sample-tag">${t('示範模式：結果是模擬的範例，不是真的辨識。')}</p>`:'';

 // --- row model with local edits: any edit makes the row pending and drops its high/low mark ---
 const edited=(row)=>{const d=state.drafts[row.id];return !!d&&['value','unit','low','high'].some(k=>d[k]!==row[k]);};
 const current=row=>{
  if(!edited(row))return row;
  const d=state.drafts[row.id];
  return {...row,value:d.value,unit:d.unit,low:d.low,high:d.high,range:reportRangeText(d.low,d.high),status:'pending',statusText:t('待確認'),
   reason:t('你修改了這一列，不沿用原本的高低標示與說明，請對照原報告。'),question:'',explanation:''};
 };
 const rows=()=>state.view.rows.map(current);

 function head(title,sub){return `<h2 class="cc-title">${esc(title)}</h2>${sub?`<p class="helper">${esc(sub)}</p>`:''}`;}
 function backButton(label=t('返回')){return `<button class="button ghost" id="cc-back">${label}</button>`;}

 function capturePage(){
  return head(t('用自己的報告照片'),t('拍一張清楚的報告，避開反光、讓文字入鏡。一次一頁，多頁報告請分次送。'))+sampleTag()+
   `<section class="card"><div class="actions"><button class="button" id="cc-camera">${t('拍照')}</button><button class="button secondary" id="cc-gallery">${t('選照片')}</button></div>
   <input id="cc-camera-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden aria-label="${t('拍攝報告')}">
   <input id="cc-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="${t('選擇報告照片')}">
   ${state.notice?`<p class="cc-hint" role="alert">${esc(state.notice)}</p>`:''}</section>${backButton(t('返回內建示範'))}`;
 }
 function previewPage(){
  const gate=state.gate;
  let action;
  if(state.failure){
   const m=failureMessage(state.failure);
   action=`<section class="cc-failure" role="alert"><strong>${esc(m.title)}</strong><p>${esc(m.body)}</p><div class="cc-actions">${m.retry?`<button class="button" id="cc-retry">${t('再試一次')}</button>`:''}<button class="button secondary" id="cc-other">${t('換一張照片')}</button></div></section>`;
  }else if(gate&&!gate.ok){
   const info=STATUS_REASONS[gate.reason]||STATUS_REASONS.denied;
   action=`<section class="cc-gate"><strong>${esc(info.title)}</strong><p>${esc(info.body)}</p>${info.action==='signIn'?`<button class="button" id="cc-signin">${t('用 Google 登入')}</button>`:''}</section>`;
  }else{
   action=`<p>${t('進階模式會逐列抄錄檢驗項目，並標出高於或低於報告範圍的項目。送出前會先請你確認。')}</p><button class="button" id="cc-send" ${gate?'':'disabled'}>${t('用進階模式整理這張報告')}</button>`;
  }
  return head(t('確認報告照片'))+sampleTag()+`<section class="card"><img class="cc-photo" src="${esc(state.photo.url)}" alt="${t('本次選擇的報告照片')}">${action}</section><button class="button ghost" id="cc-other">${t('重新拍照或選照片')}</button>`;
 }
 function consentPage(){
  const c={...CONSENT.report,cost:mode==='native'?quotaLine(state.quota):t('操作範例，不使用額度。')};
  return head(c.title)+sampleTag()+`<section class="cc-consent" aria-label="${esc(c.title)}"><dl class="cc-facts">${[[t('送出什麼'),c.sends],[t('送到哪裡'),c.to],[t('用來做什麼'),c.use],[t('要用額度'),c.cost],[t('保存多久'),c.keep]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="cc-reminder">${esc(c.reminder)}</p><div class="cc-actions"><button class="button" id="cc-accept" ${state.quota?.remaining===0?'disabled':''}>${esc(c.accept)}</button><button class="button secondary" id="cc-decline">${esc(c.decline)}</button></div></section>`;
 }
 function waitingPage(){
  return head(t('整理中'))+sampleTag()+`<section class="cc-waiting" role="status" aria-live="polite"><div class="cc-spinner" aria-hidden="true"></div><strong>${state.phase==='running'?t('正在讀取報告…'):t('已送出，排隊中…')}</strong><p>${t('可以留在這裡等，通常不到一分鐘。')}</p>${state.phase==='running'?`<p class="cc-tiny">${t('已經開始處理，這時取消不一定來得及。')}</p>`:`<button class="button secondary" id="cc-cancel">${t('取消')}</button>`}</section>`;
 }
 function identityPanel(){
  const id=identityCheck(state.view.header,pet,date);
  const items=[];
  if(id.petKnown&&!id.petMatches&&!state.identityOk.pet)items.push(`<p>${t('報告上印的名字是「')}<b>${esc(state.view.header.petName)}</b>${t('」，你目前選的是「')}<b>${esc(pet)}</b>${t('」。')}</p><div class="actions"><button class="button secondary small" data-confirm-id="pet">${t('是同一隻，繼續')}</button><button class="button ghost small" data-discard>${t('不是，放棄這份')}</button></div>`);
  if(id.dateKnown&&!id.dateMatches&&!state.identityOk.date)items.push(`<p>${t('報告上的日期是「')}<b>${esc(state.view.header.date)}</b>${t('」，和你選的「')}<b>${esc(date)}</b>${t('」不同。')}</p><div class="actions"><button class="button secondary small" data-confirm-id="date">${t('日期沒錯，繼續')}</button><button class="button ghost small" data-discard>${t('放棄這份')}</button></div>`);
  return items.length?`<aside class="cc-identity" role="alert"><b>${t('先確認是不是這隻、這一天')}</b>${items.join('')}</aside>`:'';
 }
 function rowCard(r){
  const d=state.drafts[r.id]||{value:r.value,unit:r.unit,low:r.low,high:r.high};
  const flag=r.printedFlag?t('報告標示 {printedFlag}', {printedFlag: r.printedFlag}):t('報告沒有標示');
  return `<article class="cc-row ${r.status}" id="row-${esc(r.id)}"><div class="cc-row-head"><div class="cc-row-name">${esc(r.abbr||r.name)}<small>${esc(r.abbr?r.name:'')}</small></div><div class="cc-row-value"><b>${esc(r.value||t('數值未知'))}</b> ${esc(r.unit||t('單位未知'))}<small>${t('報告範圍 {range}', {range: esc(r.range)})}</small></div></div>
  <span class="cc-status">${esc(r.statusText)}</span>
  ${r.status==='high'||r.status==='low'?`<p class="cc-reason">${r.reason?esc(tn(r.reason)):esc(flag+t('，與報告範圍比對一致。'))}</p>`:r.reason?`<p class="cc-reason">${esc(r.reason)}</p>`:''}
  ${r.explanation?`<p class="cc-explain">${esc(r.explanation)}</p>`:''}
  <details><summary>${t('修改／對照原文')}</summary><p class="cc-raw"><b>${t('報告原文：')}</b>${esc(r.raw)}</p><div class="field-grid">${[['value',t('數值')],['unit',t('單位')],['low',t('範圍下限')],['high',t('範圍上限')]].map(([k,label])=>`<label class="field">${label}<input data-row="${esc(r.id)}" data-key="${k}" value="${esc(d[k])}" maxlength="20" autocomplete="off" placeholder="${t('未知，請留白')}"></label>`).join('')}</div></details></article>`;
 }
 function resultPage(){
  const list=rows(),count=s=>list.filter(r=>r.status===s).length;
  const questions=list.filter(r=>r.question);
  return head(t('核對檢驗項目'),t('逐列對照報告，有錯直接改。看不清楚的保留待確認，不補值、不推測。'))+sampleTag()+identityPanel()+
   `<div class="cc-report-summary" aria-label="${t('結果統計')}"><span class="cc-chip high">${t('{high} 項高於報告範圍', {high: count('high')})}</span><span class="cc-chip low">${t('{low} 項低於報告範圍', {low: count('low')})}</span><span class="cc-chip ok">${t('{ok} 項在範圍內', {ok: count('ok')})}</span><span class="cc-chip pending">${t('{pending} 項待確認', {pending: count('pending')})}</span></div>
   <p class="cc-tiny">${t('高低是拿數值和這份報告印的範圍比對，不是診斷。在範圍內也不代表沒有問題。')}</p>
   <div class="cc-rows">${list.map(rowCard).join('')}</div>
   ${questions.length?`<section class="card cc-questions"><h3>${t('帶去問獸醫')}</h3><p class="helper">${t('勾選想帶去問的問題。')}</p>${questions.map(r=>`<label><input type="checkbox" data-question="${esc(r.id)}" ${state.questions.has(r.id)?'checked':''}><span>${esc(r.question)}</span></label>`).join('')}<button class="button secondary" id="cc-copy">${t('複製勾選的問題')}</button></section>`:''}
   <aside class="cc-safety"><b>${t('不要等進階模式整理')}</b><p>${t('若毛孩呼吸困難、倒下、持續抽搐，或反覆用力卻尿不出，請立即聯絡急診動物醫院。這份整理不是診斷，也不能取代獸醫。')}</p></aside>
   <p class="cc-tiny">${t('這份結果目前不會保存，離開這一頁就沒有了；保存功能之後開放。')}</p>
   <button class="button ghost" id="cc-discard">${t('不保存，結束')}</button>`;
 }

 function render(){
  if(destroyed)return;
  const page={capture:capturePage,preview:previewPage,consent:consentPage,waiting:waitingPage,result:resultPage}[state.stage]();
  host.innerHTML=(state.quotaResult?`<p class="cc-hint" role="status" data-quota-result>${esc(state.quotaResult)}</p>`:'')+page;bind();
  host.focus?.({preventScroll:true});
 }
 const on=(id,fn,ev='click')=>{const el=q('#'+id);if(el)el.addEventListener(ev,fn);};

 function choose(file){
  if(!file)return;
  if(!IMAGE_TYPES.includes(file.type)||!file.size||file.size>MAX_PICK){state.notice=t('請選 12 MB 以內的 JPG、PNG 或 WebP 照片。');render();return;}
  clearPhoto();state.notice='';
  state.photo={file,url:URL.createObjectURL(file)};state.stage='preview';state.gate=null;
  render();
  cloudStatus('report').then(s=>{if(!destroyed&&state.stage==='preview'){state.gate=s;render();}});
 }
 function clearPhoto(){controller?.abort();controller=null;if(state.photo?.url)URL.revokeObjectURL(state.photo.url);state.photo=null;state.failure=null;state.phase='';state.quotaResult='';quotaGeneration++;}
 async function openConsent(){
  const mine=++quotaGeneration;state.quota=null;state.quotaResult='';state.stage='consent';render();
  if(mode!=='native')return;
  const view=await loadQuota(quotaCloud);
  if(!destroyed&&mine===quotaGeneration&&state.stage==='consent'){state.quota=view;render();}
 }
 async function settle(options){
  if(mode!=='native')return;
  const mine=++quotaGeneration;state.quotaResult=t('正在確認本次額度與實際餘額…');render();
  const result=await settleQuota(quotaCloud,options);
  if(!destroyed&&mine===quotaGeneration){state.quota=result.view;state.quotaResult=result.line;render();}
 }
 async function send(){
  if(controller||state.quota?.remaining===0)return;
  controller=new AbortController();const mine=controller;let timedOut=false;
  let attempted=false,billing='unknown';
  const timer=setTimeout(()=>{timedOut=true;mine.abort();},200000);
  state.stage='waiting';state.phase='';state.failure=null;state.quotaResult='';quotaGeneration++;render();
  try{
   const jpeg=await prepareJpeg(state.photo.file);
   attempted=true;
   const payload=await submitCloudJob('report',jpeg.base64,{signal:mine.signal,onBilling:b=>{billing=b;},onUpdate:p=>{state.phase=p;if(state.stage==='waiting')render();}});
   if(!billing||billing==='unknown')billing='charged';
   const view=reportView(payload);
   if(!view)throw Object.assign(new Error('unreadable'),{code:'unreadable'});
   if(controller!==mine||mine.signal.aborted)return;
   state.view=view;state.drafts={};state.questions=new Set();state.identityOk={pet:false,date:false};state.stage='result';
   void settle({outcome:'success',billing});
  }catch(err){
   if(controller!==mine&&!timedOut)return;
   state.stage='preview';
   if(err?.code!=='cancelled'||timedOut)state.failure=timedOut?'expired':err?.code||'unreadable';
   void settle({outcome:attempted?(err?.code==='cancelled'?'pending':'failure'):'not-sent',billing:err?.billing&&err.billing!=='unknown'?err.billing:billing});
  }finally{clearTimeout(timer);if(controller===mine)controller=null;render();}
 }

 function bind(){
  on('cc-back',()=>{destroy();onBack?.();});
  on('cc-camera',()=>q('#cc-camera-input')?.click());on('cc-gallery',()=>q('#cc-gallery-input')?.click());
  for(const id of ['cc-camera-input','cc-gallery-input'])on(id,e=>{choose(e.target.files?.[0]);e.target.value='';},'change');
  on('cc-other',()=>{clearPhoto();state.stage='capture';render();});
  on('cc-send',openConsent);
  on('cc-signin',()=>startSignIn());
  on('cc-retry',()=>{state.failure=null;void openConsent();});
  on('cc-decline',()=>{state.stage='preview';render();});
  on('cc-accept',send);
  on('cc-cancel',()=>controller?.abort());
  on('cc-discard',()=>{clearPhoto();state.view=null;state.stage='capture';render();});
  host.querySelectorAll('[data-discard]').forEach(b=>b.addEventListener('click',()=>{state.view=null;state.stage='capture';clearPhoto();render();}));
  host.querySelectorAll('[data-confirm-id]').forEach(b=>b.addEventListener('click',()=>{state.identityOk[b.dataset.confirmId]=true;render();}));
  host.querySelectorAll('[data-row]').forEach(input=>input.addEventListener('input',()=>{
   const id=input.dataset.row,base=state.view.rows.find(r=>r.id===id);
   const d=state.drafts[id]||(state.drafts[id]={value:base.value,unit:base.unit,low:base.low,high:base.high});
   d[input.dataset.key]=input.value;
   // Update this row and the counters in place so typing keeps focus.
   const r=current(base),card=q('#row-'+CSS.escape(id));
   if(card){card.className='cc-row '+r.status;card.querySelector('.cc-status').textContent=r.statusText;
    card.querySelector('.cc-row-value').innerHTML=`<b>${esc(r.value||t('數值未知'))}</b> ${esc(r.unit||t('單位未知'))}<small>${t('報告範圍 {range}', {range: esc(r.range)})}</small>`;
    let reason=card.querySelector('.cc-reason');if(!reason){reason=document.createElement('p');reason.className='cc-reason';card.querySelector('.cc-status').after(reason);}
    reason.textContent=r.reason||'';card.querySelector('.cc-explain')?.remove();}
   const list=rows(),count=s=>list.filter(x=>x.status===s).length,chips=host.querySelectorAll('.cc-chip');
   if(chips.length===4){chips[0].textContent=count('high')+t(' 項高於報告範圍');chips[1].textContent=count('low')+t(' 項低於報告範圍');chips[2].textContent=count('ok')+t(' 項在範圍內');chips[3].textContent=count('pending')+t(' 項待確認');}
  }));
  host.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('change',()=>{b.checked?state.questions.add(b.dataset.question):state.questions.delete(b.dataset.question);}));
  on('cc-copy',async()=>{
   const text=rows().filter(r=>state.questions.has(r.id)&&r.question).map(r=>'・'+r.question).join('\n');
   if(!text){alert(t('請先勾選想帶去問的問題。'));return;}
   try{await navigator.clipboard.writeText(text);alert(t('已複製。'));}catch{alert(t('這台裝置無法複製。'));}
  });
 }
 function destroy(){destroyed=true;quotaGeneration++;controller?.abort();if(state.photo?.url)URL.revokeObjectURL(state.photo.url);}
 render();
 return destroy;
}
