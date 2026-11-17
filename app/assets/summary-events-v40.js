import {eliminationKind} from './elimination-observation.js?v=8f5745b7843b';
import {uniqueRecordRows} from './record-identity.js?v=8f5745b7843b';
import {feedingMealGroups} from './clear-presentation.js?v=audit1117';
import {APPETITE_OPTIONS} from './observation-entry.js?v=audit1117';
import {dietNumeric} from './diet-observations-model.js?v=photo-simplify1';
import {waterKind} from './record-summary.js?v=8f5745b7843b';
import {summaryRecordContent, summaryRange} from "./m-vet-summary-v42.js?v=8f5745b7843b";
import {t, K} from './i18n.js?v=audit1117b';
export {summaryRecordContent};
const isAppetiteObservation=row=>!row.feeding&&(row.metric==='appetite'||row.observationSummaryVersion===1||Object.hasOwn(APPETITE_OPTIONS,row.appetiteStatus)||String(row.text||'').trim()===K('沒吃完'));
function summaryRecordType(row){
 if(row.category===K('排泄'))return {urine:t('尿尿'),stool:t('便便'),unknown:t('排泄（未分類）')}[eliminationKind(row)];
 if(row.category===K('飲食')&&!row.feeding)return isAppetiteObservation(row)?t('食慾'):t('餵食觀察');
 if(row.category===K('其他')&&row.metric==='mood')return t('精神');
 return row.category;
}
/** Presentation only: retain every original event and ID for detail navigation. */
export function groupSummaryEvents(rows=[],{catId,kind='record'}={}){
 const groups=new Map();
 for(const row of uniqueRecordRows(rows,{catId})){
  if(!row||row.category===K('交接')||row.kind===K('交接')||row.source===K('家庭交接')||row.handover||row.ownership==='unconfirmed'||row.catId===null||(catId!==undefined&&row.catId!==undefined&&row.catId!==catId)||row.deleted||row.deletedAt||row.isDeleted||['draft','deleted'].includes(row.status)||row.draft||row.confirmed===false||row.demo===true)continue;
  const type=kind==='change'?row.kind:summaryRecordType(row);
  const key=JSON.stringify([row.catId??catId??null,row.date,kind,type]);
  if(!groups.has(key))groups.set(key,{key,date:row.date,type,catId:row.catId??catId,kind,sources:[],contents:[]});
  const group=groups.get(key);group.sources.push(row);
  const content=summaryRecordContent(row,kind);
  if(content&&!group.contents.includes(content))group.contents.push(content);
 }
 return [...groups.values()].map(group=>({...group,count:group.sources.length,uncertain:group.sources.some(row=>row.uncertain),text:summaryEventText(group)}));
}
const categoryLabel=value=>value===K('聲音反應')?t('聲音探索'):t(value);
export function summaryEventText(group){
 const date=String(group.date||'').slice(5).split('-').map(Number).join('/');
 const unit=group.kind==='change'?K('次'):group.type===K('飲食')?K('餐'):K('筆'),shown=group.contents.slice(0,3);
 const count=unit===K('餐')?feedingMealGroups(group.sources).length:group.sources.length;
 return `${group.sources.some(row=>row.uncertain)?t('約 '):''}${t('{date} {type}（共 {count} {unit}）', {date, type: categoryLabel(group.type), count, unit: t(unit)})}${shown.length?t('：')+shown.join(t('；')):''}${group.contents.length>3?'…':''}`;
}
export function summaryEventLines({rows=[],changes=[],catId}={}){
 return [...groupSummaryEvents(rows,{catId}),...groupSummaryEvents(changes,{catId,kind:'change'})].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function summaryEventsHTML(data){
 const groups=summaryEventLines(data);
 const range=data.start&&data.end?`<p>${escapeHTML(summaryRange(data.start,data.end))}</p>`:'';
 const sources=groups.map((group,i)=>group.sources.map((source,j)=>({source,id:`summary-source-${i}-${j}`,kind:group.kind})));
 const list=groups.map((group,i)=>`<li>${escapeHTML(group.text)}<details class="summary-source-disclosure"><summary>${t('查看全部（{count} 筆）', {count: group.sources.length})}</summary><ol>${sources[i].map(({id,source,kind},j)=>`<li><a href="#${id}">${t('來源 {j}：', {j: j+1})}${escapeHTML([source.date,source.time,summaryRecordContent(source,kind)||t('未填說明')].filter(Boolean).join(' · '))}</a></li>`).join('')}</ol></details></li>`).join('');
 const details=sources.flat().map(({source,id,kind})=>`<li id="${id}" data-source-id="${escapeHTML(source.id)}" data-related-id="${escapeHTML(source.sourceEntryId||'')}"><strong>${escapeHTML(source.date)} ${escapeHTML(source.time||'')} · ${escapeHTML(categoryLabel(kind==='change'?source.kind:source.category))}</strong><p>${escapeHTML(kind==='change'?(source.note||t('未填說明')):source.text)}</p>${source.uncertain?`<p>${t('日期不太確定')}</p>`:''}</li>`).join('');
 const coverage=summaryCoverageLines(groups,summaryCoverageCategories(data.scope)).map(line=>`<p>${escapeHTML(line)}</p>`).join('');
 return `<section><h2>${t('看診重點')}</h2>${range}${groups.length?'<ul>'+list+'</ul>':`<p>${t('尚未記錄，不代表沒有發生。')}</p>`}${coverage}<p>${t('筆數為已確認的紀錄數，不推估未記錄的事件。')}</p></section>${groups.length?`<section><h2>${t('重點來源明細')}</h2><ol>`+details+'</ol></section>':''}`;
}

const summaryCategories=[K('飲食'),K('嘔吐'),K('體重'),K('喝水'),K('排泄'),K('其他'),K('聲音反應')];
export function summaryCoverageCategories(scope){
 if(!scope||scope===K('全部'))return summaryCategories;
 return scope===K('日常變化')?[K('嘔吐'),K('其他'),K('聲音反應')]:[scope];
}

/** Track distinct facts even when their stored category is shared. */
export function summaryObservationCoverage(groups=[],categories=summaryCategories){
 const rows=groups.filter(group=>group.kind==='record').flatMap(group=>group.sources||[]);
 const observed=list=>list.length?'observed':'missing';
 const cover=(name,status)=>({name,status});
 return categories.filter(category=>category!==K('交接')).flatMap(category=>{
  const list=rows.filter(row=>row.category===category);
  switch(category){
   case K('排泄'): {
    const urine=list.filter(row=>eliminationKind(row)==='urine');
    const stool=list.filter(row=>eliminationKind(row)==='stool');
    const unknown=list.some(row=>eliminationKind(row)==='unknown');
    const urineUnclear=urine.length>0&&urine.every(row=>['unseen','frequent'].includes(row.urineStatus));
    return [cover(t('尿尿'),urineUnclear?'unknown':observed(urine)),cover(t('便便'),observed(stool)),...(unknown?[cover(t('排泄類型'),'unknown')]:[])];
   }
   case K('飲食'): {
    const notes=list.filter(row=>!row.feeding);
    const appetite=notes.some(isAppetiteObservation);
    return [cover(t('餵食'),observed(list.filter(row=>row.feeding))),cover(t('食慾'),appetite?'observed':notes.length?'unknown':'missing')];
   }
   case K('喝水'): {
    const kinds=list.map(waterKind);
    return [cover(t('喝水'),kinds.includes('observed')?'observed':kinds.includes('unknown')?'unknown':'missing')];
   }
   case K('其他'):
    // 2026-11-17：語音快記存成「其他」的精神觀察（沒有 metric）也算精神。
    {const mood=row=>row.metric==='mood'||!row.metric&&/精神|活動量/.test(String(row.text||row.observationNote||''));
    return [cover(t('精神'),observed(list.filter(mood))),cover(t('其他'),observed(list.filter(row=>!mood(row))))];}
   case K('體重'): {
    const measured=list.some(row=>['kg',K('公斤'),'g',K('公克')].includes(row.unit)&&dietNumeric(row.amount)>0);
    return [cover(t('體重'),measured?'observed':list.length?'unknown':'missing')];
   }
   default:
    return [cover(categoryLabel(category),observed(list))];
  }
 });
}

export function summaryCoverageLines(groups,categories){
 const items=summaryObservationCoverage(groups,categories);
 const labels={observed:t('有觀察'),missing:t('未記錄'),unknown:t('未知')};
 return Object.entries(labels).flatMap(([status,label])=>{
  const names=items.filter(item=>item.status===status).map(item=>item.name);
  return names.length?[`${label}${/[㐀-鿿]/.test(label)?'：':': '}${names.join(t('、'))}${status==='missing'?t('（不代表沒有發生）'):''}`]:[];
 });
}
