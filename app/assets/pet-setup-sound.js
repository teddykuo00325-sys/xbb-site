import {ALL_SOUND_TRACKS,createSoundPlayer} from '../sound-player.js?v=r6';
import {t} from './i18n.js?v=audit1117b';

const previewTracks=ALL_SOUND_TRACKS.filter(track=>['paper','cloth'].includes(track.id));

function PreviewPlayer({react:R}) {
 const h=R.createElement,media=R.useRef(null),player=R.useRef(null);
 const [state,setState]=R.useState({id:null,phase:'idle',error:''});
 R.useEffect(()=>{
  const controller=createSoundPlayer(media.current,setState);
  player.current=controller;
  return()=>{controller.dispose();player.current=null;};
 },[]);
 const active=['loading','playing'].includes(state.phase);
 const current=previewTracks.find(track=>track.id===state.id);
 const status=state.error||(state.phase==='loading'?t('正在準備聲音…'):state.phase==='playing'?t('正在播放{name}',{name:current.name}):state.phase==='ended'?t('播放完畢。'):t('點播放才會開始。'));
 return h(R.Fragment,null,
  h('p',null,t('先調低裝置音量。讓貓咪自由離開，若牠走開或不安就停止。')),
  h('audio',{ref:media,preload:'none'}),
  h('div',{className:'pet-setup-sound-tracks'},previewTracks.map(track=>{
   const stop=active&&state.id===track.id;
   return h('button',{key:track.id,type:'button','aria-label':(stop?t('停止 '):t('播放 '))+track.name,
    onClick:()=>{if(stop)player.current?.stop();else void player.current?.toggle(track);}},(stop?t('停止 '):t('播放 '))+track.name);
  })),
  h('p',{role:'status'},status),
  h('p',null,t('這裡只試聽，不保存反應。建檔後，到「陪玩 → 聲音探索」播放當天開放的聲音，再記下反應。')));
}

export function PetSetupSound({react:R,disabled=false}) {
 const h=R.createElement,id=R.useId(),[open,setOpen]=R.useState(false);
 return h('section',{className:'pet-setup-sound'},
  h('button',{type:'button',className:'pet-setup-sound-toggle','aria-controls':id,'aria-expanded':open&&!disabled,disabled,
   onClick:()=>setOpen(value=>!value)},open&&!disabled?t('收起試聽'):t('先試聽兩段聲音（可跳過）'),h('span',{'aria-hidden':true},open&&!disabled?'−':'+')),
  h('div',{id,hidden:!open||disabled},open&&!disabled&&h(PreviewPlayer,{react:R})));
}
