import {t} from './i18n.js?v=audit1117b';
// v49: distinguish an untouched form from a meaningful draft, without migration.
export function hasMealInput(meal) {
  return !!meal && ((Array.isArray(meal.parts)&&meal.parts.some(p=>!!p.foodId||!!p.quickName||!!p.quickCategory||String(p.provided??'')!==''||String(p.eaten??'')!=='')) || !!meal.id || !!meal.foodId || !!meal.quickCategory ||
    ['quickName','provided','eaten','note'].some(key=>String(meal[key]??'').trim()!=='') || meal.change===true);
}
export function hasMealDraft(session) {
  return !!session && (session.foodPending && session.foodOrigin==='feed' ||
    !!session.feedPending && (session.feedDirty===true || hasMealInput(session.feeding)));
}
export const isSavedMealDraft = row => !!(row.foodDraft || row.feedDirty || hasMealInput(row.feeding));
export function countCareDrafts({cat,foodSession}){
  const meals = (hasMealDraft(foodSession)?1:0) + (cat?.mealDrafts||[]).filter(isSavedMealDraft).length;
  const foods = (foodSession?.foodPending&&foodSession.foodOrigin!=='feed'?1:0) + (cat?.foodDrafts?.length||0);
  return meals+foods;
}
export function CareExamples({react:R,items}) {
  const h=R.createElement;
  if(!items.length)return null;
  return h('details',{className:'ux-care-examples'},h('summary',null,t('查看提醒範例（不計入待辦）')),
    h('p',null,t('以下為示範資料，不是目前毛孩的待辦。')),items.map(item=>h('article',{key:item.id},
      h('strong',null,t(item.name)),h('p',null,t('{kind} · 範例日期：{date}',{kind:t(item.kind),date:item.next||t('未設定')})))));
}
