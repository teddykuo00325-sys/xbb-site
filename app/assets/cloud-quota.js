import {t} from './i18n.js?v=audit1117b';
// 進階模式額度（Ian 2026-11-13）：免費每月 5 次、訂閱每月 100 次；額度包不會過期。每次進階模式送出用 1 次，失敗退回。
// 原生 V161Cloud.request('quota') 只回傳 quotas/{uid} 的原始欄位，剩幾次在這裡算（Android／iOS 同一份），
// 規則和 cloud/mjadm-worker/worker.py 的 quota_view 一致：台灣時間的月份、訂閱要 planUntil 未到期。
// 同意畫面讀取預估餘額；每次工作結束再向伺服器確認實際餘額，不在前端猜扣款。
export const MONTHLY_LIMIT = Object.freeze({free: 5, sub: 100});
// 價格（Ian 2026-11-13 定案）：月訂 NT$99、年訂 NT$990（等於 10 個月）；額度包不會過期。全 App 只認這一份。
export const PLAN_PRICES = Object.freeze({monthly: 99, yearly: 990});
// 免費與訂閱用戶都能購買；購買時登入綁定帳號，取消訂閱或換月不清除已購額度。
export const QUOTA_PACKS = Object.freeze([Object.freeze({count: 20, price: 49}), Object.freeze({count: 50, price: 90})]);
export const QUOTA_EMPTY_TEXT = t('這個月的進階模式額度用完了（下個月 1 日重置）。訂閱與額度包的購買狀態請見「方案與額度」；手動記錄、預覽、核對和直接儲存照常可用。');

export function quotaPeriod(nowMs) {
  return new Date(nowMs + 8 * 3600 * 1000).toISOString().slice(0, 7);   // 台灣時間 YYYY-MM
}

const count = value => Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

export function quotaView(raw, nowMs = raw?.now) {
  if (!raw || raw.quota !== true || !Number.isFinite(nowMs)) return null;
  const plan = raw.plan === 'sub' && Number.isFinite(raw.planUntil) && raw.planUntil > nowMs ? 'sub' : 'free';
  const limit = MONTHLY_LIMIT[plan];
  const used = raw.period === quotaPeriod(nowMs) ? count(raw.used) : 0;
  const pack = count(raw.pack);
  const month = Math.max(limit - used, 0);
  return {plan, limit, used, pack, month, remaining: month + pack};
}

// 確認頁顯示扣除後的預估總額（當月額度＋不過期的額度包）。
export function quotaLine(view) {
  if (!view) return t('本次使用 1 次額度；使用後餘額暫時無法確認。');
  if (view.remaining <= 0) return QUOTA_EMPTY_TEXT;
  return t('本次使用 1 次額度，使用後預計剩 {count} 次。',{count:Math.max(0,view.remaining-1)});
}

export async function loadQuota(cloud = typeof window !== 'undefined' ? window.V161Cloud : null, {timeoutMs=10000}={}) {
  if (!cloud || typeof cloud.request !== 'function') return null;
  let timer;
  try {
    return quotaView(await Promise.race([
      cloud.request('quota'),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(null),timeoutMs);})
    ]));
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export function quotaResultLine(view,{outcome='failure',billing}={}) {
  const known=['charged','refunded','not-charged'].includes(billing)?billing:null;
  const status=outcome==='not-sent'?'not-charged':known||(outcome==='success'?'charged':'unknown');
  const charge=status==='charged'?t('本次已使用 1 次額度。')
    :status==='refunded'?t('本次額度已退回，未扣額度。')
    :status==='not-charged'?t('本次未扣額度。')
    :outcome==='pending'?t('進階模式可能仍在處理，扣額度狀態待確認。')
    :t('本次扣額度狀態待確認，尚無法確認是否已扣除或退回。');
  const balance=view?(view.pack?t('實際剩 {count} 次（本月 {month} 次＋額度包 {pack} 次）。',{count:view.remaining,month:view.month,pack:view.pack}):t('實際剩 {count} 次（本月 {month} 次）。',{count:view.remaining,month:view.month}))
    :t('實際餘額暫時無法查詢，請稍後到「方案與額度」重新查詢。');
  return charge+balance;
}

// 不用前後總額差判斷單一工作是否退款，避免換月、其他裝置或切換帳號造成誤報。
export async function settleQuota(cloud,options={}) {
  const view=await loadQuota(cloud);
  return {view,line:quotaResultLine(view,options)};
}

// 確認頁讀預估，工作完成／失敗再讀實際；結果文字與送出前的預估分開保存。
export function useCloudQuota(R, open, cloud) {
  const [view, setView] = R.useState(null);
  const [resultLine,setResultLine]=R.useState('');
  const generation=R.useRef(0),alive=R.useRef(true);
  R.useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
  R.useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setView(null);
    loadQuota(cloud).then(next => { if (live) setView(next); });
    return () => { live = false; };
  }, [open,cloud]);
  const clearResult=()=>{generation.current++;setResultLine('');};
  const settle=async(options={})=>{
    const mine=++generation.current;
    setResultLine(t('正在確認本次額度與實際餘額…'));
    const result=await settleQuota(cloud,options);
    if(alive.current&&mine===generation.current){setView(result.view);setResultLine(result.line);}
    return result;
  };
  return {view, line: quotaLine(view), empty: !!view && view.remaining <= 0,resultLine,settle,clearResult};
}
