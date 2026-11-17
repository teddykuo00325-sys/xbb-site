import {t} from './assets/i18n.js?v=audit1117b';
export const FISH_LEVELS=[
 {id:1,name:t('小魚見面'),count:1,scene:'basic',target:3,pro:false},
 {id:2,name:t('池塘散步'),count:2,scene:'basic',target:5,pro:false},
 {id:3,name:t('魚群來了'),count:3,scene:'basic',target:8,pro:false},
 {id:4,name:t('荷葉躲貓貓'),count:5,scene:'pond',target:10,pro:true},
 {id:5,name:t('星光小魚隊'),count:8,scene:'night',target:12,pro:true},
 {id:6,name:t('花園魚派對'),count:10,scene:'garden',target:15,pro:true}
];
export const FISH_APPEARANCES=[{id:'gold',label:t('黃綠')},{id:'sunshine',label:t('奶油黃')},{id:'rose',label:t('珊瑚粉')}];
const scenes=['basic','pond','night','garden'],speeds=['slow','normal','fast','turbo','still'];
const validSettings=s=>s&&Number.isInteger(s.count)&&s.count>=1&&s.count<=10&&scenes.includes(s.scene)&&speeds.includes(s.speed)&&(s.appearance===undefined||FISH_APPEARANCES.some(a=>a.id===s.appearance))&&(s.randomRoutes===undefined||typeof s.randomRoutes==='boolean')&&(s.unlimited===undefined||typeof s.unlimited==='boolean');
export function validFishProfile(cat){
 const p=cat?.fishPlay;if(p===undefined)return true;
 return !!p&&p.version===1&&validSettings(p.settings)&&validFreeplayExtras(p.settings)&&Array.isArray(p.completed)&&p.completed.length<=6&&p.completed.every((id,i)=>id===i+1);
}
function validFreeplayExtras(s){return (s.sizeId===undefined||['small','medium','large'].includes(s.sizeId))&&(s.waterTheme===undefined||['blue','reef','moon','sand'].includes(s.waterTheme))&&(s.soundEnabled===undefined||typeof s.soundEnabled==='boolean')&&(s.volume===undefined||Number.isFinite(s.volume)&&s.volume>=0&&s.volume<=1)&&fishSoundId(s.bgSound)&&fishSoundId(s.hitSound);}
// Background / catch sound: built-in synth ('water' / 'tone'), 'none', or a sound-explorer track id.
export const fishSoundId=v=>v===undefined||(typeof v==='string'&&/^[a-z]{2,16}$/.test(v));
export function readFishProfile(data,paid=false,wide=false){
 if(!validFishProfile(data.cat))throw Error(t('小魚探險資料無法讀取，原資料已保留。'));
 const p=data.cat?.fishPlay;
 // 2026-11-17：免費預設 1 隻約 8.8 秒就游完，貓剛被吸引就結束；改用免費上限 3 隻（每次 1–3 隻本來就免費）。
 const defaults={count:paid?(wide?5:3):3,scene:'basic',speed:'slow',appearance:'gold',randomRoutes:false,unlimited:false,sizeId:'medium',waterTheme:'blue',soundEnabled:true,volume:.45,bgSound:'water',hitSound:'tone'};
 const settings=paid?{...defaults,...p?.settings}:defaults;
 if(settings.speed==='still')settings.speed='slow';
 if(settings.speed==='turbo')settings.speed='fast';
 return {settings,completed:[...(p?.completed||[])]};
}
function put(data,patch){return {...data,cat:{...data.cat,fishPlay:{version:1,settings:{count:3,scene:'basic',speed:'slow'},completed:[],...data.cat.fishPlay,...patch}}};}
export function saveFishSettings(data,settings,paid){
 if(!paid)throw Error(t('分貓保存設定為 Pro 功能。'));
 if(!validFishProfile(data.cat)||!validSettings(settings)||!validFreeplayExtras(settings))throw Error(t('請確認小魚數量、外觀、場景與速度。'));
 return put(data,{settings:{count:settings.count,scene:settings.scene,speed:settings.speed==='still'?'slow':settings.speed==='turbo'?'fast':settings.speed,appearance:settings.appearance||'gold',randomRoutes:settings.randomRoutes??false,unlimited:settings.unlimited??false,sizeId:settings.sizeId||'medium',waterTheme:settings.waterTheme||'blue',soundEnabled:settings.soundEnabled??true,volume:settings.volume??.45,bgSound:settings.bgSound||'water',hitSound:settings.hitSound||'tone'}});
}
export function canPlayLevel(profile,id,paid=false){
 const level=FISH_LEVELS.find(l=>l.id===id);
 return !!level&&(!level.pro||paid)&&(id===1||profile.completed.includes(id-1));
}
export function completeFishLevel(data,id,paid=false){
 const p=readFishProfile(data,paid);
 if(!canPlayLevel(p,id,paid))throw Error(t('請先完成上一關，Pro 主題關卡需啟用 Pro。'));
 return put(data,{completed:[...new Set([...p.completed,id])].sort((a,b)=>a-b)});
}
