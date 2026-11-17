import {t} from './i18n.js?v=audit1117b';
// Verified prototype facts, not a substitute for the unpublished legal policy.
// Deliberately no network, storage, entitlement or consent writes.
import {DeviceCapabilities} from './device-capabilities.js';
import {devToolsEnabled} from './dev-tools.js?v=1';
export const CLOUD_DISCLOSURE_READY = false;
export const AI_DISCLOSURE = Object.freeze({
 actual:t('進階模式不用登入就能用：語音快記整理、陪玩 AI 設計、看診摘要整理、食品包裝照片辨識和藥袋解讀。只有你按下並同意時，才會送出當次的文字或照片，每次用 1 次額度；語音只送文字，不送錄音。看懂報告的進階模式是否開放，依此版本的功能狀態為準；內建範例只展示預寫結果，不是 AI 分析。付款還沒開放。手機模式與語音依此版本及模型安裝狀態提供。'),
 separation:t('AI 處理、帳號登入與資料備份是三件事。進階模式不代表自動備份；登入不等於同意上傳全部紀錄。備份須另行選擇，目前只有存在這台裝置和手動匯出／還原，沒有雲端備份或跨裝置同步。'),
 voice:t('語音轉文字依手機與語言支援提供；系統語音不需下載本 App 的語音模型，缺少系統語音包時會先詢問。開始錄音時才確認權限；拒絕或不支援時仍可打字，不會自動改用網路辨識或進階模式。轉寫文字經你核對才儲存。'),
 receiver:t('進階模式的接收服務是毛孩小本本的 AI 伺服器，由團隊自架，透過網路處理，並非手機內運算。處理地區與第三方服務的相關資訊仍待確認。'),
 retention:t('送出的照片在 AI 伺服器開始處理時就移除，文字在處理完就移除（通常幾分鐘內）。進階模式整理結果在你儲存或放棄時就刪除，沒處理的最多保存 7 天。工作紀錄（只有時間與類型，不含內容）保存 30 天，用來計算額度與查問題。刪除帳號會一併清除伺服器上的資料。處理地區與是否用於模型訓練仍待確認，尚不能作出不訓練的承諾。'),
 beforeSend:t('每次送出前，都會先列出這次要送的資料、用途和要用的額度，取得你這一次的同意。不同意也能繼續手動記錄。'),
 text:t('進階模式將送出前列出的當次文字、所選紀錄或照片傳到毛孩小本本的 AI 伺服器，依功能整理候選結果。語音只送轉寫文字，不送錄音；不因登入而上傳全部歷史。每次送出仍需另行同意，這份說明不是上傳授權。手動核對與直接儲存不會因此傳送資料。'),
 report:t('規劃內容：你選擇的報告照片或 PDF、頁面內文字與檢驗欄位（例如毛孩名字、檢驗日期、數值、單位及參考範圍）。選用近期紀錄時，另行列出內容並確認，不自動附加。'),
 blocked:t('這裡只是說明，不會記錄你已同意；實際送出前，各功能會另外問你。')
});
export function CloudDataUse({react:R,kind='text',open=false}){
 const h=R.createElement;
 return h('details',{className:'app-data-use',open},h('summary',null,t('資料使用與傳送確認')),
  h('p',{className:'app-disclosure-status'},t('你按下並同意才送出 · 每次用 1 次額度')),h('p',null,AI_DISCLOSURE.actual),h('p',null,t('進階模式功能不需下載手機模型，也不用登入。手動記錄與手機上的功能可獨立使用。')),h('p',null,AI_DISCLOSURE.separation),
  h('dl',null,h('dt',null,t('可能傳送的資料')),h('dd',null,AI_DISCLOSURE[kind==='report'?'report':'text']),h('dt',null,t('資料用途')),h('dd',null,kind==='report'?t('擷取報告欄位、提供白話說明與獸醫提問方向；不提供診斷或治療指示。'):t('依選擇整理日常紀錄草稿、觀察任務或回診摘要，核對後才儲存。')),h('dt',null,t('接收服務與第三方 AI')),h('dd',null,AI_DISCLOSURE.receiver),h('dt',null,t('保存、刪除與訓練用途')),h('dd',null,AI_DISCLOSURE.retention)),
  h('p',null,AI_DISCLOSURE.beforeSend),h('p',{className:'app-disclosure-note'},AI_DISCLOSURE.blocked));
}
export function CloudConsentPreview({react:R}){
 const h=R.createElement;
 return h('fieldset',{className:'app-consent-preview',disabled:true},h('legend',null,t('正式傳送確認 · 未啟用')),h('label',null,h('input',{type:'checkbox',checked:false,readOnly:true,disabled:true}),t('我已閱本次資料、用途、接收者與額度，並同意這一次傳送（流程示意）')),h('p',null,AI_DISCLOSURE.blocked));
}
export function SubscriptionDisclosure({react:R}){
 const h=R.createElement;
 return h('details',{className:'app-subscription-disclosure'},h('summary',null,t('訂閱、取消與退款說明')),h('p',{className:'app-disclosure-status'},t('可購買狀態與商店價格請見「方案」')),
  h('dl',null,h('dt',null,t('訂閱與付款')),h('dd',null,t('購買時需登入綁定帳號。款項由 App Store 或 Google Play 處理；交易資訊交由驗證服務核對後，才開通訂閱或增加額度。照護紀錄不會因此上傳。')),h('dt',null,t('續訂與取消')),h('dd',null,t('訂閱會自動續訂。請在目前期間結束前到 App Store 或 Google Play 管理或取消；取消後仍可用至已付款期間結束，刪除 App 或帳號不會取消自動續訂。')),h('dt',null,t('退款與條款')),h('dd',null,t('退款請向原購買商店申請，資格與結果以商店審核為準。購買前請閱讀方案頁的隱私權政策與使用條款；退款完成後會同步調整對應權益。')),h('dt',null,t('進階模式額度')),h('dd',null,t('每次進階模式送出用 1 次額度，送出前先確認。額度包不過期，訂閱取消後仍保留；若該筆購買退款，對應額度會調整。'))),
  h('p',null,t('停止 Pro 預覽不會刪除毛孩與紀錄。全部原始紀錄與歷史、原始資料匯出／備份及免費近 7／14 天基本摘要仍可使用。')));
}
export function PrivacySupport({react:R,onGeneral,onPlans,onAI,onDemo}){
 const h=R.createElement,button=(label,onClick)=>h('button',{type:'button',className:'ps-button secondary',onClick},label);
 return h('div',{className:'app-privacy-support'},
  h('section',{className:'ps-card'},h('h2',null,t('隱私政策與客服信箱')),h('p',null,t('正式隱私政策與客服信箱會在上架前補上。紀錄存在這台裝置；只有你按進階模式功能並同意時，才會送出當次的文字或照片。')),
   h('p',{className:'app-disclosure-note'},t('購買前請閱讀方案頁提供的正式隱私權政策與使用條款；尚未提供時不會開放購買。'))),
  h('section',{className:'ps-card'},h('h2',null,t('資料與裝置權限')),
   h('p',null,t('毛孩資料、食品卡、照護紀錄、提醒與草稿都儲存在手機上，不跨裝置同步，也不是雲端備份；換手機請用「資料與備份」搬過去。只有進階模式額度與訂閱跟著登入的帳號。')),
   h('details',{className:'app-data-use'},h('summary',null,t('備份、還原與刪除')),h('p',null,t('可在「資料與備份」匯出備份檔，或從備份檔還原（會先預覽）。備份檔沒有加密，含照片和紀錄，請自己保管；下載不等於對外分享。')),h('p',null,t('清除 App 資料或解除安裝會遺失紀錄，請先匯出備份檔再操作。伺服器上的資料刪除申請方式會在正式服務前說明。')),button(t('前往備份與還原'),onGeneral)),
   h('details',{className:'app-data-use'},h('summary',null,t('相機、照片與麥克風')),h(DeviceCapabilities,{react:R}),h('p',null,t('選照片或拍照由裝置處理。只有你按進階模式辨識並同意時，才會送出那一張照片；其他照片只在手機上預覽。食品卡與毛孩頭像要另外確認才會儲存；權限以系統設定為準。')),h('p',null,t('看懂報告的內建虛構照片／PDF 範例不會讀取你的檔案；使用自己的報告照片時，每次送出前另行取得同意。手機模型的支援與安裝狀態請見「AI 與下載」。')),h('p',null,AI_DISCLOSURE.voice))),
  h('section',{className:'ps-card'},h('h2',null,t('進階模式與報告')),h('p',null,t('進階模式不用登入就能用。照護文字與報告的資料用途、接收者及同意方式分開說明，每次送出前都會先請你同意，不會自動上傳。')),h(CloudDataUse,{react:R}),h('details',{className:'app-data-use'},h('summary',null,t('看懂報告會使用哪些資料？')),h('p',null,AI_DISCLOSURE.report),h('p',null,t('未儲存的示範操作會在關閉後重設；另外儲存的報告示範留在手機上，不寫入照護紀錄，也不包含在備份檔。'))),button(t('前往 AI 功能與模型'),onAI)),
  h('section',{className:'ps-card'},h('h2',null,t('Pro 與購買')),h('p',null,t('Pro 和購買都還沒開放，開放前會先告訴你，也不會鎖住你已經記下的資料。')),button(t('查看方案'),onPlans)),
  onDemo&&devToolsEnabled()&&h('button',{type:'button',className:'ps-text-button',onClick:onDemo},t('原型說明與示範設定')));
}
