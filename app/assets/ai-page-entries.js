import {t} from './i18n.js?v=audit1117b';
// Same-origin demonstration destinations. No care-data reads or writes.
export function AIPageEntries({react:R,compact=false}){
 const h=R.createElement;
 return h('section',{className:'ai-pages-entry'+(compact?' is-compact':''),'aria-label':t('AI 功能互動頁面')},h('div',{className:'ai-pages-heading'},h('h2',null,t('AI 小幫手')),h('span',null,t('互動示範'))),
 h('div',{className:'ai-pages-grid'},[
 ['cloud',t('看懂報告'),t('進階模式'),t('免下載模型，先用範例看重點。'),'/xbb-site/app/report-review/','▤'],
 ['phone',t('手機模式所需模型'),t('選配手機模式'),t('非必要下載；目前只體驗下載流程。'),'/xbb-site/app/model-download/','↓']
 ].map(([mode,title,label,detail,url,icon])=>h('a',{key:mode,href:url,className:'ai-page-link is-'+mode},h('span',{className:'ai-page-icon','aria-hidden':true},icon),h('span',{className:'ai-page-copy'},h('span',{className:'ai-page-label'},label),h('strong',null,title),!compact&&h('small',null,detail)),h('span',{className:'ai-page-arrow','aria-hidden':true},'›')))),h('p',{className:'ai-pages-disclaimer'},t('進階模式功能不需下載模型。這裡只看流程，不會下載模型、上傳報告或用額度。')));
}

export function ReportReviewEntry({react:R,compact=false}){
 const h=R.createElement;
 if(compact)return h('a',{href:'/xbb-site/app/report-review/',className:'record-tool-row'},...reportToolContent(h,t('看懂範例報告'),t('免下載模型，用內建範例核對重點與原文。'),t('示範')));
 return h('a',{href:'/xbb-site/app/report-review/',className:'ai-report-entry','aria-label':t('看懂報告，進階模式示範')},h('span',{className:'ai-report-icon','aria-hidden':true},'▤'),h('span',{className:'ai-page-copy'},h('span',{className:'ai-page-label'},t('進階模式 · 示範')),h('strong',null,t('看懂報告')),h('small',null,t('免下載模型，用範例核對原文與提問。'))),h('span',{'aria-hidden':true},'›'));
}

// Presentation only: reuse the existing destinations and caller-owned navigation.
function reportToolContent(h,title,detail,badge){
 return [h('span',{className:'record-tool-copy'},h('span',{className:'record-tool-heading'},h('strong',null,title),badge&&h('small',{className:'record-tool-badge'},badge)),h('span',{className:'record-tool-detail'},detail)),h('span',{className:'record-tool-arrow','aria-hidden':true},'›')];
}
export function RecordReportTools({react:R,onSummary,onExport}){
 const h=R.createElement;
 return h('div',{className:'home-detail-tools','aria-label':t('紀錄統計與匯出')},
  h(ReportReviewEntry,{react:R,compact:true}),
  h('button',{type:'button',className:'record-tool-row',onClick:onExport},...reportToolContent(h,t('備份全部毛孩'),t('備份檔含封存的毛孩、照片和未完成的紀錄。'))));
}
