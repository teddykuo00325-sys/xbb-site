import {CareTypeField,namedCareItem,changeCareType} from './reminder-enhancements-v34.js?v=photo-simplify1';
import {CareOptionalProduct} from './vaccine-access.js?v=photo-simplify1';
import {ReminderTimeFields,reminderClock,validReminderClock} from './reminder-protection.js?v=199';
import {duplicateReminders,careReminderState} from './vaccine-quick-entry.js?v=photo-simplify1';
import {t, K, tn} from './i18n.js?v=audit1117b';

// 新增提醒（Ian 2026-11-13「跳進的畫面更難懂」）：先選要提醒什麼（四顆大按鈕），再填日期、選什麼時候提醒；
// 名稱只有「其他」才要打字。修改既有提醒維持原本的表單。
const KINDS=[[K('疫苗'),t('疫苗')],[K('驅蟲'),t('驅蟲')],[K('回診'),t('回診')],[K('其他'),t('其他')]];
const DEWORM=[['combined',t('體內外合一')],['internal',t('體內')],['external',t('體外')]];
const LEADS=[[0,t('當天')],[1,t('前 1 天')],[3,t('前 3 天')],[7,t('前 7 天')]];
export const newReminderKind=item=>item.kind===K('疫苗')?K('疫苗'):item.kind===K('驅蟲')||/驅蟲/.test(item.kind||'')?K('驅蟲'):item.name===K('回診')?K('回診'):K('其他');
export function pickNewReminderKind(item,kind){
 if(kind===K('疫苗'))return {...changeCareType(item,K('疫苗')),name:t('疫苗'),lead:3};
 if(kind===K('驅蟲'))return {...changeCareType(item,'combined'),name:'',lead:3};
 if(kind===K('回診'))return {...changeCareType(item,K('其他')),name:K('回診'),lead:1};
 return {...changeCareType(item,K('其他')),name:'',lead:3};
}
// 沒有手機通知橋接（網頁預覽、或讀不到 App）時，不承諾「手機會跳通知」。
const phoneBridge=()=>typeof window!=='undefined'&&typeof window.V161Cloud?.request==='function';
export const NO_PHONE_NOTIFY=t('這個版本無法設定手機通知，請打開手機上的毛孩小本本 App 確認通知。');
// 2026-11-14b：新增的提醒和既有同類提醒重複時提示（暫停的也算），可以前往那一筆；仍可照樣新增。
function DuplicateHint({react:R,rows,today,onOpenExisting}){
 const h=R.createElement;if(!rows.length)return null;
 return h('div',{className:'rq-duplicate',role:'status'},h('style',null,'.rq-duplicate{padding:12px 14px;border-radius:14px;background:#fff4dc;color:#5c4320;line-height:1.6}.rq-duplicate p{margin:0 0 6px}.rq-duplicate .rq-duplicate-links{display:flex;flex-wrap:wrap;gap:8px 12px}html[data-theme=dark] .rq-duplicate{background:#3d3524;color:#f3e7cf}'),
  h('p',null,rows.length===1?t('已經有一個「{name}」提醒（{today}）。', {name: tn(rows[0].name), today: careReminderState(rows[0],today||'')}):`${t('已經有 {count} 個同類提醒：', {count: rows.length})}${rows.slice(0,3).map(row=>`「${tn(row.name)}」（${careReminderState(row,today||'')}）`).join(t('、'))}。`),
  h('p',null,t('要改日期可以直接到那一筆；這次是不同的項目，就照樣儲存。')),
  onOpenExisting&&h('div',{className:'rq-duplicate-links'},rows.slice(0,3).map(row=>h('button',{key:row.id,type:'button',className:'text-btn',onClick:()=>onOpenExisting(row)},t('前往「{name}」›', {name: tn(row.name)})))));
}
function NewReminderFields({react:R,item,onChange,Input,Textarea,errorProps,items,catId,isDemo,today,onOpenExisting}){
 const h=R.createElement,kind=newReminderKind(item);
 const duplicates=items?duplicateReminders(items,item,catId,isDemo):[];
 const chips=(label,options,value,pick)=>h('div',{className:'rq-chips',role:'group','aria-label':label},options.map(([id,text])=>h('button',{key:id,type:'button','aria-pressed':value===id,onClick:()=>pick(id)},text)));
 return h('section',{className:'reminder-quick-fields is-new','aria-label':t('新增提醒')},
  h('style',null,'html[lang=en] .reminder-quick-fields .rq-chips{grid-template-columns:repeat(2,minmax(0,1fr))}'),
  h('div',{className:'field'},h('span',null,t('要提醒什麼？')),chips(t('要提醒什麼'),KINDS,kind,id=>onChange(pickNewReminderKind(item,id)))),
  kind===K('驅蟲')&&h('div',{className:'field'},h('span',null,t('哪一種驅蟲？')),chips(t('哪一種驅蟲'),DEWORM,item.careSubtype||'combined',id=>onChange({...changeCareType(item,id),name:''}))),
  h(DuplicateHint,{react:R,rows:duplicates,today,onOpenExisting}),
  kind===K('其他')&&h('label',{className:'field'},t('叫什麼？'),h(Input,{'aria-label':t('提醒項目'),...errorProps(t('提醒項目')),value:item.name||'',placeholder:t('例如：洗牙、剪指甲、量體重'),maxLength:60,onChange:e=>onChange({...item,name:e.target.value})})),
  h('label',{className:'field'},kind===K('回診')?t('回診是哪一天？'):t('下次是哪一天？'),h(Input,{type:'date','aria-label':t('下次日期'),...errorProps(t('下次日期')),value:item.next,onChange:e=>onChange({...item,next:e.target.value})})),
  h('div',{className:'field'},h('span',null,t('什麼時候提醒？')),chips(t('什麼時候提醒'),LEADS,item.lead,id=>onChange({...item,lead:id})),
   h('p',{className:'reminder-help'},phoneBridge()?(item.lead?t('到期前 {lead} 天和當天', {lead: item.lead}):t('當天'))+(reminderClock(item)?` ${reminderClock(item)}`:t('早上 9 點'))+t('，手機會跳通知（沒網路也會）。日期照獸醫說的填。'):t('日期照獸醫說的填，到期日會列在照顧時間表。')+NO_PHONE_NOTIFY)),
  h('label',{className:'field'},t('幾點提醒？（選填，沒填是早上 9 點）'),h(Input,{type:'time','aria-label':t('提醒時間'),value:reminderClock(item),onChange:e=>{const value=e.target.value;if(value===''||validReminderClock(value))onChange({...item,reminderTime:value});}})),
  h('details',null,h('summary',null,t('補充（選填）：疫苗或藥品名稱、備註')),h('div',{className:'reminder-more'},
   h(CareOptionalProduct,{react:R,item,onChange}),
   h('label',{className:'field'},t('備註（選填）'),h(Textarea,{'aria-label':t('提醒備註'),...errorProps(t('提醒備註')),value:item.note,onChange:e=>onChange({...item,note:e.target.value})})))));
}

// Collapse advanced controls without converting or resetting their values.
export function QuickReminderFields({react:R,item,onChange,onClear,today,Input='input',Textarea='textarea',error='',errorField='',onErrorClear=()=>{},items,catId,isDemo,onOpenExisting}){
 const h=R.createElement,leadOptions=[...new Set([0,1,3,7,item.lead])].sort((a,b)=>a-b);
 const errorProps=label=>({error:errorField===label?error:'',onErrorClear});
 if(!item.id)return h(NewReminderFields,{react:R,item,onChange,Input,Textarea,errorProps,items,catId,isDemo,today,onOpenExisting});
 return h('section',{className:'reminder-quick-fields','aria-label':t('快速設定提醒')},
  h('style',null,`.reminder-quick-fields{display:grid;gap:18px;margin-bottom:20px}.reminder-quick-fields .field{margin:0}.reminder-quick-fields details{padding:12px;border:1px solid #b5beb7;border-radius:14px}.reminder-quick-fields summary{cursor:pointer;min-height:28px;line-height:28px}.reminder-quick-fields .reminder-more{display:grid;gap:16px;padding-top:16px}.reminder-quick-fields .reminder-help{margin:0;font-size:13px;line-height:1.6}html[data-theme=dark] .reminder-quick-fields details{border-color:#899b90}`),
  h('label',{className:'field'},t('提醒什麼'),h(Input,{'aria-label':t('提醒項目'),...errorProps(t('提醒項目')),value:item.name||'',placeholder:namedCareItem(item).name||t('例如：回診'),maxLength:60,onChange:e=>onChange({...item,name:e.target.value})})),
  h('label',{className:'field'},t('哪一天？'),h(Input,{type:'date','aria-label':t('下次日期'),...errorProps(t('下次日期')),value:item.next,onChange:e=>onChange({...item,next:e.target.value})})),
  h('p',{className:'reminder-help'},t('照獸醫說的填日期；還不確定可留空。')+(phoneBridge()?t('到期前手機會通知（沒網路也會提醒）。'):NO_PHONE_NOTIFY)),
  item.enabled===false&&h('p',{className:'reminder-help'},t('這個提醒目前未啟用，可在「更多設定」開啟。')),
  h('details',null,h('summary',null,t('更多設定（選填）')),h('div',{className:'reminder-more'},
   h(CareTypeField,{react:R,item,onChange}),
   h('label',{className:'field'},t('提前提醒'),h('select',{'aria-label':t('提前提醒'),value:item.lead,onChange:e=>onChange({...item,lead:Number(e.target.value)})},leadOptions.map(day=>h('option',{key:day,value:day},day===0?t('當天'):t('提前 {day} 天', {day}))))),
   h(ReminderTimeFields,{react:R,item,onChange}),
   h(CareOptionalProduct,{react:R,item,onChange}),
   h('label',{className:'field'},t('備註（選填）'),h(Textarea,{'aria-label':t('提醒備註'),...errorProps(t('提醒備註')),value:item.note,onChange:e=>onChange({...item,note:e.target.value})})),
   h('label',{className:'print-check'},h('input',{type:'checkbox','aria-label':t('手機提醒'),checked:item.enabled,onChange:e=>onChange({...item,enabled:e.target.checked})}),t('手機提醒（提前與當天，時間見上方「提醒時間」）')),
   item.id&&h('p',{className:'reminder-help'},t('最近一次紀錄：')+(item.last||t('尚未填寫'))),
   item.next&&h('button',{type:'button',className:'text-btn',onClick:onClear},t('取消原提醒日期'))
  )));
}
