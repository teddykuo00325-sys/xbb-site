import {t, tn, K, isEnglish} from './i18n.js?v=audit1117b';
import {requireActivePet} from './pet-archive.js?v=8f5745b7843b';
import {eatenAmountMissing,feedingMealRows} from './clear-presentation.js?v=audit1117';
import {NoEatingField} from './diet-observations-ui.js?v=photo-simplify1';
import {FOOD_CATEGORIES,validFoodCategory,foodCategoryLabel,planFirstFood,matchingFoodChange} from './food-enhancements-v32.js?v=8f5745b7843b';
import {isFoodArchived} from './food-archive-v35.js?v=food-simple1';
import {calendarDay,localCalendarDate,laterToday} from './today-overview-v29.js?v=8f5745b7843b';
import {dietNumeric} from './diet-observations-model.js?v=photo-simplify1';
import {recordIsLive} from './record-identity.js?v=8f5745b7843b';
import {isHandoverRecord} from './o-records-v59.js?v=photo-simplify1';
import {deleteRecordAndRepairDrafts} from './meal-draft-references.js?v=8f5745b7843b';
const fail=message=>{throw Error(message)};
const unknownQuantity=value=>value===null||value===undefined||String(value).trim()==='';
const savedQuantity=value=>unknownQuantity(value)?null:String(value).trim();
const quantityLabel=(value,unit)=>unknownQuantity(value)?t('未知'):`${value} ${t(unit)}`;
// 寫進紀錄 text 用：一律繁中原句與原始單位（英文介面也一樣），顯示時再翻。
const storedQuantityLabel=(value,unit)=>unknownQuantity(value)?K('未知'):`${value} ${unit}`;
const linkedMealChange=(change,id)=>change.sourceType==='feeding'&&change.sourceEntryId===id||change.firstFoodEntryId===id;
/** 第一個不合格的欄位與給人看的錯誤文字（表單 noValidate，改由畫面顯示）；都合格回傳 null。 */
export function mealFieldError(form){
 const el=[...(form?.elements||[])].find(x=>x.willValidate&&!x.disabled&&x.validity&&!x.validity.valid);
 if(!el)return null;
 const label=(el.getAttribute('aria-label')||el.closest?.('label')?.querySelector('span')?.textContent||t('這個欄位')).trim(),v=el.validity;
 const reason=v.valueMissing?t('還沒填'):v.badInput||v.typeMismatch?t('請填數字'):v.rangeUnderflow?(Number(el.min)>0&&Number(el.min)<1?t('要大於 0'):t('不能小於 {min}', {min: el.min})):v.rangeOverflow?(el.type==='date'?t('不能晚於今天'):/吃下量|eaten/i.test(label)?t('不能大於餵食量 {max}', {max: el.max}):t('不能大於 {max}', {max: el.max})):t('格式不對');
 return {el,message:t('「{label}」{reason}。',{label,reason})};
}
export const MEAL_UNITS=['g',K('公克'),'kg',K('公斤'),'ml',K('毫升'),K('包'),K('罐'),K('顆'),K('片')];
export const emptyMealPart=()=>({id:'',foodId:'',quickName:'',quickCategory:'',provided:'',eaten:'',unit:'g',noEatingConfirmed:false});
function withoutNestedParts({parts,...value}){
 return {...emptyMealPart(),...value};
}
export function mealParts(value={},entries=[]){
 if(Array.isArray(value.parts)&&value.parts.length)return value.parts.map(withoutNestedParts);
 const old=entries.find(r=>r.id===value.id);
 if(old?.mealGroupId){const rows=feedingMealRows(old,entries);return [old,...rows.filter(r=>r.id!==old.id)].map(row=>withoutNestedParts({...row.feeding,...(row.id===value.id?value:{})}));}
 return [withoutNestedParts(value)];
}
/** Explicit choices retain exact food-version IDs. Recent cards are suggestions,
 * never selected automatically and never treated as a new saved meal. */
export function mealFoodChoices(foods=[],entries=[]){
 const available=foods.filter(f=>!isFoodArchived(f)),byId=new Map(available.map(f=>[f.id,f])),seen=new Set(),ordered=[];
 for(const row of [...entries].filter(row=>row.feeding).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))){const food=byId.get(row.feeding.foodId);if(food&&!seen.has(food.id)){seen.add(food.id);ordered.push({...food,recentMeal:true});}}
 for(const food of available)if(!seen.has(food.id)){seen.add(food.id);ordered.push({...food,recentMeal:false});}
 return ordered;
}
/** 最近吃過的不同食品（最新在前，最多 limit 種）與當時的單位。只列仍可選的食品卡；份量不帶。 */
export function recentMealFoods(rows=[],choices=[],limit=3){
 const byId=new Map(choices.map(food=>[food.id,food])),seen=new Set(),result=[];
 for(const row of [...rows].filter(row=>row?.feeding).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))){
  const food=byId.get(row.feeding.foodId);if(!food||seen.has(food.id))continue;
  seen.add(food.id);result.push({food,unit:MEAL_UNITS.includes(row.feeding.unit)?row.feeding.unit:'g'});
  if(result.length>=limit)break;
 }
 return result;
}
export function mealFoodLabel(food){return [food.name,food.brand,food.flavor,food.version?`v${food.version}`:''].filter(Boolean).join(' · ');}
const partFields=p=>({foodId:p.foodId||'',quickName:p.quickName||'',quickCategory:p.quickCategory||undefined,provided:p.provided??'',eaten:p.eaten??'',unit:p.unit||'g',noEatingConfirmed:p.noEatingConfirmed===true});
export function mealValue(value,entries=[]){const parts=mealParts(value,entries);return {...value,...partFields(parts[0]),id:value.id||'',date:value.date||'',time:value.time||'',note:value.note||'',change:value.change===true,quickCategory:parts[0].quickCategory||undefined,parts};}
export function validateMeal(data,value,today=localCalendarDate(),now=new Date()){
 if(calendarDay(value.date)===null||value.date>today)fail(t('請選擇今天或以前的有效餵食日期。'));
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time))fail(t('請填寫有效餵食時間。'));
 if(laterToday(value.date,value.time,now))fail(t('餵食時間不能晚於現在。還沒餵的餐可以先放著，稍後再補。'));
 const parts=mealParts(value,data.entries);
 for(const [i,p] of parts.entries()){
  const label=t('食品 {n}：', {n: i+1}),old=(data.entries||[]).find(r=>r.id===p.id),food=data.foodCards.find(f=>f.id===p.foodId);
  if(p.foodId&&!food)fail(label+t('食品版本已不存在，原資料未更動。'));
  if(food&&isFoodArchived(food)&&old?.feeding?.foodId!==food.id)fail(label+t('這張食品卡已刪除，不能新增餵食。'));
  if(!food&&!String(p.quickName||'').trim())fail(label+t('請填寫食品名稱，或選擇已有食品。'));
  if(!food&&!validFoodCategory(p.quickCategory))fail(label+t('請選擇食品分類。'));
  const provided=unknownQuantity(p.provided)?null:dietNumeric(p.provided),eaten=unknownQuantity(p.eaten)?null:dietNumeric(p.eaten);
  if(!unknownQuantity(p.provided)&&(provided===null||provided<=0))fail(label+t('餵食量若填寫，須為大於 0 的數字；未知可留空。'));
  if(!unknownQuantity(p.eaten)&&(eaten===null||provided!==null&&eaten>provided))fail(label+t('吃下量須為非負數，且不可超過已知餵食量；未知可留空。'));
  if(p.noEatingConfirmed===true&&mealNoEatingConflicts(parts).length)fail(t('不進食標記與吃下量尚未核對；請保留原值並取消標記，或明確確認這餐全部吃下 0。'));
  if(!MEAL_UNITS.includes(p.unit))fail(label+t('請選擇有效單位。'));
 }
 if(!parts.length||parts.length>30)fail(t('一餐需保留 1～30 項食品。'));
 if(parts.filter(p=>p.id).length!==new Set(parts.filter(p=>p.id).map(p=>p.id)).size)fail(t('食品項目重複，請重新開啟這一餐。'));
 if(typeof (value.note??'')!=='string'||(value.note||'').length>1000)fail(t('備註請控制在 1000 字內。'));
 return parts;
}
/** Both entry points use this transaction. Existing rows and metadata are never reconstructed destructively. */
export function saveUnifiedMeal(data,value,{today=localCalendarDate(),source=value.entrySource||K('餵食紀錄'),catId,now=new Date().toISOString()}={}){
 const parts=validateMeal(data,value,today,now),id=value.id;if(!id)fail(t('這一餐尚未取得識別碼。'));
 const original=data.entries.find(r=>r.id===id),groupId=original?.mealGroupId||id,oldRows=original?.mealGroupId?feedingMealRows(original,data.entries):original?[original]:[];
 const removed=value.removedPartIds||[];
 if(!Array.isArray(removed)||new Set(removed).size!==removed.length||removed.some(id=>!oldRows.some(row=>row.id===id)||parts.some(p=>p.id===id)))fail(t('要移除的食品項目已變動，請重新開啟這一餐。'));
 if(oldRows.some(row=>!parts.some(p=>p.id===row.id)&&!removed.includes(row.id)))fail(t('這一餐的食品資料已變動，請重新開啟，原紀錄仍保留。'));
 if(parts.some(p=>p.id&&!oldRows.some(row=>row.id===p.id)))fail(t('食品紀錄不屬於這一餐。'));
 let foods=[...data.foodCards],changes=[...(data.changes||[])],cat={...data.cat},rows=[];
 parts.forEach((p,index)=>{
  const old=oldRows.find(r=>r.id===p.id),entryId=old?.id||(index===0&&!original?id:`${groupId}-part-${crypto.randomUUID()}`);
  let food=foods.find(f=>f.id===p.foodId);
  if(!food){const foodId=old?`${entryId}-food-${crypto.randomUUID()}`:`${entryId}-food`;food={id:foodId,familyId:foodId,version:1,name:p.quickName.trim(),foodCategory:p.quickCategory,kind:foodCategoryLabel({foodCategory:p.quickCategory}),brand:'',flavor:'',netWeight:'',ingredients:'',nutrients:[],photos:[],source:K('手動輸入'),confirmed:today};foods.push(food);}
  const feeding={...old?.feeding,id:entryId,foodId:food.id,date:value.date,time:value.time,provided:savedQuantity(p.provided),eaten:savedQuantity(p.eaten),unit:p.unit,note:old&&value.note===(original?.feeding?.note||'')?(old.feeding?.note||''):(value.note||'').trim(),change:old?.feeding?.change??(index===0&&value.change===true),noEatingConfirmed:p.noEatingConfirmed===true};
  const row={...old,id:entryId,mealGroupId:groupId,...(!old&&catId?{catId}:{}),date:value.date,time:value.time,category:K('飲食'),text:K(`${food.name}｜餵食量 ${storedQuantityLabel(feeding.provided,feeding.unit)} · 吃下量 ${storedQuantityLabel(feeding.eaten,feeding.unit)}${feeding.note?'；'+feeding.note:''}`),amount:feeding.provided,unit:feeding.unit,source:old?.source||source,demo:old?.demo??false,confirmed:old?.confirmed??true,createdAt:old?.createdAt||now,feeding};
  delete row.mealRevisions;
  if(!old){const decision=planFirstFood({...data,cat,foodCards:foods,entries:[...data.entries,...rows]},food,feeding,today);if(decision)cat={...cat,firstFoodDecisions:[...(cat.firstFoodDecisions||[]),decision]};}
  changes=changes.map(c=>linkedMealChange(c,entryId)?{...c,date:value.date,...(old?.feeding?.foodId!==food.id?{foodFamilyId:food.familyId||food.id,note:K(`更正餐點食品：開始使用 ${food.name}（${food.flavor||food.kind}）v${food.version}`)}:{})}:c);
  if(!old&&feeding.change&&!matchingFoodChange(changes,food,entryId,value.date))changes.push({id:`chg-${entryId}`,sourceEntryId:entryId,sourceType:'feeding',foodFamilyId:food.familyId||food.id,date:value.date,kind:K('換飼料'),note:K(`開始使用 ${food.name}（${food.flavor||food.kind}）v${food.version}`),uncertain:false,demo:false});
  rows.push(row);
 });
 const history=oldRows.flatMap(row=>row.mealRevisions||[]);
 if(oldRows.length)history.push({at:now,rows:structuredClone(oldRows.map(({mealRevisions,...row})=>row)),changes:structuredClone((data.changes||[]).filter(change=>oldRows.some(row=>linkedMealChange(change,row.id))))});
 if(history.length)rows[0].mealRevisions=history;
 const ids=new Set(oldRows.map(r=>r.id));
 let result={...data,foodCards:foods,entries:[...data.entries.filter(r=>!ids.has(r.id)),...rows],changes:changes.filter(change=>!removed.some(id=>linkedMealChange(change,id))),cat};
 for(const id of removed)result=deleteRecordAndRepairDrafts(result,id);
 return result;
}

// A failed transaction leaves this same session and every input intact.
export function commitUnifiedMealDraft(data,value,options){
 const next=saveUnifiedMeal(data,value,options),session=data.foodSession;
 const foodSession=session?.foodPending?{...session,screen:'list',feedPending:false,feedDirty:false,
  foodOrigin:session.foodOrigin==='feed'?'list':session.foodOrigin,
  feeding:{...session.feeding,id:'',provided:'',eaten:'',note:'',change:false,parts:undefined,removedPartIds:undefined}}:null;
 return {...next,foodSession};
}

/** A health flag never changes intake. Explicit zero resolution keeps a reversible
 * snapshot in the draft only; saveUnifiedMeal writes only the declared fields. */
export function setMealNoEating(parts,checked){
 return parts.map(p=>{const next={...p,noEatingConfirmed:checked};if(!checked){if(Object.prototype.hasOwnProperty.call(p,'eatenBeforeNoEating'))next.eaten=p.eatenBeforeNoEating;delete next.eatenBeforeNoEating;}return next;});
}
export function confirmMealZero(parts){
 return parts.map(p=>({...p,eatenBeforeNoEating:(Object.prototype.hasOwnProperty.call(p,'eatenBeforeNoEating')?p.eatenBeforeNoEating:p.eaten)??'',eaten:'0',noEatingConfirmed:true}));
}
export function mealNoEatingConflicts(parts){return parts.some(p=>p.noEatingConfirmed===true)?parts.filter(p=>dietNumeric(p.eaten)!==0):[];}

export function UnifiedMealForm({react:R,value,onChange,onSave,petName,foods=[],entries=[],today=localCalendarDate(),busy=false,blocked=false,onFoodEditor,onManageFoods,notice,onSaveDraft,focusEaten=false}){
 const h=R.createElement,[error,setError]=R.useState(''),[manualParts,setManualParts]=R.useState([]),[prefillNote,setPrefillNote]=R.useState(''),saveKey=R.useRef(null),v=mealValue(value,entries),parts=v.parts;
 const choices=mealFoodChoices(foods,entries),entryState=R.useRef(v.id?t('編輯已保存的餐次'):parts.some(p=>p.foodId||p.quickName||p.provided||p.eaten)||v.note?t('繼續餵食草稿'):t('新的一餐'));
 const recentChoices=choices.filter(food=>food.recentMeal),otherChoices=choices.filter(food=>!food.recentMeal);
 // 2026-11-17：按 X 會把這一餐停成草稿；再按「記一餐」開的是新表單，以前不說有草稿，結果多出第 2 份。開新的一餐時先提醒還有幾份沒存。
 const [parkedDrafts,setParkedDrafts]=R.useState(0),freshMeal=R.useRef(entryState.current===t('新的一餐'));
 (R.useEffect||(()=>{}))(()=>{if(!freshMeal.current||typeof indexedDB==='undefined')return;let live=true;try{const request=indexedDB.open('xiaobenben-local');request.onsuccess=()=>{const db=request.result;try{const tx=db.transaction('snapshots','readonly'),read=tx.objectStore('snapshots').get('main');read.onsuccess=()=>{const n=(read.result?.data?.cat?.mealDrafts||[]).length;if(live)setParkedDrafts(n);};tx.oncomplete=()=>db.close();}catch{db.close();}};}catch{}return()=>{live=false;};},[]);
 const foodOption=food=>h('option',{key:food.id,value:food.id},`${mealFoodLabel(food)}${isFoodArchived(food)?t('（已封存）'):''}`);
 const availableFoodIds=new Set(choices.map(food=>food.id));
 const needsReplacement=part=>!part.id&&part.foodId&&!availableFoodIds.has(part.foodId);
 const noEating=parts.some(p=>p.noEatingConfirmed),conflicts=mealNoEatingConflicts(parts),zeroResolved=noEating&&!conflicts.length;
 const supplement=focusEaten&&Boolean(v.id)&&parts.every(p=>p.id)&&!blocked&&!noEating;
 const focusIndex=R.useRef(Math.max(0,parts.findIndex(eatenAmountMissing))).current;
 const edit=patch=>{setError('');onChange({...v,...patch,...partFields((patch.parts||parts)[0])})};
 const part=(i,patch)=>{const next=parts.map((p,n)=>n===i?{...p,...patch}:p);edit({parts:next});};
 const field=(title,el)=>h('label',{className:'cj-field'},h('span',null,title),el);
 const input=(label,key,type,extra={})=>field(label,h('input',{type,value:v[key]||'','aria-label':label,onChange:e=>edit({[key]:e.target.value}),...extra}));
 // 2026-11-14：表單改 noValidate，自己把欄位錯誤寫在畫面上（Android WebView 不一定顯示原生驗證泡泡，看起來會像按了沒反應）。
 const save=e=>{e.preventDefault();const fieldError=mealFieldError(e.currentTarget);if(fieldError){setError(fieldError.message);fieldError.el.focus?.();return;}try{validateMeal({entries,foodCards:foods},v,today);setError('');saveKey.current ||= `meal-${crypto.randomUUID()}`;onSave({...v,id:v.id||saveKey.current});}catch(e){setError(tn(e.message));}};
 const recent=entries.filter(row=>row.feeding&&recordIsLive(row)&&!isHandoverRecord(row)&&!row.demo&&!String(row.source||'').includes(K('示範'))&&row.date<=today)
  .sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 const last=recent[0];
 const lastParts=last?mealParts({...last.feeding,id:last.id},recent):[];
 const blankMeal=!v.id&&!v.note&&!v.change&&parts.length===1&&!parts.some(p=>p.foodId||p.quickName||p.quickCategory||p.provided||p.eaten||p.noEatingConfirmed);
 const canReuseMeal=blankMeal&&!busy&&!blocked&&lastParts.length>0&&lastParts.length<=30&&lastParts.every(part=>availableFoodIds.has(part.foodId)&&MEAL_UNITS.includes(part.unit));
 // 2026-11-14：「同上一餐」與最近 3 種食品快選。手打名稱的快速食品存檔時已建立食品卡，所以一樣能沿用。
 // 只帶入食品與單位；餵食量、吃下量一律留空，不把上一餐的吃下量當成這餐的事實，仍要按儲存才記錄。
 const recentFoods=recentMealFoods(recent,choices);
 const foodName=id=>foods.find(food=>food.id===id)?.name||t('上一餐食品');
 const reuseLabel=[...new Set(lastParts.map(p=>foodName(p.foodId)))].join(t('、'));
 const prefill=(next,message)=>{edit({parts:next});setPrefillNote(message);};
 const quantity=(p,i,key,label,extra={})=>field(label,h('input',{'aria-label':t('食品 {v0} {v1}', {v0: i+1, v1: key==='provided'?t('餵食量'):t('吃下量')}),type:'number',inputMode:'decimal',step:'any',value:p[key]??'',onChange:e=>part(i,{[key]:e.target.value}),...extra}));
 if(supplement)return h('form',{className:'unified-meal-form meal-supplement-form','data-testid':'feeding-form',noValidate:true,onSubmit:save},
  h('div',{className:'meal-intro meal-context'},petName&&h('strong',{className:'meal-owner'},petName),h('h2',null,t('補吃下量')),h('p',null,t('{date} · {time}。不確定的食品可留空。', {date: v.date===today?t('今天'):v.date, time: v.time}))),
  notice&&h('p',{className:'cj-success',role:'status'},notice),
  parts.map((p,i)=>{
   const food=foods.find(item=>item.id===p.foodId);
   return h('fieldset',{className:'cj-part',key:p.id},
    h('legend',null,food?mealFoodLabel(food):t('食品 {v0}', {v0: i+1})),
    h('p',{className:'meal-quantity-note'},t('原餵食量 {v0}', {v0: quantityLabel(p.provided,p.unit)})),
    quantity(p,i,'eaten',t('吃下量（{unit}）', {unit: t(p.unit)}),{min:0,max:p.provided||undefined,placeholder:t('未知留空'),autoFocus:i===focusIndex}),
    eatenAmountMissing(p)&&dietNumeric(p.provided)>0&&h('button',{type:'button',className:'meal-subtle','aria-label':t('食品 {v0} 已吃光', {v0: i+1}),onClick:()=>part(i,{eaten:String(p.provided)})},t('已吃光，帶入餵食量')));
  }),
  error&&h('p',{className:'cj-error',role:'alert'},error),
  h('div',{className:'meal-save-bar'},h('button',{className:'cj-primary',type:'submit',disabled:busy},busy?t('儲存中…'):t('儲存吃下量'))));
 return h('form',{className:'unified-meal-form','data-testid':'feeding-form',noValidate:true,onSubmit:save},
  h('style',null,`.unified-meal-form .meal-optional-amounts{margin:14px 0 4px;border:1px solid var(--paw-rim,#b5beb7);border-radius:14px;padding:10px 12px}.unified-meal-form .meal-optional-amounts>summary,.unified-meal-form .meal-mix-options>summary{cursor:pointer;min-height:28px;line-height:1.6}.unified-meal-form .meal-optional-amounts[open]>.meal-amounts{margin-top:14px}.unified-meal-form .meal-mix-options{margin:12px 0 16px}.unified-meal-form .meal-save-bar{margin-top:18px}.unified-meal-form .meal-quantity-status{font-size:13px;margin:8px 0;color:inherit}.unified-meal-form .meal-recent-foods{margin:2px 0 10px}.unified-meal-form .meal-recent-foods .meal-cat-chips{display:flex;flex-wrap:wrap;gap:8px}.unified-meal-form .meal-recent-chip{min-height:44px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.unified-meal-form .meal-prefill-note{margin:8px 0 12px}`),
  h('div',{className:'meal-intro meal-context'},petName&&h('strong',{className:'meal-owner'},petName),h('span',{className:'meal-step'},entryState.current)),
  parkedDrafts>0&&h('p',{className:'meal-draft-hint',role:'status'},t('還有 {count} 份沒存的餵食草稿；想接著填，請關掉這張，點首頁上的草稿卡繼續。',{count:parkedDrafts})),
  notice&&h('p',{className:'cj-success',role:'status'},notice),
  blocked&&h('p',{className:'cj-error',role:'status'},t('先完成這一餐的食品草稿，已填份量會保留。')),
  canReuseMeal&&h('button',{type:'button',className:'meal-reuse meal-reuse-action','aria-label':t('同上一餐：{reuseLabel}', {reuseLabel}),onClick:()=>prefill(lastParts.map(p=>({...emptyMealPart(),foodId:p.foodId,unit:p.unit})),t('已帶入上一餐的{v0}食品與單位。份量這次再填（不知道可留空），按「儲存這一餐」才會記錄。', {v0: lastParts.length>1?t(' {n} 項', {n: lastParts.length}):''}))},h('strong',null,t('同上一餐')),h('small',null,t('{reuseLabel} · 份量這次再填', {reuseLabel}))),
  prefillNote&&!blankMeal&&!v.id&&h('p',{className:'meal-quantity-note meal-prefill-note',role:'status'},prefillNote),
  parts.map((p,i)=>h('fieldset',{className:'cj-part',key:p.id||i},
   h('legend',null,parts.length===1?t('吃什麼？'):t('食品 {v0}', {v0: i+1})),
   !p.id&&!choices.length&&h('p',{className:'meal-empty-foods'},t('先寫名稱、點分類，就能記這一餐。')),
   !p.id&&!p.foodId&&!String(p.quickName||'').trim()&&recentFoods.length>0&&!busy&&!blocked&&h('div',{className:'cj-field meal-recent-foods'},h('span',null,t('最近吃過（點一下帶入）')),h('div',{className:'meal-cat-chips',role:'group','aria-label':t('食品 {v0} 最近吃過的食品', {v0: i+1})},recentFoods.map(item=>h('button',{type:'button',key:item.food.id,className:'meal-chip meal-recent-chip','aria-label':t('帶入最近吃過：{v0}', {v0: mealFoodLabel(item.food)}),onClick:()=>{setManualParts(manualParts.filter(n=>n!==i));const next=parts.map((x,n)=>n===i?{...x,foodId:item.food.id,quickName:'',quickCategory:undefined,unit:item.unit,provided:'',eaten:''}:x);prefill(next,t('已帶入「{name}」與單位 {unit}。份量這次再填（不知道可留空），按「儲存這一餐」才會記錄。', {name: item.food.name, unit: t(item.unit)}));}},item.food.name)))),
   (choices.length>0||p.id)&&field(p.id?t('食品（可更正，保留原紀錄）'):t('全部食品卡'),h('select',{'aria-label':t('食品 {v0}', {v0: i+1}),value:p.foodId,disabled:busy||blocked,onChange:e=>part(i,{foodId:e.target.value})},
    h('option',{value:''},t('請選擇食品卡')),
    p.id?foods.filter(food=>!isFoodArchived(food)||food.id===p.foodId).map(foodOption):
     recentChoices.length?h(R.Fragment,null,h('optgroup',{label:t('最近使用')},recentChoices.map(foodOption)),otherChoices.length>0&&h('optgroup',{label:t('其他食品卡')},otherChoices.map(foodOption))):choices.map(foodOption))),
   needsReplacement(p)&&h('p',{className:'meal-quantity-note'},t('草稿的食品卡已刪除或不存在。請改選食品或輸入新食品，已填份量會保留。')),
   (choices.length>0||needsReplacement(p))&&h('button',{type:'button',disabled:busy||blocked,className:'meal-manual-toggle','aria-expanded':!p.foodId&&(!!p.quickName||!!p.quickCategory||manualParts.includes(i)),onClick:()=>{setManualParts([...new Set([...manualParts,i])]);part(i,{foodId:''});}},t('＋ 輸入新食品')),
   // 2026-11-16：選食品時就能進食品卡清單修改或刪除（這一餐的草稿會保留）。
   i===0&&onManageFoods&&choices.length>0&&h('button',{type:'button',className:'meal-manage-foods',disabled:busy,onClick:onManageFoods},t('管理食品卡（修改、刪除）')),
   !p.foodId&&(!choices.length||p.quickName||p.quickCategory||manualParts.includes(i))&&h('div',{className:'meal-new-food'},field(t('食品名稱'),h('input',{'aria-label':t('食品 {v0} 名稱', {v0: i+1}),required:true,value:p.quickName,onChange:e=>part(i,{quickName:e.target.value}),maxLength:100,placeholder:t('例如：雞肉主食罐')})),h('div',{className:'cj-field meal-cat-field'},h('span',null,t('食品分類（點一個）')),h('div',{className:'meal-cat-chips',role:'radiogroup','aria-label':t('食品 {v0} 分類', {v0: i+1})},FOOD_CATEGORIES.map(c=>h('button',{type:'button',key:c.id,role:'radio','aria-checked':p.quickCategory===c.id,className:'meal-chip'+(p.quickCategory===c.id?' is-on':''),disabled:busy||blocked,onClick:()=>part(i,{quickCategory:c.id})},c.label))))),
   h('details',{className:'meal-optional-amounts',...(p.id||!unknownQuantity(p.provided)||!unknownQuantity(p.eaten)||p.noEatingConfirmed?{open:true}:{})},h('summary',null,t('填寫餵食量／吃下量（選填，不知道就留空）')),
   h('div',{className:'meal-amounts'},quantity(p,i,'provided',t('餵食量'),{min:0.000001,placeholder:t('未知留空')}),quantity(p,i,'eaten',t('吃下量'),{min:0,max:p.provided||undefined,disabled:zeroResolved,placeholder:t('未知留空')}),field(t('單位'),h('select',{'aria-label':t('食品 {v0} 單位', {v0: i+1}),value:p.unit,onChange:e=>part(i,{unit:e.target.value})},MEAL_UNITS.filter(u=>!isEnglish()||u===p.unit||![K('公克'),K('公斤'),K('毫升')].includes(u)).map(u=>h('option',{key:u,value:u},t(u)))))),
   h('p',{className:'meal-quantity-note'},unknownQuantity(p.eaten)?t('尚未記錄吃下量，不會當作 0。'):zeroResolved?t('已明確確認這餐吃下 0；取消下方勾選可恢復原輸入。'):t('餵食量是提供的份量，吃下量是實際吃掉的份量；不知道的量可留空。')),
   !v.id&&availableFoodIds.has(p.foodId)&&recent.some(r=>r.feeding.foodId===p.foodId)&&h('button',{type:'button',className:'meal-subtle',onClick:()=>{const last=recent.find(r=>r.feeding.foodId===p.foodId).feeding;const next=setMealNoEating(parts,false);next[i]={...next[i],provided:last.provided,unit:last.unit,eaten:'',noEatingConfirmed:false};edit({parts:next});}},t('沿用這項食品上次份量'))),
   (!unknownQuantity(p.provided)||!unknownQuantity(p.eaten))&&h('p',{className:'meal-quantity-status'},t('已填：餵食量 {v0} · 吃下量 {v1}', {v0: quantityLabel(p.provided,p.unit), v1: quantityLabel(p.eaten,p.unit)})),
   parts.length>1&&h('button',{type:'button',className:'meal-remove',disabled:busy||blocked,onClick:()=>{setManualParts(manualParts.filter(n=>n!==i).map(n=>n>i?n-1:n));edit({parts:parts.filter((_,n)=>n!==i),removedPartIds:[...new Set([...(v.removedPartIds||[]),...(p.id?[p.id]:[])])]});}},p.id?t('移除這項食品（儲存後生效）'):t('移除這項未保存食品')))),
  (v.removedPartIds||[]).length>0&&h('p',{className:'meal-quantity-note',role:'status'},t('已選擇移除 {n} 項食品。儲存前原紀錄不變，儲存後保留更正歷史。', {n: v.removedPartIds.length})),
  parts.length<30&&h('details',{className:'meal-mix-options',...(parts.length>1?{open:true}:{})},h('summary',null,t('混餐／加其他食品（選填）')),h('button',{type:'button',className:'meal-add',onClick:()=>edit({parts:[...parts,{...emptyMealPart(),noEatingConfirmed:noEating}]})},t('＋ 加一項食品'))),
  error&&h('p',{className:'cj-error',role:'alert'},error),
  h('div',{className:'meal-save-bar'},h('button',{className:'cj-primary',type:'submit',disabled:busy||blocked||conflicts.length>0},busy?t('儲存中…'):v.id?t('儲存整餐修改'):t('儲存這一餐')),onSaveDraft&&h('button',{type:'button',className:'meal-subtle',disabled:busy,onClick:()=>onSaveDraft(v)},t('先放著，稍後再補'))),
  h('details',{className:'meal-time'},h('summary',null,h('span',null,`${v.date===today?t('今天'):String(v.date||'').replace(/^\d{4}-(\d{2})-(\d{2})$/,(m,a,b)=>Number(a)+'/'+Number(b))} ${v.time}`),h('small',null,t('改時間'))),h('div',{className:'meal-two'},input(t('餵食日期'),'date','date',{required:true,max:today}),input(t('餵食時間'),'time','time',{required:true}))),
  h('details',{className:'meal-options',...(v.note||v.change||blocked?{open:true}:{})},h('summary',null,h('span',null,t('備註與換糧')),h('small',null,t('選填'))),
   field(t('餵食備註（選填）'),h('textarea',{'aria-label':t('餵食備註'),value:v.note,onChange:e=>edit({note:e.target.value}),maxLength:1000,placeholder:t('例如：加了少量溫水')})),
   !v.id&&h('label',{className:'cj-consent'},h('input',{type:'checkbox',checked:v.change,onChange:e=>edit({change:e.target.checked})}),t('同時標記第一項食品的換糧日期')),
   onFoodEditor&&h('button',{type:'button',onClick:onFoodEditor},blocked?t('繼續食品草稿'):t('建立完整食品卡（選填）'))),
  h('details',{className:'meal-options meal-observations',...(noEating?{open:true}:{})},h('summary',null,h('span',null,t('額外觀察')),h('small',null,noEating?t('已標記不進食'):t('不進食情況'))),
 h(NoEatingField,{react:R,feeding:{...v,noEatingConfirmed:noEating},onChange:patch=>edit({parts:setMealNoEating(parts,patch.noEatingConfirmed)})}),
  ),
  conflicts.length>0&&h('section',{className:'meal-no-eating-conflict',role:'alert'},h('strong',null,t('先確認吃下量，原輸入都還在')),h('p',null,t('這餐有已吃的數量或未觀察的食品，不能直接記為全部 0。請選擇符合實際情況的方式。')),h('button',{type:'button',onClick:()=>edit({parts:setMealNoEating(parts,false)})},t('保留吃下量，取消不進食標記')),h('button',{type:'button',onClick:()=>edit({parts:confirmMealZero(parts)})},t('確認這餐全部沒吃，改為 0')),h('small',null,t('明確改為 0 後，取消勾選仍可恢復本次原輸入。'))),

  h(MealRevisionHistory,{react:R,value:v,entries,foods}),
  h('p',{className:'meal-footer-note'},v.id?t('修改整餐，保留更正前的食品、份量與原始來源。'):t('不同食品分開記量，儲存為同一餐。未知不會當作 0。')));
}
export function MealRevisionHistory({react:R,value,entries=[],foods=[]}){
 const h=R.createElement,original=entries.find(row=>row.id===value.id),history=feedingMealRows(original,entries).flatMap(row=>row.mealRevisions||[]);
 if(!history.length)return null;
 return h('details',{className:'meal-options meal-revisions'},h('summary',null,t('這一餐的更正紀錄（{n} 次）', {n: history.length})),[...history].reverse().map((revision,index)=>h('section',{key:index},h('h3',null,new Date(revision.at).toLocaleString('zh-TW',{hour12:false})),revision.rows.map(row=>h('p',{key:row.id},t('{date} {time} · {v2} · 餵食量 {v3} · 吃下量 {v4}{v5}', {date: row.date, time: row.time, v2: foods.find(food=>food.id===row.feeding?.foodId)?.name||row.feeding?.quickName||t('原食品'), v3: quantityLabel(row.feeding?.provided,row.unit), v4: quantityLabel(row.feeding?.eaten,row.unit), v5: row.feeding?.note?' · '+row.feeding.note:''}))),(revision.changes||[]).map(change=>h('p',{key:change.id},t('{date} · 原換糧註記：{note}', {date: change.date, note: change.note}))))));
}
export function updateMealCat(root,catId,transform){
 requireActivePet(root,catId);
 if(catId==='cat-original')return transform(root);
 const target=root.multiCat?.cats?.find(c=>c.id===catId&&c.data);if(!target)fail(t('找不到這隻毛孩，原資料未更動。'));
 return {...root,multiCat:{...root.multiCat,cats:root.multiCat.cats.map(c=>c===target?{...c,data:transform(c.data)}:c)}};
}
export function parkUnifiedMeal(data,value,key){
 const feeding=mealValue(value,data.entries);if(!key)fail(t('草稿識別碼無效。'));
 return {...data,cat:{...data.cat,mealDrafts:[...(data.cat.mealDrafts||[]).filter(d=>d.key!==key),{key,feeding,feedDirty:true}]}};
}

export function attachMealFood(value,foodId){
 const parts=mealParts(value);parts[0]={...parts[0],foodId,quickName:'',quickCategory:undefined};
 return {...value,...partFields(parts[0]),parts};
}
