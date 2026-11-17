import {careEntryOptions,CareOptionalProduct} from './vaccine-access.js?v=photo-simplify1';
import {changeCareType,isDewormCare,namedCareItem} from './reminder-enhancements-v34.js?v=photo-simplify1';
import {t, K} from './i18n.js?v=audit1117b';

const quickCareStyles=`.care-quick-fields{display:grid;gap:16px}.care-quick-fields h2{font-size:16px;margin:0 0 8px}.care-quick-buttons{display:flex;gap:8px;flex-wrap:wrap}.care-quick-buttons button{flex:1;min-height:46px;padding:10px 12px;border:1px solid #adbbb2;border-radius:14px;background:#fff;color:#314e40;font:inherit}.care-quick-buttons button[aria-pressed=true]{background:#e3eee6;border:2px solid #557961;font-weight:700}.care-quick-fields .field{margin:0}.care-quick-fields details{border:1px solid #b5beb7;border-radius:14px;padding:12px}.care-quick-fields summary{cursor:pointer;min-height:28px;line-height:28px}.care-quick-fields details[open]>.field{margin-top:12px}.care-quick-fields .care-quick-links{display:flex;flex-wrap:wrap;gap:12px}.care-quick-receipt{display:grid;gap:14px}.care-quick-receipt h1{font-size:24px}.care-quick-reminder{padding:14px;border:1px solid #b5beb7;border-radius:14px}.care-quick-reminder p{margin:0 0 8px}html[data-theme=dark] .care-quick-buttons button{background:#323b35;color:#e9eee9;border-color:#899b90}html[data-theme=dark] .care-quick-buttons button[aria-pressed=true]{background:#365441;color:#f2fff5;border-color:#a8d5b5}html[data-theme=dark] .care-quick-fields details,html[data-theme=dark] .care-quick-reminder{border-color:#899b90}`;

export function previousCareDay(today){
 const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-1);return date.toISOString().slice(0,10);
}
// 2026-11-14：記了打疫苗／驅蟲，原本同類別還沒完成的提醒（逾期、今天、快到了或已排日期）不能另外多一筆。
// 同類別：疫苗；體內、體外、體內外合一各自一類；「不確定」只在剛好一個驅蟲提醒時才對上。暫停的提醒不自動帶入。
const careDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const careLast=item=>[item.last,...(item.history||[])].filter(careDay).sort().at(-1)||'';
export function careMatchKey(item){
 if(item?.kind===K('疫苗'))return 'vaccine';
 if(!isDewormCare(item))return '';
 return 'deworm:'+(item.kind===K('體內驅蟲')?'internal':item.kind===K('體外驅蟲')?'external':item.careSubtype||'');
}
export const isOpenCareReminder=item=>item?.enabled===true&&careDay(item.next)&&!(careLast(item)&&item.next<=careLast(item));
export function openSameCareReminder(items,item,catId,isDemo=()=>false){
 const key=careMatchKey(item);if(!key)return null;
 const open=careEntryOptions(items||[],catId,isDemo).filter(isOpenCareReminder);
 const matches=key==='deworm:'?open.filter(isDewormCare):open.filter(row=>careMatchKey(row)===key);
 if(key==='deworm:'&&matches.length!==1)return null;
 return [...matches].sort((a,b)=>a.next.localeCompare(b.next))[0]||null;
}
// 2026-11-14b：自動合併以外，還要讓使用者選的情況——
// 驅蟲「不確定」又有好幾個未完成的驅蟲提醒（open，列出來選）；沒有未完成、但同類別有暫停中的提醒（paused，問要不要記在它上面並重新啟用）。
export function sameCareChoices(items,item,catId,isDemo=()=>false){
 const key=careMatchKey(item);if(!key)return {key,open:[],paused:[]};
 const live=careEntryOptions(items||[],catId,isDemo);
 const same=key==='deworm:'?live.filter(isDewormCare):live.filter(row=>careMatchKey(row)===key);
 return {key,open:same.filter(isOpenCareReminder).sort((a,b)=>a.next.localeCompare(b.next)),paused:same.filter(row=>row.enabled!==true)};
}
/** 「新增提醒」時，同一隻毛孩已經有的同類提醒（疫苗、同一種驅蟲；回診／其他看名稱）。暫停的也算。 */
export function duplicateReminders(items,item,catId,isDemo=()=>false){
 const list=Array.isArray(items)?items:[];
 const key=careMatchKey(item);
 if(key&&key!=='deworm:')return careEntryOptions(list,catId,isDemo).filter(row=>careMatchKey(row)===key);
 if(key)return [];
 const name=String(item?.name||'').trim();
 if(item?.kind!==K('其他')||!name)return [];
 return list.filter(row=>row&&row.kind===K('其他')&&String(row.name||'').trim()===name&&!row.deletedAt&&(!Object.hasOwn(row,'catId')||row.catId===catId)&&!row.demo&&!String(row.source||'').includes(K('示範'))&&!isDemo(row));
}
export const careReminderState=(row,today)=>row.enabled!==true?t('已暫停'):isOpenCareReminder(row)?(row.next<today?t('已過期，原本 {next}', {next: slash(row.next)}):row.next===today?t('今天到期'):t('下次 {next}', {next: slash(row.next)})):row.next?t('下次 {next}', {next: slash(row.next)}):t('還沒排日期');
const slash=value=>String(value||'').replaceAll('-','/');
export function QuickCareFields({react:R,item,onChange,date,onDateChange,dateUnknown,onDateUnknown,today,items,catId,isDemo,onSelect,onSchedule,onList}){
 const h=R.createElement,yesterday=previousCareDay(today),[otherDate,setOtherDate]=R.useState(!dateUnknown&&date!==today&&date!==yesterday),deworm=isDewormCare(item),options=careEntryOptions(items,catId,isDemo).filter(row=>deworm?isDewormCare(row):row.kind===item.kind);
 const [declined,setDeclined]=R.useState(''),key=careMatchKey(item),match=item.id?null:openSameCareReminder(items,item,catId,isDemo);
 // 有同類別未完成的提醒就直接記在它上面（存好後算完成、再排下次）；使用者可以改成另外新增一筆。
 R.useEffect(()=>{if(!item.id&&match&&declined!==key)onSelect(match);},[item.id,key,match?.id,declined]);
 // 沒有可自動合併的：驅蟲「不確定」有好幾個未完成的 → 列出來選；同類別只有暫停中的 → 問要不要記在它上面並重新啟用。
 const [revived,setRevived]=R.useState(''),choices=item.id||match||declined===key?null:sameCareChoices(items,item,catId,isDemo);
 const choosing=!choices?null:choices.open.length>1?{rows:choices.open,paused:false}:!choices.open.length&&choices.paused.length?{rows:choices.paused,paused:true}:null;
 const pickExisting=(row,paused)=>{setRevived(paused?row.id:'');onSelect(paused?{...row,enabled:true}:row);};
 const choiceLabel=row=>choosing.paused&&choosing.rows.length===1?t('記在它上面'):t('記在「{name}」上面（{today}）', {name: row.name, today: careReminderState(row,today)});
 const separate=()=>{setRevived('');setDeclined(careMatchKey(item));onSelect(changeCareType({id:'',kind:K('疫苗'),name:'',last:'',next:'',lead:3,note:'',enabled:true,history:[]},item.kind===K('疫苗')?K('疫苗'):item.kind===K('體內驅蟲')?'internal':item.kind===K('體外驅蟲')?'external':item.careSubtype||'unspecified'));};
 const pickDate=value=>{setOtherDate(false);onDateUnknown(false);onDateChange(value);};
 const pickType=value=>{if(item.id){onSelect(changeCareType({id:'',kind:K('疫苗'),name:'',last:'',next:'',lead:3,note:'',enabled:true,history:[]},value));}else onChange(changeCareType(item,value));};
 const chip=(text,active,onClick)=>h('button',{type:'button','aria-pressed':active,onClick},text);
 const state=item.id&&isOpenCareReminder(item)?(item.next<today?t('已過期（原本預定 {next}）', {next: slash(item.next)}):item.next===today?t('今天到期'):t('原本預定 {next}', {next: slash(item.next)})):'';
 return h('section',{className:'care-quick-fields','aria-label':t('快速記錄疫苗或驅蟲')},
  h('style',null,quickCareStyles+`.care-quick-fields{margin-bottom:20px}.care-quick-fields + button.primary{margin-top:0;margin-bottom:16px}.care-quick-links{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}.care-quick-merge{padding:12px 14px;border-radius:14px;background:#fff4dc;color:#5c4320;line-height:1.6}.care-quick-merge p{margin:0 0 6px}.care-quick-choice-list{display:grid;gap:8px;margin-top:8px}.care-quick-choice-list .secondary-btn{text-align:left;white-space:normal;line-height:1.5}html[data-theme=dark] .care-quick-merge{background:#3d3524;color:#f3e7cf}`),
  h('h1',null,t('記錄疫苗／驅蟲')),
  h('div',null,h('h2',null,t('這次做了什麼？')),h('div',{className:'care-quick-buttons'},chip(t('打疫苗'),item.kind===K('疫苗'),()=>pickType(K('疫苗'))),chip(t('驅蟲'),deworm,()=>pickType('unspecified')))),
  deworm&&!item.id&&h('div',{className:'care-quick-buttons','aria-label':t('驅蟲類型'),style:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))'}},chip(t('體內'),item.careSubtype==='internal',()=>pickType('internal')),chip(t('體外'),item.careSubtype==='external',()=>pickType('external')),chip(t('體內外合一'),item.careSubtype==='combined',()=>pickType('combined')),chip(t('不確定'),!item.careSubtype,()=>pickType('unspecified'))),
  options.length>0&&h('label',{className:'field'},t('同上次項目（選填）'),h('select',{'aria-label':t('同上次項目'),value:item.id||'',onChange:e=>{const picked=options.find(row=>row.id===e.target.value);if(!picked)setDeclined(careMatchKey(item));onSelect(picked);}},h('option',{value:''},t('新增一筆')),options.map(row=>h('option',{key:row.id,value:row.id},row.name+' · '+row.kind)))),
  choosing?h('div',{className:'care-quick-merge care-quick-choose',role:'group','aria-label':t('要記在哪個提醒上')},
   h('p',null,choosing.paused?(choosing.rows.length===1?t('有一個暫停中的「{name}」提醒，要記在它上面並重新啟用嗎？', {name: choosing.rows[0].name}):t('有 {count} 個暫停中的同類提醒，要記在哪一個上面並重新啟用？', {count: choosing.rows.length})):t('有 {count} 個驅蟲提醒還沒完成，這次要記在哪一個？', {count: choosing.rows.length})),
   h('div',{className:'care-quick-choice-list'},choosing.rows.map(row=>h('button',{key:row.id,type:'button',className:'secondary-btn',onClick:()=>pickExisting(row,choosing.paused)},choiceLabel(row))),
    h('button',{type:'button',className:'text-btn',onClick:()=>setDeclined(key)},t('另外新增')))):
  state?h('div',{className:'care-quick-merge',role:'status'},h('p',null,t('這次會記在「{name}」這個提醒上，{state}。', {name: item.name, state})),revived===item.id&&h('p',null,t('這個提醒原本暫停，存好後會重新啟用。')),h('p',null,t('存好後這個提醒就算完成，不會另外多一筆；接著可以填獸醫說的下次日期。')),h('button',{type:'button',className:'text-btn',onClick:separate},t('這次是不同的項目，另外新增一筆'))):
  item.id&&revived===item.id?h('div',{className:'care-quick-merge',role:'status'},h('p',null,t('這次會記在「{name}」這個提醒上；它原本暫停，存好後會重新啟用。', {name: item.name})),h('button',{type:'button',className:'text-btn',onClick:separate},t('這次是不同的項目，另外新增一筆'))):
  item.id&&h('small',null,t('沿用「')+item.name+t('」；原本紀錄與提醒會保留。')),
  h('div',null,h('h2',null,t('哪一天？')),h('div',{className:'care-quick-buttons'},chip(t('今天'),!dateUnknown&&!otherDate&&date===today,()=>pickDate(today)),chip(t('昨天'),!dateUnknown&&!otherDate&&date===yesterday,()=>pickDate(yesterday)),chip(t('其他日期'),!dateUnknown&&otherDate,()=>{setOtherDate(true);onDateUnknown(false);}))),
  !dateUnknown&&otherDate&&h('label',{className:'field'},t('實際日期'),h('input',{type:'date','aria-label':t('這次完成日期'),max:today,value:date,onChange:e=>onDateChange(e.target.value)})),
  h('label',{className:'print-check'},h('input',{type:'checkbox','aria-label':t('日期不記得'),checked:dateUnknown,onChange:e=>onDateUnknown(e.target.checked)}),t('日期不記得')),
  dateUnknown&&h('small',null,t('會記成「日期待確認」，不會當成今天。')),
  h('details',null,h('summary',null,t('補充名稱、藥品或備註（選填）')),!item.id&&h('label',{className:'field'},t('名稱（選填）'),h('input',{'aria-label':t('紀錄名稱'),value:item.name||'',maxLength:60,placeholder:item.kind===K('疫苗')?t('不知道也能存成「疫苗紀錄」'):t('不知道也可以先記錄'),onChange:e=>onChange({...item,name:e.target.value})})),item.id?h('p',null,t('沿用原本藥品與備註；若這次不同，請選「新增一筆」。')):h(CareOptionalProduct,{react:R,item,onChange,withNote:true})),
  null);
}

export function CareSavedReceipt({react:R,item,date,dateUnknown,onDone,onSchedule}){
 const h=R.createElement;
 // 2026-11-14：原本預定日已到或已過（這次就是在做那一次），提醒已結案，直接請他填下次日期，不再說「保留原日期」。
 const closedDate=item.next&&!dateUnknown&&item.next<=date?item.next:'';
 if(closedDate)item={...item,next:''};   // 只影響這張回條的文字，不改資料
 return h('section',{className:'care-quick-receipt','aria-label':t('紀錄已儲存')},h('style',null,quickCareStyles),h('h1',{role:'status'},t('已記下')),h('p',null,namedCareItem(item).name+' · '+(dateUnknown?t('日期待確認'):date)),
  closedDate?h('p',null,t('原本預定 {closedDate} 的這次已經完成，提醒已結案。填上獸醫說的下次日期，到期前手機會再提醒你。', {closedDate})):item.next?h('p',null,t('原本的下次日期：')+item.next+t('（還保留著）')):h('p',null,t('填上獸醫說的下次日期，到期前手機會提醒你。')),
  h('button',{type:'button',className:'primary',onClick:onSchedule},item.next?t('改下次日期'):t('填下次日期')),h('div',{className:'care-quick-reminder'},h('button',{type:'button',className:'text-btn',onClick:onDone},item.next?t('保留原日期'):t('之後再填'))));
}
