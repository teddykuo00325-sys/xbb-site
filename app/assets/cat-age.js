import {t, K, longDate} from './i18n.js?v=audit1117b';
// 2026-11-14：生日（可估）取代固定年齡。有生日就依今天計算年齡（會長大）；
// 舊資料只有登記年齡（age／ageMonths）照常顯示，不自動換算、不推算生日。
// 「不知道生日」時填大概年齡，會換算成「估計生日」，之後一樣會隨時間增加。
export const CAT_AGE_ERROR=t('生日或年齡格式不對：生日請選今天以前的日期；大概年齡的歲請填 0–40、月填 0–11。都不確定可以留白。');
export const SPECIES=Object.freeze([K('貓'),K('狗'),K('其他'),K('未填')]);
export const NEUTERED=Object.freeze([K('已結紮'),K('未結紮'),K('未填')]);
export const BIRTH_MIN='1980-01-01';
const pad=n=>String(n).padStart(2,'0');
export function localToday(now=new Date()){return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;}
export const validBirthDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value&&value>=BIRTH_MIN;
const legacyAgeValid=profile=>{
 if(typeof profile.age!=='string'||!/^\d{0,2}$/.test(profile.age))return false;
 const months=profile.ageMonths;
 return months===undefined||months===''||typeof months==='string'&&/^\d{1,2}$/.test(months)&&Number(months)<=11&&profile.age!=='';
};
// 只檢查格式（不看裝置時鐘）：裝置時間被調過，也不會讓已存的資料變成無法讀取。
export function validCatAge(profile){
 if(!profile||!legacyAgeValid(profile))return false;
 if(profile.birthDate!==undefined&&profile.birthDate!==''&&!validBirthDate(profile.birthDate))return false;
 if(profile.birthEstimated!==undefined&&typeof profile.birthEstimated!=='boolean')return false;
 return true;
}
/** 生日到今天的歲、月（生日晚於今天回傳 null）。 */
export function ageFromBirth(birthDate,today=localToday()){
 if(!validBirthDate(birthDate)||!/^\d{4}-\d{2}-\d{2}$/.test(today)||birthDate>today)return null;
 const [by,bm,bd]=birthDate.split('-').map(Number),[ty,tm,td]=today.split('-').map(Number);
 let months=(ty-by)*12+(tm-bm);if(td<bd)months--;
 if(months<0)return null;
 return {years:Math.floor(months/12),months:months%12};
}
/** 由大概年齡換算的估計生日：今天往回推 y 年 m 月（日期超過該月天數就用月底）。 */
export function birthFromAge(years,months,today=localToday()){
 const y=Number(years)||0,m=Number(months)||0,[ty,tm,td]=today.split('-').map(Number);
 const index=ty*12+(tm-1)-(y*12+m),year=Math.floor(index/12),month=index-year*12+1;
 const last=new Date(Date.UTC(year,month,0)).getUTCDate();
 return `${year}-${pad(month)}-${pad(Math.min(td,last))}`;
}
export const hasBirthDate=profile=>validBirthDate(profile?.birthDate);
const ageText=({years,months})=>t('{count} 歲',{count:years})+' '+t('{count} 月',{count:months});
export function catAgeLabel(profile,unknown=t('年齡未填'),today=localToday()){
 if(!validCatAge(profile))return unknown;
 if(hasBirthDate(profile)){
  const age=ageFromBirth(profile.birthDate,today);
  if(age)return profile.birthEstimated?t('約 {age}',{age:ageText(age)}):ageText(age);
 }
 if(profile.age==='')return unknown;
 const years=Number(profile.age),months=profile.ageMonths;
 return months===undefined||months===''?t('{count} 歲',{count:years}):ageText({years,months:Number(months)});
}
/** 摘要、匯出用：有生日寫「生日 YYYY/MM/DD（估）・目前約 X 歲 Y 月」；沒有生日退回「登記年齡 …」；都沒有回傳 ''。 */
export function catAgeDescription(profile,today=localToday()){
 if(!validCatAge(profile))return '';
 if(hasBirthDate(profile)){
  const age=ageFromBirth(profile.birthDate,today);
  if(age)return (profile.birthEstimated?t('生日 {date}（估）・目前約 {age}',{date:longDate(profile.birthDate),age:ageText(age)}):t('生日 {date}・目前 {age}',{date:longDate(profile.birthDate),age:ageText(age)}));
 }
 const legacy=catAgeLabel({...profile,birthDate:''},'',today);
 return legacy?t('登記年齡 {age}',{age:legacy}):'';
}
export function changeCatAge(profile,part,value){
 if(part==='years')return {...profile,age:value,...(value===''?{ageMonths:''}:{})};
 if(part==='months')return {...profile,age:profile.age===''&&value!==''?'0':profile.age,ageMonths:value};
 return profile;
}
// 「大概年齡」欄位：顯示值從估計生日（或舊的登記年齡）推回來；改了就換算成估計生日，並清掉舊的登記年齡。
export function approxAgeValues(profile,today=localToday()){
 if(hasBirthDate(profile)&&profile.birthEstimated){const age=ageFromBirth(profile.birthDate,today);if(age)return {years:String(age.years),months:String(age.months)};}
 if(!hasBirthDate(profile)&&profile.age)return {years:profile.age,months:profile.ageMonths||''};
 return {years:'',months:''};
}
export function changeApproxAge(profile,part,value,today=localToday()){
 if(!/^\d{0,2}$/.test(value))return profile;
 if(part==='years'&&value!==''&&Number(value)>40)return profile;
 if(part==='months'&&value!==''&&Number(value)>11)return profile;
 const next={...approxAgeValues(profile,today),[part]:value};
 // 清空欄位後剩下的是 0（例如只剩「0 歲」），視為不填，不會留下「今天出生」的估計生日。
 if(next.years===''&&next.months===''||(next.years===''||next.months==='')&&Number(next.years||0)*12+Number(next.months||0)===0)return {...profile,birthDate:'',birthEstimated:false,age:'',ageMonths:''};
 return {...profile,birthDate:birthFromAge(next.years,next.months,today),birthEstimated:true,age:'',ageMonths:''};
}
export function changeBirthDate(profile,value){
 return {...profile,birthDate:value,...(value?{age:'',ageMonths:''}:{birthEstimated:false})};
}
export function CatAgeFields({react:R,profile,onChange,Input='input',className='field',disabled=false,error='',onErrorClear=()=>{},today=localToday()}){
 const h=R.createElement,approx=approxAgeValues(profile,today),age=hasBirthDate(profile)?ageFromBirth(profile.birthDate,today):null;
 const legacy=!hasBirthDate(profile)&&profile.age!==''&&validCatAge(profile);
 const future=hasBirthDate(profile)&&profile.birthDate>today;
 const control=(part,label,value)=>h('label',{className,style:{margin:0,minWidth:0}},label,
  h(Input,{'aria-label':t('毛孩年齡（{unit}）',{unit:label}),type:'text',inputMode:'numeric',pattern:'[0-9]*',maxLength:2,value:value??'',placeholder:t('未填'),disabled,
   ...(Input==='input'?{}:{error:'',onErrorClear}),
   onChange:event=>{if(disabled)return;onErrorClear();onChange(changeApproxAge(profile,part,event.target.value,today));},title:`${part==='years'?'0–40':'0–11'} ${label}`}));
 return h('fieldset',{className:'cat-age-fields',style:{border:0,padding:0,margin:'16px 0',minWidth:0},disabled},
  h('legend',null,t('生日與年齡（可留白）')),
  h('label',{className,style:{margin:0}},t('生日'),h(Input,{type:'date','aria-label':t('毛孩生日'),value:profile.birthDate||'',min:BIRTH_MIN,max:today,disabled,
   ...(Input==='input'?{'aria-invalid':!!error||future}:{error,onErrorClear}),
   onChange:event=>{if(disabled)return;onErrorClear();onChange(changeBirthDate(profile,event.target.value));}})),
  h('label',{className:'cat-birth-estimated',style:{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}},
   h('input',{type:'checkbox','aria-label':t('生日是估計的'),checked:!!profile.birthEstimated,disabled:disabled||!hasBirthDate(profile),onChange:event=>{if(disabled)return;onChange({...profile,birthEstimated:event.target.checked});}}),
   h('span',null,t('生日是估計的（不確定確切日期）'))),
  // 已有儲存錯誤時只在欄位旁顯示那一則，不再重複「生日晚於今天」（2026-11-14）。
  future?(error?null:h('p',{className:'cat-age-note',role:'status'},t('生日晚於今天，請重新選擇。'))):
   age?h('p',{className:'cat-age-note'},(profile.birthEstimated?t('目前約 {age}（依生日自動計算，會隨時間增加）',{age:ageText(age)}):t('目前 {age}（依生日自動計算，會隨時間增加）',{age:ageText(age)}))):null,
  legacy&&h('p',{className:'cat-age-note cat-age-legacy'},t('目前記的是登記年齡「{age}」，不會隨時間增加。建議改填生日；不確定可以在下面填大概年齡，會換算成估計生日。',{age:catAgeLabel(profile)})),
  h('details',{className:'cat-age-approx',open:legacy||undefined},h('summary',null,t('不知道生日？填大概年齡')),
   h('div',{style:{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:12,marginTop:8}},control('years',t('歲'),approx.years),control('months',t('月'),approx.months)),
   h('small',null,t('會換算成「估計生日」並勾選估計，之後年齡會自動增加。'))),
  Input==='input'&&error&&h('p',{role:'alert'},error));
}
// 沒有照片時的預設頭像（2026-11-14）：代表色圓形＋名字第一個字（沒名字時是爪印），一看就知道不是照片。
// 代表色對照與 cat-colors.js 的 CAT_COLORS 相同（這個檔不 import 其他模組，方便各處直接使用）。
const COAT={orange:'#D99550',blue:'#7E8D9B',purple:'#705044',teal:'#BCC1C4',rose:'#AE784B',slate:'#3E3D3B',cream:'#F1E7D5',beige:'#CFB592'};
const LIGHT=new Set(['#BCC1C4','#F1E7D5','#CFB592']);
const xml=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function petInitial(profile){const name=String(profile?.name||'').trim();return name?Array.from(name)[0]:'';}
export function petAvatarSrc(profile={},coat){
 const fill=coat||COAT[profile?.colorId]||COAT.orange,ink=LIGHT.has(String(fill).toUpperCase())?'#5A4636':'#FFFFFF',initial=petInitial(profile);
 const paw=`<g fill="${ink}" opacity="${initial?'.25':'.9'}" transform="translate(${initial?'66 66':'26 26'}) scale(${initial?'.42':'.68'})"><ellipse cx="50" cy="66" rx="22" ry="18"/><ellipse cx="22" cy="38" rx="9" ry="12"/><ellipse cx="40" cy="24" rx="9" ry="12"/><ellipse cx="60" cy="24" rx="9" ry="12"/><ellipse cx="78" cy="38" rx="9" ry="12"/></g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="${fill}"/>${paw}${initial?`<text x="60" y="62" text-anchor="middle" dominant-baseline="central" font-family="system-ui,-apple-system,'PingFang TC','Noto Sans TC',sans-serif" font-size="52" font-weight="700" fill="${ink}">${xml(initial)}</text>`:''}</svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
