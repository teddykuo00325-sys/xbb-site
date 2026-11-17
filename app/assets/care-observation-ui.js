import {t} from './i18n.js?v=audit1117b';
/** Presentation only. Focus is a reminder, never a filter or a storage migration. */
export const OBSERVATION_FOCUS=[['intake',t('食量')],['urine',t('尿尿')],['stool',t('便便')],['vomit',t('嘔吐')],['mood',t('精神')],['weight',t('體重')]];
export const OBSERVATION_SCOPE=t('勾選的項目只是提醒，期間內的紀錄都會列入。');
export const focusNames=journey=>(Array.isArray(journey?.focus)?journey.focus:[]).map(id=>OBSERVATION_FOCUS.find(([key])=>key===id)?.[1]||id);
export const focusText=journey=>focusNames(journey).join(t('、'))||t('尚未指定關注項目');
export const observationPeriod=(journey,today)=>journey.status==='completed'?t('{start} ～ {today}（已結束）', {start: journey.start, today: journey.end||today}):`${t('{start} 起', {start: journey.start})}${journey.end?` ${t('· 預定至 {end}', {end: journey.end})}`:t(' · 持續觀察')}`;
export function observationGroups(journeys){return [{id:'active',title:t('進行中'),rows:journeys.filter(j=>j.status==='active')},{id:'completed',title:t('已結束'),rows:journeys.filter(j=>j.status!=='active')}];}
const kindName=journey=>journey.kind==='vet'?t('回診觀察'):t('換糧觀察');

export function ObservationFocus({react:R,journey}){
 const h=R.createElement,names=focusNames(journey);
 return h('div',{className:'co-focus','aria-label':t('這次關注')},h('span',{className:'co-field-name'},t('這次關注')),names.length?names.map((name,index)=>h('span',{className:'co-focus-tag',key:index},name)):h('span',{className:'cj-muted'},t('尚未指定')));
}
export function CareObservationList({react:R,model,today,busy,onNew,onReview,onReport,onToggle}){
 const h=R.createElement,groups=observationGroups(model.journeys),active=groups[0].rows;
 const card=j=>h('article',{className:'cj-journey co-journey',key:j.id,'data-observation-id':j.id},
  h('div',{className:'cj-card-top'},h('span',{className:'cj-badge'},kindName(j)),h('span',{className:'co-status'},j.status==='active'?t('進行中'):t('已結束'))),
  h('h3',null,j.question||t('留意牠的日常變化')),h(ObservationFocus,{react:R,journey:j}),
  h('p',{className:'co-period'},observationPeriod(j,today)),
  h('p',{className:'cj-muted'},t('期間內 {recordCount} 筆日常紀錄 · {daysWithRecords} 天有紀錄', {recordCount: j.recordCount||0, daysWithRecords: j.daysWithRecords||0})),
  h('p',{className:'co-next'},h('strong',null,t('下一步：')),j.status==='active'?t('回看日常，有新變化時再補記。'):t('回看這段觀察；需要繼續時可重新接續。')),
  h('div',{className:'co-card-actions'},h('button',{type:'button',className:'cj-primary',disabled:busy,onClick:()=>onReview(j.id)},t('回看日常紀錄')),h('button',{type:'button',disabled:busy,onClick:()=>onReport(j.id)},t('整理回診資料'))),
  h('details',{className:'co-more'},h('summary',null,t('管理這段觀察')),h('p',{className:'cj-muted'},j.status==='active'?t('完成後會移到「已結束」，原紀錄與換糧來源都保留。'):t('重新接續會清除這段觀察的結束日期，保留原開始日、關注項目與所有紀錄。')),h('button',{type:'button',disabled:busy,onClick:()=>onToggle(j)},j.status==='active'?t('完成這段觀察'):t('重新接續觀察'))));
 return h(R.Fragment,null,
  h('p',{className:'cj-subtitle'},t('把關注的變化放在一起，隨時回看，不必等到看診。')),
  !active.length&&h('section',{className:'cj-empty co-empty'},h('span',{'aria-hidden':true},'🌱'),h('h3',null,model.journeys.length?t('目前沒有進行中的觀察'):t('先從一個小問題開始')),h('p',null,model.journeys.length?t('先前的觀察保留在下方，也可以開始新的一段。'):t('換糧後吃得如何，或下次回診前想留意什麼？')),h('button',{type:'button',className:'cj-primary',disabled:busy,onClick:onNew},t('開始觀察'))),
  active.length>0&&h('div',{className:'co-new-action'},h('button',{type:'button',disabled:busy,onClick:onNew},t('＋ 開始新觀察'))),
  model.journeys.length>0&&h('p',{className:'cj-muted co-scope'},OBSERVATION_SCOPE),
  groups.filter(group=>group.rows.length).map(group=>h('section',{className:'co-group',key:group.id,'aria-label':group.title,'data-observation-group':group.id},h('h3',{className:'co-group-title'},group.title,h('span',null,String(group.rows.length))),group.rows.map(card))));
}
export function CareObservationForm({react:R,form,today,foods,busy,onChange,onSubmit}){
 const h=R.createElement,edit=(key,value)=>onChange(key,value),field=(label,node)=>h('label',{className:'cj-field'},h('span',null,label),node),input=(key,type='text',props={})=>h('input',{type,value:form[key]||'',onChange:e=>edit(key,e.target.value),...props}),foodSelect=(key)=>h('select',{value:form[key]||'',onChange:e=>edit(key,e.target.value)},h('option',{value:''},t('暫不指定食品')),foods.map(f=>h('option',{key:f.id,value:f.id},f.name||f.title||t('未命名食品'))));
 return h('form',{className:'co-form',onSubmit:onSubmit},
  field(t('這次想觀察'),h('select',{value:form.kind,onChange:e=>edit('kind',e.target.value)},h('option',{value:'food-change'},t('換糧觀察')),h('option',{value:'vet'},t('回診觀察')))),
  field(t('想留意什麼？（選填）'),h('textarea',{value:form.question,onChange:e=>edit('question',e.target.value),placeholder:t('例如：換糧後的食量和便便有沒有變化'),maxLength:500,rows:3})),
  field(t('開始日期'),input('start','date',{required:true,max:form.end&&form.end<today?form.end:today})),
  h('fieldset',{className:'cj-checks'},h('legend',null,t('關注項目')),OBSERVATION_FOCUS.map(([id,name])=>h('label',{key:id},h('input',{type:'checkbox',checked:form.focus.includes(id),onChange:e=>edit('focus',e.target.checked?[...form.focus,id]:form.focus.filter(v=>v!==id))}),name))),
  h('p',{className:'cj-muted co-scope'},OBSERVATION_SCOPE),
  form.kind==='food-change'&&h(R.Fragment,null,field(t('原食品（選填）'),foodSelect('oldFoodId')),field(t('新食品（選填）'),foodSelect('newFoodId'))),
  h('details',{className:'co-options'},h('summary',null,t('更多設定（選填）')),field(form.kind==='vet'?t('預定回診／結束日期'):t('預定結束日期'),input('end','date',{min:form.start}))),
  h('p',{className:'cj-muted co-save-note'},form.kind==='food-change'?t('按開始會記下換糧日期，食品沒填也沒關係；不會自動新增餵食紀錄。'):t('按開始只會儲存這段觀察，不會自動新增其他紀錄。')),
  h('button',{type:'submit',className:'cj-primary',disabled:busy},busy?t('儲存中…'):t('開始觀察')));
}
export function CareObservationReview({react:R,journey,report,today,busy,sourceDetails,onNew,onMeal,onText,onReport}){
 const h=R.createElement;
 if(!journey||!report)return h('div',{className:'cj-empty'},h('p',null,t('找不到這段觀察，原有紀錄未變更。')),h('button',{type:'button',className:'cj-primary',onClick:onNew},t('開始觀察')));
 const facts=report.sourceFacts||[],until=journey.end&&journey.end<today?journey.end:today;
 return h(R.Fragment,null,
  h('section',{className:'co-review-summary'},h('span',{className:'cj-badge'},kindName(journey)),h('h3',null,journey.question||t('留意牠的日常變化')),h(ObservationFocus,{react:R,journey}),h('p',null,observationPeriod(journey,today)),h('p',{className:'cj-muted'},t('回看範圍：{start} ～ {until}', {start: journey.start, until}))),
  h('p',{className:'cj-muted co-scope'},OBSERVATION_SCOPE),
  h('section',{className:'co-review-counts','aria-label':t('期間內的紀錄')},h('strong',null,t('{count} 筆日常紀錄', {count: report.rows.length})),h('span',null,t('{count} 筆食品／生活變動 · {count2} 筆疫苗驅蟲', {count: report.changes.length, count2: report.care.length})),h('p',{className:'cj-muted'},t('僅列已確認來源。未記錄不代表沒有發生，未知數量不推估。'))),
  h('div',{className:'co-card-actions'},h('button',{type:'button',disabled:busy,onClick:onText},t('記下日常變化')),h('button',{type:'button',disabled:busy,onClick:onMeal},t('補記一餐'))),
  h('section',{'aria-label':t('觀察期間紀錄與來源')},h('h3',null,t('日常紀錄與來源')),h('p',{className:'cj-muted'},t('依時間由新到舊排列；展開可看原文、來源與完整內容。')),facts.length?[...facts].reverse().map((fact,index)=>sourceDetails(h,fact,index)):h('div',{className:'cj-empty'},h('p',null,t('這段期間還沒有可回看的來源。')),h('p',{className:'cj-muted'},t('補記時請核對日期，只有期間內的有效紀錄會出現在這裡。')))),
  h('section',{className:'cj-note'},h('h3',null,t('準備回診時')),h('p',null,t('Pro 本機體驗可自選期間、核對缺漏，再下載進階回診整理。日常原文與已保存摘要仍可免費查看。')),h('button',{type:'button',className:'cj-primary',disabled:busy,onClick:onReport},t('整理回診資料'))));
}
