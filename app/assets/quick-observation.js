import {K} from './i18n.js?v=audit1117b';
import {localNow} from './save-flow-v25.js?v=8f5745b7843b';

// Browser-local calendar date and time always come from one clock snapshot.
// A list filter is deliberately not an input to creation.
// 「沒吃完」統一歸「食慾：吃得比平常少」（Ian 2026-11-14）：列表、摘要、匯出都讀這兩個既有欄位。
const quickStructure=choice=>choice.category===K('排泄')&&choice.text===K('尿團變小')?{eliminationKind:'urine',metric:'urine',urineStatus:'smaller'}:choice.category===K('飲食')&&choice.text===K('沒吃完')?{metric:'appetite',appetiteStatus:'less'}:{};
export function createTodayObservation(choice,id,now=new Date()) {
 const stamp=localNow(now);
 return {label:choice.label,entry:{id,date:stamp.date,time:stamp.time,category:choice.category,text:choice.text,amount:choice.amount,unit:choice.unit,source:K('一鍵快記'),...quickStructure(choice)}};
}
export function refreshQuickDay(quick,now=new Date()) {
 const stamp=localNow(now);
 return quick.entry.date===stamp.date?quick:{...quick,entry:{...quick.entry,...stamp}};
}
