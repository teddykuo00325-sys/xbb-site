// Local-only saved synthetic report results. Never touches the care-data store.
import {t, K} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
export const REPORT_DEMO_KEY='inpaw-report-demo-results-v1';
const ids=['glu','bun','crea','alt','alb','phos'];
export function reportResultSnapshot(state,{id,now=new Date().toISOString()}={}){
 if(!state.confirmed||!state.saved||state.pet!==K('小花')||state.date!=='2026-10-28'||!['photo','pdf'].includes(state.source))throw Error(t('請先核對並確認這份示範報告。'));
 const drafts=Object.fromEntries(ids.map(key=>{const item=state.drafts?.[key];if(!item||['value','unit','range'].some(k=>typeof item[k]!=='string'||item[k].length>80))throw Error(t('報告欄位格式不正確，尚未保存。'));return [key,{value:item.value,unit:item.unit,range:item.range}];}));
 const context=state.context,questions=[...(state.questions||[])];
 if(!['none','water','appetite','urgent'].includes(context)||questions.some(key=>!['bun','followup','missing','observe'].includes(key))||new Set(questions).size!==questions.length)throw Error(t('報告情境或提問格式不正確，尚未保存。'));
 return {version:1,id:id||'report-demo-'+crypto.randomUUID(),savedAt:now,source:state.source,pet:K('小花'),date:'2026-10-28',demo:true,drafts,context,questions};
}
function valid(result){try{return result?.version===1&&result.demo===true&&typeof result.id==='string'&&result.id.startsWith('report-demo-')&&['none','water','appetite','urgent'].includes(result.context)&&Array.isArray(result.questions)&&result.questions.every(key=>['bun','followup','missing','observe'].includes(key))&&new Set(result.questions).size===result.questions.length&&typeof result.savedAt==='string'&&Number.isFinite(Date.parse(result.savedAt))&&!!reportResultSnapshot({...result,confirmed:true,saved:true,questions:new Set(result.questions)},{id:result.id,now:result.savedAt});}catch{return false;}}
export function readReportResults(storage){
 const raw=storage.getItem(REPORT_DEMO_KEY);if(!raw)return [];
 let data;try{data=JSON.parse(raw);}catch{throw Error(t('已保存的報告示範無法讀取，未覆寫原資料。'));}
 if(!Array.isArray(data)||data.length>20||data.some(row=>!valid(row))||new Set(data.map(row=>row.id)).size!==data.length)throw Error(t('已保存的報告示範格式不完整，未覆寫原資料。'));
 return data;
}
export function saveReportResult(storage,result){
 if(!valid(result))throw Error(t('報告示範格式不正確，尚未保存。'));
 const rows=readReportResults(storage),exists=rows.some(row=>row.id===result.id);
 if(!exists&&rows.length>=20)throw Error(t('已保存 20 份示範，請先移除不需要的項目。'));
 const next=exists?rows.map(row=>row.id===result.id?result:row):[result,...rows];
 storage.setItem(REPORT_DEMO_KEY,JSON.stringify(next));return result;
}
export function removeReportResult(storage,id){const rows=readReportResults(storage);storage.setItem(REPORT_DEMO_KEY,JSON.stringify(rows.filter(row=>row.id!==id)));}
export function restoreReportResult(result){
 if(!valid(result))throw Error(t('這份報告示範無法還原。'));
 return {...result,step:3,identity:true,poor:false,reviewed:new Set(ids),confirmed:true,reviewTab:'fields',questions:new Set(result.questions),filter:'all',selected:new Set(),finished:true,saved:true,resultId:result.id};
}
export function reportFollowup(key){
 const answers={missing:{question:t('哪些地方仍要補齊？'),answer:t('ALB 原文數值是「3.?」，不能猜末位；PHOS 沒有參考範圍，不能判讀高低。請向原院索取完整清楚的報告。'),sources:['ALB　3.?　g/dL　2.3–3.9',t('PHOS　5.8　mg/dL　（範圍缺漏）')]},discussion:{question:t('這份報告該問獸醫什麼？'),answer:t('可問 BUN 的 H 標示需要配合哪些病史、採樣背景或檢查釐清。BUN 單值不能確認原因，CREA 在原文範圍內也不能排除所有問題。不依此範例自行停藥或調整劑量。'),sources:['BUN　42 H　mg/dL　16–36','CREA　2.3　mg/dL　0.8–2.4']}};
 return answers[key]?structuredClone(answers[key]):null;
}
