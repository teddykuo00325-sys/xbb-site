// Three separate compositions. Geometry is intentionally not shared between styles.
import {t} from './i18n.js?v=audit1117b';
import {wrapDiaryText} from './life-diary-share.js?v=audit1117';
import {bookCoverEntry} from './life-diary-book-model.js?v=book1';
const FONT='"jf-openhuninn-2.0","Noto Sans TC","Microsoft JhengHei",Arial,sans-serif';
const INK='#61473D',MUTED='#806F62';
const cache=new Map();
function load(src){if(!cache.has(src)){const p=new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error(t('無法讀取日記照片。')));i.src=src;});cache.set(src,p);p.catch(()=>cache.delete(src));if(cache.size>64)cache.delete(cache.keys().next().value);}return cache.get(src);}
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function label(c,value,x,y,size=32,{w=1080,color=INK,align='left'}={}){let s=size,v=String(value??'');c.font=`400 ${s}px ${FONT}`;while(s>20&&c.measureText(v).width>w)c.font=`400 ${--s}px ${FONT}`;if(c.measureText(v).width>w){const a=Array.from(v);while(a.length&&c.measureText(a.join('')+'…').width>w)a.pop();v=a.join('')+'…';}c.fillStyle=color;c.textAlign=align;c.textBaseline='top';c.fillText(v,x,y);c.textAlign='left';}
function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function blossom(c,x,y,r,color='#EDBCB5'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;dot(c,x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7,r*.5,color);}dot(c,x,y,r*.28,'#E2AE51');}
function cloud(c,x,y,w){c.fillStyle='#FFFEF8';c.beginPath();c.ellipse(x,y,w*.5,w*.14,0,0,Math.PI*2);c.ellipse(x-w*.2,y-w*.09,w*.23,w*.18,0,0,Math.PI*2);c.ellipse(x+w*.1,y-w*.13,w*.26,w*.2,0,0,Math.PI*2);c.fill();}
function line(c,x,y,w,color='#DDCCB8'){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.stroke();}
function fitPhoto(c,img,x,y,w,h){box(c,x,y,w,h,'#EEE8D8');const k=Math.min(w/img.naturalWidth,h/img.naturalHeight);c.drawImage(img,x+(w-img.naturalWidth*k)/2,y+(h-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);}
async function picture(c,row,x,y,w,h,{angle=0,r=12,tape=false}={}){const img=await load(row.photo);c.save();c.translate(x+w/2,y+h/2);c.rotate(angle);c.shadowColor='#50352C22';c.shadowBlur=16;c.shadowOffsetY=8;box(c,-w/2-18,-h/2-18,w+36,h+50,'#FFFEF9',r+6);c.shadowColor='transparent';c.save();c.beginPath();c.roundRect(-w/2,-h/2,w,h,r);c.clip();fitPhoto(c,img,-w/2,-h/2,w,h);c.restore();if(tape){c.globalAlpha=.85;box(c,-85,-h/2-38,170,48,'#D9C894');c.globalAlpha=1;}c.restore();}
function date(row){return new Date(row.date+'T12:00:00').toLocaleDateString(String(document.documentElement.lang).startsWith('en')?'en':'zh-TW',{month:'short',day:'numeric',weekday:'short'})+' · '+row.time;}
function note(c,row,x,y,w,h,size=34){label(c,date(row),x,y,25,{w,color:MUTED});let top=y+44;if(row.first){label(c,t('第一次'),x,top,25,{w,color:'#B66A4E'});top+=40;}let s=size,lines;do{c.font=`400 ${s}px ${FONT}`;lines=wrapDiaryText(c,row.caption||'',w);if(lines.length*s*1.55<=h-(top-y)||s<=24)break;s-=2;}while(true);const max=Math.max(1,Math.floor((h-(top-y))/(s*1.55)));lines.slice(0,max).forEach((v,i)=>label(c,v+(i===max-1&&lines.length>max?'…':''),x,top+i*s*1.55,s,{w}));}
async function mascot(c,x,y,w,h,{peek=false,flip=false}={}){const img=await load(new URL('./brand/diary-kitten-v1.png',import.meta.url).href);c.save();if(flip){c.translate(x+w,y);c.scale(-1,1);x=0;y=0;}const sourceH=peek?img.naturalHeight*.51:img.naturalHeight;const k=Math.min(w/img.naturalWidth,h/sourceH);c.drawImage(img,0,0,img.naturalWidth,sourceH,x+(w-img.naturalWidth*k)/2,y+(h-sourceH*k)/2,img.naturalWidth*k,sourceH*k);c.restore();}
async function logo(c){const img=await load(new URL('./brand/logo.svg',import.meta.url).href);const k=Math.min(220/img.naturalWidth,70/img.naturalHeight);c.drawImage(img,75,1640,img.naturalWidth*k,img.naturalHeight*k);}
function pageNumber(c,o){label(c,String(o.index).padStart(2,'0'),1160,1660,26,{align:'right',w:100,color:MUTED});}
function title(o){return t('{name}的小本本',{name:o.petName||t('毛孩')});}
function heading(page,o,month){return page.chapter?t('小故事｜{name}',{name:page.chapter}):month(o.book);}

// Photo book: quiet, dominant photograph, margin captions and asymmetric cover.
async function photographic(c,page,o,month){box(c,0,0,1240,1754,'#FFF7ED');box(c,0,0,32,1754,'#C57F67');
 if(page.kind==='cover'){label(c,t('每月小本本'),90,90,30,{color:'#B77660'});label(c,title(o),90,170,78,{w:1040});label(c,month(o.book),90,290,32,{color:MUTED});await picture(c,bookCoverEntry(o.book,o.coverId),90,405,1060,1000,{r:35});blossom(c,1110,325,34);box(c,75,1475,1090,100,'#F4DFCF',22);label(c,t('收進 {count} 個小日常',{count:o.book.entries.length}),105,1505,34,{w:850});await mascot(c,920,1420,190,170,{peek:true});await logo(c);return;}
 label(c,heading(page,o,month),85,70,29,{w:1060,color:'#B77660'});line(c,85,125,1070);
 if(page.kind==='ending'){label(c,t('這個月的{name}',{name:o.petName||t('毛孩')}),85,185,65);label(c,t('記了 {count} 個小日常',{count:o.book.entries.length}),85,285,32,{color:MUTED});const rows=o.book.entries.slice(0,12);for(const [i,r] of rows.entries())await picture(c,r,95+i%3*365,405+Math.floor(i/3)*260,305,195,{r:14});label(c,t('生活的小事，留在小本本。'),85,1510,34);await logo(c);return;}
 if(page.kind==='single'){const r=page.entries[0];c.font=`400 36px ${FONT}`;const th=Math.min(700,Math.max(230,wrapDiaryText(c,r.caption||'',1030).length*56+110+(r.first?40:0))),ph=1480-th;await picture(c,r,90,185,1060,ph-90,{r:32});note(c,r,100,ph+155,1030,th,36);}
 else for(const [i,r] of page.entries.entries()){const y=190+i*700;await picture(c,r,95,y,680,560,{r:25});note(c,r,835,y+50,310,520,31);}
 blossom(c,1110,1590,22);pageNumber(c,o);}

// Handmade: collage cover, loose paper, alternating photo and handwritten-note columns.
function gridPaper(c){box(c,0,0,1240,1754,'#FFF0D1');for(let y=25;y<1754;y+=45)line(c,0,y,1240,'#EFDFBD');box(c,65,55,1110,1650,'#FFF9EA88',20);for(let y=125;y<1650;y+=160){dot(c,45,y,13,'#B99871');dot(c,45,y+35,13,'#B99871');}}
async function handmade(c,page,o,month){gridPaper(c);
 if(page.kind==='cover'){box(c,120,100,980,240,'#F9E2AA',12);label(c,title(o),620,145,72,{w:900,align:'center'});label(c,month(o.book),620,255,32,{align:'center',w:850});const rows=[bookCoverEntry(o.book,o.coverId),...o.book.entries.filter(r=>r.id!==bookCoverEntry(o.book,o.coverId).id)];await picture(c,rows[0],115,440,660,790,{angle:-.065,tape:true});if(rows[1])await picture(c,rows[1],780,565,305,390,{angle:.075,tape:true});if(rows[2])await picture(c,rows[2],715,1080,365,300,{angle:-.045,tape:true});await mascot(c,120,1330,230,250,{flip:true});box(c,400,1460,710,110,'#FFFEF7',8);label(c,t('收進 {count} 個小日常',{count:o.book.entries.length}),430,1494,32,{w:650});await logo(c);return;}
 box(c,100,65,1030,110,'#FFFEF5',8);label(c,heading(page,o,month),130,103,31,{w:960});
 if(page.kind==='ending'){label(c,t('這個月的{name}',{name:o.petName||t('毛孩')}),110,230,58,{w:1020});for(const [i,r] of o.book.entries.slice(0,12).entries())await picture(c,r,120+i%3*355,365+Math.floor(i/3)*260,285,185,{angle:i%2?.045:-.045,tape:true});await mascot(c,120,1430,200,220);label(c,t('生活的小事，留在小本本。'),380,1510,32,{w:750});await logo(c);return;}
 if(page.kind==='single'){const r=page.entries[0];await picture(c,r,130,255,960,700,{angle:-.035,tape:true});box(c,120,1060,1000,515,'#FFFEF7',10);note(c,r,160,1100,920,440,34);blossom(c,1110,1040,30);}
 else for(const [i,r] of page.entries.entries()){const y=265+i*650,left=i===0;await picture(c,r,left?130:610,y,490,470,{angle:left?-.055:.055,tape:true});box(c,left?690:110,y+35,420,485,'#FFFEF5',8);note(c,r,left?720:140,y+65,360,425,30);}
 pageNumber(c,o);}

// Storybook: house/window cover, garden scenes and shaped photo windows.
function garden(c){box(c,0,0,1240,1754,'#E8F1E4');cloud(c,180,160,270);cloud(c,1070,360,280);dot(c,1050,150,75,'#F6D993');c.fillStyle='#CBDDB4';c.beginPath();c.ellipse(220,1760,850,260,0,0,Math.PI*2);c.fill();c.fillStyle='#A9C696';c.beginPath();c.ellipse(1100,1790,700,200,0,0,Math.PI*2);c.fill();for(let i=0;i<7;i++)blossom(c,90+i*175,1585+(i%2)*65,20,i%2?'#F2C7AF':'#FFF4C9');}
async function windowPhoto(c,row,x,y,w,h){box(c,x-18,y-18,w+36,h+36,'#FFFCED',[w/2,w/2,18,18]);c.save();c.beginPath();c.roundRect(x,y,w,h,[w/2,w/2,12,12]);c.clip();fitPhoto(c,await load(row.photo),x,y,w,h);c.restore();box(c,x-40,y+h+10,w+80,28,'#B99E77',8);}
async function storybook(c,page,o,month){garden(c);
 if(page.kind==='cover'){label(c,title(o),620,130,70,{w:1040,align:'center',color:'#466148'});label(c,month(o.book),620,245,32,{align:'center'});c.fillStyle='#D6A37D';c.beginPath();c.moveTo(100,640);c.lineTo(620,330);c.lineTo(1140,640);c.closePath();c.fill();box(c,175,610,890,820,'#F9E8BD',28);await windowPhoto(c,bookCoverEntry(o.book,o.coverId),300,650,640,650);await mascot(c,70,1250,310,350);box(c,430,1440,690,100,'#FFFCEE',35);label(c,t('收進 {count} 個小日常',{count:o.book.entries.length}),775,1473,32,{w:640,align:'center'});await logo(c);return;}
 cloud(c,620,110,870);label(c,heading(page,o,month),620,75,32,{w:790,align:'center',color:'#466148'});
 if(page.kind==='ending'){label(c,t('這個月的{name}',{name:o.petName||t('毛孩')}),620,230,60,{w:1060,align:'center'});for(const [i,r] of o.book.entries.slice(0,12).entries())await windowPhoto(c,r,100+i%4*285,380+Math.floor(i/4)*320,225,240);await mascot(c,465,1360,280,300);label(c,t('生活的小事，留在小本本。'),620,1660,30,{align:'center',w:1000});return;}
 if(page.kind==='single'){const r=page.entries[0];await windowPhoto(c,r,225,235,790,650);box(c,135,1005,970,500,'#FFFCED',40);note(c,r,185,1050,870,410,34);await mascot(c,920,1450,210,230);}
 else{for(const [i,r] of page.entries.entries()){const x=115+i*565;await windowPhoto(c,r,x,270,445,580);box(c,x-15,960,475,540,'#FFFCED',35);note(c,r,x+20,1005,405,450,31);}await mascot(c,500,1505,200,215,{peek:true});}
 pageNumber(c,o);}
export async function drawDistinctBook(c,page,o,{monthLabel,style}){if(style==='handmade')await handmade(c,page,o,monthLabel);else if(style==='storybook')await storybook(c,page,o,monthLabel);else await photographic(c,page,o,monthLabel);}
