import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {t, tn} from './i18n.js?v=audit1117b';
/** Keep user-entered scheduling data intact. Never infer a medical interval. */
export function completeProtectedReminder(item,date){
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 // Legacy reminders sometimes stored their only dose in last, not history.
 const history=[...new Set([...(item.history||[]),item.last].filter(validDate))];
 return {...item,last:date,history:history.includes(date)?history:[date,...history]};
}
export function unchangedReminderDate(item,baseline){return Boolean(baseline?.next)&&item.next===baseline.next;}
export function confirmReminderClear(date,confirm=globalThis.confirm){
 return !date||typeof confirm==='function'&&confirm(t('確定取消已安排的 {date}？確認後，下次日期將改為未設定。', {date}));
}
// Older/imported records can carry any of these keys. Do not migrate, normalize,
// synthesize a default hour, or overwrite multiple independently stored values.
export const reminderTimeKeys=['reminderTime','remindTime','notificationTime','notifyTime','time','reminder_time','remind_time','notification_time','notify_time'];
export function reminderTimeFields(item){
 return reminderTimeKeys.filter(key=>Object.hasOwn(item,key)&&typeof item[key]==='string');
}
export function updateReminderTime(item,key,value){
 if(!reminderTimeKeys.includes(key))throw Error('Unknown reminder time field');
 if(item[key]===value||!Object.hasOwn(item,key)&&value==='')return item;
 return {...item,[key]:value};
}
// 2026-11-14：提醒時間改成真正的時間（HH:MM，24 小時制），並接到手機排程（care-schedule.js 用同樣規則）。
// 舊資料的自由文字（例如「晚餐後」、「25:99」）不刪、不轉換：通知仍在早上 9 點，畫面提示重設或清除。
export const validReminderClock=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function reminderClock(item){return reminderTimeFields(item||{}).map(key=>item[key]).find(validReminderClock)||'';}
export function invalidReminderTimes(item){return reminderTimeFields(item||{}).filter(key=>item[key]!==''&&!validReminderClock(item[key]));}
export function ReminderTimeFields({react:R,item,onChange}){
 const h=R.createElement,clock=reminderClock(item),key=reminderTimeFields(item).find(name=>validReminderClock(item[name]))||'reminderTime',bad=invalidReminderTimes(item);
 return h('section',{'aria-label':t('提醒時間'),className:'reminder-time-fields'},
  h('label',{className:'field'},t('提醒時間（選填）'),h('input',{type:'time','aria-label':t('提醒時間'),value:clock,step:60,onChange:event=>{const value=event.target.value;if(value!==''&&!validReminderClock(value))return;onChange(updateReminderTime(item,key,value));}})),
  ...bad.map(name=>h('p',{key:name,className:'reminder-help reminder-time-invalid',role:'status'},`${t('之前填的「{name}」不是時間格式，手機不會照它提醒（目前在', {name: item[name]})}${clock?` ${clock} `:t('早上 9 點')}${t('通知）。請在上面重新選時間，或')} `,h('button',{type:'button',className:'text-btn','aria-label':t('清除「{name}」', {name: item[name]}),onClick:()=>onChange(updateReminderTime(item,name,''))},t('清除這段文字')),'。')),
  h('small',null,`${t('手機會在提前天數那天和當天的')}${clock?` ${clock} `:t('這個時間')}${t('通知；沒填就是早上 9 點（沒網路也會提醒）。')}`));
}
export function ReminderTimeDisplay({react:R,item}){
 const h=R.createElement,clock=reminderClock(item),bad=invalidReminderTimes(item);
 return h(R.Fragment,null,clock&&h('p',{key:'clock',className:'reminder-time'},t('提醒時間 '),h('b',null,clock)),
  ...bad.map(key=>h('p',{key,className:'reminder-time reminder-time-invalid'},`${t('提醒時間「{key}」格式不對，通知', {key: item[key]})}${clock?t('用 ')+clock:t('仍在早上 9 點')}${t('；可到「編輯提醒」重設。')}`)));
}
export function ProtectedReminderDateChoice({react:R,item,completedDate,onRetain,onEdit,onLater,busy=false,Fallback,...rest}){
 const h=R.createElement;
 if(!item.next)return h(Fallback,{react:R,item,completedDate,onEdit,onLater,busy,...rest});
 return h('section',{className:'h-reminder-choice','aria-label':t('安排下次照護日期')},h('p',{className:'care-success',role:'status'},t('已保存 {completedDate} 的完成紀錄。', {completedDate})),h('h1',null,t('沿用已安排的日期')),h('h2',null,item.name),h('p',null,t('原本安排的日期：'),h('strong',null,item.next)),item.next<=completedDate&&h('p',{className:'notice'},t('原排定日期已到或早於這次完成，仍為你保留。請照獸醫說的確認是否需要改期。')),h('button',{className:'primary',disabled:busy,onClick:onRetain},t('沿用已安排的日期（{next}）', {next: item.next})),h('button',{className:'text-btn centered',disabled:busy,onClick:onEdit},t('改日期')),h(ReminderClearChoice,{react:R,date:item.next,busy,onConfirm:onLater}));
}

/** App-owned confirmation: embedded browsers may suppress native confirm(). */
export function ReminderClearChoice({react:R,date,busy=false,onConfirm}){
 const h=R.createElement,[shown,setShown]=R.useState(false),[saving,setSaving]=R.useState(false),[error,setError]=R.useState(''),dialog=R.useRef(null),trigger=R.useRef(null),lock=R.useRef(false),opened=R.useRef(false);
 const blocked=busy||saving;
 usePhoneDialog(R,dialog,shown);
 R.useEffect(()=>{if(shown){opened.current=true;dialog.current?.showModal?.();}else{dialog.current?.close?.();if(opened.current){trigger.current?.focus?.({preventScroll:true});opened.current=false;}}},[shown]);
 R.useEffect(()=>{if(shown&&!date)setShown(false);},[date,shown]);
 const close=()=>{if(!lock.current&&!busy){setShown(false);setError('');}};
 const accept=async()=>{if(lock.current||busy)return;lock.current=true;setSaving(true);setError('');try{const ok=await onConfirm(date);if(ok===false){setError(t('下次日期尚未完成保存，請確認頁面的保存狀態後重試。'));}else setShown(false);}catch(e){setError(tn(e.message)||t('尚未保存，請重試。'));}finally{lock.current=false;setSaving(false);}};
 return h(R.Fragment,null,h('button',{ref:trigger,type:'button',className:'text-btn centered',disabled:blocked,onClick:()=>{if(!blocked){setError('');setShown(true);}}},t('取消原提醒日期')),h('dialog',{ref:dialog,className:'m-action-dialog','aria-label':t('取消下次日期'),onCancel:e=>{e.preventDefault();close();}},shown&&h(R.Fragment,null,h('h2',null,t('取消下次日期？')),h('p',null,t('將取消已安排的下次日期（{date}），改為待安排，確定嗎？', {date})),h('p',{className:'microcopy left'},t('這次完成紀錄已保存，保留日期不會重複新增完成紀錄。')),error&&h('p',{className:'error',role:'alert'},error),h('button',{type:'button',className:'secondary-btn',disabled:blocked,onClick:close,autoFocus:true},t('保留日期')),h('button',{type:'button',className:'primary danger',disabled:blocked,onClick:accept},blocked?t('保存中…'):t('確認取消日期')))));
}
