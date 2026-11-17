import {feedingMealGroups} from './clear-presentation.js?v=audit1117';
import {calendarDay,localCalendarDate,localObservationCutoff} from './today-overview-v29.js?v=8f5745b7843b';
import {dietMeal,dietNumber,dietNumeric,DIET_SOURCES} from './diet-observations-model.js?v=photo-simplify1';
import {careDoneName,recordKindLabel} from './record-quantity.js?v=1';
import {t, K} from './i18n.js?v=audit1117b';

export const CARE_INSIGHT_LIMITS=t('只並列目前毛孩已保存、非示範且歸屬已確認的紀錄。同一天或時間先後不代表因果或統計相關；未記錄不代表 0、正常或沒有發生。有記錄也不保證涵蓋全天。不診斷、不建議改藥或自行換食。');
export const CARE_INSIGHT_SAFETY=t('若有呼吸困難、昏倒、抽搐或無法排尿，請立即聯絡急診獸醫。已確認持續完全不進食時，請儘速聯絡獸醫，不要等紀錄累積；幼貓或有既有疾病者更應及早聯絡。');
export const CARE_INSIGHT_MODE=t('這份紀錄預覽免費、不上傳。可請 AI 整理看診重點與近期變化，確認並同意後才送出，會用 1 次進階模式額度。');
export const CARE_INSIGHT_SOURCES=DIET_SOURCES;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const demo=r=>r?.demo===true||String(r?.source||'').includes(K('示範'))||String(r?.familyId||'').startsWith('food-demo')||r?.source===K('聲音反應');
const live=(r,catId)=>r&&typeof r==='object'&&r.ownership!=='unconfirmed'&&(!own(r,'catId')||r.catId===catId)&&!r.deleted&&!r.deletedAt&&!r.isDeleted&&!r.draft&&!['draft','deleted'].includes(r.status)&&r.confirmed!==false&&!demo(r)&&!r.handover&&r.source!==K('家庭交接')&&![K('交接'),K('家庭交接'),K('聲音反應')].includes(r.category)&&![K('交接'),K('家庭交接')].includes(r.kind);
const shift=(date,n)=>new Date((calendarDay(date)+n)*864e5).toISOString().slice(0,10);
const order=(a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.key.localeCompare(b.key);
const text=value=>typeof value==='string'&&value.trim()?value.trim():'';
const unique=rows=>{
 const groups=new Map();for(const row of rows){if(typeof row.id!=='string'||!row.id.trim())continue;if(!groups.has(row.id))groups.set(row.id,[]);groups.get(row.id).push(row)}
 const accepted=[],conflicts=[];for(const [id,group] of groups){if(new Set(group.map(r=>JSON.stringify(r))).size>1)conflicts.push(id);else accepted.push(group[0])}return {accepted,conflicts};
};
function source(row,kind){
 const isCare=kind==='care';return {key:kind+':'+row.id,id:row.id,kind,date:row.date,time:validTime(row.time)?row.time:null,approximate:row.uncertain===true,label:isCare?t('已記下的疫苗驅蟲'):kind==='change'?(text(row.kind)||t('生活變化')):(recordKindLabel(row)||t('其他')),text:isCare?t('{row}（名稱照飼主在提醒填的內容；實際用藥以獸醫處方為準）', {row: careDoneName(row)}):kind==='change'?(text(row.note)||t('說明未知')):(text(row.text)||t('原文未知')),method:text(row.source)||t('記錄方式未知'),row};
}
/** Read-only projection of one selected cat's store. Legacy rows without catId
 * are permitted only because the host passes that cat's own arrays, never root-
 * wide merged rows. Missing times remain unknown and do not imply midnight. */
export function buildCareInsights({entries=[],foodCards=[],changes=[],careItems=[],catId,today=localCalendarDate(),end=today,windowDays=7,saveStatus='saved',now=new Date(),isDemo=demo,isDemoChange=demo,isDemoCare=demo}={}){
 const base={mode:CARE_INSIGHT_MODE,limits:CARE_INSIGHT_LIMITS,safety:CARE_INSIGHT_SAFETY,safetyFree:true};
 if(typeof catId!=='string'||!catId.trim())return {...base,error:t('請先確認目前毛孩，尚未整理紀錄。')};
 if(saveStatus!=='saved')return {...base,error:t('仍有未保存的變更，請先完成或重試本機保存。安全提醒不受保存狀態影響。')};
 if(calendarDay(today)===null||calendarDay(end)===null||end>today||![7,14,30].includes(windowDays))return {...base,error:t('請選擇今天或以前的有效日期與 7、14 或 30 天範圍。')};
 const dateNow=new Date(now);if(!Number.isFinite(dateNow.getTime()))return {...base,error:t('目前時間無效，無法確認紀錄範圍。')};
 const start=shift(end,1-windowDays),late=localObservationCutoff(dateNow),notFuture=r=>r.date<=today&&!late(r.date,r.time);
 const inRange=r=>r.date>=start&&r.date<=end;
 const clean=(rows,predicate)=>unique((Array.isArray(rows)?rows:[]).filter(r=>live(r,catId)&&!predicate(r)));
 const entryData=clean(entries,isDemo),changeData=clean(changes,isDemoChange),careData=clean(careItems,isDemoCare),cardData=clean(foodCards,demo);
 const records=entryData.accepted.filter(r=>calendarDay(r.date)!==null&&notFuture(r));
 const recordIds=new Set(records.map(r=>r.id));
 const eventRows=changeData.accepted.filter(r=>calendarDay(r.date)!==null&&notFuture(r)&&(!r.sourceEntryId||recordIds.has(r.sourceEntryId)));
 const careRows=careData.accepted.flatMap(item=>[...new Set([...(Array.isArray(item.history)?item.history:[]),item.last].filter(date=>calendarDay(date)!==null&&date<=today))].map(date=>({id:`care:${item.id}:${date}`,careId:item.id,date,time:null,text:item.name,source:t('完成紀錄'),item})));
 const sources=[...records.filter(inRange).map(r=>source(r,'record')),...eventRows.filter(inRange).map(r=>source(r,'change')),...careRows.filter(inRange).map(r=>source(r,'care'))].sort(order);
 const sourceByKey=new Map(sources.map(s=>[s.key,s])),foodSources=sources.filter(s=>s.kind==='record'&&s.row.category===K('飲食')&&s.row.feeding&&typeof s.row.feeding==='object');
 const meals=new Map(),mealKeys=new Map(feedingMealGroups(foodSources.map(s=>s.row)).flatMap(g=>g.rows.map(row=>[row,g.key])));
 for(const s of foodSources){const row=s.row,key=mealKeys.get(row);if(!meals.has(key))meals.set(key,{key,date:row.date,time:s.time,sources:[],foods:[]});const meal=meals.get(key);meal.sources.push(s);const d=dietMeal(row,cardData.accepted);meal.foods.push({sourceKey:s.key,foodId:row.feeding?.foodId||null,name:d.card?.name||row.feeding?.quickName||t('食品名稱未知'),version:d.card?.version??null,quantity:d.quantity,kcal:d.kcal,formula:d.formula||null,amountError:d.amountError||'',kcalReason:d.kcalReason||'',cardKnown:!!d.card});}
 const mealRows=[...meals.values()].sort((a,b)=>b.date.localeCompare(a.date)||(b.time||'').localeCompare(a.time||''));
 const related=sources.filter(s=>!(s.kind==='record'&&s.row.category===K('飲食')&&s.row.feeding&&typeof s.row.feeding==='object')),byDate=new Map();for(const s of related){if(!byDate.has(s.date))byDate.set(s.date,[]);byDate.get(s.date).push(s);}
 const associations=mealRows.map(m=>({...m,related:byDate.get(m.date)||[],explanation:t('按相同紀錄日期一起回顧，不以食物、藥物或生活變化推定原因。')})).filter(m=>m.related.length);
 const associationDates=new Set(associations.map(a=>a.date));
 const foodDates=new Set(foodSources.map(s=>s.date)),unknownAmount=mealRows.flatMap(m=>m.foods).filter(f=>!f.quantity),missingCard=mealRows.flatMap(m=>m.foods).filter(f=>!f.cardKnown),unknownTimes=sources.filter(s=>!s.time);
 const urgentSources=[...foodSources,...records.filter(r=>r.category===K('飲食')&&r.date===today&&!inRange(r)).map(r=>source(r,'record'))].filter(s=>s.row.feeding?.noEatingConfirmed===true);for(const s of urgentSources)sourceByKey.set(s.key,s);
 const noEating=urgentSources.map(s=>({sourceKey:s.key,text:`${s.date} ${s.time||t('時間未知')} ${t('主人曾勾選「完全不進食」。若目前仍完全不進食，請儘速聯絡獸醫；不需等資料累積。')}${dietNumeric(s.row.feeding?.eaten)!==0?t('這筆吃下量與勾選狀態需核對，不能用它計算不進食時長。'):''}`}));
 const nextSteps=[];const add=(id,content,refs=[])=>nextSteps.push({id,text:content,sourceKeys:refs});
 if(!foodSources.length)add('add-meal',t('先記下實際一餐與當時食品版本；吃下量不知道就留空，不要用提供量代替。'));
 if(unknownAmount.length)add('unknown-intake',t('{count} 筆實際吃下量未知或無法換算。可以回原紀錄核對，無法確認就維持未知。', {count: unknownAmount.length}),unknownAmount.map(f=>f.sourceKey));
 if(missingCard.length)add('missing-food',t('{count} 筆缺少唯一可用的當時食品卡。先核對原食品版本；不套用新版營養標示。', {count: missingCard.length}),missingCard.map(f=>f.sourceKey));
 if(!associations.length)add('need-context',t('目前沒有可並列的同日飲食與其他照護事件。下次觀察到排泄、嘔吐、精神或生活變化時，記下實際日期與時間；沒觀察到不要補成正常。'));
 if(unknownTimes.length)add('unknown-time',t('{count} 筆時間未知，只能按日期一起回顧，不能說發生在餐前或餐後。', {count: unknownTimes.length}),unknownTimes.map(s=>s.key));
 if(associations.length)add('review-together',t('核對同日原紀錄；若症狀持續、反覆或你擔心，帶這些日期、食物版本與觀察內容詢問獸醫。不要自行改藥，也不從這些先後紀錄決定換食。'),sources.filter(s=>associationDates.has(s.date)).map(s=>s.key));
 const conflicts=[...entryData.conflicts,...changeData.conflicts,...careData.conflicts,...cardData.conflicts];
 return {...base,error:'',start,end,today,windowDays,sources,sourceByKey,meals:mealRows,associations,noEating,nextSteps,coverage:{sourceCount:sources.length,mealCount:mealRows.length,foodRowCount:foodSources.length,foodDays:foodDates.size,missingDays:Array.from({length:windowDays},(_,i)=>shift(start,i)).filter(date=>!sources.some(s=>s.date===date)),unknownAmounts:unknownAmount.length,unknownTimes:unknownTimes.length,conflicts:conflicts.length},sufficiency:foodDates.size<3?t('飲食紀錄少於 3 個日期，目前只列已知事實；這是呈現規則，不是醫療等待門檻，也不代表 3 天後就能判斷原因。'):t('可回顧多日紀錄，但記錄完整度與觀察條件未知；不計算因果、風險分數或改善／惡化結論。')};
}
export function careInsightQuantity(food){return food.quantity?`${dietNumber(food.quantity.amount)} ${food.quantity.unit}`:t('未知');}
