import {t} from './i18n.js?v=audit1117b';
import {drawDiaryFrame} from './diary-share-frame-art.js?v=1';
import {readDiaryShareDraft,saveDiaryShareDraft} from './life-diary-draft.js?v=1';

export const DIARY_SHARE_FRAMES=Object.freeze(['catcloud','pawparty','sweetcat']);
const LEGACY_DIARY_FRAMES=['notebook','tape','postcard'];
export const DIARY_SHARE_CAPTION_LIMIT=280;
const logoURL=new URL('./brand/logo.svg',import.meta.url).href;
const count=value=>Array.from(String(value||'')).length;

export function diaryShareLayout({caption='',frame='catcloud',ratio='feed',showText=true}={}){
 if(![...DIARY_SHARE_FRAMES,...LEGACY_DIARY_FRAMES].includes(frame)||!['feed','story'].includes(ratio))throw Error(t('請重新選擇分享外框與比例。'));
 if(showText&&count(caption)>DIARY_SHARE_CAPTION_LIMIT)throw Error(t('分享文字最多 280 字，請先縮短；原始日記不會改動。'));
 return {width:1080,height:ratio==='story'?1920:1350,padding:72,frame};
}
function loadImage(source){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth?resolve(image):reject(Error(t('無法讀取分享照片。')));image.onerror=()=>reject(Error(t('無法讀取分享照片。')));image.src=source;});}
export function wrapDiaryText(ctx,text,width){
 const lines=[],wordSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'word'}):null;
 const graphemes=value=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].map(s=>s.segment):Array.from(value).reduce((out,c)=>{
  const last=out.at(-1),extension=/[\p{Mark}\uFE0E\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u.test(c),flagPair=/^\p{Regional_Indicator}$/u.test(c)&&/^\p{Regional_Indicator}$/u.test(last||'');
  if(last&&(extension||last.endsWith('\u200D')||flagPair))out[out.length-1]+=c;else out.push(c);return out;
 },[]);
 for(const paragraph of String(text).split('\n')){
  let line='';
  const latinWord=/^[\p{Script=Latin}\p{N}\p{M}'’\-]+$/u;
  const tokens=wordSegmenter?[...wordSegmenter.segment(paragraph)].map(s=>s.segment):graphemes(paragraph).reduce((out,part)=>{if(out.length&&latinWord.test(part)&&latinWord.test(out.at(-1)))out[out.length-1]+=part;else out.push(part);return out;},[]);
  const flush=()=>{lines.push(line.trimEnd());line='';};
  for(const token of tokens){
   if(/^\s+$/u.test(token)){if(line)line+=token;continue;}
   if(line&&ctx.measureText(line+token).width>width)flush();
   if(ctx.measureText(token).width<=width){line+=token;continue;}
   // Only a single unbreakable token wider than the image may split; never split an emoji cluster.
   for(const char of graphemes(token)){if(line&&ctx.measureText(line+char).width>width)flush();line+=char;}
  }
  lines.push(line.trimEnd());
 }
 return lines;
}
function contain(ctx,image,x,y,width,height){const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,x+(width-w)/2,y+(height-h)/2,w,h);}
function line(ctx,x1,y1,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}

// The PNG preview and exported image are the same pixels; no screenshot of the page is needed.
export async function renderDiaryShare({photo,caption='',petName='',date='',frame='catcloud',ratio='feed',showName=true,showDate=true,showText=true}={}){
 const layout=diaryShareLayout({caption,frame,ratio,showText});
 if(typeof photo!=='string'||photo.length>4000000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo))throw Error(t('分享需要一張已儲存的本機照片。'));
 const [image,logo]=await Promise.all([loadImage(photo),loadImage(logoURL)]);
 const canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error(t('暫時無法製作分享卡，請再試一次。'));
 const {width:W,height:H,padding:P}=layout,ink='#293B70',paper='#FFF9EF',orange='#F4975A',rule='#E8DCCC';
 const fresh=DIARY_SHARE_FRAMES.includes(frame),text=showText?String(caption):'';
 ctx.font='400 38px system-ui, "Microsoft JhengHei", sans-serif';
 const lines=text?wrapDiaryText(ctx,text,W-P*2):[],lineHeight=53,captionHeight=lines.length?lines.length*lineHeight+30:0;
 const photoX=P,photoY=fresh?170:150,photoW=W-P*2,photoH=H-photoY-145-captionHeight;
 if(photoH<260)throw Error(SHARE_TOO_LONG());
 ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);
 if(fresh){
  drawDiaryFrame(ctx,{frame,width:W,height:H,padding:P,photoX,photoY,photoW,photoH});
 }else if(frame==='notebook'){
  ctx.fillStyle='#F9E3CD';ctx.fillRect(0,0,30,H);
  for(let y=186;y<H-150;y+=54)line(ctx,44,y,W-44,y,rule,2);
  line(ctx,54,0,54,H,'#EDC8A9',3);
 }else if(frame==='postcard'){
  ctx.strokeStyle=orange;ctx.lineWidth=9;ctx.setLineDash([22,15]);ctx.strokeRect(24,24,W-48,H-48);ctx.setLineDash([]);
 }
 ctx.fillStyle=ink;ctx.font='500 38px system-ui, "Microsoft JhengHei", sans-serif';ctx.textBaseline='top';
 const safeName=String(petName||'').replace(/[\r\n]/g,' ');
 if(showName){let name=safeName;while(ctx.measureText(name).width>600&&name.length>1)name=Array.from(name).slice(0,-1).join('');ctx.fillText(name,P,65);}
 if(showDate){ctx.font='400 28px system-ui,sans-serif';const label=String(date).slice(0,10);ctx.fillText(label,W-P-ctx.measureText(label).width,74);}
 ctx.fillStyle=frame==='tape'?'#F1E8DC':paper;ctx.fillRect(photoX,photoY,photoW,photoH);
 contain(ctx,image,photoX,photoY,photoW,photoH);
 if(frame==='tape'){
  ctx.save();ctx.globalAlpha=.8;ctx.fillStyle='#F2CB9A';
  for(const [x,y,angle] of [[photoX+70,photoY+12,-.22],[photoX+photoW-80,photoY+photoH-12,-.22]]){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillRect(-78,-21,156,42);ctx.restore();}
  ctx.restore();
 }
 ctx.fillStyle=ink;ctx.font='400 38px system-ui, "Microsoft JhengHei", sans-serif';
 lines.forEach((text,index)=>ctx.fillText(text,P,photoY+photoH+27+index*lineHeight));
 // Use the complete official logo, unmodified and outside the photo, in every frame.
 contain(ctx,logo,P-5,H-103,220,82);
 ctx.font='400 26px system-ui, "Microsoft JhengHei", sans-serif';ctx.fillStyle=ink;
 const footer=t('生活的小事，留在小本本。'),footerWidth=ctx.measureText(footer).width;
 ctx.fillText(footer,W-P-footerWidth,H-67);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error(t('暫時無法製作分享卡，請再試一次。'))),'image/png'));
}

const blobDataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error(t('暫時無法分享，請再試一次。')));reader.readAsDataURL(blob);});
export async function shareDiaryPNG(blob,name='InPaw-diary.png'){
 if(globalThis.window?.inpawShareImage)return window.inpawShareImage({dataUrl:await blobDataURL(blob),name});
 const file=new File([blob],name,{type:'image/png'});
 if(globalThis.navigator?.canShare?.({files:[file]})&&navigator.share)return navigator.share({files:[file]});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return {saved:true};
}

const STYLE=`.ld-share{box-sizing:border-box;width:min(100% - 24px,480px);max-height:90dvh;padding:20px;border:1px solid #9c8b73;border-radius:18px;background:var(--surface,#fff9ef);color:var(--text,#293b70);overflow:auto}.ld-share::backdrop{background:#151a2e88}.ld-share h2{margin:0 0 14px;font-size:21px}.ld-share p{line-height:1.6;overflow-wrap:anywhere}.ld-share .ld-share-preview{display:block;width:100%;height:auto;margin:14px 0;border-radius:5px}.ld-share .ld-share-group{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.ld-share button{min-height:44px;max-width:100%;white-space:normal;overflow-wrap:anywhere}.ld-share .ld-share-group button{flex:1;padding:8px;border:1px solid #a79a86;border-radius:10px;background:transparent;color:inherit}.ld-share .ld-share-group button[aria-pressed=true]{background:#293b70;color:#fff9ef;border-color:#293b70}.ld-share label{display:flex;align-items:center;gap:7px;min-height:44px;font-size:14px}.ld-share textarea,.ld-share select{display:block;width:100%;box-sizing:border-box;min-height:44px;margin:7px 0 14px;padding:10px;font:inherit;font-size:16px;border:1px solid #a79a86;border-radius:10px;background:transparent;color:inherit}.ld-share textarea{min-height:110px;resize:vertical}.ld-share .ld-share-error{color:var(--danger,#9d2c24)}.ld-share .ld-share-note{font-size:13px}.ld-share .ld-share-ai{border-top:1px solid #a79a8666;padding-top:14px;margin-top:16px}.ld-share .ld-share-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.ld-share .ld-share-actions button{flex:1}.ld-share [disabled]{opacity:.55}.ld-share .ld-share-checks{display:flex;gap:16px;flex-wrap:wrap}`;

const THEME_STYLE='.ld-share{background:var(--theme-card,#fff9ef);color:var(--theme-ink,#293b70)}.ld-share .ld-share-error{color:var(--theme-danger,#9d2c24)}.ld-share .ld-share-group button{flex:1 1 100px;overflow-wrap:normal;word-break:normal}';
// simple（Ian 2026-11-16）：分享就單純分享，不在這裡改文字、也沒有 AI 文案；文字直接用日記那句，可以選擇不顯示。
// 2026-11-17：單純分享模式不能改文字，提示改成做得到的兩個選項，並附快捷按鈕。
const SHARE_TOO_LONG=()=>t('文字太長，這個比例放不下；可以改用限動 9:16，或關掉「文字」。原始日記不會改動。');
export function DiaryShare({react:R,entry,petName='',onClose,onGenerateCaption,simple=false}){
 const h=R.createElement,ref=R.useRef(null),opener=R.useRef(globalThis.document?.activeElement),serial=R.useRef(0),mounted=R.useRef(true),aiRequest=R.useRef(null);
 const initial=R.useRef(readDiaryShareDraft(entry)).current;
 const [frame,setFrame]=R.useState('catcloud'),[ratio,setRatio]=R.useState('feed'),[showName,setShowName]=R.useState(true),[showDate,setShowDate]=R.useState(true),[showText,setShowText]=R.useState(true);
 const [caption,setCaption]=R.useState(simple?String(entry?.caption??entry?.text??''):initial?.caption??String(entry?.caption??entry?.text??'')),[preview,setPreview]=R.useState(''),[blob,setBlob]=R.useState(null),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
 const [tone,setTone]=R.useState('short'),[mode,setMode]=R.useState('cloud'),[draft,setDraft]=R.useState(initial?.draft||''),[generating,setGenerating]=R.useState(false),[consent,setConsent]=R.useState(false);
 R.useEffect(()=>{try{saveDiaryShareDraft(entry,{caption,draft});}catch(e){setError(e.message);}},[entry,caption,draft]);
 R.useEffect(()=>{mounted.current=true;ref.current?.showModal?.();return()=>{mounted.current=false;serial.current++;aiRequest.current?.abort();aiRequest.current=null;ref.current?.close?.();opener.current?.focus?.();};},[]);
 R.useEffect(()=>{
  const ticket=++serial.current;let url='';setBlob(null);setPreview('');setError('');
  renderDiaryShare({photo:entry?.photo,caption,petName,date:entry?.date,frame,ratio,showName,showDate,showText}).then(value=>{if(ticket!==serial.current||!mounted.current)return;url=URL.createObjectURL(value);setBlob(value);setPreview(url);},e=>{if(ticket===serial.current&&mounted.current)setError(e.message);});
  return()=>{if(url)URL.revokeObjectURL(url);};
 },[entry?.photo,entry?.date,caption,petName,frame,ratio,showName,showDate,showText]);
 const stop=()=>{aiRequest.current?.abort();aiRequest.current=null;setGenerating(false);setNotice(t('已停止等待，原始日記與分享文字保留。'));};
 const close=()=>{if(!busy){try{saveDiaryShareDraft(entry,{caption,draft});}catch(e){setError(e.message);if(!window.confirm(t('草稿尚未保存，要放棄這次修改並關閉嗎？')))return;}aiRequest.current?.abort();aiRequest.current=null;onClose?.();}};
 const group=(value,update,items,label)=>h('div',{className:'ld-share-group',role:'group','aria-label':label},items.map(([key,text])=>h('button',{key,type:'button','aria-pressed':value===key,onClick:()=>update(key),disabled:busy||generating},text)));
 async function share(){if(!blob||busy)return;setBusy(true);setError('');setNotice('');try{const result=await shareDiaryPNG(blob,'InPaw-diary-'+String(entry?.date||'photo')+'.png');if(mounted.current&&result?.opened)setNotice(t('已開啟分享選單。'));}catch(e){if(e?.name!=='AbortError')setError(t('暫時無法分享，請再試一次。'));}finally{if(mounted.current)setBusy(false);}}
 async function generate(){if(!onGenerateCaption||generating||mode==='cloud'&&!consent)return;const request=new AbortController();aiRequest.current=request;setGenerating(true);setError('');setNotice('');const keep=result=>{if(!mounted.current||aiRequest.current!==request||request.signal.aborted)throw new DOMException('Aborted','AbortError');saveDiaryShareDraft(entry,{caption,draft:result});setDraft(result);};try{const result=await onGenerateCaption({text:caption,tone,mode,signal:request.signal,onResult:keep});if(!mounted.current||aiRequest.current!==request||request.signal.aborted)return;if(typeof result!=='string'||!result.trim())throw Error(t('沒有取得文案，請再試一次。'));keep(result.trim());setDraft(result.trim());setConsent(false);}catch(e){if(mounted.current&&aiRequest.current===request&&e?.name!=='AbortError')setError(e.message||t('沒有取得文案，請再試一次。'));}finally{if(mounted.current&&aiRequest.current===request){aiRequest.current=null;setGenerating(false);}}}
 return h('dialog',{ref,className:'ld-share','aria-label':t('分享這一頁'),onCancel:e=>{e.preventDefault();close();}},h('style',null,STYLE+THEME_STYLE),
  h('h2',null,t('分享這一頁')),
  group(frame,setFrame,[['catcloud',t('貓耳雲朵框')],['pawparty',t('肉球派對框')],['sweetcat',t('甜點貓咪框')]],t('分享外框')),
  preview?h('img',{className:'ld-share-preview',src:preview,alt:t('含左下角官方 Logo 的分享卡預覽')}):h('p',{role:'status'},error?'':t('正在製作分享卡…')),
  group(ratio,setRatio,[['feed',t('貼文 4:5')],['story',t('限動 9:16')]],t('分享比例')),
  h('div',{className:'ld-share-checks'},[[showName,setShowName,t('名字')],[showDate,setShowDate,t('日期')],[showText,setShowText,t('文字')]].map(([checked,update,text])=>h('label',{key:text},h('input',{type:'checkbox',checked,onChange:e=>update(e.target.checked),disabled:busy}),text))),
  !simple&&h('label',{htmlFor:'ld-share-caption'},t('分享文字（原始日記保留）')),!simple&&h('textarea',{id:'ld-share-caption',value:caption,maxLength:DIARY_SHARE_CAPTION_LIMIT,onChange:e=>{setCaption(e.target.value);setConsent(false);},disabled:busy||generating}),
  h('p',{className:'ld-share-note'},t('照片保留完整；分享只包含上方卡片，不含其他照護資料。')),
  !simple&&h('p',{className:'ld-share-note'},t('分享草稿留在這台裝置，不修改原始日記；不包含在照護備份中。')),
  !simple&&onGenerateCaption&&h('section',{className:'ld-share-ai','aria-label':t('AI 整理分享文字')},h('h3',null,t('AI 整理分享文字')),
   group(tone,setTone,[['original',t('保留原味')],['short',t('短一點')],['playful',t('俏皮一點')]],t('文案語氣')),
   h('label',{htmlFor:'ld-share-ai-mode'},t('AI 模式')),h('select',{id:'ld-share-ai-mode',value:mode,onChange:e=>setMode(e.target.value),disabled:generating},h('option',{value:'cloud'},t('進階模式')),h('option',{value:'phone'},t('手機模式'))),
   h('p',{className:'ld-share-note'},mode==='cloud'?t('進階模式需連網，送出文字前會再確認；照片不會送出。'):t('手機模式需先下載裝置模型，由你確認後才下載；照片不會送出。')),
   mode==='cloud'&&h('label',null,h('input',{type:'checkbox',checked:consent,onChange:e=>setConsent(e.target.checked),disabled:generating}),t('我同意只送出上方文字，使用 1 次額度整理文案；不送出照片。')),
   h('button',{type:'button',onClick:generate,disabled:generating||busy||!caption.trim()||mode==='cloud'&&!consent},generating?t('正在整理文字…'):t('整理分享文字')),generating&&h('button',{type:'button',onClick:stop},t('停止等待')),
   draft&&h(R.Fragment,null,h('label',{htmlFor:'ld-share-ai-draft'},t('AI 草稿，請先核對再套用')),h('textarea',{id:'ld-share-ai-draft',value:draft,onChange:e=>setDraft(e.target.value),disabled:generating,maxLength:DIARY_SHARE_CAPTION_LIMIT}),h('button',{type:'button',disabled:busy||generating||!draft.trim()||count(draft)>DIARY_SHARE_CAPTION_LIMIT,onClick:()=>{setCaption(draft.trim());setNotice(t('已套用到分享卡，原始日記保留。'));}},t('套用到分享卡')))),
  error&&h('p',{role:'alert',className:'ld-share-error'},error),error===SHARE_TOO_LONG()&&h('div',{className:'ld-share-fixes'},ratio!=='story'&&h('button',{type:'button',className:'secondary-btn',onClick:()=>setRatio('story'),disabled:busy},t('改用限動 9:16')),showText&&h('button',{type:'button',className:'secondary-btn',onClick:()=>setShowText(false),disabled:busy},t('關掉文字'))),notice&&h('p',{role:'status'},notice),
  h('div',{className:'ld-share-actions'},h('button',{type:'button',onClick:close,disabled:busy},t('關閉')),h('button',{type:'button',className:'primary',onClick:share,disabled:busy||!blob||generating},busy?t('正在開啟分享…'):globalThis.window?.inpawShareImage||globalThis.navigator?.share?t('分享圖片'):t('儲存圖片'))));
}
