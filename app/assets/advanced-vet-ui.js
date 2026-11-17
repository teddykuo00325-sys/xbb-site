import {openCareWorkspace} from "./care-journey-ui.js?v=photo-simplify1";
import {DietSummary} from './diet-observations-ui.js?v=photo-simplify1';
import {buildVetPackage,buildEventComparison,downloadVetPackage,VET_LIMITS,foodGroupLines,periodFacts,sourceDescription,vetRound,vetShift,vetSourceData,vetCareExportLines} from './advanced-vet-model.js?v=photo-simplify1';
import {careBriefLines} from './summary-care-brief.js?v=photo-simplify1';
import {exportPreparation} from './vet-preparation-ui.js?v=1';
import {t, K, tn} from './i18n.js?v=audit1117b';

// 2026-11-14：匯出給獸醫的資料包要帶上目前用藥與看診紀錄（存在根層 vetVisits，靠 root 讀）。
const exportCareBrief=(input,start,end)=>{
 const data=input.root?.get?.()?.data;if(!data)return [];
 return [...vetCareExportLines(data,input.catId,start,end),...careBriefLines(data,input.catId,input.careItems||[],end,start).filter(line=>line.startsWith(K('照顧時間表：')))];
};

function SourceList({react:R,rows,kind='record',onRecord,onChange,onCare,title=t('查看原始紀錄')}){
 const h=R.createElement;
 if(!rows.length)return h('p',{className:'av-missing'},t('尚未記錄，不代表沒有發生。'));
 return h('details',{className:'av-sources'},h('summary',null,t('{title}（{count} 筆）', {title, count: rows.length})),h('ol',null,rows.map(row=>h('li',{key:row.id},h('p',null,row.date+(row.time?' '+row.time:'')+' · '+sourceDescription(row,kind)),h('small',null,t('來源 ID：')+row.id),((kind==='record'&&onRecord)||(kind==='change'&&onChange)||(kind==='care'&&onCare))&&h('button',{type:'button',className:'text-btn',onClick:()=>kind==='change'?onChange(row.id):kind==='care'?onCare(row.careId):onRecord(row),'aria-label':t('開啟來源 {date} {category} {id}', {date: row.date, category: kind==='change'?row.kind:row.category, id: row.id})},kind==='change'?t('開啟生活變化與對照'):kind==='care'?t('查看完成紀錄'):t('開啟原紀錄'))))));
}
function PeriodView({react:R,period,title,...actions}){
 const h=R.createElement,p=period,source=(rows,kind='record')=>h(SourceList,{react:R,rows,kind,...actions});
 if(!p.dayCount)return h('section',{className:'av-period'},h('h3',null,title),h('p',{className:'av-missing'},t('事件後的日期尚未到，暫無可回顧期間。')));
 return h('section',{className:'av-period'},h('h3',null,title),h('p',{className:'av-range'},t('{start} 至 {end} · {dayCount} 天', {start: String(p.start||'').replaceAll('-','/'), end: String(p.end||'').replaceAll('-','/'), dayCount: p.dayCount})),h('p',null,periodFacts(p)[0]),
 p.careBrief&&h(VetCarePreview,{react:R,lines:p.careBrief}),
 h('section',{className:'av-group'},h('h4',null,t('食品與吃下量')),p.foods.length?p.foods.map(group=>h('article',{key:group.key,className:'av-food'},foodGroupLines(group).map((line,i)=>h(i?'p':'strong',{key:i},line)),source(group.rows))):h('p',{className:'av-missing'},t('尚無餵食紀錄，不代表沒有吃飯。')),h('p',{className:'av-note'},t('僅加總明確填寫的吃下量，不用「餵了多少」代替。不同食品版本與單位分開；重量不是熱量或營養攝取量。'))),
 h('section',{className:'av-group'},h('h4',null,t('飲食熱量與零食觀察')),h(DietSummary,{react:R,summary:p.diet,onRecord:actions.onRecord})),
 h('section',{className:'av-group'},h('h4',null,t('體重')),h('p',null,periodFacts(p)[1]),p.weightUnknown.length>0&&h('p',{className:'av-note'},t('{count} 筆體重資料無法計算，原文仍保留。', {count: p.weightUnknown.length})),source([...p.weight,...p.weightUnknown].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)))),
 h('section',{className:'av-group'},h('h4',null,t('排泄')),h('p',null,periodFacts(p)[2]),h('p',{className:'av-note'},t('筆數不是實際排泄頻率，未分類不當成正常。')),source([...p.stool,...p.urine,...p.unclassifiedElimination])),
 h('section',{className:'av-group'},h('h4',null,t('疫苗／驅蟲完成紀錄')),h('p',{className:'av-note'},t('只列已記下完成的疫苗與驅蟲；排定提醒不代表已完成。看診與處方用藥另列於「看診與用藥」。')),source(p.care,'care')),
 h('section',{className:'av-group'},h('h4',null,t('生活變化')),source(p.changes,'change')),
 p.other.length>0&&h('section',{className:'av-group'},h('h4',null,t('其他觀察')),source(p.other)));
}
export function VetCarePreview({react:R,lines=[]}){
 const h=R.createElement;
 return h('section',{className:'av-group','aria-label':t('看診與用藥')},h('h4',null,t('看診與用藥')),lines.length?h('ul',null,lines.map((line,i)=>h('li',{key:i},line))):h('p',{className:'av-missing'},t('尚無這段期間的看診或用藥紀錄，不代表沒有就醫或用藥。')),h('p',{className:'av-note'},t('與下載資料包使用同一份已保存資料；用藥狀態以所選結束日為準，請以獸醫處方與藥袋為準。')));
}
export function AdvancedVetReport({react:R,view,onView,onCloud,...input}){
 const h=R.createElement,[notice,setNotice]=R.useState(''),[busy,setBusy]=R.useState(false),lock=R.useRef(false),v=view||{start:vetShift(input.today,-29),end:input.today,question:''},report=buildVetPackage({...input,...v,careBrief:exportCareBrief(input,v.start,v.end)});
 const latestFoodChange=vetSourceData(input).changes.findLast(event=>event.kind===K('換飼料')||event.sourceType==='feeding');
 const foodChangeLink=latestFoodChange&&input.onChange&&h('button',{type:'button',className:'secondary',onClick:()=>input.onChange(latestFoodChange.id)},t('查看最近一次換糧前後'));
 const update=patch=>{setNotice('');onView({...v,...patch})};
 const exportFile=()=>{if(lock.current||report.error)return;lock.current=true;setBusy(true);try{const result=downloadVetPackage({...report,preparation:exportPreparation(input),careBrief:exportCareBrief(input,report.start,report.end)});setNotice(t('已準備下載 ')+result.filename+t('。請確認瀏覽器下載；開啟檔案後可使用系統列印另存 PDF。'))}catch(error){setNotice(t('無法產生檔案：')+tn(error.message))}finally{lock.current=false;setBusy(false)}};
 return h('section',{className:'av-package-hub','aria-label':t('看診紀錄工具')},h('button',{type:'button',className:'secondary',onClick:()=>openCareWorkspace({mode:'overview',catId:input.catId})},t('接續照護觀察與回診整理')),foodChangeLink,h('details',{className:'advanced-vet av-card'},h('summary',null,h('strong',null,t('詳細紀錄與匯出'))),h('p',null,t('自選期間，將食品、體重、排泄、用藥與生活變化整理成一份可追溯來源的資料包。')),h('p',{className:'av-note'},t('使用目前毛孩在這台裝置上的實際紀錄，不是範例資料。不收費、不用 AI、不上傳；免費摘要與匯出仍可使用。')),
 h('div',{className:'av-presets','aria-label':t('進階整理快速期間')},[7,14,30].map(days=>h('button',{type:'button',key:days,className:'secondary',onClick:()=>update({start:vetShift(input.today,1-days),end:input.today})},t('近 {days} 天', {days})))),
 h('div',{className:'av-dates'},[[t('開始日期'),'start'],[t('結束日期'),'end']].map(([label,key])=>h('label',{key,className:'field'},t('資料包')+label,h('input',{type:'date',value:v[key],max:input.today,onInput:e=>update({[key]:e.target.value}),onChange:e=>update({[key]:e.target.value}),'aria-label':t('資料包')+label,'aria-invalid':!!report.error})))),
 report.error?h('p',{role:'alert',className:'av-error'},report.error):h(PeriodView,{react:R,period:report,title:input.profile.name+t('的照護資料'),onRecord:input.onRecord,onChange:input.onChange,onCare:input.onCare}),
 h('label',{className:'field av-question'},t('僅這份資料包的補充問題（選填）'),h('textarea',{value:v.question||'',maxLength:2000,onChange:e=>update({question:e.target.value}),placeholder:t('只想附在這份資料包的補充；要留到下次，請填上方回診清單。'),'aria-label':t('僅這份資料包的補充問題')})),h('p',{className:'av-note'},t('上方回診清單已儲存的提問也會附進下載檔。此欄只附在這份資料包，不會保存為回診清單；重新整理頁面後不保留。')),h('p',{className:'av-note'},VET_LIMITS),
 h('button',{type:'button',className:'primary',disabled:!!report.error||busy,onClick:exportFile},busy?t('正在產生…'):t('下載看診資料包 HTML')),h('p',{className:'av-note'},t('檔案含原始紀錄，請自行確認後再分享。此動作只下載到你的裝置，不會寄送。')),notice&&h('p',{role:'status',className:'av-notice'},notice)));
}
export function AdvancedEventComparison({react:R,eventId,windowDays=7,onWindowDays,...input}){
 const h=R.createElement,[notice,setNotice]=R.useState(''),c=buildEventComparison({...input,eventId,windowDays});
 if(c.error)return h('section',{className:'advanced-vet av-card'},h('p',{role:'status'},c.error),h('p',null,t('原始生活變化仍可在此頁查看與編輯。')));
 const exportFile=()=>{try{const range={start:c.before.start,end:c.after.dayCount?c.after.end:c.event.date},report=buildVetPackage({...input,...range,careBrief:exportCareBrief(input,range.start,range.end)});const result=downloadVetPackage({...report,preparation:exportPreparation(input)},{comparison:c});setNotice(t('已準備下載 ')+result.filename+t('，包含前後對照與完整來源。請確認瀏覽器下載。'))}catch(error){setNotice(t('無法產生檔案：')+tn(error.message))}};
 return h('section',{className:'advanced-vet av-comparison','aria-label':t('實際紀錄前後對照')},h('h2',null,t('用原始紀錄看前後')),h('p',null,t('把吃下量、排泄與體重分開回顧，不把時間上的先後當成原因。')),
 h('div',{className:'av-presets','aria-label':t('進階對照天數')},[3,7,14,30].map(days=>h('button',{type:'button',className:windowDays===days?'primary':'secondary',key:days,'aria-pressed':windowDays===days,onClick:()=>{onWindowDays(days);setNotice('')}},t('前後 {days} 天', {days})))),
 h('p',{className:'av-note'},`${t('事件日 {date} 獨立列出，不混入前後兩側。未來日期不計入', {date: c.event.date})}${c.remainingDays?t('，後續尚有 {remainingDays} 天未到', {remainingDays: c.remainingDays}):''}${t('。區間長度與記錄完整度可能不同，不能用筆數判定改善或惡化。')}`),
 c.event.uncertain&&h('p',{className:'av-warning'},t('事件日期是約略日期，兩側分組僅供回顧，不計算體重差值。')),
 c.weightDelta&&h('p',{className:'av-observation'},t('事件前最後一筆 {date} {time}，與事件後最近一筆 {date2} {time2}，體重相差 {kg}{kg2} kg。量測時間與條件可能不同，這不是健康判斷。', {date: c.weightDelta.first.date, time: c.weightDelta.first.time, date2: c.weightDelta.last.date, time2: c.weightDelta.last.time, kg: c.weightDelta.kg>0?'+':'', kg2: vetRound(c.weightDelta.kg)})),
 h(VetCarePreview,{react:R,lines:exportCareBrief(input,c.before.start,c.after.dayCount?c.after.end:c.event.date)}),
 h(PeriodView,{react:R,period:c.before,title:t('變化前'),onRecord:input.onRecord,onCare:input.onCare}),
 h('details',{className:'av-event-day'},h('summary',null,t('事件當天 · {date} · {count} 筆日常紀錄', {date: c.event.date, count: c.sameDay.rows.length})),h(PeriodView,{react:R,period:c.sameDay,title:t('事件當天'),onRecord:input.onRecord,onCare:input.onCare})),
 h(PeriodView,{react:R,period:c.after,title:t('變化後'),onRecord:input.onRecord,onCare:input.onCare}),h('p',{className:'av-note'},VET_LIMITS),h('button',{type:'button',className:'primary',onClick:exportFile},t('下載前後對照 HTML')),h('p',{className:'av-note'},t('只在此裝置產生檔案，不扣額度、不會寄送。開啟 HTML 後可列印或另存 PDF。')),notice&&h('p',{role:'status',className:'av-notice'},notice));
}
