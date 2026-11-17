// 看診紀錄與吃藥（Ian 2026-11-13）：首頁照顧時間表裡「＋ 記看診」與今天要吃的藥。
// 藥名、劑量、時間、天數都照獸醫交代由飼主填；App 只提醒與勾選，不建議用藥。
import {applyScopedSoundTransform} from './multi-cat-v23.js?v=photo-simplify1';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {useCloudQuota} from './cloud-quota.js?v=quota-feedback1';
import {composeBagPhotos, submitMedBag, waitMedBag, releaseMedBag, loadMedPending, saveMedPending, bagToMeds, unreviewedBagMeds, MED_BAG_MAX_PHOTOS} from './med-bag.js?v=quota-feedback1';
import {blankMed, medDays, medEnd, addFollowUp, buildVisit, saveVisit, updateVisit, deleteVisit, restoreVisit, stopMed, resumeMed, visitHistory, medStatus, activeMeds, yesterdayMeds, finishedMeds, toggleDose, doseOutcome, setDoseOutcome, MED_MAX, MED_TIMES_MAX, LONG_TERM_END, isLongTerm, medUntilText} from './vet-visit-model.js?v=1';
import {requireActivePet,petArchiveGeneration} from './pet-archive.js?v=8f5745b7843b';
import {t, K, tn} from './i18n.js?v=audit1117b';
import {cuteActionLabel} from './cute-action-icons.js?v=audit1117b';

const field = (h, label, input) => h('label', {className: 'field vv-field'}, h('span', null, label), input);
const md = date => date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : '';
const ymd = date => date ? date.replaceAll('-', '/') : '';
const cameraIcon = h => h('svg', {viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round', 'aria-hidden': true, className: 'vv-icon'},
  h('path', {d: 'M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4z'}), h('circle', {cx: 12, cy: 13.2, r: 3.4}));

// 吃藥時間快選（Ian 2026-11-13：藥袋多寫「早晚」「三餐飯後」，一個一個加太慢）。按了直接帶入，之後仍可改。
export const TIME_PRESETS = Object.freeze([
  {label: t('早上'), times: ['08:00']},
  {label: t('晚上'), times: ['20:00']},
  {label: t('早晚'), times: ['08:00', '20:00']},
  {label: t('早中晚'), times: ['08:00', '13:00', '20:00']},
]);
const slotLabel = time => { const hour = Number(String(time).slice(0, 2)); return hour < 11 ? t('早上') : hour < 17 ? t('中午') : t('晚上'); };
// 吃幾天（Ian 2026-11-14）：負數、0、小數都不默默改值，直接說哪裡不對。空白交給存檔時提醒。
export const daysProblem = days => {
  const v = String(days ?? '').trim();
  if (!v) return '';
  if (!/^\d+$/.test(v) || Number(v) < 1) return t('吃幾天要填 1 以上的整數，不能是負數、0 或小數。');
  if (Number(v) > 365) return t('吃幾天最多填 365；吃更久請勾「長期吃」。');
  return '';
};
// 新增的藥不預設吃藥時間（Ian 2026-11-14：一天一次的藥沒改到，就會每天多跳一次提醒）。
export const noTimesText = name => t('「{name}」還沒選每天什麼時候吃：請按「早上／晚上／早晚／早中晚」，或「＋ 自己加時間」。', {name});
const sameTimes = (a, b) => a.length === b.length && [...a].sort().every((t, i) => t === [...b].sort()[i]);

const DOSE_LABELS={unrecorded:K('尚未記錄'),taken:K('已吃藥'),unsuccessful:K('未成功'),uncertain:K('不確定')};
const DOSE_REASONS={'':K('未填原因'),refused:K('拒吃'),'spat-out':K('吐出'),partial:K('只吃一部分'),other:K('其他')};
const doseLabel=state=>t(DOSE_LABELS[state]||DOSE_LABELS.unrecorded);
const doseDetails=outcome=>[outcome.reason&&t(DOSE_REASONS[outcome.reason]||DOSE_REASONS.other),outcome.note].filter(Boolean).join(' · ');
const doseSignature=outcome=>JSON.stringify([outcome.status,outcome.reason||'',outcome.note||'',outcome.updatedAt||'']);
const DOSE_UI_STYLE=`.vv-dose-slot{display:grid;gap:5px;min-width:0;width:100%;padding:7px 0}.vv-dose-slot .vv-dose-actions{display:flex;flex-wrap:wrap;gap:6px}.vv-dose-slot .vv-dose-actions button{min-height:44px;max-width:100%;white-space:normal;overflow-wrap:break-word}.vv-dose-state{display:block;line-height:1.5;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}.vv-dose-exception{border-left:3px solid currentColor;padding-left:9px}.vv-dose-history{margin:10px 0}.vv-dose-history>summary{min-height:44px;cursor:pointer;line-height:1.5;align-content:center}.vv-dose-history ul{list-style:none;padding:0}.vv-dose-history li{padding:9px 0;border-bottom:1px solid #b5a58f55}.vv-dose-dialog{overflow:auto;overscroll-behavior:contain;color:inherit;max-width:100%;padding:18px}.vv-dose-dialog h2{font-size:20px;line-height:1.4;margin:0 0 12px}.vv-dose-dialog p{line-height:1.6;overflow-wrap:anywhere}.vv-dose-dialog fieldset{min-width:0;margin:14px 0;padding:10px;border:1px solid #b5a58f;border-radius:12px}.vv-dose-dialog .vv-dose-choice{display:flex;align-items:center;gap:9px;min-height:44px;line-height:1.5}.vv-dose-choice input{width:20px;height:20px;flex:none}.vv-dose-dialog select,.vv-dose-dialog textarea{display:block;box-sizing:border-box;width:100%;min-height:44px;font:inherit;font-size:16px;color:inherit;background:transparent;padding:10px;border:1px solid #b5a58f;border-radius:10px;margin-top:6px}.vv-dose-dialog textarea{min-height:100px;resize:vertical}.vv-dose-dialog .vv-actions{display:grid;gap:8px;margin-top:18px}.vv-dose-dialog button{min-height:44px;white-space:normal;overflow-wrap:break-word}.vv-dose-dialog :focus-visible{outline:3px solid currentColor;outline-offset:3px}.vv-dose-dialog::backdrop{background:#17130f80}`;
const DOSE_STATE_STYLE='.care-timeline-row.is-med:has(.vv-dose-exception){background:transparent!important;border-color:#b5a58f!important}.vv-dose-exception .vv-slot:not([aria-pressed=true]){background:transparent!important;border-color:currentColor!important;color:inherit!important}';
function doseTarget(data,catId,visitId,medId,generation){
 requireActivePet(data,catId,generation);
 const visit=(data.vetVisits||[]).find(v=>v.id===visitId&&v.catId===catId&&!v.deletedAt);
 const med=visit?.meds?.find(m=>m.id===medId);
 if(!med)throw Error(t('找不到這份藥，請重新整理。'));
 return med;
}
/** 每個排定時間各自記錄；失敗時保留表單，只有交易成功才關閉。 */
export function DoseOutcomeEditor({react:R,root,catId,today,target,onClose,onSaved}){
 const h=R.createElement,ref=R.useRef(null),opener=R.useRef(typeof document!=='undefined'?document.activeElement:null),lock=R.useRef(false);
 const [value,setValue]=R.useState(()=>({...target.outcome})),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
 usePhoneDialog(R,ref,true);
 R.useEffect(()=>{ref.current?.showModal?.();ref.current?.querySelector('input:checked')?.focus?.();return()=>{ref.current?.close?.();opener.current?.focus?.();};},[]);
 const close=()=>{if(!lock.current)onClose?.();};
 const patch=next=>{setValue(v=>({...v,...next}));setError('');};
 const save=async event=>{
  event?.preventDefault?.();if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{
   await root.atomic(data=>{
    if(data.multiCat?.activeId!==target.activeId)throw Error(t('照顧中的毛孩已切換，請重新開啟用藥紀錄。'));
    const med=doseTarget(data,catId,target.visitId,target.medId,target.generation);
    if(doseSignature(doseOutcome(med,target.key))!==doseSignature(target.outcome))throw Error(t('這次用藥狀況已變更，請關閉後重新開啟核對。'));
    return setDoseOutcome(data,target.visitId,target.medId,target.key,value,today);
   });
   onSaved?.(value.status);onClose?.();
  }catch(e){setError(tn(e.message)||t('沒有存到，請再試一次。'));}
  finally{lock.current=false;setBusy(false);}
 };
 const hasDetails=value.status==='unsuccessful'||value.status==='uncertain';
 return h('dialog',{ref,className:'m-action-dialog vv-dose-dialog','aria-label':t('記錄這次用藥狀況'),onCancel:e=>{e.preventDefault();close();}},
  h('style',null,DOSE_UI_STYLE+DOSE_STATE_STYLE),h('h2',null,t('記錄這次用藥狀況')),
  h('p',null,h('strong',null,target.name),h('br'),ymd(target.key.slice(0,10))+' '+target.key.slice(11)),
  h('form',{onSubmit:save},h('fieldset',null,h('legend',null,t('這次用藥狀態')),
   Object.entries(DOSE_LABELS).map(([status,label])=>h('label',{key:status,className:'vv-dose-choice'},h('input',{type:'radio',name:'dose-status',value:status,checked:value.status===status,disabled:busy,onChange:()=>patch({status})}),t(label)))),
   hasDetails&&h(R.Fragment,null,field(h,t('原因（選填）'),h('select',{'aria-label':t('原因（選填）'),value:value.reason||'',disabled:busy,onChange:e=>patch({reason:e.target.value})},Object.entries(DOSE_REASONS).map(([reason,label])=>h('option',{key:reason,value:reason},t(label))))),
    field(h,t('本次備註（選填，最多 500 字）'),h('textarea',{'aria-label':t('本次備註（選填，最多 500 字）'),value:value.note||'',maxLength:500,disabled:busy,onChange:e=>patch({note:e.target.value})})),
    h('p',{className:'vv-note'},t('只記錄這次遇到的狀況，不代表已吃藥；是否補餵或調整用藥，請依獸醫指示。'))),
   value.status==='unrecorded'&&h('p',{className:'vv-note'},t('儲存後會清除這次的狀態與備註，回到尚未記錄。')),
   error&&h('p',{className:'error',role:'alert'},error),
   h('div',{className:'vv-actions'},h('button',{type:'submit',className:'primary',disabled:busy},busy?t('儲存中…'):t('儲存本次狀況')),h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:close},t('取消')))));
}
function doseEditTarget(data,catId,visitId,med,key){return{catId,activeId:data.multiCat?.activeId,visitId,medId:med.id,key,name:med.name,outcome:doseOutcome(med,key),generation:petArchiveGeneration((data.multiCat?.cats||[]).find(p=>p.id===catId))};}
/** 今日、昨天、家庭總覽與歷史共用同一份狀態編輯及保存保護。 */
export function DoseSlotActions({react:R,root,catId:givenCatId,visitId,med,slot,today,showDate=false,includeStyles=true}){
 const h=R.createElement,[editing,setEditing]=R.useState(null),[busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),lock=R.useRef(false);
 const data=root?.get?.().data,catId=givenCatId||(data?.vetVisits||[]).find(v=>v.id===visitId)?.catId;
 const key=slot.key,outcome=doseOutcome(med,key),time=showDate?ymd(key.slice(0,10))+' '+key.slice(11):slot.time||key.slice(11);
 R.useEffect(()=>{setEditing(null);setError('');setNotice('');},[catId,visitId,med.id,key]);
 const edit=()=>{setError('');setNotice('');setEditing(doseEditTarget(root.get().data,catId,visitId,med,key));};
 const toggle=async()=>{
  if(lock.current)return;
  // 2026-11-17：已吃藥再點一下不直接取消（家人誤觸後畫面變沒吃，下一位可能重複餵藥）；改開狀態編輯，要改回「尚未記錄」須在編輯器明確儲存。
  if(outcome.status==='unsuccessful'||outcome.status==='uncertain'||outcome.status==='taken'){edit();return;}
  lock.current=true;setBusy(true);setError('');setNotice('');
  const target=doseEditTarget(data,catId,visitId,med,key);
  try{await root.atomic(current=>{
   if(current.multiCat?.activeId!==target.activeId)throw Error(t('照顧中的毛孩已切換，請重新開啟用藥紀錄。'));
   const found=doseTarget(current,catId,visitId,med.id,target.generation);
   if(doseSignature(doseOutcome(found,key))!==doseSignature(target.outcome))throw Error(t('這次用藥狀況已變更，請關閉後重新開啟核對。'));
   return toggleDose(current,visitId,med.id,key,today);
  });setNotice(t('已記下 {name} {time} 已吃藥；要更改請再點一次。',{name:med.name,time}));}catch(e){setError(tn(e.message)||t('沒有存到，請再試一次。'));}
  finally{lock.current=false;setBusy(false);}
 };
 const exceptional=outcome.status==='unsuccessful'||outcome.status==='uncertain';
 return h('div',{className:'vv-dose-slot'+(exceptional?' vv-dose-exception':''),'data-dose-key':key},includeStyles&&h('style',null,DOSE_UI_STYLE+DOSE_STATE_STYLE),
  h('div',{className:'vv-dose-actions'},h('button',{type:'button',className:outcome.status==='taken'?'vv-slot is-taken':'vv-slot','aria-pressed':outcome.status==='taken','aria-label':outcome.status==='taken'?t('{name} {time} 已吃藥，點一下可更改',{name:med.name,time}):t('{name} {time} 記已吃藥',{name:med.name,time}),disabled:busy,onClick:toggle},outcome.status==='taken'?t('{time} 已吃藥 ✓',{time}):exceptional?t('{time}：{status}',{time,status:doseLabel(outcome.status)}):t('{time} 記已吃藥',{time})),
   h('button',{type:'button',className:'text-btn',disabled:busy,onClick:edit,'aria-label':t('{name} {time}：其他狀態或備註',{name:med.name,time})},t('其他狀態／備註'))),
  exceptional&&h('span',{className:'vv-dose-state'},doseDetails(outcome)||t('未填原因')),
  notice&&h('p',{className:'care-timeline-notice',role:'status'},notice),error&&h('p',{className:'error',role:'alert'},error),
  editing&&editing.catId===catId&&h(DoseOutcomeEditor,{key:editing.catId+':'+editing.visitId+':'+editing.medId+':'+editing.key,react:R,root,catId,today,target:editing,onClose:()=>setEditing(null),onSaved:status=>setNotice(status==='unrecorded'?t('已清除本次狀況，回到尚未記錄。'):t('本次用藥狀況已儲存。'))}));
}
function DoseHistory({react:R,root,catId,visitId,med,today}){
 const h=R.createElement,[all,setAll]=R.useState(false),keys=[...new Set([...(med.taken||[]),...Object.keys(med.doseOutcomes||{})])].filter(key=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(key)&&key.slice(0,10)<=today).sort().reverse();
 if(!keys.length)return null;
 return h('details',{className:'vv-dose-history'},h('style',null,DOSE_UI_STYLE+DOSE_STATE_STYLE),h('summary',null,t('每次用藥狀況（{count} 筆）',{count:keys.length})),h('ul',null,(all?keys:keys.slice(0,30)).map(key=>h('li',{key},h(DoseSlotActions,{react:R,root,catId,visitId,med,slot:{key,time:key.slice(11)},today,showDate:true,includeStyles:false})))),
  !all&&keys.length>30&&h('button',{type:'button',className:'text-btn',onClick:()=>setAll(true)},t('顯示更早的用藥紀錄')));
}


/**
 * 拍藥袋：選 1 到 3 張照片 → 確認送出（說清楚會送什麼、用幾次額度）→ 交給上層送出與等待。
 * 只有原生 App 有線上（網頁版不顯示）。
 */
function MedBagCapture({react: R, cloud, disabled, onSend}) {
  const h = R.createElement;
  const [stage, setStage] = R.useState('idle'), [photos, setPhotos] = R.useState([]);
  const camera = R.useRef(null), gallery = R.useRef(null);
  const quota = useCloudQuota(R, stage === 'consent', cloud);
  R.useEffect(() => () => photos.forEach(p => URL.revokeObjectURL(p.url)), []);
  const add = list => {
    const files = [...(list || [])].filter(f => /^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) && f.size > 0 && f.size <= 15 * 1024 * 1024);
    setPhotos(old => [...old, ...files.map(file => ({file, url: URL.createObjectURL(file)}))].slice(0, MED_BAG_MAX_PHOTOS));
    setStage('pick');
  };
  const remove = i => setPhotos(old => { URL.revokeObjectURL(old[i].url); const next = old.filter((_, j) => j !== i); if (!next.length) setStage('idle'); return next; });
  const reset = () => { photos.forEach(p => URL.revokeObjectURL(p.url)); setPhotos([]); setStage('idle'); };
  const inputs = h(R.Fragment, null,
    h('input', {ref: camera, type: 'file', accept: 'image/*', capture: 'environment', hidden: true, 'aria-label': t('拍藥袋'), onChange: e => { add(e.target.files); e.target.value = ''; }}),
    h('input', {ref: gallery, type: 'file', accept: 'image/*', multiple: true, hidden: true, 'aria-label': t('從相簿選藥袋照片'), onChange: e => { add(e.target.files); e.target.value = ''; }}));
  if (stage === 'idle') return h('div', {className: 'vv-bag'}, inputs,
    h('button', {type: 'button', className: 'vv-bag-card', disabled, onClick: () => camera.current?.click()},
      h('strong', null, cameraIcon(h), t('拍藥袋，幫你填藥名和吃法')),
      h('span', null, t('線上解讀・用 1 次額度・最多 3 包'))),
    h('button', {type: 'button', className: 'text-btn vv-bag-gallery', disabled, onClick: () => gallery.current?.click()}, t('從相簿選照片')));
  if (stage === 'pick') return h('div', {className: 'vv-bag vv-bag-panel'}, inputs,
    h('p', {className: 'vv-note'}, t('已選 {count} 張（最多 {MED_BAG_MAX_PHOTOS} 張，一包藥一張）。把藥名和用法那面拍清楚；姓名、電話可以先遮住。', {count: photos.length, MED_BAG_MAX_PHOTOS})),
    h('ul', {className: 'vv-bag-photos'}, photos.map((p, i) => h('li', {key: p.url},
      h('img', {src: p.url, alt: t('藥袋照片 {i}', {i: i + 1})}),
      h('button', {type: 'button', className: 'vv-time-remove', 'aria-label': t('刪掉第 {i} 張', {i: i + 1}), onClick: () => remove(i)}, '×')))),
    photos.length < MED_BAG_MAX_PHOTOS && h('div', {className: 'vv-bag-more'},
      h('button', {type: 'button', className: 'secondary-btn', onClick: () => camera.current?.click()}, t('＋ 再拍一包')),
      h('button', {type: 'button', className: 'text-btn', onClick: () => gallery.current?.click()}, t('從相簿選'))),
    h('button', {type: 'button', className: 'primary', onClick: () => setStage('consent')}, t('下一步')),
    h('button', {type: 'button', className: 'text-btn', onClick: reset}, t('不拍了')));
  return h('div', {className: 'vv-bag vv-bag-panel', role: 'group', 'aria-label': t('確認送出藥袋照片')},
    h('ul', {className: 'vv-bag-photos is-small'}, photos.map((p, i) => h('li', {key: p.url}, h('img', {src: p.url, alt: t('藥袋照片 {i}', {i: i + 1})})))),
    h('p', null, t('這 {count} 張照片會拼成一張，送到毛孩小本本線上解讀，{line}照片解讀完就刪掉；讀到的藥名和吃法會帶進下面，要你逐一核對才會存。', {count: photos.length, line: quota.line})),
    h('button', {type: 'button', className: 'primary', disabled: disabled || quota.empty, onClick: () => { const files = photos.map(p => p.file); onSend(files); reset(); }}, t('同意並送出')),
    h('button', {type: 'button', className: 'text-btn', onClick: () => setStage('pick')}, t('不送，自己填')));
}

/**
 * 記下這次看診（獨立一頁：全螢幕對話框，手機返回鍵會關）。
 * 欄位順序照看診當下最需要的：看診日期 → 下次回診 → 用藥（吃幾天、時間快選）→ 補充（原因、獸醫交代，選填）。
 */
export function VetVisitForm({react: R, root, catId, today, name, initial = null, onClose, onSaved, intro = '', visitDate = '', allowEmpty = false}) {
  const h = R.createElement;
  const editing = Boolean(initial);
  const cloud = typeof window !== 'undefined' ? window.V161Cloud : null;
  const [pendingBag] = R.useState(() => !initial && cloud ? (p => p && p.catId === catId ? p : null)(loadMedPending()) : null);
  const [visit, setVisit] = R.useState(() => {
    if (pendingBag?.visit) return pendingBag.visit;
    if (!initial) return {date: visitDate && visitDate <= today ? visitDate : today, reason: '', notes: '', nextVisit: '', meds: []};
    const copy = structuredClone(initial);
    copy.meds = copy.meds.map(m => isLongTerm(m) ? {...m, longTerm: true, days: ''} : ({...m, days: m.start && m.end ? String(medDays(m.start, m.end)) : ''}));
    return copy;
  });
  const [busy, setBusy] = R.useState(false), [error, setError] = R.useState(''), [leaving, setLeaving] = R.useState(false);
  const ref = R.useRef(null), dirty = R.useRef(Boolean(pendingBag));
  const [bagWaiting, setBagWaiting] = R.useState(Boolean(pendingBag)), [bagError, setBagError] = R.useState(''), [bagNotice, setBagNotice] = R.useState('');
  const bagQuota=useCloudQuota(R,false,cloud);
  const [bagThumb, setBagThumb] = R.useState(pendingBag?.thumb || ''), bagTaken = R.useRef(Boolean(pendingBag)), waitCtl = R.useRef(null);
  // 藥袋結果帶進表單：讀到的每種藥變成待核對的藥卡；藥袋印了回診日、而且還沒填，就帶進下次回診。
  const mergeBag = result => {
    dirty.current = true; bagTaken.current = true;
    setVisit(v => ({...v, meds: [...v.meds.filter(m => String(m.name || '').trim()), ...bagToMeds(result)].slice(0, MED_MAX),
      nextVisit: v.nextVisit || (result.nextVisit && result.nextVisit > v.date ? result.nextVisit : '')}));
    setBagNotice(`${t('藥袋讀到 {count} 種藥', {count: result.meds.length})}${result.nextVisit ? t('和回診日') : ''}${t('，請和藥袋逐一核對。看不清楚的欄位是空的，請照藥袋補上。')}`);
  };
  const waitBag = async () => {
    waitCtl.current?.abort(); const ctl = new AbortController(); waitCtl.current = ctl;
    setBagWaiting(true); setBagError('');
    try {
      const got = await waitMedBag(cloud, {signal: ctl.signal});
      if (got && !ctl.signal.aborted) { mergeBag(got.result); void bagQuota.settle({outcome:'success',billing:got.billing}); }
    }
    catch (e) { if(!ctl.signal.aborted){setBagError(tn(e.message) || t('線上暫時無法解讀，請手動加藥。'));void bagQuota.settle({outcome:'failure',billing:e.billing});} }
    finally { if (waitCtl.current === ctl) { setBagWaiting(false); waitCtl.current = null; } }
  };
  R.useEffect(() => { if (pendingBag) waitBag(); return () => waitCtl.current?.abort(); }, []);
  const sendBag = async files => {
    setBagError(''); setBagNotice(''); setBagWaiting(true);bagQuota.clearResult();
    let attempted=false;
    try {
      const photo = await composeBagPhotos(files);
      setBagThumb(photo.thumb);
      attempted=true;
      await submitMedBag(cloud, photo.base64, {catId, visit, thumb: photo.thumb});
      dirty.current = true; bagTaken.current = true;
      await waitBag();
    } catch (e) { setBagError(tn(e.message) || t('送出未完成，請再試一次。')); setBagWaiting(false);void bagQuota.settle({outcome:attempted?'failure':'not-sent',billing:e.billing}); }
  };
  const stopWaiting = () => { waitCtl.current?.abort(); setBagWaiting(false); setBagNotice(t('已停止等待，可以先手動填；進階模式可能仍在處理。'));void bagQuota.settle({outcome:'pending'}); };
  usePhoneDialog(R, ref, true);
  R.useEffect(() => { ref.current?.showModal?.(); return () => ref.current?.close?.(); }, []);
  // 藥袋解讀中先離開：連同送出後才填的內容一起存進等待紀錄，回來時照樣帶出。
  const keepDraft = () => { const p = loadMedPending(); if (p && p.catId === catId) saveMedPending({...p, visit}); };
  const close = () => { if (busy) return; if (bagWaiting) { keepDraft(); onClose?.(); return; } if (dirty.current && !leaving) { setLeaving(true); return; } onClose?.(); };
  const discard = () => { if (bagTaken.current) releaseMedBag(cloud); onClose?.(); };
  const set = (key, value) => { dirty.current = true; setVisit(v => ({...v, [key]: value})); setError(''); };
  const setMed = (i, patch) => { dirty.current = true; setVisit(v => ({...v, meds: v.meds.map((m, j) => j === i ? {...m, ...patch} : m)})); setError(''); };
  // 「吃幾天」是飼主照獸醫說的填；這裡只把天數換成結束日期（開始那天算第 1 天），不推算療程。
  // 勾「長期吃」：不填天數，直到飼主按「停藥」為止都提醒。
  const withEnd = (med, start) => ({...med, end: med.longTerm ? LONG_TERM_END : med.days && Number(med.days) >= 1 ? medEnd(start || visit.date, Number(med.days)) : ''});
  const save = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (bagWaiting) throw Error(t('藥袋還在解讀，等它帶進來再存；或按「停止等待」先手動填。'));
      if (unreviewedBagMeds(visit.meds).length) throw Error(t('藥袋帶進來的藥還沒核對完：請和藥袋比對，每一種按「核對過了」。'));
      const meds = visit.meds.map(m => {
        if (m.name.trim() && !(m.times || []).length) throw Error(noTimesText(m.name.trim()));
        if (m.name.trim() && !m.longTerm && daysProblem(m.days)) throw Error(`「${m.name.trim()}」${daysProblem(m.days)}`);
        if (m.name.trim() && !m.longTerm && !(Number(m.days) >= 1)) throw Error(t('「{name}」請填吃幾天（照獸醫交代的天數），長期吃的藥請勾「長期吃」。', {name: m.name.trim()}));
        return withEnd(m, m.start);
      });
      const saved = buildVisit({...visit, meds}, {catId, today, allowEmpty});
      await root.atomic(data => editing ? updateVisit(data, {...saved, id: initial.id})
        : saveVisit(data, saved, {scope: (d, fn) => applyScopedSoundTransform(d, catId, fn)}));
      dirty.current = false;
      if (bagTaken.current) releaseMedBag(cloud);
      onSaved?.(saved);
    } catch (e) { setError(tn(e.message) || t('沒有存到，請再試一次。')); }
    finally { setBusy(false); }
  };
  const input = (value, onChange, props = {}) => h('input', {value, disabled: busy, onChange: e => onChange(e.target.value), ...props});
  const title = editing ? t('修改 {date} 的看診', {date: ymd(initial.date)}) : t('記下{name}這次看診', {name: name || ''});
  const hasExtra = Boolean(visit.reason || visit.notes);
  return h('dialog', {ref, className: 'vv-page', 'aria-label': title, onCancel: e => { e.preventDefault(); close(); }},
    h('header', {className: 'vv-page-head'},
      h('button', {type: 'button', className: 'h-back', disabled: busy, onClick: close}, t('‹ 返回')),
      h('h2', null, title)),
    h('section', {className: 'vv-form'},
      intro && h('p', {className: 'vv-intro', role: 'status'}, intro),
      h('p', {className: 'vv-note'}, t('照獸醫交代的填；App 只幫你提醒和勾選，不會建議用藥。')),
      field(h, t('看診日期'), input(visit.date, v => set('date', v), {type: 'date', max: today})),
      editing ? h('p', {className: 'vv-note'}, initial.nextVisit ? t('下次回診 {nextVisit} 已在照顧時間表，要改日期請到那裡改。', {nextVisit: ymd(initial.nextVisit)}) : t('要排回診，請用照顧時間表的「＋ 排回診日」。'))
        : field(h, t('下次回診（選填，會加進照顧時間表並提醒）'), input(visit.nextVisit, v => set('nextVisit', v), {type: 'date', min: today})),
      h('div', {className: 'vv-meds'},
        h('h3', null, t('用藥（選填）')),
        !editing && cloud && !bagWaiting && h(MedBagCapture, {react: R, cloud, disabled: busy, onSend: sendBag}),
        bagWaiting && h('div', {className: 'vv-bag-wait', role: 'status'},
          bagThumb && h('img', {src: bagThumb, alt: t('送出的藥袋照片')}),
          h('p', null, h('strong', null, t('藥袋解讀中…')), t('通常幾十秒。可以先離開，填的內容會留著，好了會通知你。')),
          h('button', {type: 'button', className: 'text-btn', onClick: stopWaiting}, t('停止等待，先手動填'))),
        bagError && h('p', {className: 'error', role: 'alert'}, bagError),
        bagNotice && h('p', {className: 'vv-intro', role: 'status'}, bagNotice),
        bagQuota.resultLine && h('p', {className:'vv-note',role:'status','data-quota-result':true},bagQuota.resultLine),
        bagThumb && visit.meds.some(m => m.fromBag) && h('details', {className: 'vv-bag-compare', open: true}, h('summary', null, t('對照藥袋照片')), h('img', {src: bagThumb, alt: t('藥袋照片（核對用）')})),
        visit.meds.map((med, i) => {
          const start = med.start || visit.date, badDays = med.longTerm ? '' : daysProblem(med.days), end = badDays ? '' : withEnd(med, start).end;
          const savedMed=editing?initial.meds.find(m=>m.id===med.id):null,hasDoseHistory=Boolean(savedMed&&((savedMed.taken||[]).length||Object.keys(savedMed.doseOutcomes||{}).length));
          return h('fieldset', {key: i, className: 'vv-med' + (med.fromBag ? (med.reviewed ? ' is-bag is-reviewed' : ' is-bag') : '')},
            h('legend', null, t('第 {i} 種藥', {i: i + 1}), med.fromBag && h('span', {className: 'vv-bag-badge'}, med.reviewed ? t('已核對') : t('藥袋帶入・待核對'))),
            field(h, t('藥名'), input(med.name, v => setMed(i, {name: v}), {maxLength: 60, placeholder: t('照藥袋上寫的')})),
            field(h, t('一次的量（選填）'), input(med.dose, v => setMed(i, {dose: v}), {maxLength: 60, placeholder: t('例如：半顆、0.5 ml')})),
            med.fromBag && med.fromBagScheduleText && h('p', {className: 'vv-note'}, t('藥袋時間／頻率原文：') + med.fromBagScheduleText),
            med.fromBag && !med.times.length && med.fromBagTimeCandidates?.length > 0 && h('p', {className: 'vv-note', role: 'status', 'data-med-time-candidates': true}, t('AI 候選時間：') + med.fromBagTimeCandidates.join(t('、')) + t('。僅供核對，未帶入固定提醒；請對照照片並依獸醫指示填寫。')),
            h('div', {className: 'vv-times', role: 'group', 'aria-label': t('每天什麼時候吃')},
              h('span', null, t('每天什麼時候吃')),
              h('div', {className: 'vv-presets'}, TIME_PRESETS.map(p => h('button', {key: p.label, type: 'button', disabled: busy,
                'aria-pressed': sameTimes(med.times, p.times), onClick: () => setMed(i, {times: [...p.times]})}, p.label))),
              !med.times.length && h('p', {className: 'vv-note vv-times-empty', 'data-med-times-empty': true}, t('還沒選時間：照獸醫交代，按上面一個，或「＋ 自己加時間」。')),
              h('ul', {className: 'vv-time-list'},
                med.times.map((time, k) => h('li', {key: k, className: 'vv-time'},
                  h('span', {className: 'vv-time-label'}, slotLabel(time)),
                  input(time, v => setMed(i, {times: med.times.map((x, j) => j === k ? v : x)}), {type: 'time', 'aria-label': t('第 {k} 次時間', {k: k + 1})}),
                  med.times.length > 1 ? h('button', {type: 'button', className: 'vv-time-remove', disabled: busy, 'aria-label': t('刪掉 {time}', {time}), onClick: () => setMed(i, {times: med.times.filter((_, j) => j !== k)})}, '×') : h('span', {className: 'vv-time-remove', 'aria-hidden': true}))),
              med.times.length < MED_TIMES_MAX && h('button', {type: 'button', className: 'vv-time-add', disabled: busy, onClick: () => setMed(i, {times: [...med.times, '12:00']})}, med.times.length ? t('＋ 其他時間') : t('＋ 自己加時間')))),
            h('div', {className: 'vv-range'},
              field(h, t('從哪天開始'), input(start, v => setMed(i, {start: v}), {type: 'date'})),
              field(h, t('吃幾天'), input(med.longTerm ? '' : med.days || '', v => setMed(i, {days: String(v).slice(0, 4)}), {type: 'number', inputMode: 'numeric', min: 1, max: 365, step: 1, placeholder: med.longTerm ? t('長期吃') : t('例如：7'), disabled: busy || !!med.longTerm, 'aria-invalid': badDays ? true : undefined}))),
            badDays && h('p', {className: 'error', role: 'alert', 'data-med-days-error': true}, badDays),
            h('label', {className: 'vv-bag-check vv-long-term'}, h('input', {type: 'checkbox', checked: !!med.longTerm, disabled: busy, onChange: e => setMed(i, {longTerm: e.target.checked})}), h('span', null, t('長期吃（慢性病用藥，直到獸醫說停）'))),
            med.longTerm ? h('p', {className: 'vv-end'}, t('每天照時間提醒；獸醫說停藥時，到看診紀錄按「停藥」。'))
              : end && h('p', {className: 'vv-end'}, t('吃到 {end}（{end2}），請和藥袋核對。', {end: md(end), end2: ymd(end)})),
            med.fromBag && bagThumb && i > 0 && h('details', {className: 'vv-bag-compare is-inline'}, h('summary', null, t('對照藥袋照片')), h('img', {src: bagThumb, alt: t('藥袋照片（核對用）')})),
            med.fromBag && h('label', {className: 'vv-bag-check'}, h('input', {type: 'checkbox', checked: !!med.reviewed, disabled: busy, onChange: e => setMed(i, {reviewed: e.target.checked})}), h('span', null, t('核對過了（藥名、量、時間、天數和藥袋一樣）'))),
            hasDoseHistory&&h('p',{className:'vv-note'},t('這份藥已有用藥紀錄，請保留並使用停藥，避免刪除歷史。')),
            h('button', {type: 'button', className: 'text-btn', disabled: busy||hasDoseHistory, onClick: () => set('meds', visit.meds.filter((_, j) => j !== i))}, t('刪掉這種藥')));
        }),
        visit.meds.length < MED_MAX && h('button', {type: 'button', className: cloud && !editing ? 'text-btn vv-add-manual' : 'secondary-btn', disabled: busy, onClick: () => set('meds', [...visit.meds, {...blankMed(), times: [], days: ''}])}, cloud && !editing ? t('或 ＋ 手動加一種藥') : t('＋ 加一種藥'))),
      h('details', {className: 'vv-extra', open: hasExtra || editing},
        h('summary', null, t('補充（選填）：看診原因、獸醫交代')),
        field(h, t('看診原因（例如：嘔吐、例行健檢）'), input(visit.reason, v => set('reason', v), {maxLength: 200})),
        field(h, t('獸醫交代的事'), h('textarea', {value: visit.notes, rows: 3, maxLength: 1000, disabled: busy, onChange: e => set('notes', e.target.value)}))),
      error && h('p', {className: 'error', role: 'alert'}, error),
      leaving && h('div', {className: 'vv-leave', role: 'alert'},
        h('p', null, t('還沒存，要離開嗎？填的內容不會保留。')),
        h('button', {type: 'button', className: 'secondary-btn', onClick: () => setLeaving(false)}, t('繼續填')),
        h('button', {type: 'button', className: 'text-btn', onClick: discard}, t('不存，離開'))),
      h('div', {className: 'vv-actions'},
        h('button', {type: 'button', className: 'primary', disabled: busy, onClick: save}, busy ? t('儲存中…') : editing ? t('儲存修改') : t('存下這次看診')),
        h('button', {type: 'button', className: 'text-btn', disabled: busy, onClick: close}, t('取消')))));
}

/** 只排下次回診日（醫院打電話約好、或看診當下只想先記日期）：加一筆「回診」到照顧時間表。 */
export function FollowUpQuick({react: R, store, today, onDone, onCancel, autoFocus = false}) {
  const h = R.createElement;
  const box = R.useRef(null);
  // 展開後捲到看得到的位置（不要被底部導覽列蓋住）。
  R.useEffect(() => { if (autoFocus) box.current?.scrollIntoView?.({block: 'center', behavior: 'smooth'}); }, []);
  const [date, setDate] = R.useState(''), [busy, setBusy] = R.useState(false), [error, setError] = R.useState('');
  const save = async () => {
    if (busy || !date) return;
    setBusy(true); setError('');
    try { await store.atomic(data => addFollowUp(data, date, {today})); onDone?.(date); }
    catch (e) { setError(tn(e.message) || t('沒有存到，請再試一次。')); }
    finally { setBusy(false); }
  };
  return h('div', {ref: box, className: 'care-next-date vv-follow-quick', role: 'group', 'aria-label': t('排回診日')},
    h('label', null, h('span', null, t('回診日期（醫院約的）')),
      h('input', {type: 'date', min: today, value: date, disabled: busy, onChange: e => { setDate(e.target.value); setError(''); }})),
    h('button', {type: 'button', className: 'primary', disabled: busy || !date, onClick: save}, busy ? t('儲存中…') : t('加進時間表')),
    h('button', {type: 'button', className: 'text-btn', disabled: busy, onClick: onCancel}, t('取消')),
    error && h('p', {className: 'error', role: 'alert'}, error));
}

/** 今天要吃的藥：每個時間點一顆按鈕，按了就是吃了（再按一次取消）。 */
// 2026-11-17（Ian 批准第三批 A）：首頁用藥只顯示下一次要記的時段，其他時段收進「今天全部時段」。
function CompactMedSlots({react: R, root, catId, row, today}) {
  const h = R.createElement;
  const open = slot => !slot.taken && !['unsuccessful', 'uncertain'].includes(slot.status);
  // 顯示剛記完的上一格＋下一格（最多兩格），剛按完的「已記下」提示才看得到。
  const idx = row.slots.findIndex(open), done = row.slots.length - row.slots.filter(open).length;
  const shown = idx < 0 ? row.slots.slice(-1) : row.slots.slice(Math.max(0, idx - 1), idx + 1);
  const slot = s => h(DoseSlotActions, {key: s.key, react: R, root, catId, visitId: row.visitId, med: row.med, slot: s, today, includeStyles: false});
  return h('div', {className: 'vv-slots vv-slots-compact'},
    shown.map(slot), idx < 0 && h('p', {className: 'vv-note'}, t('今天的時段都記好了 ✓')),
    row.slots.length > shown.length && h('details', {className: 'vv-more-slots'}, h('summary', null, t('今天全部時段（已記 {done}/{total}）', {done, total: row.slots.length})),
      h('div', {className: 'vv-slots'}, row.slots.filter(s => !shown.includes(s)).map(slot))));
}
export function MedToday({react: R, root, catId, today, compact = false}) {
  const h = R.createElement;
  const data = root?.get?.().data;
  const rows = data ? activeMeds(data, catId, today) : [];
  const missed = data ? yesterdayMeds(data, catId, today) : [], finished = data ? finishedMeds(data, catId, today) : [];
  if (!rows.length && !missed.length && !finished.length) return null;
  return h(R.Fragment, null,h('style',null,DOSE_UI_STYLE+DOSE_STATE_STYLE), rows.map(row => h('li', {key: row.visitId + row.med.id, className: 'care-timeline-row is-med'},
      h('div', {className: 'care-timeline-text'}, h('strong', null, t('吃藥：{name}', {name: row.med.name})),
        h('span', null, `${row.med.dose ? row.med.dose + '・' : ''}${isLongTerm(row.med) ? t('長期吃') : row.left > 0 ? medUntilText(row.med) : t('今天是最後一天')}`)),
      compact ? h(CompactMedSlots, {react: R, root, catId, row, today}) : h('div', {className: 'vv-slots'}, row.slots.map(slot => h(DoseSlotActions,{key:slot.key,react:R,root,catId,visitId:row.visitId,med:row.med,slot,today,includeStyles:false}))))),
    // 昨天漏勾的可以補（只補昨天；更早的請到看診紀錄看）。
    missed.map(row => h('li', {key: 'y' + row.visitId + row.med.id, className: 'care-timeline-row is-med is-missed'},
      h('div', {className: 'care-timeline-text'}, h('strong', null, t('昨天的藥：{name}', {name: row.med.name})), h('span', null, t('昨天還有未記錄的時段，可依實際情況補記。'))),
      h('div', {className: 'vv-slots'}, row.slots.map(slot => h(DoseSlotActions,{key:slot.key,react:R,root,catId,visitId:row.visitId,med:row.med,slot,today,showDate:true,includeStyles:false}))))),
    finished.map(row => h('li', {key: 'f' + row.visitId + row.med.id, className: 'care-timeline-row is-med is-done'},
      h('div', {className: 'care-timeline-text'}, h('strong', null, t('{name} 療程已結束', {name: row.med.name})),
        h('span', null, t('吃到 {end}/{end2}，勾了 {taken}/{total} 次。之後要不要再吃，照獸醫說的。', {end: Number(row.med.end.slice(5, 7)), end2: Number(row.med.end.slice(8, 10)), taken: row.taken, total: row.total}))))));
}

/** 看診紀錄：每次看診可以打開看原因、獸醫交代、用藥、回診日；可以修改、刪除（可復原）、停藥。 */
export function VisitHistory({react: R, root, catId, today, name}) {
  const h = R.createElement;
  const data = root?.get?.().data;
  const visits = data ? visitHistory(data, catId) : [];
  const [open, setOpen] = R.useState(null), [editing, setEditing] = R.useState(null), [confirm, setConfirm] = R.useState(null);
  const [creating,setCreating]=R.useState(false);
  const [busy, setBusy] = R.useState(false), [error, setError] = R.useState(''), [undo, setUndo] = R.useState(null), [notice, setNotice] = R.useState(''), [stopped, setStopped] = R.useState(null);
  const run = async (transform, done) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await root.atomic(transform); done?.(); }
    catch (e) { setError(tn(e.message) || t('沒有存到，請再試一次。')); }
    finally { setBusy(false); }
  };
  const btn = (text, onClick, className = 'secondary-btn', extra = {}) => h('button', {type: 'button', className, disabled: busy, onClick, ...extra}, text);
  return h('section', {className: 'vv-history', 'aria-label': t('看診紀錄')},
    h('h2', null, t('看診紀錄')),
    !visits.length && h('div',{className:'vv-empty'},h('p', {className: 'vv-note'}, name ? t('還沒有{name}的看診紀錄。看完醫生後，可以直接記在這裡。', {name}) : t('還沒有看診紀錄。看完醫生後，可以直接記在這裡。')),btn(cuteActionLabel(R,'vet-visit',t('記看診')),()=>{setCreating(true);setNotice('');},'secondary-btn')),
    creating&&h(VetVisitForm,{key:catId,react:R,root,catId,today,name,onClose:()=>setCreating(false),onSaved:()=>{setCreating(false);setNotice(t('看診紀錄已儲存。'));}}),
    undo && h('p', {className: 'care-timeline-notice', role: 'status'}, t('已刪除這筆看診。'),
      btn(t('復原'), () => run(d => restoreVisit(d, undo, {scope: (r, fn) => applyScopedSoundTransform(r, catId, fn)}), () => { setUndo(null); setNotice(t('已復原。')); }), 'text-btn')),
    stopped && h('p', {className: 'care-timeline-notice', role: 'status'}, t('已停 {name}，今天起不再提醒。', {name: stopped.name}),
      btn(t('復原'), () => run(d => resumeMed(d, stopped.visitId, stopped.medId), () => { setStopped(null); setNotice(t('已復原，會照原本的時間提醒。')); }), 'text-btn')),
    notice && !undo && !stopped && h('p', {className: 'care-timeline-notice', role: 'status'}, notice),
    error && h('p', {className: 'error', role: 'alert'}, error),
    h('ul', {className: 'vv-history-list'}, visits.map(visit => {
      const expanded = open === visit.id;
      if (editing === visit.id) return h('li', {key: visit.id}, h(VetVisitForm, {react: R, root, catId, today, name, initial: visit,
        onClose: () => setEditing(null), onSaved: () => { setEditing(null); setNotice(t('已儲存修改，提醒也跟著更新。')); }}));
      return h('li', {key: visit.id, className: 'vv-visit'},
        h('button', {type: 'button', className: 'vv-visit-head', 'aria-expanded': expanded, onClick: () => setOpen(expanded ? null : visit.id)},
          h('strong', null, `${ymd(visit.date)}　${visit.reason || t('看診')}`),
          h('span', null, [visit.meds.length ? t('用藥 {count} 種', {count: visit.meds.length}) : '', visit.nextVisit ? t('回診 {nextVisit}', {nextVisit: md(visit.nextVisit)}) : ''].filter(Boolean).join('・') || t('點開查看'))),
        expanded && h('div', {className: 'vv-visit-body'},
          visit.notes && h('p', null, h('strong', null, t('獸醫交代：')), visit.notes),
          visit.nextVisit && h('p', null, h('strong', null, t('下次回診：')), ymd(visit.nextVisit)),
          visit.meds.map(med => {
            const status = medStatus(med, today);
            return h('div', {key: med.id, className: 'vv-med-line'},
              h('p', null, h('strong', null, med.name), `${t('{dose}・每天 {times}・{start}～', {dose: med.dose ? '・' + med.dose : '', times: med.times.join(t('、')), start: md(med.start)})}${isLongTerm(med) ? t('長期') : md(med.end)}${t('・')}${t(status)}`),
              h(DoseHistory,{react:R,root,catId,visitId:visit.id,med,today}),
              status === K('吃藥中') && btn(t('停藥（今天起不提醒）'), () => run(d => stopMed(d, visit.id, med.id, today), () => { setNotice(''); setStopped({visitId: visit.id, medId: med.id, name: med.name}); }), 'text-btn'));
          }),
          confirm === visit.id
            ? h('div', {className: 'vv-actions'}, h('p', null, visit.nextVisit ? t('刪除這筆看診？用藥提醒會停，它排的回診也會拿掉（可以復原）。') : t('刪除這筆看診？用藥提醒也會停（可以復原）。')),
                btn(t('確定刪除'), () => run(d => deleteVisit(d, visit.id, undefined, {scope: (r, fn) => applyScopedSoundTransform(r, catId, fn)}), () => { setConfirm(null); setOpen(null); setUndo(visit.id); setNotice(''); }), 'secondary-btn'),
                btn(t('先不要'), () => setConfirm(null), 'text-btn'))
            : h('div', {className: 'vv-actions'}, btn(t('修改'), () => { setEditing(visit.id); setNotice(''); }), btn(t('刪除'), () => setConfirm(visit.id), 'text-btn'))));
    })));
}
