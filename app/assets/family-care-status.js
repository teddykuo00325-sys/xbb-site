import {t, isEnglish} from './i18n.js?v=audit1117b';
import {requireActivePet} from './pet-archive.js?v=8f5745b7843b';
import {FAMILY_SHARING_ENABLED} from './family-feature.js?v=8f5745b7843b';
import {careAssignee} from './family-sharing-model.js?v=8f5745b7843b';
import {familyEventText,FamilyCareAssignment} from './family-sharing-ui.js?v=8f5745b7843b';
export function FamilyCareStatus({react:R,root,item,history=true,assign=false,catId}){
 const h=R.createElement,view=R.useSyncExternalStore(root.subscribe,root.get),owner=careAssignee(view.data,item);
 if(!FAMILY_SHARING_ENABLED)return item.snoozedUntil?h(BasicSnoozeStatus,{react:R,root,item,catId}):null;
 return h('div',{className:'fs-care-status'},h('div',{className:'fs-assignee-line'},h('p',{className:'fs-meta'},t('負責人：'),h('strong',null,owner?.name||t('尚未指派'))),assign&&h(FamilyCareAssignment,{react:R,root,item,catId})),item.snoozedUntil&&h('p',{className:'fs-meta'},t('稍後提醒：{time}',{time:new Date(item.snoozedUntil).toLocaleString(isEnglish()?'en-US':'zh-TW',{hour12:false})})),history&&item.familyEvents?.length>0&&h('details',null,h('summary',null,t('分工與完成歷程')),item.familyEvents.map(event=>h('p',{key:event.id,className:'fs-meta'},new Date(event.at).toLocaleString(isEnglish()?'en-US':'zh-TW',{hour12:false})+' · '+familyEventText(event)))));
}
export function FamilyTodayCare({react:R,root,items=[],today,isDemo=()=>false,onOpen}){
 const h=R.createElement,rows=items.filter(item=>item.enabled&&!item.demo&&!isDemo(item)&&!item.deleted&&!item.deletedAt&&(item.assigneeId||item.snoozedUntil));
 return rows.length?h('section',{className:'fs-today-care','aria-label':t('今日照護分工')},h('h2',null,t('照護分工')),rows.map(item=>h('article',{key:item.id},h('strong',null,item.name),h(FamilyCareStatus,{react:R,root,item,history:false}),h('p',{className:'fs-meta'},t('照護日期：{date}',{date:item.next||t('待安排')})))),h('button',{type:'button',className:'text-btn',onClick:onOpen},t('查看提醒與分工'))):null;
}

export function FamilyCareEntry({react:R,onOpen,compact=false}){
 const h=R.createElement;
 return h('div',{className:'fs-care-entry'+(compact?' is-compact':'')},h('button',{type:'button',className:'fs-care-entry-button',onClick:onOpen,'aria-label':t('分工與交接')},h('span',null,t('分工與交接')),h('small',{className:'fs-pro-badge'},'Pro'),h('span',{'aria-hidden':true},'›')),h('small',{className:'fs-entry-scope'},t('同裝置使用 · 尚無跨裝置同步')));
}

// Existing postponements stay usable after collaboration is paused.
export function clearBasicSnooze(data,catId,careId){
 requireActivePet(data,catId||'cat-original');
 const selected=catId&&catId!=='cat-original'?data.multiCat?.cats.find(cat=>cat.id===catId)?.data:data;
 if(!selected?.careItems?.some(item=>item.id===careId))throw Error(t('找不到這筆提醒，請重新開啟。'));
 const updated={...selected,careItems:selected.careItems.map(item=>item.id===careId?{...item,snoozedUntil:null}:item)};
 return !catId||catId==='cat-original'?updated:{...data,multiCat:{...data.multiCat,cats:data.multiCat.cats.map(cat=>cat.id===catId?{...cat,data:updated}:cat)}};
}
export function BasicSnoozeStatus({react:R,root,item,catId}){
 const h=R.createElement,view=R.useSyncExternalStore(root.subscribe,root.get),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),lock=R.useRef(false),active=Date.parse(item.snoozedUntil)>Date.now();
 const restore=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await root.atomic(data=>clearBasicSnooze(data,catId,item.id));}catch(error){setError(error.message||t('尚未保存，請重試。'));}finally{lock.current=false;setBusy(false);}};
 return h('div',{className:'fs-basic-snooze'},h('p',{className:'fs-meta'},(active?t('稍後提醒：{time}',{time:new Date(item.snoozedUntil).toLocaleString(isEnglish()?'en-US':'zh-TW',{hour12:false})}):t('上次延後至 {time}',{time:new Date(item.snoozedUntil).toLocaleString(isEnglish()?'en-US':'zh-TW',{hour12:false})}))),active&&h('button',{type:'button',className:'text-btn',disabled:busy||view.status!=='saved',onClick:restore},busy?t('正在保存…'):t('恢復提醒')),error&&h('p',{role:'alert',className:'fs-error'},error));
}
