import {t, tn, K, isEnglish} from './i18n.js?v=audit1117b';
import {localProPreviewEnabled} from './dev-tools.js?v=1';
import {CloudDataUse,SubscriptionDisclosure} from "./app-disclosures.js?v=ai-names1";
import {CloudFirstSummaryDemo} from './cloud-first-demo.js?v=photo-simplify1';
import {openCareWorkspace} from './care-journey-ui.js?v=photo-simplify1';
import {aiFeatureName,AI_POINTS_PLAN,PRO_TEST_PRICE} from './ai-presentation.js?v=ai-names1';
import {GEMMA_MODELS,useGemmaModels} from './gemma-meal.js?v=r3';
import {DownloadConfirm} from './download-confirm.js?v=r3';
import {voiceExample,VOICE_KINDS} from './voice-quick-model.js?v=photo-simplify1';
import {readDeleteSafetyCopy,restoreDeleteSafetyCopy,SAFETY_SCOPE_NOTE} from './delete-safety.js?v=audit1117b';
import {AccountPanel} from './account-ui.js?v=ai-names1';
import {loadQuota,MONTHLY_LIMIT,PLAN_PRICES,QUOTA_PACKS} from './cloud-quota.js?v=quota-feedback1';
import {STORE_PRODUCTS,storeCatalog,storeAction,billingResultMessage,useServerSubscription} from './store-billing.js?v=billing1';
// 方案與額度（Ian 2026-11-13 定案）：免費每月 5 次進階模式、訂閱每月 100 次；月訂 NT$99、年訂 NT$990；
// 額度包不會過期，免費與訂閱都能買；商店與後端都準備好才開放購買。
// 餘額卡按「查看」才顯示；訂閱權益另由共用模組背景核對。購買價格使用商店回傳，台灣設定參考 cloud-quota.js。
export const STORE_PRICE_PENDING=t('價格載入中，或此版本無法購買');
export function CloudCarePlans({react:R,paid,cycle='month',onCycle,onSubscribe,onFree,onManage,onPlayScene,onReport,avatar=null}){
 const h=R.createElement;
 const button=(text,onClick,extra={})=>h('button',{type:'button',className:'ps-button secondary',onClick,...extra},text);
 const cloud=typeof window!=='undefined'&&typeof window.V161Cloud?.request==='function'?window.V161Cloud:null;
 const [quota,setQuota]=R.useState(null),[checking,setChecking]=R.useState(false),[quotaError,setQuotaError]=R.useState('');
 const [localCycle,setLocalCycle]=R.useState(cycle==='year'?'year':'month');
 const subscribed=useServerSubscription(R);
 const [catalog,setCatalog]=R.useState({available:false,products:[],message:''}),[billingBusy,setBillingBusy]=R.useState(''),[billingNotice,setBillingNotice]=R.useState('');
 const purchaseLock=R.useRef(false),billingAlive=R.useRef(true);
 const readCatalog=async()=>{const next=await storeCatalog(cloud);if(billingAlive.current)setCatalog(next);};
 R.useEffect(()=>{billingAlive.current=true;readCatalog();const refresh=()=>readCatalog();window.addEventListener('xbb-account-changed',refresh);return()=>{billingAlive.current=false;window.removeEventListener('xbb-account-changed',refresh);};},[]);
 const storeProduct=id=>catalog.products.find(p=>p.id===id);
 const act=async(op,productId)=>{
  if(purchaseLock.current||!cloud)return;
  purchaseLock.current=true;setBillingBusy(productId||'restore');setBillingNotice('');
  try{
   const result=await storeAction(op,productId,cloud);
   if(!billingAlive.current)return;
   setBillingNotice(billingResultMessage(result));
   if(result?.state==='done'){const next=await loadQuota(cloud);if(billingAlive.current){setQuota(next);if(!next)setQuotaError(t('交易已驗證，實際餘額暫時查不到，請稍後重新查詢。'));}}
  }catch{if(billingAlive.current)setBillingNotice(t('暫時無法連線，請稍後同步權益確認付款結果。'));}
  finally{purchaseLock.current=false;if(billingAlive.current)setBillingBusy('');}
 };
 const yearly=(onCycle?cycle:localCycle)==='year';
 const pickCycle=next=>{if(onCycle)onCycle(next);else setLocalCycle(next);};
 const checkQuota=async()=>{
  if(checking||!cloud)return;
  setChecking(true);setQuotaError('');
  const view=await loadQuota(cloud);
  setChecking(false);
  if(view)setQuota(view);else setQuotaError(t('查不到這個月的額度，請確認網路後再試。'));
 };
 const selectedId=STORE_PRODUCTS[yearly?'year':'month'],selectedProduct=storeProduct(selectedId);
 return h('section',{className:'care-plans','aria-label':t('方案與額度')},
  // 2026-11-17（Ian 批准第三批 B）：想付費的人先看到方案差別與購買鈕；順序＝方案比較 → Pro 預覽 → 額度包 → 帳號、額度與恢復購買 → 細則（收合）。
  // 自動續訂揭露仍緊貼在訂閱按鈕下方（商店規範）。
  h('section',{className:'plan-section'},
   h('div',{className:'plan-head'},h('h2',null,t('方案')),
    h('div',{className:'plan-cycle',role:'group','aria-label':t('付款週期')},
     h('button',{type:'button','aria-pressed':!yearly,onClick:()=>pickCycle('month')},t('月訂')),
     h('button',{type:'button','aria-pressed':yearly,onClick:()=>pickCycle('year')},t('年訂')))),
   h('article',{className:'plan-card is-featured','data-plan':'sub'},
    h('div',{className:'plan-card-top'},h('h3',null,t('訂閱'))),
    // 2026-11-14b：商店價格沒載入時不顯示「／年」「／月」與橘色大字，免得看起來像價格；改一般灰字說明，按鈕維持停用。
    selectedProduct?h('p',{className:'plan-price'},h('span',{className:'plan-amount'},selectedProduct.displayPrice),h('span',{className:'plan-unit'},yearly?t('／年'):t('／月'))):h('p',{className:'plan-sub','data-plan-price-pending':true},STORE_PRICE_PENDING+(isEnglish()?'.':'。')),
    h('p',{className:'plan-sub'},t('台灣方案設定：月訂 {monthly}／年訂 {yearly}。實際幣別與價格以商店確認畫面為準。',{monthly:'NT$'+PLAN_PRICES.monthly,yearly:'NT$'+PLAN_PRICES.yearly})),
    h('ul',{className:'plan-features'},
     h('li',null,h('strong',null,t('進階模式每月 {sub} 次',{sub:MONTHLY_LIMIT.sub}))),
     h('li',null,t('免費版的功能全部都有')),
     h('li',null,t('小魚可選快速、每回 1～10 隻或無限接力、更多外觀，並為每隻毛孩保存設定')),
     h('li',null,t('訂閱跟著帳號，換手機登入同一個帳號就能用'))),
    button(billingBusy===selectedId?t('處理中…'):yearly?t('訂閱年方案'):t('訂閱月方案'),()=>act('billingPurchase',selectedId),{disabled:!!billingBusy||!catalog.available||!selectedProduct||subscribed,className:'ps-button plan-cta','data-plan-subscribe':true}),
    h('p',{className:'plan-fine'},t('訂閱會自動續訂，除非在目前期間結束前向 App Store 或 Google Play 取消。取消後可使用至已付款期間結束；刪除 App 或帳號不會取消商店訂閱。')),
    h('p',{className:'plan-fine'},t('管理或取消訂閱：iPhone 到「設定 › Apple 帳號 › 訂閱項目」；Android 到「Google Play › 付款與訂閱 › 訂閱」。')),
    catalog.privacyURL&&catalog.termsURL&&h('p',{className:'plan-fine'},h('a',{href:catalog.privacyURL,target:'_blank',rel:'noopener'},t('隱私權政策')),' · ',h('a',{href:catalog.termsURL,target:'_blank',rel:'noopener'},t('使用條款')))),
   h('article',{className:'plan-card','data-plan':'free'},
    h('div',{className:'plan-card-top'},h('h3',null,t('免費')),quota&&quota.plan!=='sub'&&h('span',{className:'plan-tag is-quiet'},t('目前方案'))),
    h('p',{className:'plan-price is-small'},h('span',{className:'plan-currency'},'NT$'),h('span',{className:'plan-amount'},'0')),
    h('ul',{className:'plan-features'},
     h('li',null,h('strong',null,t('進階模式每月 {free} 次',{free:MONTHLY_LIMIT.free}))),
     h('li',null,t('記錄、一般摘要、備份、多隻毛孩、陪玩')),
     h('li',null,t('小魚每回 1～3 隻、不限重玩；大小、4 種水域、音效、慢速／一般與固定／隨機路線都能選')),
     h('li',null,t('不用登入'))))),
  (!cloud||localProPreviewEnabled())&&h('section',{className:'ps-card care-preview-details','data-pro-preview-entry':true},
   h('h3',null,t('Pro 預覽')),
   h('p',null,t('只在這台裝置上切換預覽，不會付款，也不會增加進階模式額度。')),
   button(paid?t('關閉 Pro 預覽'):t('開啟 Pro 預覽'),paid?onFree:onSubscribe)),
  h('section',{className:'plan-section','data-plan-packs':true},
   h('div',{className:'plan-head'},h('h2',null,t('額度包')),h('span',{className:'plan-tag is-quiet'},t('不會過期'))),
   h('p',{className:'plan-sub'},t('免費與訂閱用戶都能購買，不需要先訂閱。購買時請登入綁定帳號；已購額度不會過期，取消訂閱後仍可使用。先扣當月額度，用完才扣額度包。')),
   h('ul',{className:'plan-packs'},QUOTA_PACKS.map(pack=>h('li',{key:pack.count},
    h('span',{className:'plan-pack-count'},t('{count} 次',{count:pack.count})),
    h('span',{className:'plan-pack-each'},t('台灣設定 {price}',{price:'NT$'+pack.price})),
    storeProduct(STORE_PRODUCTS[pack.count])?h('span',{className:'plan-pack-price'},storeProduct(STORE_PRODUCTS[pack.count]).displayPrice):h('span',{className:'plan-pack-each','data-plan-price-pending':true,style:{gridColumn:'1/-1'}},STORE_PRICE_PENDING),
    button(billingBusy===STORE_PRODUCTS[pack.count]?t('處理中…'):t('購買 {count} 次',{count:pack.count}),()=>act('billingPurchase',STORE_PRODUCTS[pack.count]),{disabled:!!billingBusy||!catalog.available||!storeProduct(STORE_PRODUCTS[pack.count]),'data-plan-pack':pack.count}))))),
  // 帳號放最上面：訂閱或購買額度包時登入綁定，不影響訪客使用線上。
  h('section',{className:'ps-card','data-plan-account':true,id:'settings-account'},
   h('h2',null,t('帳號')),
   h(AccountPanel,{react:R,avatar}),   // 面板自己會說明「不登入也能完整記錄、也能用進階模式」
   h('details',{className:'care-fold'},h('summary',null,t('登入後額度怎麼算？')),
    h('p',{className:'plan-sub'},t('沒登入時，額度算在這支手機；第一次登入，這支手機用過的額度會接到帳號上（如果這個帳號以前在別支手機登入過，會改用帳號原本的額度）。訂閱與額度包跟著帳號。紀錄只存在手機上，換手機請用「設定 › 資料與備份」搬過去。')))),
  h('section',{className:'ps-card','data-plan-quota':true},
   h('h2',null,t('這個月的進階模式額度')),
   h('p',null,t('每次用進階模式（語音整理、陪玩設計、看診摘要、食品照片辨識、日記照片起頭）會用 1 次額度。免費每月 {free} 次，訂閱每月 {sub} 次，每月 1 日重置。是否已扣除、退回或仍待確認，請以本次處理結果與實際餘額為準。',{free:MONTHLY_LIMIT.free,sub:MONTHLY_LIMIT.sub})),
   quota&&h('p',{role:'status','data-plan-quota-left':true},h('strong',null,t('本月剩 {month} 次',{month:quota.month})),
    (quota.pack?t('，額度包 {pack} 次',{pack:quota.pack}):'')+(quota.plan==='sub'?t('（訂閱方案，每月 {limit} 次）',{limit:quota.limit}):t('（免費方案，每月 {limit} 次）',{limit:quota.limit}))),
   cloud?button(checking?t('查詢中…'):quota?t('重新查詢'):t('查看本月剩幾次'),checkQuota,{disabled:checking,'data-plan-check':true})
    :h('p',{className:'ps-note'},t('這個版本沒有接線上，查不到額度。')),
   quotaError&&h('p',{className:'cj-error',role:'alert'},quotaError)),
  h('section',{className:'ps-card','data-plan-billing':true},
   h('h2',null,t('恢復購買與商店狀態')),
   h('div',{'data-billing-status':true},
    catalog.message&&h('p',{className:'ps-note',role:'status'},catalog.message),
    billingNotice&&h('p',{className:'ps-note',role:'status','data-billing-result':true},billingNotice),
    button(t('重新讀取商店商品'),readCatalog,{disabled:!!billingBusy}),
    button(billingBusy==='restore'?t('同步中…'):t('恢復購買／同步權益'),()=>act('billingRestore'),{disabled:!!billingBusy||!cloud,'data-billing-restore':true}),
    h('p',{className:'ps-note'},subscribed?t('目前訂閱有效。'):t('目前未確認有效訂閱；以伺服器核對結果為準。')))),
  h('details',{className:'care-fold plan-disclosure-fold'},h('summary',null,t('訂閱細則與說明')),h(SubscriptionDisclosure,{react:R})),
  h('p',{className:'care-plan-footnote'},t('AI 想用再用：手機模式在設定的「AI 與下載」，要先下載、不用額度；進階模式功能每次送出前都會先問你。')));
}

// 「看文字整理範例」（Ian 2026-11-14）：原本開成空白語音快記、返回還跳到照護觀察。
// 改成就地展開一份固定例句：原文 → 整理後的紀錄卡。虛構毛孩、不存檔、不用 AI；收起後焦點回到原按鈕。
const EXAMPLE_CATS = Object.freeze([{id: 'example-a', profile: {name: K('小白')}}, {id: 'example-b', profile: {name: K('麻糬')}}]);
const EN_TEXT_EXAMPLE = Object.freeze({
  raw: 'Snowy ate half a can of wet food this morning. Mochi peed twice in the litter box. Snowy was a bit slepy this afternoon.',
  cards: [
    {pet: 'Snowy', kind: 'Feeding', text: 'Ate half a can of wet food.', note: 'Today 08:00 · 0.5 can'},
    {pet: 'Mochi', kind: 'Litter box', text: 'Peed twice in the litter box.', note: 'Today 08:00 · 2 clumps'},
    {pet: 'Snowy', kind: 'Energy', text: 'A bit sleepy this afternoon.', note: 'Today 15:00 · Typo fixed: "slepy" → "sleepy"'},
  ],
});
export function TextOrganizeExample({react: R, onClose}) {
  const h = R.createElement;
  const box = R.useRef(null);
  R.useEffect(() => { box.current?.focus?.({preventScroll: true}); box.current?.scrollIntoView?.({block: 'nearest'}); }, []);
  // 英文介面：中文例句與中文分卡規則不適用，改用固定的英文範例（同樣不存檔、不用 AI）。
  if (isEnglish()) return h('section', {ref: box, tabIndex: -1, className: 'ps-card care-text-example', 'aria-label': 'Text organizing example', 'data-text-example': true, style: {marginTop: '12px'}},
    h('p', {className: 'pro-tag', style: {display: 'inline-block'}}, 'Example · not saved'),
    h('h3', null, 'Text organizing example'),
    h('p', {className: 'ps-note'}, 'Two made-up pets, "Snowy" and "Mochi". This page is only a demo: it adds no records, uses no credits, and runs no AI.'),
    h('h4', {style: {margin: '12px 0 4px'}}, 'What you said (original)'),
    h('pre', {className: 'vq-verbatim', style: {whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit'}}, EN_TEXT_EXAMPLE.raw),
    h('h4', {style: {margin: '12px 0 4px'}}, `Organized: ${EN_TEXT_EXAMPLE.cards.length} record cards`),
    h('ol', {className: 'care-text-example-cards', style: {listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px'}},
      EN_TEXT_EXAMPLE.cards.map(card => h('li', {key: card.text, className: 'vq-row', style: {padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--line, rgba(0,0,0,.12))'}},
        h('strong', null, `${card.pet} · ${card.kind}`),
        h('span', {style: {display: 'block'}}, card.text),
        h('small', {className: 'ps-note'}, card.note)))),
    h('p', {className: 'ps-note'}, 'English voice notes and typed notes are organized with Advanced mode. To log for real, use "Voice note" on Today, then check each card before saving.'),
    h('button', {type: 'button', className: 'ps-button secondary', onClick: onClose, 'data-text-example-close': true}, 'Close example'));
  const example = voiceExample(EXAMPLE_CATS, 'example');
  const kindName = kind => VOICE_KINDS.find(([id]) => id === kind)?.[1] || t('其他');
  const catName = id => EXAMPLE_CATS.find(cat => cat.id === id)?.profile.name || '';
  const fixed = (row, i) => i === example.correction.index ? row.text.replace(example.correction.from, example.correction.to) : row.text;
  return h('section', {ref: box, tabIndex: -1, className: 'ps-card care-text-example', 'aria-label': t('文字整理範例'), 'data-text-example': true, style: {marginTop: '12px'}},
    h('p', {className: 'pro-tag', style: {display: 'inline-block'}}, t('範例・不會存檔')),
    h('h3', null, t('文字整理範例')),
    h('p', {className: 'ps-note'}, t('虛構的兩隻毛孩「小白」「麻糬」。這頁只是示範，不會新增紀錄、不用額度，也沒有執行 AI。')),
    h('h4', {style: {margin: '12px 0 4px'}}, t('你說的話（原文）')),
    h('pre', {className: 'vq-verbatim', style: {whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit'}}, example.raw),
    h('h4', {style: {margin: '12px 0 4px'}}, t('整理後：{count} 張紀錄卡',{count:example.rows.length})),
    h('ol', {className: 'care-text-example-cards', style: {listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px'}},
      example.rows.map((row, i) => h('li', {key: row.key, className: 'vq-row', style: {padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--line, rgba(0,0,0,.12))'}},
        h('strong', null, `${catName(row.catId)} · ${kindName(row.kind)}`),
        h('span', {style: {display: 'block'}}, fixed(row, i)),
        h('small', {className: 'ps-note'}, [t('今天 08:00'), row.amount ? `${row.amount} ${row.unit}` : '', i === example.correction.index ? t('修字：「{from}」→「{to}」',{from:example.correction.from,to:example.correction.to}) : ''].filter(Boolean).join('・'))))),
    h('p', {className: 'ps-note'}, t('真的要記：到首頁「語音快記」說或打字，分卡後逐張核對再儲存。')),
    h('button', {type: 'button', className: 'ps-button secondary', onClick: onClose, 'data-text-example-close': true}, t('收起範例')));
}

// AI availability, downloads and data handling are separate from billing.
export function AIFeatures({react:R}){
 const h=R.createElement,voiceHost=typeof window!=='undefined'&&typeof window.V161Asr?.request==='function'?window.V161Asr:null;
 const gemmaHost=typeof window!=='undefined'?window.V161Gemma:null;
 const [gemma,setGemma]=useGemmaModels(R,gemmaHost,true),[gemmaError,setGemmaError]=R.useState(''),[confirmModel,setConfirmModel]=R.useState('');
 const downloading=R.useRef(false);
 async function prepareGemma(model){
  if(downloading.current||gemma?.downloading)return;
  downloading.current=true;setGemmaError('');
  try{setGemma(await gemmaHost.request('prepare',{model}));}
  catch(error){setGemmaError(tn(error.message));}
  finally{downloading.current=false;}
 }
 const [voice,setVoice]=R.useState(null);
 const voiceBusy=voice?.state==='downloading';
 R.useEffect(()=>{
  if(!voiceHost)return;
  let active=true,timer;
  async function refresh(){
   try{const result=await voiceHost.request('status');if(active)setVoice(result);}
   catch{if(active)setVoice({state:'unavailable'});}
   if(active&&voiceBusy)timer=setTimeout(refresh,1000);
  }
  refresh();
  return()=>{active=false;clearTimeout(timer);};
 },[voiceHost,voiceBusy]);
 const nativeVoice=voice?.engine==='system'&&(voice.onDevice||voice.nativeDefault);
 const voiceStatus=nativeVoice?(voice.state==='downloading'?t('系統語音包下載中'):voice.available===false?t('此語言暫不支援系統語音'):voice.modelReady===false?t('系統離線語音包待安裝'):t('系統提供 · 可離線轉寫')):voice?.modelReady?t('已安裝 · 可離線轉寫'):voice?.state==='downloading'
  ?((voice.progress||0)>=1?t('正在驗證模型檔'):t('背景下載中 · {percent}%',{percent:Math.floor((voice.progress||0)*100)}))
  :voice?.state==='error'?t('模型準備未完成'):voice?.state==='needs-model'?t('尚未下載'):voice?.state==='unavailable'?t('暫時無法確認'):t('正在確認模型狀態');
 // Short cards; the not-yet-available specs and the demo links live under 「看範例」.
 const modelCard=(id,title,purpose)=>h('article',{key:id,className:'care-model-card'},
  h('span',{className:'pro-tag'},voiceHost?t('尚未接入此版本'):t('未安裝 · 功能未啟用')),h('h3',null,title),h('p',null,purpose));
 const textDemo=!gemmaHost&&!voiceHost,asrDemo=!voiceHost;
 // Phone AI is folded away, but opens by itself (and says why) once anything was downloaded,
 // is downloading or stopped half-way, so owners can always find and manage it.
 const gemmaRows=gemmaHost?GEMMA_MODELS.map(({id})=>gemma?.models?.find(item=>item.id===id)).filter(Boolean):[];
 const phoneState=gemma?.downloading||voiceBusy&&!nativeVoice||gemmaRows.some(m=>!m.ready&&Number.isFinite(m.progress))?t('下載中')
  :gemmaRows.some(m=>!m.ready&&m.message)||!nativeVoice&&voice?.state==='error'?t('上次下載中斷')
  :gemmaRows.some(m=>m.ready)||!nativeVoice&&voice?.modelReady?t('已下載'):'';
 const phoneOpen=R.useRef(false);
 const [showExample,setShowExample]=R.useState(false),exampleTrigger=R.useRef(null);
 if(phoneState)phoneOpen.current=true;
 return h('section',{className:'care-plans cloud-first-hub','aria-label':t('AI 與下載')},
  h('p',{className:'care-ai-intro'},t('不下載也能用全部紀錄功能；AI 都是選用，你按了才會開始。AI 結果都是候選，請核對後再存。')),
  nativeVoice&&h('section',{className:'ps-card'},h('h3',null,voice.provider==='apple'?t('Apple 原生語音辨識'):t('手機系統語音辨識')),h('p',{role:'status'},voiceStatus),h('p',null,voice.provider==='apple'?t('使用 Apple 系統語音，不需下載本 App 的語音模型；轉寫後請先核對文字。不支援時可直接打字，不會自動改用網路辨識。'):t('由手機系統提供離線辨識；若缺少語音包，開始前會先詢問。轉寫後請核對文字。')),h('button',{type:'button',className:'ps-button secondary',onClick:()=>openCareWorkspace({mode:'ai',origin:'record'})},t('開啟語音快記'))),
  h('section',{className:'ps-card'},h('h3',null,t('進階模式（預設）')),h('p',null,t('需連網、免下載整理或辨識模型，每次使用 1 次額度。確認並同意後，才交由毛孩小本本的 AI 伺服器處理。')),h(CloudFirstSummaryDemo,{react:R})),
  h('section',{className:'care-data-separation'},h('h3',null,t('每次送出前先確認')),h('p',null,t('進階模式透過網路交由毛孩小本本的 AI 伺服器處理，不是在手機內運算。每次都要你按下並同意，才送出列出的文字或照片並使用額度；失敗會保留草稿，不會偷偷切換處理方式。也能不使用 AI，直接核對與儲存。'))),
  h('details',{className:'care-fold care-phone-ai',open:phoneOpen.current},
   h('summary',null,h('span',null,t('手機模式（選用・要下載）')),phoneState&&h('small',{className:'care-phone-ai-state',role:'status'},phoneState)),
   h('p',{className:'care-phone-ai-intro'},nativeVoice?t('手機模式文字整理需先下載模型，下載後可離線使用，不用額度；系統語音轉文字與文字整理分開提供。'):gemmaHost?t('手機模式需先下載模型，下載後可在手機離線使用，不用額度；語音轉文字和文字整理分開下載，可用功能依裝置與模型支援提供。'):voiceHost?t('可下載語音模型，在手機把說的話轉成文字，不用額度；此版本尚未支援手機文字整理模型。'):t('手機模式需先下載模型、不用額度；是否支援依這台手機與功能而定。')),
  h('div',{className:'care-model-grid'},
   gemmaHost?GEMMA_MODELS.map(({id,title,size})=>{
    const model=gemma?.models?.find(item=>item.id===id),progress=model?.progress;
    const status=model?.supported===false?t('此裝置不支援'):model?.ready?t('已安裝'):Number.isFinite(progress)?(progress===1?t('正在驗證模型檔'):t('背景下載中 · {percent}%',{percent:Math.floor(progress*100)})):model?t('尚未下載'):gemma?.unavailable?t('暫時無法確認'):t('正在確認模型狀態');
    return h('article',{key:id,className:'care-model-card'},h('span',{className:'pro-tag',role:'status'},status),h('h3',null,title),
     h('p',null,model?t('{size} · 手機記憶體需 {minimumRamGiB} GB 以上',{size,minimumRamGiB:model.minimumRamGiB}):size),
     model?.block?h('p',null,model.block):model?.tightRam&&h('p',null,t('建議手機記憶體 {recommendedRamGiB} GB 以上，這台手機可能整理得比較慢。',{recommendedRamGiB:model.recommendedRamGiB})),
     model?.message&&!model.block&&h('p',{role:'alert'},tn(model.message)),
     model&&!model.ready&&model.supported!==false&&h('button',{type:'button',className:'ps-button secondary',disabled:gemma?.downloading||!!model.block,hidden:confirmModel===id,onClick:()=>setConfirmModel(id)},`${model.message?t('續傳'):t('下載')} ${title}`),
     confirmModel===id&&h(DownloadConfirm,{R,title,size,onConfirm:()=>{setConfirmModel('');prepareGemma(id);},onCancel:()=>setConfirmModel('')}));
   }):modelCard('text',t('手機文字整理（LLM）'),voiceHost?t('此版本尚未接入裝置端文字模型。'):t('整理短文字與分類，形成可修改草稿；能力與繁中品質待驗證。')),
   nativeVoice?null:voiceHost?h('article',{className:'care-model-card'},
    h('span',{className:'pro-tag',role:'status'},voiceStatus),h('h3',null,t('手機語音辨識')),
    h('p',null,t('SenseVoice 語音轉文字，模型約 240 MB。可在語音快記下載或開始錄音。')),
    h('button',{type:'button',className:'ps-button secondary',onClick:()=>openCareWorkspace({mode:'ai',origin:'record'})},t('開啟語音快記')))
   :modelCard('asr',t('手機語音辨識'),t('把說的話轉成文字；是否支援要看這台手機。'))),
  gemmaError&&h('p',{role:'alert'},gemmaError),
  h('p',{className:'care-service-status'},gemmaHost?t('模型下載完成後，可在語音快記選擇要用哪一個。選擇手機模式時，錄音、轉文字與整理都在手機上完成。'):voiceHost?t('錄音與轉文字在手機上完成，轉完請先核對文字。'):t('手機失敗時會保留草稿，不會自動改用進階模式；不支援就直接打字。'))),
  h('details',{className:'care-fold care-examples'},h('summary',null,t('看範例')),
   (textDemo||asrDemo)&&h('dl',null,h('dt',null,t('容量／裝置支援')),h('dd',null,t('尚未提供'))),
   h('div',{className:'care-example-actions'},
    textDemo&&h('a',{className:'ps-button secondary',href:'/xbb-site/app/model-download/#text'},t('管理文字下載示範')),
    asrDemo&&h('a',{className:'ps-button secondary',href:'/xbb-site/app/model-download/#asr'},t('管理語音下載示範')),
    h('button',{type:'button',ref:exampleTrigger,className:'ps-button secondary','aria-expanded':showExample,'data-text-example-open':true,onClick:()=>setShowExample(v=>!v)},t('看文字整理範例')),
    h('a',{className:'ps-button secondary',href:'/xbb-site/app/report-review/'},t('看報告解讀範例'))),
   showExample&&h(TextOrganizeExample,{react:R,onClose:()=>{setShowExample(false);requestAnimationFrame(()=>exampleTrigger.current?.focus({preventScroll:false}));}})),
  h('p',{className:'care-plan-footnote'},t('登入不等於同意上傳舊資料；使用進階模式不等於備份。儲存與匯出請到「資料與備份」。')),
  h(CloudDataUse,{react:R}));
}

// Shows the newest safety copy taken before a delete or clear and lets the owner put it back.
export function SafetyCopyPanel({R}){
 const h=R.createElement;
 const [copy,setCopy]=R.useState(null),[ask,setAsk]=R.useState(false),[error,setError]=R.useState('');
 R.useEffect(()=>{let live=true;readDeleteSafetyCopy().then(value=>{if(live)setCopy(value);});return()=>{live=false;};},[]);
 // Only shown when there is something to put back; the delete dialogs already explain the copy.
 if(!copy)return null;
 const when=new Date(copy.createdAt).toLocaleString(isEnglish()?'en-US':'zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
 return h('section',{className:'safety-copy'},
  h('strong',null,t('復原最近一次刪除')),
  h('p',null,t('{when} 「{label}」之前的資料。',{when,label:t(copy.label||t('刪除'))})+SAFETY_SCOPE_NOTE),
  ask?h('div',null,
   h('p',null,SAFETY_SCOPE_NOTE+t('確定要復原嗎？')),
   h('button',{type:'button',className:'ps-button',onClick:()=>restoreDeleteSafetyCopy().catch(e=>setError(tn(e.message)||t('復原失敗，請再試一次。')))},t('確定復原')),
   h('button',{type:'button',className:'ps-button secondary',onClick:()=>setAsk(false)},t('先不要'))):
   h('button',{type:'button',className:'ps-button secondary',onClick:()=>setAsk(true)},t('復原')),
  error&&h('p',{role:'alert'},error));
}
// Order: undo the latest delete (only when a copy exists) → export / restore → status → account (not open yet).
export function DataAndBackup({react:R,backup=null,account=null}){
 const h=R.createElement;
 return h('section',{className:'care-plans','aria-label':t('資料與備份')},
  h(SafetyCopyPanel,{R}),
  backup,
  h('dl',{className:'care-storage-status'},h('dt',null,t('備份檔')),h('dd',null,t('可匯出備份檔，換手機時用來還原')),h('dt',null,t('雲端備份與同步')),h('dd',null,t('尚未開放'))),
  h('details',{className:'care-fold care-data-details'},h('summary',null,t('刪除 App 與資料說明')),h('p',null,t('清除 App 資料或解除安裝會失去紀錄，請先匯出備份檔。模型下載與照護資料分開管理。')),h('p',null,t('目前沒有雲端備份。進階模式整理結果在你儲存或放棄時就刪除，沒處理的最多保存 7 天；刪除帳號會一併清除進階模式整理結果。停止訂閱後的資料處理，會在訂閱開放前說明。'))),
  account);
}
