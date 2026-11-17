import {t} from './i18n.js?v=audit1117b';

// Separate from clinical entries: diary photos and stories never become vet evidence.
export const MAX_DIARY_PHOTO_BYTES=200*1024;
export const MAX_DIARY_PHOTO_LENGTH=Math.ceil(MAX_DIARY_PHOTO_BYTES/3)*4+23;
export const DIARY_PHOTO_EDGE=1280;
export const DIARY_CAPTION_LIMIT=280;
export const DIARY_STORY_LIMIT=80;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const key=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const stamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const fail=(code,message)=>{throw Object.assign(Error(t(message)),{diaryFailure:true,code});};
export function diaryLocalMinute(now=new Date()){
 const n=new Date(now);if(!Number.isFinite(n.getTime()))throw Error('Invalid diary clock');
 const pad=v=>String(v).padStart(2,'0');
 return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
}
export function diaryPhotoDimensions(photo){
 if(typeof photo!=='string'||photo.length>MAX_DIARY_PHOTO_LENGTH||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))return null;
 const encoded=photo.slice(23);if(encoded.length%4)return null;
 let bytes;try{bytes=atob(encoded);}catch{return null;}
 if(bytes.length>MAX_DIARY_PHOTO_BYTES||!bytes.startsWith('\xff\xd8\xff')||!bytes.endsWith('\xff\xd9'))return null;
 const u=i=>bytes.charCodeAt(i);let i=2;
 while(i+4<bytes.length){
  if(u(i++)!==255)return null;while(u(i)===255)i++;
  const marker=u(i++);if(marker===217||marker===218)break;
  if(marker===1||marker>=208&&marker<=215)continue;
  const length=u(i)*256+u(i+1);if(length<2||i+length>bytes.length)return null;
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
   if(length<8)return null;const height=u(i+3)*256+u(i+4),width=u(i+5)*256+u(i+6);
   return width>0&&height>0&&width<=DIARY_PHOTO_EDGE&&height<=DIARY_PHOTO_EDGE?{width,height,bytes:bytes.length}:null;
  }
  i+=length;
 }
 return null;
}
export const validDiaryPhoto=photo=>diaryPhotoDimensions(photo)!==null;
const fields=new Set(['id','catId','date','time','caption','photo','first','story','createdAt','editedAt']);
// Deliberately no current-date check here: imported history keeps its original dates.
export function validateDiaryEntry(entry){
 return object(entry)&&Object.keys(entry).every(k=>fields.has(k))&&key(entry.id)&&key(entry.catId)&&day(entry.date)&&time(entry.time)&&
  typeof entry.caption==='string'&&entry.caption.trim().length>0&&entry.caption.length<=DIARY_CAPTION_LIMIT&&
  typeof entry.story==='string'&&entry.story.length<=DIARY_STORY_LIMIT&&typeof entry.first==='boolean'&&
  validDiaryPhoto(entry.photo)&&stamp(entry.createdAt)&&stamp(entry.editedAt);
}
export function normalizeDiaryEntry(input,{catId,now=new Date(),id,previous=null}={}){
 if(!object(input)||!key(catId)||previous&&(!validateDiaryEntry(previous)||previous.catId!==catId))fail('scope','找不到這隻毛孩的日記，原資料未更動。');
 const caption=typeof input.caption==='string'?input.caption.trim():'',story=typeof input.story==='string'?input.story.trim():'';
 if(!caption||caption.length>DIARY_CAPTION_LIMIT)fail('caption','請留下一句 280 字以內的日記。');
 if(story.length>DIARY_STORY_LIMIT)fail('story','小故事名稱請在 80 字以內。');
 if(!day(input.date)||!time(input.time))fail('date','請填寫有效的日記日期與時間。');
 if(input.date+'T'+input.time>diaryLocalMinute(now))fail('future','日記時間不能在未來。');
 if(!validDiaryPhoto(input.photo))fail('photo','照片無法保存，請重新選取照片。');
 const at=new Date(now).toISOString(),result={id:previous?.id||id||'diary_'+globalThis.crypto.randomUUID().replaceAll('-',''),catId,date:input.date,time:input.time,caption,photo:input.photo,first:input.first===true,story,createdAt:previous?.createdAt||at,editedAt:at};
 if(!validateDiaryEntry(result))fail('invalid','日記資料無效，尚未儲存。');
 return result;
}
export function diaryEntriesForCat(data,catId){
 return (Array.isArray(data?.lifeDiary)?data.lifeDiary:[]).filter(row=>row.catId===catId&&validateDiaryEntry(row)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
}
const petRows=data=>data.multiCat?.cats||[{id:'cat-original'}];
export function validateDiaryCollection(data){
 if(data.lifeDiary===undefined)return true;
 if(!Array.isArray(data.lifeDiary)||data.lifeDiary.length>50000)return false;
 const ids=new Set(),pets=new Set(petRows(data).map(row=>row.id));
 return data.lifeDiary.every(row=>{if(!validateDiaryEntry(row)||ids.has(row.id)||!pets.has(row.catId))return false;ids.add(row.id);return true;});
}
function requireDiaryPet(data,catId){
 const pet=petRows(data).find(row=>row.id===catId);
 if(!pet||pet.archivedAt)fail('scope','找不到這隻毛孩的日記，原資料未更動。');
}
export function upsertDiaryEntry(data,entry,{catId=entry?.catId,previous=null}={}){
 if(!validateDiaryEntry(entry)||entry.catId!==catId)fail('scope','找不到這隻毛孩的日記，原資料未更動。');
 requireDiaryPet(data,catId);
 const rows=data.lifeDiary??[];if(!validateDiaryCollection(data))fail('invalid','日記資料無效，尚未儲存。');
 const old=rows.find(row=>row.id===entry.id);
 if(old&&(!previous||JSON.stringify(old)!==JSON.stringify(previous))||!old&&previous)fail('conflict','這筆日記已變更或刪除，請關閉後重新查看。');
 if(old&&old.catId!==catId)fail('scope','找不到這隻毛孩的日記，原資料未更動。');
 return {...data,lifeDiary:old?rows.map(row=>row.id===entry.id?entry:row):[entry,...rows]};
}
export function removeDiaryEntry(data,id,{catId,previous}={}){
 requireDiaryPet(data,catId);if(!validateDiaryCollection(data))fail('invalid','日記資料無效，尚未儲存。');
 const rows=data.lifeDiary??[],old=rows.find(row=>row.id===id);
 if(!old||old.catId!==catId||!previous||JSON.stringify(old)!==JSON.stringify(previous))fail('conflict','這筆日記已變更或刪除，請關閉後重新查看。');
 return {...data,lifeDiary:rows.filter(row=>row.id!==id)};
}
export async function compressDiaryPhoto(source){
 let url=source,owned=false;
 if(typeof Blob!=='undefined'&&source instanceof Blob){
  if(source.size>20*1024*1024)fail('size','照片請小於 20 MB。');
  url=URL.createObjectURL(source);owned=true;
 }
 if(typeof url!=='string'||!/^data:image\//.test(url)&&!url.startsWith('blob:'))fail('photo','請選擇裝置上的照片。');
 try{
  const image=new Image();image.decoding='async';
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Object.assign(Error(t('無法讀取這張照片，請改選 JPG、PNG 或 WebP。')),{diaryFailure:true,code:'read'}));image.src=url;});
  const width=image.naturalWidth,height=image.naturalHeight;if(!width||!height)fail('photo','照片內容無法讀取。');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)fail('canvas','暫時無法處理照片。');
  for(const edge of [1280,1024,800,640]){
   const scale=Math.min(1,edge/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   ctx.fillStyle='#fff9ef';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.7,.56]){const result=canvas.toDataURL('image/jpeg',quality);if(validDiaryPhoto(result))return result;}
  }
  fail('size','照片壓縮後仍太大，請換一張照片。');
 }finally{if(owned)URL.revokeObjectURL(url);}
}
