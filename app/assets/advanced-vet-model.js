import {eliminationKind} from './elimination-observation.js?v=8f5745b7843b';
import {summarizeDietRows,dietSummaryLines} from './diet-observations-model.js?v=photo-simplify1';
import {calendarDay,localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';
import {eligibleRecords,stoolState,stateLabel} from './health-summary-v31.js?v=photo-simplify1';
import {careRecordRows} from './o-records-v59.js?v=photo-simplify1';
import {profileBriefLines,medOutcomeLines} from './summary-care-brief.js?v=photo-simplify1';
import {recordKindLabel,recordAmountText,careDoneName,appetiteStatusOf,APPETITE_LABELS,isSubqFluid,periodTotalLine,dailyTotals,dailyCellText,dailyMetricLabel,dailyMetricUnit,DAILY_METRIC_IDS,weightChange,weightChangeText,weightAdvice,spanText,WEIGHT_TREND_DAYS} from './record-quantity.js?v=1';
import {t, K, getLocale, longDate} from './i18n.js?v=audit1117b';
import {displayStoredText,withStoredTexts} from './stored-text.js?v=i18n1';

const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const demo=row=>row?.demo===true||String(row?.source||'').includes(K('示範'));
const live=(row,catId)=>row&&row.ownership!=='unconfirmed'&&(!own(row,'catId')||row.catId!==null&&row.catId===catId)&&!row.deleted&&!row.deletedAt&&!row.isDeleted&&!row.draft&&!['draft','deleted'].includes(row.status)&&row.confirmed!==false&&!demo(row)&&![K('交接'),K('家庭交接')].includes(row.category)&&![K('交接'),K('家庭交接')].includes(row.kind)&&row.source!==K('家庭交接')&&!row.handover;
const order=(a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||''))||String(a.id).localeCompare(String(b.id));
const unique=rows=>{const seen=new Set();return rows.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true})};
const rangeRows=(rows,start,end)=>rows.filter(row=>row.date>=start&&row.date<=end);
const days=rows=>new Set(rows.map(row=>row.date)).size;
export const vetRound=n=>Number(n.toPrecision(10)).toString();
export const vetShift=(date,offset)=>new Date((calendarDay(date)+offset)*86400000).toISOString().slice(0,10);
export function vetRangeError(start,end,today=localCalendarDate()){
 if(calendarDay(start)===null||calendarDay(end)===null||calendarDay(today)===null)return t('請填寫有效的開始與結束日期。');
 if(start>end)return t('結束日期不可早於開始日期。');
 if(end>today)return t('只能整理今天或以前的紀錄。');
 return '';
}
export function vetSourceData({entries=[],changes=[],careItems=[],foodCards=[],catId,today=localCalendarDate(),isDemo=demo,isDemoChange=demo,isDemoCare=demo}={}){
 if(calendarDay(today)===null)return {records:[],changes:[],care:[],foodCards};
 const records=eligibleRecords(entries.filter(r=>live(r,catId)),today,catId,isDemo);
 const events=unique(changes.filter(r=>live(r,catId)&&!isDemoChange(r)&&typeof r.id==='string'&&r.id&&calendarDay(r.date)!==null&&r.date<=today).sort(order));
 const care=unique(careRecordRows(careItems.filter(r=>live(r,catId)),{catId,today,isDemo:isDemoCare})).sort(order);
 return {records,changes:events,care,foodCards};
}
function measured(value){if(!['string','number'].includes(typeof value)||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
export function vetWeightKg(row){if(row.category!==K('體重')||!['kg',K('公斤'),'g',K('公克')].includes(row.unit))return null;const n=measured(row.amount);return n!==null&&n>0?n/(['g',K('公克')].includes(row.unit)?1000:1):null;}
function quantity(row){
 const f=row.feeding;if(!f)return null;
 const eaten=measured(f.eaten),provided=measured(f.provided),providedMissing=f.provided===null||f.provided===undefined||typeof f.provided==='string'&&!f.provided.trim(),raw=String(f.unit||'').trim();
 if(eaten===null||!raw||(!providedMissing&&provided===null)||(provided!==null&&eaten>provided))return null;
 const scale=['kg',K('公斤')].includes(raw)?1000:1,unit=['kg',K('公斤'),'g',K('公克')].includes(raw)?'g':['ml',K('毫升')].includes(raw)?'ml':raw;
 return Number.isFinite(eaten*scale)?{amount:eaten*scale,unit}:null;
}
export function vetFoodGroups(rows,foodCards=[]){
 const cards=new Map(foodCards.map(card=>[card.id,card])),groups=new Map();
 for(const row of rows.filter(row=>row.category===K('飲食')&&row.feeding)){
  const f=row.feeding,card=cards.get(f?.foodId),q=quantity(row);
  // A quick name is a display label, not a stable identity for comparing foods.
  const key=f?.foodId?'food:'+f.foodId:'unlinked:'+row.id;
  if(!groups.has(key))groups.set(key,{key,foodId:f?.foodId||null,name:card?.name||f?.quickName||t('未連結食品'),version:card?.version??null,missingCard:!!f?.foodId&&!card,rows:[],quantities:new Map(),unknown:0});
  const group=groups.get(key);group.rows.push(row);
  if(q){if(!group.quantities.has(q.unit))group.quantities.set(q.unit,{unit:q.unit,total:0,rows:[]});const item=group.quantities.get(q.unit);if(Number.isFinite(item.total+q.amount)){item.total+=q.amount;item.rows.push(row);}else group.unknown++;}else group.unknown++;
 }
 return [...groups.values()].map(g=>({...g,recordedDays:days(g.rows),quantities:[...g.quantities.values()].map(q=>({...q,recordedDays:days(q.rows)}))}));
}
export function vetPeriod(data,start,end){
 const rows=rangeRows(data.records,start,end),changes=rangeRows(data.changes,start,end),care=rangeRows(data.care,start,end),stool=rows.filter(row=>row.category===K('排泄')&&eliminationKind(row)==='stool'),urine=rows.filter(row=>row.category===K('排泄')&&eliminationKind(row)==='urine'),unclassifiedElimination=rows.filter(row=>row.category===K('排泄')&&eliminationKind(row)==='unknown'),weight=rows.filter(row=>vetWeightKg(row)!==null),counts={normal:0,soft:0,diarrhea:0,blood:0,unknown:0};
 stool.forEach(row=>counts[stoolState(row)]++);
 return {start,end,dayCount:Math.max(0,calendarDay(end)-calendarDay(start)+1),rows,changes,care,recordedDays:days(rows),foods:vetFoodGroups(rows,data.foodCards),diet:summarizeDietRows(rows,data.foodCards),weight,weightUnknown:rows.filter(row=>row.category===K('體重')&&vetWeightKg(row)===null),stool,urine,unclassifiedElimination,stoolDays:days(stool),stoolCounts:counts,subq:rows.filter(isSubqFluid),other:rows.filter(row=>!isSubqFluid(row)&&(![K('飲食'),K('體重'),K('排泄')].includes(row.category)||row.category===K('飲食')&&!row.feeding))};
}
// 體重另看結束日為止的近 3 個月（Ian 2026-11-14），只用已記錄的有效量測；只留比對需要的欄位。
export function vetWeightTrend(records=[],end,days=WEIGHT_TREND_DAYS){
 if(calendarDay(end)===null)return null;
 const start=vetShift(end,1-days),rows=records.filter(row=>row.date>=start&&row.date<=end&&vetWeightKg(row)!==null).map(row=>({id:row.id,date:row.date,time:row.time||'',kg:vetWeightKg(row)}));
 const change=weightChange(rows);
 return change?{start,end,days,count:change.count,first:change.first,last:change.last,kg:change.kg,percent:change.percent,spanDays:change.spanDays}:rows.length===1?{start,end,days,count:1,first:rows[0],last:rows[0],kg:0,percent:0,spanDays:0}:null;
}
export function weightTrendLines(trend){
 if(!trend)return {line:'',advice:''};
 if(trend.count<2)return {line:t('體重近 3 個月：只有 1 筆量測（{date} {kg} kg），尚無可比較的變化。', {date: trend.first.date.slice(5).replace('-','/'), kg: vetRound(trend.first.kg)}),advice:''};
 return {line:t('體重近 3 個月（{count} 筆量測）：{trend}。', {count: trend.count, trend: weightChangeText(trend)}),advice:weightAdvice(trend)};
}
export function buildVetPackage(input={}){
 if(input.saveStatus&&input.saveStatus!=='saved')return {error:t('仍有未保存的變更，請先完成或重試本機保存，再整理與匯出。')};
 const {start,end,today=localCalendarDate(),profile={},question=''}=input,error=vetRangeError(start,end,today);
 if(error)return {error};
 const data=vetSourceData(input);
 return {...vetPeriod(data,start,end),profile:{name:profile.name||t('毛孩'),age:profile.age||'',...(profile.ageMonths!==undefined?{ageMonths:profile.ageMonths}:{}),breed:profile.breed||'',sex:profile.sex&&profile.sex!==K('未填')?String(profile.sex):'',note:profile.note||'',...Object.fromEntries(['birthDate','birthEstimated','species','neutered'].filter(key=>profile[key]!==undefined&&profile[key]!==null&&profile[key]!=='').map(key=>[key,profile[key]]))},careBrief:Array.isArray(input.careBrief)?input.careBrief.map(String):[],question:String(question).slice(0,2000),today,error:'',data};
}
// 完整匯出不沿用摘要的三次看診／二十行上限。日期以資料包結束日為準，避免把現在用藥混進歷史區間。
export function vetCareExportLines(root,catId,start,end,{now=Date.now()}={}){
 if(!catId||calendarDay(start)===null||calendarDay(end)===null||start>end)return [];
 const visits=(root?.vetVisits||[]).filter(v=>v&&v.catId===catId&&!v.deletedAt&&!demo(v)&&calendarDay(v.date)!==null&&v.date<=end)
  .sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 const lines=[],ymd=d=>d.replaceAll('-','/'),windowStart=vetShift(end,-13);
 for(const v of visits.filter(v=>v.date>=start))lines.push(`${t('看診：{date}{reason}', {date: ymd(v.date), reason: v.reason?' '+v.reason:''})}${v.notes?t('，獸醫交代：')+v.notes:''}${v.nextVisit?t('，原登記回診 ')+ymd(v.nextVisit):''}`);
 for(const v of visits)for(const m of v.meds||[]){
  if(!m||calendarDay(m.start)===null||calendarDay(m.end)===null||m.start>m.end)continue;
  // A changed regimen must not erase previously recorded dose outcomes.
  if(m.start>end||m.end<start){const history=m.doseOutcomes?medOutcomeLines(m,start,end):[];if(history.length)lines.push(...history,t('已記錄狀況不代表已完成用藥；未記錄不等於沒吃，不推算補餵。'));continue;}
  const stopped=calendarDay(m.stoppedAt)!==null?m.stoppedAt:'';
  if(stopped&&stopped<=start){const history=m.doseOutcomes?medOutcomeLines(m,start,end):[];if(history.length)lines.push(...history,t('已記錄狀況不代表已完成用藥；未記錄不等於沒吃，不推算補餵。'));continue;}
  const times=[...new Set((m.times||[]).filter(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort();
  const active=m.end>=end&&!(stopped&&stopped<=end),label=active?t('截至 {end} 用藥', {end: ymd(end)}):t('期間用藥');
  lines.push(`${label}${t('：')}${m.name||t('未填藥名')}${m.dose?' '+m.dose:''}${t('，')}${times.length?t('每天 ')+times.join(t('、')):t('吃藥時間未記錄')}${t('，{start} 起，', {start: ymd(m.start)})}${stopped&&stopped<=end?ymd(stopped)+t(' 起已停藥'):m.end==='9999-12-31'?t('長期吃（直到獸醫說停）'):t('吃到 ')+ymd(m.end)}${t('（來源看診 {date}）', {date: ymd(v.date)})}`);
  let due=0,checked=0,unsuccessful=0,uncertain=0;const taken=new Set(Array.isArray(m.taken)?m.taken:[]);
  for(let i=0;i<14;i++){
   const date=vetShift(windowStart,i);
   if(date<m.start||date>m.end||stopped&&date>=stopped)continue;
   const [y,month,day]=date.split('-').map(Number);
   for(const time of times){const [hour,minute]=time.split(':').map(Number);if(new Date(y,month-1,day,hour,minute).getTime()>now)continue;due++;const key=date+'T'+time;if(taken.has(key))checked++;else if(m.doseOutcomes?.[key]?.status==='unsuccessful')unsuccessful++;else if(m.doseOutcomes?.[key]?.status==='uncertain')uncertain++;}
  }
  lines.push(`${t('近 14 天紀錄勾選率（{windowStart}～{end}）：', {windowStart: ymd(windowStart), end: ymd(end)})}${due?`${checked}/${due}${t('（')}${Math.round(checked/due*100)}%${t('）')}`:t('尚無已到時間的排定項目')}${t('；只計已到時間的排定項目，未勾不等於沒吃，不能當作實際服藥率。')}`);
  if(m.doseOutcomes){
   lines.push(t('用藥狀況：已吃 {taken} 次／未成功 {unsuccessful} 次／不確定 {uncertain} 次／尚未記錄 {unrecorded} 次', {taken:checked,unsuccessful,uncertain,unrecorded:due-checked-unsuccessful-uncertain}));
   const outcomes=medOutcomeLines(m,start,end);
   if(outcomes.length)lines.push(...outcomes,t('已記錄狀況不代表已完成用藥；未記錄不等於沒吃，不推算補餵。'));
  }
 }
 return lines;
}
export function buildEventComparison(input={}){
 if(input.saveStatus&&input.saveStatus!=='saved')return {error:t('仍有未保存的變更，請先完成或重試本機保存，再整理與匯出。')};
 const {eventId,windowDays=7,today=localCalendarDate()}=input,data=vetSourceData(input),event=data.changes.find(row=>row.id===eventId),size=Number(windowDays);
 if(!event)return {error:t('此生活變化是示範、已移除或無法確認歸屬，沒有納入實際對照。')};
 if(![3,7,14,30].includes(size))return {error:t('請選擇前後 3、7、14 或 30 天。')};
 const beforeStart=vetShift(event.date,-size),beforeEnd=vetShift(event.date,-1),afterStart=vetShift(event.date,1),afterTarget=vetShift(event.date,size),afterEnd=afterTarget>today?today:afterTarget;
 const before=vetPeriod(data,beforeStart,beforeEnd),after=vetPeriod(data,afterStart,afterEnd),sameDay=vetPeriod(data,event.date,event.date);
 const first=before.weight.at(-1),last=after.weight.at(-1);
 return {error:'',event,windowDays:size,before,after,sameDay,remainingDays:Math.max(0,calendarDay(afterTarget)-calendarDay(today)),weightDelta:first&&last&&!event.uncertain?{first,last,kg:vetWeightKg(last)-vetWeightKg(first)}:null,data};
}
export const VET_LIMITS=t('只整理此毛孩已保存、非示範且歸屬已確認的紀錄。未記錄不代表 0、正常或沒有發生；有記錄也不保證涵蓋整天。不推論原因、不提供診斷或用藥建議。');
export function foodGroupLines(group){return [group.name+(group.version!==null?t(' · 當時版本 ')+group.version:'')+(group.missingCard?t('（食品卡已無法取得）'):''),t('{count} 筆餵食紀錄 · {recordedDays} 天有記錄', {count: group.rows.length, recordedDays: group.recordedDays}),...group.quantities.map(q=>t('已記錄吃下量 {total} {unit}（{count} 筆、{recordedDays} 天）', {total: vetRound(q.total), unit: t(q.unit,{count:q.total,context:'quantity'}), count: q.rows.length, recordedDays: q.recordedDays})),...(group.unknown?[t('{unknown} 筆吃下量未填或無法計算，不當成 0', {unknown: group.unknown})]:[])];}
export function periodFacts(period){
 const weights=period.weight,first=weights[0],last=weights.at(-1);
 return [t('{dayCount} 天中 {recordedDays} 天有日常紀錄，共 {count} 筆。', {dayCount: period.dayCount, recordedDays: period.recordedDays, count: period.rows.length}),weights.length?t('體重：{count} 筆量測；最早 {date} {time} {first} kg，最近 {date2} {time2} {last} kg。', {count: weights.length, date: first.date, time: first.time, first: vetRound(vetWeightKg(first)), date2: last.date, time2: last.time, last: vetRound(vetWeightKg(last))}):t('體重：尚無可計算的量測。'),t('尿尿觀察 {count} 筆；未分類排泄 {count2} 筆。便便：{count3} 筆，{stoolDays} 天有記錄；', {count: period.urine.length, count2: period.unclassifiedElimination.length, count3: period.stool.length, stoolDays: period.stoolDays})+Object.entries(period.stoolCounts).map(([key,n])=>t('{key} {n} 筆', {key: stateLabel(key), n})).join(t('、'))+t('。'),
  // 2026-11-14：喝水 ml、尿團數、皮下輸液 ml 的期間合計；沒填量的不當 0，沒有紀錄就不寫。
  ...['water','litter','subq'].map(metric=>periodTotalLine(period.rows||[],{start:period.start,end:period.end,metric})).filter(Boolean)];
}
// 2026-11-14：英文介面把描述中夾的存檔中文（紀錄文字、註記、照護名稱）換成英文；繁中原樣。
export function sourceDescription(row,kind='record',includeInternal=true){
 return withStoredTexts(sourceDescriptionRaw(row,kind,includeInternal),row?[row.text,row.note,row.kind,row.name].filter(v=>typeof v==='string'&&v):[]);
}
function sourceDescriptionRaw(row,kind='record',includeInternal=true){
 // 2026-11-14：顯示飼主填的提醒名稱（藥名、劑量），種類用「疫苗與驅蟲」。
 if(kind==='care')return `${t('疫苗與驅蟲完成：{row}（', {row: careDoneName(row)})}${row.kind||t('照護')}）`;
 if(kind==='change')return `${row.kind}${row.uncertain?t('（日期約略）'):''}：${row.note||t('未填說明')}${includeInternal&&row.sourceEntryId?t(' · 關聯原紀錄 ')+row.sourceEntryId:''}`;
 // 種類用顯示名稱（餵食／食慾／皮下輸液…）；標題已寫的數量與份量不再重複（Ian 2026-11-14）。
 const text=String(row.text||t('未填說明')),amount=String(row.amount??'').trim(),unit=String(row.unit||'').trim(),f=row.feeding;
 const amountShown=!amount||f||text.includes(amount+' '+unit)||text.includes(amount+unit);
 const appetite=appetiteStatusOf(row),appetiteText=appetite&&!text.includes(APPETITE_LABELS[appetite])?' · '+APPETITE_LABELS[appetite]:'';
 const portion=v=>String(v??'').trim()||t('未填');
 const feedingText=f?(/餵食量/.test(text)&&/吃下量?/.test(text)?'':` ${t('· 餵食量 {provided} {unit}／吃下量 {eaten} {unit}', {provided: portion(f.provided), unit: f.unit||'', eaten: portion(f.eaten)})}`.replace(/ +／/g,'／').trimEnd())+(includeInternal?t('／食品 ID ')+(f.foodId||t('未連結')):'')+(f.noEatingConfirmed===true?t(' · 主人明確確認完全不進食'):''):'';
 return `${recordKindLabel(row)}：${text}${amountShown?'':' · '+(recordAmountText(row,text)||t('數量 ')+amount+(unit?' '+unit:''))}${appetiteText}${row.category===K('排泄')?' · '+(eliminationKind(row)==='stool'?stateLabel(stoolState(row)):eliminationKind(row)==='urine'?t('尿尿觀察'):t('排泄未分類')):''}${feedingText}`;
}
// 匯出檔的產生時間用裝置當地時間（台灣使用者看到 UTC 會以為差 8 小時）。
const two=n=>String(n).padStart(2,'0');
export const localStamp=d=>{const t=d instanceof Date&&!Number.isNaN(d.getTime())?d:new Date();return `${t.getFullYear()}/${two(t.getMonth()+1)}/${two(t.getDate())} ${two(t.getHours())}:${two(t.getMinutes())}`;};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function vetExportHTML(report,{comparison=null,generatedAt=new Date()}={}){
 if(report.error)throw Error(report.error);
 const sources=[],map=new Map();
 // 每日加總表（喝水 ml、尿團數、皮下輸液 ml）：未記錄的天寫「未記錄」，不當 0；期間超過 31 天只列合計。
 const dailyTable=p=>{
  const metrics=DAILY_METRIC_IDS.filter(metric=>dailyTotals(p.rows||[],{end:p.end,days:p.dayCount,metric}).some(d=>d.status!=='missing'));
  if(!metrics.length||!p.dayCount||p.dayCount>31)return '';
  const table=Object.fromEntries(metrics.map(metric=>[metric,dailyTotals(p.rows||[],{end:p.end,days:p.dayCount,metric})]));
  return `<h3>${t('每日加總')}</h3><table style="border-collapse:collapse;width:100%"><thead><tr><th style="text-align:left">${t('日期')}</th>${metrics.map(m=>`<th style="text-align:left">${esc(dailyMetricLabel(m))}（${esc(dailyMetricUnit(m))}）</th>`).join('')}</tr></thead><tbody>${table[metrics[0]].map((d,i)=>`<tr><td>${esc(d.date.slice(5).replace('-','/'))}</td>${metrics.map(m=>`<td>${esc(dailyCellText(table[m][i],dailyMetricUnit(m)))}</td>`).join('')}</tr>`).join('')}</tbody></table><p>${t('未記錄不代表 0；喝水量不含水碗補水量，尿團數不等於排尿次數。')}</p>`;
 };
 const weightTrend=report.data?vetWeightTrend(report.data.records||[],report.end):null,weightLines=weightTrendLines(weightTrend);
 const idFor=(row,kind)=>{const key=kind+':'+row.id;if(!map.has(key)){const id='vet-source-'+(sources.length+1);map.set(key,id);sources.push({row,kind,id});}return map.get(key);};
 const links=(rows,kind='record')=>rows.length?'<ul>'+rows.map(row=>`<li><a href="#${idFor(row,kind)}">${esc(row.date+' '+(row.time||'')+' · '+sourceDescription(row,kind,false))}</a></li>`).join('')+'</ul>':`<p>${t('尚未記錄，不代表沒有發生。')}</p>`;
 const period=(p,title)=>!p.dayCount?`<section><h2>${esc(title)}</h2><p>${t('事件後的日期尚未到，暫無可回顧期間。')}</p></section>`:`<section><h2>${esc(title)}</h2><p>${t('{start} 至 {end} · {dayCount} 天', {start: String(esc(p.start)||'').replaceAll('-','/'), end: String(esc(p.end)||'').replaceAll('-','/'), dayCount: p.dayCount})}</p>${periodFacts(p).map(line=>`<p>${esc(line)}</p>`).join('')}<h3>${t('食品與吃下量')}</h3>${p.foods.length?p.foods.map(group=>`<article>${foodGroupLines(group).map(line=>`<p>${esc(line)}</p>`).join('')}${links(group.rows)}</article>`).join(''):`<p>${t('尚無餵食紀錄，不代表沒有吃飯。')}</p>`}<h3>${t('飲食熱量與零食觀察')}</h3>${dietSummaryLines(p.diet).map(line=>`<p>${esc(line)}</p>`).join('')}${p.diet.details.length?'<ul>'+p.diet.details.map(d=>`<li>${esc(d.row.date+' '+d.row.time+' · '+d.name+' · '+(d.kcal===null?d.kcalReason:d.formula+' ≈ '+vetRound(d.kcal)+' kcal'))}</li>`).join('')+'</ul>':''}<h3>${t('體重')}</h3>${links([...p.weight,...p.weightUnknown].sort(order))}<h3>${t('便便')}</h3>${links(p.stool)}<h3>${t('尿尿')}</h3>${links(p.urine)}<h3>${t('排泄（未分類）')}</h3>${links(p.unclassifiedElimination)}<h3>${t('皮下輸液')}</h3>${links(p.subq||[])}${dailyTable(p)}<h3>${t('用藥與疫苗驅蟲')}</h3><p>${t('只列已記下完成，排定提醒不代表已用藥。名稱與劑量照飼主在提醒填的內容；實際用藥請以獸醫處方與藥袋為準。')}</p>${links(p.care,'care')}<h3>${t('生活變化')}</h3>${links(p.changes,'change')}<h3>${t('喝水、食慾、精神與其他觀察')}</h3>${links(p.other)}</section>`;
 let content=(report.preparation?.length?`<section><h2>${t('回診準備與問獸醫清單（飼主勾選／填寫）')}</h2><p>${t('這是目前已儲存的回診清單，與上方歷史紀錄期間分開；準備勾選不代表已完成醫療處置。')}</p><ul>${report.preparation.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></section>`:'')+period(report,t('選取期間的照護資料'));
 if(comparison&&!comparison.error){const c=comparison;content+=`<section><h2>${t('{kind}前後對照', {kind: esc(c.event.kind)})}</h2><p>${t('事件日：{date}', {date: esc(c.event.date)})}${c.event.uncertain?t('（日期約略，分組僅供回顧，不計算差值）'):''}</p>${links([c.event],'change')}<p>${t('事件當天獨立列出，不混入前後兩側。未來日期不計入，後續尚有 {remainingDays} 天未到。區間長度與記錄完整度可能不同，不用筆數判定改善或惡化。', {remainingDays: c.remainingDays})}</p>${period(c.before,t('變化前'))}${period(c.sameDay,t('事件當天'))}${period(c.after,t('變化後'))}${c.weightDelta?`<p>${t('事件前最後一筆與事件後最近一筆體重相差 {kg} kg，量測時間與條件可能不同。', {kg: esc((c.weightDelta.kg>0?'+':'')+vetRound(c.weightDelta.kg))})}</p>`:''}</section>`;}
 const details=sources.map(({row,kind,id})=>`<article id="${id}"><h3>${esc(row.date+' '+(row.time||'')+' · '+(kind==='change'?row.kind:kind==='care'?t('疫苗與驅蟲'):recordKindLabel(row)))}</h3><p>${esc(sourceDescription(row,kind,false))}</p>${row.source?`<p>${t('記錄方式：{source}', {source: esc(displayStoredText(row.source))})}</p>`:''}${row.createdBy?.name?`<p>${t('原記錄者：{name}', {name: esc(row.createdBy.name)})}</p>`:''}</article>`).join('');
 return `<!doctype html><html lang="${getLocale()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t('{name} · 看診資料包', {name: esc(report.profile.name)})}</title><style>body{font:16px/1.65 system-ui,sans-serif;max-width:850px;margin:32px auto;padding:0 20px;color:#25332d}section,article{break-inside:avoid;margin:20px 0}h1{font-size:26px}h2{font-size:21px;border-bottom:1px solid #b7c3b9;padding-bottom:8px}h3{font-size:17px}p,li{overflow-wrap:anywhere;white-space:pre-wrap}a{color:#335c4a}article{border-left:3px solid #d6ded8;padding-left:14px}.note{background:#f0f4f1;padding:16px}@media print{body{margin:0;font-size:11pt}a{color:inherit;text-decoration:none}section,article{break-inside:auto}}</style></head><body><h1>${t('{name} · 看診資料包', {name: esc(report.profile.name)})}</h1><p>${t('選取期間：{start} 至 {end}', {start: String(esc(report.start)||'').replaceAll('-','/'), end: String(esc(report.end)||'').replaceAll('-','/')})}<br>${t('產生時間：{generatedAt}', {generatedAt: esc(getLocale()==='en'?longDate(generatedAt instanceof Date&&!Number.isNaN(generatedAt.getTime())?generatedAt:new Date())+' '+localStamp(generatedAt).slice(-5):localStamp(generatedAt))})}</p><p class="note">${t('{VET_LIMITS}此檔案由使用者自行保存，沒有自動傳送給醫院或其他人。', {VET_LIMITS: esc(VET_LIMITS)})}</p>${profileBriefLines(report.profile).map(line=>`<p>${esc(line)}</p>`).join('')}${weightLines.line?`<section><h2>${t('體重近 3 個月')}</h2><p>${esc(weightLines.line)}</p>${weightLines.advice?`<p>${esc(weightLines.advice)}</p>`:''}<p>${t('只比較已記錄的量測首末兩筆，量測時間與條件可能不同；不代表診斷。')}</p></section>`:''}${report.careBrief?.length?`<section><h2>${t('看診與用藥')}</h2><ul>${report.careBrief.map(line=>`<li>${esc(line)}</li>`).join('')}</ul><p>${t('照飼主記下的看診與用藥整理；用藥內容請以獸醫處方與藥袋為準。')}</p></section>`:''}${report.question?`<section><h2>${t('僅這份資料包的補充問題（使用者填寫）')}</h2><p>${esc(report.question)}</p></section>`:''}${content}<section><h2>${t('完整來源明細')}</h2>${details||`<p>${t('此期間尚無符合條件的來源。')}</p>`}</section></body></html>`;
}
export function downloadVetPackage(report,options={}){
 const html=vetExportHTML(report,options),blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=t('毛孩小本本-{_}-看診資料包-{start}-{end}.html', {_: report.profile.name.replace(/[\\/:*?"<>|]/g,'_'), start: report.start, end: report.end});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return {html,filename:a.download};
}
