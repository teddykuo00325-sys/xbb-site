import {t, K, weekdayLabel} from './i18n.js?v=audit1117b';
import {displayStoredText,displayUserText,withStoredTexts} from './stored-text.js?v=i18n1';
import {eliminationKind} from './elimination-observation.js?v=8f5745b7843b';
import {uniqueRecordRows,recordIsLive} from './record-identity.js?v=8f5745b7843b';
import {FAMILY_SHARING_ENABLED} from './family-feature.js?v=8f5745b7843b';
import {calendarDay} from './today-overview-v29.js?v=8f5745b7843b';
import {careState,healthModel} from './health-summary-v31.js?v=photo-simplify1';
import {recordKindLabel} from './record-quantity.js?v=1';
// Display only: the stored category value stays '照護施作' (backups and filters depend on it).
// 其他值（含記錄方式 source）用 displayStoredText：查字典，也認得「文字快記・gemma… 本機整理・已核對」這類存檔句型。
export const categoryLabel=value=>value===K('飲食')?t('餵食'):value===K('聲音反應')?t('聲音探索'):value===K('照護施作')?t('疫苗與驅蟲'):displayStoredText(t(value));
// 列表上的種類：同一個「飲食」分「餵食／食慾」，「其他」可顯示「皮下輸液」「精神」（存檔的 category 不變）。
export const recordRowLabel=row=>[K('飲食'),K('其他')].includes(row?.category)||row?.careId?recordKindLabel(row):categoryLabel(row?.category);
const petLabel=name=>typeof name==='string'&&name.trim()?name.trim():'';
// `name` is the current pet's name; without it the receipt keeps the old wording.
export function observationReceipt(record,{updated=false,change=false,name=''}={}) {
 const suffix=t('{date} {time}{change}。',{date:record.date,time:record.time,change:change?t('，並標記生活變化'):''}),pet=petLabel(name);
 if(record.category===K('飲食')&&!record.feeding)return pet?(updated?t('已更新{pet}的食慾觀察：{suffix}', {pet, suffix}):t('食慾觀察已儲存到{pet}：{suffix}', {pet, suffix})):t('食慾觀察{status}：{suffix}', {status: updated?t('已更新'):t('已儲存'), suffix});
 if(pet)return updated?t('已更新{pet}的紀錄：{category}，{suffix}', {pet, category: categoryLabel(record.category), suffix}):t('已儲存到{pet}：{category}，{suffix}', {pet, category: categoryLabel(record.category), suffix});
 return t('{status}：{category}，{suffix}',{status:updated?t('已更新'):t('已儲存'),category:categoryLabel(record.category),suffix});
}
const dayNumber=date=>{const text=String(date??''),time=Date.parse(text+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(text)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===text?Math.floor(time/864e5):null;};
const isoFromDay=day=>new Date(day*864e5+432e5).toISOString().slice(0,10);
// The default records view: today and the 6 days before it (7 calendar days).
export function recentRange(today,days=7){const end=dayNumber(today);return end===null?{start:'',end:''}:{start:isoFromDay(end-days+1),end:today};}
// 「今天 11/12（週四）」「昨天 11/11（週三）」「11/10（週二）」; another year shows the year.
export function recordDayLabel(date,today){
 const day=dayNumber(date),now=dayNumber(today);
 if(day===null)return date?String(date):t('日期未填');
 const [y,m,d]=date.split('-'),week=t('（{weekday}）',{weekday:weekdayLabel(date)}),short=`${m}/${d}`;
 if(day===now)return t('今天 {date}{week}',{date:short,week});
 if(now!==null&&day===now-1)return t('昨天 {date}{week}',{date:short,week});
 return (String(today||'').slice(0,4)===y?short:`${y}/${short}`)+week;
}
// Rows are already sorted newest first by observation date and time; keep that order inside each day.
export function recordDateSections(rows,today){
 const sections=[],byDate=new Map();
 for(const row of rows){let section=byDate.get(row.date);if(!section){section={date:row.date,label:recordDayLabel(row.date,today),rows:[]};byDate.set(row.date,section);sections.push(section);}section.rows.push(row);}
 return sections;
}
// The handover filter only appears when such records exist (or it is already selected).
export function recordFilterCategories(rows=[],selected=K('全部')){
 return [K('全部'),K('飲食'),K('嘔吐'),K('體重'),K('喝水'),K('排泄'),K('其他'),K('聲音反應'),K('照護施作'),K('交接')].filter(value=>value!==K('交接')||selected===K('交接')||rows.some(row=>row?.category===K('交接')));
}
export function quickObservationReceipt(record,name) {
 if(record.category===K('飲食')&&!record.feeding)return t('食慾觀察已儲存：{name}，{date} {time}。', {name, date: record.date, time: record.time});
 return t('已記下 {name} 的{kind}紀錄', {name, kind: record.category===K('其他')?recordRowLabel(record):categoryLabel(record.category)});
}
// Names are historical snapshots, never resolved through today's member list.
export const isHandoverRecord=row=>Boolean(row&&(row.category===K('交接')||row.kind===K('交接')||row.source===K('家庭交接')||row.handover));
export function recordAttribution(row){return typeof row?.createdBy?.name==='string'&&row.createdBy.name.trim()?t('由{name}記錄', {name: row.createdBy.name}):'';}
export function careDoseAuthor(item,date){
 const event=[...(Array.isArray(item?.familyEvents)?item.familyEvents:[])].reverse().find(event=>event&&event.date===date&&['completed','dose-removed'].includes(event.type));
 return event?.type==='completed'&&typeof event.actor?.name==='string'&&event.actor.name.trim()?event.actor:null;
}
export function RecordAttribution({react:R,row,detail=false}){
 if(!FAMILY_SHARING_ENABLED&&row?.item&&row.category===K('照護施作'))return null;
 const text=recordAttribution(row),handover=row?.handover,from=handover?.from?.name,to=handover?.to?.name;
 return R.createElement(R.Fragment,null,text&&R.createElement('small',{className:'family-record-author',style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},text),handover&&from&&to&&R.createElement(detail?'p':'small',{className:'family-handover-parties',style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},t('交接人：{from} · 接手人：{to}', {from, to})),detail&&handover&&R.createElement('p',{className:'microcopy left'},t('交接紀錄供家人分工查看，不納入看診摘要。')));
}

const live=recordIsLive;
export function careRecordRows(items=[],{catId,today,isDemo=()=>false}={}){
 return items.filter(item=>live(item,catId)&&!item.demo&&!isDemo(item)&&!String(item.source||'').includes(K('示範'))).flatMap(item=>[...new Set([...(item.history||[]),item.last].filter(date=>calendarDay(date)!==null&&(!today||date<=today)))].map(date=>({id:`care:${item.id}:${date}`,careId:item.id,date,time:'',category:K('照護施作'),text:item.name,kind:item.kind,note:item.note||'',source:K('完成紀錄'),...(careDoseAuthor(item,date)?{createdBy:careDoseAuthor(item,date)}:{}),item})));
}
export function recordSearchRows(entries=[],careItems=[],foodCards=[],options={}){
 const cards=new Map(foodCards.map(card=>[card.id,card]));
 return [...uniqueRecordRows(entries.filter(row=>live(row,options.catId)),{catId:options.catId}).map(row=>({...row,foodName:(cards.get(row.feeding?.foodId)?.name||row.feeding?.quickName||'')+(cards.get(row.feeding?.foodId)?.archived?t('（此食品卡已刪除）'):''),isDemo:!!options.isDemoEntry?.(row)})),...uniqueRecordRows(careRecordRows(careItems,options),{catId:options.catId})].sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||''))||a.id.localeCompare(b.id));
}
export function filterRecordRows(rows,{category=K('全部'),metric=null,query='',date='',scope='day',start='',end=''}={}){
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return rows.filter(row=>(category===K('全部')||row.category===category)&&(metric!=='mood'||row.metric==='mood')&&(!['urine','bowel'].includes(metric)||eliminationKind(row)===(metric==='urine'?'urine':'stool'))&&(!['week','recent'].includes(scope)||(!start||row.date>=start)&&(!end||row.date<=end))&&(!terms.length&&scope==='day'&&date?row.date===date:true)&&terms.every(term=>[row.text,displayStoredText(row.text),row.foodName,row.date,row.amount,row.unit,categoryLabel(row.category),recordRowLabel(row),row.category,row.kind,row.note,displayStoredText(row.note),row.createdBy?.name,row.handover?.from?.name,row.handover?.to?.name].filter(v=>v!==undefined).join(' ').toLocaleLowerCase().includes(term)));
}
export function nearestRecordDate(rows,date){const day=calendarDay(date);if(day===null)return null;return [...new Set(rows.map(r=>r.date))].filter(d=>calendarDay(d)!==null&&d!==date).sort((a,b)=>Math.abs(calendarDay(a)-day)-Math.abs(calendarDay(b)-day)||b.localeCompare(a))[0]||null;}
export function calendarCells(month){if(!/^\d{4}-\d{2}$/.test(month))return [];const first=month+'-01';if(calendarDay(first)===null)return [];const start=new Date(first+'T12:00:00Z'),offset=start.getUTCDay();const next=new Date(start);next.setUTCMonth(next.getUTCMonth()+1);const count=(next-start)/864e5;return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0'))];}
export function shiftMonth(month,delta){const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+delta);return date.toISOString().slice(0,7);}
export const careNeedsScheduleText=item=>item.next?t('原排定日期已保留，請照獸醫說的確認下次日期；仍在照顧時間表上。'):t('尚未安排下次日期，仍在照顧時間表上。');
export function careReceipt(item,date,today,name=''){const state=careState(item,today),pet=petLabel(name);return t('{status}：{name}，完成日 {date}。', {status: pet?t('已登記到{pet}', {pet}):t('已登記'), name: item.name, date})+(state==='needs-scheduling'?careNeedsScheduleText(item):state==='paused'?t('提醒目前已暫停。'):t('這次完成已保存。'));}
export function requiredFieldError(props){if(!props.required)return '';const value=String(props.value??'').trim(),name=props['aria-label']||t('此欄位');return value?'':t('請填寫{name}。',{name:name.replace(/（.*?）|\s*\(.*?\)/g,'')});}

export function healthNoticesHTML(data){const items=healthModel(data).highlights,escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return items.length?'<section><h2>'+t('健康提醒')+'</h2>'+items.map(item=>'<article><h3>'+escape(item.title)+'</h3><p>'+escape(item.text)+'</p></article>').join('')+'<p>'+t('依原有觀察期間計算，不隨彙總期間變更，不代表診斷。')+'</p></section>':'';}
