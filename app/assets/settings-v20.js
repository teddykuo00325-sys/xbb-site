import { CloudDemo, ProBadge, ProFeatureButton, takeSettingsTab } from "./cloud-demo-v20.js?v=8f5745b7843b";
// Settings are intentionally session-only. No account, payment, model, or care-data writes.
const emptyModel = () => ({state:'none',progress:0,version:0,operation:'download'});
let session = {account:false, plan:'free',cycle:'year',renew:true,models:{speech:emptyModel(),text:emptyModel()}};
const MODEL = {
  speech:{title:'語音轉文字',icon:'voice',description:'規劃將你的語音轉成文字，再由你確認。',note:'此原型不開啟麥克風，也不辨識錄音。'},
  text:{title:'文字整理',icon:'spark',description:'規劃把文字整理成照護紀錄，保留確認步驟。',note:'現有整理流程為固定規則示範，未使用語言模型。'}
};
export function PetSettings({react:R,onSummary,onDemo}) {
 const h=R.createElement;
 const [data,setData]=R.useState(()=>session),[tab,setTab]=R.useState(takeSettingsTab),[dialog,setDialog]=R.useState(null),[notice,setNotice]=R.useState('');
 const top=R.useRef(null),focusReturn=R.useRef(null),dialogRef=R.useRef(null);
 const update=fn=>setData(prev=>{session=fn(prev);return session});
 const modelUpdate=(id,fn)=>update(prev=>({...prev,models:{...prev.models,[id]:fn(prev.models[id])}}));
 const go=id=>{setTab(id);setNotice('');setDialog(null);requestAnimationFrame(()=>{top.current?.scrollIntoView({block:'start'});top.current?.querySelector('.ps-tab[aria-current=page]')?.focus({preventScroll:true});});};
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
 const icon=(name)=>h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,'aria-hidden':true},
   name==='voice'?[h('rect',{key:'a',x:9,y:3,width:6,height:12,rx:3}),h('path',{key:'b',d:'M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6'})]:
   name==='spark'?h('path',{d:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4M18 4h4'}):
   name==='shield'?h('path',{d:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6'}):
   name==='person'?[h('circle',{key:'a',cx:12,cy:8,r:4}),h('path',{key:'b',d:'M4 21v-2a8 8 0 0 1 16 0v2'})]:
   name==='box'?h('path',{d:'M4 7h16v14H4zM3 3h18v4H3zM9 11h6'}):
   h('path',{d:'m7 5 7 7-7 7'}));
 const badge=(label,tone='')=>h('span',{className:'ps-badge '+tone},label);
 const button=(label,fn,cls='ps-button',extras={})=>h('button',{type:'button',className:cls,onClick:fn,...extras},label);
 const card=(title,content,className='')=>h('section',{className:'ps-card '+className},h('h2',null,title),content);
 const note=(text)=>h('p',{className:'ps-note'},text);
 const tabs=[['general','一般'],['models','手機模式'],['plans','方案'],['cloud','雲端額度'],['privacy','隱私']];
 const modelCard=id=>{
  const m=data.models[id],meta=MODEL[id],busy=['downloading','paused'].includes(m.state);
  const status={none:'尚未下載',downloading:'下載流程示範中',paused:'示範已暫停',ready:'已完成流程示範'}[m.state];
  return h('section',{className:'ps-card ps-model',key:id,'aria-labelledby':'model-'+id},
   h('div',{className:'ps-card-head'},h('span',{className:'ps-icon'},icon(meta.icon)),h('div',null,h('h2',{id:'model-'+id},meta.title),badge(status,m.state==='ready'?'success':''))),
   h('p',null,meta.description),
   h('dl',{className:'ps-facts'},h('div',null,h('dt',null,'模型與大小'),h('dd',null,'尚未選定')),h('div',null,h('dt',null,'手機模式 狀態'),h('dd',null,'未啟用'))),
   busy&&h('div',{className:'ps-progress-wrap'},h('div',{className:'ps-progress-caption'},h('span',null,m.operation==='update'?'更新流程（模擬）':'下載流程（模擬）'),h('strong',null,m.progress+'%')),h('progress',{max:100,value:m.progress,'aria-label':meta.title+'模擬進度'}),note('進度是介面示範，沒有下載任何模型檔案。')),
   m.state==='ready'&&h('p',{className:'ps-success',role:'status'},'✓ '+(m.operation==='update'?'更新':'下載')+'流程示範完成，未安裝或載入模型。'),
   h('div',{className:'ps-actions'},
    m.state==='none'&&button('模擬下載',()=>{modelUpdate(id,()=>({...emptyModel(),state:'downloading'}));announce(meta.title+'：開始下載流程示範。')}),
    m.state==='downloading'&&button('暫停示範',()=>{modelUpdate(id,m=>({...m,state:'paused'}));announce(meta.title+'：示範已暫停。')}),
    m.state==='paused'&&button('繼續示範',()=>{modelUpdate(id,m=>({...m,state:'downloading'}));announce(meta.title+'：繼續下載流程示範。')}),
    busy&&button('取消示範',()=>{modelUpdate(id,m=>m.version?{...m,state:'ready',progress:100,operation:'download'}:emptyModel());announce(meta.title+'：已取消本次示範，照護資料未變更。')},'ps-button secondary'),
    m.state==='ready'&&button('模擬更新',()=>{modelUpdate(id,m=>({...m,state:'downloading',progress:0,operation:'update'}));announce(meta.title+'：開始更新流程示範。')},'ps-button secondary'),
    m.state==='ready'&&button('移除示範狀態',()=>open({type:'remove',id}),'ps-text-button')),
   note(meta.note));
 };
 const planPaid=data.plan==='paid';
 let body;
 if(tab==='general')body=h(R.Fragment,null,
  card('帳號與備份',h(R.Fragment,null,
   h('div',{className:'ps-account'},h('span',{className:'ps-avatar'},icon('person')),h('div',null,h('strong',null,data.account?'示範帳號':'訪客模式'),h('small',null,data.account?'僅切換畫面，未登入真實帳號':'不登入，也能手動記錄'))),
   h('p',null,'照護資料僅存於此瀏覽器，尚未備份。'),
   button(data.account?'登出示範帳號':'體驗登入流程',()=>data.account?(update(d=>({...d,account:false})),announce('已回到訪客模式。照護紀錄、食品卡與草稿都保留。')):open({type:'login'})),
   h('div',{className:'ps-unavailable'},h('div',null,h('strong',null,'雲端備份'),h('small',null,'未連接帳號或備份服務')),badge('尚未開放')),
   note('示範登入不會上傳資料，也不建立帳號。'))),
  note('設定示範狀態於重新整理後重設，照護資料不受影響。'));
 if(tab==='models')body=h(R.Fragment,null,
  h('div',{className:'ps-section-intro'},h('span',{className:'ps-kicker'},'LOCAL FIRST'),h('h2',null,'讓 AI 靠近你，',h('br'),'資料也留在你手上。'),h('p',null,'本機優先是產品規劃。現在可體驗模型管理流程，尚未提供真正的模型下載或離線 AI。')),
  modelCard('speech'),modelCard('text'),h(ProFeatureButton,{react:R,title:'更多本機語音與 AI',description:'更多本機語音處理與進階文字整理，規劃列為 Pro 權益。模型、裝置需求與額度尚未定案，目前只有下載管理示範，不是真的離線 AI。',onPlans:()=>go('plans')}),
  note('離開設定頁，進行中的下載示範會暫停。實際相容裝置、儲存需求與下載條件，將在模型選定後提供。'));
 if(tab==='plans')body=h(R.Fragment,null,
  h('div',{className:'ps-section-intro'},h('span',{className:'ps-kicker'},'ROOM FOR EVERYDAY CARE'),h('h2',null,'日常免費，更多陪伴選 Pro。'),h('p',null,'這是方案提案，不是真實訂閱。價格、最終權益與配額待定；不收費、不綁卡。')),
  h('div',{className:'ps-plan-status'},h('span',null,'目前展示'),h('strong',null,planPaid?'Pro 方案（模擬）':'免費方案（示意）'),badge('未產生訂閱')),
  h('section',{className:'ps-card ps-free'},h('div',{className:'ps-card-head'},h('h2',null,'日常陪伴'),badge('免費 · 提案')),h('p',null,'讓基本照護，不因訂閱中斷。'),h('ul',null,h('li',null,'建議 1 隻貓的照護檔案'),h('li',null,'不限筆數的手動記錄與歷史查看'),h('li',null,'基本提醒、基本看診摘要與匯出'),h('li',null,'不含進階模式，也沒有免費雲端試用')),note('免費核心與離線優先是產品方向。此原型未實作系統提醒、完整離線安裝或正式帳號限制；既有本機紀錄、摘要與匯出可照常體驗。'),button(planPaid?'回到免費展示':'目前為免費展示',()=>open({type:'free'}),'ps-button secondary',{disabled:!planPaid})),
  h('section',{className:'ps-card ps-paid'},h('div',{className:'ps-card-head'},h('h2',null,'安心陪伴'),h(ProBadge,{react:R})),h('p',null,'為多貓家庭，與需要更多整理的時刻。'),
   h('div',{className:'ps-cycle','aria-label':'計費週期展示'},['month','year'].map(c=>button(c==='month'?'月繳示意':'年繳示意',()=>update(d=>({...d,cycle:c})),'ps-cycle-button',{key:c,'aria-pressed':data.cycle===c}))),
   h('div',{className:'ps-price'},h('strong',null,'價格尚未定案'),h('span',null,data.cycle==='month'?'月繳價格待定':'年繳價格待定')),
   h('ul',null,h('li',null,'多隻貓的照護管理'),h('li',null,'更多本機語音與 AI 整理'),h('li',null,'生活事件前後對照、進階摘要'),h('li',null,'每帳號每月 10 次雲端文字整理（建議）'),h('li',null,'用完可自行選購 10 次文字額度包（提案）')),
   note('肉球＋Pro 表示付費限定功能提案，不代表已啟用。模型、多貓管理與付費服務尚未實作；現有規則式前後對照仍可預覽。備份／同步未開放，也尚未定為已含權益。'),
   button(planPaid?'管理 Pro 訂閱示範':'切換 Pro 方案展示',()=>open({type:planPaid?'manage':'subscribe'})),button('查看雲端額度與示範',()=>go('cloud'),'ps-button secondary')),
  button('恢復訂閱說明',()=>open({type:'restore'}),'ps-text-button'),
  note('方案切換只改變本次頁面的展示，不會刪除照護資料、鎖住既有功能或影響草稿。'));
 if(tab==='cloud')body=h(CloudDemo,{react:R,paid:planPaid,onPlans:()=>go('plans')});
 if(tab==='privacy')body=h(R.Fragment,null,
  card('雲端使用',h(R.Fragment,null,h('p',null,'進階模式為 Pro 付費功能提案。文字整理只會使用每次選取的文字，需逐次明示用途與接收服務並取得同意；本機失敗不會自動轉雲端。原型不連線，也不能啟用資料傳送。'),
   [['語音','另案規劃，不包含在文字額度'],['文字','整理你選擇的文字'],['照片','另案規劃，不包含在文字額度']].map(([title,desc])=>h('div',{className:'ps-privacy-row',key:title},h('div',null,h('strong',null,title),h('small',null,desc+'（規劃）')),h('span',{className:'ps-off','aria-label':title+'雲端使用未啟用'},'未啟用'))),note('正式服務啟用前，應先告知接收服務與用途，並於每次傳送前取得同意。'))),
  card('裝置權限',h(R.Fragment,null,h('div',{className:'ps-unavailable'},h('div',null,h('strong',null,'麥克風與相機'),h('small',null,'此原型未啟用，也不在這裡要求權限')),badge('未使用')),note('圖片示範不會啟動相機。這裡不代表你瀏覽器的實際權限狀態。'))),
  card('資料留在哪裡？',h(R.Fragment,null,h('p',null,'食品卡、照護紀錄、毛孩資料與食品／餵食草稿，儲存在此裝置的這個瀏覽器。'),h('ul',null,h('li',null,'重新整理後仍保留，不跨裝置同步。'),h('li',null,'清除網站資料或無痕模式結束，可能遺失資料。'),h('li',null,'尚未提供完整備份、匯入或雲端還原。')),button('前往看診摘要與匯出',onSummary,'ps-button secondary'),note('可下載摘要 HTML，再列印或另存 PDF；這不是完整資料備份。'))),
  button('原型說明與示範設定',onDemo,'ps-text-button'));
 const dialogContent=()=>{
   if(!dialog)return null;
   const type=dialog.type;
   let title='',text='',confirm='',action=null;
   if(type==='login'){title='體驗登入流程';text='使用固定的「示範帳號」查看登入後畫面。不會連接登入服務，也不需要 Email、密碼或任何個人資料。';confirm='使用示範帳號登入';action=()=>{update(d=>({...d,account:true}));announce('已切換示範帳號。未登入真實服務，也未備份或同步資料。')}}
   if(type==='subscribe'){title='切換 Pro 方案展示';text='這一步只切換方案展示，不建立訂閱、不扣款、不啟用續訂。價格、權益與正式取消／退款條件尚未定案。';confirm='只切換 Pro 展示';action=()=>{update(d=>({...d,plan:'paid',renew:true}));announce('已切換付費方案展示。未建立訂閱或產生費用。')}}
   if(type==='free'){title='回到免費方案展示？';text='只改變本頁的方案狀態，照護紀錄和所有原型功能都保留。沒有真實訂閱需要取消。';confirm='回到免費展示';action=()=>{update(d=>({...d,plan:'free',renew:true}));announce('已回到免費方案展示。照護資料未變更。')}}
   if(type==='remove'){title='移除'+MODEL[dialog.id].title+'示範狀態？';text='只清除這張模型卡的示範進度；沒有實際模型檔案可刪除，不影響食品卡、照護紀錄或草稿。';confirm='確認移除示範狀態';action=()=>{modelUpdate(dialog.id,()=>emptyModel());announce('已移除示範狀態。照護資料未變更。')}}
   if(type==='restore'){title='恢復訂閱尚未開放';text='尚未連接商店、付款或帳號服務，因此無法查詢或恢復真實訂閱。目前的方案選擇僅為介面示範。'}
   if(type==='manage'){return h(R.Fragment,null,h('h2',{id:'ps-dialog-title'},'訂閱管理示範'),h('p',null,'安心陪伴 Pro · '+(data.cycle==='year'?'年繳':'月繳')+'示意'),h('div',{className:'ps-manage-state',role:'status','aria-live':'polite'},h('strong',null,data.renew?'續訂流程展示中':'已模擬取消續訂'),note(data.renew?'無實際訂閱、帳單或扣款日期。':'只是展示取消後的狀態，不影響任何真實服務。')),note('正式上線後，取消生效日與退款依購買條款；取消訂閱後的加購額度資格、期限尚未定案。取消續訂示範不會改變本次展示額度。'),button(data.renew?'模擬取消續訂':'模擬恢復續訂',()=>{update(d=>({...d,renew:!d.renew}));announce(data.renew?'已模擬取消續訂，沒有真實訂閱被變更。':'已模擬恢復續訂，不會產生費用。')},'ps-button secondary'),button('完成',close,'ps-button'))}
   return h(R.Fragment,null,h('h2',{id:'ps-dialog-title'},title),h('p',null,text),confirm&&button(confirm,()=>{action();close()}),button(confirm?'先不要':'我知道了',close,'ps-button secondary'));
 };
 return h('div',{className:'pet-settings',ref:top},
  h('div',{className:'ps-heading'},h('span',{className:'ps-kicker'},'YOUR LITTLE NOTEBOOK'),h('h1',null,'設定'),h('p',null,'照你的方式，記下每一天的陪伴。')),
  h('div',{className:'ps-prototype'},h('strong',null,'互動原型'),h('span',null,'v20 · 登入、AI、方案與額度皆為模擬；不付款、不上傳。')),
  h('nav',{className:'ps-tabs','aria-label':'設定分類'},tabs.map(([id,label])=>button(label,()=>go(id),'ps-tab',{key:id,'aria-current':tab===id?'page':undefined}))),
  h('div',{className:'ps-announcement',role:'status','aria-live':'polite'},notice),
  h('div',{className:'ps-body',key:tab},body),
  h('dialog',{ref:dialogRef,className:'ps-dialog','aria-labelledby':'ps-dialog-title',onCancel:e=>{e.preventDefault();close()},onClick:e=>{if(e.target===dialogRef.current)close()}},dialogContent()));
}
