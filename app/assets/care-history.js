import {resolveUndatedCare} from './vaccine-access.js?v=photo-simplify1';
import {localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';
import {FAMILY_SHARING_ENABLED} from './family-feature.js?v=8f5745b7843b';
import {careDoseAuthor} from './o-records-v59.js?v=photo-simplify1';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {t, tn} from './i18n.js?v=audit1117b';

const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export function careDoseDates(item){return [...new Set([...(item.history||[]),item.last].filter(validDate))].sort().reverse();}
export function removeCareDose(data,id,date){
 const item=data.careItems.find(row=>row.id===id);
 if(!item||!careDoseDates(item).includes(date))throw Error(t('這筆完成紀錄已變更或刪除，請關閉後重新查看。'));
 const history=careDoseDates(item).filter(value=>value!==date);
 return {...data,careItems:data.careItems.map(row=>row.id===id?{...row,history,last:history[0]||''}:row)};
}
export function CareDoseDelete({react:R,store,item,date,onDeleted=()=>{}}){
 const h=R.createElement,[open,setOpen]=R.useState(false),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),ref=R.useRef(null),trigger=R.useRef(null),lock=R.useRef(false);
 usePhoneDialog(R,ref,open);
 R.useEffect(()=>{if(open)ref.current?.showModal?.();else{ref.current?.close?.();if(trigger.current?.isConnected)trigger.current.focus();}},[open]);
 const close=()=>{if(!lock.current)setOpen(false);};
 const remove=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{if(globalThis.__deleteSafety)await globalThis.__deleteSafety.guard(t('刪除一筆完成紀錄'));await store.atomic(data=>removeCareDose(data,item.id,date));setOpen(false);onDeleted(date);globalThis.__deleteSafety?.snack(t('完成紀錄已刪除'));}catch(e){setError(tn(e.message)||t('刪除未保存，完成紀錄仍保留。'));}finally{lock.current=false;setBusy(false);}};
 return h('div',{className:'care-dose-delete'},h('button',{ref:trigger,type:'button',className:'danger-link','data-family-delete-owner':careDoseAuthor(item,date)?.id||'','data-family-delete-kind':'dose','aria-label':t('刪除完成紀錄：{name} {date}', {name: item.name, date}),onClick:()=>{setError('');setOpen(true);}},t('刪除這筆')),h('dialog',{ref,className:'m-action-dialog','aria-label':t('確認刪除完成紀錄'),onCancel:e=>{e.preventDefault();close();}},open&&h(R.Fragment,null,h('h2',null,t('刪除這筆完成紀錄？')),h('p',null,`${item.name} · ${date}`),h('p',null,t('刪除後，上次完成日期會依剩下的紀錄重新計算，已安排的下次日期不變。刪除前會留一份副本，可按畫面下方的「復原」找回（只保留最近一次）。')),error&&h('p',{role:'alert',className:'error'},error),h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:close,autoFocus:true},t('先不刪')),h('button',{type:'button',className:'primary danger','data-family-delete-owner':careDoseAuthor(item,date)?.id||'','data-family-delete-kind':'dose',disabled:busy,onClick:remove},busy?t('正在保存…'):t('確認刪除這筆')))));
}
export function UndatedCareHistory({react:R,store,item,row,onSaved=()=>{}}){
 const h=R.createElement,[open,setOpen]=R.useState(false),[date,setDate]=R.useState(''),[error,setError]=R.useState(''),[busy,setBusy]=R.useState(false),lock=R.useRef(false);
 const save=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await store.atomic(data=>resolveUndatedCare(data,item.id,row.id,date,localCalendarDate()));setOpen(false);onSaved(t('已補上 {date}；只更新這筆日期待確認紀錄，其他完成紀錄與提醒不變。', {date}));}catch(e){setError(tn(e.message)||t('日期尚未保存，原待確認紀錄仍保留。'));}finally{lock.current=false;setBusy(false);}};
 return h('div',{className:'care-undated-history'},h('p',null,t('已完成 · 日期待確認')),h('small',null,t('不列入逐日紀錄、日期範圍統計或下次日期推算。')),!open&&h('button',{type:'button',className:'text-btn',onClick:()=>{setOpen(true);setError('');}},t('補上完成日期')),open&&h('div',null,h('label',{className:'field'},t('補上完成日期'),h('input',{type:'date','aria-label':t('補上完成日期'),value:date,max:localCalendarDate(),disabled:busy,onChange:e=>setDate(e.target.value)})),error&&h('p',{role:'alert',className:'error'},error),h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:()=>{setOpen(false);setError('');}},t('取消補記')),h('button',{type:'button',className:'primary',disabled:busy,onClick:save},busy?t('保存中…'):t('確認補上日期'))));
}
export function CareHistory({react:R,store,item,onDeleted=()=>{}}){
 const h=R.createElement,dates=careDoseDates(item),undated=Array.isArray(item.undatedHistory)?item.undatedHistory.filter(row=>row?.id&&row.dateStatus==='unknown'):[];
 return (dates.length>0||undated.length>0)&&h('details',{className:'care-history'},h('summary',null,`${dates.length?t('查看／刪除紀錄'):t('查看紀錄')}（${dates.length+undated.length}）`,undated.length?` ${t('· {count} 筆日期待確認', {count: undated.length})}`:''),dates.map(date=>h('div',{className:'care-history-row',key:date},h('span',null,t('{date} · 已完成', {date}),FAMILY_SHARING_ENABLED&&careDoseAuthor(item,date)&&h('small',{style:{display:'block',overflowWrap:'anywhere'}},t('由{name}完成', {name: careDoseAuthor(item,date).name}))),h(CareDoseDelete,{react:R,store,item,date,onDeleted:()=>onDeleted(t('已刪除 {date} 的完成紀錄，上次完成與照顧時間表已重新計算。', {date}))}))),undated.map(row=>h(UndatedCareHistory,{react:R,store,item,row,key:row.id,onSaved:onDeleted})));
}
