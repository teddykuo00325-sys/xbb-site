import {t} from './i18n.js?v=audit1117b';
import {activePetEntries} from './pet-archive.js?v=8f5745b7843b';
// Navigation preferences stay on this device, independent of care records.
export const START_VIEW_KEY='inpaw.start-view.v1';
export function readStartView(storage){
 try{return (storage??globalThis.localStorage)?.getItem(START_VIEW_KEY)==='family'?'family':'last-cat'}catch{return 'last-cat'}
}
export function saveStartView(value,storage){
 if(!['family','last-cat'].includes(value))throw Error(t('請選擇開啟頁面。'));
 try{storage??=globalThis.localStorage;storage.setItem(START_VIEW_KEY,value);if(storage.getItem(START_VIEW_KEY)!==value)throw Error();}
 catch{throw Error(t('無法儲存偏好，請重試。照護資料不受影響。'));}
 return value;
}
export const initialFamilyView=(cats,preference)=>Array.isArray(cats)&&activePetEntries({cats}).length>1&&preference!=='last-cat';
export const validActiveCatId=multi=>activePetEntries(multi).some(cat=>cat.id===multi.activeId)?multi.activeId:activePetEntries(multi).find(cat=>cat.id==='cat-original')?.id||activePetEntries(multi)[0]?.id;
export function StartViewPreference({react:R}){
 const h=R.createElement,[value,setValue]=R.useState(()=>readStartView()),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
 const change=next=>{try{setValue(saveStartView(next));setError('');setNotice(t('已儲存，下次開啟時生效。'))}catch(e){setError(e.message);setNotice('')}};
 return h('section',{className:'ps-card family-start-setting'},h('h2',null,t('開啟時先看')),
  h('fieldset',null,h('legend',{className:'family-visually-hidden'},t('開啟時先看')),
   [['family',t('全家總覽'),t('兩隻以上先看全家；只有一隻時直接看今日。')],['last-cat',t('上次照顧的毛孩'),t('直接看上次那隻的今日。')]].map(([id,label,hint])=>h('label',{key:id,className:'family-start-option'},h('input',{type:'radio',name:'family-start-view',value:id,checked:value===id,onChange:()=>change(id)}),h('span',null,h('strong',null,label),h('small',null,hint))))),
  error&&h('p',{role:'alert',className:'family-error'},error),notice&&h('p',{role:'status',className:'ps-note'},notice));
}
