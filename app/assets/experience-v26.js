import {t, K} from './i18n.js?v=audit1117b';
import {BackupRestore} from "./backup-restore-ui.js?v=audit1117";
import {recentExportText,revealFocusedControl} from './audit-followup-v45.js?v=8f5745b7843b';
import { downloadBackup } from './health-summary-v31.js?v=photo-simplify1';
import {withDevicePreferences} from './backup-restore-store.js?v=fish-merge1';
import {SPECIES,NEUTERED} from './cat-age.js';
import {petDirectory,samePetName} from './pet-archive.js?v=8f5745b7843b';
export { TodayOverview, useLocalDay, localCalendarDate, demoCare } from './today-overview-v29.js?v=8f5745b7843b';
// Small UI components shared by the B1–B9 experience improvements.
export const SEXES = [K('公'), K('母'), K('未填')];
// Keep older saved profiles readable; the editor uses the requested current label.
export const profileSex = value => value === K('公') || value === K('母') ? value : K('未填');
// 2026-11-14：物種、是否結紮（選填；沒填的舊資料一律當「未填」）。
export const profileSpecies = value => SPECIES.includes(value) ? value : K('未填');
export const profileNeutered = value => NEUTERED.includes(value) ? value : K('未填');
export function validProfileExtras(cat) {
  return (cat.breed === undefined || typeof cat.breed === 'string' && cat.breed.length <= 80) &&
    (cat.sex === undefined || (SEXES.includes(cat.sex) || cat.sex === K('未知'))) &&
    (cat.species === undefined || SPECIES.includes(cat.species)) &&
    (cat.neutered === undefined || NEUTERED.includes(cat.neutered));
}
/** 毛孩頁「品種 · 性別」那一行：加上物種與結紮（有填才顯示）。 */
export function profileExtraSummary(profile = {}) {
  const species = profileSpecies(profile.species), neutered = profileNeutered(profile.neutered);
  return [species !== K('未填') && t(species), profile.breed || t('品種未填'), t('性別：{sex}', {sex: t(profileSex(profile.sex))}), neutered !== K('未填') && t(neutered)].filter(Boolean).join(' · ');
}
const chips = (h, className, legend, label, values, current, pick) => h('fieldset', {className: className + ' profile-sex-chips'}, h('legend', null, legend),
  h('div', {role: 'group', 'aria-label': label, style: {flexWrap: 'wrap'}}, values.map(value => h('button', {key: value, type: 'button', 'aria-pressed': current === value, onClick: () => pick(value)}, t(value)))));
export function ProfileExtras({react:R, profile, onChange, Input='input', className='field'}) {
  const h=R.createElement;
  return h(R.Fragment,null,
    h('fieldset',{className:className+' profile-sex-chips'},h('legend',null,t('物種')),h('div',{role:'group','aria-label':t('毛孩物種'),style:{flexWrap:'wrap'}},SPECIES.filter(value=>value!==K('未填')).map(value=>h('button',{key:value,type:'button',disabled:value!==K('貓'),'aria-pressed':profileSpecies(profile.species)===value,onClick:()=>{if(value===K('貓'))onChange({...profile,species:value});}},value===K('貓')?t(value):t('{species}（尚未開放）',{species:t(value)})))),h('small',null,t('目前僅開放貓，其他物種尚未開放。'))),
    h('label',{className},t('品種（選填）'),h(Input,{'aria-label':t('毛孩品種'),value:profile.breed??'',maxLength:80,placeholder:t('不知道可以留白'),onChange:e=>onChange({...profile,breed:e.target.value})})),
    h('fieldset',{className:className+' profile-sex-chips'},h('legend',null,t('性別')),h('div',{role:'group','aria-label':t('毛孩性別'),style:{flexWrap:'wrap'}},SEXES.map(value=>h('button',{key:value,type:'button','aria-pressed':profileSex(profile.sex)===value,onClick:()=>onChange({...profile,sex:value})},t(value))))),
    chips(h, className, t('是否結紮'), t('毛孩是否結紮'), NEUTERED, profileNeutered(profile.neutered), value => onChange({...profile, neutered: value})));
}
// 同名毛孩（2026-11-14）：改名或新增成和另一隻同名時提示，仍可使用。名冊由 multi-cat-v23 每次畫面更新時登記。
export function SameNameNotice({react:R, profile, className = 'same-name-notice'}) {
  const h = R.createElement, directory = petDirectory(), same = samePetName(directory.pets, profile?.name, directory.activeId);
  if (!same.length) return null;
  return h('p', {className, role: 'status', style: {margin: '6px 0 12px', padding: '10px 12px', borderRadius: 12, background: '#fff4dc', color: '#6b4a1f', fontSize: 13, lineHeight: 1.6}},
    t('已經有一隻叫「{name}」的毛孩（{detail}）。仍然可以用這個名字；建議選不同的代表色或填生日、品種，切換時比較好分。', {name: String(profile.name).trim(), detail: same.map(pet => pet.detail).join(t('；'))}));
}
// 毛孩備註（2026-11-14）：上限 500 字並顯示剩餘字數；舊資料超過的不截斷，提示刪減。
export const PROFILE_NOTE_MAX = 500;
export const profileNoteError = note => String(note || '').length > PROFILE_NOTE_MAX ? t('備註最多 {max} 字，目前多了 {count} 字，請刪減後再儲存。', {max: PROFILE_NOTE_MAX, count: String(note).length - PROFILE_NOTE_MAX}) : '';
export function ProfileNoteField({react:R, profile, onChange, Textarea = 'textarea', className = 'field', error = '', onErrorClear = () => {}}) {
  const h = R.createElement, note = profile?.note ?? '', left = PROFILE_NOTE_MAX - note.length;
  return h('label', {className}, t('備註（選填）'),
    h(Textarea, {'aria-label': t('毛孩備註'), value: note, maxLength: PROFILE_NOTE_MAX, ...(Textarea === 'textarea' ? {} : {error, onErrorClear}), placeholder: t('例如：怕吵、對雞肉過敏、看診時會緊張'), onChange: e => onChange({...profile, note: e.target.value})}),
    h('small', {className: 'profile-note-count', 'aria-live': 'polite', style: {display: 'block', textAlign: 'right', color: left < 0 ? '#a33a2a' : undefined}}, left >= 0 ? t('還可以寫 {count} 字', {count: left}) : t('超過 {count} 字，請刪減', {count: -left})));
}
/** 毛孩頁卡片的備註：長的先收合（前 3 行＋「展開」）。 */
export function ProfileNoteDisplay({react:R, note, lines = 3}) {
  const h = R.createElement, [open, setOpen] = R.useState(false), text = String(note || '').trim();
  if (!text) return null;
  const long = text.length > 60 || text.split('\n').length > lines;
  return h('div', {className: 'profile-note'},
    h('p', {className: 'profile-note-text', style: {margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...(long && !open ? {display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden'} : {})}}, text),
    long && h('button', {type: 'button', className: 'text-btn profile-note-toggle', 'aria-expanded': open, onClick: () => setOpen(value => !value), style: {minHeight: 36, padding: '4px 0'}}, open ? t('收合') : t('展開')));
}
export function BackupNotice({react:R,getSnapshot,getSettings,restoreStore,focusBackup=false}) {
  const h=R.createElement,[notice,setNotice]=R.useState(''),[download,setDownload]=R.useState(null);
  const heading=R.useRef(null),recent=recentExportText();
  R.useEffect(()=>{
    if(!focusBackup)return;
    const frame=requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'});});
    return()=>cancelAnimationFrame(frame);
  },[focusBackup]);
  const exportData=()=>{
    try{
      const result=downloadBackup(getSnapshot(),withDevicePreferences(getSettings?.()||{})),{backup,unsupportedPhotos}=result;
      setDownload(result);
      const counts=t('{cats} 隻毛孩、{entries} 筆紀錄',{cats:backup.inventory.cats,entries:backup.inventory.entries});
      setNotice(unsupportedPhotos
        ?t('已產生資料留存檔（{counts}）。有 {count} 張照片超出還原支援範圍，此檔無法直接整份還原。',{counts,count:unsupportedPhotos})+(backup.completeInlinePhotos?'':t('部分照片僅含參照網址。'))+t('請確認下載完成並自己保管檔案與目前資料。')
        :t('已產生 {counts} 的備份檔。請確認下載完成並自己保管。還原前會先檢查檔案，照片會完整讀取。',{counts}));
    }catch(error){setDownload(null);setNotice(error.message);}
  };
  return h('aside',{className:'backup-warning','aria-label':t('匯出與還原備份檔')},
    h('h2',{ref:heading,tabIndex:-1},t('備份全部毛孩')),
    // Show only the last-export time; the default text would repeat the line below.
    recent!==t('資料儲存在這台裝置')&&h('strong',null,recent),
    h('p',null,t('資料只存在這台裝置，不會自動同步。換手機或刪除 App 前，請先匯出備份檔。')),
    getSnapshot&&h('button',{type:'button',className:'backup-export',onClick:exportData},t('匯出備份檔')),
    getSnapshot&&h('p',{className:'backup-hint'},t('備份檔沒有加密，含照片和紀錄，請自己保管。')),
    restoreStore&&h(BackupRestore,{react:R,store:restoreStore}),
    h('details',{className:'backup-details'},h('summary',null,t('匯出範圍與限制')),h('p',null,t('包含所有毛孩已儲存的資料（含已封存）、照片、食品卡、已儲存的草稿與提醒設定，並保留封存狀態；也包含這台裝置的外觀與「開啟時先看」偏好，還原時一併套回（較舊的備份沒有這兩項，還原後維持目前設定）。未確認的手動輸入、正在編輯的表單不包含在內；部分舊照片可能只含參照網址。備份不包含登入憑證，也不會搬移訂閱或進階模式額度；換手機時請重新登入原帳號。商店付款尚未開放。還原時會先預覽，確認後整份取代目前資料；版本不符、未知欄位或無法讀取的照片會拒絕整份還原。匯出不代表已有雲端備份。'))),
    notice&&h('p',{role:'status',className:'backup-status'},notice,download&&h('a',{href:download.url,download:download.filename,className:'backup-download'},download.unsupportedPhotos?t('下載資料留存檔（5 分鐘內有效）'):t('下載備份檔（5 分鐘內有效）'))));
}
export function FoodReviewSummary({react:R,food}) {
  const h=R.createElement;
  return h('section',{className:'food-review-summary','aria-label':t('食品卡完整核對摘要')},h('h2',null,t('建立前，再核對一次')),
    h('p',null,[food.name||t('名稱尚未填'),food.brand,food.flavor,food.kind&&t(food.kind),food.netWeight?food.netWeight+' g':''].filter(Boolean).join(' · ')),
    food.ingredients&&h('p',null,t('原料：{text}',{text:food.ingredients})),
    h('ul',null,food.nutrients.filter(n=>n.value!=='').map(n=>h('li',{key:n.name},t('{name}：{value}',{name:t(n.name),value:n.value===''?t('未標示'):`${n.value} ${n.unit} · ${t(n.bound)} · ${t(n.basis)}`})))),
    h('p',null,t('按下「建立食品卡」或「儲存為新版本」即確認以上資料；留空視為未標示。可先修改上方欄位。')));
}
export function useSimulationClock(R,{active,paused,onTick}) {
  // Wall time, rather than interval count, survives background timer throttling.
  // Each effect owns and clears its interval. Pauses preserve elapsed fractions.
  const elapsed=R.useRef(0),started=R.useRef(null);
  R.useEffect(()=>{
    if(!active){elapsed.current=0;started.current=null;return;}
    if(paused)return;
    started.current=performance.now();
    const tick=()=>onTick(Math.floor((elapsed.current+performance.now()-started.current)/1000));
    tick();const timer=setInterval(tick,200);
    return()=>{elapsed.current+=performance.now()-started.current;started.current=null;clearInterval(timer);};
  },[active,paused]);
}
export {revealFocusedControl} from './audit-followup-v45.js?v=8f5745b7843b';
// Safari pans the visual viewport as well as shrinking it for the keyboard.
// Keep one mobile root aligned with that viewport; never subtract a second
// keyboard height or resize the document itself. Preserve native pinch zoom.
export function observeVisualViewport(win=window,root=document.documentElement) {
  const viewport=win.visualViewport;
  let frame=null,focusFrame=null,voiceFocusTimer=null,last=null,focusPending=false;
  const update=()=>{
    frame=null;
    if(viewport && Math.abs((viewport.scale||1)-1)>.01 && last)return;
    const zoomed=viewport && Math.abs((viewport.scale||1)-1)>.01;
    const rawHeight=zoomed?win.innerHeight:(viewport?.height??win.innerHeight);
    const height=Number.isFinite(rawHeight)&&rawHeight>0?rawHeight:(last?.height??win.innerHeight);
    const rawTop=zoomed?0:(viewport?.offsetTop??0);
    const top=Number.isFinite(rawTop)?Math.max(0,rawTop):0;
    const heightChanged=last?.height!==height,topChanged=last?.top!==top;
    last={height,top};
    root.style.setProperty('--app-visual-height',`${height}px`);
    root.style.setProperty('--app-visual-top',`${top}px`);
    root.toggleAttribute('data-compact-viewport',height<480);
    const voice=root.ownerDocument?.querySelector('.cj-ai-workspace[data-voice-viewport]');
    if(voice){
      // Native keyboard animation and viewport pan can arrive in separate waves.
      // Reveal once after focus/height settles; following pan-only scroll events
      // would fight WebKit's caret pan and feed another positioning cycle.
      if(focusFrame!==null){win.cancelAnimationFrame(focusFrame);focusFrame=null;}
      if(heightChanged||focusPending){
        if(voiceFocusTimer!==null)win.clearTimeout(voiceFocusTimer);
        voiceFocusTimer=win.setTimeout(()=>{voiceFocusTimer=null;revealFocusedControl(root.ownerDocument)},120);
      }
      focusPending=false;
    }else if(heightChanged||topChanged||focusPending){
      focusPending=false;
      if(voiceFocusTimer!==null){win.clearTimeout(voiceFocusTimer);voiceFocusTimer=null;}
      if(focusFrame!==null)win.cancelAnimationFrame(focusFrame);
      focusFrame=win.requestAnimationFrame(()=>{focusFrame=null;revealFocusedControl(root.ownerDocument)});
    }
  };
  const schedule=()=>{if(frame===null)frame=win.requestAnimationFrame(update);};
  const focus=()=>{focusPending=true;schedule()};
  update();
  win.addEventListener('focusin',focus);
  viewport?.addEventListener('resize',schedule);
  viewport?.addEventListener('scroll',schedule);
  win.addEventListener('resize',schedule);
  win.addEventListener('pageshow',schedule);
  return()=>{
    viewport?.removeEventListener('resize',schedule);
    viewport?.removeEventListener('scroll',schedule);
    win.removeEventListener('resize',schedule);
    win.removeEventListener('pageshow',schedule);
    win.removeEventListener('focusin',focus);
    if(frame!==null)win.cancelAnimationFrame(frame);
    if(focusFrame!==null)win.cancelAnimationFrame(focusFrame);
    if(voiceFocusTimer!==null)win.clearTimeout(voiceFocusTimer);
    root.style.removeProperty('--app-visual-height');
    root.style.removeProperty('--app-visual-top');
    root.removeAttribute('data-compact-viewport');
  };
}
const NATIVE_DATE_FIELDS='input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"]';
// Some native date controls can lay out wider than their container.
// Measure the real box and correct only a measured overflow, without assuming
// a platform or padding amount, clipping values, or replacing native pickers.
export function fitNativeDateField(field,win=window) {
  const parent=field.parentElement;
  if(!parent||!field.isConnected)return false;
  const box=parent.getBoundingClientRect(),parentStyle=win.getComputedStyle(parent);
  const scale=parent.offsetWidth?box.width/parent.offsetWidth:1;
  if(!(scale>0)||parent.clientWidth<=0)return false;
  const available=parent.clientWidth-(parseFloat(parentStyle.paddingLeft)||0)-(parseFloat(parentStyle.paddingRight)||0);
  if(available<=0)return false;
  let changed=false;
  for(let attempt=0;attempt<2;attempt++){
    const actual=field.getBoundingClientRect().width/scale;
    if(actual<=available+.5)break;
    const computed=parseFloat(win.getComputedStyle(field).width)||actual;
    const width=Math.max(0,computed-(actual-available));
    field.style.setProperty('width',`${width}px`,'important');
    field.style.setProperty('inline-size',`${width}px`,'important');
    changed=true;
  }
  return changed;
}
export function observeNativeDateSizing(doc=document,win=window) {
  const fields=new Map(),parents=new Map();let frame=null,closed=false;
  const restore=(field,original)=>{for(const name of ['width','inline-size']){const [value,priority]=original[name];if(value)field.style.setProperty(name,value,priority);else field.style.removeProperty(name)}};
  const measure=()=>{
    frame=null;if(closed)return;
    for(const [field,original] of fields){
      if(!field.isConnected||!field.matches(NATIVE_DATE_FIELDS)){restore(field,original);unwatch(original.parent);fields.delete(field);continue}
      restore(field,original);fitNativeDateField(field,win);
    }
  };
  const schedule=()=>{if(!closed&&frame===null)frame=win.requestAnimationFrame(measure)};
  const resize=win.ResizeObserver?new win.ResizeObserver(schedule):null;
  const watch=parent=>{if(!parent)return;const count=parents.get(parent)||0;parents.set(parent,count+1);if(!count)resize?.observe(parent)};
  const unwatch=parent=>{if(!parent)return;const count=parents.get(parent)||0;if(count>1)parents.set(parent,count-1);else{parents.delete(parent);resize?.unobserve(parent)}};
  const refresh=()=>{
    for(const [field,original] of fields){
      if(!field.isConnected||!field.matches(NATIVE_DATE_FIELDS)){restore(field,original);unwatch(original.parent);fields.delete(field)}
      else if(original.parent!==field.parentElement){unwatch(original.parent);original.parent=field.parentElement;watch(original.parent)}
    }
    for(const field of doc.querySelectorAll(NATIVE_DATE_FIELDS))if(!fields.has(field)){
      const original=Object.fromEntries(['width','inline-size'].map(name=>[name,[field.style.getPropertyValue(name),field.style.getPropertyPriority(name)]]));
      fields.set(field,{...original,parent:field.parentElement});watch(field.parentElement);
    }
    schedule();
  };
  const mutation=win.MutationObserver?new win.MutationObserver(refresh):null;
  mutation?.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['type']});
  win.addEventListener('resize',schedule);refresh();
  return()=>{closed=true;mutation?.disconnect();resize?.disconnect();win.removeEventListener('resize',schedule);if(frame!==null)win.cancelAnimationFrame(frame);for(const [field,original] of fields)restore(field,original);fields.clear();parents.clear()};
}
export function useVisualViewport(R) {
  R.useEffect(()=>observeVisualViewport(),[]);
  R.useEffect(()=>observeNativeDateSizing(),[]);
}
