import {t} from './i18n.js?v=audit1117b';
import {CloudFirstSummaryDemo} from './cloud-first-demo.js?v=photo-simplify1';
import {aiFeatureName} from './ai-presentation.js?v=ai-names1';
import {requestProPreview} from './pro-experience-v46.js?v=photo-simplify1';
import {nativeBillingHost,serverSubscriptionActive} from './store-billing.js?v=billing1';
import {localProPreviewEnabled} from './dev-tools.js?v=1';
// Product proposals only. This module has no network, account, billing, or care-data access.
let nextSettingsTab='general';
// Keep the old route name compatible; it now opens planning, never generation.
export function requestCloudDemo(){nextSettingsTab='cloud'}
export function requestProPlans(feature){nextSettingsTab='plans';requestProPreview(feature)}
export function takeSettingsTab(){const tab=nextSettingsTab;nextSettingsTab='general';return tab}
export function ProBadge({react:R}){const h=R.createElement;return h('span',{className:'ps-pro-badge','aria-label':t('Pro 限定功能提案')},h('svg',{viewBox:'0 0 24 24',fill:'currentColor','aria-hidden':true},h('ellipse',{cx:5,cy:8,rx:2.3,ry:3}),h('ellipse',{cx:10,cy:5,rx:2.2,ry:3}),h('ellipse',{cx:16,cy:5,rx:2.2,ry:3}),h('ellipse',{cx:20,cy:10,rx:2.2,ry:3}),h('path',{d:'M6 17c0-3 3-7 6-7s7 4 7 7c0 3-3 4-6 3-4 2-7 0-7-3Z'})),h('span',null,'Pro'))}
export function ProFeatureButton({react:R,title,description,onPlans}){
 const h=R.createElement,ref=R.useRef(null),trigger=R.useRef(null);
 const close=()=>{ref.current?.close();trigger.current?.focus()};
 return h(R.Fragment,null,h('button',{type:'button',className:'ps-feature-button',ref:trigger,onClick:()=>ref.current?.showModal()},h('span',null,title),h(ProBadge,{react:R})),h('dialog',{ref,className:'ps-dialog','aria-label':t('{title}方案說明',{title}),onCancel:e=>{e.preventDefault();close()}},h('h2',null,title,' ',h(ProBadge,{react:R})),h('p',null,description),h('p',{className:'ps-note'},t('付款尚未開放；進階模式的可用狀態與額度請見「方案」。切換預覽不會收費。')),onPlans&&h('button',{className:'ps-button',type:'button',onClick:()=>{close();onPlans()}},t('查看方案')),h('button',{className:'ps-button secondary',type:'button',onClick:close},t('我知道了'))));
}
// Retain the session snapshot shape for existing settings/backup consumers.
// There is no cloud entitlement, report generation or quota mutation in this version.
const fresh=()=>({availability:'planned',monthly:0,addon:0,report:null,serial:0,paid:false,activated:false,renew:true});
let demo=fresh();
const listeners=new Set();
const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener)};
const getSnapshot=()=>demo;
export const getPrototypePlan=()=>({paid:nativeBillingHost()&&!localProPreviewEnabled()?serverSubscriptionActive():demo.paid===true});
const change=fn=>{demo=fn(demo);listeners.forEach(listener=>listener())};
export function syncCloudEntitlement({plan,activated,renew}){const paid=plan==='paid';if(demo.paid!==paid||demo.activated!==activated||demo.renew!==renew)change(d=>({...d,paid,activated,renew}))}
export function useCloudStatus(R){return R.useSyncExternalStore(subscribe,getSnapshot,getSnapshot)}
export function CloudReportEntry({react:R,onCloud}){
 const h=R.createElement;
 return h('section',{className:'summary-cloud-entry','aria-label':t('看診摘要入口')},
  h(CloudFirstSummaryDemo,{react:R}),
  onCloud&&h('button',{type:'button',className:'text-btn av-cloud-link',onClick:onCloud},t('查看進階模式說明')));
}
export function PlanUsageShortcut({react:R,onOpen}){
 const h=R.createElement;
 return h('button',{type:'button',className:'ps-plan-usage',onClick:onOpen},h('span',null,h('strong',null,t('方案與功能')),h('span',{className:'ps-usage-status'},t('看診摘要預設進階模式，送出前先確認')),h('small',null,t('付款尚未開放；手動核對與儲存仍可使用'))),h('span',{'aria-hidden':true,className:'ps-usage-arrow'},'›'));
}
export function CloudDemo({react:R,onSummary}){
 const h=R.createElement;
 return h('div',{className:'ps-cloud'},
  h('section',{className:'ps-card'},h('div',{className:'ps-card-head'},h('h2',null,aiFeatureName(h,t('看診摘要'),'cloud',{planned:false})),h('span',{className:'ps-badge'},t('原型可體驗'))),h('p',null,t('看診摘要預設使用進階模式：選毛孩與期間、核對來源，同意後再送出整理。也能不使用 AI，直接核對與儲存，免費、不上傳。')),h('p',{className:'ps-note'},t('進階模式整理要你按下並同意，才會送出所選紀錄的文字，會用 1 次額度。切換 Pro 展示不會收費。'))),
  h('section',{className:'ps-card'},h('h3',null,t('現在可用：看診整理')),h('p',null,t('基本摘要與匯出保留免費。進階看診資料包可依自選期間整理實際紀錄、查看來源與事件前後對照，下載到你的裝置。')),h('p',{className:'ps-note'},t('直接核對與儲存不使用 AI，不需要額度。Pro 目前未收費。')),onSummary&&h('button',{type:'button',className:'ps-button',onClick:onSummary},t('開啟看診摘要'))),
  h('details',{className:'ps-rules'},h('summary',null,t('進階模式整理怎麼用？')),h('ol',null,h('li',null,t('先在這台裝置選擇看診期間與資料，確認要整理的文字。')),h('li',null,t('查看用途與將上傳的內容，每次同意後才傳到毛孩小本本的 AI 伺服器。')),h('li',null,t('將 AI 整理文字與原始來源核對，再決定是否保留或匯出。'))),h('ul',null,h('li',null,t('不以 AI 提供診斷、判斷改善或推論原因。')),h('li',null,t('方案說明請見「方案」；進階模式不用登入，每次用 1 次額度，目前不能購買額度。')),h('li',null,t('每次送出前會告知接收服務、用途與選取內容，取得你的同意，不會自動上傳。'))),h('p',{className:'ps-note'},t('原有紀錄、免費摘要與看診資料包不受影響。'))));
}

export function getCloudDemoSnapshot(){return structuredClone(demo)}
