import {t, tn} from './i18n.js?v=audit1117b';
// Store prices and purchase results come from native code. Only server quota grants access.
export const STORE_PRODUCTS = Object.freeze({month:'xbb_sub_monthly',year:'xbb_sub_yearly',20:'xbb_pack_20',50:'xbb_pack_50'});
let entitlement={paid:false,until:0,checkedAt:0},generation=0,refreshing=null,started=false;
const listeners=new Set();
export const nativeBillingHost=()=>typeof window!=='undefined'&&typeof window.V161Cloud?.request==='function'?window.V161Cloud:null;
const publish=()=>{for(const fn of listeners)fn();};
export function invalidateBilling(){generation++;refreshing=null;entitlement={paid:false,until:0,checkedAt:0};publish();}
export function serverSubscriptionActive(now=Date.now()){
 return entitlement.paid&&entitlement.until>now&&now-entitlement.checkedAt<120000;
}
export async function refreshBillingEntitlement(host=nativeBillingHost()){
 if(!host)return false;
 if(refreshing)return refreshing;
 const mine=generation;
 const job=(async()=>{
  try{
   const account=await host.request('account');
   if(mine!==generation)return false;
   if(!account.signedIn){entitlement={paid:false,until:0,checkedAt:Date.now()};publish();return false;}
   const raw=await host.request('quota');
   if(mine!==generation)return false;
   const now=Date.now(),serverNow=Number(raw?.now);
   const valid=raw?.quota===true&&Number.isFinite(serverNow)&&Number.isFinite(raw.planUntil);
   // Translate server expiry into this session's clock. No permanent local entitlement.
   entitlement={paid:valid&&raw.plan==='sub'&&raw.planUntil>serverNow,until:valid?now+Math.max(0,raw.planUntil-serverNow):0,checkedAt:now};
   publish();return serverSubscriptionActive();
  }catch{if(mine===generation){entitlement={paid:false,until:0,checkedAt:Date.now()};publish();}return false;}
 })();
 refreshing=job;
 try{return await job;}finally{if(refreshing===job)refreshing=null;}
}
export function startBillingEntitlement(){
 if(started||!nativeBillingHost())return;started=true;
 refreshBillingEntitlement();
 window.addEventListener('xbb-account-changed',event=>{invalidateBilling();if(!event.detail?.changing)refreshBillingEntitlement();});
 window.addEventListener('focus',()=>refreshBillingEntitlement());
 window.addEventListener('pageshow',()=>refreshBillingEntitlement());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshBillingEntitlement();});
 setInterval(()=>{publish();if(!document.hidden)refreshBillingEntitlement();},60000);
}
export function useServerSubscription(R){
 const [paid,setPaid]=R.useState(()=>serverSubscriptionActive());
 R.useEffect(()=>{const update=()=>setPaid(serverSubscriptionActive());listeners.add(update);startBillingEntitlement();update();return()=>listeners.delete(update);},[]);
 return paid;
}
export function billingResultMessage(result){
 if(result?.state==='cancelled')return t('已取消購買，方案與額度沒有變更。');
 if(result?.state==='pending')return t('付款或驗證仍在處理，請勿重複購買。稍後可按「恢復購買／同步權益」確認。');
 if(result?.state==='done')return result.environment==='sandbox'||result.sandbox===true
  ?t('測試交易已驗證，未增加正式訂閱或額度。')
  :tn(result.message)||t('商店交易已驗證，正在更新帳號權益。');
 return tn(result?.message||result?.error)||t('購買未完成。若商店顯示已付款，請先恢復購買／同步權益，避免重複付款。');
}
export async function storeCatalog(host=nativeBillingHost()){
 if(!host)return {available:false,products:[],message:t('請在 iPhone 或 Android App 內購買。')};
 try{
  const raw=await host.request('billingProducts');
  const products=(Array.isArray(raw?.products)?raw.products:[]).filter(p=>Object.values(STORE_PRODUCTS).includes(p?.id)&&typeof p.displayPrice==='string'&&p.displayPrice.trim());
  const publicURL=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};
  const privacyURL=publicURL(raw?.privacyURL),termsURL=publicURL(raw?.termsURL);
  return {available:raw?.available===true&&!!privacyURL&&!!termsURL,products,privacyURL,termsURL,message:tn(raw?.message||raw?.error)||(!products.length?t('商店商品尚未準備好，目前無法購買。'):!privacyURL||!termsURL?t('購買條款尚未準備好，目前無法購買。'):'')};
 }catch{return {available:false,products:[],message:t('暫時無法讀取商店商品，請稍後重試。')};}
}
export async function storeAction(op,productId,host=nativeBillingHost()){
 if(!host)return {state:'failed',message:t('請在手機 App 內操作。')};
 if(!['billingPurchase','billingRestore'].includes(op)||(op==='billingPurchase'&&!Object.values(STORE_PRODUCTS).includes(productId)))return {state:'failed',message:t('找不到這項商品。')};
 const account=await host.request('account');
 if(!account?.signedIn)return {state:'failed',message:t('請先在上方用 Apple 或 Google 登入，讓購買綁定帳號。')};
 const mine=generation;
 try{
  const result=await host.request(op,productId?{productId}:{});
  if(mine!==generation)return {state:'pending',message:t('帳號已變更，請登入購買時的帳號後同步權益。')};
  // A native success is not an entitlement. Refresh from the server even after restore.
  if(result?.state==='done')invalidateBilling();
  await refreshBillingEntitlement(host);
  return result;
 }catch{return {state:'pending',message:t('尚無法確認付款結果，請勿重複購買，稍後恢復購買／同步權益。')};}
}
