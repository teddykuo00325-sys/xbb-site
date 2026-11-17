import {MainOutcomes157} from './first-use157.js?v=p1';
import {cuteActionIconProps} from './cute-action-icons.js?v=audit1117b';
import {CareTimeline} from './care-timeline-ui.js?v=photo-simplify1';
import {careTimeline,watchReminders} from './care-schedule.js?v=photo-simplify1';
import {feedingMealGroups,mealNeedsEatenAmount,isMealRecord} from './clear-presentation.js?v=audit1117';
import {DailyTotalsCard} from './daily-totals-ui.js?v=1';
import {CareJourneyCard} from "./care-journey-ui.js?v=photo-simplify1";
import {careMealGroups} from "./care-journey-model.js?v=photo-simplify1";
import {FAMILY_SHARING_ENABLED} from "./family-feature.js?v=8f5745b7843b";
import {FamilyTodayCare,FamilyCareEntry} from "./family-care-status.js?v=8f5745b7843b";
import {catPhoto} from '/xbb-site/app/cat-photo.js?v=8f5745b7843b';
import {summaryRange,shiftSummaryDate,vetObservationParagraphs} from "./m-vet-summary-v42.js?v=8f5745b7843b";
import {RecentCareStatus} from './recent-care.js?v=8f5745b7843b';
import {BACKUP_LIMIT_LABEL,backupSizeExceeded,backupPhotoCompatibility} from './backup-restore-schema.js?v=fish-merge1';
import {countCareDrafts} from './usability-v49.js?v=8f5745b7843b';
import {eliminationKind} from './elimination-observation.js?v=8f5745b7843b';
import {recordMetricSummary,WeightChart} from './record-summary.js?v=8f5745b7843b';
import {recordIconProps,RECORD_ICONS} from './record-icons.js?v=8f5745b7843b';
import {RecordCountScope} from './record-counts.js?v=photo-simplify1';
import {recordIsLive} from './record-identity.js?v=8f5745b7843b';
import {activeMeds} from './vet-visit-model.js?v=1';
import {SoundInvitation,soundInvitationDue,snoozeSoundInvitation} from './sound-invitation.js?v=8f5745b7843b';
import {recentExportText,rememberExport} from './audit-followup-v45.js?v=8f5745b7843b';
import {PetSwitchButton} from '/xbb-site/app/pet-switcher.js?v=photo-simplify1';
import {observationHighlights,appetiteAssessment,stoolState} from './observation-highlights-v32.js?v=8f5745b7843b';
import {calendarDay,localCalendarDate,localObservationCutoff} from './today-overview-v29.js?v=8f5745b7843b';
import {t, K, tn, getLocale} from './i18n.js?v=audit1117b';
export const METRICS=[{id:'food',name:t('餵食'),category:K('飲食')},{id:'stool',name:t('排泄'),category:K('排泄')},{id:'weight',name:t('體重'),category:K('體重')},{id:'water',name:t('喝水'),category:K('喝水')},{id:'vomit',name:t('嘔吐'),category:K('嘔吐')},{id:'mood',name:t('精神狀態'),category:K('其他')}].map(metric=>({...metric,color:RECORD_ICONS[metric.id].color,icon:'record-'+metric.id}));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const handover=row=>Boolean(row&&(row.category===K('交接')||row.kind===K('交接')||row.source===K('家庭交接')||row.handover));
const demo=r=>r.demo===true||String(r.source||'').includes(K('示範'))||r.source===K('聲音反應');
const sameCat=(r,id)=>r&&r.ownership!=='unconfirmed'&&(!own(r,'catId')||r.catId!==null&&r.catId===id);
const sort=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.id.localeCompare(b.id);
export function eligibleRecords(entries,today,catId,isDemo=demo,now=new Date()){const seen=new Set(),day=calendarDay(today),late=localObservationCutoff(now);return entries.filter(r=>recordIsLive(r,catId)&&!handover(r)&&sameCat(r,catId)&&typeof r.id==='string'&&r.id&&typeof r.text==='string'&&r.text.trim()&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)&&calendarDay(r.date)!==null&&calendarDay(r.date)<=day&&(!r.feeding||!late(r.date,r.time))&&!demo(r)&&!isDemo(r)).sort(sort).filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true})}
export function weightKg(row){if(row.category!==K('體重')||![K('公斤'),'kg',K('公克'),'g'].includes(row.unit)||String(row.amount??'').trim()==='')return null;const n=Number(row.amount);return Number.isFinite(n)&&n>0?n/([K('公克'),'g'].includes(row.unit)?1000:1):null}
// Reuse the same classifier for summary, reports, comparisons and highlights.
export {stoolState};
export const stateLabel=s=>({normal:t('正常'),soft:t('軟便'),diarrhea:t('腹瀉'),blood:t('血便'),unknown:t('未分類')}[s]||t('未分類'));
const round=n=>Number(n.toPrecision(10)).toString();
const signed=n=>(n>0?'+':'')+round(n);
const dateShift=(date,n)=>new Date((calendarDay(date)+n)*864e5).toISOString().slice(0,10);
export function monthStart(today){const [y,m,d]=today.split('-').map(Number),date=new Date(Date.UTC(y,m-4,1));date.setUTCDate(Math.min(d,new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()));return date.toISOString().slice(0,10)}
export function careState(item,today,now=new Date()){
 if(item.enabled!==true)return 'paused';
 if(item.snoozedUntil&&Number.isFinite(Date.parse(item.snoozedUntil))&&Date.parse(item.snoozedUntil)>new Date(now).getTime())return 'snoozed';
 const last=[item.last,...(item.history||[])].filter(v=>calendarDay(v)!==null&&v<=today).sort().at(-1),next=calendarDay(item.next);
 if(next!==null&&(!last||item.next>last))return item.next>today?(next-calendarDay(today)<=Math.max(0,Number(item.lead)||0)?'upcoming':'scheduled'):item.next===today?'due':'overdue';
 return last?'needs-scheduling':'unscheduled';
}
// One live selector for summary, navigation, Pet and reminder-list counts.
export function carePending(items,today,isDemoCare=demo,catId){const seen=new Set();return items.filter(r=>recordIsLive(r,catId)&&sameCat(r,catId)&&!demo(r)&&!isDemoCare(r)).filter(r=>{if(r.id&&seen.has(r.id))return false;if(r.id)seen.add(r.id);return ['upcoming','due','overdue','needs-scheduling','unscheduled'].includes(careState(r,today))}).length}
export function careStatusText(items,today,isDemoCare=demo,catId){
 const due=carePending(items.filter(i=>['due','overdue'].includes(careState(i,today))),today,isDemoCare,catId);
 const waiting=carePending(items.filter(i=>['needs-scheduling','unscheduled'].includes(careState(i,today))),today,isDemoCare,catId);
 const upcoming=carePending(items.filter(i=>careState(i,today)==='upcoming'),today,isDemoCare,catId);
 const snoozed=items.filter(i=>recordIsLive(i,catId)&&sameCat(i,catId)&&!demo(i)&&!isDemoCare(i)&&careState(i,today)==='snoozed').length;
 return `${t('到期 {due} 項', {due})}${snoozed?` ${t('· 稍後 {snoozed} 項', {snoozed})}`:''}${upcoming?` ${t('· 快到期 {upcoming} 項', {upcoming})}`:''} ${t('· 待確認日期 {waiting} 項', {waiting})}`;
}
// 毛孩頁「照顧時間表」那一列（Ian 2026-11-16）：只寫「0 項要做」會跟首頁列出的已排項目對不起來。
// 有快到期／過期／待排日期的才寫「N 項要做」；都還早就寫下一件和日期；完全沒排才說還沒排。
export function careEntryLine(items,today,isDemoCare=demo,catId){
 const pending=carePending(items,today,isDemoCare,catId);
 if(pending)return t('疫苗、驅蟲、回診 · {count} 項要做',{count:pending});
 const live=(Array.isArray(items)?items:[]).filter(r=>recordIsLive(r,catId)&&sameCat(r,catId)&&!demo(r)&&!isDemoCare(r));
 const next=careTimeline(live,today).find(row=>row.days!==null&&row.state==='scheduled');
 if(next)return t('下一件：{label}，{text}',{label:tn(next.label||''),text:next.text});
 return live.length?t('疫苗、驅蟲、回診 · 目前沒有要做的'):t('還沒排疫苗、驅蟲或回診');
}
export function healthModel({entries=[],foodCards=[],changes=[],careItems=[],catId,today=localCalendarDate(),isDemo=demo,isDemoChange=demo,isDemoCare=demo}={}){
 changes=changes.filter(row=>!handover(row));
 const rows=eligibleRecords(entries,today,catId,isDemo),day=calendarDay(today),weights=rows.filter(r=>weightKg(r)!==null).map(r=>({...r,kg:weightKg(r)})),trend=weights.filter(r=>r.date>=monthStart(today)),highlights=[];
 const observed=observationHighlights({rows,changes,catId,today,isDemoChange});highlights.push(...observed);
 const days=Array.from({length:7},(_,i)=>dateShift(today,i-6));
 const metrics=Object.fromEntries(METRICS.map(m=>{const list=rows.filter(r=>r.category===m.category&&(m.id!=='mood'||r.metric==='mood')&&(m.id!=='food'||isMealRecord(r)));return [m.id,{...m,...recordMetricSummary({metric:m.id,list,weights,today,days,foodCards,stateLabel,stoolState,round,signed})}]}));
 let trendText='';if(trend.length>=2){const first=trend[0],last=trend.at(-1),delta=last.kg-first.kg,span=calendarDay(last.date)-calendarDay(first.date),steps=trend.slice(1).map((r,i)=>r.kg-trend[i].kg);if(span>=28&&Math.abs(delta)/(span/30)<=.1)trendText=t('{span} 天內體重差 {delta} 公斤。', {span, delta: signed(delta)});else if(span>0&&steps.every(n=>n>=0)&&steps.some(n=>n>0))trendText=t('已記錄的體重持續上升，共 {delta} 公斤。', {delta: round(delta)});else if(span>0&&steps.every(n=>n<=0)&&steps.some(n=>n<0))trendText=t('已記錄的體重持續下降，共 {delta} 公斤。', {delta: round(Math.abs(delta))});else trendText=span?t('體重紀錄有波動，首末差 {delta} 公斤；暫不判讀每月趨勢。', {delta: signed(delta)}):t('同日有多次量測，尚不足判讀跨日趨勢。');}
 return {rows,metrics,trend,trendText,highlights:highlights.slice(0,2),appetite:appetiteAssessment({rows,catId,today}),pending:carePending(careItems,today,isDemoCare,catId),today};
}
function prepareBackup({data,revision,status},settings={},now=new Date()){
 if(status!=='saved')throw Error(t('仍有未保存資料，請先完成或重試保存，再匯出。'));
 const copy=structuredClone(data),cats=copy.multiCat?.cats||[{id:'cat-original'}],sets=cats.map(c=>c.id==='cat-original'?copy:c.data),photos=sets.flatMap(d=>(d.foodCards||[]).flatMap(f=>f.photos||[]).concat(d.foodSession?.draft?.photos||[],(d.cat?.foodDrafts||[]).flatMap(row=>row.draft?.photos||[]),(d.cat?.mealDrafts||[]).flatMap(row=>row.foodDraft?.draft.photos||[]),d.cat?.photo?[d.cat.photo]:[])),missing=photos.filter(p=>typeof p==='string'&&!p.startsWith('data:')).length;
 photos.push(...(copy.lifeDiary||[]).map(entry=>entry.photo));
 const {legacyPhotos,unsupportedPhotos}=backupPhotoCompatibility(photos);
 const limitations=[
  unsupportedPhotos?t('{unsupportedPhotos} 張照片超出還原支援範圍。此檔可留存原始資料，無法直接整份還原。', {unsupportedPhotos}):t('可在設定匯入支援且內容完整的 JSON。未知版本、欄位或無法完整讀取的照片會阻擋匯入。先預覽，再確認是否整份取代本機資料。'),
  t('僅包括這台裝置內所有毛孩的已保存資料；未確認的手動輸入與正在編輯的表單不在備份中。'),
  t('帳號與方案的工作階段示範設定不是真實帳號或權益；模型檔案不包含在照護備份，需在目標裝置另行下載。進階模式不用登入，送出前會先問你。'),
  ...(legacyPhotos?[t('包含 {legacyPhotos} 張已保存的大尺寸照片，保留原圖資料。', {legacyPhotos})]:[]),
  ...(missing?[t('{missing} 張照片只有參照網址，未嵌入檔案。', {missing})]:[])
 ];
 const backup={format:'inpaw-local-backup',formatVersion:1,exportedAt:now.toISOString(),snapshot:{schemaVersion:2,revision,data:copy},sessionOnlyDemoSettings:structuredClone(settings),inventory:{familyMembers:copy.familySharing?.members?.length||0,familyInvites:copy.familySharing?.invites?.length||0,handovers:sets.reduce((n,d)=>n+(d.entries||[]).filter(row=>row.category===K('交接')).length,0),cats:cats.length,entries:sets.reduce((n,d)=>n+(d.entries?.length||0),0)+(copy.lifeDiary||[]).length,householdEntries:copy.multiCat?.householdEntries?.length||0,photos:photos.length,inlinePhotos:photos.length-missing,foodOrMealDrafts:sets.reduce((count,d)=>count+countCareDrafts(d),0)},limitations,completeInlinePhotos:missing===0};
 return {backup,unsupportedPhotos};
}
export function buildBackup(snapshot,settings,now){return prepareBackup(snapshot,settings,now).backup;}
export function downloadBackup(snapshot,settings){
 const {backup,unsupportedPhotos}=prepareBackup(snapshot,settings),text=JSON.stringify(backup),blob=new Blob([text],{type:'application/json;charset=utf-8'});
 if(backupSizeExceeded(text,blob.size))throw Error(t('備份超過 ')+BACKUP_LIMIT_LABEL+t('，未產生下載檔。這台裝置內的原資料已保留。'));
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;
 a.download=`${t('毛孩小本本-')}${unsupportedPhotos?t('資料留存-無法直接還原'):t('資料匯出')}-${localCalendarDate()}.json`;
 document.body.append(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),300000);
 rememberExport(backup.exportedAt);
 return {backup,url,filename:a.download,unsupportedPhotos};
}
function LineChart({react:R,rows}){return R.createElement(WeightChart,{react:R,rows})}
/** 今天的吃藥時間點（沒有藥回傳 null）。 */
export function todayMedSlots(careRoot,catId,today){
 let rows=[];try{rows=activeMeds(careRoot?.get?.().data,catId,today);}catch{rows=[];}
 const slots=rows.flatMap(row=>row.slots);
 const unsuccessful=slots.filter(slot=>slot.status==='unsuccessful').length,uncertain=slots.filter(slot=>slot.status==='uncertain').length;
 return slots.length?{total:slots.length,left:slots.filter(slot=>!slot.taken&&!['unsuccessful','uncertain'].includes(slot.status)).length,...(unsuccessful||uncertain?{taken:slots.filter(slot=>slot.taken).length,unsuccessful,uncertain}:{})}:null;
}
/** 2026-11-17：首頁「今天記了什麼」一行小結，方便核對有沒有漏記。只算今天、目前毛孩的實際紀錄；補水不算喝下量。 */
export function todayRecordLine(m){
 const rows=(m?.rows||[]).filter(row=>row.date===m.today);
 const meals=feedingMealGroups((m.metrics?.food?.rows||rows.filter(row=>row.category===K('飲食')&&isMealRecord(row))).filter(row=>row.date===m.today)).length;
 const water=rows.filter(row=>row.category===K('喝水')&&row.waterAction==='observed'&&Number(row.amount)>0).reduce((sum,row)=>sum+Number(row.amount),0);
 const litter=rows.filter(row=>row.category===K('排泄')).length;
 const weight=rows.filter(row=>weightKg(row)!==null).sort(sort).at(-1);
 const parts=[meals&&t('餐 {n}',{n:meals}),water&&t('水 {ml} ml',{ml:Math.round(water)}),litter&&t('砂 {n}',{n:litter}),weight&&t('體重 {kg}',{kg:round(weightKg(weight))})].filter(Boolean);
 return parts.length?t('今天：{list}',{list:parts.join('・')}):t('今天還沒有紀錄');
}
export function homeHeroStatus({nextCare,meds}){
 const label=tn(nextCare?.label||'');
 if(nextCare?.state==='overdue')return t('{label}已過期 {days} 天', {label, days: -nextCare.days});
 if(nextCare?.state==='due')return t('今天要{label}', {label});
 if(meds?.unsuccessful||meds?.uncertain)return t('今天用藥：已吃 {taken} 次，未成功 {unsuccessful} 次，不確定 {uncertain} 次', {taken:meds.taken||0,unsuccessful:meds.unsuccessful||0,uncertain:meds.uncertain||0})+(meds.left>0?t('；')+t('今天還有 {left} 次用藥尚未記錄',{left:meds.left}):'');
 if(meds?.left>0)return t('今天還有 {left} 次用藥尚未記錄', {left: meds.left});
 if(!nextCare)return meds?t('今天的藥都吃了'):t('日常記錄與照護都在這裡');
 return nextCare.days!==null?t('下一件：{label}，{text}', {label, text: nextCare.text}):`${label}：${nextCare.text}`;
}
export function HealthSummary({react:R,profile,catColor,drafts,family,careRoot,careStore,familyRoot,onFamilyCare,onSwitch,onRecords,onRecord,onSummary,onReminders,soundInvitation,soundInvite,...data}){
 const h=R.createElement,m=healthModel(data),[,setInviteTick]=R.useState(0);
 const due=carePending((data.careItems||[]).filter(item=>['due','overdue'].includes(careState(item,m.today))),m.today,data.isDemoCare,data.catId);
 const pendingMeal=feedingMealGroups(m.metrics.food.rows.filter(row=>row.date===m.today)).findLast(group=>mealNeedsEatenAmount(group));
 const supplement=pendingMeal&&data.onSupplement?{
  time:pendingMeal.rows[0].time,
  onOpen:()=>data.onSupplement(pendingMeal.rows[0],pendingMeal.rows),
 }:null;
 const photo=catPhoto(profile);
 const dateLabel=new Intl.DateTimeFormat(getLocale()==='en'?'en-US':'zh-TW',{month:'numeric',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(m.today+'T12:00:00Z'));
 const quickActions=[
  [t('記一餐'),cuteActionIconProps('meal'),()=>onRecord(K('飲食'),'food')],
  // 2026-11-17（Ian 批准第三批 A）：首頁補喝水入口，不必從記一餐繞進去。
  [t('喝水'),cuteActionIconProps('water'),()=>onRecord(K('喝水'),'water')],
  [t('清砂'),cuteActionIconProps('litter'),()=>onRecord(K('排泄'),'litter')],
  [t('記體重'),cuteActionIconProps('weight'),()=>onRecord(K('體重'),'weight')],
  [t('語音快記'),cuteActionIconProps('voice'),data.onFirstRecord||(()=>onRecord(K('其他'),'other'))],
  // 食品管理保留在下方短連結；四顆快記只放建立紀錄的動作。
 ];
 // 毛孩主角：照片＋名字＋一句今天最要緊的照護（過期 → 今天 → 下一件）。點照片或名字切換毛孩；新增毛孩在切換選單裡。
 const nextCare=careTimeline((data.careItems||[]).filter(item=>!data.isDemoCare?.(item)),m.today)[0];
 // 副標題先反映實際待辦；沒有待辦時不再重複下方時間表的疫苗／驅蟲空狀態。
 const meds=todayMedSlots(careRoot,data.catId,m.today);
 const heroStatus=homeHeroStatus({nextCare,meds});
 const liveCare=(data.careItems||[]).filter(item=>!data.isDemoCare?.(item));
 const careNow=Boolean(due||meds||careTimeline(liveCare,m.today).some(row=>['due','overdue'].includes(row.state)));
 R.useEffect(()=>{if(careRoot)watchReminders(careRoot);},[careRoot]);
 const todayLine=todayRecordLine(m);
 return h('div',{className:'health-summary today-slim','data-testid':'health-summary'},
  h('header',{className:'today-home-header'},
   h('div',{className:'today-home-brandrow'},
    h('h1',null,h('img',{className:'today-original-brand',src:'/xbb-site/app/assets/brand/logo.svg',alt:t('毛孩小本本'),width:108,height:30})),
    h('time',{dateTime:m.today,className:'health-date'},dateLabel)),
   h('section',{className:'today-pet-hero'+(nextCare?.urgent?' is-urgent':''),'aria-label':profile.name+t('的今天')},
    h('span',{className:'today-pet-avatar'},
     // 2026-11-17（簡化重複入口）：頭像和名字是同一個「切換毛孩」；頭像不再是第二個可聚焦的入口，換照片只在毛孩頁。
     h('button',{type:'button',className:'today-pet-photo',disabled:family?.busy,onClick:onSwitch,tabIndex:-1,'aria-hidden':true},
      photo?h('img',{src:photo,alt:'',width:72,height:72,draggable:false}):h('span',{className:'today-pet-color',style:{backgroundColor:catColor?.coat||'#D99550'}}))),
    h('div',{className:'today-pet-text'},
     h('button',{type:'button',className:'today-pet-name',disabled:family?.busy,onClick:onSwitch,'aria-haspopup':'dialog','aria-label':t('目前照顧：{name}，切換毛孩', {name: profile.name})},h('strong',null,profile.name),h('svg',{className:'today-pet-chevron',viewBox:'0 0 24 24',width:16,height:16,fill:'none',stroke:'currentColor',strokeWidth:2.4,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'m6 9 6 6 6-6'}))),
     h('p',{className:'today-pet-status'},heroStatus),
     family?.rows.length>1&&h('div',{className:'today-pet-actions'},
      h('button',{type:'button',className:'today-family-link',disabled:family.busy,onClick:family.onOverview},t('全家總覽')))))),
  // 2026-11-13（Ian 定案）：以照護為主體——照顧時間表放最上面；四顆快記移到下面、縮成一列小按鈕；
  // 2026-11-14（Ian 定案）：移除照護花；「更多照護」只留近期狀態、換糧觀察與時間表入口。
  // 2026-11-17（Ian 批准第三批 A）：日常快記與「今天記了什麼」固定在第一屏，照顧時間表接在後面；最急的照護仍寫在上方毛孩卡的狀態句。
  h('section',{className:'today-quick-actions is-compact has-five','aria-label':t('日常快記')},
   h('div',{className:'today-quick-head'},h('span',{className:'today-quick-label'},t('日常快記')),null),
   h('p',{className:'today-record-line',role:'status'},todayLine),
   quickActions.map(([label,icon,click])=>h('button',{key:label,type:'button',onClick:click},h('img',icon),h('span',null,label)))),
  // 2026-11-17（簡化重複入口）：照顧時間表的家在「照護」頁。今天有到期、過期或要吃的藥才在這裡展開；其餘只留一行。
  careNow?h(CareTimeline,{react:R,items:liveCare,today:m.today,name:profile.name,store:careStore,root:careRoot,catId:data.catId,onReminders,limit:3,medCompact:true}):
   h('button',{type:'button',className:'today-care-line',onClick:onReminders},h('span',{className:'care-entry-copy'},h('strong',null,t('照顧時間表')),h('small',null,careEntryLine(data.careItems||[],m.today,data.isDemoCare,data.catId))),h('span',{'aria-hidden':true},'›')),
  m.highlights.length>0&&h('section',{className:'home-alerts158','aria-label':t('健康提醒')},m.highlights.map(item=>h('details',{key:item.id,className:'home-alert158'},h('summary',null,h('strong',null,item.title),h('span',null,item.id==='no-eating'?t('若仍未進食，請儘速聯絡獸醫'):t('查看紀錄變化與說明'))),h('p',null,item.text),item.calculation&&item.calculation!==item.text&&h('p',null,item.calculation)))),
  drafts&&R.cloneElement(drafts,{supplement,compact:true}),
  FAMILY_SHARING_ENABLED?h('section',{className:'fs-home-care-actions','aria-label':t('照護提醒與分工')},h('button',{className:'ux-home-reminder','aria-label':t('照顧時間表 · ')+m.pending+t(' 項要做'),onClick:onReminders},h('span',null,t('照顧時間表')),h('span',null,m.pending+t(' 項要做 ›'))),h(FamilyCareEntry,{react:R,onOpen:onFamilyCare,compact:true})):null,
  FAMILY_SHARING_ENABLED&&familyRoot&&h(FamilyTodayCare,{react:R,root:familyRoot,items:data.careItems,today:m.today,isDemo:data.isDemoCare,onOpen:onReminders}),
  !due&&!pendingMeal&&careRoot&&h(CareJourneyCard,{react:R,root:careRoot,catId:data.catId,today:m.today,compact:true,activeOnly:true}),
  soundInvite?(soundInvitationDue({catId:soundInvite.catId,rows:m.rows,today:m.today,playCount:soundInvite.playCount})&&h(SoundInvitation,{react:R,name:profile.name,
   onStart:()=>{snoozeSoundInvitation(soundInvite.catId,m.today);soundInvite.onStart?.();},
   onDismiss:()=>{snoozeSoundInvitation(soundInvite.catId,m.today);setInviteTick(n=>n+1);}})):m.rows.length>0&&soundInvitation,
  h('details',{className:'today-more'},h('summary',null,t('更多照護')),
   h(RecentCareStatus,{react:R,rows:m.rows,today:m.today,onRecords,onRecord,showLitter:false}),
   careRoot&&h(CareJourneyCard,{react:R,root:careRoot,catId:data.catId,today:m.today,compact:true,inactiveOnly:!(due||pendingMeal)}),
   data.quickItems?.length>0&&data.onQuick&&h('section',{className:'quick-log today-quick-observe','aria-label':t('快速觀察')},h('div',{className:'quick-head'},h('strong',null,t('快速觀察')),h('small',null,t('記在今天 · 可復原'))),h('div',{className:'quick-grid'},data.quickItems.map(item=>h('button',{key:item.label,type:'button',className:'quick-chip','aria-label':t('快記：')+item.label,onClick:()=>data.onQuick(item)},item.label)))),
   h('details',{className:'health-disclaimer'},h('summary',null,t('資料如何整理？')),h('p',null,t('只整理目前毛孩的實際紀錄，不含示範、草稿或未確認歸屬。未記錄不等於沒有發生。今天的摘要依紀錄日期計算；最新量測或狀態另列實際日期。同一毛孩、日期與時間的同餐多食品只算一餐；舊紀錄沒有同餐連結時每筆算一餐，不猜測合併。補水不代表喝入量，嘔吐未填次數不當成 0 或 1。健康提醒為保守規則觀察，並非醫療 AI 或診斷。')))));
}
export function GlassNavigation({react:R,page,selected,onNavigate,onActions,pending,bottomInset=0}){
 const h=R.createElement,nav=R.useRef(null),[compact,setCompact]=R.useState(false);
 R.useEffect(()=>{
  setCompact(false);
  const scroll=nav.current?.closest('.inpaw-app')?.querySelector('.app-scroll .mobile-scroll');
  if(!scroll)return;
  let last=Math.max(0,scroll.scrollTop),travel=0,direction=0;
  const onScroll=()=>{
   const top=Math.max(0,Math.min(scroll.scrollTop,scroll.scrollHeight-scroll.clientHeight));
   const delta=top-last;last=top;
   if(top<32){travel=0;setCompact(false);return}
   if(Math.abs(delta)<1)return;
   const next=Math.sign(delta);travel=next===direction?travel+Math.abs(delta):Math.abs(delta);direction=next;
   if(next>0&&top>80&&travel>28){setCompact(true);travel=0}
   if(next<0&&travel>16){setCompact(false);travel=0}
  };
  scroll.addEventListener('scroll',onScroll,{passive:true});
  return()=>scroll.removeEventListener('scroll',onScroll);
 },[page,selected]);
 return h('nav',{ref:nav,className:'glass-nav'+(compact?' is-compact':''),'aria-label':t('主要導覽'),style:{bottom:`calc(${14+bottomInset}px + env(safe-area-inset-bottom, 0px))`}},[['home',t('今日'),'house'],['feeding',t('餵食'),'bowl-food'],['interaction',t('互動'),'paw-print'],['records',t('紀錄'),'notebook'],['profile',t('毛孩'),'cat-face']].map(([id,label,icon])=>id==='interaction'?h('button',{key:id,className:'glass-paw','aria-label':t('記一筆'),onClick:onActions},h('img',{src:'/xbb-site/app/assets/icons/paw-voice-filled.svg',alt:'','aria-hidden':true}),h('span',{className:'glass-paw-label','aria-hidden':true},t('新增')),h('span',{className:'glass-paw-plus','aria-hidden':true},'+')):h('button',{key:id,className:'glass-tab'+(selected===id?' selected':''),'aria-label':label,'aria-current':selected===id?'page':undefined,onClick:()=>onNavigate(id)},h('img',{src:`/xbb-site/app/assets/icons/${icon}.svg`,alt:''}),h('span',{className:'glass-tab-label'},label),id==='profile'&&pending>0&&h('em',{className:'glass-badge','aria-label':pending+t(' 項要做')},pending))))}
export {ObservationFields} from './observation-entry.js?v=audit1117';

// H3 projects the same live summary model, never a stored or fabricated series.
export const VET_STOOL_COLORS={normal:'#36765a',soft:'#b48a22',diarrhea:'#bd4941',blood:'#bd4941',unknown:'#7a8493'};
export function vetTrendModel(data={}){
 const m=healthModel({...data,entries:(data.entries||[]).filter(r=>r&&!r.isDeleted&&r.status!=='deleted'&&r.status!=='draft')}),days=m.metrics.food.bars.map(b=>b.date),counts={normal:0,soft:0,diarrhea:0,blood:0,unknown:0};
 const stool=days.map(date=>{const rows=m.metrics.stool.rows.filter(r=>r.date===date&&eliminationKind(r)==='stool'),states=rows.map(stoolState);states.forEach(s=>counts[s]++);return {date,states,missing:!rows.length}});
 const feeding=m.metrics.food.bars.map(b=>({...b,missing:b.count===0})),recordedDays=feeding.filter(b=>!b.missing).length,total=feeding.reduce((n,b)=>n+b.count,0),classified=Object.entries(counts).filter(([s])=>s!=='unknown').reduce((n,[,c])=>n+c,0);
 const elimination=m.metrics.stool.rows.filter(r=>days.includes(r.date)),urine=elimination.filter(r=>eliminationKind(r)==='urine'),unclassified=elimination.filter(r=>eliminationKind(r)==='unknown');
 return {...m,stool,counts,feeding,urine,unclassified,feedingText:total?t('近 7 天有 {recordedDays} 天記下餵食，共 {total} 餐。', {recordedDays, total}):t('近 7 天尚無已確認的餵食紀錄，暫無法回顧餵食規律。'),stoolText:classified?t('近 7 天已分類便便共 {classified} 筆，其中軟便 {soft} 筆、腹瀉 {diarrhea} 筆、血便 {blood} 筆，可配合日常狀況一起回顧。', {classified, soft: counts.soft, diarrhea: counts.diarrhea, blood: counts.blood}):t('近 7 天沒有已分類的便便紀錄。')};
}
export function VetTrends({react:R,...data}){
 const h=R.createElement,m=vetTrendModel(data),max=Math.max(1,...m.feeding.map(b=>b.count)),cardStyle={padding:'16px',border:'1px solid #e1e5e9',borderRadius:'18px',background:'#fff',margin:'12px 0'},grid={display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:'5px'},states=['normal','soft','diarrhea','blood','unknown'];
 const note=text=>h('p',{className:'microcopy left'},text);
 if(!m.rows.length)return h('section',{className:'vet-trends','aria-label':t('看診趨勢圖'),'data-testid':'vet-trends-empty'},h('h2',null,t('還沒有可繪製的日常趨勢')),note(t('疫苗驅蟲另見完成紀錄，不會換算成日常趨勢。')),note(t('體重曲線需要近 3 個月至少 2 筆有效體重量測；排便近況需要近 7 天的便便紀錄，餵食規律需要近 7 天已確認的餵食紀錄。未記錄不代表沒有發生。')),note(t('圖表固定回顧上述期間，不隨上方文字摘要期間切換。')));
 return h('section',{className:'vet-trends','aria-label':t('看診趨勢圖')},h('h2',null,t('日常趨勢')),
 m.trend.length<2&&h('p',{'data-testid':'vet-weight-empty'},t('近 3 個月有 {count} 筆有效體重量測，至少 2 筆才能顯示體重曲線。', {count: m.trend.length})),
 m.trend.length>=2&&h('article',{style:cardStyle,'data-testid':'vet-weight'},h('h3',null,t('體重曲線')),note(summaryRange(monthStart(m.today),m.today,t('近 3 個月'))+t(' · 公斤')),h(LineChart,{react:R,rows:m.trend,large:true,today:m.today}),h('p',null,m.trendText),note(t('僅連接已記錄的量測點；無資料期間不推測體重。'))),
 h(DailyTotalsCard,{react:R,rows:m.rows,today:m.today,cardStyle}),
 h('article',{style:cardStyle,'data-testid':'vet-urine'},h('h3',null,t('尿尿近況')),note(t('近 7 天 · 尿尿觀察 {count} 筆', {count: m.urine.length})),note(m.urine.length?t('最近一次 {date}：{text}', {date: m.urine.at(-1).date, text: m.urine.at(-1).text}):t('近 7 天還沒有尿尿觀察，未記錄不代表沒有排尿。')),m.unclassified.length>0&&note(t('另有 {count} 筆排泄紀錄尚未分類為尿尿或便便，不猜測歸類。', {count: m.unclassified.length}))),
 h('article',{style:cardStyle,'data-testid':'vet-stool'},h('h3',null,t('便便近況')),note(summaryRange(shiftSummaryDate(m.today,-6),m.today,t('最近一週'))+t(' · 每個狀態點代表一筆紀錄')),h('div',{style:grid},m.stool.map(day=>h('div',{key:day.date,style:{textAlign:'center'},'aria-label':day.date+'：'+(day.missing?t('未記錄'):day.states.map(stateLabel).join(t('、')))},h('div',{style:{minHeight:'48px',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:'3px'}},day.missing?h('span',{style:{color:'#7a8493'}},'—'):day.states.map((state,i)=>h('span',{key:i,title:stateLabel(state),'aria-label':stateLabel(state),className:'vet-stool-mark',role:'img','data-stool-state':state,style:{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'15px',height:'15px',borderRadius:'50%',background:VET_STOOL_COLORS[state],color:['soft','unknown'].includes(state)?'#17130e':'#fff',fontSize:'11px'}},({normal:t('正'),soft:t('軟'),diarrhea:t('瀉'),blood:t('血'),unknown:'?'})[state]))),h('small',null,day.date.slice(5).replace('-','/'))))),
 h('ul',{style:{display:'flex',flexWrap:'wrap',gap:'6px 12px',listStyle:'none',padding:0}},states.map(state=>h('li',{key:state},h('span',{'aria-hidden':true,className:'vet-stool-legend','data-stool-state':state,style:{color:VET_STOOL_COLORS[state]}},'● '),t('{state} {state2} 筆', {state: stateLabel(state), state2: m.counts[state]})))),h('p',null,m.stoolText),note(t('灰色問號為未分類，不計入正常、軟便、腹瀉或血便；灰線為未記錄，不代表正常或沒有排泄。'))),
 h('article',{style:cardStyle,'data-testid':'vet-feeding'},h('h3',null,t('餵食規律')),note(summaryRange(shiftSummaryDate(m.today,-6),m.today,t('最近一週'))+t(' · 已確認的每日餐數')),h('div',{style:{...grid,alignItems:'end'}},m.feeding.map(day=>h('div',{key:day.date,style:{textAlign:'center'},'aria-label':day.date+'：'+(day.missing?t('未記錄'):t('{count} 餐',{count:day.count}))},h('small',null,day.missing?'—':day.count),h('div',{style:{height:'64px',display:'flex',alignItems:'end',justifyContent:'center'}},h('div',{className:'vet-feeding-bar','data-missing':day.missing,style:{width:'65%',height:(day.missing?2:Math.max(6,day.count/max*60))+'px',background:day.missing?'#b6bdc6':'#5c83af',borderRadius:'4px 4px 0 0'}})),h('small',null,day.date.slice(5).replace('-','/'))))),h('p',null,m.feedingText),note(t('同一餐多食品只算一餐，舊紀錄沒有同餐連結時每筆算一餐；語音快記存成文字的餵食每筆算一餐。只計已確認的餵食，不把一般食慾觀察算一餐；灰線為未記錄，不代表沒有吃飯。'))),
 h('details',{className:'vet-calculation'},h('summary',null,t('怎麼算的？')),note(t('各圖表以標示的起訖日期為準，不隨上方文字摘要期間切換。只納入目前毛孩的實際紀錄，排除示範、草稿、刪除及未確認歸屬。筆數不等於實際發生頻率；有紀錄不保證完整涵蓋一天，以上觀察不提供診斷。')),m.highlights.map(item=>h('div',{key:item.id},h('strong',null,item.title+t('健康提醒')),...vetObservationParagraphs(item,m.today).map((paragraph,index)=>h('p',{key:index,className:'microcopy left'},paragraph))))));
}
