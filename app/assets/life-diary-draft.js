import {t} from './i18n.js?v=audit1117b';
const PREFIX='inpaw.diary.share.v1:';
const restored=new WeakMap();
export function prepareDiaryDraftScope(root,generation){if(generation&&restored.get(root)!==generation){clearDiaryShareDrafts();restored.set(root,generation);}}
const identity=entry=>JSON.stringify([entry?.catId,entry?.id,entry?.createdAt,entry?.editedAt,entry?.caption]);
const key=entry=>PREFIX+encodeURIComponent(entry?.catId||'')+':'+encodeURIComponent(entry?.id||'');
export function readDiaryShareDraft(entry){try{const v=JSON.parse(localStorage.getItem(key(entry))||'null');return v?.source===identity(entry)&&typeof v.caption==='string'&&v.caption.length<=280&&typeof v.draft==='string'&&v.draft.length<=280?v:null;}catch{return null;}}
export function saveDiaryShareDraft(entry,value){if(!entry?.id)return;try{const v={source:identity(entry),caption:String(value.caption||''),draft:String(value.draft||'')};if(v.caption.length>280||v.draft.length>280)throw Error();localStorage.setItem(key(entry),JSON.stringify(v));}catch{throw Error(t('分享草稿尚未保存，請保留此畫面並重試。'));}}
export function clearDiaryShareDrafts(){try{for(const k of Object.keys(localStorage))if(k.startsWith(PREFIX))localStorage.removeItem(k);}catch{}}
export function removeDiaryShareDraft(entry){try{localStorage.removeItem(key(entry));}catch{}}
