import {t, K, isEnglish} from './i18n.js?v=audit1117b';
import {hasMealInput,hasMealDraft,isSavedMealDraft} from './usability-v49.js?v=8f5745b7843b';
import {DraftCard} from './draft-actions.js?v=8f5745b7843b';
import {parkIndependentFood} from './food-entry-stability.js?v=8f5745b7843b';
// v45: shared rules for the audit fixes. No destructive data migrations.
export const observationPlaceholder = category => ({
  體重:t('例如：飯前量測（可留空）'),飲食:t('例如：早餐吃得比平常少'),
  嘔吐:t('例如：晚上吐了一次，看到少量毛球'),喝水:t('例如：下午看到牠主動喝水'),
  排泄:t('例如：今天便便偏軟'),聲音反應:t('例如：聽到聲音後轉頭，接著繼續休息'),
  其他:t('例如：今天活動量和平常差不多')
}[category]||t('記下你實際看到的情況'));
export function weightRecordText(record){
  if(record.category!==K('體重'))return record.text.trim();
  const title=K(`體重 ${record.amount.trim()} 公斤`),text=record.text.trim();
  // Preserve freeform observations and historical comparisons while avoiding
  // duplicating the generated title when an existing weight is edited.
  const note=text.replace(/^體重\s*\d+(?:\.\d+)?\s*公斤(?:\s*[；;]\s*|$)/,'').trim();
  return title+(note?'；'+note:'');
}
export function mealNeedsCorrection(meal,food,today){
  const provided=String(meal.provided??'').trim(),eaten=String(meal.eaten??'').trim();
  return (!food&&(!meal.quickName?.trim()||!meal.quickCategory))||!meal.date||meal.date>today||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time)||
    (provided!==''&&(!/^\d+(?:\.\d+)?$/.test(provided)||!Number.isFinite(Number(provided))||Number(provided)<=0))||
    (eaten!==''&&(!/^\d+(?:\.\d+)?$/.test(eaten)||!Number.isFinite(Number(eaten))||provided!==''&&Number(eaten)>Number(provided)));
}
const EXPORT_KEY='inpaw-last-export-created';
export function rememberExport(iso){try{localStorage.setItem(EXPORT_KEY,iso)}catch{/* Export still succeeds if metadata storage is unavailable. */}}
export function recentExportText(){
  let value;try{value=localStorage.getItem(EXPORT_KEY)}catch{}
  return value&&Number.isFinite(Date.parse(value))?t('最近產生匯出檔：{time}',{time:new Intl.DateTimeFormat(isEnglish()?'en-US':'zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))}):t('資料儲存在這台裝置');
}
// Scroll only the active form's own viewport. Custom workspaces and shadow-root
// forms need the same handling as native dialogs; never move the document.
export function revealFocusedControl(doc) {
  let field=doc?.activeElement;
  while(field?.shadowRoot?.activeElement)field=field.shadowRoot.activeElement;
  if(!field?.matches?.('input,textarea,select')||field.disabled)return;
  const selector='.cj-ai-scroll,.cj-workspace,.mobile-scroll,.task-sheet-content,.ai-route-scroll,dialog[open]';
  let scope=field,scroll;
  while(scope&&!scroll){scroll=scope.closest?.(selector);scope=scope.getRootNode?.()?.host;}
  if(!scroll)return;
  const box=scroll.getBoundingClientRect(),rect=field.getBoundingClientRect();
  const scale=scroll.clientHeight?box.height/scroll.clientHeight:1;
  if(!(scale>0))return;
  const viewport=doc?.defaultView?.visualViewport,zoomed=viewport&&Math.abs((viewport.scale||1)-1)>.01;
  if(zoomed)return;
  const top=Math.max(box.top,viewport?.offsetTop??box.top)+12;
  const bottom=Math.min(box.bottom,viewport?(viewport.offsetTop||0)+viewport.height:box.bottom)-12;
  if(bottom<=top)return;
  if(rect.top<top)scroll.scrollTop+=(rect.top-top)/scale;
  else if(rect.bottom>bottom&&rect.height<=bottom-top)scroll.scrollTop+=(rect.bottom-bottom)/scale;
  else if(rect.top>=bottom)scroll.scrollTop+=(rect.top-top)/scale;
}
export function phoneDialogBounds(box,viewport={},gutter=12) {
  const left=Math.max(box.left,viewport.offsetLeft||0),top=Math.max(box.top,viewport.offsetTop||0);
  const right=Math.min(box.right??box.left+box.width,(viewport.offsetLeft||0)+(viewport.width??Infinity));
  const bottom=Math.min(box.bottom??box.top+box.height,(viewport.offsetTop||0)+(viewport.height??Infinity));
  return {left:left+gutter,top:top+gutter,width:Math.max(0,right-left-2*gutter),height:Math.max(0,bottom-top-2*gutter)};
}
// A backdrop-filter/transform makes fixed descendants use the backdrop's
// containing block. Convert viewport measurements to that block instead of
// applying the app's screen offset twice. Native modal dialogs remain in the
// top layer and must keep viewport coordinates.
export function phoneDialogLocalBounds(bounds,box,metrics={}){
  const scaleX=box.width>0&&metrics.width>0?box.width/metrics.width:1;
  const scaleY=box.height>0&&metrics.height>0?box.height/metrics.height:1;
  return {left:(bounds.left-box.left)/scaleX-(metrics.borderLeft||0)+(metrics.scrollLeft||0),top:(bounds.top-box.top)/scaleY-(metrics.borderTop||0)+(metrics.scrollTop||0),width:bounds.width/scaleX,height:bounds.height/scaleY};
}
// The application root already follows visualViewport. A voice workspace must
// fill that root rather than measuring the resized root and fitting it again.
// In particular, scrolling the editor must not re-enter dialog positioning.
export function manageVoiceViewportDialog(el,win=window){
  const scrim=el.parentElement;
  const owned=['position','margin','left','top','right','bottom','width','max-width','height','max-height','box-sizing'];
  for(const name of owned)el.style.removeProperty(name);
  scrim.style.removeProperty('clip-path');
  scrim.setAttribute('data-voice-viewport','');el.setAttribute('data-voice-viewport','');
  let fullHeight=win.visualViewport?.height??win.innerHeight,keyboardFit=false;
  const update=()=>{
    const viewport=win.visualViewport,focused=el.ownerDocument.activeElement;
    if(viewport&&Math.abs((viewport.scale||1)-1)>.01)return;
    const height=viewport?.height??win.innerHeight;
    const editing=el.contains(focused)&&focused?.matches?.('textarea,input:not([type]),input[type="text"]');
    if(!editing&&!keyboardFit)fullHeight=Math.max(height,win.innerHeight);
    keyboardFit=!!(editing||keyboardFit)&&Math.max(fullHeight,win.innerHeight)-height>100;
    el.toggleAttribute('data-keyboard-fit',keyboardFit);
  };
  update();
  // Resize changes the usable height. Pan and editor scroll do not change it.
  win.addEventListener('resize',update);win.visualViewport?.addEventListener('resize',update);
  el.addEventListener('focusin',update);el.addEventListener('focusout',update);
  return()=>{
    win.removeEventListener('resize',update);win.visualViewport?.removeEventListener('resize',update);
    el.removeEventListener('focusin',update);el.removeEventListener('focusout',update);
    scrim.removeAttribute('data-voice-viewport');el.removeAttribute('data-voice-viewport');el.removeAttribute('data-keyboard-fit');
  };
}
export function usePhoneDialog(R,ref,open,withinTaskSheet=true,fitVoiceKeyboard=false){
  (R.useLayoutEffect||R.useEffect)(()=>{
    if(!open)return;
    let frame=null,observedSurface=null,lastGeometry=null;
    const el=ref.current;
    if(!el)return;
    const scrim=el.parentElement?.matches('.cj-scrim')?el.parentElement:null;
    if(fitVoiceKeyboard&&scrim)return manageVoiceViewportDialog(el);
    const root=fitVoiceKeyboard?el.closest('#root'):null;
    let fullHeight=window.visualViewport?.height??window.innerHeight,keyboardFit=false;
    const position=()=>{
      frame=null;
      const scope=el.closest('.mc-root')||document;
      const viewport=window.visualViewport||{width:window.innerWidth,height:window.innerHeight};
      const focused=document.activeElement;
      const editing=el.contains(focused)&&focused?.matches('textarea, input:not([type]), input[type="text"]');
      if(root&&(viewport.scale??1)===1){
        if(!editing&&!keyboardFit)fullHeight=viewport.height;
        keyboardFit=(editing||keyboardFit)&&Math.max(fullHeight,window.innerHeight)-viewport.height>100;
      }else keyboardFit=false;
      const surface=keyboardFit?root:withinTaskSheet?(scope.querySelector('.task-sheet-panel .inpaw-app')||scope.querySelector('.inpaw-app')):
        (scope.querySelector('.navigation-route-surface')||scope.querySelector('.inpaw-app'));
      if(surface!==observedSurface){if(observedSurface)observer?.unobserve(observedSurface);if(surface)observer?.observe(surface);observedSurface=surface;}
      const container=scrim?.getBoundingClientRect();
      let box=surface?.getBoundingClientRect()||container;
      if(!box)return;
      if(container){
        const left=Math.max(box.left,container.left),top=Math.max(box.top,container.top);
        const right=Math.min(box.right??box.left+box.width,container.right??container.left+container.width),bottom=Math.min(box.bottom??box.top+box.height,container.bottom??container.top+container.height);
        box={left,top,right,bottom,width:right-left,height:bottom-top};
      }
      let bounds=phoneDialogBounds(box,viewport,keyboardFit?4:12);
      if(container){
        const metrics={width:scrim.offsetWidth,height:scrim.offsetHeight,borderLeft:scrim.clientLeft,borderTop:scrim.clientTop,scrollLeft:scrim.scrollLeft,scrollTop:scrim.scrollTop};
        const app=phoneDialogLocalBounds(box,container,metrics);
        // The preview's fixed containing block can be larger than the phone.
        // Clip the tint, backdrop blur and shadow to the actual app surface.
        scrim.style.clipPath=`inset(${Math.max(0,app.top)}px ${Math.max(0,metrics.width-app.left-app.width)}px ${Math.max(0,metrics.height-app.top-app.height)}px ${Math.max(0,app.left)}px)`;
        bounds=phoneDialogLocalBounds(bounds,container,metrics);
      }
      el.toggleAttribute('data-keyboard-fit',keyboardFit);
      Object.assign(el.style,{position:scrim?'absolute':'fixed',margin:'0',left:`${bounds.left}px`,top:`${bounds.top}px`,right:'auto',bottom:'auto',width:`${bounds.width}px`,maxWidth:`${bounds.width}px`,height:keyboardFit||fitVoiceKeyboard?`${bounds.height}px`:'',maxHeight:`${bounds.height}px`,boxSizing:'border-box'});
      const geometry=[bounds.left,bounds.top,bounds.width,bounds.height,box.top,box.left,keyboardFit].join(':');
      // Resize/pan can happen after the global viewport observer. Recheck after
      // applying these bounds, but do not fight intentional scrolling to Save.
      if(geometry!==lastGeometry&&el.contains?.(document.activeElement))revealFocusedControl(document);
      lastGeometry=geometry;
    };
    const schedule=()=>{if(frame===null)frame=requestAnimationFrame(position)};
    const observer=typeof window.ResizeObserver==='function'?new window.ResizeObserver(schedule):null;
    if(scrim)observer?.observe(scrim);
    position();window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
    if(root){el.addEventListener('focusin',schedule);el.addEventListener('focusout',schedule);}
    return()=>{
      observer?.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
      if(root){el.removeEventListener('focusin',schedule);el.removeEventListener('focusout',schedule);el.removeAttribute('data-keyboard-fit');el.style.height='';}
      if(frame!==null)cancelAnimationFrame(frame);
    };
  },[open,withinTaskSheet,fitVoiceKeyboard]);
}
export function savedMealDrafts(data){return (data.cat.mealDrafts||[]).filter(isSavedMealDraft)}
export function validMealDrafts(data,validFeeding,validFood){
  const drafts=data.cat?.mealDrafts;if(drafts===undefined)return true;
  return Array.isArray(drafts)&&new Set(drafts.map(d=>d?.key)).size===drafts.length&&drafts.every(d=>
    d&&typeof d.key==='string'&&d.key&&typeof d.feedDirty==='boolean'&&validFeeding(d.feeding)&&
    (!d.feeding.foodId||data.foodCards.some(f=>f.id===d.feeding.foodId))&&
    (!d.feeding.id||data.entries.some(e=>e.id===d.feeding.id))&&
    (d.foodDraft===undefined||!!d.foodDraft&&validFood?.(d.foodDraft.draft)&&
      typeof d.foodDraft.dirty==='boolean'&&typeof d.foodDraft.confirmed==='boolean'));
}
function linkedFood(session){
  if(session?.foodPending&&session.foodOrigin==='feed'){
    const {draft,dirty,confirmed}=session;
    return {draft,dirty,confirmed};
  }
}
export function parkMealDraft(data,key){
  const session=data.foodSession;
  if(!hasMealDraft(session))return data;
  const foodDraft=linkedFood(session);
  const draft={key,feeding:structuredClone(session.feeding),feedDirty:session.feedDirty,
    ...(foodDraft&&{foodDraft:structuredClone(foodDraft)})};
  return {...data,cat:{...data.cat,mealDrafts:[...savedMealDrafts(data),draft]}};
}
function replaceMealSession(current,base,feeding,feedPending,feedDirty,foodDraft){
  // Independent food work stays put. A linked card leaves with its meal.
  const food=foodDraft?{...structuredClone(foodDraft),foodPending:true,foodOrigin:'feed'}:
    linkedFood(current)?{draft:base.draft,foodPending:false,foodOrigin:'list',dirty:false,confirmed:false}:{};
  return {...(current||base),...food,screen:'feed',feeding,feedPending,feedDirty,
    feedOrigin:base.feedOrigin,moduleOrigin:base.moduleOrigin};
}
export function startAnotherMeal(data,base,key,{deferDraft=false}={}){
  const parked=parkMealDraft(data,key);
  return {...parked,foodSession:replaceMealSession(data.foodSession,base,base.feeding,!deferDraft&&hasMealInput(base.feeding),false)};
}
export function resumeMealDraft(data,key,base,parkKey){
  const target=savedMealDrafts(data).find(d=>d.key===key);
  if(!target)throw Error(t('這份草稿已更新，請返回清單重新選擇。'));
  let parked=parkMealDraft(data,parkKey);
  if(target.foodDraft&&!linkedFood(data.foodSession))parked=parkIndependentFood(parked,parkKey);
  return {...parked,cat:{...parked.cat,mealDrafts:savedMealDrafts(parked).filter(d=>d.key!==key)},
    foodSession:replaceMealSession(data.foodSession,base,structuredClone(target.feeding),true,target.feedDirty,target.foodDraft)};
}
export function SavedMealDrafts({react:R,store,onContinue,onResume,supplement=null,compact=false,children}){
  const h=R.createElement,view=R.useSyncExternalStore(store.subscribe,store.get),data=view.data,active=hasMealDraft(data.foodSession),rows=savedMealDrafts(data);
  const count=rows.length+(active?1:0),[expanded,setExpanded]=R.useState(false),draftListId=R.useId();
  if(!count)return h(R.Fragment,null,
    supplement&&h('button',{type:'button',className:'today-task',onClick:supplement.onOpen},h('strong',null,t('補吃下量')),h('span',null,t('{time} 這一餐 ›',{time:supplement.time}))),
    children);
  const title=meal=>{const food=data.foodCards.find(f=>f.id===meal.foodId);return (food?.name||meal.quickName||t('未填食品'))+(food?.archived?t('（此食品卡已刪除）'):'')+` · ${meal.date} ${meal.time}`;};
  const draftList=()=>h('section',{className:'ux-saved-drafts','aria-label':t('未完成的餵食草稿')},h('h2',null,t('餵食草稿 · {count} 餐尚未完成',{count})),h('p',null,t('草稿已保留，可以先記錄新的一餐。')),
    h('p',{className:'draft-swipe-hint'},t('卡片左滑或點 ⋯，可刪除草稿')),
    active&&h(DraftCard,{key:'active',react:R,store,kind:'active',title:title(data.foodSession.feeding)+(linkedFood(data.foodSession)?t(' · 含食品草稿'):''),onContinue}),
    rows.map(row=>h(DraftCard,{key:row.key,react:R,store,kind:'parked',draftKey:row.key,title:title(row.feeding)+(row.foodDraft?t(' · 含食品草稿'):''),onContinue:()=>onResume(row.key)})));
  if(!supplement&&!compact)return h(R.Fragment,null,draftList(),children);
  const tasks=h('section',{'aria-label':t('餵食待辦'),className:'today-feeding-tasks'},
    h('div',{className:'today-feeding-actions'},
      h('button',{type:'button','aria-expanded':expanded,'aria-controls':draftListId,onClick:()=>setExpanded(!expanded)},
        t('餵食草稿 {count} 餐',{count}),h('span',{'aria-hidden':true},expanded?'▴':'▾')),
      supplement&&h('button',{type:'button','aria-label':t('補吃下量 · {time} 這一餐',{time:supplement.time}),onClick:supplement.onOpen},
        t('補吃下量'),h('span',{'aria-hidden':true},'›'))),
    h('div',{id:draftListId,hidden:!expanded},expanded&&draftList()));
  return h(R.Fragment,null,children,tasks);
}
