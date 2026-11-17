import {ProFishScenery,PRO_FISH_THEMES} from './pro-fish-scenery.js?v=1';
import {createFishGameAudio} from './fish-game-audio.js?v=fish-escape2';
import {FISH_WATER_THEMES,FishWaterScenery} from './fish-water-scenery.js?v=water-scenes1';
import {createFishSequence,createHitCounter} from '/xbb-site/app/fish-motion.js?v=fish-escape1';
import {FISH_APPEARANCES,readFishProfile,saveFishSettings} from '/xbb-site/app/fish-rules.js?v=audit1117';
import {readFishPresentation,rememberFishPresentation} from './fish-play-preferences.js?v=fish-escape1';
import {createUnlockHold,LockIcon,PLAY_UNLOCK_HOLD_MS,PLAY_UNLOCK_MOVE_PX} from './play-lab-lock.js?v=lock1';
import {t,tn} from './assets/i18n.js?v=audit1117b';
import {ALL_SOUND_TRACKS} from '/xbb-site/app/sound-player.js?v=r6';

// Background / catch sounds can be any sound-explorer recording (by track id).
const fishSoundFile=id=>ALL_SOUND_TRACKS.find(track=>track.id===id)?.file||null;

export const FISH_SIZES=Object.freeze([
 {id:'small',label:t('小'),width:64,height:44},
 {id:'medium',label:t('中'),width:96,height:66},
 {id:'large',label:t('大'),width:120,height:82}
]);

// Fish positions use layout pixels; device-preview transforms affect only screen pixels.
export function fishFieldSize(element){
 const rect=element?.getBoundingClientRect();
 return {width:element?.clientWidth||rect?.width||320,height:element?.clientHeight||rect?.height||440};
}
export function fishFieldPoint(element,event){
 const rect=element.getBoundingClientRect(),size=fishFieldSize(element);
 return {x:(event.clientX-rect.left)*size.width/(rect.width||1),y:(event.clientY-rect.top)*size.height/(rect.height||1)};
}

export function fishDialogKey(event,onEscape){
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onEscape?.();return;}
 if(event.key!=='Tab')return;
 const dialog=event.currentTarget,buttons=Array.from(dialog.querySelectorAll('button:not(:disabled)'));
 const active=dialog.ownerDocument?.activeElement,first=buttons[0],last=buttons[buttons.length-1];
 if(!first){event.preventDefault();dialog.focus({preventScroll:true});return;}
 if(!buttons.includes(active)||event.shiftKey&&active===first||!event.shiftKey&&active===last){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}
}

export function focusFishPhase(root,dialog,{restore,playing=false}={}){
 if(!root)return;
 if(restore){const target=restore.isConnected&&(!dialog||dialog.contains(restore))?restore:Array.from((dialog||root).querySelectorAll('button:not(:disabled)')).find(button=>button.textContent===restore.textContent||restore.textContent===t('結束')&&button.textContent===t('結束這次陪玩'));if(target&&!target.disabled){target.focus({preventScroll:true});return;}}
 const container=dialog||root,active=container.ownerDocument?.activeElement;
 if(dialog&&container.contains(active)&&active!==container&&!active.disabled)return;
 const target=playing?root.querySelector('[data-fish-pause]')||root.querySelector('[data-fish-lock]'):container.querySelector('[data-fish-initial-focus]:not(:disabled)')||container.querySelector('.fish-primary:not(:disabled)')||container.querySelector('button:not(:disabled)')||dialog;
 target?.focus({preventScroll:true});
}

// 遊戲中整個畫面每幀重繪；React 每次都會重設 <input> 的 type/name，觸發樣式重算與排版
// （60/90/120Hz 就是每秒 60/90/120 次）。props 沒變的輸入框就不重繪。
const memoInputs=new WeakMap();
export function StableInput(R){
 let component=memoInputs.get(R);
 if(!component){component=R.memo(props=>R.createElement('input',props));memoInputs.set(R,component);}
 return component;
}

// 陪玩鎖定（2026-11-14）：開始陪玩後預設鎖定，畫面只留一個小鎖頭；暫停、結束、背景、音量都收起來，
// 貓拍不到。解鎖要「按住鎖頭不放 2 秒、手指不滑開」，短按或滑過只會顯示提示。鍵盤（Enter／空白鍵）可直接解鎖。
export const FISH_UNLOCK_HOLD_MS=PLAY_UNLOCK_HOLD_MS;
export const FISH_UNLOCK_MOVE_PX=PLAY_UNLOCK_MOVE_PX;
// createUnlockHold 已抽到 play-lab-lock.js，與陪玩實驗室共用；這裡轉出保留舊引用。
export {createUnlockHold};

// A top-down silhouette: the rounded head points right; paired fins flank the body.
export function TopFish({react:R,index=0,appearance,waterStyle=false}){
 if(!waterStyle){
  const h=R.createElement,colors=[['#edaa76','#ce7958'],['#e7bf73','#bd9250'],['#db9583','#b66f66']],[body,fin]=colors[appearance?Math.max(0,FISH_APPEARANCES.findIndex(a=>a.id===appearance)):index%3];
  return h('svg',{viewBox:'0 0 100 64',fill:'none','aria-hidden':true,focusable:false},
   h('path',{className:'fish-tail',d:'M31 32Q16 17 5 13Q10 32 5 51Q20 46 31 32Z',fill:fin}),
   h('path',{d:'M48 24Q35 5 28 10L34 30M48 40Q35 59 28 54L34 34',fill:fin}),
   h('path',{d:'M25 32C38 11 69 13 88 26Q98 32 88 38C69 51 38 53 25 32Z',fill:body}),
   h('path',{d:'M37 32Q58 24 81 32Q58 39 37 32Z',fill:'#fff1cc',opacity:.6}),
   h('circle',{cx:81,cy:25,r:3,fill:'#493e39'}),h('circle',{cx:81,cy:39,r:3,fill:'#493e39'}),
   h('circle',{cx:81.8,cy:24.3,r:1,fill:'#fff'}),h('circle',{cx:81.8,cy:38.3,r:1,fill:'#fff'}));
 }
 const h=R.createElement,colors=[['#CBE045','#A9BE2E'],['#f2df72','#c3ad43'],['#db9583','#b66f66']];
 const selected=appearance?Math.max(0,FISH_APPEARANCES.findIndex(a=>a.id===appearance)):Math.abs(index)%colors.length;
 const [body,fin]=colors[selected];
 return h('svg',{className:'fish-web-sprite',viewBox:'0 0 100 64',fill:'none','aria-hidden':true,focusable:false},
  h('path',{className:'fish-tail',d:'M33 32 7 15 7 49Z',fill:fin}),
  h('path',{d:'M49 16Q58 1 70 17Z',fill:fin}),
  h('ellipse',{cx:61,cy:32,rx:34,ry:19,fill:body}),
  h('path',{d:'M38 29Q56 16 78 25',stroke:'#f0f6ac',strokeWidth:2.5,strokeLinecap:'round',opacity:.38}),
  h('path',{className:'fish-pectoral',d:'M54 34Q48 43 59 46Q63 40 63 35Z',fill:fin,opacity:.8}),
  h('circle',{cx:80,cy:28,r:3.8,fill:'#0F1A4A'}),
  h('circle',{cx:81,cy:26.9,r:1.1,fill:'#fffde0'}));
}

// previewStart opens the free version in a no-charge Pro preview. The preview only
// changes this page's options: it never saves Pro settings or Pro level progress.
export function FishGame({react:R,name,store,paid=false,onBack,backLabel=t('返回陪玩'),onActive=()=>{},onPro,previewStart=false}){
 const h=R.createElement,view=R.useSyncExternalStore(store.subscribe,store.get,store.get);
 const [preview,setPreview]=R.useState(()=>!paid&&!!previewStart),pro=paid||preview;
 const profile=readFishProfile(view.data,paid,typeof window!=='undefined'&&window.innerWidth>=768);
 const presentation=readFishPresentation(view.data,{paid,scopeId:store.soundScopeId});
 const reduced=()=>typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const [restDismissed,setRestDismissed]=R.useState(false);
 const [reduceMotion]=R.useState(reduced);
 const [settings,setSettings]=R.useState(()=>({...profile.settings,...presentation}));
 const [phase,setPhase]=R.useState('ready');
 const [fish,setFish]=R.useState([]),[hits,setHits]=R.useState(0),[ripples,setRipples]=R.useState([]);
 const [waterTheme,setWaterTheme]=R.useState(presentation.waterTheme);
 const [sizeId,setSizeId]=R.useState(presentation.sizeId);
 const fishSize=FISH_SIZES.find(size=>size.id===sizeId)||FISH_SIZES[1];
 const [bgSound,setBgSound]=R.useState(presentation.bgSound),[hitSound,setHitSound]=R.useState(presentation.hitSound);
 const [soundEnabled,setSoundEnabled]=R.useState(presentation.soundEnabled),[volume,setVolume]=R.useState(presentation.volume),[audioError,setAudioError]=R.useState('');
 const audio=R.useRef(null),soundRef=R.useRef(true),volumeRef=R.useRef(.25);
 soundRef.current=soundEnabled;volumeRef.current=volume;
 const soundsRef=R.useRef({bg:bgSound,hit:hitSound});soundsRef.current={bg:bgSound,hit:hitSound};
 const getAudio=()=>{if(!audio.current)audio.current=createFishGameAudio({soundFile:fishSoundFile,onError:message=>{if(alive.current)setAudioError(message);}});audio.current.setVolume(volumeRef.current);audio.current.setSounds?.(soundsRef.current);return audio.current;};
 const [exitOpen,setExitOpen]=R.useState(false),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
 const field=R.useRef(null),school=R.useRef(null),counter=R.useRef(createHitCounter()),total=R.useRef(0),state=R.useRef(phase),lock=R.useRef(false),run=R.useRef(0),alive=R.useRef(true),activeCallback=R.useRef(onActive),rippleId=R.useRef(0);
 const root=R.useRef(null),dialog=R.useRef(null),exitReturn=R.useRef(null),wasExitOpen=R.useRef(false),previewFocus=R.useRef(null),previewChanged=R.useRef(false);
 const [locked,setLocked]=R.useState(false),[lockHint,setLockHint]=R.useState(''),[holding,setHolding]=R.useState(false),unlockHold=R.useRef(null),hintTimer=R.useRef(null);
 const showLockHint=(message,ms=3500)=>{if(!alive.current)return;clearTimeout(hintTimer.current);setLockHint(message);if(message&&ms)hintTimer.current=setTimeout(()=>{if(alive.current)setLockHint('');},ms);};
 const unlock=()=>{unlockHold.current?.cancel();setHolding(false);setLocked(false);showLockHint(t('已解鎖，可以暫停、結束或調整設定。想再鎖住按「鎖定」。'),4000);};
 if(!unlockHold.current)unlockHold.current=createUnlockHold({onUnlock:()=>{if(alive.current)unlock();},onHint:message=>showLockHint(message,message===t('繼續按住，2 秒後解鎖…')?0:3500),onHolding:value=>{if(alive.current)setHolding(value);},timers:{set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}});
 R.useEffect(()=>()=>{clearTimeout(hintTimer.current);unlockHold.current?.cancel();},[]);
 activeCallback.current=onActive;state.current=phase;
 const entitlement=pro?settings:{...settings,count:Math.min(3,settings.count),scene:'basic',appearance:'gold',speed:settings.speed==='normal'?'normal':'slow',randomRoutes:!!settings.randomRoutes,unlimited:false};
 const config=entitlement;
 R.useEffect(()=>{if(paid||!preview)rememberFishPresentation(store.soundScopeId,{sizeId,waterTheme,soundEnabled,volume,bgSound,hitSound,scene:config.scene,appearance:config.appearance},paid);},[sizeId,waterTheme,soundEnabled,volume,bgSound,hitSound,config.scene,config.appearance,paid,preview,store.soundScopeId]);
 const scenery=preview=>config.scene==='basic'?h(FishWaterScenery,{react:R,theme:waterTheme,preview}):h(ProFishScenery,{react:R,scene:config.scene,theme:waterTheme,preview});
 const changePhase=value=>{state.current=value;if(value!=='playing')audio.current?.stop();else if(soundRef.current){setAudioError('');void getAudio().start();}setPhase(value);};
 R.useEffect(()=>{alive.current=true;return()=>{alive.current=false;audio.current?.dispose();run.current++;activeCallback.current(false);};},[]);
 R.useEffect(()=>{activeCallback.current(phase!=='ready');},[phase]);
 R.useEffect(()=>{
  const restore=wasExitOpen.current&&!exitOpen?exitReturn.current:null;wasExitOpen.current=exitOpen;
  focusFishPhase(root.current,dialog.current,{restore,playing:phase==='playing'});
 },[phase,exitOpen,busy]);
 R.useEffect(()=>{if(!previewChanged.current)return;previewChanged.current=false;(previewFocus.current||root.current?.querySelector('.fish-primary:not(:disabled)'))?.focus({preventScroll:true});},[preview]);
 R.useEffect(()=>{
  const pause=()=>{if(state.current==='playing'){counter.current.reset();changePhase('paused');}};
  const visibility=()=>{if(document.hidden)pause();};
  if(typeof document==='undefined')return;
  document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',pause);window.addEventListener('pagehide',pause);window.addEventListener('inpaw-app-inactive',pause);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',pause);window.removeEventListener('pagehide',pause);window.removeEventListener('inpaw-app-inactive',pause);};
 },[]);
 R.useEffect(()=>{
  if(!field.current||!school.current)return;
  const resize=()=>{if(field.current){const r=fishFieldSize(field.current);school.current.resize(r.width,r.height);setFish(school.current.snapshot());}};
  resize();if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(resize);observer.observe(field.current);return()=>observer.disconnect();
 },[phase==='ready']);
 R.useEffect(()=>{
  if(phase!=='playing')return;
  let frame,last=null;
  const tick=time=>{if(state.current!=='playing')return;const dt=last===null?0:Math.min((time-last)/1000,.1);last=time;school.current?.step(dt,config.speed);setFish(school.current?.snapshot()||[]);if(school.current?.progress.finished){changePhase('session-done');return;}frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[phase,config.speed]);
 R.useEffect(()=>{if(!ripples.length)return;const timeout=setTimeout(()=>setRipples(rows=>rows.filter(x=>Date.now()-x.time<700)),710);return()=>clearTimeout(timeout);},[ripples]);
 const start=()=>{
  if(lock.current)return;
  run.current++;counter.current=createHitCounter();total.current=0;setHits(0);setRipples([]);setError('');setNotice('');setExitOpen(false);setRestDismissed(false);
  const rect=fishFieldSize(field.current);
  school.current=createFishSequence(config.count,{width:rect.width,height:rect.height,seed:Date.now(),randomRoutes:config.randomRoutes,loop:config.unlimited,reducedMotion:reduceMotion,targetRadius:Math.ceil(Math.hypot(120,82)/2)+1});
  setFish(school.current.snapshot());unlockHold.current?.cancel();setLocked(true);showLockHint(t('已鎖定畫面，貓拍不到設定。要暫停或結束，按住右上角鎖頭 2 秒。'),5000);changePhase('playing');
 };
 const ripple=(event,index)=>{if(!field.current)return;const size=fishFieldSize(field.current),point=fish[index],touch=fishFieldPoint(field.current,event);const keyboard=event.detail===0&&event.type==='click';setRipples(rows=>[...rows.slice(-9),{id:++rippleId.current,x:keyboard?(point?.x??size.width/2):touch.x,y:keyboard?(point?.y??size.height/2):touch.y,time:Date.now(),hit:index!==null}]);};
 const hit=(event,index,keyboard=false)=>{
  event.stopPropagation();if(state.current!=='playing')return;
  if(!keyboard){try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{}}
  const pointer=keyboard?'keyboard':event.pointerId;
  if(!counter.current.down(pointer,index,true))return;
  if(keyboard)counter.current.up(pointer);
  ripple(event,index);school.current?.scatter(index);if(soundRef.current)audio.current?.hit();total.current++;setHits(total.current);
 };
 const release=event=>counter.current.up(event.pointerId);
 const saveSettings=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await store.atomic(data=>saveFishSettings(data,{...settings,sizeId,waterTheme,soundEnabled,volume,bgSound,hitSound},paid));if(alive.current)setNotice(t('已儲存這隻毛孩的設定。'));}catch(e){if(alive.current)setError(tn(e.message||t('設定尚未儲存，請再試一次。')));}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const enterPreview=()=>{if(paid)return;previewChanged.current=true;setPreview(true);setNotice('');setError('');};
 const leavePreview=()=>{previewChanged.current=true;setPreview(false);setSettings({...readFishProfile(store.get().data,false).settings});setNotice('');setError('');};
 // 2026-11-17：按「留在這裡」要回到原本在玩的狀態，不要停在暫停卡。
 const exitResume=R.useRef(false);
 const requestExit=event=>{if(phase==='ready'){onBack();return;}exitReturn.current=event?.currentTarget||root.current?.ownerDocument?.activeElement;exitResume.current=state.current==='playing';if(state.current==='playing')changePhase('paused');setExitOpen(true);};
 const stayHere=()=>{setExitOpen(false);if(exitResume.current&&state.current==='paused'){exitResume.current=false;counter.current.reset();changePhase('playing');}};
 const ready=()=>{run.current++;counter.current.reset();setExitOpen(false);unlockHold.current?.cancel();setLocked(false);setLockHint('');changePhase('ready');setError('');};
 const lockControl=()=>h('div',{className:'fish-lock-layer'},
  h('button',{type:'button',className:'fish-lock'+(holding?' is-holding':''),'data-fish-lock':true,'aria-label':t('畫面已鎖定。按住 2 秒解鎖，或用鍵盤按 Enter 解鎖'),
   onPointerDown:event=>{event.stopPropagation();event.preventDefault();if(unlockHold.current.down(event)){try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{}}},
   onPointerMove:event=>unlockHold.current.move(event),onPointerUp:event=>unlockHold.current.up(event),onPointerCancel:()=>unlockHold.current.cancel(),onLostPointerCapture:event=>unlockHold.current.up(event),
   onContextMenu:event=>event.preventDefault(),onClick:event=>{if(event.detail===0)unlock();}},
   LockIcon(R),h('span',{className:'fish-lock-ring','aria-hidden':true})),
  lockHint&&h('p',{className:'fish-lock-hint',role:'status'},lockHint));
 const button=(text,action,props={})=>h('button',{type:'button',onClick:action,...props},text);
 const waterPicker=()=>h('label',{className:'fish-water-picker'},t('背景'),h('select',{'aria-label':t('小魚水域背景'),value:waterTheme,onChange:event=>{if(FISH_WATER_THEMES.some(theme=>theme.id===event.target.value))setWaterTheme(event.target.value);}},(config.scene==='basic'?FISH_WATER_THEMES:PRO_FISH_THEMES[config.scene]).map(theme=>h('option',{key:theme.id,value:theme.id},theme.label))));
 const sizePicker=()=>h('label',{className:'fish-size-picker'},t('魚大小'),h('select',{'aria-label':t('小魚大小'),value:sizeId,title:t('{label}：{width}×{height}',{label:fishSize.label,width:fishSize.width,height:fishSize.height}),onChange:event=>{if(FISH_SIZES.some(size=>size.id===event.target.value))setSizeId(event.target.value);}},FISH_SIZES.map(size=>h('option',{key:size.id,value:size.id},size.label))));
 const changeVolume=R.useCallback(event=>{const value=Number(event.target.value)/100;volumeRef.current=value;setVolume(value);audio.current?.setVolume(value);},[]);
 const soundPicker=(label,aria,value,builtIn,onPick)=>h('label',{className:'fish-sound-picker'},label,h('select',{'aria-label':aria,value,onChange:event=>onPick(event.target.value)},
  h('option',{value:builtIn[0]},builtIn[1]),h('option',{value:'none'},t('無聲')),
  h('optgroup',{label:t('聲音探索')},ALL_SOUND_TRACKS.map(track=>h('option',{key:track.id,value:track.id},t(track.name))))));
 const pickBg=value=>{setBgSound(value);soundsRef.current={...soundsRef.current,bg:value};audio.current?.setSounds?.({bg:value});};
 const pickHit=value=>{setHitSound(value);soundsRef.current={...soundsRef.current,hit:value};audio.current?.setSounds?.({hit:value});};
 const toggleSound=()=>{const enabled=!soundRef.current;soundRef.current=enabled;setSoundEnabled(enabled);if(enabled&&state.current==='playing'){setAudioError('');void getAudio().start();}else audio.current?.stop();};
 const soundControls=()=>h('div',{className:'fish-audio-controls'},button(soundEnabled?t('聲音：開'):t('聲音：關'),toggleSound,{'aria-pressed':soundEnabled}),h('label',null,t('音量'),h(StableInput(R),{type:'range',min:0,max:100,value:Math.round(volume*100),'aria-label':t('小魚聲音音量'),onChange:changeVolume})),soundPicker(t('背景聲音'),t('小魚陪玩背景聲音'),bgSound,['water',t('水聲（內建）')],pickBg),soundPicker(t('拍到時'),t('拍到小魚時的聲音'),hitSound,['tone',t('叮（內建）')],pickHit),waterPicker(),sizePicker(),audioError&&h('p',{role:'status'},audioError));
 const option=(key,value,label)=>button(label,()=>setSettings(s=>({...s,[key]:value})),{'aria-pressed':settings[key]===value});
 const dialogProps=(label,onEscape)=>({ref:dialog,role:'dialog','aria-modal':true,'aria-label':label,tabIndex:-1,onKeyDown:event=>fishDialogKey(event,onEscape)});
 return h('section',{ref:root,className:'fish-game'+(phase!=='ready'?' fish-fullscreen':''),'data-water-theme':waterTheme,'data-fish-size':sizeId,style:{'--fish-width':fishSize.width+'px','--fish-height':fishSize.height+'px'},'aria-label':t('小魚陪玩'),onKeyDown:event=>{if(event.key==='Escape'&&state.current==='playing'){event.preventDefault();changePhase('paused');}}},
  phase==='ready'&&h('header',{className:'fish-heading'},button('‹ '+backLabel,requestExit,{className:'fish-back',disabled:busy}),h('span',{className:'fish-eyebrow'},t('一起玩一下'))),
  phase==='ready'?h(R.Fragment,null,
   h('div',{className:'fish-intro'},h('span',{className:'fish-kicker'},'PAWS & LITTLE FISH'),h('h1',null,t('{name}的小魚時光',{name:name||t('毛孩')})),h('p',null,t('一隻接一隻游過，陪牠輕輕拍。'))),
   preview&&!paid&&h('div',{className:'fish-pro-banner',role:'status',ref:previewFocus,tabIndex:-1},h('span',null,h('strong',null,t('Pro 預覽・不收費')),h('small',null,t('先試試更多小魚、快速與外觀；預覽設定不會儲存。'))),button(t('回到免費版'),leavePreview,{className:'fish-pro-exit'})),
   h('div',{className:'fish-preview'},scenery(true),h('div',{className:'fish-preview-school'},h('span',{style:{transform:'rotate(-12deg)'}},h(TopFish,{react:R,appearance:config.appearance,waterStyle:true})),h('small',{className:'fish-preview-caption'},config.unlimited?t('無限接力 · 一隻接一隻'):t('共 {n} 隻 · 依序出場',{n:config.count})))),
   h('div',{className:'fish-ready-actions'},button(t('開始陪玩'),()=>start(),{className:'fish-primary','data-fish-start':true,disabled:busy}),button(soundEnabled?t('聲音：開'):t('聲音：關'),toggleSound,{'aria-pressed':soundEnabled,className:'fish-ready-sound'})),
   h('p',{className:'fish-ready-hint'},t('先調低音量；開始後會鎖定畫面，按住鎖頭 2 秒可解鎖。')),
   h('details',{className:'fish-ready-settings'},h('summary',null,t('調整陪玩設定')),soundControls(),
   h(R.Fragment,null,
    !config.unlimited&&h('div',{className:'fish-settings'},h('div',{className:'fish-setting-row'},h('div',null,h('strong',null,t('小魚數量')),h('small',null,pro?t('每次 1–10 隻，依序出場'):t('每次 1–3 隻，每天不限次數'))),h('div',{className:'fish-stepper'},button('−',()=>setSettings(s=>({...s,count:Math.max(1,s.count-1)})),{disabled:settings.count<=1,'aria-label':t('減少一隻小魚')}),h('output',{'aria-live':'polite'},t('{n} 隻',{n:settings.count})),button('＋',()=>setSettings(s=>({...s,count:Math.min(pro?10:3,s.count+1)})),{disabled:settings.count>=(pro?10:3),'aria-label':t('增加一隻小魚')})))),
    h('details',{className:'fish-play-options'},h('summary',null,t('速度與路線 · ')+(config.speed==='slow'?t('慢速'):config.speed==='normal'?t('一般',{context:'speed'}):t('快速'))+' · '+(config.randomRoutes?t('隨機'):t('固定'))),
     h('fieldset',null,h('legend',null,t('起始速度')),h('div',{className:'fish-options'},option('speed','slow',t('慢速')),option('speed','normal',t('一般',{context:'speed'})),pro&&option('speed','fast',t('快速')))),
     h('fieldset',null,h('legend',null,t('游動路線')),h('div',{className:'fish-options'},option('randomRoutes',false,t('固定路線')),option('randomRoutes',true,t('隨機路線'))),config.randomRoutes&&h('p',{className:'fish-footnote'},t('從不同方向游入，沿途自然轉彎與變速。')))),
    !pro&&button(t('更多小魚與外觀・現在可試玩 ›'),enterPreview,{className:'fish-pro-link'}),
    h('p',{className:'fish-footnote'},config.unlimited?t('小魚會一直輪流出場，直到你結束。陪玩 2 分鐘會顯示休息提醒，不會強制中斷。'):t('選的小魚游完就休息，隨時可以再玩一回；想休息就暫停或結束。'))),
   h('p',{className:'fish-sequence-note'},t('一次一隻，交接時最多兩隻；整體會逐漸加快，最快不超過上限。')),
   h('p',{className:'fish-footnote'},t('開始後播放輕柔水聲；拍到小魚會有不同的水滴音。先調低手機音量，不想聽可關閉聲音。')),
   reduceMotion&&h('p',{className:'fish-footnote'},t('已依裝置的減少動態效果設定，暫用較慢速度與固定直線；不啟用隨機轉彎。')),
   pro&&h('div',{className:'fish-settings fish-pro-options'},
    h('fieldset',null,h('legend',null,t('陪玩長度')),h('div',{className:'fish-options'},option('unlimited',false,t('指定隻數')),option('unlimited',true,t('無限接力')))),
    h('fieldset',null,h('legend',null,t('小魚外觀')),h('div',{className:'fish-options'},FISH_APPEARANCES.map(item=>option('appearance',item.id,item.label)))),
    h('fieldset',null,h('legend',null,t('陪玩場景')),h('div',{className:'fish-options'},[['basic',t('基本')],['pond',t('池塘')],['night',t('星夜')],['garden',t('花園')]].map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':settings.scene===id,onClick:()=>setSettings(s=>({...s,scene:id}))},label)))),
    paid&&button(busy?t('正在儲存…'):t('儲存這隻毛孩的設定'),saveSettings,{className:'fish-text-button',disabled:busy}),
    preview&&!paid&&h('p',{className:'fish-footnote'},t('預覽中的選擇只用在這一頁，不會儲存。')))),
   notice&&h('p',{role:'status'},notice),error&&h('p',{role:'alert',className:'fish-error'},error)):
  h(R.Fragment,null,
   locked?(phase==='session-done'?null:lockControl()):h('div',{className:'fish-session-bar'},h('div',null,h('strong',null,config.unlimited?t('無限接力'):t('自由陪玩')),h('p',null,t('拍到次數 '),h('b',null,hits)),h('small',{className:'fish-session-progress'},config.unlimited?t('已游過 {n} 隻 · 無限接力',{n:school.current?.progress.passed||0}):t('{passed} / {n} 隻已游過 · 逐漸加速',{passed:school.current?.progress.passed||0,n:config.count}))),/* 2026-11-17：解鎖後原本「結束」剛好在鎖頭位置，習慣再點一下就跳結束；改把「鎖定」放回最右邊（同位置再點只會重新鎖住），結束仍會先問一次。 */button(t('結束'),requestExit,{disabled:busy}),phase==='playing'&&button(t('暫停'),()=>changePhase('paused'),{'data-fish-pause':true}),button(h(R.Fragment,null,LockIcon(R),t(' 鎖定')),()=>{setLocked(true);showLockHint(t('已鎖定畫面。要暫停或結束，按住右上角鎖頭 2 秒。'));},{className:'fish-lock-again','aria-label':t('鎖定畫面，避免貓誤觸')})),
   locked&&h('p',{className:'fish-locked-hits'},t('拍到次數 '),h('b',null,hits)),
   !locked&&lockHint&&h('p',{className:'fish-lock-hint is-unlocked',role:'status'},lockHint),
   config.unlimited&&!restDismissed&&(school.current?.progress.elapsed||0)>=120&&h('aside',{className:'fish-rest-reminder'+(locked?' is-locked':''),role:'status'},h('span',null,locked?t('已陪玩 2 分鐘，看看牠想不想休息。要暫停或結束，先按住鎖頭 2 秒解鎖。'):t('已陪玩 2 分鐘，看看牠想不想休息。可隨時暫停或結束。')),!locked&&button(t('知道了'),()=>setRestDismissed(true))),
   !locked&&soundControls(),
   h('div',{className:'fish-field'+(reduceMotion||phase!=='playing'?' fish-still':''),ref:field,onPointerDown:event=>{if(state.current==='playing'){counter.current.down(event.pointerId,null,true);try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{}ripple(event,null);}},onPointerUp:release,onPointerCancel:release,onLostPointerCapture:release,'aria-label':t('小魚陪玩區')},
    scenery(false),
    fish.map((item,index)=>h('button',{key:item.id,type:'button','data-dash':item.dash>.05?'':undefined,className:'fish-target',style:{left:0,top:0,transform:`translate3d(${item.x}px,${item.y}px,0) translate(-50%,-50%) rotate(${item.angle}deg)`},'aria-label':t('拍小魚 {number}',{number:item.number}),'data-fish-number':item.number,disabled:phase!=='playing',onPointerDown:event=>hit(event,index),onPointerUp:release,onPointerCancel:release,onLostPointerCapture:release,onKeyDown:event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();},onClick:event=>{if(event.detail===0)hit(event,index,true);}},h(TopFish,{react:R,appearance:config.appearance,waterStyle:true}))),
    ripples.map(item=>h('span',{key:item.id,className:'fish-ripple'+(item.hit?' fish-ripple-hit':''),style:{left:item.x+'px',top:item.y+'px'},'aria-hidden':true})),
    phase==='paused'&&!exitOpen&&h('div',{className:'fish-overlay'},h('div',{className:'fish-overlay-card',...dialogProps(t('小魚休息一下'),()=>{counter.current.reset();changePhase('playing');})},h('span',{className:'fish-rest-icon'},'☾'),h('h2',null,t('小魚休息一下')),h('p',null,t('準備好了，再繼續陪玩。')),button(t('繼續陪玩'),()=>{counter.current.reset();changePhase('playing');},{className:'fish-primary'}),locked?h('p',{className:'fish-lock-note'},t('畫面鎖定中。要結束，先按住右上角鎖頭 2 秒解鎖。')):button(t('結束這次陪玩'),requestExit))),
    phase==='session-done'&&!exitOpen&&h('div',{className:'fish-overlay'},h('div',{className:'fish-overlay-card','aria-live':'polite',...dialogProps(t('小魚游完了'),ready)},h('span',{className:'fish-rest-icon'},'☾'),h('h2',null,t('小魚游完了')),h('p',null,t('{fish} 隻小魚依序游過，這次拍到 {n} 下。',{fish:config.count,n:hits})),h('p',null,t('想玩時再來，不限每天玩幾次。')),button(t('再玩一回'),()=>start(),{className:'fish-primary'}),button(t('調整陪玩設定'),ready),button(t('結束並返回'),()=>{audio.current?.stop();run.current++;activeCallback.current(false);onBack();},{disabled:busy}))),
   ),
   h('p',{className:'fish-footnote'},t('輕拍小魚就會泛起水波；拍空白處不會增加次數。'))),
  exitOpen&&h('div',{className:'fish-dialog-backdrop'},h('div',{className:'fish-overlay-card',...dialogProps(t('結束這次陪玩'),stayHere)},h('h2',null,t('要結束這次陪玩嗎？')),h('p',null,t('這次拍到 {n} 下。休息一下，下次再玩。',{n:hits})),error&&h('p',{role:'alert'},error),button(t('留在這裡'),stayHere,{autoFocus:true,'data-fish-initial-focus':true,disabled:busy}),button(t('結束並返回'),()=>{audio.current?.stop();run.current++;activeCallback.current(false);onBack();},{className:'fish-primary',disabled:busy}))));
}
