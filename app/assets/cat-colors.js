import {t} from './i18n.js?v=audit1117b';
// Identity colors are independent from status/warning semantics. All ink/pale
// pairs meet WCAG AA for text; names and selection marks also convey identity.
export const CAT_COLORS = Object.freeze([
  // Retain stored IDs so existing profiles and backups remain valid.
  {id:'orange',label:t('橘貓橘'),coat:'#D99550',ink:'#403833',pale:'#FFF3E6'},
  {id:'blue',label:t('藍灰'),coat:'#7E8D9B',ink:'#403833',pale:'#F0F3F5'},
  {id:'purple',label:t('巧克力棕'),coat:'#705044',ink:'#403833',pale:'#F5EEEA'},
  {id:'teal',label:t('銀灰'),coat:'#BCC1C4',ink:'#403833',pale:'#F3F4F4'},
  {id:'rose',label:t('焦糖棕'),coat:'#AE784B',ink:'#403833',pale:'#F8F0E6'},
  {id:'slate',label:t('煤炭黑'),coat:'#3E3D3B',ink:'#403833',pale:'#F0EFED'},
  {id:'cream',label:t('奶油白'),coat:'#F1E7D5',ink:'#403833',pale:'#FFFCF6'},
  {id:'beige',label:t('奶茶米'),coat:'#CFB592',ink:'#403833',pale:'#FAF5EC'}
].map(Object.freeze));
export const validCatColor = profile => profile.colorId === undefined || CAT_COLORS.some(c=>c.id===profile.colorId);
export function catColor(profile={}, index=0) {
  return CAT_COLORS.find(c=>c.id===profile.colorId) || CAT_COLORS[Math.max(0,index)%CAT_COLORS.length];
}
export function withCatColor(profile,index=0) {
  return profile.colorId === undefined ? {...profile,colorId:catColor(profile,index).id} : profile;
}
export function CatColorPicker({react:R,profile,onChange,index=0}) {
  const h=R.createElement,selected=catColor(profile,index);
  // Display order is separate from the historical default/identity order.
  const choices=['cream','beige','teal','orange','blue','rose','purple','slate'].map(id=>CAT_COLORS.find(c=>c.id===id));
  return h('fieldset',{className:'mc-color-picker'},h('legend',null,t('毛孩代表色')),h('p',{className:'mc-note'},t('選一個像牠毛色的顏色，用在色點與頭像外框；名字維持深色。')),
    h('div',{className:'mc-color-options'},choices.map(color=>h('button',{key:color.id,type:'button','aria-label':t('代表色：{label}',{label:color.label}),'aria-pressed':selected.id===color.id,className:'mc-color-option',style:{color:color.ink,backgroundColor:color.pale,borderColor:selected.id===color.id?color.coat:undefined},onClick:()=>onChange({...profile,colorId:color.id})},h('span',{className:'mc-color-dot','aria-hidden':true,style:{backgroundColor:color.coat}}),color.label,selected.id===color.id&&h('span',{'aria-hidden':true},' ✓')))));
}
export function CatOwnershipBanner({react:R,name,color}) {
  const h=R.createElement,c=color||CAT_COLORS[0];
  return h('div',{className:'mc-record-owner',style:{color:c.ink,backgroundColor:c.pale,borderColor:c.coat},'aria-label':t('記錄給：{name}',{name})},h('span',{className:'mc-color-dot','aria-hidden':true,style:{backgroundColor:c.coat}}),t('記錄給：{name}',{name}));
}
