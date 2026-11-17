// 開發／模擬用的控制項（Ian 2026-11-14 測試回報：正式介面露出「開發預覽」「模擬測試」「原型說明」）。
// 一般使用者看不到；開發時在網址加 ?dev=1，或在 localStorage 設 inpaw.devTools=1 才顯示。
export function devToolsEnabled() {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('dev') === '1') return true;
    return typeof localStorage !== 'undefined' && localStorage.getItem('inpaw.devTools') === '1';
  } catch { return false; }
}

// Set only by the independent, offline iOS test build. No server quotas change.
export const localProPreviewEnabled=()=>typeof window!=='undefined'&&window.XBBLocalProPreview===true;
