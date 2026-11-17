// 每月小本本：生活日記上方的書架、翻頁閱讀、存 A5 PDF、分享單頁。
// 只在 App 內顯示，不發通知；「新」標記與封面選擇只存在這台裝置的瀏覽器儲存（讀不到就用預設）。
import {t, isEnglish} from './i18n.js?v=audit1117b';
import {TaskSheet} from './navigation-shell.js?v=8f5745b7843b';
import {diaryBooks,bookPagePlan,bookCoverEntry,BOOK_MIN_ENTRIES} from './life-diary-book-model.js?v=book1';
import {renderBookPage,canvasBlob,bookMonthLabel,BOOK_STYLES} from './life-diary-book-photo.js?v=photoBook1';
import {jpegPagesToPdf} from './pdf-a5.js?v=book1';
import {shareDiaryPNG} from './life-diary-share.js?v=audit1117';

const SEEN='xbb.diaryBook.seen.',COVER='xbb.diaryBook.cover.';
const DESIGN='xbb.diaryBook.design.',STYLE_NAMES={photo:'溫暖攝影書',handmade:'手作生活手帳',storybook:'可愛插畫繪本'};
const readStyle=id=>{const value=readJSON(DESIGN+id,'photo');return BOOK_STYLES.includes(value)?value:'photo';};
const readJSON=(key,fallback)=>{try{const v=JSON.parse(globalThis.localStorage?.getItem(key)||'null');return v??fallback;}catch{return fallback;}};
const writeJSON=(key,value)=>{try{globalThis.localStorage?.setItem(key,JSON.stringify(value));}catch{/* 只是方便用，存不了就算了 */}};
const signature=(book,extra)=>[book.id,...book.entries.map(r=>r.id+r.editedAt),extra].join('|');
const thumbs=new Map();
async function coverThumb(book,options){
 const key=signature(book,options.petName+options.coverId+(options.petPhoto||'').length+options.style);
 if(!thumbs.has(key)){thumbs.set(key,renderBookPage({kind:'cover'},{...options,book,scale:.24}).then(c=>c.toDataURL('image/jpeg',.86)));if(thumbs.size>40)thumbs.delete(thumbs.keys().next().value);}
 const pending=thumbs.get(key);pending.catch(()=>thumbs.delete(key));return pending;
}
const fileName=(petName,book)=>`${t('{name}的小本本',{name:petName||t('毛孩')}).replace(/’/g,"'").replace(/[\\/:*?"<>|\r\n]/g,'_')}-${book.month}${book.numbered?'-'+book.volume:''}`;

function ShelfBook({react:R,book,options,fresh,onOpen,progress}){
 const h=R.createElement,[src,setSrc]=R.useState('');
 R.useEffect(()=>{let live=true;setSrc('');coverThumb(book,options).then(url=>{if(live)setSrc(url);},()=>{});return()=>{live=false;};},[signature(book,options.petName+options.coverId+(options.petPhoto||'').length+options.style)]);
 const label=bookMonthLabel(book);
 return h('button',{type:'button',className:'ldb-book'+(progress?' is-progress':''),onClick:onOpen,'aria-label':progress?t('先看看 {label} 的小本本（還在收集中）',{label}):t('打開 {label} 的小本本',{label})},
  h('span',{className:'ldb-cover'},src?h('img',{src,alt:''}):h('span',{className:'ldb-cover-loading'}),fresh&&h('span',{className:'ldb-new'},t('新')),progress&&h('span',{className:'ldb-tag'},t('收集中'))),
  h('span',{className:'ldb-label'},label),
  h('small',null,t('{count} 篇',{count:book.entries.length})));
}

/** 已成冊但這台裝置還沒打開過的本數（給「全部」分頁的精簡日記列顯示「新的小本本」）。 */
export function freshBookCount(rows,catId,today){const seen=readJSON(SEEN+catId,[]);try{return diaryBooks(rows,{today}).books.filter(b=>!seen.includes(b.id)).length;}catch{return 0;}}

export function DiaryBookshelf({react:R,rows,catId,petName,petPhoto,today,layer}){
 const h=R.createElement,[open,setOpen]=R.useState(null),[seen,setSeen]=R.useState(()=>readJSON(SEEN+catId,[])),[covers,setCovers]=R.useState(()=>readJSON(COVER+catId,{}));
 const [design,setDesign]=R.useState(()=>readStyle(catId));
 R.useEffect(()=>{setSeen(readJSON(SEEN+catId,[]));setCovers(readJSON(COVER+catId,{}));setDesign(readStyle(catId));setOpen(null);},[catId]);
 const {books,progress}=R.useMemo(()=>diaryBooks(rows,{today}),[rows,today]);
 if(!rows.length)return null;
 const options=book=>({petName,petPhoto,style:design,coverId:coverOf(book)});
 const progressBook=progress&&progress.count?{id:progress.month+'-'+progress.volume+'-draft',month:progress.month,volume:progress.volume,numbered:progress.volume>1,entries:progress.entries,closed:false,draft:true}:null;
 const show=book=>{setOpen(book);if(!book.draft&&!seen.includes(book.id)){const next=[...seen,book.id].slice(-200);setSeen(next);writeJSON(SEEN+catId,next);}};
 // 2026-11-17：收集中那本的 id 帶 -draft，月底成冊後沒有；封面選擇一律用不帶 -draft 的 key，成冊後才不會不見（舊的 -draft 選擇也讀得到）。
 const coverKey=book=>String(book.id).replace(/-draft$/,''),coverOf=book=>covers[coverKey(book)]||covers[book.id]||'';
 const chooseCover=(book,id)=>{const next={...covers,[coverKey(book)]:id};setCovers(next);writeJSON(COVER+catId,next);};
 // 2026-11-17：英文月份用名稱（November），不是括號裡的數字。
 const [,mn]=String(today).split('-').map(Number),m=isEnglish()?new Date(2000,mn-1,1).toLocaleString('en-US',{month:'long'}):mn;
 const hint=!progress?t('每個月記滿 {min} 篇，月底就會自動收成一本。',{min:BOOK_MIN_ENTRIES})
  :progress.need?t('{month} 月再記 {need} 篇，月底就會收成一本。',{need:progress.need,month:m})
  :t('{month} 月已經可以成冊，月底自動收好；滿 12 篇會先收成一本。',{month:m});
 return h('section',{className:'ldb-shelf','aria-label':t('每月小本本')},
  h('style',null,STYLE),
  h('div',{className:'ldb-head'},h('h3',null,t('每月小本本')),h('p',{className:'microcopy left'},hint)),
  h('div',{className:'ldb-designs',role:'group','aria-label':t('小本本風格')},BOOK_STYLES.map(id=>h('button',{type:'button',key:id,'aria-pressed':design===id,onClick:()=>{setDesign(id);writeJSON(DESIGN+catId,id);}},t(STYLE_NAMES[id])))),
  h('div',{className:'ldb-row'},
   progressBook&&h(ShelfBook,{react:R,key:progressBook.id,book:progressBook,options:options(progressBook),progress:true,onOpen:()=>show(progressBook)}),
   books.map(book=>h(ShelfBook,{react:R,key:book.id,book,options:options(book),fresh:!seen.includes(book.id),onOpen:()=>show(book)})),
   !books.length&&!progressBook&&h('p',{className:'microcopy left'},t('還沒有成冊的小本本。'))),
  open&&layer(h(BookViewer,{react:R,book:open,petName,petPhoto,design,coverId:coverOf(open),onCover:id=>chooseCover(open,id),onClose:()=>setOpen(null)})));
}

function BookViewer({react:R,book,petName,petPhoto,design,coverId,onCover,onClose}){
 const h=R.createElement,plan=R.useMemo(()=>bookPagePlan(book),[book]),[pages,setPages]=R.useState([]),[index,setIndex]=R.useState(0);
 const [busy,setBusy]=R.useState(''),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[picking,setPicking]=R.useState(false);
 const strip=R.useRef(null),alive=R.useRef(true),ticket=R.useRef(0);
 const icon=name=>h('svg',{viewBox:'0 0 24 24',width:20,height:20,'aria-hidden':true,fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round',strokeLinejoin:'round'},h('path',{d:ICONS[name]}));
 R.useEffect(()=>{alive.current=true;return()=>{alive.current=false;ticket.current++;};},[]);
 const options=i=>({book,petName,petPhoto,coverId,style:design,index:i+1,total:plan.length});
 R.useEffect(()=>{const seq=++ticket.current;setPages(Array(plan.length).fill(''));
  (async()=>{for(const [i,page] of plan.entries()){try{const canvas=await renderBookPage(page,{...options(i),scale:.5});const url=canvas.toDataURL('image/jpeg',.88);if(!alive.current||seq!==ticket.current)return;setPages(p=>{const next=p.length===plan.length?[...p]:Array(plan.length).fill('');next[i]=url;return next;});}catch(e){if(alive.current&&seq===ticket.current)setError(e.message||t('暫時無法製作小本本，請再試一次。'));return;}}})();
 },[plan,coverId,petName,petPhoto,design]);
 const go=i=>{const next=Math.max(0,Math.min(plan.length-1,i));setIndex(next);const el=strip.current?.children[next];el?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});};
 const onScroll=()=>{const el=strip.current;if(!el)return;const next=Math.round(el.scrollLeft/Math.max(1,el.clientWidth));if(next!==index&&next>=0&&next<plan.length)setIndex(next);};
 async function savePdf(){
  if(busy)return;setError('');setNotice('');
  try{
   const jpegs=[];
   for(const [i,page] of plan.entries()){
    setBusy(t('正在製作 PDF…（{done}/{total} 頁）',{done:i+1,total:plan.length}));
    const blob=await canvasBlob(await renderBookPage(page,{...options(i),scale:1}),'image/jpeg',.9);
    jpegs.push(new Uint8Array(await blob.arrayBuffer()));
    if(!alive.current)return;
   }
   const pdf=jpegPagesToPdf(jpegs,{title:t('{name}的小本本',{name:petName||t('毛孩')})+' '+bookMonthLabel(book),author:petName||''});
   const url=URL.createObjectURL(pdf),a=document.createElement('a');a.href=url;a.download=fileName(petName,book)+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
   if(alive.current)setNotice(t('已產生 A5 PDF（{pages} 頁），可以存到手機或拿去列印。',{pages:plan.length}));
  }catch(e){if(alive.current)setError(e.message||t('暫時無法製作小本本，請再試一次。'));}
  finally{if(alive.current)setBusy('');}
 }
 async function sharePage(){
  if(busy)return;setError('');setNotice('');setBusy(t('正在準備這頁圖片…'));
  try{const blob=await canvasBlob(await renderBookPage(plan[index],{...options(index),scale:1}),'image/png');const result=await shareDiaryPNG(blob,`${fileName(petName,book)}-${index+1}.png`);if(alive.current)setNotice(result?.saved?t('已儲存這頁圖片。'):t('已開啟分享選單。'));}
  catch(e){if(alive.current&&e?.name!=='AbortError')setError(e.message||t('暫時無法分享，請再試一次。'));}
  finally{if(alive.current)setBusy('');}
 }
 const title=book.draft?t('{label}（收集中）',{label:bookMonthLabel(book)}):bookMonthLabel(book);
 const coverRow=bookCoverEntry(book,coverId);
 return h(TaskSheet,{react:R,title,onClose,disabled:!!busy},h('div',{className:'ldb-viewer'},
  h('style',null,STYLE),
  book.draft&&h('p',{className:'microcopy left'},book.entries.length<BOOK_MIN_ENTRIES?(BOOK_MIN_ENTRIES-book.entries.length===1?t('再記 1 篇，月底就能成冊；現在看到的是預覽。'):t('再記 {need} 篇，月底就能成冊；現在看到的是預覽。',{need:BOOK_MIN_ENTRIES-book.entries.length})):t('這個月還在收集中，月底會自動收成一本；現在看到的是預覽。')),
  h('div',{className:'ldb-strip',ref:strip,onScroll,tabIndex:0,'aria-label':t('小本本頁面，可以左右滑動')},
   plan.map((page,i)=>h('div',{className:'ldb-page',key:i},pages[i]?h('img',{src:pages[i],alt:i===0?t('封面'):i===plan.length-1?t('封底'):t('第 {n} 頁',{n:i+1})}):h('span',{className:'ldb-page-loading'},t('正在排版…'))))),
  h('div',{className:'ldb-nav'},
   h('button',{type:'button',className:'secondary-btn',onClick:()=>go(index-1),disabled:index===0,'aria-label':t('上一頁')},'‹'),
   h('span',{'aria-live':'polite'},t('{n} / {total} 頁',{n:index+1,total:plan.length})),
   h('button',{type:'button',className:'secondary-btn',onClick:()=>go(index+1),disabled:index>=plan.length-1,'aria-label':t('下一頁')},'›')),
  busy&&h('p',{role:'status'},busy),notice&&!busy&&h('p',{role:'status'},notice),error&&h('p',{role:'alert',className:'ldb-error'},error),
  h('div',{className:'ldb-actions'},
   h('button',{type:'button',className:'primary ldb-main',onClick:savePdf,disabled:!!busy},icon('pdf'),h('span',null,t('存成 PDF（A5）'))),
   h('div',{className:'ldb-chips'},
    h('button',{type:'button',className:'ldb-chip',onClick:sharePage,disabled:!!busy},icon('share'),h('span',null,t('分享這頁圖片'))),
    h('button',{type:'button',className:'ldb-chip ldb-cover-btn',onClick:()=>setPicking(v=>!v),disabled:!!busy,'aria-expanded':picking},icon('photo'),h('span',null,t('換封面照片'))))),
  picking&&h('div',{className:'ldb-pick',role:'group','aria-label':t('選一張當封面')},book.entries.map(row=>h('button',{type:'button',key:row.id,'aria-pressed':row.id===coverRow?.id,'aria-label':t('用 {date} 的照片當封面',{date:row.date}),onClick:()=>{onCover(row.id);setPicking(false);go(0);}},h('img',{src:row.photo,alt:''})))),
  h('p',{className:'microcopy left'},t('PDF 是 A5 直式（148 × 210 mm），每頁就是畫面上看到的樣子。'))));
}

// 線條小圖示（currentColor），跟著按鈕顏色走，深色模式也看得清楚。
const ICONS={
 pdf:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5',
 share:'M12 15V4M8 8l4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6',
 photo:'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 16l4.5-4.5 3 3 2-2L20 18M15.5 9.5h.01'
};
const STYLE=`.ldb-designs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.ldb-designs button{min-height:44px;padding:10px 14px;border:1px solid #8b9f91;border-radius:8px;background:var(--theme-card,#f5f1e7);color:var(--theme-ink,#183f35);font:inherit;font-size:14px}.ldb-designs button[aria-pressed=true]{background:#183f35;color:#fff;border-color:#183f35}.ldb-designs button:focus-visible{outline:3px solid #aa8550;outline-offset:2px}.ldb-shelf{margin:4px 0 18px}.ldb-head h3{margin:0 0 2px;font-size:17px}.ldb-head p{margin:0 0 10px}
.ldb-row{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 10px;scroll-snap-type:x proximity;touch-action:pan-x pan-y}
.ldb-book{flex:0 0 auto;width:108px;display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:0;border:0;background:none;color:inherit;text-align:left;scroll-snap-align:start;min-height:44px;cursor:pointer}
.ldb-cover{position:relative;display:block;width:108px;aspect-ratio:1240/1754;border-radius:10px;overflow:hidden;background:#fce1ea;box-shadow:0 4px 12px rgba(110,70,54,.18)}
.ldb-cover img{display:block;width:100%;height:100%;object-fit:cover}.ldb-cover-loading{display:block;width:100%;height:100%;background:linear-gradient(110deg,#fce1ea 40%,#fff3f6 50%,#fce1ea 60%)}
.ldb-book.is-progress .ldb-cover{box-sizing:border-box;padding:4px;border:2px dashed #e58aa9;border-radius:13px;background:#fff6f9;box-shadow:none}
.ldb-book.is-progress .ldb-cover img,.ldb-book.is-progress .ldb-cover-loading{border-radius:8px}
.ldb-tag{position:absolute;left:8px;bottom:8px;padding:2px 8px;border-radius:99px;background:#fff;color:#c2557d;font-size:11px;font-weight:800;box-shadow:0 1px 4px rgba(110,70,54,.18)}
:where(html[data-theme="dark"]) .ldb-book.is-progress .ldb-cover{background:#3a2c33;border-color:#b86f8b}
.ldb-new{position:absolute;top:6px;right:6px;padding:2px 8px;border-radius:99px;background:#e06c93;color:#fff;font-size:12px;font-weight:800}
.ldb-label{font-size:13px;font-weight:700;line-height:1.3}.ldb-book small{font-size:13px;opacity:.92}
.ldb-viewer{display:flex;flex-direction:column;gap:12px;padding:12px 18px 20px;min-width:0}
.ldb-viewer button{min-height:44px;border:1px solid #b9a88f;border-radius:12px;padding:10px 12px;background:var(--theme-card,#fff9ef);color:var(--theme-ink,#293b70);font:inherit;font-weight:700}
.ldb-viewer button.primary.ldb-main{background:#a45c2e!important;color:#fff9ef!important;border-color:#a45c2e!important}
.ldb-viewer button:disabled{opacity:.45}.ldb-viewer p{margin:0;line-height:1.6}
.ldb-viewer .ldb-pick button{padding:0}
.ldb-strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:0;border-radius:12px;touch-action:pan-x pan-y;scrollbar-width:none}.ldb-strip::-webkit-scrollbar{display:none}
.ldb-page{flex:0 0 100%;scroll-snap-align:center;display:flex;justify-content:center}
.ldb-page img,.ldb-page-loading{display:block;width:min(100%,420px);aspect-ratio:1240/1754;border-radius:8px;box-shadow:0 6px 18px rgba(110,70,54,.18);background:#fffbf3}
.ldb-page-loading{display:flex;align-items:center;justify-content:center;color:#b08b74;font-size:14px}
.ldb-nav{display:flex;align-items:center;justify-content:center;gap:18px;font-weight:700}.ldb-viewer .ldb-nav button{width:46px;min-width:46px;height:46px;padding:0;border-radius:50%;font-size:24px;line-height:1}
.ldb-actions{display:flex;flex-direction:column;gap:10px}
.ldb-viewer .ldb-main{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:999px;font-size:16px;box-shadow:0 4px 12px rgba(164,92,46,.25)}
.ldb-chips{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ldb-viewer .ldb-chip{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:8px 12px;border:1.5px solid #f3c2d2;border-radius:999px;background:#fdeef3;color:#a2486a;font-size:15px;min-width:0;text-align:center;line-height:1.25}
.ldb-viewer .ldb-chip[aria-expanded=true]{background:#f7cfdc;border-color:#e58aa9}
.ldb-viewer .ldb-chip svg,.ldb-viewer .ldb-main svg{flex:0 0 auto}
:where(html[data-theme="dark"]) .ldb-viewer .ldb-chip{background:#4a3540;border-color:#7d5466;color:#f6c4d4}
:where(html[data-theme="dark"]) .ldb-viewer .ldb-chip[aria-expanded=true]{background:#5c3f4c}
@media (max-width:340px){.ldb-chips{grid-template-columns:1fr}}
.ldb-pick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ldb-pick button{padding:0;border:3px solid transparent;border-radius:10px;overflow:hidden;background:none;aspect-ratio:1;min-height:44px}
.ldb-pick button[aria-pressed=true]{border-color:#e06c93}.ldb-pick img{display:block;width:100%;height:100%;object-fit:cover}
.ldb-cover{border-radius:3px;background:#e8e8dd;box-shadow:0 5px 15px #183f3526}.ldb-cover-loading{background:#e8e8dd}.ldb-book.is-progress .ldb-cover{border-color:#789e8e;background:#f5f1e7;border-radius:5px}.ldb-book.is-progress .ldb-cover img{border-radius:2px}.ldb-tag{color:#183f35}.ldb-new{background:#183f35}.ldb-viewer button.primary.ldb-main{background:#183f35!important;border-color:#183f35!important}.ldb-viewer .ldb-chip{border-color:#789e8e;background:var(--theme-card,#f5f1e7);color:var(--theme-ink,#183f35)}.ldb-pick button[aria-pressed=true]{border-color:#183f35}.ldb-error{color:var(--theme-danger,#9d2c24)}`;
