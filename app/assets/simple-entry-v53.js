import {t, K} from './i18n.js?v=audit1117b';
import {recordIconProps,recordIconKey} from './record-icons.js?v=8f5745b7843b';
export const ENTRY_KINDS=[['food',t('餵食')],[K('喝水'),t('喝水')],[K('排泄'),t('排泄')],[K('體重'),t('體重')],['care',t('疫苗／驅蟲')],['other',t('其他')]];
export function entryKind(category){return ['food',K('喝水'),K('排泄'),K('體重'),'care'].includes(category)?category:'other'}
export function selectEntryKind(record,kind,cache={}){
 const category=kind==='other'?K('其他'):kind;
 if(cache.recordId!==record.id){cache.recordId=record.id;cache.values={}}
 cache.values ||= {};
 const fields={category:record.category,amount:record.amount,unit:record.unit,metric:record.metric,waterAction:record.waterAction,stoolStatus:record.stoolStatus,stoolEvent:record.stoolEvent,eliminationKind:record.eliminationKind,urineStatus:record.urineStatus,vomitEvent:record.vomitEvent,appetiteStatus:record.appetiteStatus,moodStatus:record.moodStatus};
 cache.values[record.category]=fields;
 if(entryKind(record.category)==='other')cache.values.other=fields;
 const target=cache.values[kind]||{category,amount:'',unit:category===K('體重')?K('公斤'):category===K('嘔吐')?K('次'):'',metric:category===K('其他')?'other':undefined,waterAction:undefined,stoolStatus:undefined,stoolEvent:undefined,eliminationKind:undefined,urineStatus:undefined,vomitEvent:undefined,appetiteStatus:undefined,moodStatus:undefined};
 return {...record,...target};
}
export function EntryTabs({react:R,category,onSelect,disabled=false}){
 const h=R.createElement,selected=entryKind(category);
 return h('div',{className:'entry-kind-tabs',role:'group','aria-label':t('紀錄類型')},ENTRY_KINDS.map(([id,label])=>h('button',{key:id,type:'button','data-record-kind':recordIconKey(id),'aria-pressed':selected===id,disabled,onClick:()=>{if(id!==selected)onSelect(id)}},h('img',recordIconProps(id,20)),h('span',null,label))));
}
export function OtherObservationPicker({react:R,record,onChange}){
 if(entryKind(record.category)!=='other')return null;
 const h=R.createElement,value=record.category===K('其他')?(record.metric==='mood'?'mood':'other'):record.category;
 return h('fieldset',{className:'other-observation-picker'},h('legend',null,t('觀察項目')),h('style',null,`.other-observation-picker{border:0;padding:0;margin:0 0 12px;display:flex;gap:8px;flex-wrap:wrap;min-width:0}.other-observation-picker legend{margin-bottom:6px}.other-observation-picker button{min-height:44px;padding:8px 12px;border:1px solid var(--paw-rim,#b5beb7);border-radius:12px;background:var(--paw-canvas,#fff);color:inherit;font:inherit;white-space:normal}.other-observation-picker button[aria-pressed=true]{border:2px solid #699377;font-weight:700}`),[['other',t('其他觀察')],[K('嘔吐'),t('嘔吐')],[K('飲食'),t('食慾觀察')],['mood',t('精神狀態')],[K('聲音反應'),t('聲音探索')]].map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':value===id,onClick:()=>{if(value===id)return;const v=id;onChange({...record,category:['other','mood'].includes(v)?K('其他'):v,metric:v==='mood'?'mood':v==='other'?'other':undefined,amount:'',unit:v===K('嘔吐')?K('次'):'',vomitEvent:undefined,appetiteStatus:undefined,moodStatus:undefined})}},label)));
}
export function EntryControls({react:R,category,onSelect,onVoice,disabled=false}){
 const h=R.createElement;
 return h('div',{className:'entry-controls'},
  h(EntryTabs,{react:R,category,onSelect,disabled}),
  h('button',{type:'button',disabled,onClick:onVoice,className:'text-btn entry-voice-shortcut'},
   h('img',{src:'/xbb-site/app/assets/icons/microphone.svg',width:18,height:18,alt:''}),t('語音快記')));
}
