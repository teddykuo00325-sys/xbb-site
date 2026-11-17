import {recordIsLive} from './record-identity.js?v=8f5745b7843b';
import {completeProtectedReminder} from './reminder-protection.js?v=8f5745b7843b';
import {namedCareItem} from './reminder-enhancements-v34.js?v=photo-simplify1';
import {calendarDay} from './today-overview-v29.js?v=8f5745b7843b';
import {t, K} from './i18n.js?v=audit1117b';

export function validCareExtras(data){
 return !Array.isArray(data?.careItems)||data.careItems.every(item=>{
  if(!item||typeof item!=='object')return false;
  if(Object.hasOwn(item,'medicine')&&typeof item.medicine!=='string')return false;
  if(!Object.hasOwn(item,'undatedHistory'))return true;
  if(!Array.isArray(item.undatedHistory))return false;
  const ids=new Set();
  return item.undatedHistory.every(row=>{if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!row.id.trim()||row.id.length>160||ids.has(row.id)||row.dateStatus!=='unknown')return false;ids.add(row.id);return true;});
 });
}
export const blankCareItem=()=>({id:'',kind:K('疫苗'),name:'',last:'',next:'',lead:3,note:'',enabled:true,history:[]});
export function careEntryOptions(items,catId,isDemo=()=>false){
 const seen=new Set();
 return items.filter(item=>recordIsLive(item,catId)&&(!Object.hasOwn(item,'catId')||item.catId===catId)&&item.ownership!=='unconfirmed'&&!item.demo&&!String(item.source||'').includes(K('示範'))&&!isDemo(item)&&[K('疫苗'),K('驅蟲'),K('體內驅蟲'),K('體外驅蟲')].includes(item.kind)).filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true;});
}
// Both entry paths write the existing care item shape. A schedule never calls
// this completion helper and never synthesizes last/history from next.
export function completedCareItem(item,date,today,id){
 item=namedCareItem(item);
 if(!item.name.trim())throw Error(t('請填寫提醒項目名稱。'));
 if(calendarDay(date)===null||date>today)throw Error(t('完成日期請填今天或以前。'));
 if(item.last===date||(item.history||[]).includes(date))throw Error(t('這天已經記過了。'));
 const previousLast=[item.last,...(item.history||[])].filter(v=>calendarDay(v)!==null).sort().at(-1)||'';
 // 2026-11-17：記在一個還沒到期的未完成提醒上（例如 11/20 的驅蟲提前在 11/17 做了），這次就是在做那一次，
 // 提醒要結案；原本的日期若留著，首頁、通知與看診摘要都會再催一次，可能重複給藥。補記更早的舊劑量不影響。
 const earlyDone=item.enabled!==false&&calendarDay(item.next)!==null&&item.next>date&&!(previousLast&&item.next<=previousLast)&&(!previousLast||date>=previousLast);
 const saved=completeProtectedReminder({...item,id:item.id||id,name:item.name.trim()},date);
 // Backfilling an older dose must not move the latest actual dose backwards.
 saved.last=[saved.last,...saved.history].filter(v=>calendarDay(v)!==null).sort().at(-1)||'';
 if(earlyDone)saved.next='';
 return saved;
}
// Unknown dates are deliberately separate from dated history: no current date,
// daily statistic, reminder interval, or dated export is fabricated.
export function undatedCareItem(item,id,doseId){
 item=namedCareItem(item);
 if(!item.name)throw Error(t('請填寫提醒項目名稱。'));
 if(!doseId)throw Error(t('缺少日期待確認紀錄識別碼。'));
 const previous=Array.isArray(item.undatedHistory)?item.undatedHistory:[];
 if(previous.some(row=>row?.id===doseId))return item;
 return {...item,id:item.id||id,undatedHistory:[...previous,{id:doseId,dateStatus:'unknown'}]};
}
export function resolveUndatedCare(data,id,doseId,date,today){
 const item=data.careItems.find(row=>row.id===id);
 if(!item||!item.undatedHistory?.some(row=>row?.id===doseId))throw Error(t('這筆待確認紀錄已變更，請重新查看。'));
 const saved=completedCareItem(item,date,today);
 saved.undatedHistory=item.undatedHistory.filter(row=>row.id!==doseId);
 return {...data,careItems:data.careItems.map(row=>row.id===id?saved:row)};
}
export function CareOptionalProduct({react:R,item,onChange,withNote=false}){
 const h=R.createElement;
 return h(R.Fragment,null,h('label',{className:'field'},t('藥品名稱（選填）'),h('input',{'aria-label':t('藥品名稱'),value:item.medicine||'',maxLength:120,placeholder:t('不知道藥名也可以先記錄'),onChange:e=>onChange({...item,medicine:e.target.value})})),withNote&&h('label',{className:'field'},t('項目備註（選填）'),h('textarea',{'aria-label':t('項目備註'),value:item.note||'',maxLength:1000,onChange:e=>onChange({...item,note:e.target.value})})));
}
export function CareEntryChoice({react:R,items,catId,isDemo,onComplete,onSchedule,onList}){
 const h=R.createElement,[selected,setSelected]=R.useState(''),options=careEntryOptions(items,catId,isDemo),item=options.find(row=>row.id===selected);
 return h('section',{className:'vaccine-entry-choice','aria-label':t('疫苗與驅蟲新增')},
  h('h1',null,t('疫苗與驅蟲')),h('p',{className:'subtitle'},t('已經做完了，還是先排下一次？')),
  options.length>0&&h('label',{className:'field'},t('照護項目'),h('select',{'aria-label':t('選擇照護項目'),value:item?.id||'',onChange:e=>setSelected(e.target.value)},h('option',{value:''},t('新增一個項目')),options.map(row=>h('option',{value:row.id,key:row.id},row.name+' · '+row.kind)))),
  h('div',{className:'vaccine-entry-actions'},
   h('button',{type:'button',className:'vaccine-entry-action',onClick:()=>onComplete(item)},h('strong',null,t('登記已完成')),h('span',null,t('填寫實際日期，也能補記過去的完成紀錄'))),
   h('button',{type:'button',className:'vaccine-entry-action',onClick:()=>onSchedule(item)},h('strong',null,t('安排提醒')),h('span',null,t('只安排日期，不會記成已完成')))),
  h('p',{className:'microcopy left'},typeof window!=='undefined'&&typeof window.V161Cloud?.request==='function'?t('提醒日期照獸醫說的；提前與當天會跳手機通知（沒設定時間就是早上 9 點，沒網路也會提醒）。'):t('提醒日期照獸醫說的，到期日會列在照顧時間表。這個版本無法設定手機通知，請打開手機上的毛孩小本本 App 確認通知。')),
  h('button',{type:'button',className:'text-btn centered',onClick:onList},t('查看提醒與過去完成紀錄')));
}
