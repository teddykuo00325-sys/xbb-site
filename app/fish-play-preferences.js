import {readFishProfile,fishSoundId} from './fish-rules.js?v=audit1117';

// Session-only choices shared by free fish play and AI play. Permanent per-pet
// settings still use the existing paid fishPlay profile, never this Map.
const sessionChoices=new Map();
const key=scopeId=>String(scopeId||'current');
export function normalizeFishPresentation(value={},paid=false){
 return {
  sizeId:['small','medium','large'].includes(value.sizeId)?value.sizeId:'medium',
  waterTheme:['blue','reef','moon','sand'].includes(value.waterTheme)?value.waterTheme:'blue',
  scene:paid&&['basic','pond','night','garden'].includes(value.scene)?value.scene:'basic',
  appearance:paid&&['gold','sunshine','rose'].includes(value.appearance)?value.appearance:'gold',
  soundEnabled:typeof value.soundEnabled==='boolean'?value.soundEnabled:true,
  volume:Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):.45,
  bgSound:value.bgSound&&fishSoundId(value.bgSound)?value.bgSound:'water',
  hitSound:value.hitSound&&fishSoundId(value.hitSound)?value.hitSound:'tone'
 };
}
export function readFishPresentation(data,{paid=false,scopeId=''}={}){
 return normalizeFishPresentation({...readFishProfile(data,paid).settings,...sessionChoices.get(key(scopeId))},paid);
}
export function rememberFishPresentation(scopeId,value,paid=false){
 const next=normalizeFishPresentation(value,paid);sessionChoices.set(key(scopeId),next);return {...next};
}
export function clearFishPresentation(){sessionChoices.clear();}
