import {t} from './i18n.js?v=audit1117b';
// UI planning only. These labels do not enable models, billing, or entitlements.
// 2026-11-13 Ian 定案：免費每月 5 次、訂閱每月 100 次、月訂 NT$99、年訂 NT$990（正本在 cloud-quota.js）。
export const AI_POINTS_PLAN=Object.freeze({freeFirst:5,proMonthly:100,monthly:99,yearly:990});
export const PRO_TEST_PRICE=t('{monthly}／月、{yearly}／年',{monthly:'NT$'+AI_POINTS_PLAN.monthly,yearly:'NT$'+AI_POINTS_PLAN.yearly});
export function aiFeatureName(h,name,mode,{planned=true}={}){
 const label=mode==='phone'?t('手機模式'):(mode==='cloud'||mode==='online')?t('進階模式'):t('處理方式待確認');
 return h('span',{className:'ai-feature-name'},h('span',{className:'ai-feature-title'},name),h('span',{className:'ai-feature-badge '+(mode==='phone'?'is-phone':(mode==='cloud'||mode==='online')?'is-cloud':'is-pending')},label),planned&&h('span',{className:'ai-feature-planned'},t('規劃中')));
}
// Per-task point costs and the trusted credit contract are not confirmed yet.
// Never interpret the legacy quick/summary counters as spendable points.
export function plannedPointIntent(){return {remaining:null,cost:null,label:t('進階模式額度：尚未開放')};}
