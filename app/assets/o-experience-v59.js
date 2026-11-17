import {t, tn, K} from './i18n.js?v=audit1117b';
import {LifeDiary,DiaryStrip} from './life-diary-ui.js?v=photo-simplify1';
import {displayStoredText,displayUserText,withStoredTexts} from './stored-text.js?v=i18n1';
import {WeightChart} from './record-summary.js?v=8f5745b7843b';
import {recordTitle,mealQuantityText} from './clear-presentation.js?v=audit1117';
import {recordSearchRows,filterRecordRows,nearestRecordDate,calendarCells,shiftMonth,categoryLabel,recordRowLabel,RecordAttribution,careNeedsScheduleText,recentRange,recordDateSections,recordFilterCategories} from './o-records-v59.js?v=photo-simplify1';
import {healthModel,careState,eligibleRecords,weightKg} from './health-summary-v31.js?v=photo-simplify1';
import {recordAmountText,careDoneName,appetiteStatusOf,APPETITE_LABELS} from './record-quantity.js?v=1';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {foodFamilyId,restoreFoodCards} from './food-archive-v35.js?v=food-simple1';
import {TaskSheet} from './navigation-shell.js?v=8f5745b7843b';
import {CareDoseDelete,removeCareDose} from './care-history.js?v=photo-simplify1';
import {deleteRecordAndRepairDrafts} from './meal-draft-references.js?v=8f5745b7843b';

function SwipeRecordResult({react:R,row,foodCards,enabled,revealed,onReveal,onOpen,onDelete}){
 const h=R.createElement,start=R.useRef(null),skipClick=R.useRef(false),card=R.useRef(null),action=R.useRef(null);
 const title=row.careId?t('已完成：{v0}', {v0: displayStoredText(careDoneName(row))}):recordTitle(row,foodCards);
 // 列表直接看到數量（喝水 ml、尿團數、體重、輸液量…）；「沒吃完」補上食慾狀態。標題已寫的不重複。
 // 「標題已寫」用存檔原文比對（英文標題是翻譯過的，單位字不同會誤判成沒寫）。
 const appetite=appetiteStatusOf(row),detail=row.feeding?mealQuantityText(row):[recordAmountText(row,row.careId?title:row.text),appetite&&!String(title).includes(APPETITE_LABELS[appetite])?APPETITE_LABELS[appetite]:''].filter(Boolean).join(' · ');
 const pointerDown=event=>{
  skipClick.current=false;
  if(event.isPrimary&&event.button===0)start.current={id:event.pointerId,x:event.clientX,y:event.clientY};
 };
 const pointerUp=event=>{
  const down=start.current;
  if(down?.id!==event.pointerId)return;
  start.current=null;
  const x=event.clientX-down.x,y=event.clientY-down.y;
  if(Math.abs(x)<14||Math.abs(x)<Math.abs(y)*1.4)return;
  skipClick.current=true;
  if(x<=-44)onReveal(row.id);
  if(x>=44&&revealed)onReveal(null);
 };
 const pointerCancel=event=>{if(start.current?.id===event.pointerId)start.current=null;};
 const closeAction=()=>{onReveal(null);card.current?.focus();};
 const cardKey=event=>{
  if(event.key==='ArrowLeft'){
   event.preventDefault();
   onReveal(row.id);
   requestAnimationFrame(()=>action.current?.focus());
  }else if(revealed&&['ArrowRight','Escape'].includes(event.key)){
   event.preventDefault();
   closeAction();
  }
 };
 const content=h('button',{ref:card,type:'button',className:'o-record-result',
  onClick:event=>{
   if(skipClick.current&&event.detail>0){skipClick.current=false;return;}
   onReveal(null);
   onOpen(row,event);
  },
  ...(enabled?{onPointerDown:pointerDown,onPointerUp:pointerUp,onPointerCancel:pointerCancel,onKeyDown:cardKey,'aria-keyshortcuts':'ArrowLeft'}:{})},
  // The day heading above the card carries the date; the card keeps the observation time and category.
  h('small',null,[row.time,recordRowLabel(row)].filter(Boolean).join(' · ')),h('strong',null,title),
  detail&&h('span',{className:'o-record-quantity'},detail),h(RecordAttribution,{react:R,row}),
  row.isDemo&&h('small',{className:'sample-label'},t('示範紀錄 · 不計入健康摘要')),h('span',{className:'o-result-link'},t('查看詳情 ›')));
 if(!enabled)return content;
 const owner=row.createdBy?.id||'',kind=row.careId?'dose':'record';
 // A visible delete sits beside (not inside) the card button; swipe-left and the detail page still delete too.
 return h('div',{className:'o-record-item','data-revealed':revealed},
  h('div',{className:'o-swipe-record','data-revealed':revealed},content,
   revealed&&h('button',{ref:action,type:'button',className:'o-swipe-delete','aria-label':t('刪除：{title}', {title}),
    'data-family-delete-owner':owner,'data-family-delete-kind':kind,
    onKeyDown:event=>{if(['ArrowRight','Escape'].includes(event.key)){event.preventDefault();closeAction();}},
    onClick:event=>onDelete(row,event)},t('刪除'))),
  !revealed&&h('button',{type:'button',className:'o-record-delete','aria-label':t('刪除：{title}', {title}),
   'data-family-delete-owner':owner,'data-family-delete-kind':kind,onClick:event=>onDelete(row,event)},t('刪除')));
}

export function RecordsExplorer(props){
 const {react:R,store,catId,petName,today}=props,h=R.createElement,[tab,setTab]=R.useState('all'),[startAdd,setStartAdd]=R.useState(false);
 R.useEffect(()=>{const open=()=>setTab('life');window.addEventListener('paw-diary-open-request',open);return()=>window.removeEventListener('paw-diary-open-request',open);},[]);
 return h(R.Fragment,null,h('style',null,'.ld-record-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 18px}.ld-record-tabs button{min-height:44px}.ld-record-tabs button[aria-pressed=true]{background:#a45c2e;color:#fff9ef}'),h('div',{className:'ld-record-tabs',role:'group','aria-label':t('紀錄檢視')},[['all',t('全部')],['life',t('生活日記')],['care',t('照護紀錄')]].map(([id,label])=>h('button',{key:id,type:'button',className:'secondary-btn','aria-pressed':tab===id,onClick:()=>setTab(id)},label))),tab==='life'&&store&&h(LifeDiary,{key:catId,react:R,store,catId,petName,today,portal:props.portal,startAdd,onStarted:()=>setStartAdd(false)}),tab==='all'&&store&&h(DiaryStrip,{key:catId,react:R,store,catId,today,onOpen:()=>setTab('life'),onAdd:()=>{setStartAdd(true);setTab('life');}}),tab!=='life'&&h(CareRecordsExplorer,props));
}
const NEW_RECORD_LABELS={[K('喝水')]:'＋ 記喝水',[K('排泄')]:'＋ 記排泄',[K('體重')]:'＋ 記體重'};
function CareRecordsExplorer({react:R,store,entries,careItems,foodCards,catId,today,date,onDate,category,onCategory,metric,onMetric,view,onView,onRecord,onCare,isDemoEntry,isDemoCare,portal,reportTools,petName}){
 const h=R.createElement,[limit,setLimit]=R.useState(15),[selected,setSelected]=R.useState(null),[filtersOpen,setFiltersOpen]=R.useState(false),[reportToolsOpen,setReportToolsOpen]=R.useState(false),dialog=R.useRef(null),trigger=R.useRef(null),filterHost=R.useRef(null);
 // Date range: 'recent' (today + 6 days before, the default), 'day' or 'all'. The retired care flower's
 // 'week' scope (removed 2026-11-14) falls back to 'recent'. A category chip never changes it; typing a search looks across all dates.
 const query=view.query||'',recent=recentRange(today);
 const chosenScope=view.scope==='all'?'all':view.scope==='day'?(date?'day':'all'):'recent';
 const scope=query.trim()?'all':chosenScope,month=view.month||(date||today).slice(0,7);
 const range=scope==='recent'?recent:{};
 const [deleteMessage,setDeleteMessage]=R.useState(''),search=R.useRef(null),reportPanel=R.useRef(null);
 const [revealed,setRevealed]=R.useState(null),[deleteTarget,setDeleteTarget]=R.useState(null),[deleteBusy,setDeleteBusy]=R.useState(false),[deleteError,setDeleteError]=R.useState(''),deleteLock=R.useRef(false),resultMeta=R.useRef(null);
 const rows=recordSearchRows(entries,careItems,foodCards,{catId,today,isDemo:isDemoCare,isDemoEntry});
 const base=filterRecordRows(rows,{category,metric,scope:'all'}),results=filterRecordRows(base,{query,date,scope,...range}),nearest=nearestRecordDate(base,date||today),counts=new Map();base.forEach(row=>counts.set(row.date,(counts.get(row.date)||0)+1));
 const update=patch=>{setLimit(15);onView({...view,...patch});};
 const chooseCategory=value=>{onCategory(value);onMetric(null);update({});};
 const chooseDate=next=>{onDate(next);update({scope:'day',query:'',calendar:false,month:next.slice(0,7)});};
 const dialogOpen=!!(selected||deleteTarget);
 usePhoneDialog(R,dialog,dialogOpen);
 R.useEffect(()=>{if(dialogOpen)dialog.current?.showModal?.();else{dialog.current?.close?.();trigger.current?.focus?.();}},[dialogOpen]);
 R.useEffect(()=>{setRevealed(null);},[catId,date,category,metric,query,scope]);
 // One bar after a delete. For a simple observation 「復原」 puts back only that record, so records added
 // afterwards stay; the pre-delete copy is still taken (Settings 「復原最近一次刪除」 keeps working).
 // Meals (change markers, drafts) and care doses use the shared full-copy bar instead.
 const [undoEntry,setUndoEntry]=R.useState(null);
 const closeMessage=()=>{setDeleteMessage('');setUndoEntry(null);};
 R.useEffect(()=>{if(!deleteMessage)return undefined;const timer=setTimeout(closeMessage,undoEntry?10000:3500);return()=>clearTimeout(timer);},[deleteMessage,undoEntry]);
 R.useEffect(()=>{setUndoEntry(null);setDeleteMessage('');},[catId]);
 R.useEffect(()=>{if(deleteMessage)globalThis.document?.getElementById('inpaw-snack')?.remove();},[deleteMessage]);
 const sharedSnack=message=>{closeMessage();if(window.__deleteSafety)window.__deleteSafety.snack(message);else setDeleteMessage(message);};
 const undoDelete=async()=>{
  const saved=undoEntry;
  if(!saved||saved.catId!==catId)return;
  setUndoEntry(null);
  try{
   await store.atomic(data=>data.entries.some(item=>item.id===saved.entry.id)?data:{...data,entries:[saved.entry,...data.entries]});
   setDeleteMessage(t('已復原這筆紀錄'));
  }catch(error){setDeleteMessage(t('復原沒有成功，紀錄維持已刪除。'));}
 };
 R.useEffect(()=>{
  if(reportToolsOpen)reportPanel.current?.scrollIntoView?.({block:'nearest'});
 },[reportToolsOpen]);
 const openRow=(row,event)=>{if(row.careId){trigger.current=event.currentTarget;setSelected(row);}else onRecord(row);};
 const requestDelete=(row,event)=>{
  trigger.current=event.currentTarget;
  setDeleteError('');
  setDeleteTarget({row,snapshot:entries.find(item=>item.id===row.id)});
 };
 const cancelDelete=()=>{if(!deleteLock.current)setDeleteTarget(null);};
 const confirmDelete=async()=>{
  if(!deleteTarget||deleteLock.current)return;
  const {row,snapshot}=deleteTarget;
  deleteLock.current=true;
  setDeleteBusy(true);
  setDeleteError('');
  try{
   const kept=window.__deleteSafety?await window.__deleteSafety.guard(row.careId?t('刪除一筆疫苗或驅蟲'):t('刪除一筆紀錄')):false;
   await store.atomic(data=>{
    if(row.careId)return removeCareDose(data,row.careId,row.date);
    const current=data.entries.find(item=>item.id===row.id);
    if(!current||!snapshot||JSON.stringify(current)!==JSON.stringify(snapshot))throw Error(t('這筆紀錄已變更或刪除，請關閉後重新查看。'));
    return deleteRecordAndRepairDrafts(data,row.id);
   });
   trigger.current=resultMeta.current;
   setRevealed(null);
   setDeleteTarget(null);
   if(!row.careId&&snapshot&&!snapshot.feeding){
    setUndoEntry({catId,entry:snapshot});
    setDeleteMessage(kept?t('紀錄已刪除'):t('紀錄已刪除（這次沒有留下刪除前副本，只能在這裡復原）'));
   }else sharedSnack(row.careId?t('已刪除 {date} 的疫苗或驅蟲紀錄，最近一次與待辦已重新計算。', {date: row.date}):t('紀錄已刪除'));
  }catch(error){setDeleteError(tn(error.message)||t('刪除尚未保存，請重試。'));}
  finally{deleteLock.current=false;setDeleteBusy(false);}
 };
 const deleting=deleteTarget?.row;
 const shortDay=value=>String(value||'').slice(5).replace('-','/');
 const metricText=metric==='urine'?t('尿尿'):metric==='bowel'?t('便便'):metric==='mood'?t('精神狀態'):'';
 const rangeText=query.trim()?t('搜尋全部日期'):scope==='all'?t('全部日期'):scope==='recent'?t('最近 7 天（{v0}～{v1}）', {v0: shortDay(recent.start), v1: shortDay(recent.end)}):(date===today?t('今天 '):'')+(date||today).replaceAll('-','/');
 const filterSummary=`${metricText||(category===K('全部')?t('全部類別'):categoryLabel(category))} · ${rangeText}`;
 const filterCount=(category!==K('全部')||metric?1:0)+(chosenScope!=='recent'?1:0);
 const resetFilters=()=>{onCategory(K('全部'));onMetric(null);onDate(today);update({scope:'recent',query:'',calendar:false,month:today.slice(0,7)});};
 const filterSheet=filtersOpen&&h(TaskSheet,{react:R,title:t('篩選紀錄'),onClose:()=>setFiltersOpen(false)},h('div',{className:'o-filter-sheet-body',style:{padding:'16px 18px 28px'}},
  h('h3',null,t('紀錄類別')),
  h('div',{className:'o-filter-track','aria-label':t('紀錄類別'),style:{flexWrap:'wrap',overflow:'visible'}},recordFilterCategories(rows,category).map(value=>h('button',{key:value,type:'button','aria-pressed':category===value,style:{minHeight:44},onClick:()=>chooseCategory(value)},categoryLabel(value)))),
  h('h3',null,t('日期範圍')),
  h('div',{className:'o-record-scope'},
   h('button',{type:'button','aria-pressed':chosenScope==='day'&&date===today,onClick:()=>chooseDate(today)},t('今天')),
   h('button',{type:'button','aria-pressed':chosenScope==='recent',onClick:()=>update({scope:'recent',query:'',calendar:false})},t('最近 7 天')),
   h('button',{type:'button','aria-pressed':chosenScope==='all',onClick:()=>update({scope:'all'})},t('全部日期'))),
  h('p',{className:'microcopy left o-day-pick-label'},t('或指定某一天')),
  h('div',{className:'o-date-switch'},h('button',{type:'button','aria-label':t('前一天'),onClick:()=>chooseDate(new Date(Date.parse((date||today)+'T12:00:00Z')-864e5).toISOString().slice(0,10))},'‹'),h('button',{type:'button','aria-label':t('開啟紀錄月曆'),'aria-expanded':!!view.calendar,onClick:()=>update({calendar:!view.calendar})},(chosenScope==='day'?(date||today).replaceAll('-','/'):t('選擇日期'))+' ▾'),h('button',{type:'button','aria-label':t('後一天'),disabled:(date||today)>=today,onClick:()=>chooseDate(new Date(Date.parse((date||today)+'T12:00:00Z')+864e5).toISOString().slice(0,10))},'›')),
  view.calendar&&h('section',{className:'o-calendar','aria-label':t('紀錄月曆')},h('div',{className:'o-month-nav'},h('button',{type:'button','aria-label':t('上一個月'),onClick:()=>update({month:shiftMonth(month,-1)})},'‹'),h('label',null,t('月份'),h('input',{type:'month','aria-label':t('跳至月份'),max:today.slice(0,7),value:month,onChange:e=>{if(calendarCells(e.target.value).length&&e.target.value<=today.slice(0,7))update({month:e.target.value});}})),h('button',{type:'button','aria-label':t('下一個月'),disabled:month>=today.slice(0,7),onClick:()=>update({month:shiftMonth(month,1)})},'›')),h('div',{className:'o-calendar-grid'},...t('日一二三四五六').split('').map((day,i)=>h('span',{key:i,className:'o-weekday'},day)),...calendarCells(month).map((day,i)=>day?h('button',{type:'button',key:day,disabled:day>today,'aria-label':day+(counts.has(day)?t('，有 {v0} 筆紀錄', {v0: counts.get(day)}):t('，沒有紀錄')),'aria-pressed':chosenScope==='day'&&day===date,onClick:()=>chooseDate(day)},Number(day.slice(-2)),counts.has(day)&&h('i',{'aria-hidden':true})):h('span',{key:'empty'+i}))),h('p',{className:'microcopy left'},t('● 表示這天有目前分類的紀錄。')),h('button',{type:'button',className:'text-btn',onClick:()=>chooseDate(today)},t('回到今天'))),
  h('p',{role:'status',className:'microcopy left'},t('{filterSummary} · {n} 筆紀錄', {filterSummary, n: results.length})),
  h('button',{type:'button',className:'secondary-btn',onClick:resetFilters,style:{width:'100%',margin:'8px 0'}},t('重設篩選')),
  h('button',{type:'button',className:'primary',onClick:()=>setFiltersOpen(false),style:{width:'100%',marginTop:8}},t('完成篩選'))));
 const searchLabel=t('搜尋全部日期');
 // Fixed bar at the bottom of the screen (same look and place as the shared delete bar), rendered on <body>.
 const deleteBar=deleteMessage&&h('div',{role:'status','aria-live':'polite',className:'inpaw-snack o-record-snack'},h('span',null,deleteMessage),undoEntry&&h('button',{type:'button',className:'is-primary',onClick:undoDelete},t('復原')),h('button',{type:'button',onClick:closeMessage},t('關閉')));
 return h('section',{className:'o-record-browser','aria-label':t('搜尋與回顧紀錄')},
  h('div',{className:'o-record-toolbar'},
   h('div',{className:'o-filter-track record-category-shortcuts',role:'group','aria-label':t('常用紀錄分類')},
    [[K('全部'),'all'],[K('飲食'),'food'],[K('排泄'),'stool'],[K('體重'),'weight']].map(([value,kind])=>h('button',{key:value,type:'button','data-care-metric':kind,'aria-pressed':category===value,onClick:()=>chooseCategory(value)},categoryLabel(value)))),
   h('button',{type:'button',className:'o-filter-icon','aria-label':t('篩選，目前 {filterCount} 個條件', {filterCount}),'aria-haspopup':'dialog','aria-expanded':filtersOpen,onClick:event=>{filterHost.current=event.currentTarget.closest('.navigation-route-surface')||event.currentTarget.closest('.inpaw-app');closeMessage();setFiltersOpen(true);}},
    h('svg',{viewBox:'0 0 24 24',width:20,height:20,'aria-hidden':true,focusable:'false'},h('path',{d:'M4 7h16M7 12h10M10 17h4',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round'})),
    filterCount>0&&h('span',{className:'o-filter-count','aria-hidden':true},filterCount))),
  // 2026-11-17：從「更多照護 → 喝水」等入口帶進來的篩選會留著；明寫「只看：…」並可一鍵清除，免得以為紀錄不見了。
  filterCount>0&&h('div',{className:'o-active-filter',role:'status'},h('span',null,t('只看：{filterSummary}',{filterSummary})),h('button',{type:'button',className:'text-btn',onClick:resetFilters,'aria-label':t('清除篩選，顯示全部紀錄')},t('✕ 清除'))),
  h('label',{className:'o-search'},h('span',{className:'o-visually-hidden'},searchLabel),h('input',{ref:search,type:'search','aria-label':t('搜尋紀錄'),placeholder:t('搜尋全部日期的內容、食品名稱'),value:query,onChange:e=>update({query:e.target.value})})),
  h('div',{className:'record-result-meta',ref:resultMeta,tabIndex:-1},
   h('p',{role:'status',className:'microcopy left','aria-label':t('目前篩選條件：{filterSummary}，{n} 筆', {filterSummary, n: results.length})},t('{filterSummary} · {n} 筆{metricText}紀錄', {filterSummary, n: results.length, metricText}))),
  category===K('飲食')&&h('p',{className:'record-summary-note'},t('一餐多種食品仍算一餐；這裡保留每項食品的原始紀錄。一般食慾觀察不算餐次。')),
  category===K('體重')&&h('section',{className:'record-weight-panel','aria-label':t('體重量測詳情')},h('h2',null,t('體重量測')),h('p',{className:'record-summary-note'},t('依目前篩選條件，只顯示此毛孩的有效、非示範量測。')),h(WeightChart,{react:R,rows:eligibleRecords(results,today,catId,isDemoEntry).filter(r=>weightKg(r)!==null).map(r=>({...r,kg:weightKg(r)})),onRecord})),
  results.length?h('div',{className:'o-record-results'},recordDateSections(results.slice(0,limit),today).map(section=>h('section',{key:section.date,className:'o-record-day','aria-label':t('{label}，{n} 筆', {label: section.label, n: section.rows.length})},
    h('h3',{className:'o-record-day-title'},section.label),
    section.rows.map(row=>h(SwipeRecordResult,{key:row.id,react:R,row,foodCards,enabled:!!store,revealed:revealed===row.id,onReveal:setRevealed,onOpen:openRow,onDelete:requestDelete})))),results.length>limit&&h('button',{type:'button',className:'secondary-btn',onClick:()=>setLimit(n=>n+15)},t('顯示更多紀錄（還有 {limit} 筆）', {limit: results.length-limit}))):h('section',{className:'o-empty'},h('p',null,query.trim()?t('沒有符合搜尋的紀錄。'):scope==='all'?t('這個分類還沒有紀錄。'):scope==='recent'?t('最近 7 天還沒有這類紀錄。'):t('這天還沒有記錄。')),
   // 2026-11-17：篩選單一可新增的類別（例如從更多照護進來的喝水）時，空狀態直接給新增按鈕。
   !query.trim()&&NEW_RECORD_LABELS[category]&&h('button',{type:'button',className:'secondary-btn o-empty-add',onClick:()=>window.dispatchEvent(new CustomEvent('paw-record-new-request',{detail:{category}}))},t(NEW_RECORD_LABELS[category])),query.trim()?h('button',{type:'button',className:'text-btn',onClick:()=>update({query:''})},t('清除搜尋')):['day','recent'].includes(scope)&&nearest&&!(scope==='recent'&&nearest>=recent.start)&&h(R.Fragment,null,h('p',null,t('最近有記錄的是 {nearest}', {nearest})),h('button',{type:'button',className:'secondary-btn',onClick:()=>chooseDate(nearest)},t('前往最近紀錄')))),
  reportTools&&h('div',{className:'record-report-footer'},
   h('button',{type:'button',className:'record-report-link','aria-expanded':reportToolsOpen,'aria-controls':'record-report-panel-'+catId,onClick:()=>setReportToolsOpen(value=>!value)},t('看懂報告與備份')),
   reportToolsOpen&&h('div',{ref:reportPanel,className:'record-report-tools',id:'record-report-panel-'+catId,role:'region','aria-label':t('報告與匯出')},reportTools)),
  deleteBar&&(portal&&globalThis.document?.body?portal(deleteBar,globalThis.document.body):deleteBar),
  filterSheet&&(portal&&filterHost.current?portal(filterSheet,filterHost.current):filterSheet),
  h('dialog',{ref:dialog,className:deleting?'m-action-dialog':'o-care-dialog','aria-label':deleting?t('確認刪除紀錄'):t('完成紀錄'),onCancel:event=>{event.preventDefault();if(deleting)cancelDelete();else setSelected(null);}},
   deleting?h(R.Fragment,null,
    h('h2',null,deleting.careId?t('刪除這筆完成紀錄？'):t('刪除這筆紀錄？')),
    h('p',null,`${deleting.date} ${deleting.time||''} · ${deleting.careId?displayStoredText(deleting.text):recordTitle(deleting,foodCards)}`),
    h('p',null,deleting.careId?t('上次完成日期與待辦會重新計算；已安排的下次日期保持不變。'):deleting.feeding?t('刪除後，這筆餵食及由它建立、尚未獨立修改的換糧標記都會移除。'):t('刪除後，這筆資料也會從新的摘要整理移除。')),
    deleteError&&h('p',{role:'alert',className:'error'},deleteError),
    h('button',{type:'button',className:'secondary-btn',autoFocus:true,disabled:deleteBusy,onClick:cancelDelete},t('先不刪')),
    h('button',{type:'button',className:'primary danger',disabled:deleteBusy,'data-family-delete-owner':deleting.createdBy?.id||'','data-family-delete-kind':deleting.careId?'dose':'record',onClick:confirmDelete},deleteBusy?t('正在保存…'):t('確認刪除'))):
   selected&&h(R.Fragment,null,h('h2',null,displayStoredText(careDoneName(selected))),h('p',null,t('完成日：{v0}', {v0: String(selected.date||'').replaceAll('-','/')})),h(RecordAttribution,{react:R,row:selected,detail:true}),h('p',null,t('類型：{kind}', {kind: displayStoredText(selected.kind)})),selected.note&&h('p',null,displayStoredText(selected.note)),h('p',{className:'microcopy left'},t('來自照顧時間表的完成紀錄，同一筆資料不重複計入日常觀察。')),h('button',{type:'button',className:'primary',onClick:()=>{const id=selected.careId;setSelected(null);onCare(id);}},t('前往這項提醒')),store&&h(CareDoseDelete,{react:R,store,item:selected.item,date:selected.date,onDeleted:()=>{closeMessage();setSelected(null);search.current?.focus();}}),h('button',{type:'button',className:'text-btn centered',onClick:()=>setSelected(null),autoFocus:true},t('返回紀錄')))));
}

export function VetHealthNotices({react:R,...data}){const h=R.createElement,m=healthModel(data);return m.highlights.length?h('section',{className:'o-health-notices','aria-label':t('健康提醒')},h('h2',null,t('健康提醒')),m.highlights.map(item=>h('article',{className:'health-insight',key:item.id},h('h3',null,item.title),h('p',null,item.text),item.calculation!==item.text&&h('details',null,h('summary',null,t('查看計算方式')),h('p',null,item.calculation)))),h('p',{className:'microcopy left'},t('各項依原有觀察期間計算，期間標於內容中；不隨上方彙總期間變更，不代表診斷。'))):null;}
export function CarePendingReason({react:R,item,today}){const state=careState(item,today),text=state==='needs-scheduling'?t('這次完成已記錄；')+careNeedsScheduleText(item):state==='unscheduled'?t('尚未安排日期，仍在照顧時間表上。'):state==='overdue'?t('下次日期已過，仍在照顧時間表上。'):state==='due'?t('今天到期，仍在照顧時間表上。'):state==='upcoming'?t('已進入提前提醒期間，仍在照顧時間表上。'):'';return text?R.createElement('p',{className:'o-care-reason'},text):null;}
export function RecentlyDeletedFoods({react:R,store}){
 const h=R.createElement,view=R.useSyncExternalStore(store.subscribe,store.get),[busy,setBusy]=R.useState(''),[message,setMessage]=R.useState(''),[error,setError]=R.useState(''),lock=R.useRef(false);
 const groups=new Map();for(const food of view.data.foodCards){if(!food.archived)continue;const key=foodFamilyId(food);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(food);}const groupsSorted=[...groups.values()].sort((a,b)=>b[0].archived.at.localeCompare(a[0].archived.at));
 const restore=async family=>{if(lock.current)return;lock.current=true;setBusy(foodFamilyId(family[0]));setError('');try{await store.atomic(data=>{const live=data.foodCards.filter(food=>foodFamilyId(food)===foodFamilyId(family[0])&&food.archived);if(!live.length)throw Error(t('這張食品卡已復原，請重新查看清單。'));const markers=[...new Map(live.map(food=>[food.archived.batchId,food.archived])).values()];return {...data,foodCards:markers.reduce((cards,marker)=>restoreFoodCards(cards,marker),data.foodCards)};});setMessage(t('已復原：{v0}，已回到食品清單。', {v0: [...family].sort((a,b)=>b.version-a.version)[0].name}));}catch(error){setError(tn(error.message)||t('復原尚未保存，請重試。'));}finally{lock.current=false;setBusy('');}};
 if(!groupsSorted.length&&!message&&!error)return null;
 return h('details',{className:'o-deleted-foods',id:'recently-deleted-foods','aria-label':t('最近刪除的食品卡')},h('summary',null,t('最近刪除（{n} 張）', {n: groupsSorted.length})),h('p',{className:'microcopy left'},t('刪除的食品卡留在這台裝置，可以隨時復原。')),message&&h('p',{role:'status',className:'care-success'},message),error&&h('p',{role:'alert',className:'error'},error),groupsSorted.length?groupsSorted.map(family=>{const latest=[...family].sort((a,b)=>b.version-a.version)[0];return h('article',{key:foodFamilyId(latest)},h('strong',null,latest.name),h('small',null,t('版本 {v0} · 共 {n} 版', {v0: family.map(f=>f.version).sort((a,b)=>a-b).map(v=>'v'+v).join(t('、')), n: family.length})),h('button',{type:'button',className:'secondary-btn',disabled:!!busy,onClick:()=>restore(family)},busy===foodFamilyId(latest)?t('復原中…'):t('復原 {name}', {name: latest.name})));}):h('p',null,t('沒有已刪除的食品卡。')));
}
