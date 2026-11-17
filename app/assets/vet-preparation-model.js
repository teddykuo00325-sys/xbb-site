import {requireActivePet} from './pet-archive.js?v=8f5745b7843b';
import {t} from './i18n.js?v=audit1117b';

// 每隻毛孩最近一次回診準備，僅存在本機；由飼主選擇，不推定已完成醫療照護。
export const PREP_ITEMS=Object.freeze([
 {id:'appointment',text:t('確認回診日期、時間與醫院交代的準備事項')},
 {id:'records',text:t('整理近期食慾、喝水、排泄與體重紀錄')},
 {id:'meds',text:t('備妥目前藥袋、用藥時間與保健品清單')},
 {id:'reports',text:t('備妥先前檢驗報告及相關照片或影片')},
 {id:'carrier',text:t('準備安全提籠與熟悉的墊巾')},
 {id:'questions',text:t('列出這次最想問的問題')}
].map(Object.freeze));
export const VET_QUESTIONS=Object.freeze([
 {id:'changes',text:t('這些變化中，哪些需要持續觀察或記錄？')},
 {id:'tests',text:t('這次檢查的目的、結果與下一步是什麼？')},
 {id:'meds',text:t('目前藥物怎麼使用？漏吃或出現不適時怎麼處理？')},
 {id:'food',text:t('飲食與喝水需要調整嗎？要怎麼記錄？')},
 {id:'warning',text:t('哪些變化需要提前聯絡醫院或立即就醫？')},
 {id:'followup',text:t('下次何時回診？需要先準備哪些資料？')}
].map(Object.freeze));
export const PREP_NOTE=t('這是一般回診準備與提問清單，請以醫院的個別指示為準；不要自行停藥或禁食。');
export const blankPreparation=()=>({checked:[],questions:[],note:''});
const fail=message=>{throw Error(message)};
function checkedList(value,items,label){
 if(!Array.isArray(value)||value.length>items.length||new Set(value).size!==value.length||value.some(id=>!items.some(item=>item.id===id)))fail(label+t('格式不符，請重新開啟清單。'));
 return [...value];
}
export function validatePreparation(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['checked','questions','note'].includes(key)))fail(t('回診準備格式不符。'));
 const checked=checkedList(value.checked,PREP_ITEMS,t('準備事項')),questions=checkedList(value.questions,VET_QUESTIONS,t('提問清單'));
 if(typeof value.note!=='string'||value.note.length>2000)fail(t('自填問題請保持在 2000 字以內。'));
 return {checked,questions,note:value.note};
}
function profileOf(root,catId){
 if(catId==='cat-original')return root?.cat;
 return root?.multiCat?.cats?.find(cat=>cat.id===catId)?.data?.cat;
}
export function getPreparation(root,catId){
 const profile=profileOf(root,catId);
 return profile?.vetPreparation?validatePreparation(profile.vetPreparation):blankPreparation();
}
export function savePreparation(root,catId,value){
 requireActivePet(root,catId);
 const preparation=validatePreparation(value),profile=profileOf(root,catId);
 if(!profile)fail(t('找不到這隻毛孩，未更動資料。'));
 if(catId==='cat-original')return {...root,cat:{...root.cat,vetPreparation:preparation}};
 return {...root,multiCat:{...root.multiCat,cats:root.multiCat.cats.map(cat=>cat.id===catId?{...cat,data:{...cat.data,cat:{...cat.data.cat,vetPreparation:preparation}}}:cat)}};
}
export function preparationLines(value){
 const data=validatePreparation(value),lines=[];
 for(const item of PREP_ITEMS)if(data.checked.includes(item.id))lines.push(t('飼主已勾選準備：')+item.text);
 for(const item of VET_QUESTIONS)if(data.questions.includes(item.id))lines.push(t('想問獸醫：')+item.text);
 if(data.note.trim())lines.push(t('自填問題：')+data.note.trim());
 return lines;
}
