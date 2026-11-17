import {t, K} from './i18n.js?v=audit1117b';
import {displayStoredText,displayUserText,withStoredTexts} from './stored-text.js?v=i18n1';
import {eliminationKind,eliminationCounts,urineLabel} from './elimination-observation.js?v=8f5745b7843b';
import {mealCountGroups,mealNeedsEatenAmount,recordTitle} from './clear-presentation.js?v=audit1117';
import {MOOD_OPTIONS,positiveVomitCount} from './observation-entry.js?v=audit1117';
import {dailyTotals,weightChange,weightChangeText,weightAdvice} from './record-quantity.js?v=1';
const fmt=n=>Number(Number(n).toPrecision(10)).toString();

export const recordStamp=row=>row?`${row.date.replaceAll('-','/')} ${row.time}`:'';
export function waterKind(row){
 if(row.waterAction==='observed'||row.waterAction==='refill')return row.waterAction;
 // Only exact legacy quick-observation labels are classified. Free prose stays unknown.
 const text=String(row.text||'').trim();
 if(/^(?:水碗)?補水(?:一次|1次| 1 次)?$/.test(text))return 'refill';
 if(text===K('看到喝水'))return 'observed';
 return 'unknown';
}
const waterLabel=row=>({observed:t('看到喝水'),refill:t('水碗補水'),unknown:t('飲水項目未分類')}[waterKind(row)]);
export function recordMetricSummary({metric,list,weights,today,days,foodCards,stateLabel,stoolState,round,signed}){
 const todayRows=list.filter(r=>r.date===today),last=list.at(-1),base={hasData:list.length>0,rows:list,todayCount:todayRows.length,value:todayRows.length?String(todayRows.length):'—',unit:todayRows.length?t('筆'):'',label:todayRows.length?t('今天已記錄'):t('今天的紀錄'),detail:last?t('最近 {v0} · {text}', {v0: recordStamp(last), text: displayStoredText(last.text)}):t('今天尚未記錄'),extra:'',bars:days.map(date=>({date,count:list.filter(r=>r.date===date).length})),states:list.slice(-5).map(stoolState)};
 if(metric==='food'){
  const meals=mealCountGroups(list),todayMeals=meals.filter(g=>g.rows[0].date===today),latest=meals.at(-1),foods=latest?.rows.map(row=>recordTitle(row,foodCards))||[];
  return {...base,value:todayMeals.length?String(todayMeals.length):'—',unit:todayMeals.length?t('餐'):'',todayCount:todayMeals.length,mealsToComplete:todayMeals.filter(group=>mealNeedsEatenAmount(group)).length,bars:days.map(date=>({date,count:meals.filter(g=>g.rows[0].date===date).length})),detail:latest?t('最近一餐 {v0}', {v0: recordStamp(latest.rows[0])}):t('今天尚未記錄餵食'),extra:foods.join(t('、')),foods,latestMeal:latest,mealCount:meals.length};
 }
 if(metric==='weight'){
  const last=weights.at(-1),prev=weights.at(-2);
  return {...base,hasData:weights.length>0,rows:weights,label:t('最新量測'),value:last?round(last.kg):'—',unit:last?t('公斤'):'',detail:last?recordStamp(last):t('尚無有效量測'),extra:prev?t('較上次 {v0} 公斤', {v0: signed(last.kg-prev.kg)}):t('尚無前次量測可比較')};
 }
 if(metric==='stool'){
  const counts=eliminationCounts(todayRows),kind=last&&eliminationKind(last),clumps=dailyTotals(todayRows,{end:today,days:1,metric:'litter'})[0];
  return {...base,counts,todayClumps:clumps?.status==='value'?clumps.total:null,label:t('今天的排泄觀察'),value:todayRows.length?t('尿尿 {urine} · 便便 {stool}', {urine: counts.urine, stool: counts.stool}):'—',unit:todayRows.length?t('筆'):'',detail:last?t('最近 {v0}', {v0: recordStamp(last)}):t('今天尚未記錄排泄'),extra:last?`${kind==='urine'?t('尿尿：{status}',{status:urineLabel(last)}):kind==='stool'?t('便便：{status}',{status:stateLabel(stoolState(last))}):t('排泄類型未分類')}`:'',note:counts.unknown?t('另 {unknown} 筆類型未分類；沒記錄不等於沒發生', {unknown: counts.unknown}):t('尿尿與便便分開計筆數，不代表完整次數')};
 }
 if(metric==='water'){
  const counts={observed:0,refill:0,unknown:0};todayRows.forEach(row=>counts[waterKind(row)]++);
  // 今天已填的喝水量（ml）合計；沒填量的筆數另列，不當 0。補水量不算喝下的水。
  const ml=dailyTotals(todayRows,{end:today,days:1,metric:'water'})[0];
  return {...base,todayMl:ml?.status==='value'?ml.total:null,todayMlUnknown:ml?.unknown||0,value:todayRows.length?(counts.observed?t('看到喝水 {n} 筆',{n:counts.observed}):counts.refill?t('水碗補水 {n} 筆',{n:counts.refill}):t('項目未分類')):'—',unit:'',counts,label:t('今天的飲水觀察'),detail:todayRows.length?[(counts.observed&&counts.refill)?t('水碗補水 {refill} 筆', {refill: counts.refill}):'',counts.unknown?t('未分類 {unknown} 筆', {unknown: counts.unknown}):''].filter(Boolean).join(' · '):t('今天尚未記錄'),extra:last?t('最近 {v0} · {v1}', {v0: recordStamp(last), v1: displayStoredText(last.text)||waterLabel(last)}):'',note:t('觀察筆數，不代表喝入量')};
 }
 if(metric==='vomit'){
  const counts=todayRows.map(positiveVomitCount),known=counts.filter(n=>n!==null),unknown=counts.length-known.length,total=known.reduce((a,b)=>a+b,0);
  return {...base,value:todayRows.length?(known.length?String(total):t('次數未記錄')):'—',unit:known.length?t('次'):'',label:known.length?t('今天已填次數合計'):t('今天的嘔吐觀察'),detail:todayRows.length?(unknown?t('{unknown} 筆次數未記錄，不列入合計', {unknown}):t('{n} 筆有填次數', {n: known.length})):t('今天尚未記錄'),extra:last?t('最近 {v0} · {v1}', {v0: recordStamp(last), v1: displayStoredText(last.text)||t('次數未記錄')}):'',knownCount:known.length,unknownCount:unknown};
 }
 if(metric==='mood')return {...base,label:t('最新精神觀察'),value:last?((Object.hasOwn(MOOD_OPTIONS,last.moodStatus)?MOOD_OPTIONS[last.moodStatus]:t('狀態未分類'))):'—',unit:'',detail:last?recordStamp(last):t('尚無精神狀態紀錄'),extra:last?(Object.hasOwn(MOOD_OPTIONS,last.moodStatus)?'':displayStoredText(last.text)):''};
 return base;
}

/** A single home-card fact. Detail and clinical observations remain in their own views. */
export function compactRecordSummary(metric,today){
 if(metric.id==='weight'){
  const last=metric.rows.at(-1);
  if(!last)return {text:t('尚未量測'),label:t('尚無有效體重量測')};
  const fullDate=last.date.replaceAll('-','/'),date=last.date.slice(0,4)===today.slice(0,4)?fullDate.slice(5):fullDate;
  return {text:`${metric.value} kg · ${date}`,label:t('最近體重 {value} 公斤，量測日期 {fullDate}', {value: metric.value, fullDate})};
 }
 if(!metric.todayCount)return {text:t('今日尚未記錄'),label:t('今日尚未記錄')};
 if(metric.id==='food'&&metric.mealsToComplete){
  const text=t('今日 {todayCount} 餐 · {mealsToComplete} 餐待補吃下量', {todayCount: metric.todayCount, mealsToComplete: metric.mealsToComplete});
  return {text,label:text};
 }
 if(metric.id==='stool'){
  const todayRows=metric.rows.filter(row=>row.date===today);
  const lastUrine=todayRows.findLast(row=>eliminationKind(row)==='urine');
  const urine=lastUrine?t('最近尿尿紀錄 {time}', {time: lastUrine.time}):t('尿尿未記錄');
  const bowel=metric.counts.stool?t('便便 {stool} 筆', {stool: metric.counts.stool}):t('便便未記錄');
  const unclassified=metric.counts.unknown?t(' · 未分類 {unknown} 筆', {unknown: metric.counts.unknown}):'';
  const clumps=metric.todayClumps!==null&&metric.todayClumps!==undefined?t(' · 尿團 {v0} 團', {v0: fmt(metric.todayClumps)}):'';
  const text=`${urine}${clumps} · ${bowel}${unclassified}`;
  return {text,label:t('{text}，紀錄筆數不代表發生次數',{text})};
 }
 if(metric.id==='water'){
  const {observed,refill,unknown}=metric.counts;
  const text=[metric.todayMl!==null&&metric.todayMl!==undefined?t('今日喝水 {v0} ml', {v0: fmt(metric.todayMl)}):'',observed?t('看到喝水 {observed} 筆', {observed}):t('尚未記錄看到喝水'),refill?t('補水 {refill} 筆', {refill}):'',unknown?t('未分類 {unknown} 筆', {unknown}):''].filter(Boolean).join(' · ');
  return {text,label:t('{text}，紀錄筆數不代表發生次數',{text})};
 }
 const text=t('今日 {todayCount} {v1}', {todayCount: metric.todayCount, v1: metric.id==='food'?t('餐'):t('筆')});
 return {text,label:metric.id==='food'?text:t('{text}紀錄，不代表發生次數', {text})};
}

const rounded=n=>Number(n.toPrecision(10)).toString();
/** Time is a real continuous axis; same-day measurements stay individual rows. */
export function weightPlot(rows=[]){
 const sorted=[...rows].filter(r=>Number.isFinite(r.kg)&&r.kg>0).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||String(a.id).localeCompare(String(b.id))).slice(-30);
 if(!sorted.length)return {rows:[],points:[],ticks:[]};
 const stamp=r=>Date.parse(r.date+'T'+r.time+':00Z'),start=stamp(sorted[0]),end=stamp(sorted.at(-1)),values=sorted.map(r=>r.kg),low=Math.min(...values),high=Math.max(...values),padding=Math.max(.05,(high-low)*.15),min=Math.max(0,Math.floor((low-padding)*100)/100),max=Math.ceil((high+padding)*100)/100;
 const points=sorted.map(r=>({row:r,x:end===start?170:50+(stamp(r)-start)/(end-start)*245,y:142-(r.kg-min)/(max-min)*106}));
 const ticks=[min,(min+max)/2,max].map(value=>({value,y:142-(value-min)/(max-min)*106}));
 return {rows:sorted,points,ticks,min,max,sameDay:sorted.length>1&&sorted[0].date===sorted.at(-1).date,path:points.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' ')};
}
export function WeightChart({react:R,rows=[],onRecord}){
 const h=R.createElement,plot=weightPlot(rows),first=plot.rows[0],last=plot.rows.at(-1);
 // 期間首末兩筆的公斤差與百分比（Ian 2026-11-14）；明顯變化時附溫和的一般建議。
 const change=weightChange(plot.rows),advice=weightAdvice(change);
 if(!last)return h('p',{className:'record-summary-note'},t('尚無可用的體重量測。'));
 const range=first.date===last.date?recordStamp(first).slice(0,10):t('{v0} 至 {v1}', {v0: first.date.replaceAll('-','/'), v1: last.date.replaceAll('-','/')});
 return h('div',{className:'record-weight-detail'},
  onRecord&&h('div',{className:'care-reading-card weight-headline'},h('p',null,t('最近量測')),
   h('strong',null,rounded(last.kg),t(' 公斤')),h('p',null,recordStamp(last))),
  h('p',{className:'record-summary-note'},t('量測範圍：{range} · {n} 筆{v2}', {range, n: plot.rows.length, v2: rows.length>30?t('（圖表顯示最近 30 筆）'):''})),
  change&&h('p',{className:'weight-change','data-testid':'weight-change'},h('strong',null,t('期間變化 ')),weightChangeText(change)),
  advice&&h('p',{className:'record-summary-note weight-advice'},advice),
  plot.rows.length<2?h('p',{className:'record-summary-note'},t('目前只有一筆量測，尚無前次可比較，不畫趨勢線。')):
  h(R.Fragment,null,h('svg',{viewBox:'0 0 320 184',role:'img','aria-label':t('體重量測圖，橫軸為日期與時間，縱軸為公斤；各筆數值列於下方。')},
   h('text',{x:8,y:19,className:'weight-axis-title'},t('公斤')),
   plot.ticks.map(tick=>h('g',{key:tick.value},h('line',{x1:50,x2:295,y1:tick.y,y2:tick.y,stroke:'#e4e7ec'}),h('text',{x:42,y:tick.y+4,textAnchor:'end'},rounded(tick.value)))),
   h('path',{d:plot.path,fill:'none',stroke:'#4f7ebc',strokeWidth:2.5,strokeLinejoin:'round'}),
   plot.points.map(({row,x,y},i)=>h('g',{key:row.id??i,className:onRecord?'weight-plot-point':undefined},
    h('circle',{cx:x,cy:y,r:4,fill:'#4f7ebc'},h('title',null,t('{v0} · {v1} 公斤', {v0: recordStamp(row), v1: rounded(row.kg)}))),
    onRecord&&h('circle',{cx:x,cy:y,r:12,fill:'transparent','aria-hidden':true,onClick:()=>onRecord(row)}))),
   h('text',{x:50,y:164,textAnchor:'start'},first.date.slice(5).replace('-','/')+' '+first.time),h('text',{x:295,y:181,textAnchor:'end'},last.date.slice(5).replace('-','/')+' '+last.time)),
   h('p',{className:'record-summary-note'},t('{v0} 縱軸依量測範圍顯示，未必從 0 開始。', {v0: plot.sameDay?t('同日多次量測依時間排列，不能視為跨日趨勢。'):t('只連接已記錄量測，缺資料的時段不推測。')}))),
  h('details',{className:'weight-measurements',open:true},h('summary',null,t('量測日期與數值')),h('ul',null,[...plot.rows].reverse().map(r=>{
   const time=h('time',null,recordStamp(r)),value=h('strong',null,rounded(r.kg)+t(' 公斤'));
   return h('li',{key:r.id},onRecord?h('button',{type:'button',className:'weight-record-link',onClick:()=>onRecord(r)},time,value,h('span',{'aria-hidden':true},'›')):h(R.Fragment,null,time,value));
  }))));
}
