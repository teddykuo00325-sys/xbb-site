import {calendarDay} from './today-overview-v29.js?v=8f5745b7843b';
const shift=(date,n)=>new Date((calendarDay(date)+n)*864e5).toISOString().slice(0,10);
export function dietViewFor(views,catId,today){
 const previous=views.get(catId);
 if(previous?.today===today)return previous;
 const next={today,date:today,before:shift(today,-2),after:shift(today,-1),pending:false,snapshot:null};views.set(catId,next);return next;
}
function identity(node,root){
 const parts=[];for(let current=node;current&&current!==root;current=current.parentElement){
  const key=current.getAttribute?.('data-diet-view');
  if(key)parts.unshift(key);
  else if(current.tagName==='DETAILS')parts.unshift('details:'+String(current.querySelector(':scope > summary')?.textContent||'').replace(/（\d+\s*(?:筆|餐|項)）/g,''));
 }
 return parts.join('/');
}
function scroller(root){return root.closest('.mobile-scroll')||root.closest('.app-scroll')||root.ownerDocument?.scrollingElement}
export function captureDietView(root,origin){
 if(!root)return null;
 const details=[root,...root.querySelectorAll('details')];
 return {open:details.filter(node=>node.open).map(node=>node===root?'root':identity(node,root)),focus:origin?identity(origin,root):null,scrollTop:scroller(root)?.scrollTop??0};
}
export function restoreDietView(root,snapshot){
 if(!root||!snapshot)return false;
 const open=new Set(snapshot.open);for(const node of [root,...root.querySelectorAll('details')])node.open=open.has(node===root?'root':identity(node,root));
 const target=snapshot.focus?[...root.querySelectorAll('[data-diet-view]')].find(node=>identity(node,root)===snapshot.focus):null;
 (target||root.querySelector(':scope > summary'))?.focus?.({preventScroll:true});
 const scroll=scroller(root);if(scroll)scroll.scrollTop=snapshot.scrollTop;
 return true;
}
/** View-only state belongs to the mounted host, separately for each cat/day.
 * It stores no care content and does not use browser storage or navigation. */
export function useDietObservationView({react:R,views,catId,today,onRecord,onChange}){
 const local=R.useRef(new Map()),root=R.useRef(null),pool=views?.current||local.current,saved=dietViewFor(pool,catId,today);
 const key=catId+'|'+today,[state,setState]=R.useState(()=>({key,date:saved.date,before:saved.before,after:saved.after}));
 const value=state.key===key?state:{key,date:saved.date,before:saved.before,after:saved.after};
 const set=(field,date)=>{const next={...value,[field]:date};setState(next);saved[field]=date;saved.snapshot=null;saved.pending=false};
 const remember=origin=>{saved.date=value.date;saved.before=value.before;saved.after=value.after;saved.snapshot=captureDietView(root.current,origin);saved.pending=!!saved.snapshot};
 R.useEffect(()=>{
  if(!saved.pending||!saved.snapshot)return;
  saved.pending=false;let cancelled=false,frame;
  const restore=()=>{if(!cancelled&&root.current)restoreDietView(root.current,saved.snapshot)};
  restore();const schedule=globalThis.requestAnimationFrame;if(schedule)frame=schedule(restore);
  return()=>{cancelled=true;if(frame!==undefined)globalThis.cancelAnimationFrame?.(frame)};
 },[catId,today]);
 return {...value,root,setDate:date=>set('date',date),setBefore:date=>set('before',date),setAfter:date=>set('after',date),onRecord:typeof onRecord==='function'?(row,origin)=>{remember(origin);onRecord(row)}:undefined,onChange:typeof onChange==='function'?(id,origin)=>{remember(origin);onChange(id)}:undefined};
}
