import {t} from './i18n.js?v=audit1117b';
import {NavigationIcon} from './navigation-icons.js?v=cuteexpanded1';
// Shared navigation surfaces. They own presentation and focus, never care data.
// Ian 2026-11-13：以照護為主體，分頁改成 今日｜照護｜紀錄｜陪玩｜毛孩。餵食不再是分頁（首頁「記一餐」與紀錄仍可用），
// 照顧時間表要做的紅點掛在「照護」。
export const NAV_DESTINATIONS=Object.freeze([
  {id:'home',label:t('今日'),icon:'house'},
  {id:'care',label:t('照護'),icon:'care-calendar'},
  {id:'records',label:t('紀錄'),icon:'notebook'},
  {id:'interaction',label:t('陪玩'),icon:'play-wand'},
  {id:'profile',label:t('毛孩'),icon:'cat-face'}
].map(Object.freeze));
const BADGE_TAB='care';

// Listen on the local app so replacement scroll viewports are handled too.
// Ignore inner pickers, task sheets, horizontal-only movement and iOS bounce.
export function observeNavigationScroll(dock,onCompact) {
  const app=dock?.closest('.inpaw-app');
  if(!app)return ()=>{};
  let viewport=app.querySelector('.app-scroll .mobile-scroll')||app.querySelector('.app-scroll');
  let last=Math.max(0,viewport?.scrollTop||0),travel=0,direction=0;
  const onScroll=event=>{
    const target=event.target;
    if(!target?.matches?.('.mobile-scroll,.app-scroll')||target.closest('.inpaw-app')!==app||app.closest('[inert]'))return;
    if(target!==viewport){viewport=target;last=0;travel=0;direction=0}
    const top=Math.max(0,Math.min(target.scrollTop,Math.max(0,target.scrollHeight-target.clientHeight)));
    const delta=top-last;last=top;
    if(top<24){travel=0;direction=0;onCompact(false);return}
    if(Math.abs(delta)<1)return;
    const next=Math.sign(delta);
    travel=next===direction?travel+Math.abs(delta):Math.abs(delta);direction=next;
    if(next>0&&top>64&&travel>=28){onCompact(true);travel=0}
    if(next<0&&travel>=14){onCompact(false);travel=0}
  };
  app.addEventListener('scroll',onScroll,{capture:true,passive:true});
  return()=>app.removeEventListener('scroll',onScroll,true);
}

export function headerContentReserve(viewportTop,headerBottom,scale=1,gap=4) {
  return Math.ceil(Math.max(0,headerBottom-viewportTop)/(scale>0?scale:1)+gap);
}

export function bottomContentReserve(viewportBottom,obstacleTop,scale=1,gap=16) {
  return Math.ceil(Math.max(0,viewportBottom-obstacleTop)/(scale>0?scale:1)+gap);
}

// Only the fixed tab dock reserves space; record actions live in page content.
// Measure against the app so changing the scroll inset does not affect the next measurement.
// Rectangles can be scaled by the desktop phone preview.
export function observeBottomClearance(dock) {
  const app=dock?.closest('.inpaw-app');
  if(!app||typeof window==='undefined')return ()=>{};
  const doc=app.ownerDocument,scope=dock.closest('.device-screen')||dock.closest('.navigation-route-surface')||app;
  const header=app.querySelector(':scope > .app-header');
  let frame=null;
  const visible=node=>!!node?.getClientRects?.().length&&window.getComputedStyle(node).visibility!=='hidden'&&window.getComputedStyle(node).display!=='none';
  const update=()=>{
    frame=null;
    const modal=Array.from(scope.querySelectorAll('dialog[open],[role="dialog"],[role="alertdialog"]')).some(node=>visible(node)&&!node.hasAttribute('hidden')&&node.getAttribute('aria-hidden')!=='true'&&node.getAttribute('data-state')!=='closed');
    app.classList.toggle('shell-dialog-open',modal);
    if(modal||app.closest('[inert]')||!visible(dock))return;
    const scroll=app.querySelector(':scope > .app-scroll');
    if(!scroll)return;
    const viewport=app.getBoundingClientRect(),add=dock.querySelector('.shell-add-record'),rect=dock.getBoundingClientRect();
    const top=visible(add)?Math.min(rect.top,add.getBoundingClientRect().top):rect.top;
    const scale=viewport.height&&app.clientHeight?viewport.height/app.clientHeight:1;
    app.style.setProperty('--shell-viewport-inset',bottomContentReserve(viewport.bottom,top,scale)+'px');
    app.style.setProperty('--shell-tabs-inset',bottomContentReserve(viewport.bottom,rect.top,scale,8)+'px');
    if(visible(header))app.style.setProperty('--shell-header-inset',headerContentReserve(viewport.top,header.getBoundingClientRect().bottom,scale)+'px');
  };
  const schedule=()=>{if(frame===null)frame=window.requestAnimationFrame(update)};
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
  resize?.observe(dock);resize?.observe(app);if(header)resize?.observe(header);
  const mutation=typeof MutationObserver==='undefined'?null:new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'||r.target!==app))schedule();
  });
  mutation?.observe(scope,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open','aria-hidden','data-state','hidden','inert']});
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
  doc.addEventListener('focusin',schedule);doc.addEventListener('focusout',schedule);schedule();
  return()=>{resize?.disconnect();mutation?.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);doc.removeEventListener('focusin',schedule);doc.removeEventListener('focusout',schedule);if(frame!==null)window.cancelAnimationFrame(frame);app.style.removeProperty('--shell-viewport-inset');app.style.removeProperty('--shell-tabs-inset');app.style.removeProperty('--shell-header-inset');app.classList.remove('shell-dialog-open')};
}

const clampTab=value=>Math.min(NAV_DESTINATIONS.length-1,Math.max(0,value));
const tabPosition=(gesture,x)=>clampTab((x-gesture.firstCenter)/gesture.step);
function tabTrack(nav) {
  const first=nav.children?.[0]?.getBoundingClientRect();
  const next=nav.children?.[1]?.getBoundingClientRect();
  if(first?.width>0&&next?.left>first.left)return {firstCenter:first.left+first.width/2,step:next.left-first.left};
  const rect=nav.getBoundingClientRect(),step=rect.width/NAV_DESTINATIONS.length;
  return {firstCenter:(rect.left??0)+step/2,step};
}

export function BottomTabs({react:R,active,onNavigate,disabled=false,onAdd,pending=0}) {
  const h=R.createElement,dock=R.useRef(null),swipe=R.useRef(null),suppressClick=R.useRef(false);
  const [compact,setCompact]=R.useState(false),[drag,setDrag]=R.useState(null),[settling,setSettling]=R.useState(false),[tapPulse,setTapPulse]=R.useState(0);
  const index=NAV_DESTINATIONS.findIndex(item=>item.id===active);
  R.useEffect(()=>{setCompact(false);return observeNavigationScroll(dock.current,setCompact)},[active]);
  R.useEffect(()=>observeBottomClearance(dock.current),[active,onAdd]);
  const navigate=destination=>{if(!disabled){setCompact(false);onNavigate(destination)}};
  const tapTab=tab=>{setSettling(false);if(tab!==index)setTapPulse(value=>value===1?2:1);navigate(NAV_DESTINATIONS[tab].id)};
  const pointerDown=event=>{
    if(disabled||index<0||event.isPrimary===false||event.button!==0)return;
    suppressClick.current=false;
    const track=tabTrack(event.currentTarget);
    if(track.step<=0)return;
    const tapButton=event.pointerType==='touch'?event.target?.closest?.('.shell-tab'):null;
    swipe.current={...track,pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,started:false,tapButton};
  };
  const pointerMove=event=>{
    const start=swipe.current;
    if(!start||event.pointerId!==start.pointerId||disabled)return;
    const dx=event.clientX-start.clientX,dy=event.clientY-start.clientY;
    if(!start.started){
      if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)){swipe.current=null;return;}
      if(Math.abs(dx)<10||Math.abs(dx)<=Math.abs(dy)*1.5)return;
      start.started=true;setTapPulse(0);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    const position=tabPosition(start,event.clientX);
    const impulse=Math.abs(event.clientX-(start.lastX??start.clientX))/start.step;
    const strain=Math.min(1,impulse*2);
    start.lastX=event.clientX;
    setDrag({position,stretch:1.13+strain*.10,scaleY:1.19-strain*.04});
  };
  const pointerEnd=(event,canceled=false)=>{
    const start=swipe.current;
    if(!start||start.pointerId!==event.pointerId)return;
    swipe.current=null;
    if(start.started){setSettling(true);setDrag(null)}
    if(canceled||disabled)return;
    if(!start.started){
      // A touch tap may not produce a browser click immediately after a drag.
      // The short, same-button gesture has already unambiguously selected a tab.
      const button=start.tapButton,rect=button?.getBoundingClientRect();
      if(rect&&Math.hypot(event.clientX-start.clientX,event.clientY-start.clientY)<10&&event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom){
        const tab=Array.prototype.indexOf.call(event.currentTarget.children,button);
        if(tab>=0&&tab<NAV_DESTINATIONS.length){suppressClick.current=true;tapTab(tab)}
      }
      return;
    }
    suppressClick.current=true;
    const target=Math.round(tabPosition(start,event.clientX));
    if(target!==index)navigate(NAV_DESTINATIONS[target].id);
  };
  return h('div',{ref:dock,className:'shell-nav-dock'+(compact?' is-compact':''),onFocusCapture:()=>setCompact(false)},
    h('nav',{className:'shell-bottom-tabs'+(index>=0?' has-indicator':'')+(drag?' is-sliding':settling?' is-settling':''),
      style:index>=0?{'--shell-indicator-index':drag?.position??index,'--shell-glass-stretch':drag?.stretch??1,'--shell-glass-height':drag?.scaleY??1}:undefined,'aria-label':t('主要導覽'),
      'data-tap-pulse':tapPulse||undefined,
      onAnimationEnd:event=>{if(event.target===event.currentTarget&&event.animationName==='shell-tab-tap-'+tapPulse)setTapPulse(0)},
      onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:event=>pointerEnd(event),
      onPointerCancel:event=>pointerEnd(event,true),
      onPointerLeave:event=>{if(!swipe.current?.started)pointerEnd(event,true)},
      // Touch initially captures on the tab's child. Its bubbling loss when
      // the nav takes over is a handoff, not a cancellation of the drag.
      onLostPointerCapture:event=>{if(event.target===event.currentTarget)pointerEnd(event,true)},
      onClickCapture:event=>{if(suppressClick.current&&event.detail!==0){suppressClick.current=false;event.preventDefault();event.stopPropagation();}}
    },NAV_DESTINATIONS.map((item,tab)=>h('button',{
      key:item.id,type:'button',className:'shell-tab'+(active===item.id?' is-active':''),'aria-label':item.label+(item.id===BADGE_TAB&&pending>0?t('，{count} 項要做',{count:pending}):''),
      'aria-current':active===item.id?'page':undefined,disabled,
      'data-lens-target':drag&&Math.round(drag.position)===tab?'true':undefined,
      style:{'--shell-tab-index':tab},
      onClick:()=>tapTab(tab)
    },h('span',{className:'shell-tab-icon'},h(NavigationIcon,{react:R,name:item.icon}),item.id===BADGE_TAB&&pending>0&&h('small',{className:'shell-tab-badge','aria-label':t('{count} 項要做',{count:pending})},pending)),h('span',{className:'shell-tab-label'},item.label),
      drag&&h('span',{className:'shell-tab-lens','aria-hidden':true},h('span',{className:'shell-tab-icon'},h(NavigationIcon,{react:R,name:item.icon})),h('span',{className:'shell-tab-label'},item.label))))));
}

export function sheetDragShouldClose(start,end) {
  if(!start||!end||start.pointerId!==end.pointerId)return false;
  const dx=end.clientX-start.clientX,dy=end.clientY-start.clientY;
  return dy>=72&&dy>Math.abs(dx)*1.5&&end.timeStamp-start.timeStamp<1500;
}

const focusableSelector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
const focusables=panel=>Array.from(panel.querySelectorAll(focusableSelector)).filter(node=>!node.closest('[inert],[aria-hidden="true"]')&&node.getClientRects().length);
function otherDialog(target,panel) {
  const dialog=target?.closest?.('dialog,[role="dialog"],[role="alertdialog"]');
  return !!dialog&&dialog!==panel&&!dialog.contains(panel);
}

// Also used by the component tests so modal keyboard behavior is exercised,
// rather than merely checking that a handler exists in the source.
export function activateTaskSheet(overlay,panel,close) {
  if(!overlay||!panel)return ()=>{};
  const doc=panel.ownerDocument,previous=doc.activeElement;
  const siblings=Array.from(overlay.parentElement?.children||[]).filter(node=>node!==overlay);
  // A RouteSurface already owns its background's inert state. Never restore an
  // old true value after its parent has removed that attribute during close.
  const states=siblings.filter(node=>!node.inert).map(node=>[node,node.inert]);
  for(const [node] of states)node.inert=true;
  const focusPanel=()=>panel.focus({preventScroll:true});
  const keydown=event=>{
    // Confirmation dialogs and nested pickers own their keyboard interaction.
    if(event.defaultPrevented||otherDialog(event.target,panel))return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
    if(event.key!=='Tab')return;
    const choices=focusables(panel),first=choices[0],last=choices.at(-1),current=doc.activeElement;
    if(!first){event.preventDefault();focusPanel();return}
    if(!panel.contains(current)||current===panel){event.preventDefault();(event.shiftKey?last:first).focus();return}
    if(event.shiftKey&&current===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&current===last){event.preventDefault();first.focus()}
  };
  const focusin=event=>{if(!panel.contains(event.target)&&!otherDialog(event.target,panel))focusPanel()};
  doc.addEventListener('keydown',keydown);
  doc.addEventListener('focusin',focusin,true);
  focusPanel();
  return()=>{
    doc.removeEventListener('keydown',keydown);
    doc.removeEventListener('focusin',focusin,true);
    for(const [node,inert] of states)node.inert=inert;
    if(previous?.isConnected&&!previous.closest?.('[inert]'))previous.focus({preventScroll:true});
  };
}

export function TaskSheet({react:R,title,onClose,disabled=false,children}) {
  const h=R.createElement,overlay=R.useRef(null),panel=R.useRef(null),drag=R.useRef(null),close=R.useRef(null);
  close.current=()=>{if(!disabled)onClose?.()};
  R.useEffect(()=>activateTaskSheet(overlay.current,panel.current,()=>close.current()),[]);
  const resetDrag=()=>{drag.current=null;panel.current?.style.removeProperty('--sheet-drag')};
  const point=event=>({pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,timeStamp:event.timeStamp});
  return h('div',{ref:overlay,className:'task-sheet-overlay',onClick:event=>{if(event.target===event.currentTarget)close.current()}},
    h('section',{ref:panel,className:'task-sheet-panel',role:'dialog','aria-modal':true,'aria-label':title,tabIndex:-1},
      h('div',{className:'task-sheet-handle','aria-hidden':true,
        onPointerDown:event=>{if(disabled||event.button>0)return;drag.current=point(event);event.currentTarget.setPointerCapture?.(event.pointerId)},
        onPointerMove:event=>{if(!drag.current||disabled||drag.current.pointerId!==event.pointerId)return;panel.current?.style.setProperty('--sheet-drag',Math.min(120,Math.max(0,event.clientY-drag.current.clientY))+'px')},
        onPointerUp:event=>{const dismiss=!disabled&&sheetDragShouldClose(drag.current,point(event));resetDrag();if(dismiss)close.current()},
        onPointerCancel:resetDrag,onLostPointerCapture:resetDrag
      },h('span',null)),
      h('header',{className:'task-sheet-header'},
        h('button',{type:'button',className:'task-sheet-back','aria-label':t('返回'),disabled,onClick:()=>close.current()},h('img',{src:'/xbb-site/app/assets/icons/caret-left.svg',alt:''})),
        h('h2',null,title),
        h('button',{type:'button',className:'task-sheet-close','aria-label':t('關閉{title}',{title}),disabled,onClick:()=>close.current()},h('img',{src:'/xbb-site/app/assets/icons/x.svg',alt:''}))),
      h('div',{className:'task-sheet-content'},children)));
}

export function RouteSurface({react:R,sheet=false,title,onClose,disabled=false,children,background,onPage}) {
  const h=R.createElement,lastPage=R.useRef(null);
  if(!sheet){lastPage.current=children;onPage?.(children)}
  return h('div',{className:'navigation-route-surface'+(sheet?' has-task-sheet':'')},
    h('div',{className:'navigation-route-background',inert:sheet?true:undefined,'aria-hidden':sheet?true:undefined},sheet?(lastPage.current??background??null):children),
    sheet&&h(TaskSheet,{react:R,title,onClose,disabled},children));
}
