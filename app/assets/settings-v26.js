import {t, isEnglish, readLocaleChoice} from './i18n.js?v=audit1117b';
import {AppearancePreference, readAppearance} from './appearance.js?v=r4';
import {LanguagePreference} from './language-preference.js?v=i18n1';
import {devToolsEnabled,localProPreviewEnabled} from './dev-tools.js?v=1';
import {SettingsIcon} from './settings-icons.js?v=cuteexpanded1';
import {PrivacySupport} from "./app-disclosures.js?v=ai-names1";
import {StartViewPreference, readStartView} from './family-navigation.js?v=r4';
import {CloudCarePlans,AIFeatures,DataAndBackup} from "./care-plan-ui.js?v=photo-simplify1";
import {ProEntry,requestProPreview} from "./pro-experience-v46.js?v=photo-simplify1";
import {usePhoneDialog} from "./audit-followup-v45.js?v=8f5745b7843b";
import {AccountShortcut} from './account-ui.js?v=ai-names1';
import {nativeBillingHost,serverSubscriptionActive,useServerSubscription} from './store-billing.js?v=billing1';
import { BackupNotice } from "./experience-v26.js?v=photo-simplify1";
import {getCloudDemoSnapshot} from "./cloud-demo-v28.js?v=photo-simplify1";
import { CloudDemo, ProBadge, ProFeatureButton, takeSettingsTab, PlanUsageShortcut, syncCloudEntitlement } from "./cloud-demo-v28.js?v=photo-simplify1";
// Separate plan and AI destinations; retain legacy cloud and models links.
const canonicalSettingsTab = id => ['cloud','models'].includes(id) ? 'ai' : ['general','plans','ai','data','privacy'].includes(id) ? id : 'general';
// Settings are intentionally session-only. No account, payment, model, or care-data writes.
const emptyModel = () => ({state:'none',progress:0,version:0,operation:'download'});
let session = {account:false, plan:'free',activated:false,cycle:'year',renew:true,models:{speech:emptyModel(),text:emptyModel()}};
const MODEL = {
  speech:{title:t('語音記錄'),icon:'voice',description:t('規劃將你的語音轉成文字，再由你確認。'),note:t('此原型不開啟麥克風，也不辨識錄音。')},
  text:{title:t('文字整理'),icon:'spark',description:t('規劃把文字整理成照護紀錄，保留確認步驟。'),note:t('此模型管理示範未使用語言模型；實際手機模式狀態請見「AI 與下載」。')}
};
// Keep preference controls mounted so their existing storage and error handling remain intact.
export function CompactPreference({react:R,title,current,children}) {
 const h=R.createElement,[revision,refresh]=R.useState(0);
 const update=()=>refresh(n=>n+1);
 R.useEffect(()=>{window.addEventListener('inpaw-appearance-change',update);return()=>window.removeEventListener('inpaw-appearance-change',update)},[]);
 return h('details',{className:'ps-preference',onChange:()=>requestAnimationFrame(update)},
  h('summary',null,h('strong',null,title),h('span',{className:'ps-preference-value'},current()),h('span',{className:'ps-preference-chevron','aria-hidden':true},'›')),
  h('div',{className:'ps-preference-content'},children));
}
export function PetSettings({react:R,restoreStore,focusBackup,onSummary,onDemo,onFirstUsePreview,getSnapshot,onTitleChange,getSettings,onPlayScene}) {
 const h=R.createElement;
 const serverPaid=useServerSubscription(R);
 const [data,setData]=R.useState(()=>session),[tab,setTab]=R.useState(()=>(focusBackup?(takeSettingsTab(),'data'):canonicalSettingsTab(takeSettingsTab()))),[dialog,setDialog]=R.useState(null),[notice,setNotice]=R.useState('');
 const taskTitle=tab==='plans'?t('方案'):tab==='ai'?t('AI 與下載'):tab==='data'?t('資料與備份'):tab==='privacy'?t('隱私與客服'):t('設定');
 R.useEffect(()=>{onTitleChange?.(taskTitle)},[taskTitle,onTitleChange]);
 R.useEffect(()=>()=>onTitleChange?.(t('設定')),[onTitleChange]);
 const revealedTab=R.useRef(focusBackup?'data':'general'),section=R.useRef(null),top=R.useRef(null),focusReturn=R.useRef(null),dialogRef=R.useRef(null);
 usePhoneDialog(R,dialogRef,!!dialog);
 const preview=id=>{requestProPreview(id);go('plans')};
 const update=fn=>setData(prev=>{session=fn(prev);return session});
 R.useEffect(()=>syncCloudEntitlement(data),[data.plan,data.activated,data.renew]);
 const modelUpdate=(id,fn)=>update(prev=>({...prev,models:{...prev.models,[id]:fn(prev.models[id])}}));
 const reveal=()=>{const target=section.current,scroll=target?.closest('.mobile-scroll');if(target&&scroll){const tabs=top.current?.querySelector('.ps-tabs');const rect=scroll.getBoundingClientRect(),scale=rect.height/scroll.clientHeight||1;scroll.scrollTop+=(target.getBoundingClientRect().top-rect.top)/scale-(tabs?.offsetHeight??0)-14;}target?.focus({preventScroll:true});};
 const go=id=>{id=canonicalSettingsTab(id);setTab(id);setNotice('');setDialog(null);if(id===tab)requestAnimationFrame(reveal);};
 R.useEffect(()=>{if(revealedTab.current===tab)return;const frame=requestAnimationFrame(()=>{revealedTab.current=tab;reveal()});return()=>cancelAnimationFrame(frame)},[tab]);
 const announce=text=>setNotice(text);
 const open=next=>{focusReturn.current=document.activeElement;setDialog(next);};
 const close=()=>{setDialog(null);requestAnimationFrame(()=>{if(focusReturn.current?.isConnected)focusReturn.current.focus();else if(dialog?.type==='remove')document.getElementById('model-'+dialog.id)?.closest('section')?.querySelector('button')?.focus();else top.current?.querySelector('.ps-tab[aria-current=page]')?.focus();});};
 R.useEffect(()=>{const timer=setInterval(()=>{
   if(!Object.values(session.models).some(m=>m.state==='downloading'))return;
   update(prev=>({...prev,models:Object.fromEntries(Object.entries(prev.models).map(([id,m])=>{
    if(m.state!=='downloading')return [id,m];
    const progress=Math.min(100,m.progress+5);
    return [id,{...m,progress,state:progress===100?'ready':'downloading',version:progress===100?m.version+1:m.version}];
   }))}));
 },500);return()=>{clearInterval(timer);session={...session,models:Object.fromEntries(Object.entries(session.models).map(([id,m])=>[id,m.state==='downloading'?{...m,state:'paused'}:m]))};};},[]);
 R.useEffect(()=>{if(dialog){dialogRef.current?.showModal()}else if(dialogRef.current?.open){dialogRef.current.close()}},[dialog]);
 const icon=name=>h(SettingsIcon,{react:R,name});
 const badge=(label,tone='')=>h('span',{className:'ps-badge '+tone},label);
 const button=(label,fn,cls='ps-button',extras={})=>h('button',{type:'button',className:cls,onClick:fn,...extras},label);
 const card=(title,content,className='')=>h('section',{className:'ps-card '+className},h('h2',null,title),content);
 const note=(text)=>h('p',{className:'ps-note'},text);
 // 英文分頁名稱較長，360px 會擠出畫面：分頁鈕上用短名稱，頁面標題與 aria 仍用完整名稱（2026-11-14 多語言）。
 const tabs=[['general',t('一般')],['plans',t('方案')],['ai',t('AI 與下載'),isEnglish()?'AI':''],['data',t('資料與備份'),isEnglish()?'Data':''],['privacy',t('隱私')]];
 const modelCard=id=>{
  const m=data.models[id],meta=MODEL[id],busy=['downloading','paused'].includes(m.state);
  const status={none:t('尚未下載'),downloading:t('下載流程示範中'),paused:t('示範已暫停'),ready:t('已完成流程示範')}[m.state];
  return h('section',{className:'ps-card ps-model',key:id,'aria-labelledby':'model-'+id},
   h('div',{className:'ps-card-head'},h('span',{className:'ps-icon'},icon(meta.icon)),h('div',null,h('h2',{id:'model-'+id},meta.title),badge(status,m.state==='ready'?'success':''))),
   h('p',null,meta.description),
   h('dl',{className:'ps-facts'},h('div',null,h('dt',null,t('模型與大小')),h('dd',null,t('尚未選定'))),h('div',null,h('dt',null,t('手機模式狀態')),h('dd',null,t('未啟用')))),
   busy&&h('div',{className:'ps-progress-wrap'},h('div',{className:'ps-progress-caption'},h('span',null,m.operation==='update'?t('更新流程（模擬）'):t('下載流程（模擬）')),h('strong',null,m.progress+'%')),h('progress',{max:100,value:m.progress,'aria-label':t('{title}模擬進度',{title:meta.title})}),note(t('進度是介面示範，沒有下載任何模型檔案。'))),
   m.state==='ready'&&h('p',{className:'ps-success',role:'status'},(m.operation==='update'?t('✓ 更新流程示範完成，未安裝或載入模型。'):t('✓ 下載流程示範完成，未安裝或載入模型。'))),
   h('div',{className:'ps-actions'},
    m.state==='none'&&button(t('模擬下載'),()=>{modelUpdate(id,()=>({...emptyModel(),state:'downloading'}));announce(t('{title}：開始下載流程示範。',{title:meta.title}))}),
    m.state==='downloading'&&button(t('暫停示範'),()=>{modelUpdate(id,m=>({...m,state:'paused'}));announce(t('{title}：示範已暫停。',{title:meta.title}))}),
    m.state==='paused'&&button(t('繼續示範'),()=>{modelUpdate(id,m=>({...m,state:'downloading'}));announce(t('{title}：繼續下載流程示範。',{title:meta.title}))}),
    busy&&button(t('取消示範'),()=>{modelUpdate(id,m=>m.version?{...m,state:'ready',progress:100,operation:'download'}:emptyModel());announce(t('{title}：已取消本次示範，照護資料未變更。',{title:meta.title}))},'ps-button secondary'),
    m.state==='ready'&&button(t('模擬更新'),()=>{modelUpdate(id,m=>({...m,state:'downloading',progress:0,operation:'update'}));announce(t('{title}：開始更新流程示範。',{title:meta.title}))},'ps-button secondary'),
    m.state==='ready'&&button(t('移除示範狀態'),()=>open({type:'remove',id}),'ps-text-button')),
   note(meta.note));
 };
 const planPaid=nativeBillingHost()&&!localProPreviewEnabled()?serverPaid:data.plan==='paid';
 let body;
 // Structured settings destinations
 const accountAvatar=()=>h('span',{className:'ps-avatar'},icon('person'));
 // 帳號（Ian 2026-11-13）：設定首頁頂端一列顯示登入狀態，點了到「方案」分頁最上面的帳號卡。
 if(tab==='general')body=h(R.Fragment,null,h(AccountShortcut,{react:R,avatar:accountAvatar(),chevron:icon('chevron'),onOpen:()=>go('plans')}),
  (!nativeBillingHost()||localProPreviewEnabled())&&h('section',{className:'ps-card','data-pro-preview-entry':true},h('h3',null,icon('spark'),' ',t('Pro 預覽')),h('p',{className:'ps-note'},t('只在這台裝置上切換預覽，不會付款，也不會增加進階模式額度。')),button(planPaid?t('關閉 Pro 預覽'):t('開啟 Pro 預覽'),()=>open({type:planPaid?'free':'subscribe'}),'ps-button primary')),
  h(CompactPreference,{react:R,title:t('開啟時先看'),current:()=>readStartView()==='family'?t('全家總覽'):t('上次照顧的毛孩')},h(StartViewPreference,{react:R})),
  h(CompactPreference,{react:R,title:t('外觀'),current:()=>({system:t('跟隨系統'),light:t('淺色'),dark:t('深色')})[readAppearance()]},h(AppearancePreference,{react:R})),
  h(CompactPreference,{react:R,title:t('語言'),current:()=>({'auto':t('跟隨手機'),'zh-Hant':'繁體中文',en:'English'})[readLocaleChoice()]},h(LanguagePreference,{react:R})),
  devToolsEnabled()&&h('details',{className:'care-preview-details'},h('summary',null,t('開發預覽')),button(t('預覽新版首次使用（不變更資料）'),onFirstUsePreview)),

null);
 // Data: undo → export/restore → status → 帳號搬家提示（帳號本體在「方案」分頁，Ian 2026-11-13）。
 if(tab==='data')body=h(DataAndBackup,{react:R,
  backup:h(BackupNotice,{react:R,getSnapshot,getSettings,restoreStore,focusBackup}),
  account:h('p',{className:'ps-note care-account-moved'},t('帳號與登入在「方案」分頁。'),
   button(t('前往帳號'),()=>go('plans'),'ps-text-button',{'data-account-moved':true}))});
 if(tab==='models')body=h(R.Fragment,null,
  h('div',{className:'ps-section-intro'},h('span',{className:'ps-kicker'},'AI MODES'),h('h2',null,t('進階模式與手機模式')),h('p',null,t('預設使用進階模式，每次同意後才傳送資料。此區僅示範模型管理；手機模式是否支援與下載狀態，請見「AI 與下載」。'))),
  modelCard('speech'),modelCard('text'),h(ProFeatureButton,{react:R,title:t('說一句，整理成多筆草稿'),description:t('語音拆成多筆待確認草稿、包裝辨識預填是 Pro 功能提案。模型與配額待定，目前可查看固定資料流程示範。'),onPlans:()=>preview('input')}),
  note(t('離開設定頁，進行中的下載示範會暫停。實際相容裝置、儲存需求與下載條件，將在模型選定後提供。')));
 if(tab==='plans')body=h(CloudCarePlans,{react:R,paid:planPaid,cycle:data.cycle,onCycle:cycle=>update(d=>({...d,cycle})),onSubscribe:()=>open({type:'subscribe'}),onFree:()=>{update(d=>({...d,plan:'free'}));announce(t('已關閉訂閱預覽。照護資料與進階模式額度未變更。'))},onManage:()=>open({type:'manage'}),onRestore:()=>open({type:'restore'}),onPlayScene,onReport:onSummary,avatar:accountAvatar()});
 if(tab==='ai')body=h(AIFeatures,{react:R});
 if(tab==='privacy')body=h(PrivacySupport,{react:R,onGeneral:()=>go('data'),onPlans:()=>go('plans'),onAI:()=>go('ai'),onDemo});
 const dialogContent=()=>{
   if(!dialog)return null;
   const type=dialog.type;
   let title='',text='',confirm='',action=null;
   if(type==='login'){title=t('登入（示範，不會上傳）');text=t('使用固定的「示範帳號」查看登入後畫面。不會連接登入服務，也不需要 Email、密碼或任何個人資料。');confirm=t('使用示範帳號登入');action=()=>{update(d=>({...d,account:true}));announce(t('已切換示範帳號。未登入真實服務，也未備份或同步資料。'))}}
   if(type==='subscribe'){title=t('開啟 Pro 預覽？');text=t('這一步只在這台裝置上切換 Pro 預覽，不建立訂閱、不扣款。');confirm=t('開啟 Pro 預覽');action=()=>{update(d=>({...d,plan:'paid',activated:true,renew:d.activated?d.renew:true}));announce(t('已開啟 Pro 預覽。未建立訂閱或產生費用。'))}}
   if(type==='free'){title=t('關閉 Pro 預覽？');text=t('回到免費方案的預覽畫面。照護紀錄、本機摘要與備份都會保留，不會變更真實訂閱或進階模式額度。');confirm=t('關閉 Pro 預覽');action=()=>{update(d=>({...d,plan:'free'}));announce(t('已關閉 Pro 預覽。照護資料與進階模式額度未變更。'))}}
   if(type==='remove'){title=t('移除{title}示範狀態？',{title:MODEL[dialog.id].title});text=t('只清除這張模型卡的示範進度；沒有實際模型檔案可刪除，不影響食品卡、照護紀錄或草稿。');confirm=t('確認移除示範狀態');action=()=>{modelUpdate(dialog.id,()=>emptyModel());announce(t('已移除示範狀態。照護資料未變更。'))}}
   if(type==='restore'){title=t('恢復訂閱尚未開放');text=t('商店付款與恢復訂閱還在準備中，目前無法查詢或恢復真實訂閱。帳號登入與進階模式的可用狀態，請查看方案頁。')}
   if(type==='manage'){return h(R.Fragment,null,h('h2',{id:'ps-dialog-title'},t('訂閱管理示範')),h('p',null,(data.cycle==='year'?t('進階照護 Pro · 年繳示意'):t('進階照護 Pro · 月繳示意'))),h('div',{className:'ps-manage-state',role:'status','aria-live':'polite'},h('strong',null,data.renew?t('續訂流程展示中'):t('已模擬取消續訂')),note(data.renew?t('無實際訂閱、帳單或扣款日期。'):t('只是展示取消後的狀態，不影響任何真實服務。'))),note(t('進階模式不用登入就能使用，每次送出用 1 次額度；商店付款尚未開放。切換預覽不會增加進階模式額度，也不會變更照護紀錄或真實訂閱。')),button(data.renew?t('模擬取消續訂'):t('模擬恢復續訂'),()=>{update(d=>({...d,renew:!d.renew}));announce(data.renew?t('已模擬取消續訂，沒有真實訂閱被變更。'):t('已模擬恢復續訂，不會產生費用。'))},'ps-button secondary'),button(t('完成'),close,'ps-button'))}
   return h(R.Fragment,null,h('h2',{id:'ps-dialog-title'},title),h('p',null,text),confirm&&button(confirm,()=>{action();close()},type==='remove'?'ps-button danger':'ps-button'),button(confirm?t('先不要'):t('我知道了'),close,'ps-button secondary'));
 };
 return h('div',{className:'pet-settings',ref:top},
  // The page title lives in the top bar only (no second heading here).
  h('nav',{className:'ps-tabs','aria-label':t('設定分類')},tabs.map(([id,label,short])=>button([h(SettingsIcon,{react:R,name:id,key:'icon'}),h('span',{key:'label'},short||label)],()=>go(id),'ps-tab',{key:id,'aria-label':short?label:undefined,'aria-current':tab===id?'page':undefined}))),
  h('div',{className:'ps-announcement',role:'status','aria-live':'polite'},notice),
  h('section',{className:'ps-body',key:tab,ref:section,id:'settings-'+tab,tabIndex:-1,'aria-label':tabs.find(row=>row[0]===tab)?.[1]},body),
  tab==='plans'&&h('details',{className:'ps-prototype ux-settings-note'},h('summary',null,t('功能狀態說明')),h('p',null,t('進階模式每次用 1 次額度；可購買狀態、商店價格與實際帳號權益請見本頁。手動記錄、核對、直接儲存與備份不需訂閱；手機模式的實際狀態以「AI 與下載」頁為準。'))),h('dialog',{ref:dialogRef,className:'ps-dialog','aria-labelledby':'ps-dialog-title',onCancel:e=>{e.preventDefault();close()},onClick:e=>{if(e.target===dialogRef.current)close()}},dialogContent()));
}

export function getDemoSettings(){const server=nativeBillingHost()&&!localProPreviewEnabled();return {prototypeOnly:!server,settings:{...structuredClone(session),...(server?{plan:serverSubscriptionActive()?'paid':'free',activated:serverSubscriptionActive()}: {})},cloud:getCloudDemoSnapshot()}}
