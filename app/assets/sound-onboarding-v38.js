import {PetOwnerLabel} from "/xbb-site/app/pet-switcher.js?v=photo-simplify1";
import {BottomTabs} from './navigation-shell.js?v=8f5745b7843b';
import {t,K,tn} from './i18n.js?v=audit1117b';
// Silent, owner-operated first-use prototype. No media or microphone APIs.
export const SOUND_DEMO_MS = 15000;
export const SOUND_OBSERVATIONS = [
  {id:'orient',label:t('轉頭／靠近')},
  {id:'rest',label:t('繼續休息')},
  {id:'away',label:t('走開或不安')},
  {id:'none',label:t('沒明顯反應')}
];
export const observationLabel=id=>SOUND_OBSERVATIONS.find(o=>o.id===id)?.label??t('尚未選擇');
export function validSoundIntro(profile) {
  const d=profile?.soundIntroDemo;
  return d===undefined||!!d&&typeof d==='object'&&!Array.isArray(d)&&d.version===1&&d.demo===true&&d.audioPlayed===false&&d.microphoneUsed===false&&SOUND_OBSERVATIONS.some(o=>o.id===d.observation)&&Number.isInteger(d.simulatedMs)&&d.simulatedMs>=0&&d.simulatedMs<=SOUND_DEMO_MS&&['completed','stopped','skipped'].includes(d.endedBy)&&typeof d.savedAt==='string'&&Number.isFinite(Date.parse(d.savedAt))&&new Date(d.savedAt).toISOString()===d.savedAt;
}
export function createSoundDemo(ob,now=new Date().toISOString()) {
  const demo={version:1,demo:true,audioPlayed:false,microphoneUsed:false,observation:ob.observation,simulatedMs:Math.min(SOUND_DEMO_MS,Math.max(0,Math.floor(ob.elapsedMs||0))),endedBy:ob.endedBy||'skipped',savedAt:now};
  if(!validSoundIntro({soundIntroDemo:demo}))throw Error(t('請先選擇一項示範觀察。'));
  return demo;
}
export function saveSoundDemo(data,demo) {
  if(!demo||!validSoundIntro({soundIntroDemo:demo}))throw Error(t('示範格式無法保存，原資料未更動。'));
  return {...data,cat:{...data.cat,soundIntroDemo:{...demo}}};
}
export function createSilentClock(initial=0,now=()=>performance.now()) {
  let elapsed=initial,started=null;
  const read=()=>Math.min(SOUND_DEMO_MS,Math.max(0,elapsed+(started===null?0:now()-started)));
  return {read,start(){if(started===null)started=now();},pause(){elapsed=read();started=null;return elapsed;},reset(){elapsed=0;started=null;}};
}
export function SoundOnboarding({react:R,Scroll='div',Input='input',hideKeyboard=()=>{},ob,setOb,name,replay=false,ownerKnown=replay,savedDemo,onName,onSave,onEnter,onBack,onFormal,onHome,onNavigate,navActive='home'}) {
  const h=R.createElement,[draft,setDraft]=R.useState(''),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[guest,setGuest]=R.useState(false),[homePending,setHomePending]=R.useState(false);
  const mounted=R.useRef(true);
  R.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const heading=R.useRef(null),running=R.useRef(false),pending=R.useRef(null),clock=R.useRef(null);
  if(!clock.current)clock.current=createSilentClock(ob.elapsedMs||0);
  const stage=['name','intro','play','report','saved','voice'].includes(ob.stage)?ob.stage:'intro';
  const update=patch=>{if(mounted.current)setOb(old=>({...old,...patch}));};
  const pause=()=>{const elapsedMs=clock.current.pause();update({running:false,elapsedMs});return elapsedMs;};
  const finish=endedBy=>{const elapsedMs=clock.current.pause();pending.current=null;update({stage:'report',running:false,elapsedMs,endedBy,observation:null});};
  const reset=()=>{clock.current.reset();pending.current=null;setError('');setOb({stage:'intro',running:false,elapsedMs:0});};
  R.useEffect(()=>{heading.current?.focus({preventScroll:true});},[stage]);
  R.useEffect(()=>{
    if(stage!=='play'||!ob.running)return;
    clock.current.start();
    const tick=()=>{const elapsedMs=clock.current.read();if(elapsedMs>=SOUND_DEMO_MS){clock.current.pause();setOb(old=>({...old,stage:'report',running:false,elapsedMs:SOUND_DEMO_MS,endedBy:'completed',observation:null}));}else setOb(old=>({...old,elapsedMs}));};
    const interval=setInterval(tick,100);
    const hide=()=>{if(document.hidden){const elapsedMs=clock.current.pause();setOb(old=>({...old,running:false,elapsedMs}));}};
    document.addEventListener('visibilitychange',hide);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',hide);clock.current.pause();};
  },[stage,ob.running]);
  const act=async fn=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{await fn();}catch(e){if(mounted.current)setError(tn((e?.message||t('尚未保存，請重試。')).replace(K('再變更食品資料'),t('再保存示範'))));}finally{running.current=false;if(mounted.current)setBusy(false);}};
  const nameNext=next=>act(async()=>{hideKeyboard();if(!replay)await onName(draft.trim());if(!mounted.current)return;if(next==='home')onEnter();else reset();});
  const leave=()=>{if(busy)return;pause();hideKeyboard();if(guest){setGuest(false);update({stage:'name',running:false});}else onEnter();};
  const back=()=>{if(busy)return;pause();hideKeyboard();if(stage==='voice'){update({stage:'saved'});return;}if(stage==='report'){reset();return;}if(onBack)onBack();else update({stage:'name',running:false});};
  const button=(label,onClick,cls='secondary-btn',props={})=>h('button',{type:'button',className:cls,onClick,disabled:busy,...props},label);
  const title=text=>h('h1',{ref:heading,tabIndex:-1},text);
  const note=(text,cls='si-note')=>h('p',{className:cls},text);
  const disclaimer=h('p',{className:'si-demo-badge'},t('示範，不會播放聲音／未開啟麥克風'));
  let body;
  if(stage==='name')body=h(R.Fragment,null,
    h('img',{className:'ob-logo',src:'/xbb-site/app/assets/brand/logo.svg',alt:t('毛孩小本本 In Paw AI')}),
    title(replay?t('再走一次首次引導'):t('先認識你的貓咪')),
    note(t('記下吃飯、喝水與身體變化，看診時更好回顧。')),
    replay?note(t('這次重播不會重設資料。')):h('label',{className:'field'},t('毛孩名字 ＊必填'),h(Input,{required:true,className:'ob-input','aria-label':t('毛孩名字'),maxLength:40,value:draft,placeholder:t('例如：小花'),onChange:e=>setDraft(e.target.value),disabled:busy})),
    button(busy?t('正在保存…'):replay?t('開始記錄'):t('建立毛孩'),()=>nameNext('home'),'primary',{disabled:busy||(!replay&&!draft.trim())}),

    button(t('先看無聲範例'),()=>{setGuest(!replay);reset();},'secondary-btn'),
    note(t('先體驗一段 15 秒的無聲流程，可隨時停止或跳過。不需要貓咪在旁邊。')),
    note(t('不需要註冊、不需要登入')));
  if(stage==='intro'||stage==='play'){
    const started=stage==='play',remaining=Math.max(0,Math.ceil((SOUND_DEMO_MS-(ob.elapsedMs||0))/1000));
    body=h(R.Fragment,null,title(t('無聲示範（先看流程）')),
      h('section',{className:'si-track'},h('span',{className:'si-track-icon','aria-hidden':true},'♪'),h('div',null,h('strong',null,t('柔和的貓專用音樂')),h('small',null,t('候選音樂類型 · 尚未提供音檔')))),
      note(t('這裡只示範 15 秒計時，不必真的測試貓咪，也不會連播其他聲音。')),
      h('div',{className:'si-clock'},h('span',null,started?t('模擬剩餘時間'):t('等待你開始')),h('strong',{'aria-label':t('模擬剩餘 {n} 秒',{n:remaining})},`00:${String(remaining).padStart(2,'0')}`),h('progress',{max:SOUND_DEMO_MS,value:ob.elapsedMs||0,'aria-label':t('無聲示範進度')})),
      h('p',{role:'status',className:'si-status'},started?(ob.running?t('無聲計時中，可隨時暫停或停止'):t('已暫停，按繼續才會計時')):t('按下按鈕才會開始，沒有自動播放')),
      button(started?(ob.running?t('暫停計時'):t('繼續計時')):t('開始 15 秒無聲示範'),()=>{if(ob.running)pause();else{if(!started)clock.current.reset();update({stage:'play',running:true});}},'primary ij-demo-control'),
      started&&button(t('停止並選擇示範觀察'),()=>finish('stopped')),
      button(t('跳過計時，看看觀察選項'),()=>finish('skipped'),'text-btn centered'),
      h('details',{className:'si-guidance'},h('summary',null,t('之後真正試聽時，怎麼照顧牠？')),note(t('正式加入前需取得商用授權並做裝置音量測試；規劃低音量、緩慢淡入、不突然出現高音。')),note(t('讓貓自由離開，不吵醒、不靠近耳朵、不戴耳機，也不要為了得到反應而調大音量。走開或不安就停止。'))),
      savedDemo&&h('aside',{className:'si-previous'},h('strong',null,t('上次示範')),note(observationLabel(savedDemo.observation)),note(t('不是實際聲音反應，不列入照護紀錄或健康統計。'))));
  }
  if(stage==='report')body=h(R.Fragment,null,title(t('練習選擇一項觀察')),note(t('沒有播放聲音，請任選一項試走流程，不代表貓咪真的出現這個反應。')),
    h('fieldset',{className:'si-observations'},h('legend',null,t('示範觀察（單選）')),SOUND_OBSERVATIONS.map(o=>h('label',{key:o.id,className:ob.observation===o.id?'selected':''},h('input',{type:'radio',name:'sound-observation',value:o.id,checked:ob.observation===o.id,disabled:busy,onChange:()=>{pending.current=null;update({observation:o.id});setError('');}}),h('span',null,o.label)))),
    note(t('轉頭、靠近或繼續休息，都不能單獨判定喜歡或放鬆；沒有反應也不等於不喜歡。')),
    ob.observation==='away'&&note(t('真正試聽時，若走開或不安就停止，讓牠自行離開。'),'si-welfare'),
    button(busy?t('正在保存示範…'):guest?t('查看示範結果'):t('儲存示範結果'),()=>act(async()=>{pending.current??=createSoundDemo(ob);if(!guest)await onSave(pending.current);update({stage:'saved',running:false});}),'primary',{disabled:busy||!ob.observation}),
    note(guest?t('這次示範不會保存，也不會新增照護紀錄。'):t('只在本機保存這隻貓的最後一次示範選擇；不新增照護紀錄。')));
  if(stage==='saved')body=h(R.Fragment,null,title(guest?t('範例體驗完成'):t('示範已保存')),h('p',{role:'status',className:'si-saved'},t('✓ 已完成無聲流程示範')),h('div',{className:'si-result'},h('small',null,t('{name} · 示範',{name})),h('strong',null,observationLabel(ob.observation||savedDemo?.observation)),note(guest?t('這次只體驗流程，不會保存資料。'):t('只保存示範選擇，不代表實際偏好，也不是健康判斷。'))),
    !guest&&note(t('完成示範不會建立正式記錄。開始正式記錄會開啟空白表單，請填寫你實際看到的觀察；確認存檔後會建立一筆正式記錄。')),button(t('完成示範（不建立記錄）'),leave,'primary'),!guest&&onFormal&&button(t('開始正式記錄'),()=>{if(!busy){pause();hideKeyboard();onFormal();}},'secondary-btn'),button(t('之後，也可以用自己的聲音嗎？'),()=>update({stage:'voice'})),button(t('重新體驗這一段'),reset,'text-btn centered'),!guest&&note(t('示範只在這台裝置保存，清除網站資料可能遺失，不跨裝置同步。')));
  if(stage==='voice')body=h(R.Fragment,null,title(t('熟悉的聲音，留到之後')),note(t('未來可考慮由你自願錄一小段平常對牠說的話，作為另一次觀察的選項，不必第一次就錄。')),h('aside',{className:'si-previous'},h('strong',null,t('功能尚未開放')),note(t('這裡不能錄音、播放或上傳，也不會要求麥克風權限。現有「語音記錄」仍是原本的固定例句示範。'))),note(t('能辨認熟悉的人聲，不代表錄音一定能安撫牠。')),button(t('完成示範（不建立記錄）'),leave,'primary'));
  const navigate=destination=>{if(busy)return;pause();hideKeyboard();if(!replay&&draft.trim())setHomePending(destination);else if(onNavigate)onNavigate(destination);else onHome?.();};
  return h('div',{className:'inpaw-app shell-with-tabs ob-app si-app'},h(BottomTabs,{react:R,active:navActive,disabled:busy,onNavigate:navigate}),h(Scroll,{className:'app-scroll'},h('main',{className:'app-content si-screen'},ownerKnown&&h(PetOwnerLabel,{react:R,name}),
    homePending&&h('section',{className:'navigation-leave-name',role:'region','aria-label':t('名字尚未儲存')},h('p',null,t('毛孩名字尚未儲存。要保留名字，請繼續填寫並建立毛孩。')),button(t('繼續填寫名字'),()=>{setHomePending(false);setGuest(false);update({stage:'name',running:false});},'primary'),button(t('捨棄名字並離開'),()=>{pause();hideKeyboard();if(onNavigate)onNavigate(homePending);else onHome?.();},'secondary-btn')),
    (stage!=='name'||onBack)&&button(t('‹ 返回'),back,'h-back',{'aria-label':t('返回')}),
    stage!=='name'&&disclaimer,guest&&note(t('範例模式 · 不保存資料')),h('section',{className:'ij-card ij-sound-content'},body),
    error&&h('p',{role:'alert',className:'error'},error),
    stage!=='name'&&stage!=='saved'&&button(t('略過示範（不建立記錄）'),leave,'text-btn centered ob-skip'))));
}
