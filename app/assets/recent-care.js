import {eliminationKind,urineLabel,isLitterUrine} from './elimination-observation.js?v=8f5745b7843b';
import {APPETITE_OPTIONS,MOOD_OPTIONS} from './observation-entry.js?v=audit1117';
import {waterKind,recordStamp} from './record-summary.js?v=8f5745b7843b';
import {t, K} from './i18n.js?v=audit1117b';
import {displayStoredText} from './stored-text.js?v=i18n1';
// Input rows have already passed the shared live/current-cat/demo/date selector
// and chronological sorting. Appetite uses only explicit saved choices, never
// meal counts, eaten amounts or inferred prose. Historical rows stay unchanged.
export function recentCareStatus(rows=[],today){
 const start=new Date(Date.parse(today+'T12:00:00Z')-6*864e5).toISOString().slice(0,10),recent=rows.filter(r=>r.date>=start&&r.date<=today);
 const definitions=[['urine',t('尿尿'),K('排泄'),r=>eliminationKind(r)==='urine',r=>urineLabel(r)+(isLitterUrine(r)&&r.amount&&r.unit===K('團')?` ${t('· {amount} 團', {amount: r.amount})}`:'')],['bowel',t('便便'),K('排泄'),r=>eliminationKind(r)==='stool',r=>displayStoredText(r.text)],['appetite',t('食慾'),K('飲食'),r=>!r.feeding&&typeof r.appetiteStatus==='string'&&Object.hasOwn(APPETITE_OPTIONS,r.appetiteStatus),r=>APPETITE_OPTIONS[r.appetiteStatus]],['vomit',t('嘔吐'),K('嘔吐'),()=>true,r=>displayStoredText(r.text)],['water',t('喝水'),K('喝水'),()=>true,r=>waterKind(r)==='refill'?t('水碗補水（非喝入量）'):displayStoredText(r.text)],['mood',t('精神'),K('其他'),r=>r.metric==='mood',r=>Object.hasOwn(MOOD_OPTIONS,r.moodStatus)?MOOD_OPTIONS[r.moodStatus]:displayStoredText(r.text)]];
 return {start,today,days:new Set(recent.map(r=>r.date)).size,items:definitions.map(([id,name,category,test,label])=>{const list=recent.filter(r=>r.category===category&&test(r)),last=list.at(-1);return {id,name,category,count:list.length,last,text:last?label(last):t('近 7 天未記錄'),unknown:!last};})};
}
export function RecentCareStatus({react:R,rows,today,onRecords,onRecord,showLitter=true}){
 const h=R.createElement,m=recentCareStatus(rows,today);
 return h('section',{className:'recent-care','aria-label':t('近期狀態')},h('div',{className:'health-section-title'},h('h2',null,t('近期狀態')),h('span',null,t('近 7 天'))),
  h('p',{className:'recent-care-note'},t('只整理已記錄的觀察；未知不代表正常。')),
  showLitter&&h('button',{type:'button',className:'recent-care-litter',onClick:()=>onRecord(K('排泄'),'litter')},t('清砂快記 · 記尿團')),
  h('div',{className:'recent-care-grid'},m.items.slice(0,2).map(item=>h('div',{key:item.id,className:'recent-care-item'},h('button',{type:'button',onClick:()=>onRecords(item.category,null,item.id)},h('strong',null,item.name),h('span',null,item.text),item.last&&h('small',null,recordStamp(item.last)))))),
  h('details',null,h('summary',null,t('食慾、嘔吐、喝水與精神')),m.items.slice(2).map(item=>h('button',{key:item.id,type:'button',className:'recent-care-row',onClick:()=>onRecords(item.category,null,item.id==='mood'?'mood':null)},h('strong',null,item.name),h('span',null,item.text),item.last&&h('small',null,recordStamp(item.last))))),
  h('p',{className:'recent-care-note'},t('筆數不等於發生次數，不作健康診斷。')));
}
