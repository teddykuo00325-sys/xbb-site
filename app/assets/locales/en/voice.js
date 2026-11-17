// 英文字典：voice（2026-11-14 英文收尾，由負責該項的同事維護；key 是繁中原句）。
// 英文語音輸入（F2）：英文介面可錄音、英文辨識；不套中文本機分卡、不提供手機模式。
export default {
  '系統離線語音依裝置與語言提供；也可改用內建語音或直接打字。': 'System on-device speech depends on the device and language. You can use the built-in recognizer or type instead.',

  '目前使用手機系統的離線語音，也可改用內建語音；內建語音需先下載模型。': 'System on-device speech is selected. You can switch to the built-in recognizer, which needs its model downloaded first.',
  '改用手機系統語音': 'Use system speech',

  '使用 Apple 原生語音辨識，在這支手機上轉成文字。': 'Apple speech recognition turns your voice into text on this iPhone.',
  '使用手機系統的語音辨識，在這支手機上轉成文字。': 'System speech recognition turns your voice into text on this phone.',
  '請允許麥克風與系統語音辨識所需的權限。': 'Allow the permissions needed for microphone and system speech recognition.',
  '錄音中 {min}:{sec} · 最長 {limit} 分鐘': 'Recording {min}:{sec} · Up to {limit} min',
  '手機系統語音轉寫': 'System speech transcription',

  // 文字快記畫面（voice-quick-ui.js）
  '已加入轉寫的英文原句，請核對文字。': 'Your words were added as text. Please check them.',
  '手機模式與本機自動分卡目前只支援中文。英文可以用進階模式（AI 整理），或在下方直接存成一則紀錄、按句子拆開自己選類別。': 'On-device mode and automatic card sorting on this phone support Chinese only. For English, use Advanced mode (AI sorting), or below, save it as one note or split it by sentence and choose the types yourself.',
  '按句子拆開，自己選類別': 'Split by sentence and choose types',
  '英文不支援本機自動分卡：已按句子拆開，請為每張卡選毛孩與類別。': "Automatic sorting isn't available in English on this phone. The text was split by sentence; choose the pet and type for each card.",
  '這個版本沒有語音輸入，請直接打字。': "Voice input isn't available in this version. Please type instead.",
  '可以這樣說（只是參考，不會載入或自動分類）：': "Things you could say (examples only; nothing is loaded or sorted):",
  // 改過內容時存進紀錄的原文前綴（顯示用；存檔值見 voice-quick-model.js RETAINED_SOURCE_PREFIXES）
  '輸入原文：': 'Original input: ',
  // 系統語音包（native-voice-capture.js，英文介面時是英文語音包）
  '下載英文語音包': 'Download English voice pack',
  '要先下載英文（美國）離線語音包。由手機系統下載，大小由系統決定（App 查不到），下載後辨識不用網路。{networkNote}': "First download the English (US) offline voice pack. Your phone's system downloads it; the size is set by the system (the app can't see it). After that, recognition works offline. {networkNote}",
  '再下載一次英文語音包（由手機系統下載，大小由系統決定）。{networkNote}': "Download the English voice pack again (downloaded by your phone's system; size set by the system). {networkNote}",
  '系統正在下載英文語音包，完成後就能開始錄音…': "The system is downloading the English voice pack. You can record when it's done…",
  '系統正在下載英文語音包 · {percent}%': 'System downloading English voice pack · {percent}%',
  // 原生回傳（SystemSpeech.java）；英文介面時指的是英文語音包，所以譯成不指定語言
  '這支手機的離線系統語音不支援中文（台灣）。': "This phone's offline system speech doesn't support this language.",
  '選擇保存方式': 'Choose how to save',
  '錄音只會轉成文字。你可以直接保存、自己選類別，或交給 AI 整理。': 'Recording only turns speech into text. Save a note, choose categories, or organize it with AI.',
  '存成文字筆記': 'Save as note',
  '自己選類別': 'Choose categories',
  '不用 AI，也不用額度。': 'No AI or credits needed.',
  '用 AI 整理': 'Organize with AI',
  '英文可用進階模式整理；也可直接保存或自己選類別。': 'For English, use Advanced mode, save a note, or choose categories.',
};
