// Product proposals only. This module has no network, account, billing, or care-data access.
let nextSettingsTab='general';
export function requestCloudDemo(){nextSettingsTab='cloud'}
export function requestProPlans(){nextSettingsTab='plans'}
export function takeSettingsTab(){const tab=nextSettingsTab;nextSettingsTab='general';return tab}
export function ProBadge({react:R}){const h=R.createElement;return h('span',{className:'ps-pro-badge','aria-label':'Pro 限定功能提案'},h('svg',{viewBox:'0 0 24 24',fill:'currentColor','aria-hidden':true},h('ellipse',{cx:5,cy:8,rx:2.3,ry:3}),h('ellipse',{cx:10,cy:5,rx:2.2,ry:3}),h('ellipse',{cx:16,cy:5,rx:2.2,ry:3}),h('ellipse',{cx:20,cy:10,rx:2.2,ry:3}),h('path',{d:'M6 17c0-3 3-7 6-7s7 4 7 7c0 3-3 4-6 3-4 2-7 0-7-3Z'})),h('span',null,'Pro'))}
export function ProFeatureButton({react:R,title,description,onPlans}){
 const h=R.createElement,ref=R.useRef(null),trigger=R.useRef(null);
 const close=()=>{ref.current?.close();trigger.current?.focus()};
 return h(R.Fragment,null,h('button',{type:'button',className:'ps-feature-button',ref:trigger,onClick:()=>ref.current?.showModal()},h('span',null,title),h(ProBadge,{react:R})),h('dialog',{ref,className:'ps-dialog','aria-label':title+'方案說明',onCancel:e=>{e.preventDefault();close()}},h('h2',null,title,' ',h(ProBadge,{react:R})),h('p',null,description),h('p',{className:'ps-note'},'Pro 為付費方案提案。尚未接入真實訂閱或 AI，價格、權益與額度待定；目前不收費。'),onPlans&&h('button',{className:'ps-button',type:'button',onClick:()=>{close();onPlans()}},'查看方案與額度'),h('button',{className:'ps-button secondary',type:'button',onClick:close},'我知道了')));
}
const examples=[{id:'meal',text:'11/01 早餐提供 1 罐，吃下半罐。'},{id:'change',text:'11/02 開始更換乾飼料，先混入少量。'},{id:'observe',text:'11/03 記錄一次軟便，其他時段未記錄。'}];
const fresh=()=>({monthly:10,addon:0,report:null,serial:0});
let demo=fresh();
export function CloudDemo({react:R,paid,onPlans}){
 const h=R.createElement,[state,setState]=R.useState(()=>demo),[purpose,setPurpose]=R.useState('每週照護整理'),[selected,setSelected]=R.useState(examples.map(e=>e.id)),[dialog,setDialog]=R.useState(null),[consent,setConsent]=R.useState(false),[notice,setNotice]=R.useState(''),[edit,setEdit]=R.useState('');
 const ref=R.useRef(null),returnFocus=R.useRef(null),actionLock=R.useRef(false);
 const change=fn=>setState(previous=>{demo=fn(previous);return demo});
 const open=type=>{returnFocus.current=document.activeElement;actionLock.current=false;setConsent(false);setDialog(type)};
 const close=()=>{setDialog(null);requestAnimationFrame(()=>returnFocus.current?.isConnected&&returnFocus.current.focus())};
 R.useEffect(()=>{if(dialog)ref.current?.showModal();else if(ref.current?.open)ref.current.close()},[dialog]);
 const button=(text,fn,secondary=false,disabled=false)=>h('button',{type:'button',className:'ps-button'+(secondary?' secondary':''),onClick:fn,disabled},text);
 const note=text=>h('p',{className:'ps-note'},text);
 const total=state.monthly+state.addon;
 const generate=success=>{
  if(actionLock.current||!paid||!consent||!selected.length||total<1)return;
  actionLock.current=true;
  if(!success){setNotice('已展示失敗情境：未產生報告，月額度與額度包皆未扣除。沒有連線或重試扣款。');close();return}
  const text=purpose+'｜固定文字示範\n\n'+examples.filter(e=>selected.includes(e.id)).map(e=>'• '+e.text).join('\n')+'\n\n以上僅整理選取的示範文字。未記錄不代表正常，無法推論原因，也不提供診斷。';
  change(d=>({...d,monthly:Math.max(0,d.monthly-1),addon:d.monthly>0?d.addon:Math.max(0,d.addon-1),serial:d.serial+1,report:{title:purpose,text,version:d.serial+1}}));
  setNotice('已顯示固定示範報告，模擬扣除 1 次'+(state.monthly>0?'月額度':'額度包')+'。未呼叫 AI、未上傳資料。');close();
 };
 const exportReport=()=>{if(!state.report)return;const url=URL.createObjectURL(new Blob([state.report.text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='毛孩小本本-文字報告示範.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('已匯出示範文字，未扣額度。此檔案不是完整資料備份。')};
 return h('div',{className:'ps-cloud'},
  h('div',{className:'ps-section-intro'},h('span',{className:'ps-kicker'},'A LITTLE HELP, WHEN YOU CHOOSE'),h('h2',null,'需要時，再交給雲端。'),h('p',null,'進階模式僅規劃提供給 Pro 付費帳號。每次先選文字、看用途與額度，再由你決定。')),
  h('section',{className:'ps-card ps-quota'},h('div',{className:'ps-card-head'},h('h2',null,'雲端文字額度'),h(ProBadge,{react:R})),h('p',{className:'ps-demo-label'},'互動模擬 · 非真實帳戶餘額'),
   h('div',{className:'ps-quota-grid'},h('div',null,h('span',null,'每月額度'),h('strong',null,paid?state.monthly:0,h('small',null,paid?' / 10 次':' 次')),h('small',null,paid?'每帳號共用 · 建議值':'免費不含雲端額度')),h('div',null,h('span',null,'額度包'),h('strong',null,paid?state.addon:0,h('small',null,' 次')),h('small',null,'10 次／包 · 提案'))),
   note(paid?'本月與額度包分開顯示。這些數字只在本次頁面中模擬，不代表已訂閱或購買。':'沒有免費雲端試用。切換 Pro 展示也不會啟用真實服務。'),
   !paid&&button('查看 Pro 方案',onPlans),
   paid&&button('查看 10 次額度包',()=>open('pack'),true),
   h('details',{className:'ps-rules'},h('summary',null,'怎麼計次？'),h('ul',null,h('li',null,'建議每月 10 次文字整理，每帳號共用；每週整理與看診報告共用額度。'),h('li',null,'成功產生一份報告 = 1 次；失敗不扣。'),h('li',null,'重看、手動編輯、匯出不扣；重新產生是新的一次，先提示再確認。'),h('li',null,'月額度每月重設，不累積；不自動加購或超額收費。'),h('li',null,'先用月額度，再用加購額度為本版示範順序。正式順序待定。'),h('li',null,'10 次為測試提案；價格、最終配額及重設時間待定。')))),
  h('div',{className:'ps-announcement',role:'status','aria-live':'polite'},notice),
  paid&&h('section',{className:'ps-card'},h('div',{className:'ps-card-head'},h('h2',null,'文字整理示範'),h(ProBadge,{react:R})),h('p',null,'這裡只使用下方固定範例，不讀取你的照護紀錄。沒有真正的 AI 處理或資料上傳。'),
   h('label',{className:'ps-field'},'這次的用途',h('select',{value:purpose,onChange:e=>setPurpose(e.target.value)},h('option',null,'每週照護整理'),h('option',null,'看診前文字報告'))),
   h('fieldset',{className:'ps-samples'},h('legend',null,'選擇本次示範文字'),examples.map(e=>h('label',{key:e.id},h('input',{type:'checkbox',checked:selected.includes(e.id),onChange:()=>setSelected(s=>s.includes(e.id)?s.filter(id=>id!==e.id):[...s,e.id])}),h('span',null,e.text)))),
   total===0&&h('p',{className:'ps-warning',role:'status'},'示範額度已用完。可等下月重設或自行選擇額度包；手動記錄與免費摘要不受影響。'),
   button(total===0?'額度用完，查看額度包':state.report?'重新產生示範報告 · 1 次':'預覽本次用途與額度 · 1 次',()=>open(total===0?'pack':'generate'),false,!selected.length),
   !selected.length&&note('請至少勾選一筆示範文字。'),note('文字配額不包含錄音或照片。這兩種用途須另行規劃與取得同意，目前未開放。')),
  state.report&&h('section',{className:'ps-card ps-sample-report'},h('h2',null,'上次的示範報告'),h('p',null,state.report.title+' · 第 '+state.report.version+' 份示範'),note('固定文字組合，非 AI 推論；只保留在本次頁面，不寫入照護紀錄。'),button('重看／手動編輯 · 不扣額度',()=>{setEdit(state.report.text);open('report')},true),button('匯出示範文字 · 不扣額度',exportReport,true)),
  h('section',{className:'ps-card'},h('h2',null,'你保有決定權'),h('ul',null,h('li',null,'只傳送你選取的文字，不預設附上完整紀錄。'),h('li',null,'正式上線前，每次必須說明接收服務、用途與內容，另行取得同意。'),h('li',null,'本機失敗不會偷偷改用雲端；本次同意不代表同意錄音、照片或其他用途。')),note('本版服務商尚未選定，也沒有真正可開啟的資料傳送。')),
  paid&&h('details',{className:'ps-demo-tools'},h('summary',null,'測試額度狀態（只影響示範）'),button('模擬全部額度用完',()=>{change(d=>({...d,monthly:0,addon:0}));setNotice('已將兩種示範餘額歸零，照護資料未變更。')},true),button('模擬下月重設',()=>{change(d=>({...d,monthly:10}));setNotice('月額度已重設為 10 次，不與本月餘額累加。額度包未變更；其期限規則仍待定。')},true)),
  note('所有方案、額度與報告示範狀態會在重新整理後重設；原有照護資料與獨立草稿不受影響。'),
  h('dialog',{ref,className:'ps-dialog','aria-labelledby':'cloud-dialog-title',onCancel:e=>{e.preventDefault();close()}},
   dialog==='generate'&&h(R.Fragment,null,h('h2',{id:'cloud-dialog-title'},state.report?'重新產生，使用 1 次？':'確認這一次整理'),h('p',null,'用途：'+purpose),h('div',{className:'ps-confirm-copy'},examples.filter(e=>selected.includes(e.id)).map(e=>h('p',{key:e.id},e.text))),h('p',null,'成功後模擬扣除 1 次'+(state.monthly>0?'月額度':'額度包')+'，剩餘總額度 '+Math.max(0,total-1)+' 次。失敗不扣；不自動購買。'),note('正式版本只會傳送以上選取文字給告知的服務商；本版尚無服務商、不連線、不上傳。'),h('label',{className:'ps-consent'},h('input',{type:'checkbox',checked:consent,onChange:e=>setConsent(e.target.checked)}),h('span',null,'只模擬同意本次用途與選取文字。我了解這不是實際上傳授權。')),button('模擬成功並扣 1 次',()=>generate(true),false,!consent),button('模擬失敗 · 不扣額度',()=>generate(false),true,!consent),button('先不要',close,true)),
   dialog==='pack'&&h(R.Fragment,null,h('h2',{id:'cloud-dialog-title'},'10 次文字額度包'),h('p',null,'Pro 額度用完時，可以自行加購，不自動扣款。這是流程提案，不是商品結帳。'),h('dl',{className:'ps-facts'},h('div',null,h('dt',null,'包裝額度'),h('dd',null,'10 次／包（建議）')),h('div',null,h('dt',null,'售價／有效期限'),h('dd',null,'待定')),h('div',null,h('dt',null,'取消訂閱後能否使用'),h('dd',null,'待定'))),note('取消續訂不等於立即到期；正式服務的資格、退款與到期規則，將在購買前明示。本版不接受付款或付款資料。'),button('模擬增加 10 次 · 不付款',()=>{if(actionLock.current||!paid)return;actionLock.current=true;change(d=>({...d,addon:d.addon+10}));setNotice('額度包已模擬增加 10 次。沒有購買、扣款或真實可用額度。');close()}),button('先不要',close,true)),
   dialog==='report'&&h(R.Fragment,null,h('h2',{id:'cloud-dialog-title'},'查看與編輯示範報告'),note('手動編輯不扣額度，也不會呼叫 AI 或改動原始照護紀錄。'),h('label',{className:'ps-field'},'示範報告內容',h('textarea',{rows:9,value:edit,onChange:e=>setEdit(e.target.value)})),button('儲存本次示範編輯 · 不扣額度',()=>{change(d=>({...d,report:{...d.report,text:edit}}));setNotice('已保留本次頁面的示範編輯，未扣額度。');close()}),button('取消編輯',close,true))));
}
