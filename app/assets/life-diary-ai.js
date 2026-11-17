import {t,tn,isEnglish,withLocaleMarker} from './i18n.js?v=audit1117b';
import {loadQuota,quotaLine,settleQuota} from './cloud-quota.js?v=quota-feedback1';
const KEY='inpaw.diary.pending.v1',MODE='diary-caption';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}};
const clear=()=>{try{localStorage.removeItem(KEY);}catch{}};
export function validateDiaryCaption(value){const text=typeof value==='string'?value.trim():'';if(!text||text.length>280)throw Error(t('AI 文案無法使用，請重試或保留原文。'));return text;}
export async function generateDiaryCaption({text,tone='short',mode='cloud',signal,onResult}){
 const check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};check();
 text=validateDiaryCaption(text);tone=tone==='playful'?'fun':tone;
 if(!['original','short','fun'].includes(tone)||!['cloud','phone'].includes(mode))throw Error(t('AI 文案設定無效。'));
 if(mode==='phone'){
  const host=window.V161Gemma;if(!host?.request)throw Error(t('此版本尚未支援手機模式整理。'));
  const status=await host.request('status');check();const models=(status.models||[]).filter(m=>m.supported!==false&&!m.block);
  const model=models.find(m=>m.ready);
  if(!model){check();const candidate=models.find(m=>['gemma-e2b','gemma-e4b'].includes(m.id));if(candidate&&window.confirm(t('手機模式需要先下載模型（約 2.6–3.7 GB），要開始下載嗎？'))){check();await host.request('prepare',{model:candidate.id});check();throw Error(t('模型下載中，完成後請再產生文案。'));}throw Error(t('請先在 AI 設定下載手機模式模型，再試一次。'));}
  check();
  const result=await host.request('diary',{model:model.id,text,tone,lang:isEnglish()?'en':'zh-TW'});
  check();if(result.error||!result.candidate&&result.message)throw Error(tn(result.error||result.message));const candidate=validateDiaryCaption(result.candidate);await onResult?.(candidate);return candidate;
 }
 const host=window.V161Cloud;if(!host?.request)throw Error(t('此版本尚未連接進階模式，請使用手機模式或自行寫一句。'));
 const payload=JSON.stringify({text,tone}),prior=await host.request('status'),pending=read();check();
 let meetingId;
 if(prior.state!=='idle'){
  if(prior.mode!==MODE)throw Error(t('AI 還有其他工作，請先回原頁面處理完成。'));
  if(pending?.meetingId===prior.meetingId&&pending.payload===payload){meetingId=prior.meetingId;}
  else {if(['queued','processing','submitting'].includes(prior.state))throw Error(t('上一份日記文案仍在處理，請稍後再試。'));if(!window.confirm(t('要放棄上一份尚未套用的日記文案，再重新產生嗎？')))throw Error(t('已保留上一份文案，沒有送出新資料。'));await host.request('ack');clear();}
 }
 if(!meetingId){
  const quota=await loadQuota(host);check();if(quota&&quota.remaining<1)throw Error(t('進階模式額度不足，請使用手機模式或保留原文。'));
  if(!window.confirm(t('只將這句文字送到毛孩小本本的 AI 伺服器，不送照片。')+'\n'+quotaLine(quota)))throw Error(t('沒有送出，原文仍保留。'));
  check();meetingId='diary-'+crypto.randomUUID();
  const sent=await host.request('submit',{meetingId,transcript:withLocaleMarker(payload),mode:MODE,lang:isEnglish()?'en':'zh-TW'});
  if(sent.error)throw Error(sent.error);
  try{localStorage.setItem(KEY,JSON.stringify({meetingId,payload,at:Date.now()}));}catch{}
 }
 const start=Date.now();
 while(Date.now()-start<8*60*1000){
  check();const s=await host.request('status');check();
  if(s.meetingId!==meetingId||s.mode!==MODE||s.state==='idle')throw Error(t('日記文案工作已變更，原文仍保留。'));
  if(s.state==='done'){
   const result=validateDiaryCaption(s.summary);await onResult?.(result);check();await host.request('ack');clear();await settleQuota(host,{outcome:'success',billing:s.billing});return result;
  }
  if(['failed','timeout'].includes(s.state)){await host.request('ack');clear();const quota=await settleQuota(host,{outcome:s.state==='timeout'?'pending':'failure',billing:s.billing});throw Error((s.message||t('AI 文案沒有完成，原文仍保留。'))+' '+quota.line);}
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error(t('已停止等待，請稍後再按產生文案取回結果。原文仍保留。'));
}

// 看照片起個頭（Ian 2026-11-16）：新增日記選好照片後，讓 AI 看照片寫一句開頭，飼主自己再改。
// 進階模式：送出這張照片（用 1 次額度，送出前確認）；手機模式：照片只在手機處理。都不會自動存檔。
const PHOTO_KEY='inpaw.diaryPhoto.pending.v1',PHOTO_MODE='diary-photo',photoLimit=()=>isEnglish()?120:80;
const readPhoto=()=>{try{return JSON.parse(localStorage.getItem(PHOTO_KEY)||'null');}catch{return null;}};
const clearPhoto=()=>{try{localStorage.removeItem(PHOTO_KEY);}catch{}};
const photoB64=photo=>{const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+=*)$/.exec(String(photo||''));if(!match||match[1].length>560000)throw Error(t('照片無法讀取，請重新選一張。'));return match[1];};
const photoKey=b64=>b64.length+':'+b64.slice(0,64)+b64.slice(-64);
export function validateDiaryPhotoLine(value){const text=typeof value==='string'?value.trim():'';if(!text||text.length>photoLimit()||/\n/.test(text))throw Error(t('AI 沒有寫出可用的句子，請自己寫一句或再試一次。'));return text;}
function photoFailure(summary){try{const code=JSON.parse(summary||'{}').code;if(code==='unreadable')return t('AI 看不太出這張照片，請自己寫一句或換一張。');}catch{}return t('AI 沒有寫出可用的句子，請自己寫一句或再試一次。');}

/** 讀手機模式能不能看照片（只讀狀態，不下載、不推論）。 */
export async function diaryPhotoPhoneState(){
 const host=globalThis.window?.V161Gemma;if(!host?.request)return {state:'unsupported'};
 try{const status=await host.request('status');if(status?.diaryPhoto!==true)return {state:'unsupported'};
  const models=(status.models||[]).filter(m=>['gemma-e2b','gemma-e4b'].includes(m.id));
  const ready=models.find(m=>m.ready&&m.supported!==false&&!m.block);if(ready)return {state:'ready',model:ready.id};
  if(models.some(m=>m.supported!==false))return {state:'missing',downloading:!!status.downloading};
  return {state:'blocked'};
 }catch{return {state:'unknown'};}
}

export async function generateDiaryPhotoLine({photo,mode='cloud',signal}){
 const check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};check();
 const imageB64=photoB64(photo),lang=isEnglish()?'en':'zh-TW';
 if(!['cloud','phone'].includes(mode))throw Error(t('AI 文案設定無效。'));
 if(mode==='phone'){
  const phone=await diaryPhotoPhoneState();check();
  if(phone.state!=='ready')throw Error(phone.state==='missing'?t('請先到「設定」→「AI 與下載」下載手機模式模型。'):t('這台手機還不支援用手機模式看照片。'));
  const result=await window.V161Gemma.request('diaryPhoto',{model:phone.model,imageB64,lang});check();
  if(result?.error||!result?.candidate)throw Error(tn(result?.error||result?.message)||t('AI 沒有寫出可用的句子，請自己寫一句或再試一次。'));
  return validateDiaryPhotoLine(result.candidate);
 }
 const host=globalThis.window?.V161Cloud;if(!host?.request)throw Error(t('此版本尚未連接進階模式，請使用手機模式或自行寫一句。'));
 const key=photoKey(imageB64),prior=await host.request('status'),pending=readPhoto();check();
 let meetingId;
 if(prior.state!=='idle'){
  if(prior.mode!==PHOTO_MODE)throw Error(t('AI 還有其他工作，請先回原頁面處理完成。'));
  if(pending?.meetingId===prior.meetingId&&pending.key===key){meetingId=prior.meetingId;}
  else {if(['queued','processing','submitting'].includes(prior.state))throw Error(t('上一張照片還在處理，請稍後再試。'));await host.request('ack');clearPhoto();}
 }
 if(!meetingId){
  const quota=await loadQuota(host);check();if(quota&&quota.remaining<1)throw Error(t('進階模式額度不足，請使用手機模式或自己寫一句。'));
  if(!window.confirm(t('會把這張照片送到毛孩小本本的 AI 伺服器，幫你寫一句開頭；不會送出其他日記或照護資料。')+'\n'+quotaLine(quota)))throw Error(t('沒有送出照片。'));
  check();meetingId='diaryphoto-'+crypto.randomUUID();
  const sent=await host.request('submit',{meetingId,imageB64,mode:PHOTO_MODE,lang});
  if(sent.error)throw Error(sent.error);
  try{localStorage.setItem(PHOTO_KEY,JSON.stringify({meetingId,key,at:Date.now()}));}catch{}
 }
 const start=Date.now();
 while(Date.now()-start<8*60*1000){
  check();const s=await host.request('status');check();
  if(s.meetingId!==meetingId||s.mode!==PHOTO_MODE||s.state==='idle')throw Error(t('照片工作已變更，請再試一次。'));
  if(s.state==='done'){const line=validateDiaryPhotoLine(s.summary);await host.request('ack');clearPhoto();await settleQuota(host,{outcome:'success',billing:s.billing});return line;}
  if(['failed','timeout'].includes(s.state)){await host.request('ack');clearPhoto();const quota=await settleQuota(host,{outcome:s.state==='timeout'?'pending':'failure',billing:s.billing});throw Error(photoFailure(s.summary)+' '+quota.line);}
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error(t('已停止等待，稍後再按一次可以取回結果。'));
}
