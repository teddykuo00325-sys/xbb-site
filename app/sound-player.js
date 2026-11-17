import {soundProgress} from '/xbb-site/app/sound-progress.js?v=8f5745b7843b';
import {useSoundGame} from '/xbb-site/app/sound-session.js?v=8f5745b7843b';
import {report,setPreference,deleteRecord} from '/xbb-site/app/sound-game.js?v=8f5745b7843b';
import {SoundGameBar,SoundGameLibrary,SoundReaction} from '/xbb-site/app/sound-game-panel.js?v=r5';
import {t} from './assets/i18n.js?v=audit1117b';
// Access is assigned daily by the per-cat rules, never by the track itself.
export const ALL_SOUND_TRACKS = [
 {id:'can',name:t('開罐罐'),description:t('拉開罐頭拉環，啵一聲。'),kind:t('開罐頭聲'),art:'/xbb-site/app/audio/can-friend.svg',file:'/xbb-site/app/audio/can-open.mp3',duration:4.527891,author:'MLaudio',source:'https://freesound.org/people/MLaudio/sounds/531474/'},
 {id:'bag',name:t('開飯囉'),description:t('打開貓糧包裝，沙沙響。'),kind:t('開貓糧包裝聲'),art:'/xbb-site/app/audio/food-bag-friend.svg',file:'/xbb-site/app/audio/food-bag-open.mp3',duration:5.535125,author:'VoxHumanaMusiCurators',source:'https://freesound.org/people/VoxHumanaMusiCurators/sounds/529798/'},
 {id:'meow',name:t('貓咪喵喵'),description:t('貓咪輕輕叫的聲音，觀察牠的反應。'),kind:t('貓咪叫聲錄音'),art:'/xbb-site/app/audio/meow-friend.svg',file:'/xbb-site/app/audio/meow-recording.mp3',duration:7.716,author:'dreamstobecome',source:'https://freesound.org/people/dreamstobecome/sounds/451250/'},
 {id:'scratch',name:t('貓抓板'),description:t('貓咪抓板被抓磨的沙沙聲。'),kind:t('貓抓板錄音'),art:'/xbb-site/app/audio/scratch-friend.svg',file:'/xbb-site/app/audio/scratch-recording.mp3',duration:7.99,author:'Samantha_Dolman',source:'https://freesound.org/people/Samantha_Dolman/sounds/490730/'},
 {id:'box',name:t('紙箱摩擦'),description:t('紙箱被摩擦時的粗粗沙沙聲。'),kind:t('紙箱摩擦錄音'),art:'/xbb-site/app/audio/box-friend.svg',file:'/xbb-site/app/audio/box-recording.mp3',duration:5.53,author:'PersonMakingSounds',source:'https://freesound.org/people/PersonMakingSounds/sounds/431528/'},
 {id:'toy',name:t('小貓玩玩具'),description:t('小貓撥弄鈴鐺玩具的聲音。'),kind:t('貓咪玩玩具錄音'),art:'/xbb-site/app/audio/toy-friend.svg',file:'/xbb-site/app/audio/toy-recording.mp3',duration:8,author:'Kiano.ow',source:'https://freesound.org/people/Kiano.ow/sounds/594132/'},
 {id:'jingle',name:t('逗貓鈴鐺'),description:t('寵物玩具鈴鐺叮鈴響。'),kind:t('玩具鈴鐺錄音'),art:'/xbb-site/app/audio/jingle-friend.svg',file:'/xbb-site/app/audio/jingle-recording.mp3',duration:3.256,author:'Abir19',source:'https://freesound.org/people/Abir19/sounds/629517/'},
 {id:'plastic',name:t('塑膠袋沙沙'),description:t('塑膠袋輕輕揉動的窸窣聲。'),kind:t('塑膠袋錄音'),art:'/xbb-site/app/audio/plastic-friend.svg',file:'/xbb-site/app/audio/plastic-recording.mp3',duration:8,author:'dster777',source:'https://freesound.org/people/dster777/sounds/344555/'},
 {id:'wood',name:t('木頭輕敲'),description:t('木頭輕輕敲擊的喀喀聲。'),kind:t('木頭敲擊錄音'),art:'/xbb-site/app/audio/wood-friend.svg',file:'/xbb-site/app/audio/wood-recording.mp3',duration:3.852,author:'Anzbot',source:'https://freesound.org/people/Anzbot/sounds/565027/'},
 {id:'chimes',name:t('輕鈴叮叮'),description:t('實體風鈴輕輕碰響的一小段錄音。'),kind:t('風鈴錄音'),art:'/xbb-site/app/audio/chimes-friend.svg',file:'/xbb-site/app/audio/chimes-recording.mp3',duration:8,author:'hz37',source:'https://freesound.org/people/hz37/sounds/792470/'},
 {id:'hum',name:t('貓咪呼嚕'),description:t('貓咪呼嚕的低鳴聲，觀察牠的反應。'),kind:t('貓咪呼嚕錄音'),art:'/xbb-site/app/audio/hum-friend.svg',file:'/xbb-site/app/audio/hum-recording.mp3',duration:8,author:'rareguy27',source:'https://freesound.org/people/rareguy27/sounds/690620/'},
 {id:'paper',name:t('紙張輕響'),description:t('紙張摩擦時的細碎聲。'),kind:t('紙張摩擦錄音'),art:'/xbb-site/app/audio/paper-friend.svg',file:'/xbb-site/app/audio/paper.mp3',duration:4.830771,author:'keweldog',source:'https://freesound.org/people/keweldog/sounds/181774/'},
 {id:'cloth',name:t('布料窸窣'),description:t('柔軟布料移動時的窸窣聲。'),kind:t('布料錄音'),art:'/xbb-site/app/audio/cloth-friend.svg',file:'/xbb-site/app/audio/cloth.mp3',duration:10,author:'IENBA',source:'https://freesound.org/people/IENBA/sounds/850705/'}
];
// Compatibility exports share the same catalog; neither assigns free/Pro access.
export const SOUND_TRACKS=ALL_SOUND_TRACKS;
export const PRO_SOUND_TRACKS=ALL_SOUND_TRACKS;
// One media element per explorer. In-flight play requests cannot restart after stop.
export function createSoundPlayer(audio,notify,{doc=globalThis.document,win=globalThis.window,timeoutMs=12000}={}) {
 // 循環播放：預設關閉（每次進頁面都重設）；用瀏覽器原生 loop 播放，每圈由 timeupdate 偵測；總長最多約 10 分鐘就自動停止。
 const LOOP_MAX_SECONDS=600;
 let state={id:null,phase:'idle',elapsed:0,duration:0,error:'',loop:false,loops:0,capped:false},generation=0,wantsPlay=false,disposed=false,timer,loopOn=false,lastElapsed=0,maxLoops=2;
 const duration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:state.duration;
 const emit=patch=>{state={...state,...patch};if(!disposed)notify({...state});};
 const clear=()=>{clearTimeout(timer);timer=null;};
 const stop=(message='')=>{generation++;wantsPlay=false;clear();audio.pause();try{audio.currentTime=0;}catch{}lastElapsed=0;emit({phase:'idle',elapsed:0,error:message,loops:0});};
 const pause=()=>{generation++;wantsPlay=false;clear();audio.pause();emit({phase:'paused',error:''});};
 const handlers={
  playing:()=>{if(!wantsPlay||disposed){audio.pause();return;}clear();emit({phase:'playing',error:''});},
  pause:()=>{if(wantsPlay&&audio.paused){wantsPlay=false;generation++;clear();emit({phase:'paused'});}},
  loadedmetadata:()=>emit({duration:duration()}),
  timeupdate:()=>{
   const total=duration(),elapsed=Math.min(total,Math.max(0,audio.currentTime||0));
   // 循環中：播放位置明顯往回跳＝又播完一圈。超過上限就停下來，不再無限循環。
   if(loopOn&&wantsPlay&&total>0&&elapsed+total*.5<lastElapsed){
    const loops=(state.loops||1)+1;lastElapsed=elapsed;
    if(loops>maxLoops){emit({elapsed:total,loops:maxLoops,capped:true});finish();return;}
    emit({elapsed,loops});return;
   }
   lastElapsed=elapsed;emit({elapsed});
   if(total>0&&elapsed>=total&&wantsPlay&&!loopOn)finish();
  },
  ended:()=>finish(),
  error:()=>stop(t('這段聲音暫時無法播放，請再試一次。'))
 };
 function finish(){if(!wantsPlay||disposed)return;generation++;wantsPlay=false;clear();audio.pause();emit({phase:'ended',elapsed:duration(),duration:duration()});}
 for(const [name,fn] of Object.entries(handlers))audio.addEventListener(name,fn);
 const hide=()=>{if(doc?.hidden)stop();};
 const background=()=>stop();
 // 視窗失去焦點（跳出對話框、通知、切換 App）時先暫停，回來後由使用者決定繼續或停止。
 const blurred=()=>{if(['loading','playing'].includes(state.phase))pause();};
 win?.addEventListener('blur',blurred);
 doc?.addEventListener('visibilitychange',hide);
 win?.addEventListener('pagehide',background);
 win?.addEventListener('inpaw-app-inactive',background);
 audio.preload='none';audio.loop=false;audio.volume=.2;
 return {
  getState:()=>({...state}),
  async toggle(track){
   if(disposed)return;
   if(state.id===track.id&&['loading','playing'].includes(state.phase)){pause();return;}
   const resume=state.id===track.id&&state.phase==='paused';
   if(!resume){stop();audio.src=track.file;audio.load();lastElapsed=0;maxLoops=Math.max(2,Math.floor(LOOP_MAX_SECONDS/Math.max(1,track.duration||1)));}
   audio.loop=loopOn;
   const ticket=++generation;wantsPlay=true;
   emit({id:track.id,phase:'loading',elapsed:resume?state.elapsed:0,duration:track.duration,error:'',loops:resume?state.loops:1,capped:false});
   clear();timer=setTimeout(()=>{if(ticket===generation)stop(t('載入時間較長，請再點一次播放。'));},timeoutMs);
   try{await audio.play();if(disposed||!wantsPlay){audio.pause();return;}if(ticket===generation){clear();emit({phase:'playing'});}}
   catch{if(ticket===generation&&!disposed)stop(t('未能開始播放，請再點一次播放。'));}
  },pause,stop,
  // 開關循環：關閉時目前這一遍會播完再結束；開啟時從下一圈起重複，最多約 10 分鐘。
  setLoop(on){if(disposed)return;loopOn=!!on;audio.loop=loopOn;emit({loop:loopOn});},
  dispose(){stop();disposed=true;for(const [name,fn] of Object.entries(handlers))audio.removeEventListener(name,fn);doc?.removeEventListener('visibilitychange',hide);win?.removeEventListener('blur',blurred);win?.removeEventListener('pagehide',background);win?.removeEventListener('inpaw-app-inactive',background);audio.removeAttribute('src');audio.load();}
 };
}
export function SoundExplorer({react:R,onBack,backLabel=t('返回陪玩'),store,paid=false,name='',onPro}) {
 const h=R.createElement,heading=R.useRef(null),media=R.useRef(null),player=R.useRef(null);
 const [state,setState]=R.useState({id:null,phase:'idle',elapsed:0,duration:0,error:''});
 const [tab,setTab]=R.useState('today');
 const switchTab=next=>{if(next!==tab){player.current?.stop();setTab(next);setCatalogPage(0);}};
 const gameRef=R.useRef(null);
 R.useEffect(()=>{heading.current?.focus({preventScroll:true});player.current=createSoundPlayer(media.current,next=>{setState(next);gameRef.current?.observe(next);});return()=>{player.current?.dispose();player.current=null;};},[]);
 const game=store?useSoundGame(R,{store,paid,player}):null;gameRef.current=game;
 const progress=soundProgress({soundGame:game?.game});
 const [librarySection,setLibrarySection]=R.useState('favorite');
 const [catalogPage,setCatalogPage]=R.useState(0);
 R.useEffect(()=>{setLibrarySection('favorite');},[store]);
 const openLibrary=(section,open)=>{player.current?.stop();game.setReportId(null);if(section)setLibrarySection(section);game.setLibrary(open);};
 const allowedIds=new Set(game?.summary.allowedIds||(paid?ALL_SOUND_TRACKS.map(t=>t.id):[]));
 const available=track=>allowedIds.has(track.id);
 const avoided=track=>game?.game.preferences[track.id]==='avoid';
 const label=track=>!available(track)?t('尚未開放'):avoided(track)?t('已設避開'):state.id!==track.id?t('播放'):state.phase==='playing'?t('暫停'):state.phase==='loading'?t('取消載入'):state.phase==='paused'?t('繼續'):state.phase==='ended'?t('再聽一次'):t('播放');
 const current=ALL_SOUND_TRACKS.find(t=>t.id===state.id);
 const record=game?.game.records.find(r=>r.id===game.reportId&&r.pending!==true);
 const taskOpen=game&&(game.library||!!record);
 const playing=['playing','paused','loading'].includes(state.phase);
 const status=state.error||(!current?t('選一段聲音，按下播放才會開始。'):state.phase==='playing'?t('正在播放{name}',{name:current.name}):state.phase==='loading'?t('準備播放…'):state.phase==='paused'?t('已暫停'):state.phase==='ended'?(state.capped?t('循環已播放約 10 分鐘，先停下來；想繼續可再按播放。'):t('播放完畢，先觀察牠的反應。')):t('已停止'));
 const openPro=onPro?()=>{player.current?.stop();onPro();}:undefined;
 const controlTrack=track=>game?game.play(track):player.current?.toggle(track);
 const renderTrack=track=>{
  const selected=state.id===track.id,total=selected&&state.duration?state.duration:track.duration,allowed=available(track),avoid=avoided(track),favorite=game?.game.preferences[track.id]==='favorite';
  const access=avoid?t('已設為避開'):!allowed?t('今日尚未開放'):paid?t('訂閱方案 · 隨時可聽'):game?.summary.bonusId===track.id?t('照護加開 · 今日可聽'):t('今日可聽');
  return h('article',{key:track.id,className:'native-sound-card sound-card-'+track.id+(selected&&state.phase==='playing'?' is-playing':'')+(!allowed?' is-locked':''),'data-track-id':track.id},
   h('div',{className:'native-sound-row'},h('img',{className:'sound-friend',src:track.art,alt:'',width:112,height:112}),h('div',{className:'native-sound-copy'},h('span',{className:'sound-free'},access),h('h3',null,track.name),h('small',{className:track.synthetic?'sound-synthetic-label':undefined},track.kind),h('p',null,track.description))),
   h('div',{className:'sound-card-actions'},h('button',{type:'button',className:'native-sound-play',disabled:(!selected||!['playing','loading'].includes(state.phase))&&!!game?.busy||!allowed||!!avoid,'aria-label':label(track)+' '+track.name,onClick:()=>controlTrack(track)},h('span',{'aria-hidden':true},selected&&state.phase==='playing'?'Ⅱ':allowed&&!avoid?'▶':'○'),label(track)),game&&h('button',{type:'button',className:'native-sound-favorite',disabled:game.busy||game.hasRefund||avoid,'aria-pressed':favorite,'aria-label':(avoid?t('請先解除避開 '):favorite?t('移除最愛 '):t('加入最愛 '))+track.name,onClick:()=>{if(game.busy||game.hasRefund||avoid)return;return game.transact(d=>setPreference(d,track.id,favorite?'neutral':'favorite',paid));}},avoid?t('先解除避開'):h(R.Fragment,null,h('svg',{className:'sound-favorite-heart',viewBox:'0 0 24 24',width:13,height:13,'aria-hidden':true,focusable:false,fill:favorite?'currentColor':'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'},h('path',{d:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'})),h('span',null,t('最愛'))))),
   selected&&state.phase!=='idle'&&h('div',{className:'native-sound-footer'},h('progress',{max:total,value:state.elapsed,'aria-label':t('{name}播放進度',{name:track.name})}),h('span',null,t('{n} / {n2} 秒',{n:state.elapsed.toFixed(1),n2:total.toFixed(1)})),playing&&h('button',{type:'button',className:'text-btn',onClick:()=>player.current?.stop(),'aria-label':t('停止 {name}',{name:track.name})},t('停止'))));
 };
 const todayTracks=[...allowedIds].map(id=>ALL_SOUND_TRACKS.find(track=>track.id===id)).filter(Boolean);
 const listTracks=tab==='today'?todayTracks:ALL_SOUND_TRACKS;
 const pageCount=Math.max(1,Math.ceil(listTracks.length/4)),page=Math.min(catalogPage,pageCount-1);
 const pageTracks=listTracks.slice(page*4,page*4+4);
 const changePage=next=>{if(next<0||next>=pageCount||next===page)return;player.current?.stop();setCatalogPage(next);};
 const pagination=pageCount>1&&h('nav',{className:'sound-pagination','aria-label':t('聲音清單分頁')},
  h('p',{className:'sound-page-count',role:'status','aria-live':'polite'},t('第 {n}–{n2} 種，共 {count} 種',{n:page*4+1,n2:Math.min((page+1)*4,listTracks.length),count:listTracks.length})),
  h('div',{className:'sound-page-buttons'},
   h('button',{type:'button','aria-label':t('上一頁聲音'),'aria-disabled':page===0,onClick:()=>changePage(page-1)},'‹'),
   Array.from({length:pageCount},(_,index)=>h('button',{key:index,type:'button','aria-label':t('第 {n} 頁，共 {pageCount} 頁',{n:index+1,pageCount}),'aria-current':page===index?'page':undefined,onClick:()=>changePage(index)},index+1)),
   h('button',{type:'button','aria-label':t('下一頁聲音'),'aria-disabled':page===pageCount-1,onClick:()=>changePage(page+1)},'›')));
 return h('section',{className:'ih-sound-explorer','data-testid':'sound-explorer'},
  h('header',{className:'sound-page-heading'},h('button',{type:'button',className:'h-back',onClick:()=>{player.current?.stop();onBack();}},'‹ '+backLabel),h('h1',{ref:heading,tabIndex:-1},t('聲音探索'))),
  h('p',{className:'native-sound-hint'},t('先把手機或喇叭音量調低，再點播放。播放器預設低音量，但裝置音量仍由你控制。')),
  h('div',{className:'sound-loop-row'},h('button',{type:'button',className:'sound-loop-toggle secondary-btn','aria-pressed':!!state.loop,onClick:()=>player.current?.setLoop(!state.loop)},state.loop?t('循環播放：開'):t('循環播放：關')),h('small',null,t('預設只播一遍。開啟後會重複播放，最多約 10 分鐘，隨時可暫停或停止。'))),
  h('audio',{ref:media,preload:'none',playsInline:true,'aria-hidden':true}),
  game&&h(SoundGameBar,{react:R,name,progress,summary:game.summary,busy:game.busy,onLibrary:()=>openLibrary(progress.pendingCount?'history':null,!!progress.pendingCount||!game.library),onAvoid:()=>openLibrary('avoid',true)}),
  game?.notice&&h('p',{role:'status',className:'native-sound-status'},game.notice),
  game?.hasRefund&&h('button',{type:'button',disabled:game.busy,onClick:game.retryRefund},t('重試儲存播放紀錄')),
  game?.library&&!record&&h(SoundGameLibrary,{react:R,game:game.game,summary:game.summary,tracks:ALL_SOUND_TRACKS,paid,busy:game.busy,section:librarySection,onSectionChange:setLibrarySection,onStop:()=>player.current?.stop(),onClose:()=>game.setLibrary(false),onReplay:track=>game.play(track,true),onPreference:(track,value)=>game.transact(d=>setPreference(d,track,value,paid)),onReport:row=>{player.current?.stop();game.setReportId(row.id);},onDelete:id=>game.transact(d=>deleteRecord(d,id)),onPro:openPro}),
  record&&h(SoundReaction,{key:record.id,react:R,record:{...record,preference:game.game.preferences[record.trackId]||'neutral'},track:ALL_SOUND_TRACKS.find(t=>t.id===record.trackId),paid,busy:game.busy,onCancel:()=>game.setReportId(null),onPro:openPro,onSave:async(reaction,preference)=>{if(await game.transact(d=>report(d,record.id,reaction,preference,paid)))game.setReportId(null);}}),
  !taskOpen&&h('div',{className:'sound-tabs',role:'tablist','aria-label':t('聲音清單'),onKeyDown:e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();const next=e.key==='Home'?'today':e.key==='End'?'all':tab==='today'?'all':'today';
   switchTab(next);e.currentTarget.querySelector('[data-sound-tab="'+next+'"]')?.focus();
  }},[['today',t('今日開放'),todayTracks.length],['all',t('全部聲音'),ALL_SOUND_TRACKS.length]].map(([id,title,count])=>h('button',{key:id,type:'button',role:'tab',id:'sound-tab-'+id,'data-sound-tab':id,'aria-controls':'sound-panel','aria-selected':tab===id,tabIndex:tab===id?0:-1,onClick:()=>switchTab(id)},title,h('span',null,t('{n} 種',{n:count}))))),
  !taskOpen&&h('section',{id:'sound-panel',role:'tabpanel','aria-labelledby':'sound-tab-'+tab,className:'sound-tier'},
   h('div',{className:'sound-tier-heading'},h('h2',null,tab==='today'?t('今天想聽哪一種？'):t('13 種聲音，每天一點新發現'))),
   !paid&&tab==='all'&&h('div',{className:'sound-catalog-note'},h('p',null,t('今日開放的聲音可不限次播放。訂閱方案可隨時自選全部 13 種。')),openPro&&h('button',{type:'button',className:'text-btn',onClick:openPro},t('了解訂閱方案'))),
   !todayTracks.length&&tab==='today'&&h('p',{className:'sound-game-empty'},game?t('今日聲音正在準備中。'):t('開啟毛孩檔案後，就能查看今天隨機開放的聲音。')),
   pagination,h('div',{className:'native-sound-list'},pageTracks.map(renderTrack))),
  h('p',{role:state.error?'alert':'status',className:'native-sound-status'},status),
  // 迷你播放器：只要有聲音在載入、播放或暫停就固定在畫面下方，不用捲回那張卡片才找得到暫停／停止。
  playing&&current&&h('div',{className:'sound-game-playback sound-mini-player',role:'group','aria-label':t('目前播放：{name}',{name:current.name})},h('span',null,h('strong',null,current.name),' ',state.phase==='paused'?t('已暫停'):state.phase==='loading'?t('準備中…'):t('{n}{n2} / {n3} 秒',{n:state.loop?t('循環中・第 {n} 遍・',{n:state.loops||1}):'',n2:state.elapsed.toFixed(0),n3:(state.duration||current.duration).toFixed(0)})),h('button',{type:'button',className:'text-btn sound-loop-toggle','aria-pressed':!!state.loop,onClick:()=>player.current?.setLoop(!state.loop)},state.loop?t('循環：開'):t('循環：關')),h('button',{type:'button',className:'text-btn',onClick:()=>controlTrack(current)},state.phase==='paused'?t('繼續'):state.phase==='loading'?t('取消載入'):t('暫停')),h('button',{type:'button',className:'text-btn sound-mini-stop',onClick:()=>player.current?.stop()},t('停止播放'))),
  h('aside',{className:'ih-care-note'},h('strong',null,t('想聽就聽，隨時可以停')),h('p',null,t('預設每次只播放一遍，要重複播放請開啟「循環播放」（最多約 10 分鐘）；播放中畫面下方會出現暫停與停止，離開頁面或切到背景會停止。讓牠自由離開，走開或不安就停止。'))),
  h('details',{className:'native-sound-details'},h('summary',null,t('我的聲音')),h('p',null,t('這台裝置免費每天隨機開放 2 種聲音，所有毛孩共用。任一隻毛孩新增並儲存 1 筆真實照護紀錄後，自動再開放 1 種，每天一次。今日開放的聲音可不限次播放；裝置當地午夜重新抽選，不累積到隔天。訂閱方案可隨時自選 13 種。加入最愛、設為避開或解除避開皆可免費使用。')),h('p',null,t('反應由你手動記錄，不會推論牠喜歡什麼。收藏按毛孩分開儲存，免費使用時只能重播今日開放的聲音。主人自錄尚未開放。'))),
  h('details',{className:'native-sound-details'},h('summary',null,t('聲音來源與授權')),ALL_SOUND_TRACKS.map(track=>h('p',{key:track.id},t('{name}：{author} · 真實錄音 · CC0。',{name:track.name,author:track.author}),h('a',{href:track.source,target:'_blank',rel:'noopener noreferrer'},t('原始素材')))),h('a',{href:'https://creativecommons.org/publicdomain/zero/1.0/',target:'_blank',rel:'noopener noreferrer'},t('CC0 授權條款')),h('p',null,t('自然界聲音（鳥鳴、沙沙聲、雨聲、水滴、小溪、細雨）已下架，改為貓咪叫聲與生活、玩具類聲音。過去的反應紀錄仍保留，更新前的反應對應當時音檔，不代表牠對新錄音的反應。')),h('p',null,t('13 種皆為真實錄音片段，已調整音量與淡入淡出。新錄音的完整人工試聽尚待確認。聲音僅供一般互動探索，不代表毛孩偏好或安撫效果。'))));
}
