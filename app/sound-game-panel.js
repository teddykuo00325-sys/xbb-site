import {t,K} from './assets/i18n.js?v=audit1117b';
// 反應是存進紀錄的值，維持中文原值；顯示時才翻譯。
const REACTIONS=[K('轉頭／靠近'),K('繼續休息'),K('走開或不安'),K('沒明顯反應')];
// Retired sounds keep their old reaction records; only the display name is needed.
const RETIRED_NAMES={bird:t('輕柔鳥鳴（已下架）'),rustle:t('細微沙沙聲（已下架）'),rain:t('窗邊雨聲（已下架）'),drops:t('水滴點點（已下架）'),stream:t('小溪流水（已下架）'),drizzle:t('真實細雨（已下架）')};
const PREFERENCES=[['neutral',t('先不分類')],['favorite',t('加入最愛')],['avoid',t('加入避開')]];

export function SoundGameBar({react:R,name,summary,progress={pendingCount:0},busy,onLibrary,onAvoid}) {
 const h=R.createElement,available=summary.allowedIds.length;
 const avoided=summary.allowedIds.filter(id=>summary.preferences?.[id]==='avoid').length;
 const playable=available-avoided;
 const access=avoided?t('今日開放 {n} 種 · 已避開 {avoided} 種',{n:available,avoided}):summary.paid?t('訂閱方案 · 13 種自由選'):t('今日聲音可不限次播放');
 return h('aside',{className:'sound-game-bar','aria-label':t('今日聲音開放與播放狀態')},
  h('div',{className:'sound-game-ribbon'},h('span',null,name||t('毛孩'),t('今天可聽 '),h('strong',null,playable),t(' 種')),h('span',{className:'sound-game-unlimited'},access)),
  !summary.paid&&h('p',{className:'sound-game-bonus',role:'status'},summary.rewardUnlocked?t('今日照護已記錄，第 3 種聲音已自動開放。'):t('今天新增並儲存 1 筆照護紀錄，就會自動開放第 3 種；每天 1 次。')),
  h('div',{className:'sound-game-toolbar'},h('button',{type:'button',disabled:busy,onClick:onLibrary},progress.pendingCount?t('{n} 筆待記反應',{n:progress.pendingCount}):t('♡ 我的聲音與紀錄')),
   avoided>0&&playable===0&&onAvoid&&h('button',{type:'button',disabled:busy,onClick:onAvoid},t('查看已避開')),
   h('details',{className:'sound-game-rules'},h('summary',null,t('每天怎麼選？')),h('div',{className:'sound-game-rule-copy'},h('p',null,t('這台裝置每天從 13 種聲音中隨機取得 2 種，所有毛孩共用，當天可不限次播放。任一隻毛孩新增並儲存 1 筆真實照護紀錄，會再隨機開放 1 種不重複的聲音，每天一次。')),h('p',null,t('依這台裝置的當地時間，每天午夜重新抽選。不累積、沒用完不保留，隔天仍可能抽到相同聲音。示範、編輯舊紀錄和聲音反應紀錄不算照護紀錄。')),h('p',null,t('訂閱方案可隨時自選全部 13 種。加入最愛、設為避開或解除避開皆可免費使用；收藏不會解鎖尚未開放的聲音。反應由你觀察記錄，不會自動判斷牠的喜好。'))))));
}

export function SoundReaction({react:R,record,track,paid=false,busy,onSave,onCancel,onPro}) {
 const h=R.createElement;
 const [reaction,setReaction]=R.useState(record?.reaction||'');
 const [preference,setPreference]=R.useState(record?.preference||'neutral');
 const heading=R.useRef(null);
 R.useEffect(()=>{setReaction(record?.reaction||'');setPreference(record?.preference||'neutral');heading.current?.focus({preventScroll:true});},[record?.id]);
 const away=reaction===K('走開或不安');
 return h('section',{className:'sound-game-reaction',role:'region','aria-label':t('記錄聲音反應')},
  h('h2',{ref:heading,tabIndex:-1},t('剛剛聽到'),track?.name||t('這段聲音'),t('，牠怎麼反應？')),
  h('p',{className:'sound-game-muted'},t('依你看到的記錄就好，每次反應都可能不同。這不是照護紀錄，不會開放額外聲音。')),
  h('fieldset',{disabled:busy},h('legend',null,t('這次觀察')),h('div',{className:'sound-game-choices'},REACTIONS.map(value=>h('button',{type:'button',key:value,'aria-pressed':reaction===value,onClick:()=>setReaction(value)},t(value))))),
  away&&h('p',{className:'sound-game-care',role:'status'},t('先停止播放，讓牠自由離開；不用再播放確認。')),
  h('fieldset',{disabled:busy},h('legend',null,t('要怎麼整理這段聲音？')),h('p',{className:'sound-game-muted'},t('由你決定，不會根據這次反應更改分類。')),h('div',{className:'sound-game-preferences'},PREFERENCES.map(([value,label])=>h('button',{type:'button',key:value,'aria-pressed':preference===value,onClick:()=>setPreference(value)},label)))),
  !paid&&h('p',{className:'sound-game-muted'},t('可以免費加入最愛；收藏後仍依今日開放清單播放。')),
  h('div',{className:'sound-game-actions'},h('button',{type:'button',disabled:busy,onClick:onCancel},record?.reaction?t('取消修改'):t('稍後記錄')),h('button',{type:'button',className:'sound-game-primary',disabled:busy||!REACTIONS.includes(reaction),onClick:()=>onSave(reaction,preference)},t('儲存反應'))));
}

export function SoundGameLibrary({react:R,game,summary,tracks,paid=false,busy,section:controlledSection,onSectionChange,onClose,onReplay,onPreference,onReport,onDelete,onPro,onStop}) {
 const h=R.createElement;
 const [localSection,setLocalSection]=R.useState('favorite');
 const section=controlledSection??localSection;
 const setSection=id=>{setLocalSection(id);onSectionChange?.(id);};
 const [deleting,setDeleting]=R.useState(null);
 const heading=R.useRef(null);
 R.useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
 const prefs=game.preferences||{},records=(game.records||[]).filter(record=>record.pending!==true),allowedIds=new Set(summary?.allowedIds||[]);
 const selectedTracks=tracks.filter(track=>prefs[track.id]===section);
 const dateLabel=record=>{const date=new Date(record.at);return Number.isNaN(date.getTime())?record.day||'':date.toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});};
 return h('section',{className:'sound-game-library','aria-label':t('我的聲音')},
  h('header',{className:'sound-game-library-heading'},h('h2',{ref:heading,tabIndex:-1},t('我的聲音')),h('button',{type:'button',onClick:()=>{onStop?.();onClose();}},t('返回探索'))),
  h('div',{className:'sound-game-switch','aria-label':t('聲音分類')},[['favorite',t('♡ 最愛')],['avoid',t('避開')],['history',t('反應紀錄')]].map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':section===id,onClick:()=>{onStop?.();setSection(id);setDeleting(null);}},label))),
  section==='history'&&records.some(row=>['chimes','hum'].includes(row.trackId))&&h('p',{className:'sound-game-muted'},t('部分聲音已換成真實錄音：「柔和低鳴」改為貓咪呼嚕、風鈴改為實體錄音。更新前的反應對應舊音檔，不代表牠對新錄音的反應。')),
  section==='history'&&records.some(row=>RETIRED_NAMES[row.trackId])&&h('p',{className:'sound-game-muted'},t('自然界聲音（鳥鳴、沙沙聲、雨聲、水滴、小溪、細雨）已下架，相關反應紀錄仍保留，但無法再播放。')),
  section!=='history'?h('div',null,
   h('p',{className:'sound-game-muted'},section==='favorite'?(paid?t('收藏由你選擇。每次都要按下播放，不會自動連播。'):t('最愛可免費收藏；只有今日開放的聲音可以重播。收藏不會增加今日可聽的種類。')):t('列為避開的聲音不會播放；你可以隨時解除。')),
   !paid&&h('div',{className:'sound-game-pro-note'},h('p',null,t('訂閱方案可隨時播放全部 13 種聲音。最愛收藏與避開設定皆可免費使用。')),onPro&&h('button',{type:'button',disabled:busy,onClick:onPro},t('了解訂閱方案'))),
   selectedTracks.length?selectedTracks.map(track=>{
    const allowed=paid||allowedIds.has(track.id);
    return h('article',{className:'sound-game-item',key:track.id},h('img',{src:track.art,alt:'',width:44,height:44}),h('div',{className:'sound-game-item-copy'},h('strong',null,track.name),track.synthetic&&h('small',null,t('人工合成音效')),!allowed&&h('small',null,t('今天尚未開放'))),
     h('div',{className:'sound-game-item-actions'},section==='favorite'&&h('button',{type:'button',disabled:busy||!allowed,onClick:()=>onReplay(track),'aria-label':(allowed?t('重播 '):t('今日尚未開放 '))+track.name},allowed?t('▶ 重播'):t('尚未開放')),h('button',{type:'button',disabled:busy,onClick:()=>onPreference(track.id,'neutral'),'aria-label':(section==='favorite'?t('移除最愛 '):t('移除避開 '))+track.name},section==='favorite'?t('移除最愛'):t('移除避開'))));
   }):h('p',{className:'sound-game-empty'},section==='favorite'?t('還沒有最愛的聲音。回到探索，在聲音卡上按「♡ 最愛」即可收藏。'):t('目前沒有避開的聲音。'))):
  h('div',null,h('p',{className:'sound-game-muted'},t('反應由你親自觀察與記錄，不會推論喜好，也不計入照護紀錄。修改或刪除不會改變今日開放的聲音。')),records.length?records.map(record=>{
   const track=tracks.find(item=>item.id===record.trackId);
   return h('article',{key:record.id,className:'sound-game-history'},h('div',{className:'sound-game-history-copy'},h('strong',null,track?.name||RETIRED_NAMES[record.trackId]||t('聲音探索')),h('time',{dateTime:record.at},dateLabel(record))),h('p',null,record.reaction?t(record.reaction):t('尚未記錄反應')),h('div',{className:'sound-game-actions'},h('button',{type:'button',disabled:busy,onClick:()=>onReport(record)},record.reaction?t('修改反應'):t('記錄反應')),h('button',{type:'button',disabled:busy,onClick:()=>setDeleting(record.id)},t('刪除紀錄'))),deleting===record.id&&h('div',{className:'sound-game-delete',role:'group','aria-label':t('確認刪除反應紀錄')},h('p',null,t('確定刪除這筆反應紀錄？今日開放的聲音和已儲存的喜愛、避開不會改變。')),h('div',{className:'sound-game-actions'},h('button',{type:'button',disabled:busy,onClick:()=>setDeleting(null)},t('保留紀錄')),h('button',{type:'button',disabled:busy,onClick:()=>{onDelete(record.id);setDeleting(null);}},t('確定刪除')))));
  }):h('p',{className:'sound-game-empty'},t('還沒有反應紀錄。聽完後可以記下你觀察到的反應。'))));
}
