import {t, tn} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
import {petAvatarSrc} from './assets/cat-age.js';
export const MAX_PHOTO_LENGTH=360000;
export function validCatPhoto(profile){return profile?.photo===undefined||profile.photo===''||(typeof profile.photo==='string'&&profile.photo.length<=MAX_PHOTO_LENGTH&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(profile.photo));}
export const catPhoto=profile=>validCatPhoto(profile)&&profile?.photo?profile.photo:petAvatarSrc(profile);
export function cropRect(width,height,zoom=1,x=.5,y=.5){const edge=Math.min(width,height)/Math.max(1,Math.min(3,Number(zoom)||1));return {x:(width-edge)*Math.max(0,Math.min(1,x)),y:(height-edge)*Math.max(0,Math.min(1,y)),size:edge};}
export async function loadPhoto(source){
 const img=new Image();img.decoding='async';
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error(t('無法讀取這張照片，請改選 JPG、PNG 或 WebP。')));img.src=source;});
 if(!img.naturalWidth||!img.naturalHeight)throw Error(t('照片內容無法讀取。'));return img;
}

function paintCrop(canvas,image,{zoom=1,x=.5,y=.5}={}){
 const crop=cropRect(image.naturalWidth,image.naturalHeight,zoom,x,y);
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error(t('暫時無法處理照片。'));
 ctx.fillStyle='#faf5ed';
 ctx.fillRect(0,0,512,512);
 ctx.drawImage(image,crop.x,crop.y,crop.size,crop.size,0,0,512,512);
}
function cropJPEG(canvas){
 let result=canvas.toDataURL('image/jpeg',.82);
 if(result.length>MAX_PHOTO_LENGTH)result=canvas.toDataURL('image/jpeg',.65);
 if(!validCatPhoto({photo:result}))throw Error(t('照片太大，請換一張較簡單的照片。'));
 return result;
}
export async function resizePhoto(source,position){
 const image=await loadPhoto(source),canvas=document.createElement('canvas');
 canvas.width=512;canvas.height=512;
 paintCrop(canvas,image,position);
 return cropJPEG(canvas);
}

const initialPosition={zoom:1,x:.5,y:.5};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function pointerGeometry(points){
 const [a,b=a]=points.values();
 return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
}

export function PhotoEditor({react:R,profile,onChange,onPendingChange}){
 const h=R.createElement,[image,setImage]=R.useState(null),[position,setPosition]=R.useState(initialPosition),
  [busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
 const file=R.useRef(null),preview=R.useRef(null),mounted=R.useRef(true),serial=R.useRef(0),
  latest=R.useRef(profile),busyRef=R.useRef(false),current=R.useRef(initialPosition),
  points=R.useRef(new Map()),gesture=R.useRef(null);
 latest.current=profile;
 const update=next=>{current.current=next;setPosition(next);};
 R.useEffect(()=>{onPendingChange?.(!!image||busy);return()=>onPendingChange?.(false);},[image,busy,onPendingChange]);
 R.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;serial.current++;};},[]);
 R.useLayoutEffect(()=>{
  if(!image||!preview.current)return;
  try{paintCrop(preview.current,image,position);}catch(e){setError(e.message);}
 },[image,position]);

 async function openSource(source,ticket){
  const loaded=await loadPhoto(source);
  if(mounted.current&&ticket===serial.current){update(initialPosition);setImage(loaded);}
 }
 async function pick(){
  if(busyRef.current)return;
  if(!window.inpawPickPhoto){file.current?.click();return;}
  busyRef.current=true;setBusy(true);setError('');
  const ticket=++serial.current;
  try{
   const result=await window.inpawPickPhoto();
   if(result?.dataUrl)await openSource(result.dataUrl,ticket);
  }catch(e){if(mounted.current)setError(tn(e.message)||t('未能選取照片，請再試一次。'));}
  finally{busyRef.current=false;if(mounted.current)setBusy(false);}
 }
 async function readFile(e){
  const selected=e.target.files?.[0];
  e.target.value='';
  if(!selected)return;
  setError('');
  if(selected.size>20*1024*1024){setError(t('照片請小於 20 MB。'));return;}
  if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(selected.type)){setError(t('請選擇 JPG、PNG、WebP 或 iPhone 照片。'));return;}
  setBusy(true);
  const ticket=++serial.current,url=URL.createObjectURL(selected);
  try{
   const img=await loadPhoto(url),canvas=document.createElement('canvas');
   const ratio=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.round(img.naturalWidth*ratio);
   canvas.height=Math.round(img.naturalHeight*ratio);
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error(t('暫時無法處理照片。'));
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   await openSource(canvas.toDataURL('image/jpeg',.88),ticket);
  }catch(e){if(mounted.current)setError(e.message);}
  finally{URL.revokeObjectURL(url);if(mounted.current)setBusy(false);}
 }

 const cancel=()=>{serial.current++;points.current.clear();gesture.current=null;setImage(null);setError('');};
 const apply=()=>{
  try{
   paintCrop(preview.current,image,current.current);
   onChange({...latest.current,photo:cropJPEG(preview.current)});
   cancel();
  }catch(e){setError(e.message);}
 };
 const rebase=target=>{
  if(!points.current.size){gesture.current=null;return;}
  const {zoom,x,y}=current.current;
  gesture.current={from:pointerGeometry(points.current),box:target.getBoundingClientRect(),zoom,
   crop:cropRect(image.naturalWidth,image.naturalHeight,zoom,x,y)};
 };
 const pointerDown=e=>{
  if(e.button!==0||points.current.size===2)return;
  e.currentTarget.setPointerCapture(e.pointerId);
  points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  rebase(e.currentTarget);
 };
 const pointerMove=e=>{
  if(!points.current.has(e.pointerId)||!gesture.current)return;
  points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const {from,box,crop,zoom:initialZoom}=gesture.current,to=pointerGeometry(points.current);
  const zoom=from.distance?clamp(initialZoom*to.distance/from.distance,1,3):initialZoom;
  const width=image.naturalWidth,height=image.naturalHeight,edge=Math.min(width,height)/zoom;
  // Keep the source point under the gesture midpoint anchored as the crop zooms and moves.
  const left=crop.x+((from.x-box.left)*crop.size-(to.x-box.left)*edge)/box.width;
  const top=crop.y+((from.y-box.top)*crop.size-(to.y-box.top)*edge)/box.height;
  update({zoom,x:width>edge?clamp(left/(width-edge),0,1):.5,y:height>edge?clamp(top/(height-edge),0,1):.5});
 };
 const pointerEnd=e=>{if(points.current.delete(e.pointerId))rebase(e.currentTarget);};
 const slider=(label,key,min,max,step)=>h('label',null,label,
  h('input',{type:'range',min,max,step,value:position[key],onChange:e=>update({...current.current,[key]:Number(e.target.value)})}));

 return h('section',{className:'native-photo-editor','aria-label':t('毛孩照片')},
  h('div',{className:'native-photo-row'},
   h('img',{className:'native-cat-photo',src:catPhoto(profile),alt:profile.photo?t('{name}的照片',{name:profile.name||t('毛孩')}):t('預設毛孩插畫')}),
   h('div',null,h('h2',null,t('毛孩照片')),
    h('button',{type:'button',className:'secondary-btn',onClick:pick,disabled:busy||!!image},busy?t('正在讀取…'):profile.photo?t('更換照片'):t('選擇照片')),
    profile.photo&&!image&&h('button',{type:'button',className:'text-btn',onClick:()=>onChange({...latest.current,photo:''}),disabled:busy},t('改用預設頭像')))),
  h('input',{ref:file,type:'file',accept:'image/jpeg,image/png,image/webp,image/heic,image/heif',hidden:true,'aria-label':t('上傳毛孩照片'),onChange:readFile}),
  image&&h('div',{className:'native-photo-crop'},
   h('h3',null,t('調整頭像範圍')),
   h('canvas',{ref:preview,width:512,height:512,role:'img','aria-label':t('頭像裁切預覽'),className:'native-crop-preview','data-scroll-drag':'ignore',
    onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:pointerEnd,onPointerCancel:pointerEnd,onLostPointerCapture:pointerEnd}),
   h('p',{className:'native-crop-gesture-note'},t('單指拖曳 · 雙指縮放')),
   slider(t('縮放'),'zoom',1,3,.05),slider(t('左右位置'),'x',0,1,.01),slider(t('上下位置'),'y',0,1,.01),
   h('div',{className:'native-photo-actions'},
    h('button',{type:'button',className:'secondary-btn',onClick:cancel},t('取消選取')),
    h('button',{type:'button',className:'primary',onClick:apply},t('使用這張照片')))),
  h('p',{className:'native-photo-note'},t('照片只保存在這台裝置；按下「儲存毛孩資料」後生效。')),
  error&&h('p',{role:'alert',className:'error'},error));
}
