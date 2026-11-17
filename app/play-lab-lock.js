import {t} from './assets/i18n.js?v=audit1117b';
// 陪玩鎖定共用模組（2026-11-14）：小魚遊戲（fish-game.js）與陪玩實驗室（play-lab.js）共用。
// 開始陪玩後預設鎖定，畫面只留一個小鎖頭；解鎖要「按住鎖頭不放 2 秒、手指不滑開」，
// 短按、滑過、第二根手指、pointercancel 都不解鎖。鍵盤（Enter／空白鍵，click detail=0）可直接解鎖（無障礙）。
export const PLAY_UNLOCK_HOLD_MS=2000;
export const PLAY_UNLOCK_MOVE_PX=30;
export function createUnlockHold({holdMs=PLAY_UNLOCK_HOLD_MS,movePx=PLAY_UNLOCK_MOVE_PX,onUnlock,onHint=()=>{},onHolding=()=>{},timers={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}}={}){
 let pointer=null,origin=null,timer=null;
 const cancel=hint=>{if(timer!==null)timers.clear(timer);const was=pointer!==null;timer=null;pointer=null;origin=null;if(was){onHolding(false);if(hint)onHint(hint);}};
 return {
  down(event){if(pointer!==null)return false;pointer=event.pointerId??'pointer';origin={x:event.clientX||0,y:event.clientY||0};onHolding(true);onHint(t('繼續按住，2 秒後解鎖…'));timer=timers.set(()=>{timer=null;pointer=null;origin=null;onHolding(false);onUnlock();},holdMs);return true;},
  move(event){if(pointer===null||(event.pointerId??'pointer')!==pointer)return;if(Math.hypot((event.clientX||0)-origin.x,(event.clientY||0)-origin.y)>movePx)cancel(t('手指滑開了。要解鎖請按住鎖頭不放 2 秒。'));},
  up(event){if(pointer===null||(event?.pointerId??'pointer')!==pointer)return;cancel(t('鎖定中。要解鎖請按住鎖頭不放 2 秒。'));},
  cancel:()=>cancel(''),
  get holding(){return pointer!==null;}
 };
}
export const LockIcon=(R,open=false)=>R.createElement('svg',{viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:false},R.createElement('rect',{x:5,y:11,width:14,height:10,rx:2}),R.createElement('path',{d:open?'M8 11V7a4 4 0 0 1 7.5-2':'M8 11V7a4 4 0 0 1 8 0v4'}));
// 鎖頭按鈕的事件：getHold 回傳 createUnlockHold 物件；unlock 是鍵盤直接解鎖。
export function unlockHoldHandlers(getHold,unlock){
 return {
  onPointerDown:event=>{event.stopPropagation();event.preventDefault();if(getHold()?.down(event)){try{event.currentTarget?.setPointerCapture?.(event.pointerId);}catch{}}},
  onPointerMove:event=>getHold()?.move(event),onPointerUp:event=>getHold()?.up(event),onPointerCancel:()=>getHold()?.cancel(),onLostPointerCapture:event=>getHold()?.up(event),
  onContextMenu:event=>event.preventDefault(),onClick:event=>{event.stopPropagation?.();if(event.detail===0)unlock();}
 };
}
