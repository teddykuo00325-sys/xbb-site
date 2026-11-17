// 進階模式整理回來的看診重點改成條列。只整理排版：不增刪內容、不改數字，標題行（以冒號結尾或 # 開頭）不加符號。
const MARK = /^\s*(?:[-*•・●○▪·]|\d{1,2}[.)、]|[（(]\d{1,2}[)）])\s*/;
// 線上 worker 固定輸出的三個段落標題（可能有「」或冒號，也可能什麼都沒有）。
const KNOWN_HEADING = /^[「『]?(?:看診重點|近期變化|可以詢問獸醫的問題)[」』]?[：:]?$/;
const SENTENCE =/[^。！？!?；;]+[。！？!?；;]?/g;

export function bulletizeSummary(input) {
  const out = [];
  for (const raw of String(input || '').replace(/\r/g, '').split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const line = trimmed.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
    if (!line) continue;
    if (/^#/.test(trimmed) || /[：:]$/.test(line) || /^【[^】]*】$/.test(line) || KNOWN_HEADING.test(line)) {
      out.push(line);
      continue;
    }
    const body = line.replace(MARK, '').trim();
    const parts = (body.match(SENTENCE) || [body]).map(part => part.trim()).filter(Boolean);
    for (const part of parts) out.push('• ' + part);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}
