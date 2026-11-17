// Local, optional event sounds. No model, microphone, remote URL or continuous loop.
export const PLAY_SOUNDS = Object.freeze([
  {id:'off',label:'靜音',description:'只看畫面，不播放聲音。'},
  {id:'water',label:'輕水聲',description:'玩法變化時，播放一小段合成水滴聲。'},
  {id:'rustle',label:'沙沙聲',description:'玩法變化時，播放一小段沙沙聲。'},
  {id:'cue',label:'短提示音',description:'玩法變化時，播放一小段合成輕鈴音。'}
]);

const FILES = Object.freeze({water:'/xbb-site/app/audio/drops.wav',rustle:'/xbb-site/app/audio/rustle.mp3',cue:'/xbb-site/app/audio/chimes.wav'});
const CLIP_MS = 1200;
const GAP_MS = 1500;

export function createPlayAudio({
  createAudio=()=>new Audio(),notify=()=>{},doc=globalThis.document,win=globalThis.window,
  now=()=>Date.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)
}={}) {
  let audio=null,disposed=false,enabled=false,failed=false,wantsPlay=false,generation=0,timer=null,lastCue=-Infinity;
  let state={mode:'off',phase:'idle',error:''};
  const emit=patch=>{state={...state,...patch};if(!disposed)notify({...state});};
  const clear=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
  const silence=()=>{audio?.pause();if(audio){try{audio.currentTime=0;}catch{}}};
  const finish=()=>{if(!wantsPlay)return;generation++;wantsPlay=false;clear();silence();emit({phase:'ready'});};
  const fail=()=>{
    generation++;wantsPlay=false;failed=true;clear();silence();
    emit({phase:'error',error:'聲音暫時無法播放，這次先靜音陪玩。可重新開始聲音再試。'});
  };
  const handlers={
    playing:()=>{if(disposed||!enabled||!wantsPlay||doc?.hidden){silence();return;}emit({phase:'playing',error:''});},
    ended:finish,
    timeupdate:()=>{if(wantsPlay&&audio.currentTime>=CLIP_MS/1000)finish();},
    error:()=>{if(enabled&&wantsPlay&&!disposed)fail();}
  };
  const getAudio=()=>{
    if(!audio){
      audio=createAudio();audio.preload='none';audio.loop=false;audio.volume=.15;
      for(const [event,handler] of Object.entries(handlers))audio.addEventListener(event,handler);
    }
    return audio;
  };
  const play=()=>{
    if(disposed||!enabled||failed||state.mode==='off'||doc?.hidden||wantsPlay)return Promise.resolve(false);
    const ticket=++generation;lastCue=now();wantsPlay=true;
    try{
      const media=getAudio();
      if(media.getAttribute?.('src')!==FILES[state.mode]){media.src=FILES[state.mode];media.load();}
      try{media.currentTime=0;}catch{}
      emit({phase:'loading',error:''});
      // Bound the whole request, including stalled loading and late play promises.
      clear();timer=setTimer(()=>{if(ticket===generation)finish();},CLIP_MS);
      const result=media.play();
      return Promise.resolve(result).then(()=>{
        if(ticket!==generation){
          // A previous request must never pause a newer active request.
          if(disposed||!enabled||!wantsPlay)silence();
          return false;
        }
        if(disposed||!enabled||!wantsPlay||doc?.hidden){silence();return false;}
        emit({phase:'playing',error:''});return true;
      },()=>{if(ticket===generation&&!disposed)fail();return false;});
    }catch{if(ticket===generation&&!disposed)fail();return Promise.resolve(false);}
  };
  const stop=()=>{generation++;enabled=false;wantsPlay=false;clear();silence();emit({phase:'idle'});};
  const hidden=()=>{if(doc?.hidden)stop();};
  const background=()=>stop();
  doc?.addEventListener('visibilitychange',hidden);
  for(const event of ['pagehide','blur','inpaw-app-inactive'])win?.addEventListener(event,background);
  return {
    getState:()=>({...state}),
    start(mode='off'){
      if(disposed)return Promise.resolve(false);
      stop();failed=false;
      if(!PLAY_SOUNDS.some(sound=>sound.id===mode)){
        emit({mode:'off',phase:'error',error:'聲音選項無法讀取，已改為靜音。'});return Promise.resolve(false);
      }
      emit({mode,phase:'idle',error:''});enabled=mode!=='off'&&!doc?.hidden;
      return play();
    },
    cue(){
      if(now()-lastCue<GAP_MS)return Promise.resolve(false);
      return play();
    },
    stop,
    dispose(){
      if(disposed)return;
      stop();disposed=true;
      doc?.removeEventListener('visibilitychange',hidden);
      for(const event of ['pagehide','blur','inpaw-app-inactive'])win?.removeEventListener(event,background);
      if(audio){
        for(const [event,handler] of Object.entries(handlers))audio.removeEventListener(event,handler);
        audio.removeAttribute('src');audio.load();
      }
    }
  };
}
