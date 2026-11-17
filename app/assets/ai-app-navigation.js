import {t} from './i18n.js?v=audit1117b';
import {revealFocusedControl} from './audit-followup-v45.js?v=8f5745b7843b';
import {BottomTabs,NAV_DESTINATIONS} from './navigation-shell.js?v=8f5745b7843b';
import {mountReportReview} from '/xbb-site/app/report-review/app.js?v=ai-names1';
import {mountModelDownload} from '/xbb-site/app/model-download/app.js?v=ai-names1';

// Only route names enter browser history. Report contents remain in mounted memory.
export function parseAIPath(value,base='https://inpaw.invalid/'){
 let url;try{url=new URL(value,base)}catch{return null}
 if(url.origin!==new URL(base).origin)return null;
 if(/^\/model-download\/?(?:index\.html)?$/.test(url.pathname))return {page:'models',model:url.hash==='#text'?'text':url.hash==='#asr'?'asr':undefined};
 if(/^\/report-review\/?(?:index\.html)?$/.test(url.pathname))return {page:'report'};
 const match=url.hash.match(/^#\/ai\/(models|report)(?:\/(asr|text))?\/?$/);
 return match?{page:match[1],...(match[1]==='models'&&match[2]?{model:match[2]}:{})}:null;
}
export const aiHash=route=>'#/ai/'+route.page+(route.page==='models'&&route.model?'/'+route.model:'');
export function createAIHistory(win,onRoute){
 const token='ai-'+Math.random().toString(36).slice(2);
 const baseURL=win.location.pathname+win.location.search;
 let depth=0,current=null,pending=null;
 const data=(route,position)=>({...win.history.state,inpawAI:{token,depth:position,route}});
 const apply=route=>{current=route;onRoute(route)};
 const open=route=>{if(!['models','report'].includes(route?.page))return;if(current?.page===route.page&&current?.model===route.model)return;depth++;win.history.pushState(data(route,depth),'',baseURL+aiHash(route));apply(route)};
 const finish=()=>{const fn=pending;pending=null;fn?.()};
 const pop=()=>{const saved=win.history.state?.inpawAI;depth=saved?.token===token?saved.depth:0;apply(parseAIPath(win.location.href,win.location.href));finish()};
 const back=()=>{if(depth>0){win.history.back()}else{win.history.replaceState(data(null,0),'',baseURL);apply(null)}};
 const exit=fn=>{pending=fn;if(depth>0)win.history.go(-depth);else{win.history.replaceState(data(null,0),'',baseURL);apply(null);finish()}};
 const initial=parseAIPath(win.location.href,win.location.href);
 win.history.replaceState(data(null,0),'',baseURL);win.addEventListener('popstate',pop);
 if(initial)open(initial);
 return {open,back,exit,destroy:()=>win.removeEventListener('popstate',pop)};
}

// Native top-layer dialogs are positioned inside the app, including scaled previews.
export function aiDialogBounds(rect,viewport={}){
 const left=Math.max(rect.left,viewport.offsetLeft||0)+12,top=Math.max(rect.top,viewport.offsetTop||0)+12;
 const right=Math.min(rect.right??rect.left+rect.width,(viewport.offsetLeft||0)+(viewport.width??Infinity))-12;
 const bottom=Math.min(rect.bottom??rect.top+rect.height,(viewport.offsetTop||0)+(viewport.height??Infinity))-12;
 return {left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}
export function manageAIDialogs(root){
 const surface=root.host.closest('.ai-route-app');
 const style=document.createElement('style');
 style.textContent='dialog[open]{position:fixed!important;inset:auto!important;left:var(--ai-dialog-left)!important;top:var(--ai-dialog-top)!important;width:var(--ai-dialog-width)!important;max-width:var(--ai-dialog-width)!important;max-height:var(--ai-dialog-height)!important;margin:0!important;box-sizing:border-box;overflow:auto;overscroll-behavior:contain}dialog::backdrop{background:transparent!important;backdrop-filter:none!important}';root.append(style);
 let frame=null;
 const update=()=>{
  frame=null;if(!surface)return;const rect=surface.getBoundingClientRect();
  for(const dialog of root.querySelectorAll('dialog[open]')){
   const bounds=aiDialogBounds(rect,window.visualViewport||{width:window.innerWidth,height:window.innerHeight});
   for(const key of ['left','top','width','height'])dialog.style.setProperty('--ai-dialog-'+key,bounds[key]+'px');
  }
  const open=Array.from(surface.querySelectorAll('.ai-content-host')).some(host=>host.shadowRoot?.querySelector('dialog[open]'));
  surface.classList.toggle('ai-dialog-open',open);
 };
 const schedule=()=>{if(frame===null)frame=window.requestAnimationFrame(update)};
 const observer=new MutationObserver(schedule);observer.observe(root,{subtree:true,attributes:true,attributeFilter:['open']});
 const resize=typeof window.ResizeObserver==='function'?new window.ResizeObserver(schedule):null;if(surface)resize?.observe(surface);
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);update();
 return()=>{observer.disconnect();resize?.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);if(frame!==null)window.cancelAnimationFrame(frame);style.remove();surface?.classList.remove('ai-dialog-open')};
}

// Shadow roots cannot see document selectors. Mirror only the resolved appearance
// on their host, including retained routes, without remounting their local state.
export function syncAITheme(host){
 const doc=host.ownerDocument,win=doc.defaultView;
 const media=win.matchMedia?.('(prefers-color-scheme: dark)');
 let disposed=false;
 const sync=()=>{
  if(disposed)return;
  let theme=doc.documentElement.dataset.theme;
  if(!['light','dark'].includes(theme)){
   let saved;try{saved=win.localStorage?.getItem('inpaw-appearance-v1')}catch{}
   theme=['light','dark'].includes(saved)?saved:media?.matches?'dark':'light';
  }
  host.dataset.theme=theme;
 };
 const observer=new win.MutationObserver(sync);
 observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-theme']});
 const storage=event=>{if(event.key===null||event.key==='inpaw-appearance-v1')sync()};
 win.addEventListener('inpaw-appearance-change',sync);
 win.addEventListener('storage',storage);
 if(media?.addEventListener)media.addEventListener('change',sync);else media?.addListener?.(sync);
 sync();
 return()=>{
  disposed=true;observer.disconnect();
  win.removeEventListener('inpaw-appearance-change',sync);win.removeEventListener('storage',storage);
  if(media?.removeEventListener)media.removeEventListener('change',sync);else media?.removeListener?.(sync);
 };
}

function AIContent({react:R,page,active,model,onBack,onNavigate}){
 const host=R.useRef(null),controller=R.useRef(null),callbacks=R.useRef({onBack,onNavigate}),current=R.useRef({active,model});callbacks.current={onBack,onNavigate};current.current={active,model};
 R.useEffect(()=>{
  const root=host.current.shadowRoot||host.current.attachShadow({mode:'open'});
  const releaseTheme=syncAITheme(host.current);
  const mount=page==='models'?mountModelDownload:mountReportReview;
  controller.current=mount(root,{model,onBack:()=>callbacks.current.onBack(),onNavigate:name=>callbacks.current.onNavigate(name)});
  const releaseDialogs=manageAIDialogs(root);
  const pause=()=>controller.current?.pause(),show=()=>{if(current.current.active)controller.current?.resume(current.current.model)},visibility=()=>{if(document.hidden)pause();else show()};
  window.addEventListener('pagehide',pause);window.addEventListener('pageshow',show);document.addEventListener('visibilitychange',visibility);
  if(!active)controller.current.pause();
  return()=>{window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',show);document.removeEventListener('visibilitychange',visibility);releaseTheme();releaseDialogs();controller.current?.destroy();controller.current=null};
 },[]);
 R.useEffect(()=>{if(active)controller.current?.resume(model);else controller.current?.pause()},[active,model]);
 return R.createElement('div',{ref:host,className:'ai-content-host','data-ai-content':page});
}

export function AIAppNavigator({react:R,children}){
 const h=R.createElement,base=R.useRef(null),surface=R.useRef(null),history=R.useRef(null),origin=R.useRef(null),heading=R.useRef(null),callbacks=R.useRef(null);
 const [route,setRoute]=R.useState(null),[visited,setVisited]=R.useState({}),[activeTab,setActiveTab]=R.useState('home');
 const onRoute=next=>{setRoute(next);if(next)setVisited(v=>({...v,[next.page]:true}));};
 const originTab=()=>{const tab=base.current?.querySelector('.shell-tab.is-active');return NAV_DESTINATIONS.find(x=>tab?.getAttribute('aria-label')?.startsWith(x.label))?.id||'home'};
 const open=(page,model)=>{
  if(!route){origin.current=globalThis.document.activeElement;setActiveTab(originTab());}
  history.current?.open({page,...(model?{model}:{})});
 };
 const back=()=>history.current?.back();
 const navigate=destination=>history.current?.exit(()=>{
  requestAnimationFrame(()=>{
   // Use the retained app's existing destination controls and their dirty-form guards.
   const item=NAV_DESTINATIONS.find(x=>x.id===destination);
   const controls=Array.from(base.current?.querySelectorAll('.shell-tab')||[]);
   const target=controls.reverse().find(x=>x.getAttribute('aria-label')?.startsWith(item?.label)&&!x.closest('[inert]'));
   target?.click();
  });
 });
 callbacks.current={open,back,navigate};
 R.useEffect(()=>{
  history.current=createAIHistory(window,onRoute);
  return()=>history.current?.destroy();
 },[]);
 R.useEffect(()=>{
  const capture=e=>{
   if(e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   const anchor=e.composedPath().find(node=>node?.tagName==='A');if(!anchor)return;
   const next=parseAIPath(anchor.href,window.location.href);if(!next)return;
   e.preventDefault();e.stopPropagation();callbacks.current.open(next.page,next.model);
  };
  const node=base.current;node.addEventListener('click',capture,true);
  return()=>node.removeEventListener('click',capture,true);
 },[]);
 R.useEffect(()=>{
  if(route){heading.current?.focus({preventScroll:true});document.title=(route.page==='models'?t('手機模式所需模型'):t('看懂報告'))+t('｜毛孩小本本');}
  else{document.title=t('毛孩小本本 In Paw AI｜互動原型');if(origin.current?.isConnected)origin.current.focus({preventScroll:true});}
 },[route]);
 R.useEffect(()=>{
  const node=surface.current;if(!node)return;
  let frame=null;
  const update=()=>{
   frame=null;
   const focused=node.querySelector('.ai-route-scroll:not([hidden]) .ai-content-host')?.shadowRoot?.activeElement;
   const vv=window.visualViewport;
   const keyboard=!!focused?.matches('input,textarea,select')&&!!vv&&vv.height<window.innerHeight-120;
   node.classList.toggle('ai-keyboard-open',keyboard);
   if(keyboard)revealFocusedControl(document);
  };
  const schedule=()=>{if(frame===null)frame=window.requestAnimationFrame(update)};
  node.addEventListener('focusin',schedule);node.addEventListener('focusout',schedule);window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  return()=>{node.removeEventListener('focusin',schedule);node.removeEventListener('focusout',schedule);window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);if(frame!==null)window.cancelAnimationFrame(frame)};
 },[route]);
 return h('div',{className:'ai-app-router'},
  h('div',{ref:base,className:'ai-base-app',hidden:!!route,inert:route?true:undefined,'aria-hidden':route?true:undefined},children),
  h('div',{ref:surface,className:'inpaw-app shell-with-tabs ai-route-app',hidden:!route},
   h('header',{className:'app-header ai-route-header'},
    h('button',{type:'button',className:'h-back','aria-label':t('返回上一頁'),onClick:back},t('‹ 返回')),
    h('h1',{ref:heading,tabIndex:-1},route?.page==='models'?t('手機模式所需模型'):t('看懂報告')),h('span',{className:'ai-route-badge'},t('示範'))),
   ['models','report'].map(page=>h('div',{key:page,className:'app-scroll ai-route-scroll',hidden:route?.page!==page},visited[page]&&h(AIContent,{react:R,page,active:route?.page===page,model:route?.page===page?route?.model:undefined,onBack:back,onNavigate:open}))),
   route&&h(BottomTabs,{react:R,active:activeTab,onNavigate:navigate})));
}
