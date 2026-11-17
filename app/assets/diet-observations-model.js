import {t, K} from './i18n.js?v=audit1117b';
import {calendarDay,localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';
import {eligibleRecords} from './health-summary-v31.js?v=photo-simplify1';

export const DIET_SOURCES=Object.freeze({aaha:'https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/prevention-of-obesity/',cornell:'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/anorexia'});
export const DIET_LIMITS=t('只計算此毛孩已保存、歸屬已確認的非示範紀錄。未填不當成 0；有記錄不保證涵蓋全天。這是紀錄觀察，不是診斷、營養是否足夠的判斷或餵食處方。');
export const NO_EATING_NOTICE=t('已確認完全不進食時，請儘速聯絡獸醫，不要等待比較天數或紀錄累積。');
export const dietNumber=n=>Number(n.toPrecision(6)).toString();
const demo=r=>r?.demo===true||String(r?.source||'').includes(K('示範'))||String(r?.familyId||'').startsWith('food-demo');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const live=(r,catId)=>r&&r.ownership!=='unconfirmed'&&(!own(r,'catId')||r.catId!==null&&r.catId===catId)&&!r.deleted&&!r.deletedAt&&!r.isDeleted&&!r.draft&&!['draft','deleted'].includes(r.status)&&r.confirmed!==false&&!demo(r)&&!r.handover&&r.source!==K('家庭交接');
const order=(a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||''))||String(a.id).localeCompare(String(b.id));
const knownCategory=value=>['staple-wet','dry','complementary-wet','treat','fresh'].includes(value);
export function dietNumeric(value){if(!['string','number'].includes(typeof value)||!/^\d+(?:\.\d+)?$/.test(String(value).trim()))return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&!(n===0&&/[1-9]/.test(String(value)))?n:null;}
const unit=value=>({g:['g',1],公克:['g',1],kg:['g',1000],公斤:['g',1000],ml:['ml',1],毫升:['ml',1],包:[K('包'),1],罐:[K('罐'),1],顆:[K('顆'),1],片:[K('片'),1]})[value];
export function dietQuantity(row){
 const f=row?.feeding;if(!f)return {error:t('未填結構化實際吃下量')};
 const eaten=dietNumeric(f.eaten),provided=dietNumeric(f.provided),providedMissing=f.provided===undefined||f.provided===null||typeof f.provided==='string'&&!f.provided.trim(),u=unit(f.unit);
 if(eaten===null)return {error:t('實際吃下量未填或不是有效的非負數字')};
 if(!providedMissing&&(provided===null||eaten>provided))return {error:t('提供量無效，或吃下量大於提供量')};
 if(!u)return {error:t('實吃單位尚不支援，不能換算')};
 const amount=eaten*u[1];return Number.isFinite(amount)?{amount,unit:u[0],error:''}:{error:t('數量過大，無法計算')};
}
export const validDietFeeding=f=>f?.noEatingConfirmed===undefined||typeof f.noEatingConfirmed==='boolean';
// Existing food-card schema stores the field labelled 每包淨重（g） as a numeric string.
export function dietPackageGrams(value){const numeric=dietNumeric(value);if(numeric!==null)return numeric>0?numeric:null;const match=String(value??'').trim().match(/^(\d+(?:\.\d+)?)\s*(g|公克|kg|公斤)$/);if(!match)return null;const grams=dietNumeric(match[1])*unit(match[2])[1];return Number.isFinite(grams)&&grams>0?grams:null;}
export function dietMeal(row,cards=[]){
 const matches=cards.filter(card=>card?.id===row.feeding?.foodId),card=matches.length===1?matches[0]:null,q=dietQuantity(row),result={row,card,quantity:q.error?null:q,amountError:q.error,name:card?.name||row.feeding?.quickName||t('未連結食品'),kcal:null,kcalReason:'',category:card?.foodCategory||null};
 const unavailable=reason=>({...result,kcalReason:reason});
 if(q.error)return unavailable(q.error);
 if(!card||demo(card))return unavailable(t('缺少可用的當時食品版本或此食品是示範'));
 const nutrients=Array.isArray(card.nutrients)?card.nutrients.filter(n=>n.name===K('熱量')):[];
 if(nutrients.length!==1)return unavailable(t('當時食品版本缺少唯一的熱量標示'));
 const label=nutrients[0],value=dietNumeric(label.value);
 if(value===null||value<=0||label.unit!=='kcal'||label.bound!==K('標示值'))return unavailable(t('需要大於 0 的 kcal 標示值；不採用最低／最高值'));
 const basis=String(label.basis||'').replace(/\s+/g,''),u=q.unit;let multiplier=null;
 if(basis===K('每100g')&&u==='g')multiplier=q.amount/100;
 if(basis===K('每kg')&&u==='g')multiplier=q.amount/1000;
 if(basis===K('每包')&&u===K('包'))multiplier=q.amount;
 if(basis===K('每包')&&u==='g'){
  const weight=dietPackageGrams(card.netWeight);
  if(weight>0&&Number.isFinite(weight))multiplier=q.amount/weight;
 }
 if(multiplier===null)return unavailable(t('熱量基準與實吃單位不相容；每包換算重量需要有效的每包淨重（g）'));
 const kcal=value*multiplier;
 if(!Number.isFinite(kcal)||q.amount>0&&kcal===0)return unavailable(t('換算結果超出可計算範圍，無法計算'));
 return {...result,kcal,kcalReason:'',label:{value,unit:label.unit,basis:label.basis,bound:label.bound},formula:`${dietNumber(q.amount)} ${q.unit} × ${value} kcal${t('／')}${t(label.basis)}${basis===K('每包')&&u==='g'?t('（每包淨重 ')+dietNumber(dietPackageGrams(card.netWeight))+t(' g）'):''}`};
}
export function summarizeDietRows(rows=[],cards=[]){
 const meals=rows.filter(r=>r.category===K('飲食')&&r.feeding),details=meals.map(row=>dietMeal(row,cards)),groups=new Map();
 for(const d of details){const key=(d.row.feeding?.foodId||'unlinked:'+d.row.id)+'|'+(d.quantity?.unit||'unknown');if(!groups.has(key))groups.set(key,{key,name:d.name,foodId:d.row.feeding?.foodId||null,version:d.card?.version??null,unit:d.quantity?.unit||'',total:0,unknown:0,rows:[]});const g=groups.get(key);g.rows.push(d.row);if(d.quantity&&Number.isFinite(g.total+d.quantity.amount))g.total+=d.quantity.amount;else g.unknown++;}
 const sum=details.reduce((n,d)=>n+(d.kcal??0),0),complete=details.length>0&&details.every(d=>d.kcal!==null)&&Number.isFinite(sum),totalKcal=complete?sum:null,categoryComplete=details.every(d=>knownCategory(d.category)),treatKcal=complete&&categoryComplete?details.filter(d=>d.category==='treat').reduce((n,d)=>n+d.kcal,0):null;
 return {rows:meals,details,groups:[...groups.values()],days:new Set(meals.map(r=>r.date)).size,knownAmounts:details.filter(d=>d.quantity).length,totalKcal,treatKcal,treatPercent:totalKcal>0&&treatKcal!==null?treatKcal/totalKcal*100:null,missingEnergy:details.filter(d=>d.kcal===null).length,missingCategory:details.filter(d=>!knownCategory(d.category)).length,urgentRows:details.filter(d=>d.row.feeding?.noEatingConfirmed===true&&d.quantity?.amount===0).map(d=>d.row)};
}
export function buildDietModel({entries=[],foodCards=[],changes=[],catId,today=localCalendarDate(),date=today,isDemo=demo,isDemoChange=demo,saveStatus='saved'}={}){
 if(saveStatus!=='saved')return {error:t('仍有未保存變更，請先完成或重試本機保存。')};
 if(calendarDay(date)===null||calendarDay(today)===null||date>today)return {error:t('請選擇今天或以前的有效日期。')};
 const rows=eligibleRecords(entries.filter(r=>live(r,catId)),today,catId,isDemo).filter(r=>r.category===K('飲食')&&r.feeding),seen=new Set(),events=changes.filter(r=>live(r,catId)&&!isDemoChange(r)&&typeof r.id==='string'&&r.id&&[K('換飼料'),K('換糧')].includes(r.kind)&&calendarDay(r.date)!==null&&r.date<=today&&(!r.sourceEntryId||rows.some(e=>e.id===r.sourceEntryId))).sort(order).filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true});
 return {error:'',date,today,rows,foodCards,events,day:summarizeDietRows(rows.filter(r=>r.date===date),foodCards)};
}
export function compareDietDates(model,beforeDate,afterDate){
 if(model.error)return {error:model.error};
 if([beforeDate,afterDate].some(d=>calendarDay(d)===null||d>model.today)||beforeDate>=afterDate)return {error:t('請選擇有效且先後不同的日期，不能選未來日期。')};
 const before=summarizeDietRows(model.rows.filter(r=>r.date===beforeDate),model.foodCards),after=summarizeDietRows(model.rows.filter(r=>r.date===afterDate),model.foodCards),changes=[];
 for(const a of before.groups){const b=after.groups.find(g=>g.key===a.key);if(a.foodId&&b&&a.unit&&!a.unknown&&!b.unknown){const related=[...before.details,...after.details].filter(d=>d.row.feeding?.foodId===a.foodId);if(related.every(d=>d.quantity?.unit===a.unit)){const percent=a.total>0?(b.total-a.total)/a.total*100:null;changes.push({key:a.key,name:a.name,version:a.version,unit:a.unit,before:a.total,after:b.total,delta:b.total-a.total,percent:percent!==null&&Number.isFinite(percent)?percent:null,percentReason:a.total===0?'baseline-zero':Number.isFinite(percent)?'':'out-of-range',rows:[...a.rows,...b.rows]});}}}
 return {error:'',beforeDate,afterDate,before,after,changes};
}
export function dietSummaryLines(summary){return [...summary.urgentRows.map(row=>t('{date} {time} 主人記下完全不進食；若目前仍未進食，請儘速聯絡獸醫，不要等待比較天數。', {date: row.date, time: row.time})),summary.rows.length?t('{n} 筆餵食紀錄，{days} 天有記錄；{knownAmounts} 筆有有效吃下量。', {n: summary.rows.length, days: summary.days, knownAmounts: summary.knownAmounts}):t('尚無餵食紀錄，不代表沒有吃飯。'),...summary.groups.map(g=>t('{name}{version}：{amount}{unknown}', {name: g.name, version: g.version!==null?t(' · 當時 v{version}', {version: g.version}):'', amount: g.unit?t('已記錄吃下量 {total} {unit}', {total: dietNumber(g.total), unit: t(g.unit)}):t('吃下量未知'), unknown: g.unknown?t('；{unknown} 筆未計入', {unknown: g.unknown}):''})),summary.totalKcal===null?t('熱量資料不足，暫不加總；缺量或缺熱量不當成 0。'):t('已記錄攝取熱量估算 {v0} kcal（依當時食品標示，不是全天總量或建議攝取量）。', {v0: dietNumber(summary.totalKcal)}),summary.treatPercent===null?t('零食熱量占比資料不足或總熱量為 0，暫不計算。'):t('零食占已記錄熱量 {v0}%（{v1}／{v2} kcal），不是重量占比，也不代表全天占比。', {v0: dietNumber(summary.treatPercent), v1: dietNumber(summary.treatKcal), v2: dietNumber(summary.totalKcal)})]}
