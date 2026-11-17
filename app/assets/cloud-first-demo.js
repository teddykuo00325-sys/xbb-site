import {t} from './i18n.js?v=audit1117b';
import {requestSummaryStudio} from './summary-access.js?v=photo-simplify1';
// Fixed synthetic sources only. No network, accounts, real quota or care-store writes.
export const SUMMARY_SAMPLE=Object.freeze([
 Object.freeze({id:'sample-meal-1',text:t('11/1 08:00 · 小花：提供 30 g，確認吃下 25 g。')}),
 Object.freeze({id:'sample-meal-2',text:t('11/2 08:30 · 小花：提供 30 g，吃下量未記錄。')}),
 Object.freeze({id:'sample-stool-1',text:t('11/2 19:00 · 小花：記錄一次軟便。')})
]);
export function buildSummarySample(ids){
 const rows=SUMMARY_SAMPLE.filter(row=>ids.includes(row.id));
 if(!rows.length)throw Error(t('請至少選擇一筆範例來源。'));
 return t('小花的看診摘要（固定規則示範，非 AI）')+'\n'+rows.map((row,i)=>`${i+1}. ${row.text} [${row.id}]`).join('\n')+'\n'+t('提醒：未記錄不等於沒有發生；提供量不等於吃下量。不診斷、不推論因果，若有急症請立即聯絡獸醫。')+'\n'+t('想問獸醫：還需要補記哪些觀察？');
}
// Legacy entry compatibility: there is only one live summary workflow.
// Keep the immutable sample builder for old integrations, never write or migrate care data.
export function CloudFirstSummaryDemo({react:R,onSummary=requestSummaryStudio}){
 const h=R.createElement;
 return h('section',{className:'cloud-summary-demo','aria-label':t('看診摘要入口')},
  h('h3',null,t('看診摘要')),
  h('p',null,t('先查看紀錄，再用進階模式整理看診重點與近期變化（使用 1 次進階模式額度）。也能直接核對並儲存紀錄，免費、不上傳。')),
  h('button',{type:'button',className:'ps-button secondary',onClick:onSummary},t('開啟看診摘要')));
}
