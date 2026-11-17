import {FishGame} from '/xbb-site/app/fish-game.js?v=audit1117';
import {PlayLab} from '../play-lab.js?v=audit1117';
import {FishSprite,SceneArtwork,ScenePreview,ScenePicker,getPlayScene,selectPlayScene,FishCountPicker,getFishCount,selectFishCount,normalizeFishCount,PLAY_SCENES} from './play-scenes-v47.js?v=8f5745b7843b';
// v39: cat play is separate from owner voice-record demonstrations.
// Built-in play examples and optional cloud AI design after explicit consent.
export const FISH_SESSION_MS = 60000;
// Other pages ask the app shell to open a play screen with this event:
// detail 'sound' | 'fish' | 'fish-pro' (free fish page with the no-charge Pro preview on).
export const PLAY_OPEN_EVENT='paw-play-open-request';
export function requestPlayOpen(screen='hub'){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(PLAY_OPEN_EVENT,{detail:screen}));}
export const SOUND_CHOICES = [
 {id:'bird',icon:'♬',name:t('輕柔鳥鳴'),note:t('自然聲候選 · 音檔待授權')},
 {id:'rustle',icon:'≋',name:t('細微沙沙聲'),note:t('環境聲候選 · 音檔待製作')},
 {id:'music',icon:'♪',name:t('柔和音樂'),note:t('音樂候選 · 音檔待授權')},
 {id:'owner',icon:'♡',name:t('我的聲音'),note:t('飼主自錄 · 錄音功能待實作')}
];
export function fishPosition(phase){return {x:50+32*Math.sin(phase),y:50+25*Math.sin(phase*.5)};}
export function fishPositions(phase,count=1){count=normalizeFishCount(count);if(count===1)return [fishPosition(phase)];return Array.from({length:count},(_,i)=>({x:(count===2?30+i*40:20+i*30)+(count===2?6:3)*Math.sin(phase+i*2),y:50+20*Math.sin(phase*.7+i*Math.PI*.8)}))}
export function createPlayClock(now=()=>performance.now()){
 let elapsed=0,started=null;
 const read=()=>Math.min(FISH_SESSION_MS,Math.max(0,elapsed+(started===null?0:now()-started)));
 return {read,start(){if(started===null&&elapsed<FISH_SESSION_MS)started=now()},pause(){elapsed=read();started=null;return elapsed},reset(){elapsed=0;started=null}};
}
const fishSVG=(h,props={})=>h(FishSprite,{react:{createElement:h},...props});
export function VoiceEntry({react:R,onVoice,prominent=false}){
 const h=R.createElement;
 return h('button',{className:'ih-voice-entry'+(prominent?' ih-voice-primary':' ih-voice-compact'),type:'button',onClick:onVoice,'aria-label':prominent?t('說一句，記下來：語音記錄固定例句示範'):t('語音記錄：固定例句示範')},
  h('span',{className:'ih-voice-mark','aria-hidden':true},h('img',{src:'/xbb-site/app/assets/icons/microphone.svg',alt:''})),
  h('span',{className:'ih-voice-copy'},h('strong',null,prominent?t('說一句，記下來'):t('語音記錄')),h('small',null,prominent?t('記下吃飯、喝水與日常觀察'):t('固定例句示範 · 不開啟麥克風')),prominent&&h('span',{className:'ih-voice-demo'},h('b',null,t('示範')),h('span',null,t('固定例句 · 不開啟麥克風')))),
  h('span',{className:'ih-voice-arrow','aria-hidden':true},'›'));
}
export function InteractionHub({react:R,store,paid,name,screen='hub',onScreen,onToday,onIntro,onActive,onPro,onBack,portal,backLabel=t('返回陪玩'),progress={trackCount:0,pendingCount:0}}){
 const h=R.createElement,head=R.useRef(null),hasCloud=typeof window!=='undefined'&&!!window.V161Cloud;
 R.useEffect(()=>{head.current?.focus({preventScroll:true})},[screen]);
 if(screen==='lab'||screen==='collection')return h(PlayLab,{key:(store.soundScopeId||'cat')+'-'+screen+'-'+(store.get().restoreGeneration||0),react:R,store,name,paid,onActive,initial:screen==='collection'?'library':'describe',onBack:()=>onScreen('hub')});
 if(screen==='fish'||screen==='fish-pro')return h(FishGame,{key:screen,react:R,name,store,paid,onPro,onActive,backLabel,previewStart:screen==='fish-pro',onBack:onBack||(()=>onScreen('hub'))});
 if(screen==='sound')return h(SoundExplorer,{react:R,store,paid,name,onPro,backLabel,onBack:onBack||(()=>onScreen('hub')),onIntro});
 return h('section',{className:'ih-hub','data-testid':'interaction-hub'},h('p',{className:'eyebrow'},t('今天，也陪你玩')),h('h1',{ref:head,tabIndex:-1},t('陪玩')),h('p',{className:'ih-lead'},t('陪 {name}，找找喜歡的玩法。',{name})),
  h('img',{className:'ih-play-illustration',src:'/xbb-site/app/assets/care-flower-play.svg',alt:'',width:360,height:220,'aria-hidden':true}),
  h('div',{className:'ih-hub-cards'},h('button',{type:'button','aria-label':t('小魚遊戲'),className:'ih-feature ih-fish-card',onClick:()=>onScreen('fish')},h('span',{className:'ih-feature-art','aria-hidden':true},h('img',{src:'/xbb-site/app/assets/play-fish-friend.svg',alt:'',width:140,height:140})),h('span',{className:'ih-feature-body'},h('small',null,t('自己選設定 · 音效可開關')),h('strong',null,t('自由玩小魚')),h('span',null,t('大小、水域、音效與路線自由選，每回 1～3 隻免費玩。')),h('b',null,t('找小魚玩 ›')))),h('button',{type:'button','aria-label':t('聲音探索'),className:'ih-feature ih-sound-card',onClick:()=>onScreen('sound')},h('span',{className:'ih-feature-art','aria-hidden':true},h('img',{src:'/xbb-site/app/assets/play-sound-friend.svg',alt:'',width:140,height:140})),h('span',{className:'ih-feature-body'},h('small',null,progress.trackCount?t('已試聽 {n} 種',{n:progress.trackCount}):t('試聽看看牠喜歡什麼聲音')),h('strong',null,t('聲音探索')),h('span',null,progress.pendingCount?t('接續探索 · {n} 筆反應待記 ›',{n:progress.pendingCount}):progress.trackCount?t('繼續探索，選一段來聽 ›'):t('開始探索，試一段聲音 ›')),h('b',null,progress.trackCount?t('接續聲音探索 ›'):t('開始聲音探索 ›'))))),h('aside',{className:'ih-care-note'},h('strong',null,t('陪伴不用打卡，想玩再玩')),h('p',null,t('先觀察牠想不想參與，讓牠隨時離開。螢幕觸碰不代表喜歡，也不會變成健康紀錄。'))),
  h('button',{type:'button',className:'ih-feature ih-lab-card','aria-label':t('幫牠設計玩法'),onClick:()=>onScreen('lab')},h('span',{className:'ih-feature-art','aria-hidden':true},h('img',{src:'/xbb-site/app/assets/play-fish-friend.svg',alt:'',width:140,height:140})),h('span',{className:'ih-feature-body'},h('small',null,hasCloud?t('內建玩法，也能請 AI 設計'):t('免費內建玩法')),h('strong',null,t('幫牠設計玩法')),h('span',null,hasCloud?t('先試內建玩法，或依牠的反應請 AI 設計。'):t('依牠的習慣，挑一套小魚玩法。')),h('b',null,t('看看玩法 ›')))),
  h('button',{type:'button',className:'ih-collection-entry',onClick:()=>onScreen('collection')},h('strong',null,t('牠的玩法收藏')),h('span',{'aria-hidden':true},'›')));
}
export function FishPlay({react:R,name,onBack,portal,backLabel=t('返回陪玩'),onActive=()=>{}}){
 const h=R.createElement,[scene,setScene]=R.useState(getPlayScene),[count,setCount]=R.useState(getFishCount),[phase,setPhase]=R.useState('ready'),[speed,setSpeed]=R.useState(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches?'still':'slow'),[elapsed,setElapsed]=R.useState(0),[framePhase,setFramePhase]=R.useState(0),[feedback,setFeedback]=R.useState({}),[touches,setTouches]=R.useState(0),[owner,setOwner]=R.useState(false),[reason,setReason]=R.useState(''),clock=R.useRef(null),motion=R.useRef(0),hitTimer=R.useRef({}),head=R.useRef(null),ownerHead=R.useRef(null),gameRef=R.useRef(null),pauseRef=R.useRef(null);
 if(!clock.current)clock.current=createPlayClock();
 const pause=()=>{setElapsed(clock.current.pause());setPhase('paused')};
 const end=()=>{clock.current.pause();setOwner(false);setReason('');setPhase('done')};
 const start=()=>{clock.current.start();setReason('');setOwner(false);setPhase('playing')};
 const ownerOpen=()=>{pause();setOwner(true);setReason(t('已暫停。飼主確認後才會結束。'))};
 const clearHits=()=>{Object.values(hitTimer.current).forEach(clearTimeout);hitTimer.current={}};
 const hit=(e,index=0)=>{e?.stopPropagation();if(phase!=='playing')return;setTouches(n=>n+1);setFeedback(v=>({...v,[index]:true}));clearTimeout(hitTimer.current[index]);hitTimer.current[index]=setTimeout(()=>setFeedback(v=>({...v,[index]:false})),700)};
 R.useEffect(()=>()=>{clock.current.pause();clearHits();onActive(false)},[]);
 R.useEffect(()=>{onActive(phase==='playing'||phase==='paused');if(phase==='playing')pauseRef.current?.focus({preventScroll:true})},[phase]);
 R.useEffect(()=>{head.current?.focus({preventScroll:true})},[phase==='ready',phase==='done']);
 R.useEffect(()=>{if(owner)ownerHead.current?.focus({preventScroll:true})},[owner]);
 R.useEffect(()=>{
  if(phase!=='playing')return;
  let frame,last=performance.now(),lastPaint=0;
  const tick=now=>{const dt=Math.max(0,Math.min(100,now-last));last=now;const ms=clock.current.read();if(ms>=FISH_SESSION_MS){clock.current.pause();setElapsed(FISH_SESSION_MS);setPhase('done');setReason(t('玩了一小段，先休息一下。'));return;}
   if(speed!=='still')motion.current+=dt/1000*(Math.PI*2/(speed==='slow'?26:16));
   if(now-lastPaint>=32){setFramePhase(motion.current);setElapsed(ms);lastPaint=now;}frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);
  const hide=()=>{if(document.hidden){setElapsed(clock.current.pause());setPhase('paused');setReason(t('離開畫面時已暫停，按繼續才會再開始。'))}};
  document.addEventListener('visibilitychange',hide);return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide)};
 },[phase,speed]);
 const button=(text,fn,cls='secondary-btn',props={})=>h('button',{type:'button',className:cls,onClick:fn,...props},text);
 const readyAction=h('div',{className:'ux-play-start'},button(t('開始小魚拍拍'),start,'primary'));
 const speedControl=h('fieldset',{className:'ih-speed'},h('legend',null,t('小魚移動')),[['slow',t('慢速')],['normal',t('一般',{context:'speed'})],['still',t('靜止')]].map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':speed===id,onClick:()=>setSpeed(id)},label)));
 if(phase==='ready')return h('section',{className:'ih-fish-ready','data-testid':'fish-ready'},button('‹ '+backLabel,onBack,'h-back'),h('h1',{ref:head,tabIndex:-1},t('小魚拍拍')),h('p',{className:'ih-lead'},t('無聲觸碰遊戲 · 最多 1 分鐘，可隨時暫停')),h(ScenePreview,{react:R,scene,count}),readyAction,h('details',{className:'ux-play-options'},h('summary',null,(PLAY_SCENES.find(s=>s.id===scene)?.name||t('基本'))+' · '+t('{n} 隻 · 更換設定',{n:count})),h(ScenePicker,{react:R,scene,onChange:id=>setScene(selectPlayScene(id))}),h(FishCountPicker,{react:R,count,onChange:n=>setCount(selectFishCount(n))}),speedControl,h('p',{className:'ih-small'},t('免費基本背景＋1 隻；Pro 多 3 個場景與 2、3 隻玩法，目前可試玩。重新整理後回復預設。'))),h('p',{className:'ih-small'},t('手機平放穩固處，陪在牠旁邊，讓牠自由離開。')),h('details',{className:'ux-play-help'},h('summary',null,t('玩法與注意事項')),h('p',null,t('全程無聲，觸碰次數不會儲存，也不代表偏好。裝置是否能感應貓掌依螢幕而異。結束遊戲需要飼主確認，不會鎖住手機。'))));
 if(phase==='done')return h('section',{className:'ih-fish-done','data-testid':'fish-done'},h('span',{className:'ih-rest','aria-hidden':true},'☾'),h('h1',{ref:head,tabIndex:-1},t('這次先休息')),h('p',{className:'ih-lead'},reason||t('把注意力留給眼前的牠。')),h('p',{className:'ih-small'},t('本次已觸碰 {n} 次，次數不會儲存；不代表毛孩的反應或偏好。',{n:touches})),button(backLabel,onBack,'primary'),button(t('回到遊戲準備'),()=>{clock.current.reset();motion.current=0;setElapsed(0);setFramePhase(0);clearHits();setFeedback({});setTouches(0);setPhase('ready')},'text-btn centered'));
 return h('div',{ref:gameRef,className:'ih-play-layer play-scene-'+scene+(count>1?' ih-multi-fish':''),onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();pause();setOwner(false);setReason(t('已暫停，按繼續才會再開始。'));pauseRef.current?.focus();}if(e.key==='Tab'){const scope=owner?gameRef.current?.querySelector('.ih-owner-panel'):gameRef.current;const nodes=[...(scope?.querySelectorAll('button:not(:disabled),input:not(:disabled)')||[])].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||!scope?.contains(document.activeElement))){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||!scope?.contains(document.activeElement))){e.preventDefault();first?.focus()}}},role:'dialog','aria-modal':true,'aria-label':t('小魚拍拍遊戲'),onPointerDown:e=>e.stopPropagation(),onPointerMove:e=>e.stopPropagation()},h('header',{className:'ih-play-controls'},h('span',null,h('strong',null,t('小魚拍拍')),h('small',null,t('{n} 隻 · 無聲 · ',{n:count})+(speed==='slow'?t('慢速'):speed==='normal'?t('一般',{context:'speed'}):t('靜止')))),button(phase==='playing'?t('暫停'):t('繼續'),phase==='playing'?()=>{pause();setReason(t('想繼續時再開始。'))}:start,'ih-pause',{disabled:owner,ref:pauseRef}),button(t('結束遊戲'),ownerOpen,'ih-owner',{disabled:owner})),
 h('div',{className:'ih-play-field','data-testid':'fish-field'},h(SceneArtwork,{react:R,scene}),fishPositions(framePhase,count).map((position,index)=>h('button',{key:index,type:'button',className:'ih-fish-target'+(feedback[index]?' touched':''),'aria-label':count===1?t('小魚觸碰目標'):t('第 {n} 隻小魚觸碰目標',{n:index+1}),disabled:phase!=='playing',style:{left:`${position.x}%`,top:`${position.y}%`},onPointerDown:e=>hit(e,index),onClick:e=>{if(e.detail===0)hit(e,index)}},fishSVG(h),h('span',{className:'ih-touch-ring','aria-hidden':true}))),phase==='paused'&&!owner&&h('div',{className:'ih-paused'},h('strong',null,t('已暫停')),h('p',null,reason),button(t('繼續玩'),start,'secondary-btn'))),
 h('footer',{className:'ih-play-footer'},h('span',null,t('約 {n} 秒後休息',{n:Math.ceil((FISH_SESSION_MS-elapsed)/1000)})),h('span',{role:'status'},t('已觸碰 {n} 次',{n:touches}))),
 owner&&h('section',{className:'ih-owner-panel','aria-label':t('飼主控制')},h('h2',{ref:ownerHead,tabIndex:-1},t('已暫停，準備結束？')),h('p',null,t('拿回手機後再操作，避免貓掌誤觸。')),speedControl,button(t('確認'),end,'primary'),button(t('再玩一下'),start,'secondary-btn'),h('p',{className:'ih-small'},t('不會自動恢復，也不會儲存觸碰次數。'))));
}
import {SoundExplorer} from '/xbb-site/app/sound-player.js?v=r6'; export {SoundExplorer};
import {t} from './i18n.js?v=audit1117b';
