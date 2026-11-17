import {useCloudStatus,getPrototypePlan} from './cloud-demo-v28.js?v=photo-simplify1';
import {nativeBillingHost,serverSubscriptionActive,useServerSubscription} from './store-billing.js?v=billing1';
import {t} from './i18n.js?v=audit1117b';
import {localProPreviewEnabled} from './dev-tools.js?v=1';

// Session-only prototype choice, never a server subscription or billing check.
export const SUMMARY_PLAN_EVENT='paw-summary-plan-request';
export const SUMMARY_OPEN_EVENT='paw-summary-open-request';
export function requestSummaryStudio(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(SUMMARY_OPEN_EVENT));}
// Free summaries cover the recent 7 or 14 days, not an arbitrary historic window.
export function summaryRangeAllowed({start,end,today},paid=false){
 if(paid)return true;
 const days=(Date.parse(end)-Date.parse(start))/86400000+1;
 return end===today&&[7,14].includes(days);
}
const serverPlanRequired=()=>nativeBillingHost()&&!localProPreviewEnabled();
export const hasSummaryPro=()=>serverPlanRequired()?serverSubscriptionActive():getPrototypePlan().paid===true;
export const useSummaryPro=R=>{const preview=useCloudStatus(R).paid===true,server=useServerSubscription(R);return serverPlanRequired()?server:preview;};
export const summaryDays=(value,paid=false)=>[7,14,...(paid?[30]:[])].includes(Number(value))?Number(value):14;
export function requestSummaryPlans(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(SUMMARY_PLAN_EVENT));}
export function SummaryProNotice({react:R,onPlans=requestSummaryPlans,title=t('進階看診整理')}){
 const h=R.createElement;
 return h('section',{className:'summary-pro-notice','aria-label':title+t(' Pro 方案說明')},
  h('span',{className:'pro-tag'},serverPlanRequired()?t('Pro 訂閱'):t('Pro · 手機上的預覽')),h('h3',null,title),
  h('p',null,t('近 30 天、自選期間、進階資料整合與事件前後比較列入 Pro。免費可用近 7／14 天基本看診摘要。')),
  h('p',null,t('全部原始紀錄與歷史仍可查看，原始資料匯出與本機備份不受限制；基本安全提醒保持免費。')),
  h('button',{type:'button',className:'secondary',onClick:onPlans},t('查看方案與 Pro 體驗')),
  h('small',null,serverPlanRequired()?t('訂閱需商店付款並經伺服器驗證；不會自動使用進階模式或上傳照護紀錄。'):t('目前只切換這支手機的預覽，尚未收費；不會自動使用進階模式、同步或上傳。')));
}
