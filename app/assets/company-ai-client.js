import {t, tn, K} from './i18n.js?v=audit1117b';
// Company gateway only. No provider key, alternative provider or fabricated result.
const BASE='/api/company-ai';
export const CARE_PLANS=Object.freeze({free:{quick:20,summary:1,summaryLifetime:true,voiceSeconds:30},pro:{quick:300,summary:4,summaryLifetime:false,voiceSeconds:30,monthly:99,yearly:990}});   // 價格依 2026-11-13 定案（正本 cloud-quota.js）；quick／summary 是舊公司閘道的計數，不是進階模式額度
export function careRequestId(){return globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16)})}
export function companyQuotaIntent(status,task='quick'){
 const summary=task==='summary',q=status?.quota?.[summary?'summary':'quick'],remaining=status?.ready&&Number.isInteger(q?.remaining)&&q.remaining>=0?q.remaining:null;
 return {remaining,label:t('{task}：本次使用 1 次額度 · {rest}',{task:summary?t('進階模式回診摘要'):t('進階模式快記／建立觀察'),rest:remaining===null?t('使用後剩餘額度待確認'):remaining===0?t('目前剩 0 次，無法送出'):t('使用後預計剩 {count} 次',{count:remaining-1})})};
}
const unavailable=()=>({ready:false,reason:t('公司主機尚未連接，進階模式暫不可用；可以先手動記錄。'),plan:'free',quota:null});
const reasonText=code=>({sign_in_required:t('請先登入公司核可的家庭帳號，手動記錄仍可使用。'),family_not_provisioned:t('這個帳號尚未開通家庭進階模式權限，請聯絡服務管理者。'),quota_exhausted:t('本家庭進階模式額度已用完，手動記錄仍可使用。'),company_timeout_unknown:t('主機尚未確認這次任務結果，請先查詢狀態，避免重複送出。')}[code]||(/^[a-z_]+$/.test(code||'')?unavailable().reason:tn(code)));
export async function getCompanyAIStatus({signal,fetcher=globalThis.fetch}={}){
 try{const r=await fetcher(BASE+'/status',{credentials:'same-origin',cache:'no-store',signal});const s=await r.json();return {ready:r.ok&&s.ready===true,reason:typeof s.reason==='string'?reasonText(s.reason):r.ok?'':unavailable().reason,plan:s.plan==='pro'?'pro':'free',quota:s.quota||null,signInPath:typeof s.signInPath==='string'&&/^\/(?!\/)/.test(s.signInPath)?s.signInPath:null};}
 catch(e){if(e.name==='AbortError')throw e;return unavailable();}
}
export function validateCompanyResult(task,result,input){
 if(!result||typeof result!=='object'||Array.isArray(result))throw Error(t('主機回傳格式無法核對，尚未保存。'));
 const ids=new Set((input.cats||[]).map(c=>c.id));
 if(task==='quick'){
  if(!Array.isArray(result.drafts)||!result.drafts.length||result.drafts.length>30)throw Error(t('主機沒有回傳可核對的草稿。'));
  for(const row of result.drafts){
   if(!row||!ids.has(row.catId)||!['meal','record'].includes(row.kind))throw Error(t('草稿的毛孩歸屬無法核對，尚未保存。'));
   if(row.kind==='meal'&&(!Array.isArray(row.parts)||!row.parts.length||row.parts.length>12))throw Error(t('食品草稿格式無法核對。'));
   if(row.kind==='record'&&(![K('排泄'),K('嘔吐'),K('體重'),K('喝水'),K('其他')].includes(row.category)||typeof row.text!=='string'||!row.text.trim()))throw Error(t('觀察草稿格式無法核對。'));
  }
 }
 if(task==='observation'&&(!result.observation||!ids.has(result.observation.catId)||!['food-change','vet'].includes(result.observation.kind)))throw Error(t('觀察對象或類型無法核對，請重新確認。'));
 if(task==='summary'){
  if(typeof result.summary!=='string'||!result.summary.trim()||result.summary.length>12000||!Array.isArray(result.sources)||!result.sources.length)throw Error(t('進階模式摘要缺少內容或來源，未保存。'));
  const facts=input.report?.sourceFacts||input.report?.sources||[];
  const allowed=new Set(facts.map(f=>f.kind+':'+f.id));
  if(result.sources.some(s=>!s||!allowed.has(s.kind+':'+s.id)))throw Error(t('進階模式摘要含有選取範圍外的來源，未保存。'));
 }
 return result;
}
export async function requestCompanyAI(payload,{signal,fetcher=globalThis.fetch}={}){
 if(payload.audio)throw Error(t('錄音留在手機；請先以手機語音辨識 轉文字並核對後再送出。'));
 if(payload.consent!==true)throw Error(t('請先確認要傳送到公司主機的內容與用途。'));
 if(!['quick','observation','summary'].includes(payload.task))throw Error(t('不支援這個進階模式任務。'));
 if(!Array.isArray(payload.cats)||!payload.cats.length||payload.cats.length>20)throw Error(t('請選擇 1–20 位照顧對象。'));
 const text=String(payload.text||'').trim();if(text.length>4000)throw Error(t('這段文字太長，請分段整理。'));
 if(!text&&payload.task!=='summary')throw Error(t('請先輸入或核對辨識文字。'));
 const now=new Date(),localDate=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const input={text,cats:payload.cats.map(c=>({id:c.id,name:c.name||c.profile?.name||''})),foods:(payload.foods||[]).map(f=>({id:f.id,catId:f.catId,name:f.name})),context:{date:localDate,time:now.toTimeString().slice(0,5),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,...payload.context},...(payload.report?{report:payload.report}:{})};
 const metadata={task:payload.task,requestId:payload.requestId||careRequestId(),consent:true,input};
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
 const timeout=setTimeout(abort,60000);let posted=false;
 try{
  const status=await getCompanyAIStatus({signal:controller.signal,fetcher});if(!status.ready)throw Object.assign(Error(status.reason||unavailable().reason),{billing:'not-charged'});
  const body=JSON.stringify(metadata),headers={'Content-Type':'application/json'};
  posted=true;
  const r=await fetcher(BASE+'/task',{method:'POST',credentials:'same-origin',headers,body,signal:controller.signal});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(reasonText(result.error||result.reason)||(r.status===429?t('本家庭本月 AI 額度已用完，手動記錄仍可使用。'):t('公司主機暫時無法處理，原內容仍保留。'))),{billing:result.billing||'unknown'});
  try{return validateCompanyResult(payload.task,result.result?{...result.result,quota:result.quota,billing:result.billing||'charged'}:{...result,billing:result.billing||'charged'},input);}
  catch(error){error.billing=result.billing||'charged';throw error;}
 }catch(e){if(e.name==='AbortError')throw Object.assign(Error(signal?.aborted?t('已取消這次整理，原內容仍保留。'):t('主機回覆逾時，請先確認任務狀態後重試，原內容仍保留。')),{billing:posted?'unknown':'not-charged',quotaOutcome:posted?'pending':'not-sent'});if(!posted&&!e.billing)e.billing='not-charged';throw e;}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
