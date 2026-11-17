import {t, K} from './i18n.js?v=audit1117b';
import {displayStoredText,displayUserText,withStoredTexts} from './stored-text.js?v=i18n1';
import {requireActivePet,activePetEntries} from './pet-archive.js?v=8f5745b7843b';
import {recordIsLive} from './record-identity.js?v=8f5745b7843b';
import {calendarDay,localCalendarDate,laterToday} from './today-overview-v29.js?v=8f5745b7843b';
// 多貓家庭共用食盆與清砂（2026-11-14）。
// - 不知道是哪隻吃的／尿的，就記成「家庭紀錄」（multiCat.householdEntries，catId:null、ownership:'unconfirmed'）。
//   結構化數字放在 householdCare（backup schema 需同步加入此欄位）。
// - 家庭紀錄不分攤、不推估到個別毛孩，也不會進個別摘要。
// - 使用者事後「指派給某一隻」：家庭紀錄移除，換成那隻自己的正式紀錄（會進牠的摘要）；同一畫面可復原。
// - 全家總覽另外列出每隻近 7 天的異常紀錄數（只看已勾選的結構化觀察，不從文字推論、不做診斷）。
const fail=message=>{throw Error(message)};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const ROOT_CAT='cat-original';
export const BOWL_MAX_G=5000;
export const LITTER_MAX=50;
const round=n=>Number(n.toFixed(1));
const demo=row=>row?.demo===true||String(row?.source||'').includes(K('示範'));
const nowTime=(now=new Date())=>`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
const timeValid=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||''));
const number=value=>{const text=String(value??'').trim();if(!text||!/^\d+(\.\d+)?$/.test(text))return null;const n=Number(text);return Number.isFinite(n)?n:null;};
const count=value=>{const text=String(value??'').trim();return /^\d+$/.test(text)?Number(text):null;};
const shiftDay=(today,n)=>new Date((calendarDay(today)+n)*864e5).toISOString().slice(0,10);

export function isHouseholdCare(row){
 const c=row?.householdCare;
 return !!c&&typeof c==='object'&&(c.kind==='bowl'||c.kind==='litter');
}
export function bowlEaten(care){
 if(care?.kind!=='bowl')return null;
 const added=number(care.added),left=number(care.left),initial=own(care,'initial')?number(care.initial):0;
 const total=initial===null||added===null?null:initial+added;
 return total!==null&&left!==null&&left<=total?round(total-left):null;
}
export function householdCareText(care){
 if(care.kind==='bowl')return own(care,'initial')?K(`共用食盆：開始 ${care.initial} g、期間補入 ${care.added} g、結束剩 ${care.left} g，全家約吃下 ${bowlEaten(care)} g（未分到個別毛孩）`):K(`共用食盆：補了 ${care.added} g、剩 ${care.left} g，全家約吃下 ${bowlEaten(care)} g（未分到個別毛孩）`);
 return K(`家庭清砂：尿團 ${care.urineClumps} 團、便便 ${care.stoolCount} 坨（未分到個別毛孩）`);
}

/** 新食盆紀錄明確填同一觀察區間的開始量、補入量、結束量；舊資料沒有 initial 維持原計算。 */
export function buildHouseholdCare(input,{today=localCalendarDate(),now=new Date(),id}={}){
 const date=input.date||today,time=input.time||nowTime(now);
 if(calendarDay(date)===null||date>today)fail(t('請選擇今天或以前的日期。'));
 if(!timeValid(time))fail(t('請填寫有效的 24 小時制時間。'));
 if(laterToday(date,time,now))fail(t('時間不能晚於現在。'));
 let householdCare,category;
 if(input.kind==='bowl'){
  const initial=number(input.initial),added=number(input.added),left=number(input.left);
  if(initial===null||initial>BOWL_MAX_G)fail(t('「開始時盆內總量」請填 0～{BOWL_MAX_G} g；確認空盆才填 0。',{BOWL_MAX_G}));
  if(added===null||added>BOWL_MAX_G)fail(t('「期間另外補入」請填 0～{BOWL_MAX_G} g；確認沒補才填 0。',{BOWL_MAX_G}));
  if(initial+added<=0||initial+added>BOWL_MAX_G)fail(t('開始量加補入量要大於 0，合計最多 {BOWL_MAX_G} g。',{BOWL_MAX_G}));
  if(left===null)fail(t('「結束時剩量」請填數字；全部吃完就填 0。'));
  if(left>initial+added)fail(t('結束剩量不能比開始量加補入量多。'));
  householdCare={kind:'bowl',initial,added,left,unit:'g'};category=K('其他');
 }else if(input.kind==='litter'){
  const urineClumps=count(input.urineClumps),stoolCount=count(input.stoolCount);
  if(urineClumps===null||stoolCount===null||urineClumps>LITTER_MAX||stoolCount>LITTER_MAX)fail(t('尿團、便便兩欄都請填 0～{LITTER_MAX} 的整數；確認沒有才填 0，留白不會當成 0。',{LITTER_MAX}));
  if(urineClumps+stoolCount===0)fail(t('尿團和便便至少要有一項大於 0。'));
  householdCare={kind:'litter',urineClumps,stoolCount};category=K('排泄');
 }else fail(t('請選擇共用食盆或家庭清砂。'));
 return {id:id||`household-care-${crypto.randomUUID()}`,catId:null,ownership:'unconfirmed',date,time,category,text:householdCareText(householdCare),source:K('家庭共用紀錄'),createdAt:now.toISOString(),householdCare};
}
export function addHouseholdCare(root,record){
 if(!root?.multiCat||!Array.isArray(root.multiCat.householdEntries))fail(t('家庭紀錄需要兩隻以上的毛孩。'));
 if(!isHouseholdCare(record)||record.catId!==null||record.ownership!=='unconfirmed')fail(t('家庭紀錄格式不符，未儲存。'));
 if(root.multiCat.householdEntries.some(row=>row.id===record.id))fail(t('這筆家庭紀錄已存過。'));
 return {...root,multiCat:{...root.multiCat,householdEntries:[record,...root.multiCat.householdEntries]}};
}
export function householdCareRows(root,{today,days=7}={}){
 const rows=(root?.multiCat?.householdEntries||[]).filter(row=>isHouseholdCare(row)&&!row.deleted&&!row.deletedAt&&!row.isDeleted);
 const from=today?shiftDay(today,1-days):null;
 return rows.filter(row=>!today||row.date>=from&&row.date<=today).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)||String(b.id).localeCompare(String(a.id)));
}
/** 家庭總吃下量：只加總共用食盆紀錄，不分攤到個別毛孩。 */
export function householdBowlTotals(root,today){
 const week=householdCareRows(root,{today,days:7}).filter(row=>row.householdCare.kind==='bowl');
 const sum=list=>round(list.reduce((n,row)=>n+(bowlEaten(row.householdCare)||0),0));
 const todays=week.filter(row=>row.date===today);
 return {today:sum(todays),todayCount:todays.length,week:sum(week),weekCount:week.length};
}
export function householdLitterTotals(root,today){
 const todays=householdCareRows(root,{today,days:1}).filter(row=>row.householdCare.kind==='litter');
 return {urineClumps:todays.reduce((n,row)=>n+row.householdCare.urineClumps,0),stoolCount:todays.reduce((n,row)=>n+row.householdCare.stoolCount,0),count:todays.length};
}

function updateCat(root,catId,transform){
 requireActivePet(root,catId);
 if(catId===ROOT_CAT)return transform(root);
 const target=root.multiCat?.cats?.find(cat=>cat.id===catId&&cat.data);if(!target)fail(t('找不到這隻毛孩，未更動資料。'));
 return {...root,multiCat:{...root.multiCat,cats:root.multiCat.cats.map(cat=>cat===target?{...cat,data:transform(cat.data)}:cat)}};
}
const scopeOf=(root,catId)=>catId===ROOT_CAT?root:root.multiCat?.cats?.find(cat=>cat.id===catId)?.data;
/** 指派後的個別紀錄：一般正式紀錄（無 catId:null／unconfirmed），所以會進這隻的摘要。 */
export function assignedEntries(record,now=new Date().toISOString()){
 const care=record.householdCare,base={date:record.date,time:record.time,source:K('家庭紀錄指派'),createdAt:now,confirmed:true,demo:false};
 if(care.kind==='bowl'){
  const eaten=bowlEaten(care);
  return [{...base,id:`${record.id}-cat-bowl`,category:K('飲食'),text:own(care,'initial')?K(`共用食盆指派：開始 ${care.initial} g、期間補入 ${care.added} g、結束剩 ${care.left} g，約吃下 ${eaten} g`):K(`共用食盆指派：補了 ${care.added} g、剩 ${care.left} g，約吃下 ${eaten} g`),amount:String(eaten),unit:'g'}];
 }
 const rows=[];
 if(care.urineClumps>0)rows.push({...base,id:`${record.id}-cat-urine`,category:K('排泄'),metric:'urine',eliminationKind:'urine',urineStatus:'litter',text:K(`清砂時發現尿團 ${care.urineClumps} 團（家庭清砂指派）`),amount:String(care.urineClumps),unit:K('團')});
 if(care.stoolCount>0)rows.push({...base,id:`${record.id}-cat-stool`,category:K('排泄'),metric:'stool',eliminationKind:'stool',stoolEvent:'observed',text:K(`清砂時發現便便 ${care.stoolCount} 坨（家庭清砂指派）`),amount:String(care.stoolCount),unit:K('坨')});
 return rows;
}
/** 把一筆家庭紀錄改成某一隻的紀錄。回傳新資料與可復原的資訊。 */
export function assignHouseholdCare(root,householdId,catId,{now=new Date().toISOString()}={}){
 const record=(root.multiCat?.householdEntries||[]).find(row=>row.id===householdId);
 if(!record||!isHouseholdCare(record))fail(t('找不到這筆家庭紀錄，可能已指派或刪除。'));
 const rows=assignedEntries(record,now),scope=scopeOf(root,catId);
 if(!scope)fail(t('找不到這隻毛孩，未更動資料。'));
 if(rows.some(row=>(scope.entries||[]).some(entry=>entry.id===row.id)))fail(t('這筆已經指派過了。'));
 let next=updateCat(root,catId,data=>({...data,entries:[...(data.entries||[]),...rows]}));
 next={...next,multiCat:{...next.multiCat,householdEntries:next.multiCat.householdEntries.filter(row=>row.id!==householdId)}};
 return {data:next,undo:{record,catId,entryIds:rows.map(row=>row.id)}};
}
/** 復原指派：拿掉指派產生的紀錄（若使用者已修改過就不動），把家庭紀錄放回。 */
export function undoAssignHouseholdCare(root,{record,catId,entryIds}){
 const scope=scopeOf(root,catId);if(!scope)fail(t('找不到這隻毛孩，無法復原。'));
 const created=assignedEntries(record).map(row=>row.id);
 if(entryIds.some(id=>!created.includes(id)))fail(t('復原資訊不符，未更動資料。'));
 const present=(scope.entries||[]).filter(row=>entryIds.includes(row.id));
 if(present.some(row=>row.editedAt||row.mealRevisions))fail(t('指派後的紀錄已被修改，請到那隻毛孩的紀錄自行調整。'));
 let next=updateCat(root,catId,data=>({...data,entries:(data.entries||[]).filter(row=>!entryIds.includes(row.id))}));
 if(!next.multiCat.householdEntries.some(row=>row.id===record.id))next={...next,multiCat:{...next.multiCat,householdEntries:[record,...next.multiCat.householdEntries]}};
 return next;
}

// ---- 全家總覽：近 7 天異常紀錄 ----
const STOOL_LABELS={soft:t('軟便'),diarrhea:t('腹瀉'),blood:t('血便'),abnormal:t('便便異常')};
const URINE_LABELS={frequent:t('頻繁進砂盆'),abnormal:t('尿尿異常'),litterAbnormal:t('尿尿異常'),smaller:t('尿團比平常小'),litterSmaller:t('尿團比平常小'),larger:t('尿團比平常大'),litterLarger:t('尿團比平常大')};
/** 只看已勾選的結構化狀態；自由文字不推論。回傳要顯示的標籤或 null。 */
export function anomalyLabel(row={}){
 if(row.category===K('嘔吐'))return t('嘔吐');
 if(row.category===K('排泄')){
  if(own(STOOL_LABELS,row.stoolStatus||''))return STOOL_LABELS[row.stoolStatus];
  if(own(URINE_LABELS,row.urineStatus||''))return URINE_LABELS[row.urineStatus];
  return null;
 }
 if(row.appetiteStatus==='less')return t('食慾變差');
 if(row.appetiteStatus==='none')return t('沒有進食');
 if(row.feeding?.noEatingConfirmed===true)return t('沒有進食');
 if(row.moodStatus==='low')return t('活動量變少');
 return null;
}
export function familyAnomalies(root,catId,today,days=7){
 const scope=scopeOf(root,catId);if(!scope||calendarDay(today)===null)return [];
 const from=shiftDay(today,1-days),seen=new Set(),rows=[];
 for(const row of scope.entries||[]){
  if(!row||typeof row.id!=='string'||seen.has(row.id)||!recordIsLive(row)||demo(row)||row.category===K('交接')||row.handover)continue;
  if(!(row.date>=from&&row.date<=today))continue;
  const label=anomalyLabel(row);if(!label)continue;
  if(row.feeding&&row.mealGroupId&&rows.some(item=>item.row.mealGroupId===row.mealGroupId&&item.label===label))continue;
  seen.add(row.id);rows.push({row,label});
 }
 return rows.sort((a,b)=>(b.row.date+b.row.time).localeCompare(a.row.date+a.row.time));
}
const shortDate=date=>String(date||'').slice(5).split('-').map(Number).join('/');
export function FamilyAnomalyBadge({react:R,root,catId,today,label,onOpen}){
 const h=R.createElement,rows=familyAnomalies(root,catId,today);
 if(!rows.length)return h('p',{className:'family-anomaly is-none'},h('span',null,t('近 7 天異常紀錄')),h('strong',null,'0',h('small',null,t(' 筆',{count:rows.length}))));
 return h('details',{className:'family-anomaly'},
  h('summary',{'aria-label':t('{label}近 7 天異常紀錄 {count} 筆，點開查看',{label,count:rows.length})},h('span',null,t('近 7 天異常紀錄')),h('strong',null,rows.length,h('small',null,t(' 筆',{count:rows.length})))),
  h('ul',{className:'family-anomaly-list'},rows.map(({row,label:kind})=>h('li',{key:row.id},h('strong',null,kind),h('span',null,`${shortDate(row.date)} ${row.time} · ${displayStoredText(String(row.text||'').trim())||kind}`)))),
  h('p',{className:'family-anomaly-note'},t('只計已勾選的異常狀態，不做判斷；擔心時請諮詢獸醫。')),
  onOpen&&h('button',{type:'button',className:'family-anomaly-open',onClick:onOpen},t('查看牠的今日')));
}

// ---- 家庭共用食盆／清砂 UI ----
export function focusHouseholdForm(node,kind){
 if(!node)return;
 node.scrollIntoView?.({block:'start',behavior:'auto'});
 node.querySelector?.(`[data-household-kind="${kind}"] input`)?.focus?.({preventScroll:true});
}
export function FamilyHouseholdCare({react:R,root,rows=[],labels=[],today=localCalendarDate(),request=null}){
 const h=R.createElement,view=root?.subscribe&&R.useSyncExternalStore?R.useSyncExternalStore(root.subscribe,root.get,root.get):root?.get?.(),data=view?.data;
 const [kind,setKind]=R.useState('bowl'),[form,setForm]=R.useState({initial:'',added:'',left:'',urineClumps:'',stoolCount:''});
 const [busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[undo,setUndo]=R.useState(null),[targets,setTargets]=R.useState({});
 const lock=R.useRef(false),section=R.useRef(null);
 R.useEffect(()=>{if(request&&['bowl','litter'].includes(request.kind)){setKind(request.kind);setError('');setNotice('');}},[request?.id]);
 R.useEffect(()=>{if(!request||request.kind!==kind)return;const run=()=>focusHouseholdForm(section.current,kind);if(typeof requestAnimationFrame==='function'){const id=requestAnimationFrame(run);return()=>cancelAnimationFrame(id);}run();},[request?.id,kind]);
 if(!data?.multiCat||activePetEntries(data.multiCat).length<2)return null;
 const write=async(transform,after)=>{if(lock.current||!root?.atomic)return false;lock.current=true;setBusy(true);setError('');try{let extra;await root.atomic(d=>{const result=transform(d);extra=result.undo;return result.data;});after?.(extra);return true;}catch(e){setError(e.message||t('沒有存到，請再試一次。'));return false;}finally{lock.current=false;setBusy(false);}};
 const save=async event=>{event?.preventDefault?.();setNotice('');setUndo(null);let record;try{record=buildHouseholdCare({kind,...form},{today});}catch(e){setError(e.message);return;}
  if(await write(d=>({data:addHouseholdCare(d,record)})))
   {setForm({initial:'',added:'',left:'',urineClumps:'',stoolCount:''});setNotice(kind==='bowl'?t('已記下共用食盆：全家約吃下 {householdCare} g。不會算到個別毛孩。',{householdCare:bowlEaten(record.householdCare)}):t('已記下家庭清砂。未指派前不會進個別毛孩的摘要。'));}};
 const nameOf=id=>labels[rows.findIndex(row=>row.id===id)]||rows.find(row=>row.id===id)?.name||t('這隻毛孩');
 const assign=async record=>{const catId=targets[record.id];if(!catId){setError(t('請先選要指派給哪一隻。'));return;}setNotice('');
  await write(d=>assignHouseholdCare(d,record.id,catId),info=>{setUndo(info);setNotice(t('已指派給 {catId}，變成牠的紀錄，會進牠的摘要。',{catId:nameOf(catId)}));});};
 const revert=async()=>{if(!undo)return;const info=undo;await write(d=>({data:undoAssignHouseholdCare(d,info)}),()=>{setUndo(null);setNotice(t('已復原，這筆回到家庭紀錄。'));});};
 const list=householdCareRows(data,{today,days:7}),bowl=householdBowlTotals(data,today),litter=householdLitterTotals(data,today);
 const input=(label,key,extra={})=>h('label',{className:'fhc-field'},h('span',null,label),h('input',{type:'text',inputMode:extra.decimal?'decimal':'numeric',value:form[key],placeholder:extra.placeholder||'',disabled:busy,'aria-label':label,onChange:e=>{setForm(f=>({...f,[key]:e.target.value}));setError('');}}));
 const preview=kind==='bowl'?(()=>{const i=number(form.initial),a=number(form.added),l=number(form.left);return i!==null&&a!==null&&l!==null&&i+a>0&&i+a<=BOWL_MAX_G&&l<=i+a?t('全家約吃下 {round} g',{round:round(i+a-l)}):'';})():'';
 return h('section',{ref:section,className:'family-household-care','aria-label':t('家庭共用食盆與清砂')},
  h('h2',null,t('不知道是哪隻？記成家庭紀錄')),
  h('p',{className:'fhc-lead'},t('多貓共用食盆或砂盆時，先記全家的量。不會分攤到個別毛孩；確定是誰時再指派。')),
  h('div',{className:'fhc-totals'},
   h('span',null,h('small',null,t('今天全家吃下（共用食盆）')),h('strong',null,bowl.todayCount?`${bowl.today} g`:'—'),h('small',null,bowl.weekCount?t('近 7 天 {week} g · {weekCount} 筆',{week:bowl.week,weekCount:bowl.weekCount,count:bowl.weekCount}):t('近 7 天尚無紀錄'))),
   h('span',null,h('small',null,t('今天家庭清砂')),h('strong',null,litter.count?t('尿團 {urineClumps} · 便便 {stoolCount}',{urineClumps:litter.urineClumps,stoolCount:litter.stoolCount}):'—'),h('small',null,t('未指派，不進個別摘要')))),
  h('div',{className:'fhc-tabs',role:'group','aria-label':t('要記哪一種')},[['bowl',t('共用食盆')],['litter',t('家庭清砂')]].map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':kind===id,className:kind===id?'is-on':'',disabled:busy,onClick:()=>{setKind(id);setError('');setNotice('');}},label))),
  h('form',{className:'fhc-form','data-household-kind':kind,noValidate:true,onSubmit:save},
   kind==='bowl'?h(R.Fragment,null,
    h('div',{className:'fhc-row'},input(t('開始時盆內總量（g）'),'initial',{decimal:true,placeholder:t('包含原有剩量')}),input(t('期間另外補入（g）'),'added',{decimal:true,placeholder:t('沒有補入填 0')}),input(t('結束時剩量（g）'),'left',{decimal:true,placeholder:t('吃完填 0')})),
    h('p',{className:'fhc-hint'},preview||t('三欄填同一段觀察期間的量，開始量加補入量合計最多 {BOWL_MAX_G} g；不知道的先不要記成 0。',{BOWL_MAX_G})),
    h('p',{className:'fhc-hint'},t('記錄時間是這段觀察結束的時間。只有期間沒有倒掉、灑出或移走食物，開始量＋補入量－剩量才可當作約吃下量；有其他損耗時先不要用這筆估算。'))):
   h(R.Fragment,null,
    h('div',{className:'fhc-row'},input(t('尿團（團）'),'urineClumps',{placeholder:t('確認沒有填 0')}),input(t('便便（坨）'),'stoolCount',{placeholder:t('確認沒有填 0')})),
    h('p',{className:'fhc-hint'},t('清一次砂盆看到的總數，兩欄都要填，確認沒有才填 0。之後確定是哪隻，可以在下面指派。'))),
   error&&h('p',{className:'family-error',role:'alert'},error),
   h('button',{type:'submit',className:'fhc-save',disabled:busy},busy?t('儲存中…'):kind==='bowl'?t('記下共用食盆'):t('記下家庭清砂'))),
  notice&&h('p',{className:'fhc-notice',role:'status'},notice,undo&&h('button',{type:'button',className:'fhc-undo',disabled:busy,onClick:revert},t('復原'))),
  list.length>0&&h('div',{className:'fhc-list'},h('h3',null,t('近 7 天家庭紀錄')),list.slice(0,10).map(record=>h('article',{key:record.id,className:'fhc-item'},
   h('p',null,h('small',null,`${shortDate(record.date)} ${record.time} · ${record.householdCare.kind==='bowl'?t('共用食盆'):t('家庭清砂')}`),h('span',null,displayStoredText(householdCareText(record.householdCare)))),
   h('div',{className:'fhc-assign'},h('select',{'aria-label':t('指派給哪一隻'),value:targets[record.id]||'',disabled:busy,onChange:e=>setTargets(t=>({...t,[record.id]:e.target.value}))},h('option',{value:''},t('保留家庭紀錄')),rows.map((row,index)=>h('option',{key:row.id,value:row.id},labels[index]||row.name))),
    h('button',{type:'button',disabled:busy||!targets[record.id],onClick:()=>assign(record)},t('指派'))))),
   h('p',{className:'fhc-hint'},t('未指派：保留為家庭紀錄，不會進個別毛孩的摘要。指派後：變成那隻的紀錄，會進牠的摘要。'))));
}
