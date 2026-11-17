import {t} from './i18n.js?v=audit1117b';
// Demo preference only. Never invokes inference, downloads or transmission.
export const AI_MODE_KEY158='pet-ai-mode-preference158';
export const AI_MODE_EVENT158='pet-ai-mode-preference158-change';
let sessionMode='cloud',unsavedMode=null;
const valid=value=>value==='phone'||value==='cloud';
const browser=()=>typeof window==='undefined'?null:window;
const storage=()=>{try{return browser()?.localStorage;}catch{return null;}};
export function readAIMode158(store=storage()){
 if(unsavedMode)return unsavedMode;
 try{const mode=store?.getItem(AI_MODE_KEY158);return valid(mode)?mode:sessionMode;}catch{return sessionMode;}
}
export function writeAIMode158(mode,store=storage()){
 if(!valid(mode))throw new TypeError('Unknown AI preference');
 sessionMode=mode;let persistent=false;
 try{if(store){store.setItem(AI_MODE_KEY158,mode);persistent=true;}}catch{}
 unsavedMode=persistent?null:mode;
 browser()?.dispatchEvent(new CustomEvent(AI_MODE_EVENT158,{detail:{mode}}));
 return {mode,persistent};
}
export function aiModeStatus158(mode,{cloudOnly=false,phoneStatus='unknown'}={}){
 if(cloudOnly)return t('看懂報告使用進階模式：需連網、免下載辨識模型，可用狀態以本頁為準。只有你選擇資料並同意才送出，每次使用 1 次額度；內建範例不傳送、不用額度。');
 if(mode==='phone')return (phoneStatus==='unsupported'?t('手機模式：此裝置不支援。'):phoneStatus==='unknown'?t('手機模式：請先確認裝置支援並下載模型。'):t('手機模式：請先在「AI 與下載」確認模型已準備好。'))+t('在這支手機處理，不用額度；不會自動改用進階模式。也能手動記錄、預覽、核對和直接儲存。');
 return t('進階模式（預設）：需連網、免下載整理或辨識模型，將本次選定資料送到毛孩小本本的 AI 伺服器，每次用 1 次額度；按下並同意才會送出。不用 AI 也能手動記錄、預覽、核對和直接儲存。');
}
function subscribe(listener){const w=browser();if(!w)return()=>{};const storageChanged=e=>{if(e.key===AI_MODE_KEY158||e.key===null)listener();};w.addEventListener(AI_MODE_EVENT158,listener);w.addEventListener('storage',storageChanged);return()=>{w.removeEventListener(AI_MODE_EVENT158,listener);w.removeEventListener('storage',storageChanged);};}
export function AIModeChoice158({react:R,onChange,cloudOnly=false,phoneStatus='unknown'}){
 const h=R.createElement,[mode,setMode]=R.useState(readAIMode158),[notice,setNotice]=R.useState('');
 R.useEffect(()=>cloudOnly?undefined:subscribe(()=>{const next=readAIMode158();setMode(next);onChange?.(next);}),[onChange,cloudOnly]);
 if(cloudOnly)return h('section',{className:'ai-mode158','aria-label':t('報告進階模式狀態')},h('strong',null,t('進階模式專用')),h('p',{className:'ai-mode158-status',role:'status'},aiModeStatus158('cloud',{cloudOnly:true})),h('p',null,t('送出前會列明本次報告、接收服務與額度，另行取得同意。開啟本頁不代表授權上傳。')));
 const choose=next=>{const result=writeAIMode158(next);setMode(next);setNotice(result.persistent?'':t('偏好只保留在本次使用，瀏覽器未允許保存。'));};
 return h('section',{className:'ai-mode158','aria-label':t('AI 使用偏好')},h('div',{className:'ai-mode158-title'},h('strong',null,t('AI 模式')),h('small',null,t('使用偏好'))),
 h('div',{className:'ai-mode158-options',role:'group','aria-label':t('選擇進階模式或手機模式')},[['cloud',t('進階模式（預設）')],['phone',t('手機模式（選配）')]].map(([value,label])=>h('button',{key:value,type:'button','aria-pressed':mode===value,onClick:()=>choose(value)},label))),
 h('p',{className:'ai-mode158-status',role:'status'},aiModeStatus158(mode,{cloudOnly,phoneStatus})),
 h('details',null,h('summary',null,t('選擇不代表啟用或上傳')),h('p',null,t('選擇只保存於此瀏覽器，不下載模型、不傳送資料，也不授權日後上傳。進階模式功能每次送出前都會先問你。'))),
 notice&&h('p',{role:'status'},notice));
}
// The report tool is intentionally framework-free inside its own ShadowRoot.
export function mountAIModeChoice158(target,{cloudOnly=false,phoneStatus='unknown'}={}){
 if(cloudOnly){target.innerHTML=`<section class="ai-mode158" aria-label="${t('報告進階模式狀態')}"><div class="ai-mode158-title"><strong>${t('進階模式專用')}</strong><small>${t('依本頁可用狀態')}</small></div><p class="ai-mode158-status" role="status"></p><p>${t('送出前會列明本次報告、接收服務與額度，另行取得同意。開啟本頁不代表授權上傳。')}</p></section>`;target.querySelector('.ai-mode158-status').textContent=aiModeStatus158('cloud',{cloudOnly:true});return()=>target.replaceChildren();}
 target.innerHTML=`<section class="ai-mode158" aria-label="${t('AI 使用偏好')}"><div class="ai-mode158-title"><strong>${t('AI 模式')}</strong><small>${t('使用偏好')}</small></div><div class="ai-mode158-options" role="group" aria-label="${t('選擇進階模式或手機模式')}"><button type="button" data-ai-mode="cloud">${t('進階模式（預設）')}</button><button type="button" data-ai-mode="phone">${t('手機模式（選配）')}</button></div><p class="ai-mode158-status" role="status"></p><details><summary>${t('選擇不代表啟用或上傳')}</summary><p>${t('選擇只保存於此瀏覽器，不下載模型、不傳送資料，也不授權日後上傳。進階模式功能每次送出前都會先問你。')}</p></details><p class="ai-mode158-save" role="status"></p></section>`;
 const render=()=>{const mode=readAIMode158();target.querySelectorAll('[data-ai-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.aiMode===mode)));target.querySelector('.ai-mode158-status').textContent=aiModeStatus158(mode,{cloudOnly,phoneStatus});};
 target.querySelectorAll('[data-ai-mode]').forEach(button=>button.onclick=()=>{const result=writeAIMode158(button.dataset.aiMode);target.querySelector('.ai-mode158-save').textContent=result.persistent?'':t('偏好只保留在本次使用，瀏覽器未允許保存。');render();});
 const unsubscribe=subscribe(render);render();return()=>{unsubscribe();target.replaceChildren();};
}
