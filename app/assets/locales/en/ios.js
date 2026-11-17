// 英文字典：ios（2026-11-14 英文收尾，由負責該項的同事維護；key 是繁中原句）。
// iOS 原生（Account／StoreBilling／OfflineGemma）回傳給網頁、native.js 還沒收錄的原句；網頁用 tn() 查。
// 以「：」結尾的是前半句，tn() 會把後面的細節（錯誤碼）原樣接上。
export default {
  // Account.swift：登入錯誤＝提示＋（階段：錯誤碼）
  '這種登入方式尚未在線上啟用，請將錯誤碼提供給開發同事。（帳號連結：': "This sign-in method isn't enabled on the server yet. Please send the error code to the developers. (Account linking: ",
  '這種登入方式尚未在線上啟用，請將錯誤碼提供給開發同事。（Firebase 登入：': "This sign-in method isn't enabled on the server yet. Please send the error code to the developers. (Firebase sign-in: ",
  '無法連上登入服務，請確認網路後再試。（帳號連結：': "Couldn't reach the sign-in service. Check your connection and try again. (Account linking: ",
  '無法連上登入服務，請確認網路後再試。（Firebase 登入：': "Couldn't reach the sign-in service. Check your connection and try again. (Firebase sign-in: ",
  '登入憑證未通過驗證，請將錯誤碼提供給開發同事檢查登入設定。（帳號連結：': "Sign-in credentials didn't pass verification. Please send the error code to the developers. (Account linking: ",
  '登入憑證未通過驗證，請將錯誤碼提供給開發同事檢查登入設定。（Firebase 登入：': "Sign-in credentials didn't pass verification. Please send the error code to the developers. (Firebase sign-in: ",
  '登入沒有完成，請將錯誤碼提供給開發同事。（帳號連結：': "Sign-in didn't finish. Please send the error code to the developers. (Account linking: ",
  '登入沒有完成，請將錯誤碼提供給開發同事。（Firebase 登入：': "Sign-in didn't finish. Please send the error code to the developers. (Firebase sign-in: ",
  'Apple 系統授權沒有完成，請將錯誤碼提供給開發同事。（Apple 授權：': "Apple authorization didn't finish. Please send the error code to the developers. (Apple authorization: ",
  // StoreBilling.swift
  '正在處理上一筆購買，請稍候。': 'The previous purchase is still being processed. Please wait.',
  '商店交易尚未通過驗證，請稍後使用恢復購買。': "The store transaction hasn't been verified yet. Please use Restore purchases later.",
  '已取消購買。': 'Purchase canceled.',
  '商店仍在確認付款；完成後會自動更新，請勿重複購買。': "The store is still confirming your payment. It will update automatically when done. Please don't buy again.",
  '購買狀態尚待商店確認，請稍後使用恢復購買。': 'The purchase is waiting for store confirmation. Please use Restore purchases later.',
  '目前無法確認購買結果，請稍後使用恢復購買，避免重複付款。': "The purchase result can't be confirmed right now. Please use Restore purchases later to avoid paying twice.",
  '無法完成商店同步，請稍後再試。': "Couldn't sync with the store. Please try again later.",
  '部分購買仍待伺服器確認，完成後再查詢方案與額度。': 'Some purchases are still waiting for server confirmation. Check your plan and credits once they finish.',
  '已完成商店同步，請查詢方案與額度；已購額度包以帳號餘額為準。': 'Store sync finished. Check your plan and credits; purchased credit packs follow your account balance.',
  '付款結果正在由伺服器確認，請勿重複購買；稍後可查詢額度或恢復購買。': "The server is confirming your payment. Please don't buy again; you can check your credits or restore purchases later.",
  '購買已確認，方案與額度已更新。': 'Purchase confirmed. Your plan and credits have been updated.',
  // OfflineGemma.swift
  'Gemma 請在支援的 iPhone 或 iPad 實機上測試。': 'Please test Gemma on a supported iPhone or iPad (not the simulator).',
};
