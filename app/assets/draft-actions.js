import {t, tn} from './i18n.js?v=audit1117b';
import {hasMeaningfulFoodInput} from './food-entry-stability.js?v=8f5745b7843b';
import {foodDraftName} from './food-enhancements-v32.js?v=8f5745b7843b';
import {hasMealDraft} from './usability-v49.js?v=8f5745b7843b';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';

// Capture the selected draft, then compare again inside the atomic write.
export function draftSnapshot(data,kind,key){
 const s=data.foodSession;
 if(kind==='active')return hasMealDraft(s)?{feeding:s.feeding,feedDirty:s.feedDirty,...(s.foodPending&&s.foodOrigin==='feed'&&{foodDraft:s.draft})}:null;
 if(kind==='food')return s?.foodPending?{draft:s.draft,dirty:s.dirty}:null;
 if(kind==='parked')return (data.cat.mealDrafts||[]).find(row=>row.key===key)||null;
 return null;
}
export function discardSelectedDraft(data,selection,emptyFood){
 const current=draftSnapshot(data,selection.kind,selection.key);
 if(!current||JSON.stringify(current)!==JSON.stringify(selection.snapshot))throw Error(t('這份草稿已更新，請關閉後重新確認。'));
 if(selection.kind==='parked')return {...data,cat:{...data.cat,mealDrafts:data.cat.mealDrafts.filter(row=>row.key!==selection.key)}};
 const s=data.foodSession;
 if(selection.kind==='food'){
  if(!emptyFood)throw Error(t('無法重設食品草稿，請稍後再試。'));
  return {...data,foodSession:{...s,screen:'list',foodPending:false,dirty:false,confirmed:false,foodOrigin:'list',draft:emptyFood}};
 }
 return {...data,foodSession:{...s,screen:'list',feedPending:false,feedDirty:false,foodOrigin:s.foodOrigin==='feed'?'list':s.foodOrigin,feeding:{...s.feeding,id:'',provided:'',eaten:'',note:'',change:false,noEatingConfirmed:false,parts:undefined,entrySource:undefined}}};
}

export const SWIPE_REVEAL=76;
export function draftSwipeDirection(dx,dy){
 if(Math.max(Math.abs(dx),Math.abs(dy))<10)return null;
 return Math.abs(dx)>Math.abs(dy)*1.35?'horizontal':'vertical';
}
export function draftSwipeOffset(origin,dx){return Math.max(-SWIPE_REVEAL,Math.min(0,origin+dx))}

export function SwipeDraftCard({react:R,title,onContinue,onDelete,disabled=false}){
 const h=R.createElement,root=R.useRef(null),drag=R.useRef(null),skipClick=R.useRef(false),focusDelete=R.useRef(false),[open,setOpen]=R.useState(false),[offset,setOffset]=R.useState(null);
 R.useEffect(()=>{
  if(!open)return;
  if(focusDelete.current){focusDelete.current=false;root.current?.querySelector('.draft-delete-action')?.focus({preventScroll:true})}
  const outside=e=>{if(!root.current?.contains(e.target))setOpen(false)};
  document.addEventListener('pointerdown',outside,true);
  return()=>document.removeEventListener('pointerdown',outside,true);
 },[open]);
 // The surrounding mobile-scroll uses pointer events for vertical scrolling.
 // Let it see down/up, but do not let it capture a horizontal or undecided drag.
 const reset=()=>{const d=drag.current;drag.current=null;setOffset(null);if(d?.captured)try{root.current?.releasePointerCapture?.(d.id)}catch{}};
 const cancel=e=>{const d=drag.current;if(!d||(e&&d.id!==e.pointerId))return;if(d.axis)skipClick.current=true;reset()};
 const finish=e=>{
  const d=drag.current;if(!d||d.id!==e.pointerId)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y,axis=d.axis||draftSwipeDirection(dx,dy);
  if(axis)skipClick.current=true;
  if(!disabled&&axis==='horizontal'){
   setOpen(draftSwipeOffset(d.origin,dx)<=-SWIPE_REVEAL/2);
   e.preventDefault();
  }
  // Keep pointerup bubbling so the parent clears its pending scroll gesture.
  reset();
 };
 R.useEffect(()=>{if(disabled){reset();setOpen(false)}},[disabled]);
 return h('div',{ref:root,className:'draft-swipe'+(open?' is-open':'')+(offset!==null?' is-dragging':''),'data-testid':'draft-swipe',
  onKeyDown:e=>{skipClick.current=false;if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);root.current?.querySelector('.draft-more')?.focus()}},
  onPointerDown:e=>{
   if(drag.current&&drag.current.id!==e.pointerId){skipClick.current=true;reset();return}
   if(disabled||e.button>0||e.isPrimary===false)return;
   skipClick.current=false;
   if(e.target.closest?.('.draft-delete-action,.draft-more'))return;
   drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:open?-SWIPE_REVEAL:0,axis:null,captured:false};
  },
  onPointerMove:e=>{
   const d=drag.current;if(!d||d.id!==e.pointerId)return;
   if(disabled){cancel(e);return}
   const dx=e.clientX-d.x,dy=e.clientY-d.y;d.axis ||= draftSwipeDirection(dx,dy);
   if(d.axis==='vertical'){skipClick.current=true;reset();return}
   e.stopPropagation();
   if(d.axis==='horizontal'){
    skipClick.current=true;e.preventDefault();setOffset(draftSwipeOffset(d.origin,dx));
    if(!d.captured)try{e.currentTarget.setPointerCapture?.(e.pointerId);d.captured=true}catch{/* Continue while the pointer remains over the card. */}
   }
  },
  onPointerUp:finish,onPointerCancel:cancel,
  // Touch implicitly captures the child button first. Transferring capture to
  // this card emits a bubbling loss from that child; it must not cancel us.
  onLostPointerCapture:e=>{if(e.target===e.currentTarget)cancel(e)},
  onClickCapture:e=>{if(skipClick.current){skipClick.current=false;e.preventDefault();e.stopPropagation()}}
 },h('button',{type:'button',className:'draft-delete-action','aria-label':t('刪除草稿：')+title,'aria-hidden':!open,tabIndex:open?0:-1,disabled:disabled||!open,onClick:()=>{if(disabled||!open)return;setOpen(false);onDelete()}},h('span',{'aria-hidden':true},'×'),h('span',null,t('刪除'))),
  h('div',{className:'draft-swipe-surface',style:{transform:`translateX(${offset??(open?-SWIPE_REVEAL:0)}px)`}},
   h('button',{type:'button',className:'draft-continue',disabled,onClick:()=>{if(disabled)return;if(open){setOpen(false);return}onContinue()}},h('span',null,t('繼續填寫')),h('strong',null,title)),
   h('button',{type:'button',className:'draft-more','aria-label':t('草稿操作：')+title,'aria-expanded':open,tabIndex:open?-1:0,disabled,onClick:()=>{if(disabled)return;focusDelete.current=!open;setOpen(!open)}},'⋯')));
}

export function DraftCard({react:R,store,kind,draftKey,title,onContinue,emptyFood}){
 const h=R.createElement,[selection,setSelection]=R.useState(null),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),lock=R.useRef(false),dialog=R.useRef(null),trigger=R.useRef(null),container=R.useRef(null);
 usePhoneDialog(R,dialog,!!selection);
 R.useEffect(()=>{if(selection){dialog.current?.showModal();}else{dialog.current?.close();trigger.current?.isConnected&&trigger.current.focus?.()}},[!!selection]);
 const close=()=>{if(!lock.current)setSelection(null)};
 const request=()=>{trigger.current=container.current?.querySelector('.draft-more');setError('');setSelection({kind,key:draftKey,snapshot:structuredClone(draftSnapshot(store.get().data,kind,draftKey))})};
 const remove=async()=>{
  if(lock.current||!selection)return;lock.current=true;setBusy(true);setError('');
  const region=container.current?.closest('section'),app=container.current?.closest('.inpaw-app');
  try{await store.atomic(data=>discardSelectedDraft(data,selection,emptyFood?.()));setSelection(null);
   // The removed card unmounts; move keyboard focus to a surviving action.
   const next=region?.isConnected?region.querySelector('.draft-continue'):app?.querySelector('.shell-tab[aria-current="page"]');next?.focus?.({preventScroll:true});
  }catch(e){setError(tn(e.message)||t('刪除未保存，草稿仍保留。'))}finally{lock.current=false;setBusy(false)}
 };
 return h('div',{className:'draft-card',ref:container},h(SwipeDraftCard,{react:R,title,onContinue,onDelete:request,disabled:busy}),
  h('dialog',{ref:dialog,className:'m-action-dialog draft-delete-dialog','aria-label':kind==='food'?t('刪除食品草稿'):t('刪除餵食草稿'),onCancel:e=>{e.preventDefault();close()}},selection&&h(R.Fragment,null,
   h('h2',null,kind==='food'?t('刪除這張食品草稿？'):t('刪除這餐草稿？')),h('p',{className:'draft-delete-title'},title),
   h('p',null,kind==='food'?t('只移除這張未完成的食品草稿；已儲存的食品卡、餵食紀錄與其他草稿都會保留。'):t('只移除這餐未完成的內容；已儲存的餵食紀錄、食品卡與其他草稿都會保留。')),
   error&&h('p',{role:'alert',className:'error'},error),h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:close,autoFocus:true},t('保留草稿')),h('button',{type:'button',className:'primary danger',disabled:busy,onClick:remove},busy?t('正在保存…'):t('確認刪除草稿')))));
}
export function FoodDraftCard({react:R,store,onContinue,emptyFood}){
 const data=R.useSyncExternalStore(store.subscribe,store.get).data;
 if(!data.foodSession?.foodPending||!hasMeaningfulFoodInput(data.foodSession.draft))return null;
 return R.createElement('section',{className:'home-drafts unified-drafts','aria-label':t('未完成的食品草稿')},R.createElement('h2',null,t('未完成的食品草稿')),R.createElement('p',{className:'draft-swipe-hint'},t('卡片左滑或點 ⋯，可刪除草稿')),R.createElement(DraftCard,{react:R,store,kind:'food',title:foodDraftName(data.foodSession.draft,data.foodCards),onContinue,emptyFood}));
}
