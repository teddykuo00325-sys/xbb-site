import {t, K} from './i18n.js?v=audit1117b';
import {STOOL_OPTIONS,observationInputText,changeObservationText} from './observation-entry.js?v=audit1117';
import {URINE_OPTIONS,eliminationKind,chooseEliminationKind,isLitterUrine} from './elimination-observation.js?v=200';

export function dailyCondition(record){
 if(eliminationKind(record)==='stool')return record.stoolStatus==='normal'?'normal':['abnormal','soft','diarrhea','blood'].includes(record.stoolStatus)?'abnormal':'';
 if(eliminationKind(record)==='urine')return ['usual','litterUsual'].includes(record.urineStatus)?'normal':['abnormal','smaller','larger','litterAbnormal','litterSmaller','litterLarger','frequent'].includes(record.urineStatus)?'abnormal':'';
 return '';
}
export function chooseDailyCondition(record,value){
 if(value===dailyCondition(record))return record; // Keep a specific old abnormal observation.
 if(eliminationKind(record)==='stool')return {...record,stoolStatus:value==='normal'?'normal':'abnormal',stoolEvent:'observed'};
 if(eliminationKind(record)==='urine')return {...record,urineStatus:value==='normal'?(isLitterUrine(record)?'litterUsual':'usual'):(isLitterUrine(record)?'litterAbnormal':'abnormal')};
 return record;
}
export function DailyQuickFields({react:R,record,onChange,error='',field='',today,Input='input',Textarea='textarea',onErrorClear=()=>{},onOpenHousehold}){
 const h=R.createElement,water=record.category===K('喝水'),kind=eliminationKind(record),condition=dailyCondition(record);
 const [measure,setMeasure]=R.useState(Boolean(String(record.amount??'').trim())||record.waterAction==='refill');
 const [more,setMore]=R.useState(false),[timing,setTiming]=R.useState(false);
 const [pendingClassification,setPendingClassification]=R.useState(null);
 const waterPurposeError=water&&!!error&&[K('觀察內容'),K('水量用途')].includes(field)&&!!String(record.amount??'').trim()&&!['observed','refill'].includes(record.waterAction)&&!observationInputText(record).trim();
 R.useEffect(()=>{if([K('日期'),K('時間')].includes(field)&&error)setTiming(true);if(!waterPurposeError&&[K('觀察內容'),K('數量'),K('尿團數'),K('單位')].includes(field)&&error)setMore(true);if(waterPurposeError)setMeasure(true);},[field,error,waterPurposeError]);
 const update=next=>{onErrorClear();onChange(next);};
 const chip=(label,selected,onClick)=>h('button',{type:'button','aria-pressed':selected,onClick},label);
 const input=(label,props)=>h('label',{className:'field'},label,h(Input,{...props,error:field&&t(field)===props['aria-label']?error:'',onErrorClear}));
 const quantityLabel=isLitterUrine(record)?t('尿團數'):t('數量');
 const changeClassification=next=>{if(isLitterUrine(next)!==isLitterUrine(record)&&String(record.amount??'').trim()){setPendingClassification(next);setMore(true);}else update(next);};
 const changeKind=value=>{if(kind!==value)changeClassification(chooseEliminationKind(record,value));};
 const statusOptions=kind==='urine'?URINE_OPTIONS:STOOL_OPTIONS;
 const statusValue=kind==='urine'?record.urineStatus:record.stoolStatus;
 const waterAmount=()=>h('div',{className:'daily-more-grid'},h('div',{className:'daily-quick-buttons',role:'group',tabIndex:-1,'aria-label':t('水量用途'),'aria-invalid':waterPurposeError||undefined,'aria-describedby':waterPurposeError?'water-purpose-error':undefined},
  chip(t('喝下的水量'),record.waterAction==='observed',()=>update({...record,waterAction:'observed'})),
  chip(t('水碗補水量'),record.waterAction==='refill',()=>update({...record,waterAction:'refill'}))),
  waterPurposeError&&h('p',{id:'water-purpose-error',className:'field-error',role:'alert','data-inline-error':''},t('請選「喝下的水量」或「水碗補水量」。')),
  input(t('水量（選填）'),{'aria-label':t('數量'),inputMode:'decimal',value:record.amount??'',placeholder:t('沒有量就留空'),onChange:e=>update({...record,amount:e.target.value,unit:record.unit||'ml'})}),
  record.amount&&record.unit&&record.unit!=='ml'&&record.unit!==K('毫升')&&input(t('原本單位'),{'aria-label':t('單位'),value:record.unit,onChange:e=>update({...record,unit:e.target.value})}),
  h('small',null,record.unit&&record.unit!=='ml'&&record.unit!==K('毫升')?t('保留原本單位：{unit}', {unit: record.unit}):t('單位：ml；補水量不當作喝下的水量。')));
 return h('section',{className:'daily-quick-fields','aria-label':water?t('快速記錄喝水'):t('快速記錄排泄')},
  h('style',null,`.ij-page-review:has(.daily-quick-fields) .app-content>.subtitle,.ij-page-review:has(.daily-quick-fields) .pet-owner-hint{display:none}.ij-page-review:has(.daily-quick-fields) .pet-owner-static{margin:0 0 6px}.ij-page-review:has(.daily-quick-fields) .persistence-status.unsaved{margin:4px 0;padding:3px 8px;font-size:12px}.inpaw-app.ij-page-review .ij-review-fields:has(.daily-quick-fields){margin:6px 0 0;padding:12px}.ij-review-fields .daily-quick-fields{gap:10px;margin:0;align-content:start}.ij-review-fields .daily-quick-fields details{padding:6px 10px}.ij-review-fields .daily-quick-fields summary{min-height:32px;line-height:32px;font-size:14px}.ij-review-fields .daily-quick-fields h2{margin:0 0 6px}.ij-review-fields .daily-quick-fields small{font-size:12px;line-height:1.4}`),
  h('style',null,`.daily-quick-fields{display:grid;gap:16px;margin-bottom:20px}.daily-quick-fields h2{font-size:16px;margin:0 0 8px}.daily-quick-fields .field{margin:0}.daily-quick-buttons{display:flex;gap:8px;flex-wrap:wrap}.daily-quick-buttons button{flex:1;min-height:46px;padding:10px 12px;border:1px solid #adbbb2;border-radius:14px;background:#fff;color:#314e40;font:inherit}.daily-quick-buttons button[aria-pressed=true]{background:#e3eee6;border:2px solid #557961;font-weight:700}.daily-quick-fields details{border:1px solid #b5beb7;border-radius:14px;padding:12px}.daily-quick-fields summary{cursor:pointer;min-height:28px;line-height:28px}.daily-more-grid{display:grid;gap:14px;padding-top:12px}.daily-quick-fields .daily-time-label{margin:0;font-size:13px}.daily-quick-fields small{line-height:1.6}html[data-theme=dark] .daily-quick-buttons button{background:#323b35;color:#e9eee9;border-color:#899b90}html[data-theme=dark] .daily-quick-buttons button[aria-pressed=true]{background:#365441;color:#f2fff5;border-color:#a8d5b5}html[data-theme=dark] .daily-quick-fields details{border-color:#899b90}`),
  water?h('div',null,h('h2',null,t('這次記什麼？')),h('div',{className:'daily-quick-buttons'},
   chip(t('有看到喝水'),record.waterAction==='observed'&&!measure,()=>{setMeasure(Boolean(String(record.amount??'').trim()));update({...record,waterAction:'observed'});}),
   chip(t('記水量'),measure,()=>setMeasure(true))),measure&&waterAmount()):
   h('div',null,h('h2',null,t('這次是？')),h('div',{className:'daily-quick-buttons'},chip(t('尿尿'),kind==='urine',()=>changeKind('urine')),chip(t('便便'),kind==='stool',()=>changeKind('stool')))),
  !water&&kind!=='unknown'&&h('div',null,h('h2',null,t('看起來如何？')),h('div',{className:'daily-quick-buttons'},chip(t('看起來正常'),condition==='normal',()=>update(chooseDailyCondition(record,'normal'))),chip(t('有異常'),condition==='abnormal',()=>update(chooseDailyCondition(record,'abnormal'))))),
  !water&&statusValue&&h('small',null,t('目前紀錄：{v0}', {v0: statusOptions?.[statusValue]||t('狀態未比較')})),
  h('details',{open:more,onToggle:e=>setMore(e.currentTarget.open)},h('summary',null,t('補充細節與備註（選填）')),h('div',{className:'daily-more-grid'},
   !water&&kind!=='unknown'&&h('label',{className:'field'},kind==='urine'?t('尿尿細節'):t('便便細節'),h('select',{'aria-label':kind==='urine'?t('尿尿觀察'):t('便便狀態'),value:statusValue||'',onChange:e=>{const value=e.target.value;changeClassification(kind==='urine'?{...record,urineStatus:value||undefined}:{...record,stoolStatus:value||undefined,stoolEvent:value?'observed':undefined});}},h('option',{value:''},t('未比較／尚未選擇')),Object.entries(statusOptions).map(([value,label])=>h('option',{key:value,value},label)))),
   pendingClassification&&h('div',{role:'alert'},h('p',null,t('尿團數和排尿次數不同。切換觀察方式會清空原本的數量，其他內容保留。')),h('div',{className:'daily-quick-buttons'},chip(t('保留原本觀察'),false,()=>setPendingClassification(null)),chip(t('切換並清空數量'),false,()=>{update({...record,eliminationKind:pendingClassification.eliminationKind,metric:pendingClassification.metric,urineStatus:pendingClassification.urineStatus,stoolStatus:pendingClassification.stoolStatus,stoolEvent:pendingClassification.stoolEvent,amount:'',unit:isLitterUrine(pendingClassification)?K('團'):''});setPendingClassification(null);}))),
   !water&&input(isLitterUrine(record)?t('發現的尿團數（選填）'):t('次數（選填）'),{'aria-label':quantityLabel,inputMode:'numeric',value:record.amount??'',placeholder:t('不確定就留空'),onChange:e=>update({...record,amount:e.target.value,unit:record.unit||(isLitterUrine(record)?K('團'):K('次'))})}),
   !water&&String(record.amount??'').trim()&&input(t('單位'),{'aria-label':t('單位'),value:record.unit||'',placeholder:isLitterUrine(record)?t('團'):t('次'),onChange:e=>update({...record,unit:e.target.value})}),
   !water&&isLitterUrine(record)&&h('small',null,t('尿團數不等於排尿次數；下方時間記發現時間。')),
   h('label',{className:'field'},t('備註（選填）'),h(Textarea,{'aria-label':t('觀察內容'),value:observationInputText(record),error:field===K('觀察內容')&&!waterPurposeError?error:'',onErrorClear,placeholder:t('可以只寫看到的情況，不確定不必猜'),onChange:e=>update(changeObservationText(record,e.target.value))})),
   !water&&h('button',{type:'button',className:'text-btn',onClick:()=>changeKind('unknown')},t('還不確定尿尿或便便')),
   !water&&onOpenHousehold&&h('button',{type:'button',className:'text-btn',onClick:onOpenHousehold},t('不知道是哪隻？記在家庭觀察')))),
  h('details',{open:timing,onToggle:e=>setTiming(e.currentTarget.open)},h('summary',null,t('{v0} {time} · 改時間', {v0: (d=>{const n=new Date(),today=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');return d===today?t('今天'):String(d||'').replace(/^\d{4}-(\d{2})-(\d{2})$/,(m,a,b)=>Number(a)+'/'+Number(b));})(record.date), time: record.time})),h('div',{className:'daily-more-grid'},
   input(t('日期'),{'aria-label':t('日期'),type:'date',max:today,value:record.date,onChange:e=>update({...record,date:e.target.value})}),
   input(isLitterUrine(record)?t('發現時間'):t('時間'),{'aria-label':t('時間'),type:'time',value:record.time,onChange:e=>update({...record,time:e.target.value})}))),
  !water&&kind==='unknown'&&!observationInputText(record).trim()&&h('small',null,t('先選尿尿或便便，或在選填區寫下看到的情況。不會預設成正常。')));
}
