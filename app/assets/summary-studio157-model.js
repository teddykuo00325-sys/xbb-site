import {listCareCats} from './care-journey-model.js?v=photo-simplify1';
import {requireActivePet,petArchiveGeneration} from './pet-archive.js?v=8f5745b7843b';
import {vetSourceData,vetRangeError,sourceDescription,VET_LIMITS,vetPeriod,periodFacts,vetWeightTrend,weightTrendLines} from './advanced-vet-model.js?v=photo-simplify1';
import {appetiteStatusOf} from './record-quantity.js?v=1';
import {stoolState} from './health-summary-v31.js?v=photo-simplify1';
import {localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';
import {summaryObservationCoverage,summaryCoverageLines} from './summary-events-v40.js?v=photo-simplify1';
import {summaryReadableSource,completeSummaryText,phoneSummaryScopeLabel,PHONE_SUMMARY_MODE} from './summary-ai179.js?v=ai-names1';
import {bulletizeSummary} from './summary-bullets.js?v=ai-names1';
import {careBriefLines,careBriefText,profileBriefLines,hasCareContent} from './summary-care-brief.js?v=photo-simplify1';
import {t, K, getLocale} from './i18n.js?v=audit1117b';
import {withStoredTexts} from './stored-text.js?v=i18n1';
export const SUMMARY_MODE='local-rules-v1';
const fail=message=>{throw Error(message)};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const unique=rows=>{const counts=new Map();for(const r of rows)counts.set(r.id,(counts.get(r.id)||0)+1);return rows.filter(r=>counts.get(r.id)===1);};
export function summaryScope(data,{catId,start,end,today=localCalendarDate()}={}){
 const error=vetRangeError(start,end,today);if(error)fail(error);
 if((Date.parse(end)-Date.parse(start))/86400000>3660)fail(t('請選擇十年以內的期間。'));
 const cat=listCareCats(data).find(c=>c.id===catId);if(!cat)fail(t('請先選擇照顧中的毛孩。'));
 const raw=cat.data,clean=vetSourceData({...raw,entries:unique(raw.entries||[]),changes:unique(raw.changes||[]),careItems:unique(raw.careItems||[]),catId,today});
 const sources=[...clean.records.map(row=>({row,kind:'record'})),...clean.changes.map(row=>({row,kind:'change'})),...clean.care.map(row=>({row,kind:'care'}))].filter(({row})=>row.date>=start&&row.date<=end).map(({row,kind})=>({id:row.id,kind,date:row.date,time:row.time||'',text:withStoredTexts(sourceDescription(row,kind),[row.text,row.note,row.kind,row.name]),raw:JSON.stringify(row)})).sort((a,b)=>(a.date+a.time+a.kind+a.id).localeCompare(b.date+b.time+b.kind+b.id));
 // 2026-11-14：摘要開頭帶上登記的基本資料與飼主備註（例如過敏）；沒有任何紀錄或照護內容時不單獨產生。
 const care=careBriefLines(data,catId,unique(raw.careItems||[]),end,start),careBrief=sources.length||care.length?[...profileBriefLines(cat.profile,end),...care]:[];
 // 2026-11-14：體重另看到摘要結束日為止的近 3 個月（不只摘要期間），讓緩慢下降也看得到。
 const weightTrend=vetWeightTrend(clean.records,end);
 return {catId,catName:cat.profile.name,start,end,sources,careBrief,...(weightTrend?{weightTrend}:{}),archiveGeneration:petArchiveGeneration(data.multiCat?.cats.find(c=>c.id===catId))};
}
export const sourceKey=s=>s.kind+':'+s.id;
// 摘要頭與內文同一個口徑：日常紀錄、疫苗與驅蟲完成、生活變化分開寫（Ian 2026-11-14：頭 11 筆、內文 9 筆）。
export function sourceCountText(sources=[]){
 const count=kind=>sources.filter(s=>(s.kind||'record')===kind).length,record=count('record'),care=count('care'),change=count('change');
 return [t('日常紀錄 {record} 筆', {record}),care?t('疫苗與驅蟲完成 {care} 筆', {care}):'',change?t('生活變化 {change} 筆', {change}):''].filter(Boolean).join(' · ');
}
const missingSource=t('原始來源目前無法取得。');
function snapshotRow(source){
 if(source.row)return source.row;
 try{return JSON.parse(source.raw||'null');}catch{return null;}
}
const sourceLabelPattern=/(?: · 關聯原紀錄 |／食品 ID )[^\s／]+/g;
export function summarySourceText(source){
 const row=snapshotRow(source);
 // 顯示用：來源描述裡的存檔中文在英文介面換成英文（raw 原始資料不變）。
 if(row)return withStoredTexts(sourceDescription(row,source.kind,false),[row.text,row.note,row.kind,row.name]);
 return source.text&&!source.text.startsWith(K('這份既有摘要未保存來源原文'))?source.text.replace(sourceLabelPattern,''):missingSource;
}
export function summaryTextForExport(summary,sources=savedSummarySources(summary)){
 let text=summary.text;
 for(const source of [...sources,...(summary.sources||[])]){
  const key=sourceKey(source),readable=summarySourceText(source);
  text=text.replaceAll(' ['+key+']','').replaceAll('['+key+']','');
  if(!source.text||readable===missingSource)continue;
  text=text.replaceAll(source.text,()=>readable);
  const internalLabels=source.text.match(sourceLabelPattern)||[];
  for(const label of internalLabels){
   if(!readable.includes(label))text=text.replaceAll(label,'');
  }
 }
 return summary.mode==='cloud-ai-v1'?bulletizeSummary(text):text;
}
const shortDate=date=>String(date||'').slice(5).replace('-','/');
const quantityOf=value=>{const text=String(value??'').trim(),n=Number(text);return text&&Number.isFinite(n)&&n>=0?n:null;};
const uniqueDates=rows=>[...new Set(rows.map(row=>shortDate(row.date)))].join(t('、'));
/** Period overview for the vet: facts and recorded changes only; no diagnosis or cause. */
export function summaryOverviewText(scope,sources){
 const rows=[];
 for(const source of sources){
  if(source.kind!=='record')continue;
  try{const row=JSON.parse(source.raw||'null');if(row&&typeof row.category==='string')rows.push(row);}catch{}
 }
 const period=vetPeriod({records:rows,changes:[],care:[],foodCards:[]},scope.start,scope.end),notes=[];
 for(const [state,label] of [['soft',t('軟便')],['diarrhea',t('腹瀉')],['blood',t('血便')]]){
  const list=period.stool.filter(row=>stoolState(row)===state);
  if(list.length)notes.push(t('便便{label} {count} 筆：{list}', {label, count: list.length, list: uniqueDates(list)}));
 }
 const vomit=rows.filter(row=>row.category===K('嘔吐'));
 if(vomit.length)notes.push(t('嘔吐 {count} 筆：{vomit}', {count: vomit.length, vomit: uniqueDates(vomit)}));
 // 2026-11-14：飼主選了「活動量比平常少」「吃得比平常少／觀察時沒有進食」也要進值得注意（只照選項寫，不推論原因）。
 const frequentUrine=rows.filter(row=>row.category===K('排泄')&&row.urineStatus==='frequent');
 if(frequentUrine.length)notes.push(t('尿尿：比平常頻繁進砂盆、排出情況不確定 {count} 筆：{frequentUrine}', {count: frequentUrine.length, frequentUrine: uniqueDates(frequentUrine)}));
 const lowMood=rows.filter(row=>row.category===K('其他')&&row.metric==='mood'&&row.moodStatus==='low');
 if(lowMood.length)notes.push(t('精神：活動量比平常少 {count} 筆：{lowMood}', {count: lowMood.length, lowMood: uniqueDates(lowMood)}));
 for(const [state,label] of [['less',t('吃得比平常少')],['none',t('觀察時沒有進食')]]){
  // 一鍵快記「沒吃完」（含舊紀錄）也算「吃得比平常少」。
  const list=rows.filter(row=>appetiteStatusOf(row)===state);
  if(list.length)notes.push(t('食慾：{label} {count} 筆：{list}', {label, count: list.length, list: uniqueDates(list)}));
 }
 const less=rows.filter(row=>{
  const f=row.feeding;if(!f)return false;
  const provided=quantityOf(f.provided),eaten=quantityOf(f.eaten);
  return f.noEatingConfirmed===true||(provided!==null&&eaten!==null&&provided>0&&eaten<provided);
 });
 less.slice(0,5).forEach(row=>{
  const f=row.feeding,unit=amount=>f.unit?' '+t(f.unit,{count:amount,context:'quantity'}):'';
  notes.push(f.noEatingConfirmed===true?t('{date} 已確認沒有進食', {date: shortDate(row.date)}):t('{date} 吃下 {eaten}{eatenUnit}，提供 {provided}{providedUnit}', {date: shortDate(row.date), eaten: f.eaten, eatenUnit:unit(f.eaten), provided: f.provided, providedUnit:unit(f.provided)}));
 });
 if(less.length>5)notes.push(t('另有 {count} 筆吃下量較少，請見來源', {count: less.length-5}));
 // 體重近 3 個月（不限摘要期間）：寫首末兩筆、公斤差與百分比；明顯變化時附一般建議。
 const weight=weightTrendLines(scope.weightTrend);
 if(weight.advice)notes.push(weight.advice);
 if(!rows.length)return [`${scope.catName||t('毛孩')}${t('的看診摘要')}`,t('{start} 至 {end}', {start: String(scope.start||'').replaceAll('-','/'), end: String(scope.end||'').replaceAll('-','/')}),'',t('這段期間沒有選日常紀錄（吃、喝、排泄、體重），只整理上面的看診與照護。'),...(weight.line?['',weight.line,...(weight.advice?[weight.advice]:[])]:[]),'',t('以上只整理已記下的內容，不是診斷；未記錄不代表沒有發生。')].join('\n');
 // 2026-11-17：有精神等「其他」觀察時也列進完整度（語音快記的「精神不錯」原本永遠不算）；沒有就不多列「未記錄」。
 const coverage=summaryCoverageLines([{kind:'record',sources:rows}],[K('飲食'),K('喝水'),K('排泄'),K('體重'),...(rows.some(row=>row.category===K('其他'))?[K('其他')]:[])]);
 return [
  `${scope.catName||t('毛孩')}${t('的看診摘要')}`,t('{start} 至 {end}', {start: String(scope.start||'').replaceAll('-','/'), end: String(scope.end||'').replaceAll('-','/')}),'',
  t('【期間總覽】'),...periodFacts(period),...(weight.line?[weight.line]:[]),'',
  t('【值得注意（依你記下的內容）】'),
  ...(notes.length?notes.map(note=>'・'+note):[t('・這段期間沒有記到軟便、腹瀉、血便、嘔吐、精神變差、食慾變差或吃下量少於提供量。')]),
  ...(coverage.length?['',t('【記錄完整度】'),...coverage.map(line=>'・'+line)]:[]),
  '',t('以上只整理已記下的內容，不是診斷；未記錄不代表沒有發生。每筆的時間與內容請看下方「來源」。')
 ].join('\n');
}
export function prepareSummary(data,options,keys){
 const scope=summaryScope(data,options),wanted=new Set(keys),sources=scope.sources.filter(s=>wanted.has(sourceKey(s)));
 if(!sources.length&&!hasCareContent(scope.careBrief))fail(t('請至少選擇一筆已保存的實際紀錄。'));
 if(sources.length!==wanted.size)fail(t('部分來源已變更或無法使用，請重新選擇。'));
 return {...scope,sources,text:summaryOverviewText(scope,sources),question:''};
}
export function saveSummary(data,draft,{reviewed=false,id=globalThis.crypto.randomUUID(),now=new Date().toISOString(),today=localCalendarDate()}={}){
 if(!reviewed)fail(t('請先一次核對摘要、問題與來源。'));
 if(typeof draft?.text!=='string'||!draft.text.trim()||draft.text.length>50000||typeof draft.question!=='string'||draft.question.length>2000)fail(t('摘要不可空白或過長，問題限 2000 字。'));
 requireActivePet(data,draft.catId,draft.archiveGeneration);
 const current=prepareSummary(data,{...draft,today},draft.sources.map(sourceKey));
 if(!equal(current.sources,draft.sources)||current.catName!==draft.catName)fail(t('來源或毛孩資料已改變，請返回重新整理及核對；這次未保存。'));
 if(!equal(current.careBrief||[],draft.careBrief||[])||!equal(current.weightTrend??null,draft.weightTrend??null))fail(t('毛孩資料、看診用藥或體重趨勢已改變，請返回重新整理及核對；這次未保存。'));
 if(typeof id!=='string'||!id||(data.careAISummaries||[]).some(s=>s.id===id))fail(t('摘要識別碼無效或重複。'));
 if(!Number.isFinite(Date.parse(now)))fail(t('保存時間無效。'));
 const mode=['cloud-ai-v1','phone-ai-v1'].includes(draft.mode)?draft.mode:SUMMARY_MODE;
 const saved={id,catId:draft.catId,journeyId:'',start:draft.start,end:draft.end,text:draft.text,question:draft.question,catName:draft.catName,mode,sourceSnapshots:structuredClone(draft.sources),sources:draft.sources.map(({id,kind})=>({id,kind})),...(Array.isArray(draft.careBrief)&&draft.careBrief.length?{careBrief:draft.careBrief.map(String)}:{}),createdAt:new Date(now).toISOString()};
 return {...data,careAISummaries:[...(data.careAISummaries||[]),saved]};
}
// Older journey summaries may only retain source IDs. Preserve that distinction.
export function savedSummarySources(s){return Array.isArray(s.sourceSnapshots)?s.sourceSnapshots:(s.sources||[]).map(source=>({...source,date:'',time:'',text:K('這份既有摘要未保存來源原文，僅保留引用編號。'),raw:''}));}
export function savedSummariesForCat(data,catId){
 return (data.careAISummaries||[]).filter(s=>s.catId===catId&&typeof s.text==='string').reverse()
  .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
export function summaryMissingObservations(summary){
 if(!Array.isArray(summary.sourceSnapshots))return null;
 const sources=[];
 for(const snapshot of summary.sourceSnapshots){
  if(snapshot.kind!=='record')continue;
  try{
   const row=JSON.parse(snapshot.raw);
   if(!row||typeof row.category!=='string')return null;
   sources.push(row);
  }catch{return null;}
 }
 const missing=summaryObservationCoverage([{kind:'record',sources}],[K('飲食'),K('喝水'),K('排泄'),K('體重')])
  .filter(item=>item.status!=='observed').map(item=>item.name);
 if(sources.some(row=>row.feeding&&String(row.feeding.eaten??'').trim()===''))missing.push(t('部分食品吃下量'));
 return missing;
}
const summaryModeLabel=mode=>{
 if(mode==='cloud-ai-v1')return t('進階模式整理與飼主核對。本次匯出在手機上完成。');
 if(mode==='phone-ai-v1')return t('手機模式離線整理與飼主核對。');
 return mode===SUMMARY_MODE?t('依原始紀錄彙整並由飼主編輯，未使用 AI。'):t('既有已儲存摘要。');
};
export function summaryPlainText(s){
 const sources=savedSummarySources(s);
 const phoneScope=s.mode===PHONE_SUMMARY_MODE?'\n'+phoneSummaryScopeLabel(sources):'';
 const complete=['phone-ai-v1','cloud-ai-v1'].includes(s.mode)&&Array.isArray(s.sourceSnapshots)
  ? `\n\n${t('完整期間摘要 · 本次所選 {count} 筆', {count: sources.length})}\n${completeSummaryText(s,sources)}`:'';
 return `${s.catName||t('毛孩')} ${t('· 已核對看診摘要')}\n${t('{start} 至 {end}', {start: String(s.start||'').replaceAll('-','/'), end: String(s.end||'').replaceAll('-','/')})}\n${summaryModeLabel(s.mode)}${phoneScope}\n\n${careBriefText(s.careBrief)?careBriefText(s.careBrief)+'\n\n':''}${summaryTextForExport(s)}${complete}\n\n${t('想問獸醫：')}\n${s.question||t('未填寫')}\n\n${t('參考紀錄：')}\n${sources.map((r,i)=>`${t('來源 {i}{date}{time}', {i: i+1, date: r.date?' · '+r.date:'', time: r.time?' '+r.time:''})}\n${r.raw?summaryReadableSource(r):summarySourceText(r)}`).join('\n\n')}\n\n${VET_LIMITS}\n${t('若有呼吸困難、昏倒或無法排尿，請立即聯絡獸醫，不要等待整理。')}`;
}
export function downloadSummary(s){const url=URL.createObjectURL(new Blob([summaryPlainText(s)],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=t('看診摘要-{start}-{end}.txt', {start: s.start, end: s.end});document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
// Export the reviewed snapshot, never a separate live range or current record set.
export function summaryHTML(s){const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<!doctype html><html lang="'+getLocale()+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(s.catName||t('毛孩'))+` ${t('· 已核對看診摘要')}</title><style>body{font:17px/1.7 system-ui,sans-serif;color:#29382f;max-width:800px;margin:32px auto;padding:0 20px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{font-size:11pt;margin:0}}</style><body><h1>`+escape(s.catName||t('毛孩'))+`${t('的看診摘要')}</h1><p>${t('已保存的核對版本。可使用瀏覽器列印，或另存 PDF。')}</p><pre>`+escape(summaryPlainText(s))+'</pre></body></html>';}
export function downloadSummaryHTML(s){const url=URL.createObjectURL(new Blob([summaryHTML(s)],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=t('看診摘要-{start}-{end}.html', {start: s.start, end: s.end});document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
