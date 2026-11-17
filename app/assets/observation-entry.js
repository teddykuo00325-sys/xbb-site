import {t, K, tz} from './i18n.js?v=audit1117b';
import {URINE_OPTIONS,URINE_OPTIONS_SOURCE,eliminationKind,chooseEliminationKind,isLitterUrine} from './elimination-observation.js?v=8f5745b7843b';
export {URINE_OPTIONS,eliminationKind,isLitterUrine} from './elimination-observation.js?v=8f5745b7843b';
import {SUBQ_METRIC,SUBQ_LABEL,SUBQ_LABEL_SOURCE,isSubqFluid,weightRangeIssue} from './record-quantity.js?v=1';
/** Explicit observations only. Generated text keeps legacy readers compatible;
 * the original optional note is retained separately so editing never reuses a
 * stale generated status as the user's own words. No historical migration. */
export const STOOL_OPTIONS_SOURCE=Object.freeze({normal:K('正常'),abnormal:K('有異常（細節未記）'),soft:K('軟便'),diarrhea:K('腹瀉'),blood:K('血便')});
export const STOOL_OPTIONS=Object.freeze(Object.fromEntries(Object.entries(STOOL_OPTIONS_SOURCE).map(([k,v])=>[k,t(v)])));
export const APPETITE_OPTIONS_SOURCE=Object.freeze({usual:K('食慾和平常差不多'),less:K('吃得比平常少'),more:K('吃得比平常多'),none:K('觀察時沒有進食')});
export const APPETITE_OPTIONS=Object.freeze(Object.fromEntries(Object.entries(APPETITE_OPTIONS_SOURCE).map(([k,v])=>[k,t(v)])));
export const MOOD_OPTIONS_SOURCE=Object.freeze({usual:K('精神和平常差不多'),low:K('活動量比平常少'),active:K('活動量比平常多')});
export const MOOD_OPTIONS=Object.freeze(Object.fromEntries(Object.entries(MOOD_OPTIONS_SOURCE).map(([k,v])=>[k,t(v)])));
const VOMIT_EVENTS={observed:t('有嘔吐（觀察方式未註明）'),witnessed:t('親眼看到嘔吐'),found:t('剛發現嘔吐物，發生時間不確定')};
export const foundVomit=record=>record.category===K('嘔吐')&&record.vomitEvent==='found';
const enumLabel=(options,value)=>typeof value==='string'&&Object.hasOwn(options,value)?options[value]:'';
const clean=value=>String(value??'').trim();
export const observationInputText=record=>{const value=record.observationSummaryVersion===1?record.observationNote:record.text;return typeof value==='string'?value:'';};
export const changeObservationText=(record,text)=>record.observationSummaryVersion===1?{...record,observationNote:text}:{...record,text};
export function positiveVomitCount(record){const value=clean(record.amount);return record.category===K('嘔吐')&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>0&&record.unit===K('次')?Number(value):null;}
// stored=true：要寫進紀錄 text 的版本，一律用繁中原句（英文介面也存中文，顯示時再翻）。
export function structuredObservationText(record,stored=false){
 // 用到才取（和改版前一樣延遲取用），測試只注入部分相依時也不會出錯。
 const t$=stored?tz:t,U=()=>stored?URINE_OPTIONS_SOURCE:URINE_OPTIONS,S=()=>stored?STOOL_OPTIONS_SOURCE:STOOL_OPTIONS,A=()=>stored?APPETITE_OPTIONS_SOURCE:APPETITE_OPTIONS,M=()=>stored?MOOD_OPTIONS_SOURCE:MOOD_OPTIONS,SUBQ=()=>stored?SUBQ_LABEL_SOURCE:SUBQ_LABEL;
 const amount=clean(record.amount);
 if(record.category===K('體重'))return /^\d+(?:\.\d+)?$/.test(amount)&&Number.isFinite(Number(amount))&&Number(amount)>0&&record.unit===K('公斤')?t$('體重 {amount} 公斤', {amount}):'';
 if(record.category===K('排泄')&&eliminationKind(record)==='urine')return enumLabel(U(),record.urineStatus)?t$('尿尿：{v0}', {v0: enumLabel(U(),record.urineStatus)}):'';
 if(record.category===K('排泄'))return enumLabel(S(),record.stoolStatus)?t$('排便：{v0}', {v0: enumLabel(S(),record.stoolStatus)}):record.stoolEvent==='observed'?t$('有排便，狀態未記'):'';
 if(record.category===K('喝水'))return record.waterAction==='observed'?t$('看到喝水'):record.waterAction==='refill'?t$('水碗補水'):'';
 if(record.category===K('嘔吐')){
  const count=positiveVomitCount(record);
  if(foundVomit(record))return t$('發現嘔吐物（發生時間不確定）')+(count!==null?t$('，已確認 {count} 次', {count}):t$('，次數未記'));
  if(record.vomitEvent==='witnessed')return count!==null?t$('親眼看到嘔吐 {count} 次', {count}):t$('親眼看到嘔吐，次數未記');
  return count!==null?t$('嘔吐 {count} 次', {count}):record.vomitEvent==='observed'?t$('有嘔吐，次數未記'):'';
 }
 if(record.category===K('飲食')&&!record.feeding)return enumLabel(A(),record.appetiteStatus)||'';
 if(record.category===K('其他')&&record.metric==='mood')return enumLabel(M(),record.moodStatus)||'';
 // 皮下輸液（2026-11-14）：放在「其他」下，量用 ml。
 if(isSubqFluid(record))return /^\d+(?:\.\d+)?$/.test(amount)&&Number.isFinite(Number(amount))?`${SUBQ()} ${amount} ${(stored?(record.unit||'ml'):t(record.unit||'ml'))}`:t$('{label}，量未記', {label: SUBQ()});
 return '';
}
// 體重超出一般範圍時請飼主再確認，不硬擋。確認狀態只留在這次編輯（不寫進紀錄，備份格式不變）。
const weightEdits=new WeakMap();
// 2026-11-17：和這隻毛孩上一筆體重相差超過 30% 也請再確認（小數點錯位如 4.2→0.42 原本直接存進去，摘要出現 −99%）。
// 上一筆從本機資料讀（目前照顧中的毛孩在最上層 entries）；讀不到就只用一般範圍檢查，不硬擋。
const WEIGHT_JUMP=0.3;let weightBaseline={activeId:'',rows:[],at:0,loading:false};
function loadWeightBaseline(){
 if(weightBaseline.loading||Date.now()-weightBaseline.at<1500||typeof indexedDB==='undefined')return;
 weightBaseline.loading=true;const done=()=>{weightBaseline.loading=false;weightBaseline.at=Date.now();};
 try{const request=indexedDB.open('xiaobenben-local');request.onerror=done;request.onsuccess=()=>{const db=request.result;try{const tx=db.transaction('snapshots','readonly'),read=tx.objectStore('snapshots').get('main');read.onsuccess=()=>{const data=read.result?.data||{};const rows=(Array.isArray(data.entries)?data.entries:[]).filter(row=>row&&row.category===K('體重')&&!row.deleted&&!row.deletedAt&&!row.isDeleted&&row.demo!==true&&Number(row.amount)>0).map(row=>({id:row.id,kg:Number(row.amount),at:String(row.date||'')+'T'+String(row.time||'')})).sort((a,b)=>b.at.localeCompare(a.at));weightBaseline={...weightBaseline,activeId:data.multiCat?.activeId||'',rows};};tx.oncomplete=()=>{db.close();done();};tx.onerror=()=>{db.close();done();};}catch{db.close();done();}};}catch{done();}
}
export function weightJumpIssue(record,catId=''){
 const n=Number(clean(record?.amount));if(!Number.isFinite(n)||n<=0)return '';
 if(catId&&weightBaseline.activeId&&catId!==weightBaseline.activeId)return '';
 const previous=weightBaseline.rows.find(row=>row.id!==record?.id);if(!previous)return '';
 if(Math.abs(n-previous.kg)/previous.kg<=WEIGHT_JUMP)return '';
 return t('和上一筆 {previous} 公斤差很多，請確認小數點（例如 4.2 而不是 0.42 或 42）。',{previous:String(Math.round(previous.kg*100)/100)});
}
/** 一般範圍或和上一筆差太多，都請再確認一次（不硬擋）。 */
export function weightConfirmIssue(record){const binding=record&&weightEdits.get(record);return weightRangeIssue(record?.amount)||weightJumpIssue(record,binding?.catId||'');}
export function bindWeightEdit(record,session,catId=''){
 if(!record||typeof record!=='object'||!session||typeof session!=='object')return;
 loadWeightBaseline();
 const scope=`${catId}|${record.catId||''}|${record.id||'new'}|${record.category||''}`,value=clean(record.amount);
 if(session.scope!==scope||session.value!==value){session.confirmed='';session.scope=scope;session.value=value;}
 weightEdits.set(record,{session,scope,catId});
}
export function confirmWeightValue(record,confirmed=true){
 if(!record||typeof record!=='object')return;
 let binding=weightEdits.get(record);
 if(!binding){binding={session:{active:true,value:clean(record.amount),scope:''},scope:''};weightEdits.set(record,binding);}
 const {session,scope}=binding;if(!session.active||session.scope!==scope)return;
 session.confirmed=confirmed?clean(record.amount):'';
}
export const weightValueConfirmed=record=>{const binding=record&&weightEdits.get(record),session=binding?.session;return Boolean(session?.active&&binding.scope===session.scope&&session.confirmed&&session.confirmed===clean(record.amount));};
export function weightNeedsConfirmation(record){return record?.category===K('體重')&&Boolean(weightConfirmIssue(record))&&!weightValueConfirmed(record);}
export {weightRangeIssue};
export function observationHasContent(record){return Boolean(structuredObservationText(record)||observationInputText(record).trim());}
export function observationTextRequired(record){return record.category!==K('體重')&&!structuredObservationText(record);}
export function observationRequirementLabel(record){
 if(!observationTextRequired(record))return t('選填');
 if(record.category===K('嘔吐'))return t('選項、次數或文字擇一');
 if([K('排泄'),K('喝水')].includes(record.category)||(record.category===K('飲食')&&!record.feeding)||(record.category===K('其他')&&record.metric==='mood'))return t('選項或文字擇一');
 return t('＊必填');
}
export function observationGuidance(record){
 if(record.category===K('喝水')&&clean(record.amount)&&!['observed','refill'].includes(record.waterAction)&&!observationInputText(record).trim())return t('請選「喝下的水量」或「水碗補水量」。');
 return ({排泄:t('選擇排泄狀態，或寫下觀察內容。'),喝水:t('選擇實際看到的飲水項目，或寫下觀察內容。'),嘔吐:t('選擇有嘔吐、填寫有效次數，或寫下觀察內容。'),飲食:t('選擇食慾狀態，或寫下觀察內容。'),其他:record.metric==='mood'?t('選擇精神狀態，或寫下觀察內容。'):t('請寫下這次實際觀察到的情況。')})[record.category]||t('請寫下這次實際觀察到的情況。');
}
export function prepareObservationRecord(record){
 let note=observationInputText(record).trim();
 // Old generated weight titles are the one pre-existing known format.
 if(record.category===K('體重')&&record.observationSummaryVersion!==1)note=note.replace(/^體重\s*\d+(?:\.\d+)?\s*公斤(?:\s*[；;]\s*|$)/,'').trim();
 const summary=structuredObservationText(record,true),text=[summary,note].filter(Boolean).join('；');
 return {...record,text,observationNote:note,observationSummaryVersion:1};
}
export function ObservationFields({react:R,record,onChange,error,field,onOpenHousehold}){
 const h=R.createElement;
 const select=(label,value,options,change)=>[K('嘔吐'),K('飲食'),K('其他')].includes(record.category)?h('fieldset',{className:'compact-observation-choices'},h('legend',null,label),options.map(([id,text])=>h('button',{key:id,type:'button','aria-pressed':value===id,onClick:()=>onChange(change(value===id?'':id))},text))):h('label',{className:'field'},label,h('select',{'aria-label':label,value,onChange:e=>onChange(change(e.target.value))},h('option',{value:''},t('請選擇，或在下方填寫文字')),options.map(([value,label])=>h('option',{key:value,value},label))));
 if(record.category===K('排泄')){
  const kind=eliminationKind(record);
  return h(R.Fragment,null,h('fieldset',{className:'elimination-kind'},h('legend',null,t('這次觀察的是')),[['urine',t('尿尿')],['stool',t('便便')],['unknown',t('還不確定')]].map(([value,label])=>h('label',{key:value},h('input',{type:'radio',name:'elimination-kind',value,checked:kind===value,onChange:()=>onChange(chooseEliminationKind(record,value))}),label))),
   kind==='urine'?select(t('尿尿觀察'),enumLabel(URINE_OPTIONS,record.urineStatus)?record.urineStatus:'',Object.entries(URINE_OPTIONS),value=>{
    const next={...record,eliminationKind:'urine',metric:'urine',urineStatus:value||undefined};
    if(isLitterUrine(next)!==isLitterUrine(record))return {...next,amount:'',unit:isLitterUrine(next)?K('團'):''};
    return next;
   }):
   kind==='stool'?select(t('便便狀態'),enumLabel(STOOL_OPTIONS,record.stoolStatus)?record.stoolStatus:record.stoolEvent==='observed'?'event-unknown':'',[...Object.entries(STOOL_OPTIONS),['event-unknown',t('有排便，狀態未記')]],value=>({...record,eliminationKind:'stool',metric:'stool',stoolStatus:value==='event-unknown'?'unknown':value||undefined,stoolEvent:value?'observed':undefined})):h('p',{className:'microcopy left'},t('可先選尿尿或便便；不確定時直接寫下觀察，不會當作正常。')),
   isLitterUrine(record)&&h(R.Fragment,null,
    h('label',{className:'field'},t('發現的尿團數（選填）'),h('input',{'aria-label':t('尿團數'),type:'text',inputMode:'numeric',value:record.amount,placeholder:t('例如 2，不確定可留白'),'aria-invalid':field===K('尿團數')&&!!error||undefined,'aria-describedby':field===K('尿團數')&&error?'litter-count-error':undefined,onChange:e=>onChange({...record,amount:e.target.value,unit:K('團')})})),
    field===K('尿團數')&&error&&h('p',{id:'litter-count-error',className:'field-error',role:'alert'},error),
    h('p',{className:'microcopy left'},t('日期與時間填發現時。尿團數不等於排尿次數。'))),
   onOpenHousehold&&h('button',{type:'button',className:'text-btn observation-household',onClick:onOpenHousehold},t('不知道是哪隻？記在家庭觀察')),
   kind==='urine'&&h('p',{className:'microcopy left'},t('只記錄看到的情況，不判斷健康。擔心排尿困難時請直接聯絡獸醫，不要等紀錄累積。')));
 }
 if(record.category===K('喝水')){
  // One tap instead of open-dropdown-then-pick. Still explicit: nothing is preselected; tapping the chosen chip again clears it.
  const current=['observed','refill'].includes(record.waterAction)?record.waterAction:'';
  return h('fieldset',{className:'water-choice'},h('legend',null,t('飲水觀察')),h('div',{className:'water-choice-row'},[['observed',t('看到喝水')],['refill',t('水碗補水')]].map(([value,label])=>h('button',{key:value,type:'button','aria-pressed':current===value,onClick:()=>onChange({...record,waterAction:current===value?undefined:value})},label))));
 }
 if(record.category===K('嘔吐'))return h(R.Fragment,null,
  select(t('嘔吐事件'),enumLabel(VOMIT_EVENTS,record.vomitEvent)?record.vomitEvent:'',Object.entries(VOMIT_EVENTS),value=>({...record,vomitEvent:value||undefined})),
  h('label',{className:'field'},t('嘔吐次數（選填）'),h('input',{'aria-label':t('嘔吐次數'),type:'text',inputMode:'numeric','aria-invalid':field===K('嘔吐次數')&&!!error||undefined,'aria-describedby':field===K('嘔吐次數')&&error?'observation-count-error':undefined,value:record.amount,placeholder:t('不知道可留白'),onChange:e=>onChange({...record,amount:e.target.value,unit:K('次')})})),
  field===K('嘔吐次數')&&error&&h('p',{id:'observation-count-error',className:'field-error',role:'alert'},error),
  h('p',{className:'microcopy left'},foundVomit(record)?t('下方填發現時間。只填確定的次數，外觀可寫在備註。'):t('選擇嘔吐事件或填寫正整數次數後，備註可以留白。')),
  onOpenHousehold&&h('button',{type:'button',className:'text-btn observation-household',onClick:onOpenHousehold},t('不知道是哪隻？記在家庭觀察')));
 if(record.category===K('飲食')&&!record.feeding)return select(t('食慾狀態'),enumLabel(APPETITE_OPTIONS,record.appetiteStatus)?record.appetiteStatus:'',Object.entries(APPETITE_OPTIONS),value=>({...record,appetiteStatus:value||undefined}));
 if(record.category===K('其他')&&record.metric==='mood')return select(t('精神狀態'),enumLabel(MOOD_OPTIONS,record.moodStatus)?record.moodStatus:'',Object.entries(MOOD_OPTIONS),value=>({...record,moodStatus:value||undefined}));
 if(record.category===K('其他')){
  const subq=isSubqFluid(record);
  return h(R.Fragment,null,
   h('fieldset',{className:'compact-observation-choices'},h('legend',null,t('常用項目（選填）')),h('button',{type:'button','aria-pressed':subq,onClick:()=>onChange(subq?{...record,metric:'other',amount:'',unit:''}:{...record,metric:SUBQ_METRIC,unit:'ml'})},SUBQ_LABEL)),
   subq&&h('label',{className:'field'},t('輸液量（ml，選填）'),h('input',{'aria-label':t('輸液量'),type:'text',inputMode:'decimal',value:record.amount??'','aria-invalid':field===K('數量')&&!!error||undefined,placeholder:t('例如 100，不確定可留白'),onChange:e=>onChange({...record,amount:e.target.value,unit:'ml'})})),
   subq&&h('p',{className:'microcopy left'},t('只記下實際做了多少；量與頻率照獸醫交代。')));
 }
 return null;
}
