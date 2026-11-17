import {t} from './assets/i18n.js?v=audit1117b';
import {shareDiaryPNG,wrapDiaryText} from './assets/life-diary-share.js?v=audit1117';

// 陪玩成果分享卡：只用 canvas 畫簡化小魚與水域，不截圖頁面、不含 AI 文案、不送任何網路資料。
export const PLAY_SHARE_RATIOS=Object.freeze(['feed','story']);
export const PLAY_SHARE_WATER=Object.freeze({
 blue:{top:'#1e3b78',bottom:'#102553',floor:'#132c58',floor2:'#102952',accent:'#8eb4df'},
 reef:{top:'#146676',bottom:'#103b54',floor:'#397b80',floor2:'#1f5a63',accent:'#cd887d'},
 moon:{top:'#192a4b',bottom:'#0d1732',floor:'#263655',floor2:'#101d3c',accent:'#d5e4ef'},
 sand:{top:'#276c88',bottom:'#18546c',floor:'#dbcca2',floor2:'#c4b48a',accent:'#eee0b8'}
});
// 與 fish-game.js TopFish（waterStyle）同一組配色：[身體, 鰭]。
export const PLAY_SHARE_FISH=Object.freeze({gold:['#CBE045','#A9BE2E'],sunshine:['#f2df72','#c3ad43'],rose:['#db9583','#b66f66']});
const TITLE_LIMIT=60,LABEL_LIMIT=24,NAME_LIMIT=40;
const logoURL=new URL('./assets/brand/logo.svg',import.meta.url).href;
const FONT='system-ui, "Microsoft JhengHei", "Noto Sans TC", sans-serif';

export function playShareLayout({ratio='feed'}={}){
 if(!PLAY_SHARE_RATIOS.includes(ratio))throw Error(t('請重新選擇分享比例。'));
 return {width:1080,height:ratio==='story'?1920:1350,padding:72,ratio};
}

const clean=(value,limit)=>Array.from(String(value??'').replace(/\s+/gu,' ').trim()).slice(0,limit).join('');
const count=value=>Number.isInteger(value)&&value>=0?Math.min(value,99999):0;
const secondsOf=value=>{const n=Number(value);if(typeof value!=='number'||!Number.isFinite(n)||n<0)return 0;return Math.min(60,Math.round(n));};

// 輸入防呆：數字不合法當 0、秒數超過 60 以 60 計；字串去換行並截長；外觀與水域不在清單用預設。
export function normalizePlayShare(input={}){
 const v=input&&typeof input==='object'?input:{};
 return {
  title:clean(v.title,TITLE_LIMIT),
  personalityLabel:clean(v.personalityLabel,LABEL_LIMIT),
  caught:count(v.caught),
  seconds:secondsOf(v.seconds),
  bestStageLabel:clean(v.bestStageLabel,LABEL_LIMIT),
  bestStageTouches:count(v.bestStageTouches),
  waterTheme:Object.hasOwn(PLAY_SHARE_WATER,v.waterTheme)?v.waterTheme:'blue',
  appearance:Object.hasOwn(PLAY_SHARE_FISH,v.appearance)?v.appearance:'gold',
  petName:clean(v.petName,NAME_LIMIT),
  date:clean(v.date,10),
  showName:v.showName!==false,
  showDate:v.showDate!==false
 };
}

function loadImage(source){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth?resolve(image):reject(Error(t('暫時無法製作分享卡，請再試一次。')));image.onerror=()=>reject(Error(t('暫時無法製作分享卡，請再試一次。')));image.src=source;});}
function contain(ctx,image,x,y,width,height){const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,x+(width-w)/2,y+(height-h)/2,w,h);}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function fitLine(ctx,text,width){let value=text;if(ctx.measureText(value).width<=width)return value;const chars=Array.from(value);while(chars.length>1&&ctx.measureText(chars.join('')+'…').width>width)chars.pop();return chars.join('')+'…';}
// 換行後超過 max 行時，最後一行加省略號，避免文字擠出卡片。
// 行首避頭：標點不放在行首，往上一行併回（只併一個字元，避免超出太多）。
const NO_START=/^[·・、，。：；！？）」』,.:;!?)]/u;
function wrapLines(ctx,text,width,max){const lines=wrapDiaryText(ctx,text,width).filter(Boolean);
 for(let i=1;i<lines.length;i++){const lead=lines[i].match(NO_START);if(lead){lines[i-1]+=lead[0];lines[i]=lines[i].slice(lead[0].length).trimStart();}}
 for(let i=lines.length-1;i>=0;i--)if(!lines[i])lines.splice(i,1);if(lines.length<=max)return lines;const kept=lines.slice(0,max);kept[max-1]=fitLine(ctx,kept[max-1]+lines.slice(max).join(''),width);return kept;}
// 固定種子的假亂數：預覽與匯出永遠是同一張圖。
function seeded(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

function drawFish(ctx,x,y,size,appearance,angle=0){
 const [body,fin]=PLAY_SHARE_FISH[appearance],k=size/100;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(k,k);ctx.translate(-55,-32);
 const path=(d,fill,alpha=1)=>{ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.fill(new Path2D(d));ctx.globalAlpha=1;};
 path('M33 32 7 15 7 49Z',fin);
 path('M49 16Q58 1 70 17Z',fin);
 ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(61,32,34,19,0,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=.38;ctx.strokeStyle='#f0f6ac';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke(new Path2D('M38 29Q56 16 78 25'));ctx.globalAlpha=1;
 path('M54 34Q48 43 59 46Q63 40 63 35Z',fin,.8);
 ctx.fillStyle='#0F1A4A';ctx.beginPath();ctx.arc(80,28,3.8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fffde0';ctx.beginPath();ctx.arc(81,26.9,1.1,0,Math.PI*2);ctx.fill();
 ctx.restore();
}

function drawWater(ctx,x,y,w,h,theme,appearance,caught){
 const c=PLAY_SHARE_WATER[theme],random=seeded(w*7+h*13+theme.length*101+caught);
 ctx.save();roundRect(ctx,x,y,w,h,40);ctx.clip();
 const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,c.top);g.addColorStop(1,c.bottom);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
 if(theme==='moon'){
  // 彎月：用 evenodd 挖掉一個圓，不靠背景色覆蓋。
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.arc(x+w-128,y+96,42,0,Math.PI*2);ctx.clip('evenodd');
  ctx.fillStyle='#f3efd8';ctx.beginPath();ctx.arc(x+w-150,y+110,48,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#d5e4ef';for(let i=0;i<14;i++){ctx.globalAlpha=.35+random()*.5;ctx.beginPath();ctx.arc(x+40+random()*(w-80),y+30+random()*h*.4,2+random()*2.5,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
 }
 // 水面光帶：由上往下淡出
 const ray=ctx.createLinearGradient(0,y,0,y+h*.7);ray.addColorStop(0,'rgba(255,255,255,.1)');ray.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=ray;
 for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+120+i*230,y);ctx.lineTo(x+200+i*230,y);ctx.lineTo(x+60+i*230,y+h*.7);ctx.lineTo(x+10+i*230,y+h*.7);ctx.closePath();ctx.fill();}
 // 水底
 const floorY=y+h-Math.min(130,h*.2);
 ctx.fillStyle=c.floor2;ctx.beginPath();ctx.moveTo(x,floorY+30);ctx.quadraticCurveTo(x+w*.3,floorY-30,x+w*.55,floorY+20);ctx.quadraticCurveTo(x+w*.8,floorY+55,x+w,floorY-10);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
 ctx.fillStyle=c.floor;ctx.beginPath();ctx.moveTo(x,floorY+70);ctx.quadraticCurveTo(x+w*.25,floorY+20,x+w*.5,floorY+65);ctx.quadraticCurveTo(x+w*.75,floorY+100,x+w,floorY+50);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
 if(theme==='reef'){
  ctx.strokeStyle=c.accent;ctx.lineWidth=12;ctx.lineCap='round';ctx.lineJoin='round';
  for(const [cx,s] of [[x+110,1.2],[x+w-130,1]]){ctx.save();ctx.translate(cx,floorY+60);ctx.scale(s,s);ctx.stroke(new Path2D('M0 0V-82M0-20-20-38V-55M0-42 22-62V-79M0-61-14-75V-92'));ctx.restore();}
 }else if(theme==='blue'||theme==='sand'){
  ctx.strokeStyle=theme==='sand'?'#568c7b':'#4c838f';ctx.lineWidth=9;ctx.lineCap='round';
  for(const [cx,s] of [[x+90,1.3],[x+w-110,1.1]]){ctx.save();ctx.translate(cx,floorY+70);ctx.scale(s,s);ctx.stroke(new Path2D('M0 0C-26-28 10-47-8-82M4 0C25-23-8-39 12-65M-4 0C-35-16-12-34-26-50'));ctx.restore();}
 }
 // 氣泡
 ctx.strokeStyle='#ffffff';ctx.lineWidth=4;
 for(let i=0;i<12;i++){ctx.globalAlpha=.25+random()*.4;const r=6+random()*16;ctx.beginPath();ctx.arc(x+60+random()*(w-120),y+40+random()*(floorY-y-80),r,0,Math.PI*2);ctx.stroke();}
 ctx.globalAlpha=1;
 // 主角小魚＋往上冒的一串氣泡
 const size=Math.min(w*(h>900?.58:.46),h*.62),fx=x+w/2,fy=y+(floorY-y)*.55;
 drawFish(ctx,fx,fy,size,appearance,-.14);
 ctx.strokeStyle='#ffffff';ctx.globalAlpha=.75;
 [[.5,18],[.62,12],[.72,8]].forEach(([dy,r],i)=>{ctx.lineWidth=4;ctx.beginPath();ctx.arc(fx+size*.5+i*16,fy-size*dy,r,0,Math.PI*2);ctx.stroke();});
 ctx.globalAlpha=1;ctx.restore();
}

// 預覽與匯出是同一張 PNG；回傳 Blob。
export async function renderPlayShare(input={}){
 const layout=playShareLayout({ratio:input?.ratio??'feed'});
 const card=normalizePlayShare(input);
 const logo=await loadImage(logoURL);
 const canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error(t('暫時無法製作分享卡，請再試一次。'));
 const {width:W,height:H,padding:P}=layout,ink='#293B70',muted='#5b6587',paper='#FFF9EF',textW=W-P*2;
 ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);ctx.textBaseline='top';
 const name=card.showName?card.petName:'',date=card.showDate?card.date:'';
 if(date){ctx.font=`400 30px ${FONT}`;ctx.fillStyle=muted;ctx.fillText(date,W-P-ctx.measureText(date).width,70);}
 if(name){ctx.font=`600 40px ${FONT}`;ctx.fillStyle=ink;const room=textW-(date?ctx.measureText(date).width+60:0);ctx.fillText(fitLine(ctx,name,Math.max(200,room)),P,64);}
 const prey=t('小魚');
 // 先量文字區高度，水域吃掉剩下的空間。
 const blocks=[];
 ctx.font=`700 ${layout.ratio==='story'?72:64}px ${FONT}`;
 const headline=card.caught>0?t('這次抓到{prey} {n} 次',{prey,n:card.caught}):t('{prey}游累了，下次再來',{prey});
 const titleSize=layout.ratio==='story'?72:64;
 blocks.push({kind:'text',font:`700 ${titleSize}px ${FONT}`,color:ink,lines:wrapLines(ctx,headline,textW,3),lineHeight:Math.round(titleSize*1.25),gap:28});
 if(card.personalityLabel){ctx.font=`600 34px ${FONT}`;blocks.push({kind:'chip',font:`600 34px ${FONT}`,text:fitLine(ctx,t('小魚個性：{label}',{label:card.personalityLabel}),textW-56),height:68,gap:28});}
 if(card.bestStageLabel){ctx.font=`500 38px ${FONT}`;blocks.push({kind:'text',font:`500 38px ${FONT}`,color:ink,lines:wrapLines(ctx,t('最有反應：{stage}的時候（{n} 次）',{stage:card.bestStageLabel,n:card.bestStageTouches}),textW,2),lineHeight:52,gap:22});}
 // 秒數放前面，玩法名稱過長被省略時也不會吃掉秒數。
 const meta=[t('玩了 {n} 秒',{n:card.seconds}),card.title].filter(Boolean).join(' · ');
 ctx.font=`400 32px ${FONT}`;blocks.push({kind:'text',font:`400 32px ${FONT}`,color:muted,lines:wrapLines(ctx,meta,textW,2),lineHeight:46,gap:0});
 const textH=blocks.reduce((sum,b)=>sum+(b.kind==='chip'?b.height:b.lines.length*b.lineHeight)+b.gap,0);
 const waterY=name||date?140:P,footerTop=H-130,gapAfterWater=52;
 // 水域填滿文字區以外的空間，文字短時也不留大片空白。
 const waterH=footerTop-36-textH-gapAfterWater-waterY;
 if(waterH<280)throw Error(t('暫時無法製作分享卡，請再試一次。'));
 drawWater(ctx,P,waterY,textW,waterH,card.waterTheme,card.appearance,card.caught);
 let y=waterY+waterH+gapAfterWater;
 for(const b of blocks){
  ctx.font=b.font;
  if(b.kind==='chip'){
   const w=ctx.measureText(b.text).width+56;ctx.fillStyle='#FBE3CC';roundRect(ctx,P,y,w,b.height,b.height/2);ctx.fill();
   ctx.fillStyle='#8a4a22';ctx.textBaseline='middle';ctx.fillText(b.text,P+28,y+b.height/2+1);ctx.textBaseline='top';y+=b.height+b.gap;continue;
  }
  ctx.fillStyle=b.color;b.lines.forEach((line,i)=>ctx.fillText(line,P,y+i*b.lineHeight));y+=b.lines.length*b.lineHeight+b.gap;
 }
 // 官方完整 Logo 放左下，頁尾短句靠右，兩者不重疊。
 contain(ctx,logo,P-5,H-103,220,82);
 ctx.font=`400 28px ${FONT}`;ctx.fillStyle=ink;const footer=fitLine(ctx,t('陪牠玩出新花樣'),textW-250);
 ctx.fillText(footer,W-P-ctx.measureText(footer).width,H-70);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error(t('暫時無法製作分享卡，請再試一次。'))),'image/png'));
}

const STYLE=`.pl-share{box-sizing:border-box;width:min(100% - 24px,480px);max-height:90dvh;padding:20px;border:1px solid #9c8b73;border-radius:18px;background:var(--theme-card,var(--surface,#fff9ef));color:var(--theme-ink,var(--text,#293b70));overflow:auto}.pl-share::backdrop{background:#151a2e88}.pl-share h2{margin:0 0 14px;font-size:21px;overflow-wrap:anywhere}.pl-share p{line-height:1.6;overflow-wrap:anywhere}.pl-share .pl-share-preview{display:block;width:100%;height:auto;margin:14px 0;border:1px solid #a79a8666;border-radius:6px}.pl-share .pl-share-group{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.pl-share button{min-height:44px;max-width:100%;white-space:normal;overflow-wrap:anywhere}.pl-share .pl-share-group button{flex:1 1 100px;padding:8px;border:1px solid #a79a86;border-radius:10px;background:transparent;color:inherit}.pl-share .pl-share-group button[aria-pressed=true]{background:#293b70;color:#fff9ef;border-color:#293b70}.pl-share label{display:flex;align-items:center;gap:7px;min-height:44px;font-size:14px}.pl-share input[type=checkbox]{width:22px;height:22px}.pl-share .pl-share-checks{display:flex;gap:16px;flex-wrap:wrap}.pl-share .pl-share-note{font-size:13px}.pl-share .pl-share-error{color:var(--theme-danger,var(--danger,#9d2c24))}.pl-share .pl-share-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.pl-share .pl-share-actions button{flex:1 1 120px}.pl-share [disabled]{opacity:.55}`;

export function PlayShare({react:R,card,petName='',onClose}){
 const h=R.createElement,ref=R.useRef(null),opener=R.useRef(globalThis.document?.activeElement),serial=R.useRef(0),mounted=R.useRef(true);
 const [ratio,setRatio]=R.useState('feed'),[showName,setShowName]=R.useState(true),[showDate,setShowDate]=R.useState(true);
 const [preview,setPreview]=R.useState(''),[blob,setBlob]=R.useState(null),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
 const key=JSON.stringify(normalizePlayShare({...card,petName}));
 R.useEffect(()=>{mounted.current=true;ref.current?.showModal?.();return()=>{mounted.current=false;serial.current++;ref.current?.close?.();opener.current?.focus?.();};},[]);
 R.useEffect(()=>{
  const ticket=++serial.current;let url='';setBlob(null);setPreview('');setError('');
  renderPlayShare({...card,petName,ratio,showName,showDate}).then(value=>{if(ticket!==serial.current||!mounted.current)return;url=URL.createObjectURL(value);setBlob(value);setPreview(url);},e=>{if(ticket===serial.current&&mounted.current)setError(e?.message||t('暫時無法製作分享卡，請再試一次。'));});
  return()=>{if(url)URL.revokeObjectURL(url);};
 },[key,ratio,showName,showDate]);
 const close=()=>{if(!busy)onClose?.();};
 async function share(){
  if(!blob||busy)return;setBusy(true);setError('');setNotice('');
  try{const date=normalizePlayShare(card).date||'result';const result=await shareDiaryPNG(blob,'InPaw-play-'+date+'.png');if(mounted.current&&result?.opened)setNotice(t('已開啟分享選單。'));}
  catch(e){if(e?.name!=='AbortError'&&mounted.current)setError(t('暫時無法分享，請再試一次。'));}
  finally{if(mounted.current)setBusy(false);}
 }
 const canShare=!!(globalThis.window?.inpawShareImage||globalThis.navigator?.share);
 return h('dialog',{ref,className:'pl-share','aria-labelledby':'pl-share-title',onCancel:e=>{e.preventDefault();close();}},h('style',null,STYLE),
  h('h2',{id:'pl-share-title'},t('分享這次成果')),
  preview?h('img',{className:'pl-share-preview',src:preview,alt:t('陪玩成果分享卡預覽，左下角是官方 Logo')}):h('p',{role:'status'},error?'':t('正在製作分享卡…')),
  h('div',{className:'pl-share-group',role:'group','aria-label':t('分享比例')},[['feed',t('貼文 4:5')],['story',t('限動 9:16')]].map(([value,text])=>h('button',{key:value,type:'button','aria-pressed':ratio===value,onClick:()=>setRatio(value),disabled:busy},text))),
  h('div',{className:'pl-share-checks'},[[showName,setShowName,t('名字'),'name'],[showDate,setShowDate,t('日期'),'date']].map(([checked,update,text,id])=>h('label',{key:id},h('input',{type:'checkbox',checked,onChange:e=>update(e.target.checked),disabled:busy}),text))),
  h('p',{className:'pl-share-note'},t('分享只包含這張卡片，不含照護資料。')),
  error&&h('p',{role:'alert',className:'pl-share-error'},error),notice&&h('p',{role:'status'},notice),
  h('div',{className:'pl-share-actions'},
   h('button',{type:'button',onClick:close,disabled:busy},t('關閉')),
   h('button',{type:'button',className:'primary',onClick:share,disabled:busy||!blob},busy?t('正在開啟分享…'):canShare?t('分享圖片'):t('儲存圖片'))));
}
