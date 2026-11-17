import {t} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
import {displayStoredText} from '/xbb-site/app/assets/stored-text.js?v=i18n1';
import {careMealGroups} from "/xbb-site/app/assets/care-journey-model.js?v=photo-simplify1";
import {activePetEntries} from './pet-archive.js?v=8f5745b7843b';
import {feedingMealGroups,mealCountGroups,isMealRecord} from '/xbb-site/app/assets/clear-presentation.js?v=audit1117';
import {eligibleRecords,carePending,careStatusText} from '/xbb-site/app/assets/health-summary-v31.js?v=photo-simplify1';
import {countCareDrafts} from '/xbb-site/app/assets/usability-v49.js?v=8f5745b7843b';
import {catColor} from '/xbb-site/app/assets/cat-colors.js?v=8f5745b7843b';
import {catPhoto} from '/xbb-site/app/cat-photo.js?v=8f5745b7843b';

// Read each cat's own saved data. No household attribution, inference or writes.
export function familyOverviewModel({data,today,now=new Date(),isDemo=()=>false,isDemoCare=()=>false}){
 const cats=activePetEntries(data.multiCat);
 const rows=cats.map((cat,index)=>{
  const d=cat.id==='cat-original'?data:cat.data,profile=d.cat;
  const meals=eligibleRecords(d.entries||[],today,cat.id,isDemo,now).filter(row=>row.date===today&&isMealRecord(row));
  const groups=mealCountGroups(meals),latest=groups.at(-1),last=latest?.rows[0],names=latest?.rows.map(row=>d.foodCards?.find(item=>item.id===row.feeding?.foodId)?.name||row.feeding?.quickName||displayStoredText(row.text)||t('餵食紀錄'))||[];
  const pending=carePending(d.careItems||[],today,isDemoCare,cat.id);
  return {id:cat.id,name:profile.name||t('未命名'),photo:catPhoto(profile),color:catColor(profile,data.multiCat?.cats.findIndex(c=>c.id===cat.id)??index),meals:groups.length,lastMeal:last?`${last.time} · ${names.join('、')}`:t('今天尚無餵食紀錄'),pending,careDetail:pending?careStatusText(d.careItems||[],today,isDemoCare,cat.id):t('目前沒有照護待辦'),drafts:countCareDrafts(d)};
 });
 return {today,rows,totalMeals:rows.reduce((sum,row)=>sum+row.meals,0),totalPending:rows.reduce((sum,row)=>sum+row.pending,0)};
}
