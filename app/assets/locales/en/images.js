// 英文字典：images（2026-11-14 英文收尾，由負責該項的同事維護；key 是繁中原句）。
// 拍照類 AI（食品包裝、藥袋、看懂報告）：worker 回的列舉值與固定說明在畫面上用 t(值) 顯示；照片原文不翻。
export default {
  // 食品原料分類（worker／analysis.py 的 category 列舉值，存資料仍是中文）
  '肉類': 'Meat',
  '內臟': 'Organ meat',
  '魚類海鮮': 'Fish & seafood',
  '蛋奶': 'Egg & dairy',
  '穀物': 'Grains',
  '豆類': 'Legumes',
  '蔬果': 'Fruits & vegetables',
  '油脂': 'Fats & oils',
  '維生素礦物': 'Vitamins & minerals',
  '添加物': 'Additives',
  // 舊版 worker（或繁中工作）回的成分解讀固定說明；新版 worker 英文工作直接回英文
  '以包裝標示的保證值估算，不是實測，也不代表成品一定達到。': 'Estimated from the guaranteed values printed on the package. This is not a lab measurement, and the product may not actually meet them.',
  '水分只標示最低值，無法換算乾物質。': "Moisture is only given as a minimum, so dry matter can't be calculated.",
  '標示沒有水分，無法換算乾物質。': "The label doesn't list moisture, so dry matter can't be calculated.",
  '鈣磷比需要兩項都是標示值才能計算。': 'The calcium-to-phosphorus ratio can only be calculated when both are stated as exact values (not minimums or maximums).',
  // 藥袋：注意事項併進劑量欄（藥袋原文不翻，只換括號格式）
  '{dose}（{note}）': '{dose} ({note})',
  // 看懂報告：名字不符提示的句尾
  '」。': '".',
};
