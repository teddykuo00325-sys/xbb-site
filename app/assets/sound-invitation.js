import {t} from './i18n.js?v=audit1117b';
// Presentation only. Opening or dismissing this invitation never writes data,
// prepares a new draw, starts playback, or guesses a cat's preferences.
export function SoundInvitation({react:R,name,onStart,onDismiss}) {
 const h=R.createElement;
 return h('aside',{className:'sound-invitation','aria-labelledby':'sound-invitation-title','data-testid':'sound-invitation'},
  h('div',{className:'sound-invitation-heading'},h('h2',{id:'sound-invitation-title'},t('想看看{name}對哪些聲音有反應嗎？',{name})),h('button',{type:'button',className:'sound-invitation-close','aria-label':t('關閉聲音探索邀請'),onClick:onDismiss},'×')),
  h('p',null,t('先調低手機音量，讓牠自由離開；緊張就停止。剛到家也可以稍後再試。')),
  h('div',{className:'sound-invitation-actions'},h('button',{type:'button',className:'sound-invitation-start',onClick:onStart},t('試試聲音探索')),h('button',{type:'button',className:'sound-invitation-skip',onClick:onDismiss},t('稍後再試'))),
  h('small',null,t('不會自動播放，之後也能從「陪玩」開啟。')));
}

// 2026-11-14：不在記完第一餐就推。第一筆實際紀錄滿 3 天、而且這隻毛孩還沒聽過任何聲音，才在首頁出現；
// 按「稍後再試」或 × 之後 7 天內不再出現（只存在這台裝置的偏好，不寫入毛孩資料、不進備份）。
export const SOUND_INVITE_MIN_DAYS=3;
export const SOUND_INVITE_SNOOZE_DAYS=7;
const SNOOZE_KEY='inpaw.soundInvitation.snoozeUntil.';
const dayNumber=date=>{const t=Date.parse(String(date||'')+'T00:00:00Z');return Number.isFinite(t)?Math.round(t/864e5):null;};
const shiftDay=(date,days)=>new Date((dayNumber(date)+days)*864e5).toISOString().slice(0,10);
const store=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
export function soundInvitationSnoozedUntil(catId,storage=store()){
 try{const value=storage?.getItem(SNOOZE_KEY+catId);return dayNumber(value)===null?'':value;}catch{return '';}
}
export function snoozeSoundInvitation(catId,today,storage=store(),days=SOUND_INVITE_SNOOZE_DAYS){
 if(!catId||dayNumber(today)===null)return '';
 const until=shiftDay(today,days);
 try{storage?.setItem(SNOOZE_KEY+catId,until);}catch{}
 return until;
}
/** rows：這隻毛孩已通過共用篩選的實際紀錄；playCount：soundProgress(profile).playCount。 */
export function soundInvitationDue({catId,rows=[],today,playCount=0,snoozedUntil=soundInvitationSnoozedUntil(catId)}={}){
 const now=dayNumber(today);
 if(!catId||now===null||playCount>0)return false;
 const first=rows.reduce((min,row)=>{const n=dayNumber(row?.date);return n!==null&&n<=now&&(min===null||n<min)?n:min;},null);
 if(first===null||now-first<SOUND_INVITE_MIN_DAYS)return false;
 const until=dayNumber(snoozedUntil);
 return until===null||now>=until;
}
