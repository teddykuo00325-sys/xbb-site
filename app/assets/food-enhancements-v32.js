import {t, tn, K} from './i18n.js?v=audit1117b';
import {foodCardSubtitle} from './clear-presentation.js?v=audit1117';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {activeFoodCards} from "./food-archive-v35.js?v=food-simple1";
// H4/H5: category IDs are data, labels are presentation. Historical versions remain immutable.
export const FOOD_CATEGORIES = Object.freeze([
  ['staple-wet',t('主食罐')],['dry',t('乾糧')],['complementary-wet',t('副食罐')],['treat',t('零食')],['fresh',t('鮮食')]
].map(([id,label])=>Object.freeze({id,label})));
export const DEFAULT_FOOD_CATEGORY = 'staple-wet';
export const validFoodCategory = value => FOOD_CATEGORIES.some(c=>c.id===value);
export const foodCategoryLabel = food => FOOD_CATEGORIES.find(c=>c.id===food?.foodCategory)?.label || t('尚未分類');
export const validFoodCategoryData = food => !!food && typeof food==='object' && !Array.isArray(food) && (food.foodCategory === undefined || validFoodCategory(food.foodCategory));
export const stableFoodId = food => food?.familyId || food?.id || '';
// Read-only view: keep the same first ID row used by detail lookup, never rewrite storage.
export const uniqueFoodCards = cards => {const seen=new Set();return cards.filter(food=>{if(seen.has(food.id))return false;seen.add(food.id);return true;});};
export const latestFoods = cards => {const rows=uniqueFoodCards(cards);return activeFoodCards(rows).filter(c=>!rows.some(n=>stableFoodId(n)===stableFoodId(c)&&Number(n.version)>Number(c.version)));};
export function foodIdentity(food,cards=[]) {
 const key=String(food.id||stableFoodId(food));let hash=2166136261;for(const char of key)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 const short=(hash>>>0).toString(36).padStart(7,'0');
 const collision=cards.some(other=>String(other.id||stableFoodId(other))!==key&&foodIdentity(other)===t('卡號 {short}', {short}));
 return t('卡號 {short}', {short: collision?key:short});
}
export function foodVersionLabel(food,cards=[],historical=false) {
 const current=latestFoods(cards).find(row=>stableFoodId(row)===stableFoodId(food));
 return `${historical?t('最近食用版本'):food.archived||current&&current.id!==food.id?t('歷史版本'):t('目前版本')} v${food.version} · ${foodIdentity(food,cards)}`;
}
export const archivedFoodName = (food,fallback='') => `${food?.name||fallback}${food?.archived?t('（此食品卡已刪除）'):''}`;
export function foodDraftName(draft,cards) {
 const archived=cards.some(food=>food.archived&&(food.id===draft.id||food.id===draft.pendingFoodCardId||(draft.familyId&&stableFoodId(food)===draft.familyId)));
 return `${draft.name||t('尚未命名的食品')}${archived?t('（此食品卡已刪除）'):''}`;
}
export const filterFoods = (cards,category='all') => cards.filter(c=>category==='all'||c.foodCategory===category);
const demoFood = food => food?.demo===true || String(food?.source||'').includes(K('示範')) || String(food?.familyId||'').startsWith('food-demo');
const demoEntry = entry => entry?.demo===true || String(entry?.source||'').includes(K('示範'));
const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export function validFoodDecisions(cat) {
  if(!cat||typeof cat!=='object'||Array.isArray(cat))return false;
  if(cat.firstFoodDecisions===undefined)return true;
  const rows=cat.firstFoodDecisions;
  return Array.isArray(rows)&&new Set(rows.map(r=>r?.foodKey)).size===rows.length&&rows.every(r=>r&&typeof r.foodKey==='string'&&r.foodKey.length>0&&typeof r.foodName==='string'&&typeof r.entryId==='string'&&r.entryId.length>0&&validDate(r.feedingDate)&&validDate(r.createdDate)&&['pending','declined','marked','manual'].includes(r.status));
}
export function matchingFoodChange(changes,food,entryId,date) {
  return changes.find(c=>!c.demo&&c.kind===K('換飼料')&&(
    c.sourceEntryId===entryId || (c.date===date && c.foodFamilyId===stableFoodId(food)) ||
    (c.date===date && c.note===K(`開始使用 ${food.name}（${food.flavor||food.kind}）v${food.version}`))
  ));
}
// Called before insertion, in the same synchronous mutation batch as the meal.
export function planFirstFood(data,food,feeding,today) {
  if(!food||demoFood(food)||demoEntry(feeding)||!stableFoodId(food)||data.entries.some(e=>e.id===feeding.id))return null;
  const foodKey=stableFoodId(food),rows=data.cat.firstFoodDecisions||[];
  if(rows.some(r=>r.foodKey===foodKey))return null;
  if(data.entries.some(e=>!demoEntry(e)&&e.feeding&&stableFoodId(data.foodCards.find(f=>f.id===e.feeding.foodId))===foodKey))return null;
  const manual=feeding.change||matchingFoodChange(data.changes,food,feeding.id,feeding.date);
  return {foodKey,foodName:food.name,entryId:feeding.id,feedingDate:feeding.date,createdDate:today,status:manual?'manual':'pending'};
}
const decisionMatchesEntry=(data,decision)=>data.entries.some(entry=>entry.id===decision.entryId&&!demoEntry(entry)&&stableFoodId(data.foodCards.find(food=>food.id===entry.feeding?.foodId))===decision.foodKey);
export function pendingFoodDecision(data) {
  return (data.cat.firstFoodDecisions||[]).find(r=>r.status==='pending'&&decisionMatchesEntry(data,r));
}
export function decideFirstFood(data,foodKey,mark,today) {
  const record=(data.cat.firstFoodDecisions||[]).find(r=>r.foodKey===foodKey);
  if(!record||record.status!=='pending'||!decisionMatchesEntry(data,record))return null;
  const food=data.foodCards.find(f=>stableFoodId(f)===foodKey),entry=data.entries.find(e=>e.id===record.entryId);
  if(!food||!entry||demoEntry(entry))return null;
  const existing=matchingFoodChange(data.changes,food,record.entryId,today);
  const change=mark&&!existing?{id:'first-food-'+record.entryId,date:today,kind:K('換飼料'),note:K(`開始使用 ${record.foodName}（首次記錄此食品）`),uncertain:false,demo:false,foodFamilyId:foodKey,firstFoodEntryId:record.entryId}:null;
  return {cat:{...data.cat,firstFoodDecisions:data.cat.firstFoodDecisions.map(r=>r===record?{...r,status:mark?(existing?'manual':'marked'):'declined'}:r)},changes:change?[change,...data.changes]:data.changes,change};
}
export function FoodCategoryPicker({react:R,value,onChange,filter=false,legacy=false,error=''}) {
  const [touched,setTouched]=R.useState(false),h=R.createElement,options=filter?[{id:'all',label:t('全部')},...FOOD_CATEGORIES]:FOOD_CATEGORIES;
  const message=!filter&&!validFoodCategory(value)&&(touched||error)?error||t('請選擇食品分類。'):'';
  return h('fieldset',{className:'h-food-categories',onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget))setTouched(true)}},h('legend',null,filter?t('食品分類篩選'):t('分類 ＊必填')),message&&h('p',{id:'food-category-error',className:'field-error',role:'alert'},message),legacy&&!validFoodCategory(value)&&h('p',{className:'microcopy left'},t('尚未分類，請補選分類後建立新版本；歷史餵食不會變更。')),h('div',{className:'h-food-category-track',role:filter?'group':'radiogroup',tabIndex:filter?undefined:-1,'aria-label':filter?t('食品分類篩選'):t('食品分類'),'aria-invalid':message?'true':undefined,'aria-describedby':message?'food-category-error':undefined},options.map(c=>h('button',{key:c.id,type:'button',role:filter?undefined:'radio','aria-checked':filter?undefined:value===c.id,'aria-pressed':filter?value===c.id:undefined,className:value===c.id?'chip active':'chip',onClick:()=>onChange(c.id)},c.label))));
}
export function FoodCategoryBadge({react:R,food}) {return R.createElement('small',{className:validFoodCategory(food.foodCategory)?'h-food-category-badge':'h-food-unclassified'},foodCategoryLabel(food));}
export function FeedingFoodList({react:R,cards,onFood,disabled=false}) {
  const [category,setCategory]=R.useState('all'),h=R.createElement,all=latestFoods(cards),rows=filterFoods(all,category);
  return h('details',{className:'h-feeding-food-list','aria-label':t('食品卡')},h('summary',{className:'feeding-food-library-summary'},h('strong',null,t('全部食品卡')),h('span',null,t('{n} 張', {n: all.length}))),h(FoodCategoryPicker,{react:R,value:category,onChange:setCategory,filter:true}),rows.length?h('div',{className:'food-list'},rows.map(food=>{
   const subtitle=foodCardSubtitle(food,cards,{omitLabel:foodCategoryLabel(food)});
   return h('button',{type:'button',key:food.id,className:'food-card-row',disabled,onClick:()=>onFood(food.id)},h('span',{className:'food-card-copy'},h('strong',null,food.name),subtitle&&h('small',{className:'food-subtitle'},subtitle)),h(FoodCategoryBadge,{react:R,food}),h('span',{className:'feeding-row-chevron','aria-hidden':true},'›'));
  })):h('p',{className:'microcopy left'},activeFoodCards(cards).length?t('這個分類尚無食品卡。'):t('尚無食品卡，可從上方「記一餐」開始，或新增食品卡。')));
}
export function FirstFoodPrompt({react:R,store,waitForSave,today,onSaved,entryId}) {
  const h=R.createElement,view=R.useSyncExternalStore(store.subscribe,store.get),pending=view.status==='saved'?(view.data.cat.firstFoodDecisions||[]).find(row=>row.status==='pending'&&row.entryId===entryId&&decisionMatchesEntry(view.data,row)):null;
  const ref=R.useRef(null),running=R.useRef(false),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');


  const decide=async mark=>{if(running.current||!pending)return;running.current=true;setBusy(true);setError('');try{
    if(store.get().status!=='saved')throw Error(t('請先完成或重試本機保存。'));
    const next=decideFirstFood(store.get().data,pending.foodKey,mark,today);
    if(!next)return;
    store.update('cat',next.cat);if(next.change)store.update('changes',next.changes);
    await waitForSave(store);onSaved?.(mark?t('已標記今天為換糧日'):t('已保留餵食紀錄，不標記換糧日'));
  }catch(e){setError(tn(e.message)||t('本機保存失敗，請重試保存。'));}finally{running.current=false;setBusy(false);}};
  return h(R.Fragment,null,error&&h('p',{role:'alert',className:'notice'},error),pending&&h('details',{className:'ux-first-food'},h('summary',null,t('首次記錄此食品 · 需要標記換糧？')),h('p',null,t('首次在這裡記錄「{foodName}」，不代表以前沒有餵過。只有實際換糧時才需要標記。', {foodName: pending.foodName})),h('p',{className:'microcopy left'},t('選擇標記時，換糧日期為今天 {today}。', {today})),h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:()=>decide(true)},t('標記今天為換糧日')),h('button',{type:'button',className:'text-btn',disabled:busy,onClick:()=>decide(false)},t('不需要'))));
}
