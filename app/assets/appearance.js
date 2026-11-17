import {t} from './i18n.js?v=audit1117b';
// Appearance is a device preference, separate from care records and backups.
export const APPEARANCE_KEY='inpaw-appearance-v1';
export const APPEARANCE_EVENT='inpaw-appearance-change';
export const appearanceChoice=value=>['light','dark'].includes(value)?value:'system';
export const resolvedAppearance=(choice,dark)=>appearanceChoice(choice)==='system'?(dark?'dark':'light'):choice;
export function readAppearance(){try{return appearanceChoice(localStorage.getItem(APPEARANCE_KEY))}catch{return 'system'}}
export function applyAppearance(choice=readAppearance()){
 const value=appearanceChoice(choice),theme=resolvedAppearance(value,typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches);
 document.documentElement.dataset.theme=theme;
 document.documentElement.dataset.appearance=value;
 document.documentElement.style.colorScheme='only '+theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#211f1d':'#fbf7ef');
 return theme;
}
export function saveAppearance(choice){
 const value=appearanceChoice(choice);let saved=true;
 try{localStorage.setItem(APPEARANCE_KEY,value)}catch{saved=false}
 applyAppearance(value);window.dispatchEvent(new Event(APPEARANCE_EVENT));return saved;
}
export function AppearancePreference({react:R}){
 const h=R.createElement,[choice,setChoice]=R.useState(()=>typeof document!=='undefined'?appearanceChoice(document.documentElement.dataset.appearance):'system'),[notice,setNotice]=R.useState('');
 R.useEffect(()=>{const sync=()=>setChoice(appearanceChoice(document.documentElement.dataset.appearance));window.addEventListener(APPEARANCE_EVENT,sync);return()=>window.removeEventListener(APPEARANCE_EVENT,sync)},[]);
 const options=[['system',t('跟隨系統'),t('隨裝置外觀切換')],['light',t('淺色'),t('溫暖明亮')],['dark',t('深色'),t('柔和深灰')]];
 return h('section',{className:'ps-card appearance-card','aria-labelledby':'appearance-heading'},h('h2',{id:'appearance-heading'},t('外觀')),h('p',{className:'ps-note',id:'appearance-help'},t('預設跟隨系統。')),h('fieldset',{className:'appearance-options','aria-describedby':'appearance-help'},h('legend',{className:'appearance-legend'},t('選擇外觀')),options.map(([value,label,detail])=>h('label',{key:value,className:'appearance-option'},h('input',{type:'radio',name:'inpaw-appearance',value,checked:choice===value,onChange:()=>{const saved=saveAppearance(value);setChoice(value);setNotice(saved?t('已套用{label}，並保存選擇。',{label}):t('已套用{label}；這台裝置無法保存偏好，重新整理後將跟隨系統。',{label}))}}),h('span',null,h('strong',null,label),h('small',null,detail))))),h('p',{className:'appearance-notice',role:'status','aria-live':'polite'},notice));
}
