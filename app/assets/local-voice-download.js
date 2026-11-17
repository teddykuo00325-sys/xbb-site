import {t} from './i18n.js?v=audit1117b';
import {aiFeatureName} from './ai-presentation.js?v=ai-names1';
// Prototype state only: no model fetch, microphone, inference or AI entitlement.
const KEY='inpaw-local-voice-download-demo-v1';
export const MODEL_DEMO_KEYS={asr:KEY,text:'inpaw-local-text-download-demo-v1'};
const phases=new Set(['idle','waiting','downloading','paused','complete']);
export const VOICE_DOWNLOAD={model:null,megabytes:null,seconds:30};
export function voiceDownloadTransition(state,action){
 const s={...state};
 if(action.type==='reset'){s.phase='idle';s.percent=0;}
 if(action.type==='start'||action.type==='resume')s.phase=s.network==='wifi'?'downloading':'waiting';
 if(action.type==='pause'&&['downloading','waiting'].includes(s.phase))s.phase='paused';
 if(action.type==='network'){
  s.network=action.value;
  if(!['wifi','mobile','offline'].includes(s.network))throw Error('Invalid demo network');
  if(['downloading','waiting'].includes(s.phase))s.phase=s.network==='wifi'?'downloading':'waiting';
 }
 if(action.type==='tick'&&s.phase==='downloading'){
  s.percent=Math.min(100,s.percent+8);
  if(s.percent===100)s.phase='complete';
 }
 return s;
}
export function createVoiceDownloadStore({storage,schedule=setInterval,cancel=clearInterval,model='asr',events=globalThis}={}){
 const key=MODEL_DEMO_KEYS[model];if(!key)throw Error('Unknown model demo');
 let state={phase:'idle',percent:0,network:'wifi',persistent:!!storage},timer=null;
 const listeners=new Set();
 try{
  const raw=JSON.parse(storage?.getItem(key)||'null');
  if(raw&&phases.has(raw.phase)&&Number.isInteger(raw.percent)&&raw.percent>=0&&raw.percent<=100){
   state={...state,phase:['downloading','waiting'].includes(raw.phase)?'paused':raw.phase,percent:raw.percent};
   if(state.percent===100)state.phase='complete';
  }
 }catch{state={...state,persistent:false};}
 const emit=()=>{for(const fn of listeners)fn();};
 const persist=()=>{try{storage?.setItem(key,JSON.stringify({phase:state.phase,percent:state.percent}));}catch{state={...state,persistent:false};}};
 const send=action=>{
  state=voiceDownloadTransition(state,action);
  if(state.phase==='downloading'&&timer===null)timer=schedule(()=>send({type:'tick'}),850);
  if(state.phase!=='downloading'&&timer!==null){cancel(timer);timer=null;}
  persist();emit();
 };
 const sync=event=>{if(event.key!==key||event.storageArea&&event.storageArea!==storage)return;try{const raw=JSON.parse(event.newValue||'null');if(!raw||!phases.has(raw.phase)||!Number.isInteger(raw.percent)||raw.percent<0||raw.percent>100)return;if(timer!==null){cancel(timer);timer=null;}state={...state,phase:raw.phase,percent:raw.percent};emit();}catch{}};
 events?.addEventListener?.('storage',sync);
 return {get:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},send,dispose(){events?.removeEventListener?.('storage',sync);if(timer!==null)cancel(timer);timer=null;listeners.clear();}};
}
// One store and timer per model in this document. Views only unsubscribe themselves.
const sharedStores=new Map();
export function getSharedModelStore(model='asr'){
 if(!MODEL_DEMO_KEYS[model])throw Error('Unknown model demo');
 if(!sharedStores.has(model)){
  let storage;try{storage=globalThis.localStorage;}catch{}
  sharedStores.set(model,createVoiceDownloadStore({storage,model}));
 }
 return sharedStores.get(model);
}
export function LocalVoiceDownload({react:R,onManual}){
 const h=R.createElement,store=getSharedModelStore('asr'),state=R.useSyncExternalStore(store.subscribe,store.get,store.get),[open,setOpen]=R.useState(()=>state.phase!=='idle'),head=R.useRef(null),trigger=R.useRef(null);
 R.useEffect(()=>{if(open)head.current?.focus({preventScroll:true})},[open]);
 const button=(label,action,primary=false)=>h('button',{type:'button',className:primary?'cj-primary':undefined,onClick:action},label);
 const names={idle:t('先準備手機語音'),downloading:t('正在示範下載'),waiting:t('等待 Wi-Fi（示範）'),paused:t('已暫停（示範）'),complete:t('下載流程示範已完成')};
 return h('section',{className:'lv-panel','aria-label':t('手機語音辨識下載')},
  h('button',{type:'button',ref:trigger,onClick:()=>setOpen(v=>!v),'aria-expanded':open},aiFeatureName(h,state.phase==='idle'?t('語音轉文字'):t('查看語音準備狀態'),'phone')),
  h('a',{href:'/xbb-site/app/model-download/',className:'ai-full-page-link'},t('管理手機模式所需模型與 ASR →')),h('p',{className:'cj-muted'},t('免費 · 每段最多 30 秒 · 不用進階模式額度')),
  open&&h('div',{className:'lv-download'},
   h('span',{className:'lv-demo'},t('下載流程示範')),
   h('h3',{ref:head,tabIndex:-1},names[state.phase]),
   h('p',null,state.phase==='idle'?t('首次使用需先下載模型，規劃在手機將語音轉成文字，錄音留在手機。模型、實際下載大小、所需空間及支援機型尚待確認。'):t('進度可暫停並接續；這段時間照樣能手動記錄。')),
   h('p',{className:'lv-disclosure'},t('目前只示範流程，不會下載模型、開啟麥克風或辨識錄音。正式下載前會先確認網路條件並由你選擇；不下載仍可手動記錄，不會自動轉線上。')),
   state.phase!=='idle'&&h('div',null,h('progress',{max:100,value:state.percent,'aria-label':t('下載流程示範進度')}),h('p',{role:'status'},`${names[state.phase]} · ${state.percent}%`)),
   state.phase==='waiting'&&h('p',null,t('目前示範為行動網路或離線，進度保留；切回 Wi-Fi 後接續。')),
   state.phase==='complete'&&h('p',null,t('已走完下載流程示範，未安裝模型。辨識引擎尚未接通，可先輸入文字，免費保存為一般紀錄。')),
   !state.persistent&&h('p',{role:'alert'},t('瀏覽器無法保留示範進度；重新整理後可能需要重做。')),
   h('div',{className:'cj-actions'},
    state.phase==='idle'&&button(t('Wi-Fi 下載（示範）'),()=>store.send({type:'start'}),true),
    state.phase==='idle'&&button(t('稍後再說'),()=>{setOpen(false);trigger.current?.focus({preventScroll:true});}),
    ['downloading','waiting'].includes(state.phase)&&button(t('暫停下載示範'),()=>store.send({type:'pause'})),
    state.phase==='paused'&&button(t('從 {percent}% 接續（示範）', {percent: state.percent}),()=>store.send({type:'resume'}),true),
    button(t('先手動記錄'),onManual)),
   h('details',null,h('summary',null,t('測試下載情境')),h('label',{className:'cj-field'},t('示範網路（不偵測真實連線）'),h('select',{value:state.network,onChange:e=>store.send({type:'network',value:e.target.value})},h('option',{value:'wifi'},'Wi-Fi'),h('option',{value:'mobile'},t('行動網路')),h('option',{value:'offline'},t('離線')))),h('p',{className:'cj-muted'},t('可切換情境測試等待、暫停與續傳。重整頁面會暫停示範並保留進度。')),button(t('重設下載流程示範'),()=>store.send({type:'reset'})),h('p',{className:'cj-muted'},t('實際模型與支援裝置確認後，才會提供真正的下載。')))));
}
