import {t, tn} from './i18n.js?v=audit1117b';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
// I2: archive a complete food family. Version rows and historical meal text stay intact.
export const foodFamilyId = food => food?.familyId || food?.id || '';
export const isFoodArchived = food => !!food?.archived;
export const activeFoodCards = cards => cards.filter(f=>!isFoodArchived(f));
const object = v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validFoodArchive(food) {
  return object(food)&&(food.archived===undefined||(object(food.archived)&&typeof food.archived.batchId==='string'&&food.archived.batchId.length>0&&typeof food.archived.at==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(food.archived.at)&&Number.isFinite(Date.parse(food.archived.at))&&new Date(food.archived.at).toISOString()===food.archived.at));
}
export function foodArchivePlan(data,selectedId) {
  const selected=data.foodCards.find(f=>f.id===selectedId);
  if(!selected)throw Error(t('找不到食品卡，未更動資料。'));
  const familyId=foodFamilyId(selected),versions=data.foodCards.filter(f=>foodFamilyId(f)===familyId),ids=new Set(versions.map(f=>f.id));
  return {familyId,name:selected.name,versionCount:versions.length,feedingCount:data.entries.filter(e=>e.feeding&&ids.has(e.feeding.foodId)).length};
}
export function archiveFoodCards(cards,familyId,marker) {
  if(!cards.some(f=>foodFamilyId(f)===familyId))throw Error(t('找不到食品卡，未更動資料。'));
  return cards.map(f=>foodFamilyId(f)===familyId?{...f,archived:{...marker}}:f);
}
export function restoreFoodCards(cards,marker) {
  return cards.map(f=>f.archived?.batchId===marker.batchId?((({archived,...rest})=>rest)(f)):f);
}
// Non-optimistic CAS commit: failures do not hide the card or discard its draft.
// Any queued unrelated edits are merged and saved through the existing flush loop.
export async function commitStoreTransform(store,transform,write) {
  if(store.running||store.resetting||store.failed||store.view.status!=='saved'||store.sequence!==store.savedSequence)throw Error(tn(store.view.error)||t('請先完成或重試本機保存，再變更食品資料。'));
  const target=transform(store.view.data),start=++store.sequence;
  store.running=true;store.resetting=true;store.resetTouched.clear();
  store.view={...store.view,status:'saving',error:''};store.emit();
  try {
    const revision=await write(target,store.revision);
    store.revision=revision;store.savedSequence=start;
    const data=store.sequence===start?target:transform(store.view.data);
    store.view={...store.view,data,status:store.sequence===start?'saved':'saving',error:''};
  } catch(error) {
    store.sequence--;store.view={...store.view,status:store.sequence===store.savedSequence?'saved':'saving'};
    throw error?.name==='QuotaExceededError'?Error(t('本機儲存空間不足，本次變更尚未保存。請釋出空間後重試。')):error;
  } finally {
    store.running=false;store.resetting=false;store.resetTouched.clear();store.emit();
    if(store.sequence!==store.savedSequence)void store.flush();
  }
}
export function FoodDeleteSection({react:R,store,food,onDeleted}) {
  const h=R.createElement,[open,setOpen]=R.useState(false),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),ref=R.useRef(null),running=R.useRef(false),trigger=R.useRef(null),wasOpen=R.useRef(false);
  const view=R.useSyncExternalStore(store.subscribe,store.get),plan=foodArchivePlan(view.data,food.id);
  usePhoneDialog(R,ref,open);
  R.useEffect(()=>{if(open){wasOpen.current=true;ref.current?.showModal?.();}else{ref.current?.close?.();if(wasOpen.current){trigger.current?.focus?.();wasOpen.current=false;}}},[open]);
  const close=()=>{if(!running.current){setOpen(false);setError('');}};
  const remove=async()=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{
    const current=foodArchivePlan(store.get().data,food.id);
    if(current.feedingCount!==plan.feedingCount||current.versionCount!==plan.versionCount)throw Error(t('食品卡或餵食次數已更新，請確認目前內容後再刪除。'));
    const marker={batchId:'food-archive-'+crypto.randomUUID(),at:new Date().toISOString()};
    await store.atomic(data=>({...data,foodCards:archiveFoodCards(data.foodCards,current.familyId,marker)}));
    setOpen(false);onDeleted(marker);
  }catch(e){setError(tn(e.message)||t('刪除尚未保存，食品卡仍保留，請重試。'));}finally{running.current=false;setBusy(false);}};
  return h('section',{className:'ij-food-delete-section'},isFoodArchived(food)?h('p',{className:'microcopy left'},t('此食品卡已刪除，僅供查看當時版本；不能再用來新增餵食。')):h('button',{ref:trigger,type:'button',className:'danger-link',onClick:()=>{setError('');setOpen(true);}},t('刪除食品卡')),h('dialog',{ref,className:'ij-food-delete-dialog','aria-labelledby':'ij-delete-title',onCancel:e=>{e.preventDefault();close();}},open&&h(R.Fragment,null,h('h2',{id:'ij-delete-title'},t('刪除食品卡？')),h('p',null,t('「{name}」 · 已餵食 {feedingCount} 次 · 共 {versionCount} 個版本', {name: plan.name, feedingCount: plan.feedingCount, versionCount: plan.versionCount})),h('p',null,t('刪除後，這張卡會從清單移除、不能再用來記錄餵食；過去的餵食紀錄會保留，仍顯示當時的食物名稱。')),h('p',{className:'microcopy left'},t('食品與餵食草稿會保留；使用已刪除食品的新一餐需改選其他食品。')),error&&h('p',{className:'error',role:'alert'},error),h('div',{className:'ij-dialog-actions'},h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:close,autoFocus:true},t('取消')),h('button',{type:'button',className:'primary danger',disabled:busy,onClick:remove},busy?t('保存中…'):t('刪除'))))));
}
// 2026-11-16 食品卡簡化（Ian 批准）：只有配方變了（營養標示、原料表、淨重）才需要另存新版本；
// 改名稱、分類、品牌、口味、照片是「修正」，直接改同一張卡。
const formulaKey = food => JSON.stringify({
  nutrients:(food?.nutrients||[]).map(n=>[n.name,String(n.value??'').trim(),n.unit,n.bound,n.basis]),
  ingredients:String(food?.ingredients||'').trim(),netWeight:String(food?.netWeight??'').trim()
});
export function foodFormulaChanged(before,after) { return formulaKey(before)!==formulaKey(after); }

// 照片縮圖右上角的 ×：按一次變成「確定移除？」，再按才移除，避免誤觸。
export function FoodPhotoRemove({react:R,index,onRemove,disabled=false}) {
  const h=R.createElement,[armed,setArmed]=R.useState(false);
  R.useEffect(()=>{if(!armed)return;const id=setTimeout(()=>setArmed(false),4000);return()=>clearTimeout(id);},[armed]);
  return h('button',{type:'button',className:'food-photo-remove'+(armed?' is-armed':''),disabled,'aria-label':armed?t('確定移除第 {n} 張照片',{n:index+1}):t('移除第 {n} 張照片',{n:index+1}),onClick:()=>{if(armed){setArmed(false);onRemove(index);}else setArmed(true);}},armed?t('確定移除？'):'×');
}

// 食品卡清單每張卡右側的「⋯」：修改、刪除（沿用刪除確認與復原）。
export function FoodCardMenu({react:R,store,food,onEdit,onDeleted,disabled=false}) {
  const h=R.createElement,[open,setOpen]=R.useState(false),[confirm,setConfirm]=R.useState(false),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
  const ref=R.useRef(null),trigger=R.useRef(null),running=R.useRef(false),wasOpen=R.useRef(false);
  usePhoneDialog(R,ref,open);
  R.useEffect(()=>{if(open){wasOpen.current=true;ref.current?.showModal?.();}else{ref.current?.close?.();if(wasOpen.current){trigger.current?.focus?.();wasOpen.current=false;}}},[open]);
  const close=()=>{if(!running.current){setOpen(false);setConfirm(false);setError('');}};
  let plan=null;try{plan=open?foodArchivePlan(store.get().data,food.id):null;}catch{}
  const remove=async()=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{
    const current=foodArchivePlan(store.get().data,food.id);
    const marker={batchId:'food-archive-'+crypto.randomUUID(),at:new Date().toISOString()};
    await store.atomic(data=>({...data,foodCards:archiveFoodCards(data.foodCards,current.familyId,marker)}));
    setOpen(false);setConfirm(false);onDeleted(marker);
  }catch(e){setError(tn(e.message)||t('刪除尚未保存，食品卡仍保留，請重試。'));}finally{running.current=false;setBusy(false);}};
  return h(R.Fragment,null,
    h('button',{ref:trigger,type:'button',className:'food-card-more',disabled,'aria-label':t('{name} 的更多動作',{name:food.name}),onClick:()=>{setError('');setConfirm(false);setOpen(true);}},'⋯'),
    h('dialog',{ref,className:'ij-food-delete-dialog food-card-menu','aria-label':food.name,onCancel:e=>{e.preventDefault();close();}},open&&(confirm
      ?h(R.Fragment,null,h('h2',null,t('刪除食品卡？')),plan&&h('p',null,t('「{name}」 · 已餵食 {feedingCount} 次 · 共 {versionCount} 個版本',{name:plan.name,feedingCount:plan.feedingCount,versionCount:plan.versionCount})),h('p',null,t('刪除後，這張卡會從清單移除、不能再用來記錄餵食；過去的餵食紀錄會保留，仍顯示當時的食物名稱。')),h('p',{className:'microcopy left'},t('刪除後可以在「最近刪除」復原。')),error&&h('p',{className:'error',role:'alert'},error),
        h('div',{className:'ij-dialog-actions'},h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:close,autoFocus:true},t('取消')),h('button',{type:'button',className:'primary danger',disabled:busy,onClick:remove},busy?t('保存中…'):t('刪除'))))
      :h(R.Fragment,null,h('h2',null,food.name),
        h('div',{className:'food-card-menu-actions'},
          h('button',{type:'button',className:'secondary-btn',onClick:()=>{setOpen(false);onEdit(food);}},t('修改')),
          h('button',{type:'button',className:'secondary-btn danger-text',onClick:()=>setConfirm(true)},t('刪除')),
          h('button',{type:'button',className:'text-btn',onClick:close,autoFocus:true},t('取消')))))));
}
export function FoodArchiveUndo({react:R,store,marker,onRestored}) {
 const h=R.createElement,[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),running=R.useRef(false);
 const undo=async()=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{await store.atomic(data=>({...data,foodCards:restoreFoodCards(data.foodCards,marker)}));onRestored();}catch(e){setError(tn(e.message)||t('復原尚未保存，請重試。'));}finally{running.current=false;setBusy(false);}};
 return h('div',{className:'ij-food-undo',role:'status'},h('span',null,t('已刪除食品卡')),h('button',{type:'button',className:'text-btn',disabled:busy,onClick:undo},busy?t('復原中…'):t('復原刪除')),error&&h('p',{role:'alert',className:'error'},error));
}
