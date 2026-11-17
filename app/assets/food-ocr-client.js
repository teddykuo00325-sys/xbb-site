// Public HTTPS endpoint of the dedicated, authenticated pet app OCR gateway.
// Leave blank until that gateway is available. Never bundle a provider key.
export const FOOD_OCR_ENDPOINT = '';

export async function requestFoodOCR(photo, {
 endpoint = FOOD_OCR_ENDPOINT, signal, fetcher = globalThis.fetch
} = {}) {
 if (!endpoint) throw Error('進階模式辨識尚未開放，可先手動填寫。');
 const url = new URL(endpoint);
 if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
  throw Error('進階模式辨識暫時無法使用，可先手動填寫。');
 }
 const body = new FormData();
 const extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[photo.type];
 body.append('photo', photo, 'package.' + extension);
 const response = await fetcher(url.href, {
  method:'POST', body, signal, credentials:'include', redirect:'error', cache:'no-store'
 });
 if (!response.ok) {
  if (response.status === 401 || response.status === 403) throw Error('進階模式辨識目前無法授權，可先手動填寫。');
  if (response.status === 422) throw Error('這張照片讀不清楚，請拍清楚包裝標示再試一次。');
  if (response.status === 429) throw Error('進階模式辨識目前忙碌，請稍後再試或手動填寫。');
  throw Error('進階模式辨識暫時無法使用，請重試或手動填寫。');
 }
 return response.json();
}
