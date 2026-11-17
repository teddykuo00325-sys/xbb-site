import {t, tn, K} from './i18n.js?v=audit1117b';
import {foodCardSubtitle} from './clear-presentation.js?v=audit1117';
import {foodVersionLabel,foodDraftName} from './food-enhancements-v32.js?v=8f5745b7843b';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {isFoodArchived,foodFamilyId} from './food-archive-v35.js?v=food-simple1';

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
// Opening the editor and its preset labels are not user input. Keep partial
// fields, photos, category/nutrition edits, and existing-card versions.
export function hasMeaningfulFoodInput(food){
 if(!food)return false;
 const text=value=>typeof value==='string'&&value.trim().length>0;
 if(['id','familyId','pendingFoodCardId','name','brand','flavor','netWeight','ingredients'].some(key=>text(food[key])))return true;
 if(food.photos?.length)return true;
 if(text(food.foodCategory))return true;
 if(text(food.kind)&&food.kind!==K('濕食'))return true;
 return (food.nutrients||[]).some(row=>text(row.value)||
  text(row.unit)&&row.unit!==(row.name===K('熱量')?'kcal':'%')||
  text(row.bound)&&row.bound!==K('標示值')||text(row.basis)&&row.basis!==K('每 100 g'));
}

// Content and its pending flag must enter storage in the same mutation. A
// post-render effect can race a navigation/save or briefly claim an empty draft.
export function updateFoodDraftField(session,key,value){
 const next={...session,[key]:typeof value==='function'?value(session[key]):value};
 if(key==='draft'||key==='foodPending'&&next.foodPending)next.foodPending=hasMeaningfulFoodInput(next.draft);
 return next;
}
export function validParkedFoodDrafts(data,validFood){
 const rows=data.cat?.foodDrafts;
 if(rows===undefined)return true;
 return Array.isArray(rows)&&new Set(rows.map(row=>row?.key)).size===rows.length&&rows.every(row=>
  object(row)&&typeof row.key==='string'&&row.key.length>0&&validFood(row.draft)&&
  typeof row.dirty==='boolean'&&typeof row.confirmed==='boolean'&&['list','detail'].includes(row.foodOrigin)&&
  (!row.draft.familyId||data.foodCards.some(food=>food.familyId===row.draft.familyId)));
}
export function parkIndependentFood(data,key){
 const s=data.foodSession;
 if(!s?.foodPending||!hasMeaningfulFoodInput(s.draft))return data;
 if(s.foodOrigin==='feed')throw Error(t('這張食品草稿屬於未完成的一餐。請先繼續完成食品卡，原本的份量與備註會保留。'));
 if(!key||(data.cat.foodDrafts||[]).some(row=>row.key===key))throw Error(t('草稿識別碼重複，未更動資料。'));
 const row={key,draft:structuredClone(s.draft),dirty:s.dirty,confirmed:s.confirmed,foodOrigin:s.foodOrigin};
 return {...data,cat:{...data.cat,foodDrafts:[...(data.cat.foodDrafts||[]),row]}};
}
export function startIndependentFood(data,empty,key){
 if(!data.foodSession)throw Error(t('請先開啟食品管理。'));
 const parked=parkIndependentFood(data,key);
 return {...parked,foodSession:{...data.foodSession,screen:'review',draft:structuredClone(empty),foodPending:false,dirty:false,confirmed:false,foodOrigin:'list'}};
}
export function resumeIndependentFood(data,key,parkKey){
 const row=(data.cat.foodDrafts||[]).find(row=>row.key===key);
 if(!row||!data.foodSession)throw Error(t('這份草稿已更新，請重新開啟食品管理。'));
 const parked=parkIndependentFood(data,parkKey);
 // Resume in management, not a stale detail screen. Historical food ids remain unchanged.
 return {...parked,cat:{...parked.cat,foodDrafts:parked.cat.foodDrafts.filter(item=>item.key!==key)},foodSession:{...data.foodSession,screen:'review',selected:row.draft.id||data.foodSession.selected,draft:structuredClone(row.draft),foodPending:true,dirty:row.dirty,confirmed:row.confirmed,foodOrigin:'list'}};
}
export function recentFoodCards(cards,entries,limit=3){
 const rows=[],seen=new Set();
 for(const entry of [...entries].sort((a,b)=>((b.date||'')+(b.time||'')).localeCompare((a.date||'')+(a.time||'')))){
  const id=(entry.feeding||entry).foodId,food=cards.find(row=>row.id===id);
  if(!food||isFoodArchived(food)||seen.has(foodFamilyId(food)))continue;
  seen.add(foodFamilyId(food));rows.push(food);if(rows.length===limit)break;
 }
 return rows;
}
export function foodDetailDestination(origin){return origin==='external'?'external':'list'}
export function RecentFoodSection({react:R,cards,entries,onFood}){
 const h=R.createElement,rows=recentFoodCards(cards,entries);
 return h('section',{className:'food-quick food-recent-home','aria-label':t('最近吃的食品')},h('h2',null,t('最近吃的食品')),rows.length?h('div',{className:'food-recent'},rows.map(food=>h('button',{type:'button',className:'food-recent-shortcut',key:food.id,onClick:()=>onFood(food.id)},h('strong',null,food.name),h('small',null,foodCardSubtitle(food,cards))))):h('p',{className:'microcopy left'},t('還沒有最近食品。記下第一餐後，這裡會保留最近吃的食品。')));
}
export function StableFoodActions({react:R,store,emptyFood,onContinue}){
 const h=R.createElement,data=R.useSyncExternalStore(store.subscribe,store.get).data,[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[blocked,setBlocked]=R.useState(false),lock=R.useRef(false),dialog=R.useRef(null),trigger=R.useRef(null);
 usePhoneDialog(R,dialog,blocked);
 R.useEffect(()=>{if(blocked)dialog.current?.showModal();else{dialog.current?.close();trigger.current?.focus?.({preventScroll:true})}},[blocked]);
 const run=async transform=>{
  if(lock.current)return;
  if(store.get().data.foodSession?.foodPending&&store.get().data.foodSession.foodOrigin==='feed'&&hasMeaningfulFoodInput(store.get().data.foodSession.draft)){setBlocked(true);return}
  lock.current=true;setBusy(true);setError('');
  try{await store.atomic(transform)}catch(e){setError(tn(e.message)||t('草稿尚未保存，原內容仍保留。'))}finally{lock.current=false;setBusy(false)}
 };
 return h('section',{className:'stable-food-actions','aria-label':t('新增或繼續食品草稿')},
  h('button',{ref:trigger,type:'button',className:'primary',disabled:busy,onClick:()=>run(current=>startIndependentFood(current,emptyFood(),crypto.randomUUID()))},busy?t('正在保存…'):t('＋ 新增食品卡')),
  data.foodSession?.foodPending&&hasMeaningfulFoodInput(data.foodSession.draft)&&h('button',{type:'button',className:'secondary-btn food-wide',disabled:busy,onClick:onContinue},t('繼續食品草稿：')+foodDraftName(data.foodSession.draft,data.foodCards)),
  (data.cat.foodDrafts||[]).filter(row=>hasMeaningfulFoodInput(row.draft)).map(row=>h('button',{type:'button',key:row.key,className:'secondary-btn food-wide',disabled:busy,onClick:()=>run(current=>resumeIndependentFood(current,row.key,crypto.randomUUID()))},t('繼續食品草稿：')+foodDraftName(row.draft,data.foodCards))),
  data.foodSession?.foodPending&&hasMeaningfulFoodInput(data.foodSession.draft)&&data.foodSession.foodOrigin!=='feed'&&h('p',{className:'microcopy left'},t('新增時，現有食品草稿會先保存，可隨時繼續。')),
  error&&h('p',{role:'alert',className:'error'},error),
  h('dialog',{ref:dialog,className:'m-action-dialog','aria-label':t('保留這一餐的食品草稿'),onCancel:e=>{e.preventDefault();setBlocked(false)}},blocked&&h(R.Fragment,null,h('h2',null,t('先保留這一餐的食品草稿')),h('p',null,t('這張草稿連著未完成的一餐。請先繼續完成食品卡，再新增另一張；這餐的份量、吃下量與備註都會保留。')),h('button',{type:'button',className:'secondary-btn',autoFocus:true,onClick:()=>setBlocked(false)},t('留在管理食品')),h('button',{type:'button',className:'primary',onClick:()=>{setBlocked(false);onContinue()}},t('繼續食品草稿')))));
}
