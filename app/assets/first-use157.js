import {t, K, longDate} from './i18n.js?v=audit1117b';
// Presentation-only first use. Fictional examples never enter the record store.
export const FIRST_USE_EXAMPLE = Object.freeze([
 [t('11/7 晚餐'),t('飼主記錄吃得比平常少，未填吃下量。')],
 [t('11/8 早上'),t('飼主記錄嘔吐 1 次，未填其他症狀。')],
 [t('想問獸醫'),t('這些變化需要持續觀察哪些項目？')]
]);
export const validFirstName = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 40;
// 2026-11-13：建立毛孩時順便問三個「下次日期」（獸醫說的，不知道可以跳過），第一天就有照顧時間表與手機提醒。
// 只建立有填日期的項目；App 不推算日期。
// Ian 2026-11-13：現在多數驅蟲藥體內外合一，預設只問一個「下次驅蟲」；分開打的人勾「體內、體外分開」再填兩個日期。
export const FIRST_CARE_FIELDS = Object.freeze([
 Object.freeze({key:'vaccine',label:t('下次打疫苗'),kind:K('疫苗'),name:K('疫苗')}),
 Object.freeze({key:'deworm',label:t('下次驅蟲（體內外合一）'),kind:K('驅蟲'),careSubtype:'combined',name:K('驅蟲（體內外）')})
]);
export const FIRST_CARE_SPLIT_FIELDS = Object.freeze([
 Object.freeze({key:'internal',label:t('下次體內驅蟲'),kind:K('驅蟲'),careSubtype:'internal',name:K('體內驅蟲')}),
 Object.freeze({key:'external',label:t('下次體外驅蟲'),kind:K('驅蟲'),careSubtype:'external',name:K('體外驅蟲')})
]);
/** 建立毛孩時要顯示的日期欄位：預設疫苗＋合一驅蟲；split 時驅蟲換成體內、體外兩個。 */
export const firstCareFields=split=>split?[FIRST_CARE_FIELDS[0],...FIRST_CARE_SPLIT_FIELDS]:FIRST_CARE_FIELDS;
const validCareDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const careToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
// 2026-11-14：「下次」日期填到今天以前（例如誤選多年前）要擋，否則一建好就是過期提醒。今天可以。
export function firstCareDateIssue(field,value,today=careToday()){
 if(!value)return '';
 if(!validCareDate(value))return t('{label}的日期無法辨識，請重新選擇。',{label:field.label});
 if(value<today)return t('{label}填的是 {value}，已經過了。請填今天以後、獸醫說的下次日期；已經打過或驅過蟲，之後在「照護」記一筆就好。',{label:field.label,value:longDate(value)});
 return '';
}
export const FIRST_CARE_DATE_SUMMARY=t('下次日期不能早於今天，請依上面的紅字修改，或先清空。');
export function firstCareDateError(dates,split=false,today=careToday()){
 for(const field of firstCareFields(split)){const issue=firstCareDateIssue(field,dates?.[field.key],today);if(issue)return issue;}
 return '';
}
/** 疫苗和驅蟲下次日期欄位（建立毛孩共用）：預設疫苗＋體內外合一驅蟲，勾選後拆成體內、體外。 */
export function CareDateFields({react:R,dates,setDates,split,setSplit,disabled=false,inputClass='',onEdit,today=careToday()}){
 const h=R.createElement;
 return h('fieldset',{className:'first-pet-care'},h('legend',null,t('疫苗和驅蟲（選填）')),
  h('p',{className:'si-note'},t('填獸醫說的下次日期，會列進照顧時間表。手機通知需在 App 開啟並確認排程；不知道日期可先空著，之後在「照護」補。')),
  firstCareFields(split).map(field=>{const issue=firstCareDateIssue(field,dates[field.key],today);return h('label',{key:field.key,className:'field'},field.label,
   h('input',{type:'date',className:inputClass,'aria-label':field.label,'aria-invalid':issue?true:undefined,min:today,value:dates[field.key]||'',disabled,onChange:e=>{const value=e.target.value;setDates(old=>({...old,[field.key]:value}));onEdit?.();}}),
   issue&&h('small',{className:'field-error first-care-date-error',role:'alert'},issue));}),
  h('label',{className:'first-pet-split'},h('input',{type:'checkbox',checked:split,disabled,onChange:e=>setSplit(e.target.checked)}),h('span',null,t('體內、體外分開驅蟲（用兩種藥的才勾）'))));
}
export function buildFirstCareItems(dates,makeId=()=>globalThis.crypto.randomUUID(),split=false){
 return firstCareFields(split).filter(field=>validCareDate(dates?.[field.key])).map(field=>({id:makeId(),kind:field.kind,...(field.careSubtype?{careSubtype:field.careSubtype}:{}),name:field.name,last:'',next:dates[field.key],lead:3,note:'',enabled:true,history:[]}));
}
export function FirstUse157({react:R,Scroll='div',Input='input',hideKeyboard=()=>{},onName,onCareDates,onEnter,onFirstManual,previewFirstUse=false}){
 const h=R.createElement,[step,setStep]=R.useState('example'),[name,setName]=R.useState(''),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
 const [dates,setDates]=R.useState({}),[split,setSplit]=R.useState(false);
 const withCare=Boolean(onCareDates)&&!previewFirstUse;
 const heading=R.useRef(null),pending=R.useRef(false);
 R.useEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
 const save=async event=>{event?.preventDefault();if(pending.current||!validFirstName(name))return;pending.current=true;setBusy(true);setError('');try{hideKeyboard();if(!previewFirstUse)await onName(name.trim());setStep(withCare?'care':'ready');}catch(e){setError(e?.message||t('名字尚未保存，請再試一次。'));}finally{pending.current=false;setBusy(false);}};
 const saveCare=async()=>{if(pending.current)return;if(firstCareDateError(dates,split)){setError(FIRST_CARE_DATE_SUMMARY);return;}const items=buildFirstCareItems(dates,undefined,split);if(!items.length){setStep('ready');return;}pending.current=true;setBusy(true);setError('');try{hideKeyboard();await onCareDates(items);setStep('ready');}catch(e){setError(e?.message||t('日期沒有存到，請再試一次，或先跳過。'));}finally{pending.current=false;setBusy(false);}};
 const stepKeys=withCare?['example','name','care','ready']:['example','name','ready'];
 const button=(label,onClick,primary=false)=>h('button',{type:'button',className:primary?'primary fu157-primary':'fu157-secondary',onClick,disabled:busy},label);
 return h('div',{className:'inpaw-app fu157-app'},h(Scroll,{className:'app-scroll'},h('main',{className:'app-content fu157','aria-label':t('首次使用')},
  h('img',{className:'fu157-logo',src:'/xbb-site/app/assets/brand/logo.svg',alt:t('毛孩小本本 In Paw AI')}),
  h('p',{className:'fu157-eyebrow'},t('貓咪日常紀錄與看診摘要')),
  previewFirstUse&&h('aside',{className:'fu157-example','aria-label':t('安全預覽')},h('strong',null,t('首次使用預覽 · 不變更資料')),h('p',null,t('以下名字只用來預覽畫面，不會修改現有毛孩，也不會新增紀錄。')),button(t('退出預覽，返回原頁'),onEnter)),
  h('ol',{className:'fu157-steps','aria-label':t('開始使用步驟')},(withCare?[t('先看用途'),t('認識貓咪'),t('照顧日期'),t('記第一筆')]:[t('先看用途'),t('認識貓咪'),t('記第一筆')]).map((text,i)=>h('li',{key:text,'aria-current':stepKeys[i]===step?'step':undefined},text))),
  h('h1',{ref:heading,tabIndex:-1},step==='example'?t('把日常小變化，帶去看診'):step==='name'?t('先告訴我貓咪的名字'):step==='care'?t('{name}的疫苗和驅蟲',{name:name.trim()}):t('開始記下{name}的日常',{name:name.trim()})),
  step==='care'?h('section',{className:'fu157-care','aria-label':t('疫苗與驅蟲日期')},
   h(CareDateFields,{react:R,dates,setDates,split,setSplit,disabled:busy,onEdit:()=>setError('')}),
   button(busy?t('儲存中…'):Object.values(dates).some(Boolean)?t('存好日期，下一步'):t('下一步'),saveCare,true),
   button(t('先跳過，之後再填'),()=>setStep('ready'))):
  step==='example'?h(R.Fragment,null,
   h('p',{className:'fu157-intro'},t('不用臨時回想。平常記一點，看診時就有依據。')),
   h('section',{className:'fu157-example','aria-label':t('虛構看診摘要範例')},h('span',{className:'fu157-badge'},t('範例 · 不是你的紀錄')),h('h2',null,t('小花的看診摘要')),h('p',null,t('兩筆日常觀察 → 一張回顧')),h('dl',null,FIRST_USE_EXAMPLE.map(([title,body])=>h('div',{key:title},h('dt',null,title),h('dd',null,body)))),h('small',null,t('只整理已記錄的事；沒有紀錄不代表沒有發生。摘要不代替獸醫診斷。'))),
   h('p',{className:'fu157-note'},t('這是固定內容示範，未使用 AI，也不會保存為真實紀錄。')),
   button(t('換成我家貓咪，開始記錄'),()=>setStep('name'),true)):
  step==='name'?h('form',{onSubmit:save},h('p',{className:'fu157-intro'},t('現在只需要名字，照片、年齡和其他資料都能稍後補。')),h('label',{className:'field'},t('貓咪名字 ＊'),h(Input,{'aria-label':t('貓咪名字'),required:true,maxLength:40,value:name,placeholder:t('例如：小花'),disabled:busy,onChange:e=>setName(e.target.value)})),h('button',{type:'submit',className:'primary fu157-primary',disabled:busy||!validFirstName(name)},busy?t('正在保存…'):previewFirstUse?t('使用示範名字，繼續'):t('保存名字，繼續')),button(t('返回看摘要範例'),()=>setStep('example'))):
  h(R.Fragment,null,h('p',{className:'fu157-intro'},previewFirstUse?t('這是首筆紀錄的入口預覽。示範名字沒有保存；退出後回到原頁，原有毛孩與紀錄不變。'):t('名字已保存在這台裝置。先記下今天的一個觀察，核對後再儲存。')),h('section',{className:'fu157-example'},h('h2',null,t('從一小句開始')),h('p',null,t('可以記吃飯、喝水、排泄，或你剛剛注意到的變化。')),h('small',null,t('不確定的數量留白，不必補猜。'))),previewFirstUse?button(t('預覽完成，返回原頁'),onEnter,true):button(t('手動記第一筆'),onFirstManual,true),!previewFirstUse&&button(t('先看看首頁'),onEnter)),
  error&&h('p',{role:'alert',className:'error'},error),
  h('p',{className:'fu157-footnote'},t('不需登入，也不需下載模型。基本紀錄保存在這台裝置；清除網站資料可能遺失，重要紀錄請匯出備份。')),
  h('p',{className:'fu157-prototype'},t('互動原型')))));
}
const OUTCOME_ICONS160=Object.freeze({
 summary:['M13 8H9a2 2 0 0 0-2 2v24h26V10a2 2 0 0 0-2-2h-4','M16 5h8l2 6H14l2-6Z','M13 18h2m4 0h8M13 24h2m4 0h8M13 30h2m4 0h8'],
 report:['M25 29v5H7V6h14l6 6v6M21 6v7h6','M12 18h7m-7 5h6m-6 5h5','M33 24a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6']
});
export function MainOutcomes157({react:R,onSummary,hasSavedSummary=false,count=0,days=14,showReport=false}){
 const h=R.createElement;
 const content=(icon,title,detail)=>[h('span',{className:'outcome157-icon','aria-hidden':true},h('svg',{viewBox:'0 0 40 40',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'},...OUTCOME_ICONS160[icon].map((d,i)=>h('path',{key:i,d})))),h('span',{className:'outcome157-copy'},h('strong',null,title),h('small',null,detail)),h('span',{className:'outcome157-arrow','aria-hidden':true},'›')];
 return h('section',{className:'outcomes157 today-vet-tools','aria-label':t('看診工具')},
 h('button',{type:'button',className:'outcome157 today-summary-card','aria-label':hasSavedSummary?t('查看已儲存的看診摘要'):t('整理看診摘要'),onClick:()=>onSummary(hasSavedSummary)},
  ...content('summary',t('看診摘要'),hasSavedSummary?t('上次已保存，隨時可查看'):count?t('近 {days} 天有 {count} 筆紀錄',{days,count}):t('整理看診、用藥和平常的紀錄')),
  h('span',{className:'today-summary-cta'},hasSavedSummary?t('查看摘要'):t('整理摘要'))),
 showReport&&h('a',{href:'/xbb-site/app/report-review/',className:'outcome157 today-report-card'},...content('report',t('看懂報告'),t('範例'))));
}
