import {t} from './i18n.js?v=audit1117b';
import {displayStoredText,displayUserText,withStoredTexts} from './stored-text.js?v=i18n1';
import {isTextMeal} from './record-quantity.js?v=1';
// Read-only labels: saved categories, food IDs and historical snapshots stay intact.
export function foodCardSubtitle(food,cards=[],{omitLabel=''}={}){
 const description=food.flavor||food.kind;
 const parts=[food.brand,description===omitLabel?'':description].filter(Boolean);
 const same=[];
 for(const f of cards)if(f.name===food.name&&f.brand===food.brand&&(f.flavor||f.kind)===(food.flavor||food.kind)&&!same.some(x=>(x.familyId||x.id)===(f.familyId||f.id)))same.push(f);
 if(same.length>1)parts.push(t('同名食品 {n}',{n:same.findIndex(f=>(f.familyId||f.id)===(food.familyId||food.id))+1}));
 return parts.join(' · ');
}
export const foodChoiceLabel=(food,cards=[])=>[food.name+(food.archived?t('（此食品卡已刪除）'):''),foodCardSubtitle(food,cards)].filter(Boolean).join(' · ');
export function recordTitle(row,cards=[]){
 // 標題顯示用：存檔的中文句型在英文介面翻成英文；食品名是使用者內容，只翻示範資料的固定名稱。
 if(!row?.feeding)return displayStoredText(row?.text||'');
 const food=cards.find(f=>f.id===row.feeding.foodId);
 // 2026-11-17：只翻示範資料的固定名稱；使用者自己打的「雞肉主食罐」剛好和示範字典同字，不能被翻成英文。
 const demo=x=>!!x&&(x.demo===true||String(x.source||'').includes('示範'));
 return food?(demo(food)?displayUserText(food.name):food.name)+(food.archived?t('（此食品卡已刪除）'):''):(demo(row)?displayUserText(row.foodName||row.feeding.quickName):(row.foodName||row.feeding.quickName))||displayStoredText(row.text);
}
export function mealQuantityText(row){
 const f=row?.feeding;if(!f)return '';
 const quantity=value=>value===undefined||value===null||String(value).trim()===''?t('未記錄'):value+' '+t(f.unit||'');
 return t('餵食量 {provided} · 吃下量 {eaten}',{provided:quantity(f.provided),eaten:quantity(f.eaten)});
}

// Group only explicitly linked rows. Equal timestamps alone do not make a meal,
// and records from different cats or dates must never be merged for display.
export function feedingMealGroups(rows=[]){
 const groups=new Map();
 rows.forEach((row,index)=>{
  if(!row?.feeding)return;
  const key=JSON.stringify([row.catId===undefined?'cat-original':row.catId,row.mealGroupId?'meal':'record',row.mealGroupId||index,row.date||'',row.time||'']);
  if(!groups.has(key))groups.set(key,{key,rows:[]});
  groups.get(key).rows.push(row);
 });
 return [...groups.values()];
}
// 餐數口徑（Ian 2026-11-14）：有餵食結構的一餐照同餐連結合併；語音存的餵食（只有文字、metric food）每筆算一餐。
// 一般食慾觀察不算餐。列表、圖表與全家總覽都用這一個。
export function mealCountGroups(rows=[]){
 const text=rows.filter(isTextMeal).map(row=>({key:'text:'+JSON.stringify([row.catId===undefined?'cat-original':row.catId,row.id]),rows:[row],textOnly:true}));
 const groups=[...feedingMealGroups(rows),...text];
 return text.length?groups.sort((a,b)=>(String(a.rows[0].date)+String(a.rows[0].time)).localeCompare(String(b.rows[0].date)+String(b.rows[0].time))):groups;
}
export const isMealRecord=row=>Boolean(row?.feeding)||isTextMeal(row);
// Resolve siblings against the saved row, not the edited date/time in a draft.
export function feedingMealRows(entry,rows=[]){
 if(!entry?.feeding)return [];
 return feedingMealGroups(rows).find(group=>group.rows.includes(entry))?.rows||[entry];
}
export const eatenAmountMissing=feeding=>Boolean(feeding)&&String(feeding.eaten??'').trim()==='';
export function mealNeedsEatenAmount(group,isDemo=()=>false){
 return group.rows.some(row=>!isDemo(row)&&eatenAmountMissing(row.feeding));
}
function mealProgress(rows) {
 const meals=mealCountGroups(rows);
 return {count:meals.length,pending:meals.filter(group=>mealNeedsEatenAmount(group))};
}
export function FeedingHeadline({react:R,rows,onSupplement}){
 const h=R.createElement,{count,pending}=mealProgress(rows);
 const next=pending.reduce((latest,group)=>!latest||group.rows[0].time>latest.rows[0].time?group:latest,null);
 return h('header',{className:'feeding-dashboard-heading feeding-headline'},
  h('h1',null,t('餵食')),
  h('div',{className:'care-reading-card'},
   h('strong',null,count?t('今天已記 {count} 餐', {count}):t('今天還沒有餵食紀錄')),
   next&&h('p',null,t('{n} 餐待補吃下量 · 最近待補 {time}', {n: pending.length, time: next.rows[0].time})),
   next&&h('button',{type:'button',className:'care-reading-action',disabled:!onSupplement,
    onClick:()=>onSupplement(next.rows[0],next.rows)},t('補吃下量'))));
}
export function VetFeedingHeadline({react:R,name,days,rows}){
 const h=R.createElement,{count,pending}=mealProgress(rows);
 const overview=count?t('已記 {count} 餐', {count}):rows.length?t('已記 {n} 筆日常紀錄', {n: rows.length}):t('尚未記錄日常觀察');
 return h('section',{className:'care-reading-card vet-headline','aria-label':t('看診摘要重點')},
  h('p',null,t('{name} · 近 {days} 天', {name, days})),h('strong',null,overview),
  pending.length>0&&h('p',null,t('{n} 餐待補吃下量', {n: pending.length})));
}
const mealAmount=(value,unit)=>value===undefined||value===null||String(value).trim()===''?t('未記錄'):value+(unit?' '+t(unit):'');
function mealRow({react:R,row,cards,onRecord,Attribution,isDemo,currentId}){
  const h=R.createElement;
  const f=row.feeding||{},name=recordTitle(row,cards),provided=mealAmount(f.provided,f.unit),eaten=mealAmount(f.eaten,f.unit);
  return h('button',{type:'button',key:row.id,className:'feeding-meal-row','aria-current':currentId===row.id?'true':undefined,'aria-label':t('{time} {name} 餵食量 {provided} · 吃下量 {eaten} · 查看原紀錄', {time: row.time||'', name, provided, eaten}).trim(),onClick:()=>onRecord(row)},
   h('span',{className:'feeding-meal-icon','aria-hidden':true},h('img',{src:'/xbb-site/app/assets/icons/bowl-food.svg',alt:''})),
   h('span',{className:'feeding-meal-body'},
    h('span',{className:'feeding-meal-head'},h('strong',null,name),h('time',null,row.time)),
    row.feeding?h('span',{className:'feeding-meal-amounts'},h('span',null,t('餵食量 '),h('b',null,provided)),h('span',{className:eaten===t('未記錄')?'is-unknown':undefined},t('吃下量 '),h('b',null,eaten))):h('span',{className:'feeding-meal-amounts'},h('span',{className:'is-unknown'},t('文字紀錄 · 份量未分開填'))),
    Attribution&&h(Attribution,{react:R,row}),isDemo?.(row)&&h('small',{className:'sample-label'},t('示範紀錄 · 不計入看診摘要'))),
   h('span',{className:'feeding-row-chevron','aria-hidden':true},'›'));
}
// The exact saved food version and each unit remain visible. Never sum portions
// across foods, replace unknown with zero, or mutate a historical record.
export function FeedingTodayList({react:R,rows=[],cards=[],onRecord,onSupplement,Attribution,isDemo=()=>false,isEditable=()=>true}){
 const h=R.createElement,render=row=>mealRow({react:R,row,cards,onRecord,Attribution,isDemo});
 return h('div',{className:'feeding-meal-list'},mealCountGroups(rows).map(group=>{
  const [first]=group.rows,multiple=group.rows.length>1;
  const supplement=onSupplement&&mealNeedsEatenAmount(group,isDemo)&&group.rows.every(row=>!isDemo(row)&&isEditable(row));
  if(!multiple&&!supplement)return render(first);
  return h('article',{key:group.key,className:'feeding-meal-group','aria-label':t('{time} 這一餐 · {n} 項食品', {time: first.time||'', n: group.rows.length}).trim()},
   multiple&&h('div',{className:'feeding-meal-group-heading'},h('strong',null,t('這一餐')),h('span',null,t('{n} 項食品', {n: group.rows.length}))),
   group.rows.map(render),
   supplement&&h('button',{type:'button',className:'feeding-supplement','aria-label':t('{time} 補吃下量', {time: first.time||''}).trim(),onClick:()=>onSupplement(first,group.rows)},t('補吃下量')));
 }));
}
export function MealGroupSummary({react:R,entry,entries=[],cards=[],onRecord,Attribution,isDemo=()=>false}){
 if(!entry?.mealGroupId)return null;
 const key=feedingMealGroups([entry])[0]?.key;
 const group=feedingMealGroups(entries).find(group=>group.key===key&&group.rows.some(row=>row.id===entry.id));
 if(!group||group.rows.length<2)return null;
 const h=R.createElement;
 return h('section',{className:'feeding-meal-summary','aria-label':t('這一餐的所有食品')},
  h('h2',null,t('這一餐 · {n} 項食品', {n: group.rows.length})),
  h('p',{className:'feeding-meal-summary-note'},t('各項份量分開保留，點食品可查看原紀錄。')),
  h('div',{className:'feeding-meal-list'},group.rows.map(row=>mealRow({react:R,row,cards,onRecord,Attribution,isDemo,currentId:entry.id}))));
}
