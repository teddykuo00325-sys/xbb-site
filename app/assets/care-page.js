// 「照護」分頁（Ian 2026-11-13：底部分頁改成 今日｜照護｜紀錄｜陪玩｜毛孩）。
// 集中疫苗、驅蟲、回診、吃藥與看診：完整照顧時間表、今天的藥、記下看診、看診紀錄（可改、可刪、可停藥）、看診摘要。
import {CareTimeline} from './care-timeline-ui.js?v=photo-simplify1';
import {VisitHistory} from './vet-visit-ui.js?v=photo-simplify1';
import {t} from './i18n.js?v=audit1117b';

export function CarePage({react: R, items, today, name, store, root, catId, onReminders, onSummary}) {
  const h = R.createElement;
  const button = (text, onClick, className = 'secondary-btn') => onClick && h('button', {type: 'button', className, onClick}, text);
  return h('div', {className: 'care-page', 'data-testid': 'care-page'},
    h('header', {className: 'care-page-head'},
      h('h1', null, name ? t('{name}的照護', {name}) : t('照護')),
      h('p', null, t('疫苗、驅蟲、回診、吃藥，到期前提醒你。日期照獸醫說的填。'))),
    h(CareTimeline, {react: R, items, today, name, store, root, catId, onReminders, limit: 50}),
    h('div', {className: 'care-page-actions'},
      button(t('整理看診摘要（看診前用）'), onSummary, 'primary')),
    h('a', {href: '/xbb-site/app/report-review/', className: 'care-report-link'}, h('strong', null, t('看懂報告')), h('span', null, t('拿到檢驗報告時，用範例看怎麼讀重點（示範）›'))),
    h(VisitHistory, {react: R, root, catId, today, name}));
}
