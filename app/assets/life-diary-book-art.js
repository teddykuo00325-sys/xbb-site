// 每月小本本的頁面繪製（A5 直式，1240 × 1754，約 212 dpi）。
// 同一份畫面用在 App 內翻頁預覽、分享單頁 PNG，以及 PDF 每一頁，所以看到的就是印出來的。
// 封面一定用這本書裡自己毛孩的照片，走可愛風：貓耳相框、鬍鬚、肉球、愛心、緞帶。
import {t} from './i18n.js?v=audit1117b';
import {wrapDiaryText} from './life-diary-share.js?v=audit1117';
import {bookCoverEntry,bookStats} from './life-diary-book-model.js?v=book1';

export const BOOK_PAGE=Object.freeze({width:1240,height:1754});
const logoURL=new URL('./brand/logo.svg',import.meta.url).href;
const ROUND='"jf-openhuninn-2.0","Yuanti TC","Arial Rounded MT Bold","PingFang TC","Noto Sans CJK TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif';
const INK='#6E4636',SOFT='#B08B74',PINK='#F48FB1',PINK_DEEP='#E06C93',BLUSH='#FFD9E2',PEACH='#FFCFA8',MINT='#BFE3D0',CREAM='#FFFBF3';
const images=new Map();
function loadImage(source){
 if(!images.has(source))images.set(source,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth?resolve(image):reject(Error(t('無法讀取日記照片。')));image.onerror=()=>reject(Error(t('無法讀取日記照片。')));image.src=source;}));
 const pending=images.get(source);pending.catch(()=>images.delete(source));
 if(images.size>80)images.delete(images.keys().next().value);
 return pending;
}
const font=(weight,size)=>`${weight} ${size}px ${ROUND}`;
function ellipse(c,x,y,rx,ry,color,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fillStyle=color;c.fill();}
function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function paw(c,x,y,s,color,angle=0){c.save();c.translate(x,y);c.rotate(angle);ellipse(c,0,s*.18,s*.42,s*.34,color);for(const [dx,dy,r] of [[-.42,-.25,.18],[-.16,-.5,.19],[.16,-.5,.19],[.42,-.25,.18]])ellipse(c,dx*s,dy*s,r*s,r*s*1.15,color);c.restore();}
function heart(c,x,y,s,color,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,s*.35);c.bezierCurveTo(-s*1.1,-s*.35,-s*.45,-s*1.05,0,-s*.45);c.bezierCurveTo(s*.45,-s*1.05,s*1.1,-s*.35,0,s*.35);c.fillStyle=color;c.fill();c.restore();}
function sparkle(c,x,y,s,color){c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x+s*.18,y-s*.18,x+s,y);c.quadraticCurveTo(x+s*.18,y+s*.18,x,y+s);c.quadraticCurveTo(x-s*.18,y+s*.18,x-s,y);c.quadraticCurveTo(x-s*.18,y-s*.18,x,y-s);c.fillStyle=color;c.fill();}
function cover(c,image,x,y,w,h){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale;c.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2.4,sw,sh,x,y,w,h);}
function contain(c,image,x,y,w,h){const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight),dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;c.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function fitText(c,text,weight,size,maxWidth,min=36){let s=size;c.font=font(weight,s);while(s>min&&c.measureText(text).width>maxWidth){s-=4;c.font=font(weight,s);}if(c.measureText(text).width<=maxWidth)return text;let out=Array.from(text);while(out.length>1&&c.measureText(out.join('')+'…').width>maxWidth)out.pop();return out.join('')+'…';}
function fitSize(c,text,weight,size,maxWidth,min){let v=size;c.font=font(weight,v);while(v>min&&c.measureText(text).width>maxWidth){v-=4;c.font=font(weight,v);}return v;}
function sticker(c,text,x,y,{weight=900,size=96,fill=INK,stroke='#FFFFFF',line=16,align='center'}={}){c.save();c.font=font(weight,size);c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.strokeStyle=stroke;c.lineWidth=line;c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);c.restore();}
function tape(c,x,y,w,angle,color){c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=.88;c.fillStyle=color;c.fillRect(-w/2,-24,w,48);c.globalAlpha=.35;c.fillStyle='#FFFFFF';for(let i=-w/2+10;i<w/2;i+=28)c.fillRect(i,-24,12,48);c.restore();}

export function bookMonthLabel(book){
 const [year,month]=String(book?.month||'').split('-').map(Number);
 const english=String(globalThis.document?.documentElement?.lang||'').startsWith('en');
 const base=english?new Date(year,month-1,15).toLocaleDateString('en',{month:'long',year:'numeric'}):t('{year} 年 {month} 月',{year,month});
 return book?.numbered?t('{base} · 第 {n} 冊',{base,n:book.volume}):base;
}
function dayLabel(row){
 const lang=String(globalThis.document?.documentElement?.lang||'zh-Hant');
 const date=new Date(row.date+'T12:00:00');
 const weekday=date.toLocaleDateString(lang.startsWith('en')?'en':'zh-TW',{weekday:'short'});
 const [,m,d]=row.date.split('-').map(Number);
 return t('{month}/{day}（{weekday}）{time}',{month:m,day:d,weekday,time:row.time});
}

function cuteBackground(c,W,H,s){
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#FCE1EA');g.addColorStop(.62,'#FFEFF2');g.addColorStop(1,'#FFF4E4');
 c.fillStyle=g;c.fillRect(0,0,W,H);
 for(let y=40*s,row=0;y<H;y+=86*s,row++)for(let x=(row%2?43:0)*s+30*s;x<W;x+=86*s)ellipse(c,x,y,7*s,7*s,'rgba(255,255,255,.62)');
}

async function drawCover(c,{book,petName,petPhoto,coverId},s){
 const {width:W,height:H}=BOOK_PAGE,w=W*s,h=H*s;
 cuteBackground(c,w,h,s);
 const entry=bookCoverEntry(book,coverId),[photo,logo,avatar]=await Promise.all([loadImage(entry.photo),loadImage(logoURL),petPhoto?loadImage(petPhoto).catch(()=>null):null]);
 // 標題：白邊貼紙字。
 heart(c,w/2-250*s,150*s,22*s,PINK,-.2);heart(c,w/2+250*s,150*s,22*s,PINK,.2);
 c.font=font(700,40*s);c.fillStyle=PINK_DEEP;c.textAlign='center';c.textBaseline='middle';c.fillText(t('每月小本本'),w/2,150*s);c.textAlign='start';
 const title=t('{name}的小本本',{name:petName||t('毛孩')});
 const size=fitSize(c,title,900,104*s,1040*s,60*s);
 sticker(c,fitText(c,title,900,size,1040*s,size),w/2,262*s,{size,line:22*s});
 // 貓耳相框：耳朵 → 白框 → 照片 → 鬍鬚、膠帶。
 const fx=190*s,fy=490*s,fw=860*s,fh=780*s,border=26*s;
 const ear=(cx,dir,half,rise,color)=>{const tip=cx+dir*18*s;c.beginPath();c.moveTo(cx-half,fy+60*s);c.lineTo(tip-22*s,fy-rise+16*s);c.quadraticCurveTo(tip,fy-rise-8*s,tip+22*s,fy-rise+16*s);c.lineTo(cx+half,fy+60*s);c.closePath();c.fillStyle=color;c.fill();};
 for(const [cx,dir] of [[fx+200*s,-1],[fx+fw-200*s,1]]){ear(cx,dir,135*s,150*s,'#FFFFFF');ear(cx,dir,72*s,95*s,BLUSH);}
 c.save();c.shadowColor='rgba(150,80,90,.22)';c.shadowBlur=36*s;c.shadowOffsetY=14*s;rounded(c,fx,fy,fw,fh,90*s);c.fillStyle='#FFFFFF';c.fill();c.restore();
 c.save();rounded(c,fx+border,fy+border,fw-border*2,fh-border*2,70*s);c.clip();c.fillStyle='#F6EEE6';c.fillRect(fx,fy,fw,fh);cover(c,photo,fx+border,fy+border,fw-border*2,fh-border*2);c.restore();
 c.strokeStyle=INK;c.lineWidth=7*s;c.lineCap='round';
 for(const dir of [-1,1])for(const [dy,tilt] of [[-36,-26],[0,0],[36,26]]){const x0=dir<0?fx-18*s:fx+fw+18*s;c.beginPath();c.moveTo(x0,fy+fh*.62+dy*s);c.lineTo(x0+dir*92*s,fy+fh*.62+(dy+tilt)*s);c.stroke();}
 tape(c,fx+40*s,fy+fh-30*s,170*s,.7,PEACH);
 // 自己設的毛孩頭像：圓形貼紙。
 if(avatar){const r=104*s,cx=fx+fw-50*s,cy=fy+fh-40*s;c.save();c.shadowColor='rgba(150,80,90,.25)';c.shadowBlur=20*s;ellipse(c,cx,cy,r+16*s,r+16*s,'#FFFFFF');c.restore();ellipse(c,cx,cy,r+8*s,r+8*s,PINK);c.save();c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.clip();cover(c,avatar,cx-r,cy-r,r*2,r*2);c.restore();}
 // 月份緞帶。
 const ry=1370*s,rw=760*s,rh=118*s,rx=(w-rw)/2;
 c.fillStyle=PINK_DEEP;for(const dir of [-1,1]){const x=dir<0?rx-60*s:rx+rw+60*s;c.beginPath();c.moveTo(dir<0?rx+30*s:rx+rw-30*s,ry+24*s);c.lineTo(x,ry+24*s);c.lineTo(x+dir*-34*s,ry+rh/2+24*s);c.lineTo(x,ry+rh+24*s);c.lineTo(dir<0?rx+30*s:rx+rw-30*s,ry+rh+24*s);c.fill();}
 rounded(c,rx,ry,rw,rh,30*s);c.fillStyle=PINK;c.fill();
 c.font=font(900,58*s);c.fillStyle='#FFFFFF';c.textAlign='center';c.textBaseline='middle';c.fillText(fitText(c,bookMonthLabel(book),900,58*s,rw-60*s,36*s),w/2,ry+rh/2);
 const stats=bookStats(book),line=stats.firsts?t('收進 {count} 個小日常，還有 {firsts} 個第一次',{count:stats.count,firsts:stats.firsts}):t('收進 {count} 個小日常',{count:stats.count});
 c.font=font(700,44*s);c.fillStyle=INK;c.fillText(fitText(c,line,700,44*s,1000*s,30*s),w/2,1575*s);c.textAlign='start';
 // 邊邊的小裝飾，不壓到照片和字。
 paw(c,95*s,520*s,70*s,'#F7B7C8',-.4);paw(c,1150*s,700*s,62*s,PEACH,.35);paw(c,105*s,1100*s,54*s,MINT,-.2);paw(c,1175*s,1120*s,48*s,'#F7B7C8',.3);
 heart(c,92*s,820*s,26*s,PINK,.2);heart(c,1160*s,860*s,22*s,'#F9A8C0',-.3);sparkle(c,1150*s,470*s,24*s,'#FFD27A');sparkle(c,90*s,1290*s,20*s,'#FFD27A');sparkle(c,1120*s,1300*s,16*s,'#9FD4F0');
 contain(c,logo,58*s,h-128*s,220*s,82*s);
 paw(c,w-110*s,h-82*s,44*s,'#F7B7C8',.25);
}

function pageFrame(c,{book,petName,index,total},s){
 const {width:W,height:H}=BOOK_PAGE,w=W*s,h=H*s;
 c.fillStyle=CREAM;c.fillRect(0,0,w,h);
 for(let y=62*s;y<h;y+=62*s)for(let x=62*s;x<w;x+=62*s)ellipse(c,x,y,2.6*s,2.6*s,'#F1E4D3');
 c.font=font(700,30*s);c.fillStyle=SOFT;c.textBaseline='middle';
 c.fillText(fitText(c,t('{name}的小本本',{name:petName||t('毛孩')})+' · '+bookMonthLabel(book),700,30*s,900*s,22*s),80*s,72*s);
 paw(c,w-96*s,74*s,34*s,'#F7B7C8',.25);
 c.textAlign='center';c.font=font(700,30*s);c.fillStyle=SOFT;c.fillText(`${index} / ${total}`,w/2,h-70*s);c.textAlign='start';
 paw(c,w/2-74*s,h-72*s,22*s,BLUSH,-.3);paw(c,w/2+74*s,h-72*s,22*s,BLUSH,.3);
}
function chapterBanner(c,text,s){
 const w=BOOK_PAGE.width*s,x=80*s,y=122*s,bh=78*s;
 c.font=font(900,40*s);const label=fitText(c,t('小故事｜{name}',{name:text}),900,40*s,w-260*s,28*s),bw=Math.min(w-160*s,c.measureText(label).width+110*s);
 c.fillStyle=MINT;c.beginPath();c.moveTo(x,y);c.lineTo(x+bw,y);c.lineTo(x+bw-26*s,y+bh/2);c.lineTo(x+bw,y+bh);c.lineTo(x,y+bh);c.closePath();c.fill();
 paw(c,x+42*s,y+bh/2+4*s,34*s,'#FFFFFF',-.2);
 c.fillStyle=INK;c.textBaseline='middle';c.fillText(label,x+78*s,y+bh/2+2*s);
}
function firstBadge(c,x,y,s){c.font=font(900,30*s);const label=t('第一次'),bw=c.measureText(label).width+44*s;rounded(c,x,y-26*s,bw,52*s,26*s);c.fillStyle=PINK;c.fill();c.fillStyle='#FFFFFF';c.textBaseline='middle';c.fillText(label,x+22*s,y+1*s);return bw;}
async function polaroid(c,photo,cx,cy,maxW,maxH,angle,s,tapeColor){
 const image=await loadImage(photo),pad=22*s,bottom=56*s;
 const scale=Math.min((maxW-pad*2)/image.naturalWidth,(maxH-pad-bottom)/image.naturalHeight),pw=image.naturalWidth*scale,ph=image.naturalHeight*scale,fw=pw+pad*2,fh=ph+pad+bottom;
 c.save();c.translate(cx,cy);c.rotate(angle);
 c.save();c.shadowColor='rgba(110,70,54,.2)';c.shadowBlur=24*s;c.shadowOffsetY=10*s;c.fillStyle='#FFFFFF';c.fillRect(-fw/2,-fh/2,fw,fh);c.restore();
 c.drawImage(image,-fw/2+pad,-fh/2+pad,pw,ph);
 c.restore();
 tape(c,cx,cy-fh/2+4*s,150*s,angle-.06,tapeColor);
 return {width:fw,height:fh};
}
// 中文排版：句讀不放行首，併到上一行尾。
const CLOSING=/^[，。、！？；：」』）》〉…,.!?;:)]/u;
function wrapCaption(c,text,width){const lines=wrapDiaryText(c,text,width);for(let i=1;i<lines.length;i++){while(lines[i]&&CLOSING.test(lines[i])){const ch=Array.from(lines[i])[0];lines[i-1]+=ch;lines[i]=lines[i].slice(ch.length);}}return lines.filter((l,i)=>l||i===0);}
function captionHeight(c,row,width,size,s){c.font=font(500,size*s);return 52*s+(row.first?66*s:0)+wrapCaption(c,row.caption,width).length*size*1.55*s;}
function captionBlock(c,row,x,y,width,maxHeight,size,s){
 c.textBaseline='middle';c.font=font(700,32*s);c.fillStyle=SOFT;const day=dayLabel(row);c.fillText(day,x,y);
 let top=y+52*s;
 if(row.first){firstBadge(c,x,top,s);top+=66*s;}
 c.font=font(500,size*s);c.fillStyle=INK;c.textBaseline='top';
 const lineHeight=size*1.55*s,lines=wrapCaption(c,row.caption,width),max=Math.max(1,Math.floor((maxHeight-(top-y))/lineHeight));
 const shown=lines.length>max?[...lines.slice(0,max-1),fitText(c,lines[max-1]+'…',500,size*s,width,size*s)]:lines;
 shown.forEach((text,index)=>c.fillText(text,x,top+index*lineHeight));
}

async function drawSingle(c,page,ctx,s){
 const {width:W,height:H}=BOOK_PAGE,row=page.entries[0],top=(page.chapter?262:150)*s;
 pageFrame(c,ctx,s);if(page.chapter)chapterBanner(c,page.chapter,s);
 const avail=H*s-top-150*s,photoH=Math.min(avail*.74,avail-captionHeight(c,row,1020*s,40,s)-110*s),box=await polaroid(c,row.photo,W*s/2,top+photoH/2+20*s,1000*s,photoH,-.015,s,PEACH);
 const textTop=top+20*s+photoH/2+box.height/2+70*s;
 captionBlock(c,row,110*s,textTop,1020*s,H*s-130*s-textTop,40,s);
 if(row.first){heart(c,W*s-130*s,textTop,26*s,PINK,.25);sparkle(c,W*s-90*s,textTop+50*s,16*s,'#FFD27A');}
}
async function drawPair(c,page,ctx,s){
 const {width:W,height:H}=BOOK_PAGE,top=(page.chapter?262:140)*s,half=(H*s-top-130*s)/2;
 pageFrame(c,ctx,s);if(page.chapter)chapterBanner(c,page.chapter,s);
 for(const [index,row] of page.entries.entries()){
  const y=top+index*half,left=index===0,photoW=610*s,cx=left?80*s+photoW/2:W*s-80*s-photoW/2;
  await polaroid(c,row.photo,cx,y+half/2,photoW,half-50*s,left?-.03:.03,s,left?PEACH:MINT);
  const tx=left?80*s+photoW+50*s:80*s,tw=W*s-160*s-photoW-50*s;
  captionBlock(c,row,tx,y+70*s,tw,half-110*s,34,s);
 }
 c.strokeStyle='#EAD9C6';c.lineWidth=3*s;c.setLineDash([14*s,14*s]);c.beginPath();c.moveTo(120*s,top+half);c.lineTo(W*s-120*s,top+half);c.stroke();c.setLineDash([]);
}
async function drawEnding(c,{book,petName},s){
 const {width:W,height:H}=BOOK_PAGE,w=W*s,h=H*s,stats=bookStats(book);
 cuteBackground(c,w,h,s);
 const title=t('這個月的{name}',{name:petName||t('毛孩')}),size=fitSize(c,title,900,80*s,1040*s,48*s);
 sticker(c,fitText(c,title,900,size,1040*s,size),w/2,170*s,{size,line:18*s});
 const lines=[t('記了 {count} 個小日常',{count:stats.count})];
 if(stats.firsts)lines.push(t('{count} 個值得記住的第一次',{count:stats.firsts}));
 if(stats.stories.length)lines.push(t('小故事：{names}',{names:stats.stories.join('、')}));
 c.textBaseline='middle';
 lines.forEach((text,i)=>{const y=(300+i*74)*s;paw(c,150*s,y+4*s,34*s,i%2?PEACH:'#F7B7C8',-.2);c.font=font(700,42*s);c.fillStyle=INK;c.fillText(fitText(c,text,700,42*s,900*s,28*s),200*s,y);});
 const thumbs=book.entries.slice(0,12),cols=4,cell=232*s,gap=28*s,gx=(w-(cols*cell+(cols-1)*gap))/2,gy=(300+lines.length*74+40)*s;
 const pics=await Promise.all(thumbs.map(r=>loadImage(r.photo)));
 pics.forEach((image,i)=>{const x=gx+(i%cols)*(cell+gap),y=gy+Math.floor(i/cols)*(cell+gap);c.save();c.shadowColor='rgba(150,80,90,.18)';c.shadowBlur=14*s;rounded(c,x-8*s,y-8*s,cell+16*s,cell+16*s,34*s);c.fillStyle='#FFFFFF';c.fill();c.restore();c.save();rounded(c,x,y,cell,cell,28*s);c.clip();cover(c,image,x,y,cell,cell);c.restore();});
 const logo=await loadImage(logoURL);contain(c,logo,w/2-170*s,h-270*s,340*s,120*s);
 c.font=font(700,36*s);c.fillStyle=SOFT;c.textAlign='center';c.fillText(t('生活的小事，留在小本本。'),w/2,h-110*s);c.textAlign='start';
 heart(c,w/2-300*s,h-110*s,18*s,PINK,-.2);heart(c,w/2+300*s,h-110*s,18*s,PINK,.2);
}

/** 畫一頁。scale 1 是印刷尺寸；App 內預覽用 0.5 左右。 */
export async function renderBookPage(page,{book,petName='',petPhoto='',coverId='',index=1,total=1,scale=1}={}){
 const canvas=document.createElement('canvas');canvas.width=Math.round(BOOK_PAGE.width*scale);canvas.height=Math.round(BOOK_PAGE.height*scale);
 const c=canvas.getContext('2d');if(!c)throw Error(t('暫時無法製作小本本，請再試一次。'));
 const ctx={book,petName,petPhoto,coverId,index,total};
 if(page.kind==='cover')await drawCover(c,ctx,scale);
 else if(page.kind==='pair')await drawPair(c,page,ctx,scale);
 else if(page.kind==='single')await drawSingle(c,page,ctx,scale);
 else await drawEnding(c,ctx,scale);
 return canvas;
}
export const canvasBlob=(canvas,type='image/jpeg',quality=.9)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error(t('暫時無法製作小本本，請再試一次。'))),type,quality));
