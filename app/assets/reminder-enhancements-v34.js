import {careReceipt} from './o-records-v59.js?v=photo-simplify1';
// Calendar-only examples, never a treatment interval or an automatic schedule.
import {calendarDay,localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';
import {t, K} from './i18n.js?v=audit1117b';
export function addCalendarMonths(date,months){
 if(calendarDay(date)===null||!Number.isInteger(months))return null;
 const [year,month,day]=date.split('-').map(Number),index=year*12+month-1+months,y=Math.floor(index/12),m=index-y*12;
 if(y<1||y>9999)return null;
 const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return `${String(y).padStart(4,'0')}-${String(m+1).padStart(2,'0')}-${String(Math.min(day,days[m])).padStart(2,'0')}`;
}
export function reminderExample(item,date){
 const months=item.kind===K('疫苗')?12:item.kind===K('體內驅蟲')||item.kind===K('驅蟲')&&item.careSubtype==='internal'?3:item.kind===K('體外驅蟲')||item.kind===K('驅蟲')&&item.careSubtype==='external'?1:null;
 if(months===null)return null;
 const next=addCalendarMonths(date,months);return next?{date:next,months,label:months===12?t('1 個日曆年'):t('{months} 個日曆月', {months})}:null;
}
export function clearReminderDate(item){return {...item,next:''}}
export function scheduleReminderDate(item,date,{veterinarianConfirmed=false}={}){
 const last=[item.last,...(item.history||[])].filter(v=>calendarDay(v)!==null).sort().at(-1);
 if(!veterinarianConfirmed)throw Error(t('請先向獸醫確認適合這隻毛孩的完成紀錄日期。'));
 if(calendarDay(date)===null||last&&date<=last)throw Error(t('下次日期需有效，且晚於上次完成日期。'));
 return {...item,next:date};
}
export const isDewormCare=item=>[K('驅蟲'),K('體內驅蟲'),K('體外驅蟲')].includes(item?.kind);
export function defaultCareName(item){
 if(item?.kind===K('疫苗'))return t('疫苗紀錄');
 if(!isDewormCare(item))return '';
 if(item.careSubtype==='combined')return t('體內外合一驅蟲');
 return item.kind===K('體內驅蟲')||item.careSubtype==='internal'?t('體內驅蟲'):item.kind===K('體外驅蟲')||item.careSubtype==='external'?t('體外驅蟲'):t('驅蟲（未指定類型）');
}
export function namedCareItem(item){return {...item,name:String(item.name||'').trim()||defaultCareName(item)};}
export function changeCareType(item,value){
 const next={...item,kind:['internal','external','combined','unspecified'].includes(value)?K('驅蟲'):value,careSubtype:['internal','external','combined'].includes(value)?value:''};
 // Auto-filled names follow a new item's selection; custom and saved names stay intact.
 if(!String(item.name||'').trim()||!item.id&&item.name===defaultCareName(item))next.name=defaultCareName(next);
 return next;
}
export function CareTypeField({react:R,item,onChange}){
 const h=R.createElement,value=item.kind===K('體內驅蟲')?'internal':item.kind===K('體外驅蟲')?'external':item.kind===K('驅蟲')?(item.careSubtype||'unspecified'):item.kind;
 return h('label',{className:'field'},t('照護類型 ＊必填'),h('select',{'aria-label':t('照護類型'),value,onChange:e=>{const value=e.target.value;onChange(changeCareType(item,value))}},[[K('疫苗'),t('疫苗')],['internal',t('體內驅蟲')],['external',t('體外驅蟲')],['combined',t('體內外合一')],['unspecified',t('驅蟲（未指定類型）')],[K('其他'),t('其他／自訂')]].map(([value,label])=>h('option',{key:value,value},label))));
}
export function ReminderDateChoice({react:R,item,completedDate,onEdit,onLater,busy=false}){
 const h=R.createElement;
 return h('section',{className:'h-reminder-choice','aria-label':t('安排下次照護日期')},h('p',{className:'care-success',role:'status'},careReceipt(item,completedDate,localCalendarDate())),h('h1',null,t('本次紀錄已完成')),h('button',{className:'primary',disabled:busy,onClick:onLater},t('完成')),h('button',{className:'text-btn centered',disabled:busy,onClick:onEdit},t('設定下次提醒')),h('small',null,t('日期照獸醫說的，需要時再設定；到期前手機會通知（沒網路也會提醒）。')));
}
