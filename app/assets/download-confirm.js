import {t} from './i18n.js?v=audit1117b';
// Big model downloads never start on a single tap: the owner confirms size, data use and battery first.
// Pure helpers plus one small React piece; no network, no native calls.

// 'cellular' is reported by Android WebView; iOS WebKit does not expose it, so the note stays generic there.
export function networkNote(w=globalThis){
 const type=w.navigator?.connection?.type;
 if(type==='cellular')return t('目前是行動網路，下載會用到流量。');
 if(type==='wifi'||type==='ethernet')return '';
 return t('建議連上 Wi-Fi 再下載。');
}

export function DownloadConfirm({R,title,size,onConfirm,onCancel,disabled=false}){
 const h=R.createElement,note=networkNote();
 return h('section',{className:'dl-confirm',role:'alertdialog','aria-label':t('確認下載')},
  h('strong',null,t('要下載「{title}」嗎？',{title})),
  h('p',null,t('大小{size}，下載和使用都會比較耗電。',{size})+note),
  h('p',{className:'dl-tiny'},t('不下載也可以正常記錄。下載中可以離開，之後再回來看進度。')),
  h('div',{className:'dl-actions'},
   h('button',{type:'button',className:'cj-primary',onClick:onConfirm,disabled},t('開始下載')),
   h('button',{type:'button',onClick:onCancel},t('先不要'))));
}
