import {t, K} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
import {CareJourneyCard} from "/xbb-site/app/assets/care-journey-ui.js?v=photo-simplify1";
import {NavigationIcon} from '/xbb-site/app/assets/navigation-icons.js?v=cuteexpanded1';
import {careByCat,careTimeline} from '/xbb-site/app/assets/care-schedule.js?v=photo-simplify1';
import {activeMeds} from '/xbb-site/app/assets/vet-visit-model.js?v=1';
import {DoseSlotActions} from '/xbb-site/app/assets/vet-visit-ui.js?v=photo-simplify1';
import {recordCareDose} from '/xbb-site/app/assets/m-draft-care-v42.js?v=r4';
import {applyScopedSoundTransform} from '/xbb-site/app/assets/multi-cat-v23.js?v=photo-simplify1';
import {FamilyAnomalyBadge,FamilyHouseholdCare} from '/xbb-site/app/assets/family-household-care.js?v=family-care1';
/** 每隻毛孩最近的照護（最多 2 項，已排日期的才列）與今天的藥。 */
export function familyCareLines(rootData,catId,today){
 const cat=careByCat(rootData).find(c=>c.id===catId);
 const care=cat?careTimeline(cat.items,today).filter(row=>['overdue','due','upcoming','scheduled','needs-scheduling'].includes(row.state)).slice(0,2):[];
 const meds=activeMeds(rootData,catId,today),slots=meds.flatMap(m=>m.slots);
 return {care,medRows:meds,meds:meds.length?{count:meds.length,taken:slots.filter(s=>s.taken).length,total:slots.length}:null};
}
const colors=row=>({'--pet-ink':row.color.ink,'--pet-coat':row.color.coat,'--pet-pale':row.color.pale});
const portrait=(h,row,active=false)=>h('span',{className:'family-portrait'},h('img',{src:row.photo,alt:'',draggable:false}),active&&h('span',{className:'family-check','aria-hidden':true},'✓'));
const allIcon=R=>R.createElement('span',{className:'family-all-icon','aria-hidden':true},R.createElement(NavigationIcon,{react:R,name:'family-cats'}));

// Read actual layout, not the number of pets: three short names may fit on a wide screen.
export function familyRailOverflow(node){
 const width=Math.max(0,node?.clientWidth||0),extent=Math.max(0,(node?.scrollWidth||0)-width),left=Math.max(0,Math.min(extent,node?.scrollLeft||0));
 const overflow=width>0&&extent>1;
 return {overflow,before:overflow&&left>1,after:overflow&&extent-left>1};
}
export function observeFamilyRail(node,onChange,win=node?.ownerDocument?.defaultView){
 if(!node)return()=>{};
 let previous='',frame=null,stopped=false;
 const measure=()=>{frame=null;if(stopped)return;const state=familyRailOverflow(node),key=JSON.stringify(state);if(key!==previous){previous=key;onChange(state)}};
 const schedule=()=>{if(stopped||frame!==null)return;if(win?.requestAnimationFrame)frame=win.requestAnimationFrame(measure);else measure()};
 const observer=win?.ResizeObserver?new win.ResizeObserver(schedule):null;
 observer?.observe(node);for(const child of node.children||[])observer?.observe(child);
 node.addEventListener('scroll',schedule,{passive:true});win?.addEventListener?.('resize',schedule);
 const fonts=node.ownerDocument?.fonts;fonts?.addEventListener?.('loadingdone',schedule);fonts?.ready?.then(schedule);
 measure();
 return()=>{stopped=true;observer?.disconnect();node.removeEventListener('scroll',schedule);win?.removeEventListener?.('resize',schedule);fonts?.removeEventListener?.('loadingdone',schedule);if(frame!==null)win?.cancelAnimationFrame?.(frame)};
}
export function familyCatLabels(rows){
 const totals=new Map(),seen=new Map();
 for(const row of rows){const name=row.name.trim();totals.set(name,(totals.get(name)||0)+1)}
 return rows.map(row=>{const name=row.name.trim(),index=(seen.get(name)||0)+1;seen.set(name,index);return totals.get(name)>1?t('{name}（同名 {index}/{total}）',{name:row.name,index,total:totals.get(name)}):row.name});
}
export function FamilyRail({react:R,family,disabled=false,compact=false}){
 const h=R.createElement,selected=R.useRef(null),rail=R.useRef(null),currentIndex=family.rows.findIndex(row=>row.id===family.activeId),busy=disabled||family.busy;
 const [scroll,setScroll]=R.useState({overflow:false,before:false,after:false}),labels=familyCatLabels(family.rows),layoutKey=JSON.stringify(family.rows.map(row=>[row.id,row.name]));
 const currentLabel=labels[currentIndex];
 R.useEffect(()=>{const item=selected.current,node=rail.current;if(!family.overview&&item&&node){const left=item===node.firstElementChild?0:item.offsetLeft,right=item===node.lastElementChild?node.scrollWidth:item.offsetLeft+item.offsetWidth;if(left<node.scrollLeft)node.scrollLeft=left;else if(right>node.scrollLeft+node.clientWidth)node.scrollLeft=right-node.clientWidth;}},[family.activeId,family.overview,layoutKey]);
 R.useEffect(()=>observeFamilyRail(rail.current,setScroll),[layoutKey]);
 if(compact){const row=family.rows[currentIndex];return h('section',{className:'pet-switch-row','aria-label':t('目前照顧的毛孩')},
  h('span',{className:'pet-switch-who'},family.overview||!row?h('span',{className:'pet-switch-avatar is-all'},allIcon(R)):h('img',{className:'pet-switch-avatar',src:row.photo,alt:'',draggable:false}),h('strong',{title:family.overview?t('全家總覽'):currentLabel},family.overview?t('全家總覽'):currentLabel||t('請選擇毛孩'))),
  h('span',{className:'today-pet-actions'},
   h('button',{type:'button',className:'today-pet-switch',disabled:busy,onClick:family.onManage,'aria-haspopup':'dialog'},t('切換毛孩'),h('svg',{viewBox:'0 0 24 24',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:2.4,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'m6 9 6 6 6-6'}))),
   family.rows.length>1&&!family.overview&&h('button',{type:'button',className:'today-family-link',disabled:busy,onClick:family.onOverview},t('全家總覽'))),
  family.error&&h('p',{role:'alert',className:'family-error'},family.error));}
 return h('section',{className:'family-switcher family-quick-switch'+(compact?' is-compact':''),'aria-label':t('毛孩快速切換')},
  h('div',{className:'family-owner-line'},h('p',{title:family.overview?t('全家總覽'):currentLabel},family.overview?t('目前查看：'):t('目前照顧：'),h('strong',null,family.overview?t('全家總覽'):currentLabel||t('請選擇毛孩'))),h('button',{type:'button',className:'family-manage',disabled:busy,onClick:family.onManage},t('切換毛孩 ›'))),
  h('div',{className:'family-quick-row'},h('button',{type:'button',className:'family-all-tab'+(family.overview?' is-selected':''),'aria-label':t('查看全家總覽'),'aria-pressed':!!family.overview,disabled:busy,onClick:family.onOverview},allIcon(R),h('span',null,t('全家'))),
   h('div',{className:'family-cat-window'+(scroll.before?' has-before':'')+(scroll.after?' has-after':'')},
    h('div',{ref:rail,className:'family-cat-strip',role:'group','aria-label':scroll.overflow?t('選擇毛孩，可左右滑動'):t('選擇毛孩')},family.rows.map((row,index)=>{const active=!family.overview&&row.id===family.activeId;return h('button',{key:row.id,ref:active?selected:undefined,type:'button',className:'family-cat-tab'+(active?' is-selected':''),style:colors(row),'aria-label':active?t('目前照顧：{index}',{index:labels[index]}):t('切換照顧：{index}',{index:labels[index]}),'aria-pressed':active,title:row.name,disabled:busy,onClick:()=>family.onSwitch(row.id)},portrait(h,row),h('span',null,labels[index]));})))),
  scroll.overflow&&h('p',{className:'family-scroll-hint','aria-hidden':true},t('左右滑動選擇毛孩')),
  family.rows.length>4&&h('label',{className:'family-jump'},h('span',null,t('{count} 隻毛孩 · 快速選擇',{count:family.rows.length})),h('select',{'aria-label':t('選擇任一毛孩'),value:family.overview?'':family.activeId,disabled:busy,onChange:e=>{if(e.target.value)family.onSwitch(e.target.value)}},h('option',{value:'',disabled:true},t('選擇毛孩')),family.rows.map((row,index)=>h('option',{key:row.id,value:row.id},labels[index])))),
  family.error&&h('p',{role:'alert',className:'family-error'},family.error));
}

export function FamilyOverview({react:R,family,careRoot}){
 const h=R.createElement,head=R.useRef(null),labels=familyCatLabels(family.rows),rootData=careRoot?.get?.().data;
 const [busy,setBusy]=R.useState(''),[done,setDone]=R.useState({}),[householdRequest,setHouseholdRequest]=R.useState(null);
 // 家庭與單隻用藥共用相同狀態編輯器，避免例外情況看起來只是未勾選。
 const act=async(key,transform,after)=>{if(busy||!careRoot?.atomic)return;setBusy(key);try{await careRoot.atomic(transform);after?.();}catch(e){setDone(d=>({...d,[key]:e.message||t('沒有存到，請再試一次。')}));}finally{setBusy('');}};
 R.useEffect(()=>{head.current?.focus({preventScroll:true})},[]);
 return h('section',{className:'family-overview','data-testid':'family-overview'},
  h('header',{className:'family-heading'},h('div',{className:'family-heading-top'},h('p',{className:'family-date'},family.today.replaceAll('-','/'))),h('h1',{ref:head,tabIndex:-1},t('全家總覽')),h('p',null,t('疫苗、驅蟲、回診和今天的藥，全家一起看。'))),
  h(FamilyRail,{react:R,family}),
  h('div',{className:'family-daily-summary'},h('span',null,h('strong',null,family.rows.length),t(' 位毛孩',{count:family.rows.length})),h('span',null,h('strong',null,family.totalPending),t(' 項照護要做',{count:family.totalPending})),h('span',null,t('今天已記 '),h('strong',null,family.totalMeals),t(' 餐',{count:family.totalMeals}))),
  careRoot&&h('div',{className:'family-household-shortcuts',role:'group','aria-label':t('家庭快速記錄')},[['bowl',t('記共用食盆')],['litter',t('記家庭清砂')]].map(([kind,label])=>h('button',{key:kind,type:'button',disabled:family.busy||!!busy,onClick:()=>setHouseholdRequest(previous=>({kind,id:(previous?.id||0)+1}))},label))),
  h('p',{className:'family-add-hint'},t('在毛孩卡片按「幫牠記一筆」，就能新增牠的紀錄。')),
  h('div',{className:'family-cards'},family.rows.map((row,index)=>h('article',{key:row.id,className:'family-care-card',style:colors(row),'aria-label':t('{index}的今日照護',{index:labels[index]})},
   h('div',{className:'family-card-top'},portrait(h,row),h('div',{className:'family-card-name'},h('strong',null,labels[index]),h('small',null,t('今日照護')))),
   (()=>{const lines=rootData?familyCareLines(rootData,row.id,family.today):{care:[],meds:null};return h('ul',{className:'family-care-next','aria-label':t('{index}的照顧時間表',{index:labels[index]})},
    lines.care.length?lines.care.map(item=>{const key=row.id+'.'+item.id;return h('li',{key:item.id,className:item.urgent?'is-urgent':''},h('strong',null,item.label),h('span',null,done[key]||item.text),
      item.urgent&&item.label!==K('回診')&&item.label!==t('回診')&&h('button',{type:'button',className:'family-care-done',disabled:!!busy,'aria-label':t('{index}：{label}做完了',{index:labels[index],label:item.label}),onClick:()=>act(key,d=>applyScopedSoundTransform(d,row.id,data=>recordCareDose(data,item.id,family.today,family.today)),()=>setDone(v=>({...v,[key]:t('已記下，下次日期到牠的照護填')})))},t('做完了')));}):lines.medRows.length?null:h('li',{className:'family-care-none'},h('span',null,t('還沒有排疫苗或驅蟲日期'))),
    lines.medRows.map(med=>h('li',{key:'m'+med.visitId+med.med.id,className:'family-care-meds'},h('strong',null,t('吃藥：{name}',{name:med.med.name})),
      h('div',{className:'family-med-slots'},med.slots.map(slot=>h(DoseSlotActions,{key:slot.key,react:R,root:careRoot,catId:row.id,visitId:med.visitId,med:med.med,slot,today:family.today}))))));})(),
   h('div',{className:'family-card-stats'},h('span',null,h('small',null,t('照護要做')),h('strong',null,row.pending,h('small',null,t(' 項',{count:row.pending})))),h('span',null,h('small',null,t('今天已記')),h('strong',null,row.meals,h('small',null,t(' 餐',{count:row.meals}))))),
   rootData&&h(FamilyAnomalyBadge,{react:R,root:rootData,catId:row.id,today:family.today,label:labels[index],onOpen:family.busy?undefined:()=>family.onSwitch(row.id)}),
   !row.meals&&!row.pending&&!row.drafts?null:h(R.Fragment,null,
    row.meals>0&&h('p',{className:'family-last-meal'},h('img',{src:'/xbb-site/app/assets/icons/bowl-food.svg',alt:''}),row.lastMeal),
    row.drafts>0&&h('p',{className:'family-draft-pill'},t('{drafts} 筆未完成的紀錄等你接著記',{drafts:row.drafts,count:row.drafts}))),
   h('div',{className:'family-card-actions'},h('button',{type:'button',disabled:family.busy,'aria-label':t('查看{index}的今日照護',{index:labels[index]}),onClick:()=>family.onSwitch(row.id)},t('查看今日')),h('button',{type:'button',className:'family-card-add',disabled:family.busy,'aria-label':t('幫{index}記一筆',{index:labels[index]}),onClick:()=>family.onRecord(row.id)},t('＋ 幫牠記一筆')))))),
  careRoot&&h(FamilyHouseholdCare,{react:R,root:careRoot,rows:family.rows,labels,today:family.today,request:householdRequest}),
  careRoot&&h('section',{className:'care-family-journeys','aria-label':t('全家照護觀察')},h('h2',null,t('照護觀察')),family.rows.map(row=>h(CareJourneyCard,{key:row.id,react:R,root:careRoot,catId:row.id,today:family.today,compact:true}))),
  h('aside',{className:'family-footnote'},h('strong',null,t('小提醒，安心記')),h('p',null,t('餐數只計已確認的餵食紀錄；尚無紀錄不代表沒有吃。'))),
  h('button',{type:'button',className:'family-add-pet',disabled:family.busy,onClick:family.onManage},allIcon(R),h('span',null,h('strong',null,t('讓家裡的毛孩都到齊')),h('small',null,t('新增與管理毛孩 ›')))),
  h('p',{className:'family-demo-note'},t('每隻毛孩的資料分開儲存，不會和家人同步。')));
}
