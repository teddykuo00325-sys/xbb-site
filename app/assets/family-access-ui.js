import {t, K, isEnglish} from './i18n.js?v=audit1117b';
import {activePetEntries} from './pet-archive.js?v=8f5745b7843b';
import {FAMILY_SHARING_ENABLED} from './family-feature.js?v=8f5745b7843b';
import {currentMember,careAssignee} from './family-sharing-model.js?v=8f5745b7843b';
import {FamilyIdentity,FamilyMembers,familyEventText} from './family-sharing-ui.js?v=8f5745b7843b';
import {recordSearchRows,filterRecordRows,RecordAttribution} from './o-records-v59.js?v=photo-simplify1';
import {VetTrends,careState,eligibleRecords} from './health-summary-v31.js?v=photo-simplify1';
import {VetHealthNotices} from './o-experience-v59.js?v=photo-simplify1';
import {FamilyCareEntry} from './family-care-status.js?v=8f5745b7843b';
import {localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';

export function familyPermissionNotice(error){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('family-permission-error',{detail:error?.message||t('目前身分不能修改這項資料。')}));
}
// These are presentation safeguards. Durable writes are independently checked
// by applyFamilyTransition at the root store, not by this DOM annotation.
export function blockedFamilyControl(button,member){
 if(!member||member.role==='admin'||button.closest?.('[data-family-page]'))return false;
 const owner=button.getAttribute?.('data-family-delete-owner');
 if(owner!==null&&owner!==undefined)return !owner||owner!==member.id;
 const label=(button.getAttribute?.('aria-label')||button.textContent||'').trim();
 return /^(?:新增毛孩|＋\s*新增毛孩|編輯目前毛孩|編輯.+的資料|清除目前毛孩|清除全部本機|恢復目前毛孩|恢復示範|管理成員)/.test(label);
}
export function FamilyAccessBoundary({react:R,root,children}){
 const h=R.createElement,view=R.useSyncExternalStore(root.subscribe,root.get),member=FAMILY_SHARING_ENABLED?currentMember(view.data):null,host=R.useRef(null),[message,setMessage]=R.useState('');
 R.useEffect(()=>{const receive=event=>setMessage(event.detail);window.addEventListener('family-permission-error',receive);return()=>window.removeEventListener('family-permission-error',receive)},[]);
 R.useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(timer)},[message]);
 R.useEffect(()=>{
  const node=host.current;if(!node)return;
  const refresh=()=>node.querySelectorAll('button').forEach(button=>{
   const blocked=blockedFamilyControl(button,member);
   if(blocked){button.dataset.familyBlocked='true';button.setAttribute('aria-disabled','true');button.setAttribute('title',t('共同照顧者不能管理成員或刪除他人的紀錄。'));}
   else if(button.dataset.familyBlocked){delete button.dataset.familyBlocked;button.removeAttribute('aria-disabled');button.removeAttribute('title');}
  });
  refresh();const observer=new MutationObserver(refresh);observer.observe(node,{childList:true,subtree:true});return()=>observer.disconnect();
 },[member?.id,member?.role,view.data]);
 const block=event=>{const button=event.target.closest?.('button');if(button&&blockedFamilyControl(button,member)){event.preventDefault();event.stopPropagation();setMessage(t('共同照顧者不能管理成員或刪除他人的紀錄。'));}};
 return h('div',{ref:host,className:'family-access-boundary',onClickCapture:block},children,message&&h('p',{className:'fs-access-message',role:'alert'},message));
}

// Viewing never mounts the legacy editing application, whose draft helpers
// can save automatically. Search, filters and tabs remain session-only here.
export function FamilyViewerApp({react:R,root,catId,onSwitchCat,onFamilyCare,error,isDemo=()=>false,isDemoCare=()=>false}){
 const h=R.createElement,view=R.useSyncExternalStore(root.subscribe,root.get),data=view.data,cat=catId==='cat-original'?data:data.multiCat.cats.find(row=>row.id===catId)?.data;
 const [tab,setTab]=R.useState('records'),[query,setQuery]=R.useState(''),[category,setCategory]=R.useState(K('全部')),[selected,setSelected]=R.useState(null),[message,setMessage]=R.useState('');
 const today=localCalendarDate(),rows=recordSearchRows(cat.entries,cat.careItems,cat.foodCards,{catId,today,isDemo:isDemoCare,isDemoEntry:isDemo}),results=filterRecordRows(rows,{query,category,scope:'all'});
 const care=cat.careItems.filter(item=>!item.demo&&!isDemoCare(item));
 const btn=(text,onClick,props={})=>h('button',{type:'button',className:'fs-button secondary',onClick,...props},text);
 const viewOnly=()=>setMessage(t('僅檢視身分不能修改'));
 let body;
 if(tab==='records')body=h(R.Fragment,null,h('h2',null,t('紀錄')),h('label',{className:'fs-field'},t('搜尋紀錄'),h('input',{type:'search',value:query,onChange:e=>setQuery(e.target.value),placeholder:t('搜尋內容、食品名稱或日期')})),h('label',{className:'fs-field'},t('紀錄分類'),h('select',{value:category,onChange:e=>setCategory(e.target.value)},[K('全部'),K('飲食'),K('喝水'),K('排泄'),K('體重'),K('嘔吐'),K('其他'),K('聲音反應'),K('照護施作'),K('交接')].map(value=>h('option',{key:value,value},t(value))))),h('p',null,t('{count} 筆紀錄',{count:results.length})),results.map(row=>h('article',{className:'fs-card',key:row.id},h('p',{className:'fs-meta'},`${row.date} ${row.time||''} · ${t(row.category)}`),h('p',null,row.text),row.isDemo&&h('small',{className:'sample-label'},t('示範紀錄 · 不計入健康摘要')),h(RecordAttribution,{react:R,row}),btn(t('查看詳情'),()=>setSelected(row)))),!results.length&&h('p',null,t('尚無符合條件的紀錄。')));
 if(tab==='foods')body=h(R.Fragment,null,h('h2',null,t('食品')),cat.foodCards.filter(food=>!food.archived).map(food=>h('article',{className:'fs-card',key:food.id},h('h3',null,food.name),String(food.source||'').includes(K('示範'))&&h('small',{className:'sample-label'},t('示範食品標籤')),h('p',null,[food.brand,food.flavor,food.kind,food.version?t('版本 {version}',{version:food.version}):''].filter(Boolean).join(' · ')),food.netWeight&&h('p',null,t('每包淨重 {weight} g',{weight:food.netWeight})),food.ingredients&&h('p',null,food.ingredients),h('details',null,h('summary',null,t('原始食品照片')),(food.photos||[]).map((photo,index)=>h('img',{key:index,src:photo,alt:t('{name} 原始標示照片',{name:food.name}),style:{maxWidth:'100%',height:'auto'}}))),h('dl',null,(food.nutrients||[]).filter(n=>n.value!=='').map((n,i)=>h('div',{key:i},h('dt',null,n.name||n.label||t('營養標示')),h('dd',null,[n.bound,n.value,n.unit,n.basis].filter(Boolean).join(' '))))))),!cat.foodCards.length&&h('p',null,t('還沒有食品卡。')));
 if(tab==='care')body=h(R.Fragment,null,h('h2',null,t('提醒清單')),onFamilyCare&&h(FamilyCareEntry,{react:R,onOpen:onFamilyCare}),care.map(item=>h('article',{className:'fs-card',key:item.id},h('h3',null,item.name),h('p',null,t('負責人：{name}',{name:careAssignee(data,item)?.name||t('尚未指派')})),h('p',null,t('下次日期：{date}',{date:item.next||t('未設定')})),h('p',null,t('上次完成：{date}',{date:item.last||t('未記錄')})),item.note&&h('p',null,item.note),item.snoozedUntil&&h('p',null,t('稍後提醒：{time}',{time:new Date(item.snoozedUntil).toLocaleString(isEnglish()?'en-US':'zh-TW',{hour12:false})})),h('details',null,h('summary',null,t('分工與完成歷程')),(item.familyEvents||[]).map(event=>h('p',{key:event.id},new Date(event.at).toLocaleString('zh-TW',{hour12:false})+' · '+familyEventText(event)))))),!care.length&&h('p',null,t('還沒有真實照護提醒。')));
 if(tab==='summary'){
  const relevant=eligibleRecords(cat.entries,today,catId,isDemo);
  body=h(R.Fragment,null,h('h2',null,t('看診摘要')),h('p',{className:'fs-meta'},t('只讀取實際觀察與照護資料；交接紀錄不列入。未記錄不代表沒有發生。')),h(VetHealthNotices,{react:R,...cat,catId,today,isDemo,isDemoCare}),h(VetTrends,{react:R,...cat,catId,today,isDemo,isDemoCare}),h('h3',null,t('觀察紀錄')),relevant.slice().reverse().map(row=>h('article',{className:'fs-card',key:row.id},h('p',null,`${row.date} ${row.time} · ${t(row.category)}`),h('p',null,row.text))),!relevant.length&&h('p',null,t('尚無可整理的實際紀錄。')));
 }
 if(tab==='members')body=h(FamilyMembers,{react:R,root,showIdentity:false,backLabel:t('返回唯讀紀錄'),onClose:()=>setTab('records')});
 return h('div',{className:'inpaw-app fs-viewer-app','data-family-page':true},h('main',{className:'app-content fs-viewer-scroll'},h('h1',null,t('家庭照護 · 僅檢視')),h(FamilyIdentity,{react:R,root,onManage:()=>{setTab('members');setSelected(null);}}),h('label',{className:'fs-field'},t('目前照顧'),h('select',{'aria-label':t('切換照顧的毛孩'),value:catId,disabled:view.status!=='saved',onChange:e=>{setSelected(null);onSwitchCat(e.target.value);}},activePetEntries(data.multiCat).map(row=>h('option',{key:row.id,value:row.id},(row.id==='cat-original'?data:row.data).cat.name)))),h('p',{className:'fs-scope'},t('你可以查看全家的資料。此身分不能新增紀錄、記錄餵食、標記完成或修改設定。')),error&&h('p',{role:'alert',className:'fs-error'},error),h('div',{className:'fs-viewer-tabs','aria-label':t('唯讀內容')},[['records',t('紀錄')],['foods',t('食品')],['care',t('提醒')],['summary',t('看診摘要')],['members',t('家人成員')]].map(([value,label])=>btn(label,()=>{setTab(value);setSelected(null);},{key:value,'aria-pressed':tab===value}))),body,selected&&h('section',{className:'fs-card fs-read-detail','aria-label':t('紀錄詳情')},h('h2',null,t('紀錄詳情')),h('p',null,`${selected.date} ${selected.time||''} · ${selected.category}`),h('p',null,selected.text),selected.isDemo&&h('small',{className:'sample-label'},t('示範紀錄 · 不計入健康摘要')),selected.note&&h('p',null,selected.note),selected.amount&&h('p',null,`${selected.amount} ${selected.unit||''}`),h(RecordAttribution,{react:R,row:selected,detail:true}),btn(t('關閉詳情'),()=>setSelected(null))),h('details',{className:'fs-viewer-disabled'},h('summary',null,t('為什麼不能修改？')),h('p',null,t('目前為僅檢視身分。若要記錄，請由有權限的家庭成員切換身分後操作；切換身分不是登入驗證。')),[t('新增紀錄'),t('記錄餵食'),t('標記完成')].map(text=>btn(text,viewOnly,{key:text,'aria-disabled':'true'}))),message&&h('p',{role:'alert',className:'fs-error'},message)));
}
