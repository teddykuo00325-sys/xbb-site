import {activePetEntries} from './pet-archive.js?v=8f5745b7843b';
import {feedingMealGroups,feedingMealRows} from './clear-presentation.js?v=audit1117';
import {calendarDay,localCalendarDate,laterToday} from './today-overview-v29.js?v=8f5745b7843b';
import {dietNumeric,dietQuantity} from './diet-observations-model.js?v=photo-simplify1';
import {vetSourceData,vetPeriod,vetShift,vetFoodGroups,sourceDescription} from './advanced-vet-model.js?v=photo-simplify1';
import {t, K} from './i18n.js?v=audit1117b';

export const CARE_ROOT_CAT_ID='cat-original';
export const CARE_FOCUS=['intake','urine','stool','vomit','mood','weight'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const demo=r=>r?.demo===true||String(r?.source||'').includes(K('示範'))||String(r?.familyId||'').startsWith('food-demo');
const fail=message=>{throw Error(message)};
const day=date=>calendarDay(date)!==null;
const missing=rows=>rows.filter(r=>r.category===K('飲食')&&r.feeding&&!!dietQuantity(r).error);
const dates=(start,end)=>{const count=calendarDay(end)-calendarDay(start)+1;return count>0?Array.from({length:count},(_,i)=>vetShift(start,i)):[]};
const freshId=prefix=>`${prefix}-${globalThis.crypto.randomUUID()}`;
const clock=now=>{const d=now===undefined?new Date():new Date(now);if(!Number.isFinite(d.getTime()))fail(t('建立時間無效。'));return {stamp:d.toISOString(),today:localCalendarDate(d)}};

/** Root's legacy fields are the original cat; never copy them into multiCat. */
export function listCareCats(root){
 return activePetEntries(root.multiCat).map(c=>{const data=c.id===CARE_ROOT_CAT_ID?root:c.data;return {id:c.id,profile:data.cat||{},data};});
}
function catOf(root,id){const matches=listCareCats(root).filter(c=>c.id===id);if(matches.length!==1)fail(t('找不到這隻毛孩，未更動資料。'));return matches[0]}
function replaceCat(root,id,data){return id===CARE_ROOT_CAT_ID?data:{...root,multiCat:{...root.multiCat,cats:root.multiCat.cats.map(c=>c.id===id?{...c,data}:c)}}}
function foodOf(data,id,catId){
 if(id===''||id===null||id===undefined)return null;
 const cards=(data.foodCards||[]).filter(c=>c.id===id&&!demo(c)&&!c.deleted&&!c.deletedAt&&!c.isDeleted&&c.ownership!=='unconfirmed'&&(!own(c,'catId')||c.catId===catId));
 if(cards.length!==1)fail(t('食品不屬於這隻毛孩，或已無法確認食品版本。'));return cards[0];
}
function validateJourney(root,j,today){
 const {data}=catOf(root,j.catId);
 if(!['food-change','vet'].includes(j.kind))fail(t('請選擇換糧或看診準備。'));
 if(!day(j.start)||j.start>today||j.end&&(!day(j.end)||j.end<j.start))fail(t('開始日須為今天或以前，預定結束／回診日不得早於開始日。'));
 if(!Array.isArray(j.focus)||j.focus.some(v=>!CARE_FOCUS.includes(v)))fail(t('觀察項目無效。'));
 if(!['active','completed'].includes(j.status))fail(t('任務狀態無效。'));
 if(typeof j.question!=='string'||j.question.length>2000)fail(t('想問獸醫的問題請控制在 2000 字內。'));
 for(const id of [j.oldFoodId,j.newFoodId]){if(id!==null&&id!==undefined&&typeof id!=='string')fail(t('食品版本無效。'));foodOf(data,id,j.catId)}
 return data;
}
function changeFor(j,data){
 const label=id=>{const f=(data.foodCards||[]).find(f=>f.id===id);return f?`${f.name}（v${f.version??K('未知')}，ID ${f.id}）`:K('未填／未知')};
 return {id:`journey-change-${j.id}`,journeyId:j.id,catId:j.catId,date:j.start,kind:K('換糧'),note:K(`換糧前：${label(j.oldFoodId)}；換糧後：${label(j.newFoodId)}${j.question?K('；想觀察：')+j.question:''}`),oldFoodId:j.oldFoodId,newFoodId:j.newFoodId,uncertain:false,source:K('照護任務手動記錄'),demo:false};
}
export function createCareJourney(root,input,{id=freshId('journey'),now}={}){
 const {stamp,today}=clock(now);
 if(typeof id!=='string'||!id||(root.careJourneys||[]).some(j=>j.id===id))fail(t('任務識別碼重複或無效。'));
 const j={id,catId:input.catId,kind:input.kind,start:input.start,...(input.end?{end:input.end}:{}),oldFoodId:input.oldFoodId??'',newFoodId:input.newFoodId??'',focus:[...new Set(input.focus??CARE_FOCUS)],question:input.question??'',status:input.status??'active',createdAt:stamp};
 const data=validateJourney(root,j,today);
 let next=root;
 if(j.kind==='food-change'){
  const change=changeFor(j,data);if((data.changes||[]).some(c=>c.id===change.id))fail(t('生活變化識別碼重複。'));
  next=replaceCat(root,j.catId,{...data,changes:[...(data.changes||[]),change]});
 }
 return {...next,careJourneys:[...(root.careJourneys||[]),j]};
}
export function updateCareJourney(root,id,patch){
 const old=(root.careJourneys||[]).find(j=>j.id===id);if(!old)fail(t('找不到照護任務。'));
 if(Object.keys(patch).some(k=>!['start','end','oldFoodId','newFoodId','focus','question','status'].includes(k)))fail(t('不可更動任務識別、毛孩或建立時間。'));
 const j={...old,...patch,...(patch.focus?{focus:[...new Set(patch.focus)]}:{})};
 validateJourney(root,j,localCalendarDate());
 // Preserve the original change note verbatim as an audit source. Amendments live
 // in the journey, and must not rewrite the historical event or meal versions.
 return {...root,careJourneys:root.careJourneys.map(row=>row.id===id?j:row)};
}
function source(root,catId,today){if(!day(today))fail(t('今天日期無效。'));const cat=catOf(root,catId);return {cat,data:vetSourceData({...cat.data,catId,today,isDemo:demo,isDemoChange:demo,isDemoCare:demo})}}
/** Edit an existing food row without erasing its meal identity or provenance.
 * A meal owns one date/time; updating a part moves its siblings together. */
export function preserveMealEntry(rows, entry) {
 const old=rows.find(row=>row.id===entry.id);
 if(!old)return [entry,...rows];
 const siblings=new Set(feedingMealRows(old,rows));
 const updated={...old,...entry,source:old.source||entry.source,feeding:{...old.feeding,...entry.feeding}};
 return rows.map(row=>row.id===old.id?updated:old.mealGroupId&&siblings.has(row)?{...row,date:updated.date,time:updated.time,feeding:{...row.feeding,date:updated.date,time:updated.time}}:row);
}
export function careMealGroups(rows=[]){
 return feedingMealGroups(rows).map(({rows})=>({id:rows[0].mealGroupId||rows[0].id,date:rows[0].date,time:rows[0].time,rows,parts:rows.map(row=>row.feeding)}));
}
export function journeyOverview(root,catId,today=localCalendarDate()){
 const {data}=source(root,catId,today),meals=careMealGroups(data.records),mealsToday=meals.filter(m=>m.date===today);
 const journeys=(root.careJourneys||[]).filter(j=>j.catId===catId&&day(j.start)&&j.start<=today&&!j.deleted&&!j.deletedAt&&!j.isDeleted&&!demo(j)).map(j=>{
  const end=j.end&&j.end<today?j.end:today,rows=data.records.filter(r=>r.date>=j.start&&r.date<=end);
  return {...j,foods:{old:(data.foodCards||[]).find(f=>f.id===j.oldFoodId)||null,new:(data.foodCards||[]).find(f=>f.id===j.newFoodId)||null},daysWithRecords:new Set(rows.map(r=>r.date)).size,recordCount:rows.length};
 });
 return {journeys,mealsToday,missingEaten:missing(data.records.filter(r=>r.date===today)),latestMeal:meals.at(-1)||null};
}
function period(data,start,end){const p=vetPeriod(data,start,end);return {...p,daysWithRecords:p.recordedDays,recordCount:p.rows.length,missingDates:dates(start,end).filter(d=>!p.rows.some(r=>r.date===d)),missingEaten:missing(p.rows),foodGroups:p.foods}}
export function journeyReport(root,journeyId,today=localCalendarDate()){
 const journey=(root.careJourneys||[]).find(j=>j.id===journeyId&&!j.deleted&&!j.deletedAt&&!j.isDeleted&&!demo(j));if(!journey)fail(t('找不到可整理的照護任務。'));
 const {cat,data}=source(root,journey.catId,today);if(!day(journey.start)||journey.start>today)fail(t('任務尚未開始。'));
 const end=journey.end&&journey.end<today?journey.end:today,p=period(data,journey.start,end);
 const sourceFacts=[...p.rows.map(r=>({id:r.id,kind:'record',date:r.date,time:r.time,text:sourceDescription(r),row:r})),...p.changes.map(r=>({id:r.id,kind:'change',date:r.date,time:r.time||'',text:sourceDescription(r,'change'),row:r})),...p.care.map(r=>({id:r.id,kind:'care',date:r.date,time:r.time||'',text:sourceDescription(r,'care'),row:r}))].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.id.localeCompare(b.id));
 const afterTarget=vetShift(journey.start,6),afterEnd=[afterTarget,today,end].sort()[0];
 const comparison={eventDate:journey.start,windowDays:7,before:period(data,vetShift(journey.start,-7),vetShift(journey.start,-1)),after:period(data,journey.start,afterEnd),remainingDays:Math.max(0,calendarDay(afterTarget)-calendarDay(afterEnd))};
 return {journey,cat,rows:p.rows,changes:p.changes,care:p.care,missingDates:p.missingDates,missingEaten:p.missingEaten,foodGroups:vetFoodGroups(p.rows,data.foodCards),sourceFacts,comparison};
}
export function saveCareMeal(root,input,{id=freshId('meal'),now}={}){
 const {stamp,today}=clock(now),{data}=catOf(root,input.catId);
 if(!day(input.date)||input.date>today)fail(t('請選擇今天或以前的有效餵食日期。'));
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))fail(t('請填寫有效餵食時間。'));
 if(laterToday(input.date,input.time,stamp))fail(t('餵食時間不能晚於現在。請核對實際餵食時間。'));
 if(typeof id!=='string'||!id||!Array.isArray(input.parts)||!input.parts.length)fail(t('請填寫這一餐的食品。'));
 if(typeof (input.note??'')!=='string')fail(t('備註格式無效。'));
 const existing=(data.entries||[]),ids=new Set(existing.map(r=>r.id));
 if(existing.some(r=>r.mealGroupId===id||r.id===id))fail(t('這一餐已儲存，請勿重複送出。'));
 const rows=input.parts.map((part,index)=>{
  const food=foodOf(data,part.foodId,input.catId);if(!food||food.archived)fail(t('請選擇此毛孩可用的食品卡。'));
  if(part.provided!=null&&!['number','string'].includes(typeof part.provided)||part.eaten!=null&&!['number','string'].includes(typeof part.eaten))fail(t('份量請填有效數字；未知份量可留空。'));
  const provided=String(part.provided??'').trim(),eaten=String(part.eaten??'').trim(),n=dietNumeric(provided),e=dietNumeric(eaten);
  if(provided!==''&&(n===null||n<=0))fail(t('提供量若填寫，須為大於 0 的數字；未知可留空。'));
  if(eaten!==''&&(e===null||provided!==''&&e>n))fail(t('吃下量須為非負數，且不可超過已知提供量；未知可留空。'));
  if(!['g',K('公克'),'kg',K('公斤'),'ml',K('毫升'),K('包'),K('罐'),K('顆'),K('片')].includes(part.unit))fail(t('請選擇有效的份量單位。'));
  const entryId=`${id}-part-${index+1}`;if(ids.has(entryId))fail(t('餵食紀錄識別碼重複。'));ids.add(entryId);
  const feeding={id:entryId,foodId:food.id,date:input.date,time:input.time,provided:provided===''?null:provided,eaten:eaten===''?null:eaten,unit:part.unit,note:input.note??'',change:false};
  return {id:entryId,mealGroupId:id,catId:input.catId,date:input.date,time:input.time,category:K('飲食'),text:K(`${food.name}（v${food.version??K('未知')}）｜提供 ${provided===''?K('未知'):provided+' '+part.unit}，吃下 ${eaten===''?K('未知'):eaten+' '+part.unit}${input.note?'；'+input.note:''}`),amount:feeding.provided,unit:part.unit,source:K('照護任務手動記錄'),demo:false,confirmed:true,createdAt:stamp,feeding};
 });
 return replaceCat(root,input.catId,{...data,entries:[...existing,...rows]});
}

/** Free text never invokes a model or implies structured food/amount facts. */
export function saveCareTextRecord(root,input,{id=freshId('text'),now}={}){
 const {data}=catOf(root,input.catId),{stamp,today}=clock(now);
 if(typeof id!=='string'||!id||(data.entries||[]).some(r=>r.id===id))fail(t('這筆文字已保存，請勿重複送出。'));
 if(!day(input.date)||input.date>today||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))fail(t('請核對有效的日期與時間。'));
 if(typeof input.text!=='string'||!input.text.trim()||input.text.length>4000)fail(t('請填寫 1–4000 字的觀察內容。'));
 const row={id,catId:input.catId,date:input.date,time:input.time,category:K('其他'),text:input.text.trim(),amount:'',unit:'',source:K('文字快記・手動核對'),demo:false,confirmed:true,createdAt:stamp};
 return replaceCat(root,input.catId,{...data,entries:[...(data.entries||[]),row]});
}

/** Review-confirmed AI drafts can only append explicit facts. Each intermediate
 * root is private; if any draft fails, no result or partial mutation escapes. */
export function saveCareAIDrafts(root,drafts,{id=freshId('ai-review'),now}={}){
 if(typeof id!=='string'||!id||!Array.isArray(drafts)||!drafts.length)fail(t('沒有可保存的已核對草稿。'));
 const {stamp,today}=clock(now);let next=root;
 drafts.forEach((draft,index)=>{
  if(!draft||typeof draft!=='object')fail(t('草稿格式無效。'));
  const key=`${id}-${index+1}`;
  if(draft.kind==='meal'){
   const old=catOf(next,draft.catId).data;
   next=saveCareMeal(next,draft,{id:key,now:stamp});
   const data=catOf(next,draft.catId).data;
   next=replaceCat(next,draft.catId,{...data,entries:[...old.entries,...data.entries.slice(old.entries.length).map(row=>({...row,source:K('公司AI・已核對')}))]});
   return;
  }
  if(draft.kind!=='record')fail(t('草稿只接受餵食或日常觀察。'));
  const {data}=catOf(next,draft.catId),categories=[K('排泄'),K('嘔吐'),K('體重'),K('喝水'),K('其他')];
  if(!categories.includes(draft.category)||!day(draft.date)||draft.date>today||!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))fail(t('草稿分類、日期或時間無效。'));
  if(typeof draft.text!=='string'||!draft.text.trim())fail(t('請保留並核對原始觀察內容。'));
  if(draft.amount!=null&&!['number','string'].includes(typeof draft.amount)||draft.unit!=null&&typeof draft.unit!=='string')fail(t('數量或單位格式無效。'));
  const amount=String(draft.amount??'').trim(),unit=draft.unit??'',numeric=dietNumeric(amount),units={體重:['g',K('公克'),'kg',K('公斤')],喝水:['ml',K('毫升')],嘔吐:[K('次')],排泄:[K('次')],其他:[K('次'),'g',K('公克'),'kg',K('公斤'),'ml',K('毫升')]};
  if(amount!==''&&(numeric===null||!units[draft.category].includes(unit)||draft.category===K('體重')&&numeric<=0||unit===K('次')&&!Number.isInteger(numeric)))fail(t('數量及單位不符原始觀察分類。'));
  if(amount===''&&unit!==''&&!units[draft.category].includes(unit))fail(t('觀察單位無效。'));
  if((data.entries||[]).some(r=>r.id===key))fail(t('已核對草稿已保存，請勿重複送出。'));
  const row={id:key,catId:draft.catId,date:draft.date,time:draft.time,category:draft.category,text:draft.text,amount,unit,source:K('公司AI・已核對'),demo:false,confirmed:true,createdAt:stamp};
  next=replaceCat(next,draft.catId,{...data,entries:[...(data.entries||[]),row]});
 });
 return next;
}
