import {t,tn} from './i18n.js?v=audit1117b';
import {cuteActionLabel,cuteActionIconProps} from './cute-action-icons.js?v=audit1117b';
import {TaskSheet} from './navigation-shell.js?v=8f5745b7843b';
import {requireActivePet,petArchiveGeneration} from './pet-archive.js?v=8f5745b7843b';
import {diaryEntriesForCat,normalizeDiaryEntry,upsertDiaryEntry,removeDiaryEntry,compressDiaryPhoto} from './life-diary-model.js?v=1';
import {DiaryShare} from './life-diary-share.js?v=audit1117';
import {generateDiaryPhotoLine,diaryPhotoPhoneState} from './life-diary-ai.js?v=photo-simplify1';
import {prepareDiaryDraftScope} from './life-diary-draft.js?v=1';
import {DiaryBookshelf,freshBookCount} from './life-diary-book-ui.js?v=audit1117b';
import {DIARY_PAGE_STYLE} from './life-diary-page-style.js?v=cute1';
const welcomeCat=new URL('./brand/diary-kitten-v1.png',import.meta.url).href;

// 封面貼紙只用飼主自己上傳的頭像（JPEG），預設插畫頭像不算。
const ownPhoto=(data,catId)=>{const row=(data?.multiCat?.cats||[]).find(c=>c.id===catId),photo=(!row||catId==='cat-original'?data?.cat:row.data?.cat)?.photo;return typeof photo==='string'&&/^data:image\/jpeg;base64,/.test(photo)?photo:'';};
export function LifeDiary({react:R,store,catId,petName,today,portal,startAdd=false,onStarted}){
 const h=R.createElement,root=store.rootStore||store,view=R.useSyncExternalStore(root.subscribe,root.get);
 const [editor,setEditor]=R.useState(null),[share,setShare]=R.useState(null),[story,setStory]=R.useState(''),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[deleting,setDeleting]=R.useState(null),[limit,setLimit]=R.useState(12);
 const lock=R.useRef(false),file=R.useRef(null),mounted=R.useRef(true),ticket=R.useRef(0),restore=R.useRef(view.restoreGeneration||0);
 const host=R.useRef(null),form=R.useRef(null);
 // Keep the action row above an overlay keyboard; only the fields scroll.
 R.useEffect(()=>{if(!editor)return;const overlay=form.current?.closest('.task-sheet-overlay'),viewport=window.visualViewport;if(!overlay||!viewport)return;
  const update=()=>{const box=overlay.parentElement.getBoundingClientRect(),scale=box.height/Math.max(1,overlay.parentElement.clientHeight);overlay.style.bottom=Math.max(0,(window.innerHeight-viewport.offsetTop-viewport.height)/(scale||1))+'px';};
  viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);update();
  return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);overlay.style.removeProperty('bottom');};
 },[!!editor]);
 const layer=content=>portal&&host.current?portal(content,host.current.closest('.navigation-route-surface')||host.current.closest('.inpaw-app')||document.body):content;
 R.useEffect(()=>{prepareDiaryDraftScope(root,view.restoreGeneration);},[root,view.restoreGeneration]);
 R.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;ticket.current++;};},[]);
 R.useEffect(()=>{if(restore.current!==(view.restoreGeneration||0)){ticket.current++;setEditor(null);setShare(null);setDeleting(null);setError('');setNotice('');restore.current=view.restoreGeneration||0;}},[view.restoreGeneration]);
 const rows=diaryEntriesForCat(view.data,catId),selectedStory=story&&rows.some(r=>r.story===story)?story:'',shown=selectedStory?rows.filter(r=>r.story===selectedStory):rows;
 R.useEffect(()=>{if(story!==selectedStory){setStory(selectedStory);setLimit(12);}},[story,selectedStory]);
 const generation=()=>petArchiveGeneration(view.data.multiCat?.cats.find(p=>p.id===catId));
 const guard=(data,gen)=>{if((root.get().restoreGeneration||0)!==restore.current)throw Error(t('資料已還原，請重新開啟日記。'));requireActivePet(data,catId,gen);};
 const open=entry=>{setError('');setEditor({value:entry?{...entry}:{photo:'',caption:'',date:today,time:new Date().toTimeString().slice(0,5),first:false,story:story||''},previous:entry||null,generation:generation()});};
 const change=patch=>setEditor(v=>v?{...v,value:{...v.value,...patch}}:v);
 // 從「全部」分頁的精簡日記列按「＋ 照片」過來時，直接打開新增畫面。
 R.useEffect(()=>{if(startAdd){open(null);onStarted?.();}},[startAdd]);
 // 2026-11-17：保存／刪除提示原本在首屏外（top 1048 > 視窗 844），改成浮在上方的短暫提示。
 R.useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>{if(mounted.current)setNotice('');},4000);return()=>clearTimeout(timer);},[notice]);
 const close=()=>{if(lock.current)return;if(editor&&JSON.stringify(editor.value)!==JSON.stringify(editor.previous||{photo:'',caption:'',date:today,time:editor.value.time,first:false,story:story||''})&&!window.confirm(t('離開這筆尚未儲存的日記？')))return;ticket.current++;setEditor(null);setError('');};
 async function choose(source){const seq=++ticket.current;setBusy(true);lock.current=true;setError('');try{const photo=await compressDiaryPhoto(source);if(mounted.current&&ticket.current===seq)change({photo});}catch(e){if(mounted.current)setError(tn(e.message)||t('照片無法讀取，請再試一次。'));}finally{lock.current=false;if(mounted.current)setBusy(false);}}
 async function pick(){if(lock.current)return;if(!window.inpawPickPhoto){file.current?.click();return;}const seq=++ticket.current;lock.current=true;setBusy(true);try{const result=await window.inpawPickPhoto();if(mounted.current&&ticket.current===seq&&result?.dataUrl)await choose(result.dataUrl);}catch(e){if(mounted.current)setError(tn(e.message)||t('照片無法讀取，請再試一次。'));}finally{lock.current=false;if(mounted.current)setBusy(false);}}
 async function save(e){e.preventDefault();if(lock.current||!editor)return;if(!editor.value.photo){setError(t('先選一張照片，再收進小本本。'));form.current?.querySelector('.ld-editor-fields>button')?.focus();return;}lock.current=true;setBusy(true);setError('');try{const current=editor,entry=normalizeDiaryEntry(current.value,{catId,now:new Date(),previous:current.previous});await root.atomic(data=>{guard(data,current.generation);return upsertDiaryEntry(data,entry,{catId,previous:current.previous});});if(mounted.current){setEditor(null);setNotice(t('已收進小本本。'));}}catch(e){if(mounted.current)setError(tn(e.message)||t('日記尚未儲存，請重試。'));}finally{lock.current=false;if(mounted.current)setBusy(false);}}
 async function remove(){if(lock.current||!deleting)return;lock.current=true;setBusy(true);setError('');try{if(window.__deleteSafety)await window.__deleteSafety.guard(t('刪除一篇生活日記'));const target=deleting;await root.atomic(data=>{guard(data,target.generation);return removeDiaryEntry(data,target.entry.id,{catId,previous:target.entry});});setDeleting(null);if(window.__deleteSafety?.snack)window.__deleteSafety.snack(t('日記已刪除。'));else setNotice(t('日記已刪除。可到設定復原最近一次刪除。'));}catch(e){setError(tn(e.message)||t('日記尚未儲存，請重試。'));}finally{lock.current=false;setBusy(false);}}
 const button=(label,fn,cls='secondary-btn',disabled=false)=>h('button',{type:'button',className:cls,onClick:fn,disabled},label);
 const field=(label,props)=>h('label',{className:'field'},h('span',null,label),h('input',props));
 return h('section',{ref:host,className:'life-diary','aria-label':t('生活日記')},
  h('style',null,STYLE+PHOTO_STYLE+DIARY_PAGE_STYLE+EDITOR_STYLE),h('div',{className:'ld-heading'},h('div',null,h('p',{className:'microcopy left'},t('生活的小事，都在這裡')),h('h2',null,t('{name}的小本本',{name:petName}))),h('img',{className:'ld-welcome-cat',src:welcomeCat,alt:'','aria-hidden':true}),button(cuteActionLabel(R,'diary-add',t('＋ 記一筆照片')),()=>open(null),'primary')),
  h('p',{className:'microcopy left'},t('照片留一句，只有你知道的事。生活日記不納入看診摘要。')),
  h(DiaryBookshelf,{react:R,rows,catId,petName,petPhoto:ownPhoto(view.data,catId),today,layer}),
  rows.some(r=>r.story)&&h('label',{className:'field'},h('span',null,t('翻翻小故事')),h('select',{value:selectedStory,onChange:e=>{setStory(e.target.value);setLimit(12);}},h('option',{value:''},t('全部日常')),[...new Set(rows.map(r=>r.story).filter(Boolean))].map(v=>h('option',{key:v,value:v},v)))),
  notice&&h('p',{role:'status',className:'ld-toast'},notice),!editor&&!deleting&&error&&h('p',{role:'alert'},error),
  rows.length>0&&h('div',{className:'ld-journal-title'},h('h3',null,selectedStory||t('全部日常')),h('span',null,t('{count} 篇',{count:shown.length}))),
  !shown.length?h('div',{className:'ld-empty'},h('p',null,t('還沒有日記，從今天想留下的一張照片開始。'))):shown.slice(0,limit).map(entry=>h('article',{className:'ld-entry',key:entry.id},h('div',{className:'ld-entry-head'},h('time',null,entry.date.replaceAll('-','/'),' · ',entry.time),entry.first&&h('span',{className:'ld-first'},t('第一次'))),h('img',{className:'ld-photo',src:entry.photo,alt:t('{name}的日記照片',{name:petName}),loading:'lazy'}),h('p',{className:'ld-caption'},entry.caption),entry.story&&button(entry.story,()=>{setStory(entry.story);setLimit(12);},'text-btn'),h('div',{className:'ld-actions'},button(t('分享這一頁'),()=>{setShare(entry);setError('');}),button(t('編輯'),()=>open(entry),'text-btn'),button(t('刪除'),()=>{setDeleting({entry,generation:generation()});setError('');},'text-btn')))),
  shown.length>limit&&button(t('顯示更多日記'),()=>setLimit(v=>v+12)),h('p',{className:'microcopy'},t('不必每天記，想留下的時候就記。照片壓縮後保存在此裝置，備份會一起帶走。')),
  editor&&layer(h(TaskSheet,{react:R,title:t('留住這個小日常'),onClose:close,disabled:busy},h('form',{ref:form,className:'ld-form ld-edit-form',onSubmit:save},
   h('div',{className:'ld-editor-fields'},
   editor.value.photo&&h('img',{className:'ld-photo',src:editor.value.photo,alt:t('待儲存的日記照片')}),button(editor.value.photo?t('換一張照片'):t('選一張照片'),pick,'secondary-btn',busy),
   h('input',{ref:file,type:'file',accept:'image/*',hidden:true,onChange:e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>20*1024*1024){setError(t('照片請小於 20 MB。'));return;}const url=URL.createObjectURL(f);choose(url).finally(()=>URL.revokeObjectURL(url));}}),
   h('label',{className:'field'},h('span',null,t('照片裡沒看出來的是？')),h('textarea',{value:editor.value.caption,maxLength:280,required:true,disabled:busy,placeholder:t('例如：我一開會，牠就來占位子。'),onChange:e=>change({caption:e.target.value})})),
   editor.value.photo&&h('details',{className:'ld-ai-details'},h('summary',null,t('幫我起個頭（AI）')),h(DiaryPhotoHelper,{react:R,photo:editor.value.photo,caption:editor.value.caption,locked:busy,onApply:line=>change({caption:line})})),
   h('details',{className:'ld-extra-details'},h('summary',null,t('更多細節（選填）')),h('div',{className:'ld-extra-fields'},
   field(t('日期'),{type:'date',value:editor.value.date,max:today,required:true,disabled:busy,onChange:e=>change({date:e.target.value})}),field(t('時間'),{type:'time',value:editor.value.time,required:true,disabled:busy,onChange:e=>change({time:e.target.value})}),
   field(t('小故事名稱（選填）'),{type:'text',value:editor.value.story,maxLength:80,disabled:busy,placeholder:t('例如：鍵盤室友'),onChange:e=>change({story:e.target.value})}),
   h('label',{className:'ld-check'},h('input',{type:'checkbox',checked:editor.value.first,disabled:busy,onChange:e=>change({first:e.target.checked})}),t('這是值得記住的第一次'))))),
   h('div',{className:'ld-editor-actions'},error&&h('p',{role:'alert'},error),h('button',{type:'submit',className:'primary',disabled:busy},cuteActionLabel(R,'diary-save',busy?t('正在保存…'):t('收進今天的小本本'))),button(t('取消'),close,'text-btn',busy))))),
  share&&h(DiaryShare,{react:R,entry:share,petName,simple:true,onClose:()=>setShare(null)}),
  deleting&&layer(h(TaskSheet,{react:R,title:t('刪除這篇日記？'),disabled:busy,onClose:()=>{if(!busy)setDeleting(null);}},h('div',{className:'ld-form'},h('p',null,deleting.entry.caption),error&&h('p',{role:'alert'},error),button(t('先不刪'),()=>setDeleting(null),'secondary-btn',busy),button(t('確認刪除'),remove,'primary danger',busy))))
 );
}
const STYLE=`.life-diary{margin:8px 0 24px}.ld-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ld-heading h2{margin:4px 0 10px}.ld-heading button{min-height:44px}.ld-entry{margin:20px 0;background:var(--surface,#fff9ef);border:1px solid var(--line,#decfbd);border-radius:17px;overflow:hidden}.ld-entry-head{padding:12px 16px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px}.ld-photo{display:block;width:100%;max-height:450px;object-fit:contain;background:var(--soft-bg,#eee3d5)}.ld-caption{font-size:18px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:16px}.ld-first{border-radius:14px;padding:3px 9px;background:#f4dfc4;color:#75421f}.ld-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:0 16px 14px}.ld-actions button{min-height:44px}.ld-empty{padding:24px 12px;text-align:center}.ld-form{padding:18px;display:grid;gap:16px;min-width:0}.ld-form .field{display:grid;gap:8px;min-width:0}.ld-form input:not([type=checkbox]),.ld-form textarea,.life-diary select{width:100%;min-width:0;font:inherit;padding:12px;border-radius:10px;border:1px solid #b9a88f;background:var(--surface,#fff9ef);color:inherit}.ld-form textarea{min-height:120px;resize:vertical}.ld-check{display:flex;align-items:center;gap:10px;min-height:44px}.ld-form button{min-height:44px;border:1px solid #b9a88f;border-radius:12px;padding:12px;background:var(--theme-card,#fff9ef);color:var(--theme-ink,#293b70)}.ld-form button.primary{background:#a45c2e!important;color:#fff9ef!important;border-color:#a45c2e}.ld-form button.primary.danger{background:#9d3026!important;color:#fff9ef!important;border-color:#9d3026}.ld-form button:disabled{opacity:.55}.ld-form .text-btn{background:transparent}.ld-form{background:var(--theme-card,#fff9ef);color:var(--theme-ink,#293b70)}html[data-theme=dark] .ld-form{background:#302b25;color:#f3ece3}html[data-theme=dark] .ld-form button:not(.primary){background:#3c342b;color:#f3ece3}.ld-record-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 18px}.ld-record-tabs button{min-height:44px}.ld-record-tabs button[aria-pressed=true]{background:#a45c2e;color:#fff9ef}html[data-theme=dark] .ld-entry,html[data-theme=dark] .ld-form input:not([type=checkbox]),html[data-theme=dark] .ld-form textarea,html[data-theme=dark] .life-diary select{background:#302b25;border-color:#665747}html[data-theme=dark] .ld-photo{background:#24211d}`;

const EDITOR_STYLE=`
.task-sheet-panel:has(.ld-edit-form)>.task-sheet-content{display:flex;flex-direction:column;overflow:hidden;padding-bottom:0}
.ld-form.ld-edit-form{display:flex;flex-direction:column;gap:0;padding:0;min-height:0;flex:1}
.ld-editor-fields{display:grid;align-content:start;flex:1;gap:12px;padding:14px 18px 18px;min-height:0;overflow:auto;overscroll-behavior:contain;scroll-padding:12px}
.ld-edit-form .ld-editor-fields>.ld-photo{height:clamp(96px,18dvh,160px);max-height:160px;object-fit:contain;border-radius:12px}
.ld-edit-form textarea{min-height:88px;scroll-margin:16px}
.ld-editor-actions{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px 18px max(10px,env(safe-area-inset-bottom));border-top:1px solid #b9a88f66;background:var(--theme-card,#fff9ef)}
.ld-editor-actions p{grid-column:1/-1;margin:0;font-size:14px}.ld-editor-actions button{font-size:14px;white-space:normal}
.ld-edit-form details{min-width:0;border:1px solid #b9a88f66;border-radius:12px}
.ld-edit-form summary{min-height:44px;padding:10px 12px;cursor:pointer;font-size:14px;font-weight:700;line-height:1.5;overflow-wrap:anywhere}
.ld-extra-fields{display:grid;gap:12px;padding:4px 12px 12px}.ld-edit-form .ldp{margin:0 8px 8px}
html[data-theme=dark] .ld-editor-actions{background:#302b25;border-color:#665747}
@media(max-height:480px){.ld-edit-form .ld-editor-fields>.ld-photo{height:72px}.ld-editor-fields{gap:8px;padding:8px 14px}.ld-editor-actions{padding:6px 14px}.ld-editor-actions button{padding:8px;min-height:44px}}
`;

// 「全部」分頁用的精簡日記列（Ian 2026-11-16）：只放最近 3 張照片、＋照片、看全部；
// 完整日記與每月小本本書架留在「生活日記」分頁，避免跟照護紀錄疊成一長串。
export function DiaryStrip({react:R,store,catId,today,onOpen,onAdd}){
 const h=R.createElement,root=store.rootStore||store,view=R.useSyncExternalStore(root.subscribe,root.get);
 const rows=diaryEntriesForCat(view.data,catId),fresh=rows.length?freshBookCount(rows,catId,today):0;
 const plus=h('img',cuteActionIconProps('diary-add'));
 return h('section',{className:'ld-strip','aria-label':t('生活日記')},h('style',null,STRIP_STYLE),
  h('div',{className:'ld-strip-head'},
   h('h3',null,t('生活日記')),
   rows.length>0&&h('span',{className:'ld-strip-count'},t('{count} 篇',{count:rows.length})),
   rows.length>0&&h('button',{type:'button',className:'ld-strip-all',onClick:onOpen},t('看全部 ›'))),
  fresh>0&&h('button',{type:'button',className:'ld-strip-new',onClick:onOpen},h('span',{className:'ld-strip-dot','aria-hidden':true}),t('新的小本本做好了 ›')),
  rows.length?h('div',{className:'ld-strip-row'},
   rows.slice(0,3).map(row=>h('button',{type:'button',key:row.id,className:'ld-strip-photo',onClick:onOpen,'aria-label':t('看 {date} 的日記',{date:row.date})},h('img',{src:row.photo,alt:''}))),
   h('button',{type:'button',className:'ld-strip-add',onClick:onAdd},plus,h('span',null,t('照片',{context:'tile'}))))
  :h('button',{type:'button',className:'ld-strip-first',onClick:onAdd},h('span',{className:'ld-strip-add-icon'},plus),h('span',null,t('記下第一張照片 ›'))));
}
const STRIP_STYLE=`.ld-strip{margin:0 0 18px;padding:12px 14px 14px;border:1px solid rgba(191,167,140,.45);border-radius:18px;background:var(--theme-card,#fffaf3)}
.ld-strip-head{display:flex;align-items:center;gap:8px;min-height:32px;margin-bottom:10px;min-width:0}.ld-strip-head h3{margin:0;font-size:16px;white-space:nowrap}
.ld-strip-count{font-size:13px;opacity:.7;white-space:nowrap}
.ld-strip-head button{min-height:36px;padding:4px 12px;border-radius:999px;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.ld-strip-all{margin-left:auto;border:0;background:none;color:var(--theme-accent,#a45c2e);white-space:nowrap}
.ld-strip-new{display:flex;align-items:center;gap:8px;width:100%;min-height:40px;margin:0 0 10px;padding:6px 12px;border:0;border-radius:12px;background:#fdeef3;color:#a2486a;font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer}
.ld-strip-dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:#e06c93}
:where(html[data-theme="dark"]) .ld-strip-new{background:#4a3540;color:#f6c4d4}
.ld-strip-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.ld-strip-photo,.ld-strip-add{aspect-ratio:1;padding:0;border-radius:14px;overflow:hidden;cursor:pointer;min-height:44px}
.ld-strip-photo{border:0;background:#f1e4d3}.ld-strip-photo img{display:block;width:100%;height:100%;object-fit:cover}
.ld-strip-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:2px dashed #e9a8bf;background:#fdeef3;color:#a2486a;font:inherit;font-size:13px;font-weight:700}
.ld-strip-first{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px;border:2px dashed #e9a8bf;border-radius:14px;background:#fdeef3;color:#a2486a;font:inherit;font-size:15px;font-weight:700;text-align:left;cursor:pointer}
.ld-strip-add-icon{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#fff;flex:0 0 auto}
.ld-strip .ld-strip-new{background:#fdeef3!important;color:#a2486a!important;border:0!important;box-shadow:none!important}
.ld-strip .ld-strip-add,.ld-strip .ld-strip-first{background:#fdeef3!important;color:#a2486a!important;border:2px dashed #e9a8bf!important;box-shadow:none!important}
.ld-strip .ld-strip-all{background:none!important;border:0!important;box-shadow:none!important}
.ld-strip .ld-strip-photo{border:0!important;box-shadow:none!important}
:where(html[data-theme="dark"]) .ld-strip .ld-strip-new{background:#4a3540!important;color:#f6c4d4!important}
:where(html[data-theme="dark"]) .ld-strip .ld-strip-add,:where(html[data-theme="dark"]) .ld-strip .ld-strip-first{background:#4a3540!important;border-color:#b86f8b!important;color:#f6c4d4!important}
:where(html[data-theme="dark"]) .ld-strip{border-color:#6b5d52}
:where(html[data-theme="dark"]) .ld-strip-add,:where(html[data-theme="dark"]) .ld-strip-first{background:#4a3540;border-color:#7d5466;color:#f6c4d4}
:where(html[data-theme="dark"]) .ld-strip-add-icon{background:#5c3f4c}
:where(html[data-theme="dark"]) .ld-strip-all{color:#f0b98f}`;

// 新增日記：AI 看照片起個頭（Ian 2026-11-16）。進階模式與手機模式兩張卡並列（Ian 2026-11-16 定案的做法）。
// 打開時只讀手機模型狀態，不下載、不推論；結果只填進輸入框或給草稿，不會自動存檔。
function DiaryPhotoHelper({react:R,photo,caption,onApply,locked}){
 const h=R.createElement,[phone,setPhone]=R.useState({state:'checking'}),[running,setRunning]=R.useState(''),[draft,setDraft]=R.useState(''),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
 const request=R.useRef(null),alive=R.useRef(true),latest=R.useRef({photo,caption,onApply,revision:0}),draftPhoto=R.useRef('');
 if(latest.current.photo!==photo||latest.current.caption!==caption)latest.current.revision++;
 latest.current={photo,caption,onApply,locked,revision:latest.current.revision};
 R.useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
 R.useEffect(()=>{let live=true;setPhone({state:'checking'});diaryPhotoPhoneState().then(v=>{if(live)setPhone(v);});return()=>{live=false;};},[]);
 R.useEffect(()=>{request.current?.abort();request.current=null;setRunning('');setDraft('');draftPhoto.current='';setError('');setNotice('');},[photo]);
 R.useEffect(()=>{if(locked){request.current?.abort();request.current=null;setRunning('');}},[locked]);
 async function run(mode){
  if(request.current||running||locked)return;const ctrl=new AbortController(),started={...latest.current};request.current=ctrl;setRunning(mode);setError('');setNotice('');setDraft('');
  try{const line=await generateDiaryPhotoLine({photo,mode,signal:ctrl.signal});if(!alive.current||request.current!==ctrl||ctrl.signal.aborted||latest.current.photo!==photo||latest.current.locked)return;
   if(latest.current.revision===started.revision&&!String(latest.current.caption||'').trim()){latest.current.onApply(line);setNotice(t('已幫你寫好開頭，可以再補充或修改。'));}
   else {draftPhoto.current=photo;setDraft(line);}}
  catch(e){if(alive.current&&request.current===ctrl&&!ctrl.signal.aborted&&e?.name!=='AbortError')setError(tn(e.message)||t('AI 沒有寫出可用的句子，請自己寫一句或再試一次。'));}
  finally{if(alive.current&&request.current===ctrl){request.current=null;setRunning('');}}
 }
 const stop=()=>{request.current?.abort();request.current=null;setRunning('');setNotice(t('已停止等待。'));};
 const spark=h('svg',{viewBox:'0 0 24 24',width:18,height:18,'aria-hidden':true,fill:'currentColor'},h('path',{d:'M12 2.5c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6zM18.5 14c.3 2 1.2 2.9 3 3.2-1.8.3-2.7 1.2-3 3.2-.3-2-1.2-2.9-3-3.2 1.8-.3 2.7-1.2 3-3.2z'}));
 const phoneText={ready:t('照片只在這台手機處理，不用額度。'),missing:t('需先下載模型（約 2.6 GB），到「設定」→「AI 與下載」。'),unsupported:t('這台手機還不支援用手機模式看照片。'),blocked:t('這台手機的記憶體不足以執行手機模式。'),unknown:t('讀不到手機模型狀態，可以稍後再試。'),checking:t('正在確認手機模型…')}[phone.state]||'';
 const card=(mode,title,text,action,enabled)=>h('div',{className:'ldp-card'},h('strong',null,title),h('p',null,text),
  h('button',{type:'button',className:'ldp-go',onClick:()=>run(mode),disabled:!enabled||!!running||locked},running===mode?t('正在看照片…'):action));
 return h('section',{className:'ldp','aria-label':t('讓 AI 看照片起個頭')},
  h('p',{className:'ldp-title'},spark,h('span',null,t('不知道寫什麼？讓 AI 看照片起個頭'))),
  h('div',{className:'ldp-cards'},
   card('cloud',t('進階模式'),t('把這張照片送到雲端寫一句開頭，用 1 次額度，送出前會再確認。'),t('用進階模式寫'),true),
   card('phone',t('手機模式'),phoneText,t('用手機模式寫'),phone.state==='ready')),
  running&&h('button',{type:'button',className:'ldp-stop',onClick:stop},t('停止等待')),
  draft&&h('div',{className:'ldp-draft'},h('p',null,t('AI 寫的開頭：')),h('blockquote',null,draft),
   h('div',{className:'ldp-draft-actions'},h('button',{type:'button',className:'ldp-go',disabled:locked,onClick:()=>{if(!alive.current||latest.current.locked||draftPhoto.current!==latest.current.photo)return;latest.current.onApply(draft);setDraft('');setNotice(t('已換成 AI 寫的開頭，可以再補充或修改。'));}},t('換成這句')),
    h('button',{type:'button',className:'ldp-no',disabled:locked,onClick:()=>{if(alive.current&&!latest.current.locked)setDraft('');}},t('不用')))),
  error&&h('p',{role:'alert',className:'ldp-error'},error),notice&&h('p',{role:'status',className:'ldp-note'},notice),
  h('p',{className:'ldp-note'},t('AI 只看得到照片，照片外發生的事要你自己補上。')));
}
const PHOTO_STYLE=`.ldp{display:grid;gap:10px;padding:12px;border-radius:16px;background:#fdf3f6;border:1px solid #f3c2d2}
.ldp-title{display:flex;align-items:center;gap:6px;margin:0;color:#a2486a;font-weight:800;font-size:15px}
.ldp-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ldp-card{display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px;border-radius:14px;background:#fff;border:1px solid #f0d3dd}
.ldp-card strong{font-size:15px}.ldp-card p{margin:0;flex:1;font-size:13px;line-height:1.5;opacity:.85}
.ld-form .ldp button.ldp-go{min-height:44px;border:0!important;border-radius:999px!important;background:#b8486f!important;color:#fff!important;font-weight:800;padding:8px 10px!important;white-space:normal}
.ld-form .ldp button.ldp-go:disabled{background:#f6d9e3!important;color:#7a3450!important}
.ld-form .ldp button.ldp-no,.ld-form .ldp button.ldp-stop{min-height:44px;border:1.5px solid #f3c2d2!important;border-radius:999px!important;background:#fff!important;color:#a2486a!important;font-weight:700}
.ldp-draft{display:grid;gap:6px}.ldp-draft p{margin:0;font-size:13px}.ldp-draft blockquote{margin:0;padding:10px 14px;border-radius:12px;background:#fff;border:1.5px solid #f3c2d2;line-height:1.6}
.ldp-draft-actions{display:grid;grid-template-columns:2fr 1fr;gap:8px}
.ldp-note{margin:0;font-size:12px;opacity:.8}.ldp-error{margin:0;color:var(--theme-danger,#9d2c24);font-size:14px}
@media (max-width:340px){.ldp-cards{grid-template-columns:1fr}}
:where(html[data-theme="dark"]) .ldp{background:#3a2c33;border-color:#7d5466}
:where(html[data-theme="dark"]) .ldp-title{color:#f6c4d4}
:where(html[data-theme="dark"]) .ldp-card,:where(html[data-theme="dark"]) .ldp-draft blockquote{background:#2b2629;border-color:#6b4f5c}
:where(html[data-theme="dark"]) .ld-form .ldp button.ldp-no,:where(html[data-theme="dark"]) .ld-form .ldp button.ldp-stop{background:#2b2629!important;color:#f6c4d4!important;border-color:#7d5466!important}`;
