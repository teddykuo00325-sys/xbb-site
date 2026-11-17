import {t, tn, K, isEnglish} from './i18n.js?v=audit1117b';
import {validateDiaryCollection} from './life-diary-model.js?v=1';
import {displayStoredText,displayUserText,withStoredTexts} from './stored-text.js?v=i18n1';
import {CareWorkspace} from "./care-journey-ui.js?v=photo-simplify1";
import {RecordAttribution} from "./o-records-v59.js?v=photo-simplify1";
import {catPhoto} from '/xbb-site/app/cat-photo.js?v=8f5745b7843b';
import {activePetEntries,archivedPetEntries,validPetArchive,petArchiveGeneration,requireActivePet,archivePet,restorePet,samePetName,setPetDirectory} from './pet-archive.js?v=8f5745b7843b';
import {initialFamilyView,readStartView,validActiveCatId} from './family-navigation.js?v=r4';
import {recordCountLabel} from './record-counts.js?v=photo-simplify1';
import {FAMILY_SHARING_ENABLED} from './family-feature.js?v=8f5745b7843b';
import {countCareDrafts} from './usability-v49.js?v=8f5745b7843b';
import {usePhoneDialog} from './audit-followup-v45.js?v=8f5745b7843b';
import {repairLegacyMealDrafts} from './meal-draft-references.js?v=8f5745b7843b';
import {eligibleRecords} from './health-summary-v31.js?v=photo-simplify1';
import {firstCareFields,buildFirstCareItems,CareDateFields,firstCareDateError,FIRST_CARE_DATE_SUMMARY} from './first-use157.js?v=p1';
import {localCalendarDate,useLocalDay} from './today-overview-v29.js?v=8f5745b7843b';
import {familyOverviewModel} from '/xbb-site/app/family-model.js?v=photo-simplify1';
import {familyCatLabels} from '/xbb-site/app/family-overview.js?v=photo-simplify1';
import { catColor, withCatColor, validCatColor, CatColorPicker } from "./cat-colors.js?v=8f5745b7843b";
import { ProfileExtras, validProfileExtras, profileSex, profileSpecies, profileNeutered, PROFILE_NOTE_MAX } from "./experience-v26.js?v=photo-simplify1";
import {ensureFamilyData,currentMember} from './family-sharing-model.js?v=8f5745b7843b';
import {FamilyMembers,FamilyCare} from './family-sharing-ui.js?v=8f5745b7843b';
import {FamilyViewerApp,FamilyAccessBoundary} from './family-access-ui.js?v=photo-simplify1';
import {PetSetupSound} from './pet-setup-sound.js?v=r4';
import {CatAgeFields,validCatAge,catAgeLabel,CAT_AGE_ERROR,petAvatarSrc,localToday} from './cat-age.js';
// Multi-cat source. Legacy root fields remain the original cat: no copying or destructive migration.
export const ROOT_CAT_ID = 'cat-original';
export const CAT_FIELDS = ['foodCards', 'entries', 'cat', 'changes', 'careItems', 'foodSession'];
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const object = o => !!o && typeof o === 'object' && !Array.isArray(o);
const dateValid = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s + 'T12:00:00Z').toISOString().slice(0,10) === s;
const timeValid = s => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
// 同一錯誤已在欄位旁顯示時，不在對話框底部再重複；無法定位的保存錯誤仍要保留。
export function multiCatBottomError(error, inlineMessages = []) {
  const message = String(error || '').trim();
  return message && !inlineMessages.some(text => String(text || '').trim() === message) ? message : '';
}
export function MultiCatError({react:R,error,scope}) {
  const [duplicate,setDuplicate] = R.useState(false);
  (R.useLayoutEffect || R.useEffect)(() => {
    const inlineMessages = [...(scope?.current?.querySelectorAll('.field-error,[data-inline-error]') || [])].map(node => node.textContent);
    setDuplicate(Boolean(error) && !multiCatBottomError(error, inlineMessages));
  }, [error]);
  return !error || duplicate ? null : R.createElement('p',{role:'alert',className:'mc-error'},error);
}
export function migrateData(data) {
  if (!object(data)) throw Error(t('這台裝置的資料格式無法讀取，原資料未被覆蓋。'));
  data=repairLegacyMealDrafts(ensureFamilyData(data));
  const base=own(data,'multiCat')?data:{...data,multiCat:{version:1,activeId:ROOT_CAT_ID,cats:[{id:ROOT_CAT_ID}],householdEntries:[]}};
  let changed=base!==data;
  const cats=base.multiCat.cats.map((c,index)=>{if(c.id===ROOT_CAT_ID)return c;const profile=withCatColor(c.data.cat,index);if(profile===c.data.cat)return c;changed=true;return {...c,data:{...c.data,cat:profile}};});
  const profile=withCatColor(base.cat,base.multiCat.cats.findIndex(c=>c.id===ROOT_CAT_ID));
  if(profile!==base.cat)changed=true;
  // Care-flower anchors are no longer written (flower retired 2026-11-14); existing careFlower* fields pass through untouched.
  return changed?{...base,cat:profile,multiCat:{...base.multiCat,cats}}:base;
}
export function validateMultiData(data, validateLegacy) {
  if(!validateDiaryCollection(data))return false;
  if (!validateLegacy(data) || !validCatAge(data.cat) || !validCatColor(data.cat)) return false;
  if (!own(data, 'multiCat')) return true;
  const m = data.multiCat;
  if (!object(m) || m.version !== 1 || !Array.isArray(m.cats) || !m.cats.length || !Array.isArray(m.householdEntries)) return false;
  const ids = new Set(); let roots = 0;
  for (const c of m.cats) {
    if (!object(c) || !validPetArchive(c) || typeof c.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(c.id) || ids.has(c.id)) return false;
    ids.add(c.id);
    if (c.id === ROOT_CAT_ID) { roots++; if (own(c,'data')) return false; }
    else if (!object(c.data) || own(c.data,'multiCat') || !validateLegacy(c.data) || !validCatAge(c.data.cat) || !validCatColor(c.data.cat)) return false;
  }
  if (roots !== 1 || !ids.has(m.activeId) || !activePetEntries(m).some(c=>c.id===m.activeId)) return false;
  const entryIds = new Set();
  return m.householdEntries.every(e => {
    if (!object(e) || typeof e.id !== 'string' || !e.id || entryIds.has(e.id) || e.catId !== null || e.ownership !== 'unconfirmed' || !dateValid(e.date) || !timeValid(e.time) || ![K('嘔吐'),K('排泄'),K('其他')].includes(e.category) || typeof e.text !== 'string' || !e.text.trim()) return false;
    entryIds.add(e.id); return true;
  });
}
export function catData(data, id) {
  if (id === ROOT_CAT_ID) return data;
  const item = data.multiCat.cats.find(c => c.id === id);
  if (!item?.data) throw Error(t('找不到這隻毛孩，未更動資料。'));
  return item.data;
}
// Only new defaults carry a negative marker. Older named profiles remain valid,
// including pets actually named 毛孩; never infer identity from a display name.
export function hasEstablishedPet(data) {
  return data?.cat?.profileEstablished !== false && typeof data?.cat?.name === 'string' && !!data.cat.name.trim();
}
export function establishPet(data, name) {
  const clean = typeof name === 'string' ? name.trim() : '';
  if (!clean || clean.length > 40) throw Error(t('請填寫 40 字以內的毛孩名字。'));
  return {...data,cat:{...data.cat,name:clean,profileEstablished:true}};
}
export function SummaryExample({react:R}) {
  const h=R.createElement;
  return h('section',{className:'vet-example','aria-label':t('看診摘要範例')},
    h('p',{className:'vet-example-label'},t('示範資料 · 不會儲存')),
    h('h2',null,t('小花的看診摘要')),
    h('p',null,t('5/1 至 5/7 · 共 3 筆日常紀錄')),
    h('dl',null,
      h('dt',null,t('餵食 · 2 餐')),h('dd',null,t('5/6 吃下 25 公克，5/7 餵食 30 公克、吃下量未記錄。')),
      h('dt',null,t('清砂 · 1 筆')),h('dd',null,t('5/7 清砂發現 2 團，大小未比較。'))),
    h('p',{className:'vet-example-note'},t('喝水、便便等項目未記錄，摘要會標明缺漏。')));
}
export function FirstPetSetup({react:R,root,id,onCreated}) {
  const h=R.createElement,[name,setName]=R.useState(''),[error,setError]=R.useState(''),[busy,setBusy]=R.useState(false),[preview,setPreview]=R.useState(false),saving=R.useRef(false);
  const [dates,setDates]=R.useState({}),[split,setSplit]=R.useState(false);
  const save=async event=>{
    event.preventDefault();if(saving.current)return;
    // 2026-11-14：下次日期填到今天以前（例如多年前）要擋，避免一建好就是過期提醒。
    if(firstCareDateError(dates,split,localToday())){setError(FIRST_CARE_DATE_SUMMARY);return;}
    saving.current=true;setBusy(true);setError('');
    // 2026-11-13：有填疫苗／驅蟲下次日期的，和建立毛孩在同一次寫入（不會只存一半）。驅蟲預設體內外合一。
    const care=buildFirstCareItems(dates,undefined,split);
    try{await root.atomic(data=>applyScopedSoundTransform(data,id,current=>{const pet=establishPet(current,name);return care.length?{...pet,careItems:[...(pet.careItems||[]),...care]}:pet;}));onCreated?.(id);}
    catch(e){setError((tn(e.message)||t('尚未儲存，請重試。')).replace(t('再變更食品資料'),t('再建立毛孩')));}
    finally{saving.current=false;setBusy(false);}
  };
  return h('div',{className:'inpaw-app'},h('div',{className:'app-scroll mobile-scroll'},h('main',{className:'app-content si-screen first-pet-start'},
    h('img',{className:'ob-logo',src:'/xbb-site/app/assets/brand/logo.svg',alt:t('毛孩小本本 In Paw AI')}),
    isEnglish()?h('h1',null,t('先認識你的毛孩')):h('h1',null,t('疫苗、驅蟲、回診，到期前提醒你。')),
    h('p',{className:'si-note'},isEnglish()?t('先填名字，就能開始記錄日常。'):t('填上獸醫說的下次日期，會列進照顧時間表；手機通知需開啟並確認排程。看診和吃藥也能記在這裡。')),
    h('button',{type:'button',className:'secondary-btn vet-example-toggle',disabled:busy,onClick:()=>setPreview(value=>!value),'aria-expanded':preview,'aria-controls':'first-pet-example'},preview?t('收起摘要範例'):t('先看摘要範例')),
    h('div',{id:'first-pet-example',hidden:!preview},preview&&h(SummaryExample,{react:R})),
    h('form',{onSubmit:save},h('label',{className:'field'},t('毛孩名字 ＊必填'),h('input',{className:'ob-input','aria-label':t('毛孩名字'),required:true,maxLength:40,value:name,placeholder:t('例如：小花'),disabled:busy,onChange:e=>setName(e.target.value)})),
      h('details',{className:'first-pet-optional-care',open:error?true:undefined},h('summary',null,t('照護日期（選填，之後可補）')),h(CareDateFields,{react:R,dates,setDates,split,setSplit,disabled:busy,inputClass:'ob-input',onEdit:()=>setError('')})),
      h(PetSetupSound,{react:R,disabled:busy}),
      h('button',{type:'submit',className:'primary',disabled:busy||!name.trim()},busy?t('正在儲存…'):t('建立毛孩')),
      h('p',{className:'si-note first-pet-no-account'},t('免註冊，不必下載任何東西。資料只存在這台裝置。')),h('p',{className:'si-note'},t('看診前可以一鍵整理摘要。到設定可以備份與還原全部資料。'))),
    error&&h('p',{role:'alert',className:'mc-error'},error),
    root.get?.().status==='error'&&h('button',{type:'button',className:'secondary-btn',disabled:busy,onClick:()=>root.retry()},t('重試儲存')))));
}
export function emptyCat(profile,index=0) {
  // 2026-11-14：生日（可估）、物種、結紮一起帶進新毛孩；沒填的不寫，舊資料格式不變。
  const birth=profile.birthDate?{birthDate:profile.birthDate,birthEstimated:!!profile.birthEstimated}:{};
  const species=profileSpecies(profile.species),neutered=profileNeutered(profile.neutered);
  return {cat:{...withCatColor(profile,index),name:profile.name.trim(),age:profile.age,note:profile.note.trim(),breed:(profile.breed??'').trim(),sex:profileSex(profile.sex),...birth,...(species!==K('未填')?{species}:{}),...(neutered!==K('未填')?{neutered}:{})}, foodCards:[],entries:[],changes:[],careItems:[],foodSession:null};
}
/** 切換清單、封存確認框分辨同名毛孩用：代表色、年齡、物種、品種（清單上已顯示年齡時 age:false）。 */
export function petDetail(cat={},index=0,{age=true}={}){
  const species=profileSpecies(cat.species);
  return [t('代表色：{label}',{label:catColor(cat,index).label}),age&&catAgeLabel(cat,''),species!==K('未填')&&t(species),String(cat.breed||'').trim()].filter(Boolean).join(' · ');
}
/** 沒照片時用代表色＋名字首字的插圖頭像（不是照片）。 */
export const petAvatar=(cat={},index=0)=>cat.photo&&catPhoto(cat)===cat.photo?cat.photo:petAvatarSrc(cat,catColor(cat,index).coat);
// The daily sound draw belongs to this browser, while preferences/history belong
// to one cat. Never duplicate shared rights into a secondary cat's saved data.
export function scopedSoundData(data,id) {
  const scoped=catData(data,id);
  return id===ROOT_CAT_ID||!Object.hasOwn(data,'soundDaily')?scoped:{...scoped,soundDaily:data.soundDaily};
}
export function applyScopedSoundTransform(data,id,transform) {
  requireActivePet(data,id);
  if(id===ROOT_CAT_ID)return transform(data);
  const next=transform(scopedSoundData(data,id));
  const {soundDaily,...catNext}=next;
  return {...data,...(Object.hasOwn(next,'soundDaily')?{soundDaily}:{}),multiCat:{...data.multiCat,cats:data.multiCat.cats.map(c=>c.id===id?{...c,data:catNext}:c)}};
}
export function createScopedStore(root, id) {
  // Capture ownership permanently. Async callbacks cannot write into the newly selected cat.
  let prior, cached;
  const restoreGeneration=root.get().restoreGeneration||0,archiveGeneration=petArchiveGeneration(root.get().data.multiCat?.cats.find(pet=>pet.id===id));
  const requirePet=(data=root.get().data)=>{if((root.get().restoreGeneration||0)!==restoreGeneration)throw Error(t('資料已還原，舊畫面無法再儲存。請重新開啟操作。'));requireActivePet(data,id,archiveGeneration);if(!hasEstablishedPet(catData(root.get().data,id)))throw Error(t('請先建立毛孩名字，再儲存正式紀錄。'));};
  const get = () => {
    const view = root.get();
    if (view !== prior) { prior = view; cached = {...view,data:scopedSoundData(view.data,id)}; }
    return cached;
  };
  return {
    get, subscribe:root.subscribe, retry:root.retry, soundScopeId:id,rootStore:root,
    atomic(transform) { requirePet(); return root.atomic(data=>{requirePet(data);return applyScopedSoundTransform(data,id,transform);}); },
    get view(){ return get(); }, get revision(){ return root.revision; },
    update(key, value) {
      requirePet();
      if (!CAT_FIELDS.includes(key)) throw Error(t('不支援的毛孩資料欄位。'));
      const data = root.get().data;
      if (id === ROOT_CAT_ID) root.update(key,value);
      else root.update('multiCat',{...data.multiCat,cats:data.multiCat.cats.map(c => c.id === id ? {...c,data:{...c.data,[key]:value}} : c)});
    },
    async reset(defaults) {
      requirePet();
      if (root.get().status !== 'saved' || root.get().resetting) throw Error(t('資料仍在儲存中或儲存失敗，請先完成儲存。'));
      const data = root.get().data;
      const target = {...structuredClone(defaults),cat:{...structuredClone(catData(data,id).cat),mealDrafts:[],foodDrafts:[]}};
      target.entries=(target.entries||[]).map(row=>({...row,demo:true}));
      target.careItems=(target.careItems||[]).map(row=>({...row,demo:true}));
      // Normal optimistic-CAS writes only; never use the legacy forced global reset.
      if (id === ROOT_CAT_ID) for (const key of CAT_FIELDS) root.update(key,target[key]);
      else root.update('multiCat',{...data.multiCat,cats:data.multiCat.cats.map(c=>c.id===id?{...c,data:target}:c)});
      await root.flush();
      if (root.get().status === 'error') throw Error(root.get().error);
    }
  };
}
let context;
export function useMultiCat(R){ return R.useContext(context); }
const localDate = () => {const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const HOUSEHOLD_CATEGORIES=[K('嘔吐'),K('排泄'),K('其他')];
const eventDraft = () => ({id:'',date:localDate(),time:new Date().toTimeString().slice(0,5),category:'',text:''});
export function MultiCatApp({react:R,storeContext,App,Badge,isDemo=()=>false,isDemoCare=()=>false}) {
  context ||= R.createContext(null);
  const h=R.createElement,root=R.useContext(storeContext),view=R.useSyncExternalStore(root.subscribe,root.get),data=view.data,m=data.multiCat,id=validActiveCatId(m),activeCats=activePetEntries(m),archivedCats=archivedPetEntries(m),archiveGeneration=petArchiveGeneration(m.cats.find(pet=>pet.id===id));
  const scoped=R.useMemo(()=>createScopedStore(root,id),[root,id,archiveGeneration]);
  const [panel,setPanel]=R.useState(null),[profile,setProfile]=R.useState({name:'',age:'',note:''}),[draft,setDraft]=R.useState(eventDraft),[baseline,setBaseline]=R.useState(null),[error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[confirm,setConfirm]=R.useState(null);
  const page=R.useRef('home'),panelReturn=R.useRef(null),writing=R.useRef(false);
  const [touched,setTouched]=R.useState({}),[submitted,setSubmitted]=R.useState(false),[moreOpen,setMoreOpen]=R.useState(false),[created,setCreated]=R.useState(null),[careDates,setCareDates]=R.useState({}),[careSplit,setCareSplit]=R.useState(false);
  const [familyView,setFamilyView]=R.useState(()=>initialFamilyView(m.cats,readStartView())),today=useLocalDay(R);
  // Only a successful creation in this open session offers the optional card.
  // Reloads, existing profiles, restored data and ordinary profile edits never queue it.
  const [soundInvitation,setSoundInvitation]=R.useState(null),soundInvitationRef=R.useRef(null),invitedCats=R.useRef(new Set());
  const dismissSoundInvitation=()=>{if(!soundInvitationRef.current)return;soundInvitationRef.current=null;setSoundInvitation(null);};
  const offerSoundInvitation=catId=>{
   const saved=root.get();
   if(saved.status!=='saved'||saved.resetting||validActiveCatId(saved.data.multiCat)!==catId||invitedCats.current.has(catId)||!hasEstablishedPet(catData(saved.data,catId)))return false;
   invitedCats.current.add(catId);page.current='home';setFamilyView(false);
   const next={catId,restoreGeneration:saved.restoreGeneration||0};soundInvitationRef.current=next;setSoundInvitation(next);return true;
  };
  const takeSoundInvitation=catId=>{
   const pending=soundInvitationRef.current,saved=root.get();
   if(!pending||pending.catId!==catId||validActiveCatId(saved.data.multiCat)!==catId||pending.restoreGeneration!==(saved.restoreGeneration||0))return false;
   dismissSoundInvitation();return true;
  };
  const [archiveBusy,setArchiveBusy]=R.useState(false);
  const [recordRequest,setRecordRequest]=R.useState(null),recordSequence=R.useRef(0),recordPending=R.useRef(null);
  const [familyPage,setFamilyPage]=R.useState(null);R.useEffect(()=>{const open=event=>FAMILY_SHARING_ENABLED&&setFamilyPage(event.detail==='reminders'?'care':'members');window.addEventListener('family-open',open);return()=>window.removeEventListener('family-open',open)},[]);const familyCareOpen=R.useRef(false);
  const [snoozeTick,snoozeRefresh]=R.useState(0);R.useEffect(()=>{const times=activePetEntries(m).flatMap(c=>(catData(data,c.id).careItems||[]).map(item=>Date.parse(item.snoozedUntil))).filter(time=>Number.isFinite(time)&&time>Date.now());if(!times.length)return;const timer=setTimeout(()=>snoozeRefresh(value=>value+1),Math.min(2147483647,Math.max(10,Math.min(...times)-Date.now()+25)));return()=>clearTimeout(timer)},[data,snoozeTick]);
  R.useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(timer)},[notice]);
  R.useEffect(()=>{if(!created)return;const timer=setTimeout(()=>setCreated(null),10000);return()=>clearTimeout(timer)},[created]);
  // The app shell listens for 'paw-play-open-request' (interaction-hub-v39.js PLAY_OPEN_EVENT).
  const openSoundPlay=()=>{dismissSoundInvitation();setCreated(null);window.dispatchEvent(new CustomEvent('paw-play-open-request',{detail:'sound'}));};
  const ref=R.useRef(null),focus=R.useRef(null),first=R.useRef(null),manageEdit=R.useRef(null),confirmSafe=R.useRef(null);
  usePhoneDialog(R,ref,!!panel);
  R.useEffect(()=>{if(confirm)confirmSafe.current?.focus({preventScroll:true});},[confirm]);
  const dirty=panel==='add' ? !!(profile.name||profile.age||profile.ageMonths||profile.birthDate||profile.note||profile.breed||profile.colorId||(profile.sex&&profileSex(profile.sex)!==K('未填'))||profileSpecies(profile.species)!==K('未填')||profileNeutered(profile.neutered)!==K('未填')||Object.values(careDates).some(Boolean)) : panel==='event' && JSON.stringify(draft)!==JSON.stringify(baseline);
  const close=()=>{setPanel(null);setConfirm(null);setError('');requestAnimationFrame(()=>focus.current?.isConnected&&focus.current.focus());};
  const requestClose=()=>writing.current?undefined:confirm?setConfirm(null):dirty?setConfirm({type:'leave'}):close();
  R.useEffect(()=>{if(panel){ref.current?.showModal();requestAnimationFrame(()=>first.current?.focus());}else if(ref.current?.open)ref.current.close();},[panel]);
  R.useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
  const write=async fn=>{if(writing.current||root.get().status!=='saved'){setError(t('資料尚未完成儲存，請先重試儲存，再切換或新增毛孩。'));return false;}writing.current=true;try{await root.atomic(data=>({...data,multiCat:fn(data.multiCat)}));return true;}catch(e){setError(e.message||t('儲存失敗，請重試。'));return false;}finally{writing.current=false;}};
  const open=(next='list',options={})=>{
   focus.current=document.activeElement;manageEdit.current=options.onEdit||null;panelReturn.current=options.returnTo||null;setError('');setConfirm(null);
   if(next==='event'&&[K('排泄'),K('嘔吐')].includes(options.category)){startEvent({...eventDraft(),category:options.category});return;}
   setPanel(next);
  };
  const switchCat=async (next,{today=false}={})=>{
   if(writing.current||root.get().status!=='saved'){setError(t('資料尚未完成儲存，請先重試儲存，再切換或新增毛孩。'));return false;}
   if(!activePetEntries(root.get().data.multiCat).some(cat=>cat.id===next)){setError(t('找不到這隻毛孩，請重新選擇。'));return false;}
   dismissSoundInvitation();
   recordPending.current=null;setRecordRequest(null);
   const priorPage=page.current;
   if(today||familyView)page.current='home';
   else if(next!==id&&panel==='list'&&panelReturn.current==='summary')page.current='summary';
   if(next===id){setFamilyView(false);close();return true;}
   if(await write(m=>{if(!activePetEntries(m).some(cat=>cat.id===next))throw Error(t('這隻毛孩已封存，請重新選擇。'));return {...m,activeId:next};})){setFamilyView(false);setNotice(t('已切換為 {name}。未完成的紀錄仍留在原毛孩。',{name:catData(root.get().data,next).cat.name}));close();return true;}
   page.current=priorPage;return false;
  };
  const requestRecord=async next=>{
   if(!await switchCat(next,{today:true}))return false;
   const request={catId:next,token:++recordSequence.current};recordPending.current=request;setRecordRequest(request);return true;
  };
  const takeRecordRequest=token=>{const request=recordPending.current;if(!request||request.token!==token||request.catId!==validActiveCatId(root.get().data.multiCat))return false;recordPending.current=null;setRecordRequest(null);return true;};
  const add=()=>{setTouched({});setSubmitted(false);setMoreOpen(false);setCreated(null);setProfile({name:'',age:'',note:''});setCareDates({});setCareSplit(false);setError('');setPanel('add');};
  const saveCat=async(sameNameOk=false)=>{setSubmitted(true);if(!profile.name.trim()){setError(t('請填寫毛孩名字。'));return;}if(profile.name.trim().length>40){setError(t('名字請保持在 40 個字以內。'));return;}if(!validCatAge(profile)||profile.birthDate&&profile.birthDate>localToday()){setMoreOpen(true);setError(CAT_AGE_ERROR);return;}if(!validProfileExtras(profile)){setMoreOpen(true);setError(t('品種限 80 字，性別可選公、母或未填。'));return;}if(String(profile.note||'').length>PROFILE_NOTE_MAX){setMoreOpen(true);setError(t('備註最多 {PROFILE_NOTE_MAX} 字，請刪減後再建立。',{PROFILE_NOTE_MAX}));return;}
   // 2026-11-14：下次日期不能是今天以前；同名要先問過（可以選擇仍要用）。
   if(firstCareDateError(careDates,careSplit,localToday())){setError(FIRST_CARE_DATE_SUMMARY);return;}
   if(sameNameOk!==true){const same=samePetName(petRows,profile.name);if(same.length){setError('');setConfirm({type:'sameName',name:profile.name.trim(),same});return;}}
   const next='cat-'+crypto.randomUUID(),priorPage=page.current,care=buildFirstCareItems(careDates,undefined,careSplit);page.current='home';if(await write(m=>({...m,activeId:next,cats:[...m.cats,{id:next,data:(blank=>care.length?{...blank,careItems:[...(blank.careItems||[]),...care]}:blank)(emptyCat(profile,m.cats.length))}]}))){offerSoundInvitation(next);setNotice('');setCreated({catId:next,name:profile.name.trim(),care:care.length});close();}else page.current=priorPage;};
  const changeArchive=async(target,restore=false)=>{
   if(writing.current)return false;
   const before=root.get().data,pet=before.multiCat.cats.find(c=>c.id===target);
   if(!pet){setError(t('找不到這隻毛孩，請重新開啟。'));return false;}
   setArchiveBusy(true);setError('');
   try{
    const ok=await write(m=>restore?restorePet(m,target):archivePet(m,target));
    if(!ok)return false;
    dismissSoundInvitation();recordPending.current=null;setRecordRequest(null);setConfirm(null);
    if(!restore&&id===target){page.current='home';manageEdit.current=null;familyCareOpen.current=false;setFamilyPage(null);setFamilyView(false);}
    setNotice(restore?t('{name}已恢復，原紀錄、未完成的紀錄與提醒設定都已保留。',{name:catData(before,target).cat.name}):t('{name}已封存，所有資料已保留，可到已封存毛孩恢復。',{name:catData(before,target).cat.name}));
    return true;
   }finally{setArchiveBusy(false);}
  };
  const startEvent=(event)=>{setTouched({});setSubmitted(false);const value=event?{...event}:eventDraft();setDraft(value);setBaseline(value);setPanel('event');setError('');};
  const saveEvent=async()=>{setSubmitted(true);if(!HOUSEHOLD_CATEGORIES.includes(draft.category)){setError(t('請先選擇家庭觀察的類別。'));return;}if(!dateValid(draft.date)||draft.date>localDate()){setError(t('請選擇今天或以前的有效日期。'));return;}if(!timeValid(draft.time)){setError(t('請填寫有效的 24 小時制時間。'));return;}if(!draft.text.trim()){setError(t('請寫下觀察內容。'));return;}const event={...draft,id:draft.id||'household-'+crypto.randomUUID(),catId:null,ownership:'unconfirmed',text:draft.text.trim()};if(await write(m=>({...m,householdEntries:draft.id?m.householdEntries.map(e=>e.id===draft.id?event:e):[event,...m.householdEntries]}))){setPanel('household');setError('');setNotice(t('已儲存家庭觀察：{category}，{date} {time}。',{category:draft.category,date:draft.date,time:draft.time}));}};
  const button=(text,onClick,cls='mc-button',extra={})=>h('button',{type:'button',className:cls,onClick,...extra},text);
  const note=text=>h('p',{className:'mc-note'},text);
  const current=catData(data,id);
  // 同名毛孩（2026-11-14）：全部毛孩（含已封存）的名字與分辨資訊；毛孩資料表單也從這份名冊提示同名。
  const petRows=m.cats.map((c,index)=>{const cat=catData(data,c.id).cat||{};return {id:c.id,name:cat.name,archived:!!c.archivedAt,detail:(c.archivedAt?t('已封存 · '):'')+petDetail(cat,index)};});
  setPetDirectory({activeId:id,pets:petRows});
  const activeRows=petRows.filter(row=>!row.archived);
  // The profile page no longer repeats this list: the top pet chips switch pets and
  // 「管理毛孩」 holds switching, adding, archiving and household observations.
  const list=({isDemo:matchesDemo=isDemo,manage=false}={})=>!manage?null:h('section',{className:'mc-family','aria-label':t('我的毛孩')},
    h('p',{className:'mc-note'},t('點一下就切換照顧對象；每隻毛孩的紀錄、食品卡、未完成的紀錄與提醒各自儲存。')),
    h('div',{className:'mc-cat-list'},activeCats.map(c=>{const index=m.cats.findIndex(row=>row.id===c.id),d=catData(data,c.id),active=c.id===id;return h('div',{key:c.id,className:'mc-cat-manage-row'},h('button',{type:'button',className:'mc-cat-card'+(active?' active':''),'aria-pressed':active,onClick:()=>switchCat(c.id)},
      h('img',{className:'mc-avatar',alt:'',src:petAvatar(d.cat,index)}),h('span',{className:'mc-cat-info'},h('strong',null,h('span',{className:'mc-color-dot','aria-hidden':true,style:{backgroundColor:catColor(d.cat,index).coat}}),d.cat.name),h('small',null,`${catAgeLabel(d.cat)} · ${recordCountLabel({entries:d.entries,careItems:d.careItems,foodCards:d.foodCards,catId:c.id,today:localCalendarDate(),isDemo:matchesDemo,isDemoCare})}`),samePetName(activeRows,d.cat.name,c.id).length>0&&h('small',{className:'mc-same-name'},petDetail(d.cat,index,{age:false})),countCareDrafts(d)>0&&h('small',{className:'mc-draft'},t('有未完成的紀錄'))),
      h('span',{className:'mc-selected'},active?t('照顧中'):t('切換'))));})),
    button(t('＋ 新增毛孩'),()=>{focus.current=document.activeElement;add();},'mc-button mc-add'),
    h('details',{className:'mc-manage-details'},h('summary',null,t('管理毛孩')),
     h('div',{className:'mc-manage-actions'},activeCats.map(c=>{const index=m.cats.findIndex(row=>row.id===c.id),d=catData(data,c.id);return button(t('封存{name}',{name:d.cat.name}),()=>{setError('');setConfirm({type:'archive',id:c.id,name:d.cat.name,detail:petDetail(d.cat,index),avatar:petAvatar(d.cat,index)});},'mc-button secondary mc-archive-action',{key:c.id,disabled:archiveBusy||view.status!=='saved'||activeCats.length<=1});}),
      activeCats.length<=1&&note(t('至少保留一隻照顧中的毛孩；先新增或恢復另一隻，即可封存。')),
      button(t('已封存毛孩（{count}）',{count:archivedCats.length}),()=>setPanel('archived'),'mc-button secondary'))),
    button(t('不確定是哪隻？家庭觀察{count}',{count:(m.householdEntries.length?`（${m.householdEntries.length}）`:'')}),()=>open('household'),'mc-household-link'));
  const index=m.cats.findIndex(c=>c.id===id);
  const family={...familyOverviewModel({data,today,isDemo,isDemoCare}),activeId:id,overview:familyView,onSwitch:switchCat,onRecord:requestRecord,onChooseRecord:()=>open('chooseRecord'),onManage:()=>open('list'),busy:writing.current||view.status!=='saved',error:panel?'':error};
  const api={root,notice,soundInvitation:soundInvitation?.restoreGeneration===(view.restoreGeneration||0)?soundInvitation:null,dismissSoundInvitation,takeSoundInvitation,recordRequest,takeRecordRequest,careOpen:familyCareOpen.current,rememberCare:open=>{familyCareOpen.current=open},openFamily:kind=>{if(FAMILY_SHARING_ENABLED)setFamilyPage(kind)},open,add:()=>{focus.current=document.activeElement;add();},list,family,showFamily:()=>{dismissSoundInvitation();recordPending.current=null;setRecordRequest(null);setFamilyView(true)},page:page.current,rememberPage:next=>{if(next!=='home')dismissSoundInvitation();page.current=next}, id,index,color:catColor(current.cat,index),name:current.cat.name, count:activeCats.length,snapshot:()=>({...root.get(),revision:root.revision})};
  const input=(label,value,onChange,extra={})=>{const required=[t('毛孩名字'),t('日期'),t('時間'),t('觀察內容')].includes(label),missing=required&&!String(value).trim()&&(submitted||touched[label]);return h('label',{className:'mc-field'},h('span',null,label+(required?t(' ＊必填'):'')),h(extra.multiline?'textarea':'input',{value,required,'aria-invalid':missing||undefined,onChange:e=>{setError('');onChange(e.target.value);},...extra,onBlur:e=>{setTouched(fields=>({...fields,[label]:true}));extra.onBlur?.(e);},multiline:undefined}),missing&&h('small',{className:'field-error'},t('請填寫{label}。',{label})));};
  let body;
  if(panel==='list')body=h(R.Fragment,null,h('h2',{id:'mc-title'},h('img',{src:'/xbb-site/app/assets/icons/cat-face.svg',alt:''}),t('切換毛孩')),manageEdit.current&&button(t('編輯{name}的資料',{name:current.cat.name||t('目前毛孩')}),()=>{const edit=manageEdit.current;close();edit();},'mc-button secondary',{'aria-label':t('編輯目前毛孩資料：{name}',{name:current.cat.name||t('未命名')})}),list({manage:true}));
  if(panel==='archived')body=h(R.Fragment,null,h('h2',{id:'mc-title'},t('已封存毛孩')),note(t('封存期間不顯示於全家總覽、切換清單或照顧時間表。紀錄、照片、未完成的紀錄與提醒設定仍完整保留，JSON 備份也會包含。')),archivedCats.length?h('div',{className:'mc-archived-list'},archivedCats.map(c=>h('article',{key:c.id,className:'mc-archived-card'},h('strong',null,catData(data,c.id).cat.name),h('small',null,t('封存於 {date}',{date:new Date(c.archivedAt).toLocaleDateString(isEnglish()?'en-US':'zh-TW')})),button(t('恢復毛孩'),()=>changeArchive(c.id,true),'mc-button secondary',{disabled:archiveBusy||view.status!=='saved','aria-label':t('恢復{name}',{name:catData(data,c.id).cat.name})})))):h('p',{className:'mc-empty'},t('目前沒有已封存毛孩。')),button(t('返回切換毛孩'),()=>setPanel('list'),'mc-text',{disabled:archiveBusy}));
  if(panel==='chooseRecord'){
    const labels=familyCatLabels(family.rows);
    body=h(R.Fragment,null,h('h2',{id:'mc-title'},t('這筆要記給誰？')),note(t('先選毛孩，再選紀錄類型。確認儲存前不會新增正式紀錄。')),h('div',{className:'family-record-choices'},family.rows.map((row,index)=>h('button',{key:row.id,type:'button',className:'family-record-choice',disabled:family.busy,onClick:()=>requestRecord(row.id),'aria-label':t('幫{index}記一筆',{index:labels[index]})},h('img',{src:row.photo,alt:''}),h('span',null,h('strong',null,labels[index]),h('small',null,t('{meals} 餐 · {pending} 項要做{drafts}',{meals:row.meals,pending:row.pending,drafts:row.drafts?t(' · {drafts} 筆未完成',{drafts:row.drafts,count:row.drafts}):''}))),h('span',{'aria-hidden':true},'›')))));
  }
  if(panel==='add')body=h(R.Fragment,null,h('h2',{id:'mc-title'},t('新增毛孩')),note(t('建立獨立的空白檔案，不會更動現有毛孩。')),input(t('毛孩名字'),profile.name,name=>{setProfile(p=>({...p,name}));if(confirm?.type==='sameName')setConfirm(null);},{ref:first,maxLength:40}),
    samePetName(petRows,profile.name).length>0&&h('p',{className:'mc-note mc-same-name-note',role:'status'},t('已經有一隻叫「{name}」的毛孩（{map}）。仍可使用，建立前會再問一次；選不同代表色比較好分。',{name:profile.name.trim(),map:samePetName(petRows,profile.name).map(row=>row.detail).join(t('；'))})),
    h('details',{className:'mc-more',open:moreOpen,onToggle:e=>setMoreOpen(e.currentTarget.open)},h('summary',null,t('更多資料（可之後補）')),h('div',{className:'mc-more-body'},h(CatAgeFields,{react:R,profile,onChange:setProfile,className:'mc-field',disabled:writing.current,error:submitted&&!validCatAge(profile)?CAT_AGE_ERROR:''}),h(ProfileExtras,{react:R,profile,onChange:setProfile,className:'mc-field'}),h(CatColorPicker,{react:R,profile,onChange:setProfile,index:m.cats.length}),input(t('備註'),profile.note,note=>setProfile(p=>({...p,note})),{multiline:true,maxLength:PROFILE_NOTE_MAX}),h('small',{className:'mc-note-count','aria-live':'polite'},t('還可以寫 {count} 字',{count:Math.max(0,PROFILE_NOTE_MAX-String(profile.note||'').length)})))),
    h(CareDateFields,{react:R,dates:careDates,setDates:setCareDates,split:careSplit,setSplit:setCareSplit,disabled:writing.current,inputClass:'mc-input'}),
    button(t('建立毛孩'),()=>saveCat(),'mc-button mc-create'));
  if(panel==='household')body=h(R.Fragment,null,h('h2',{id:'mc-title'},t('家庭觀察')),h('span',{className:'mc-owner-label'},t('不確定是哪隻')),note(t('不知道是哪隻時先記在這裡，不會算進任何一隻的看診摘要。')),button(t('＋ 記一筆未確認觀察'),()=>startEvent()),
    !m.householdEntries.length? h('div',{className:'mc-empty'},h('strong',null,t('還沒有未確認的觀察')),note(t('例如：發現嘔吐物，但沒有看到是哪隻毛孩。'))):
    h('div',{className:'mc-household-list'},[...m.householdEntries].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).map(e=>h('article',{key:e.id},h('small',null,e.date+' '+e.time+' · '+t(e.category)),h('p',null,displayStoredText(e.text)),h(RecordAttribution,{react:R,row:e}),h('div',{className:'mc-actions'},button(t('編輯'),()=>startEvent(e),'mc-text'),button(t('刪除'),()=>setConfirm({type:'delete',id:e.id}),'mc-text danger',{'data-family-delete-owner':e.createdBy?.id||'','data-family-delete-kind':'household'}))))));
  if(panel==='event')body=h(R.Fragment,null,h('h2',{id:'mc-title'},draft.id?t('編輯家庭觀察'):t('記一筆家庭觀察')),h('span',{className:'mc-owner-label'},t('不確定是哪隻')),note(t('只存成家庭觀察，不會歸到目前選擇的毛孩。')),input(t('日期'),draft.date,date=>setDraft(d=>({...d,date})),{type:'date',max:localDate(),ref:first}),input(t('時間'),draft.time,time=>setDraft(d=>({...d,time})),{type:'time'}),h('label',{className:'mc-field'},h('span',null,t('類別 ＊必填')),h('select',{value:draft.category,required:true,'aria-invalid':submitted&&!draft.category||undefined,onChange:e=>{setDraft(d=>({...d,category:e.target.value}));setError('');}},h('option',{value:'',disabled:true},t('請選擇類別')),HOUSEHOLD_CATEGORIES.map(v=>h('option',{key:v,value:v},t(v))))),input(t('觀察內容'),draft.text,text=>setDraft(d=>({...d,text})),{multiline:true,maxLength:5000,placeholder:t('例如：發現砂盆外有排泄物，不確定是哪隻毛孩。')}),button(t('儲存家庭觀察'),saveEvent));
  const viewer=FAMILY_SHARING_ENABLED&&currentMember(data)?.role==='viewer';
  const familyScreen=FAMILY_SHARING_ENABLED&&familyPage&&h('div',{className:'inpaw-app fs-full-page'},h('main',{className:'app-content fs-full-scroll'},familyPage==='members'?h(FamilyMembers,{react:R,root,onClose:()=>setFamilyPage(null)}):h(FamilyCare,{react:R,root,catId:id,isDemoCare,onClose:()=>setFamilyPage(null)})));
  if(!hasEstablishedPet(current))return h(FirstPetSetup,{react:R,root,id,key:id,onCreated:offerSoundInvitation});
  return h(context.Provider,{value:api},h(FamilyAccessBoundary,{react:R,root},familyScreen,h(CareWorkspace,{react:R,root,activeCatId:id,today}),h('div',{className:'fs-app-slot',hidden:!!familyPage},viewer?h(FamilyViewerApp,{react:R,root,catId:id,onSwitchCat:switchCat,onFamilyCare:()=>setFamilyPage('care'),error,isDemo,isDemoCare}):h(storeContext.Provider,{value:scoped},h(App,{key:id+':'+archiveGeneration}))),
    h('dialog',{ref,className:'mc-dialog'+(panel==='list'?' mc-switcher-dialog':''),'aria-labelledby':'mc-title',onCancel:e=>{e.preventDefault();requestClose();}},
      confirm?.type==='sameName'?h(R.Fragment,null,h('h2',{id:'mc-title'},t('已經有叫「{name}」的毛孩',{name:confirm.name})),note(t('同名的毛孩：{map}。',{map:confirm.same.map(row=>row.detail).join(t('；'))})),note(t('仍可用這個名字；兩隻會用代表色、年齡和品種分辨。也可以返回改名字或換代表色。')),button(t('返回修改'),()=>setConfirm(null),'mc-button secondary',{ref:confirmSafe}),button(t('仍要用這個名字'),()=>{setConfirm(null);saveCat(true);},'mc-button')):
      confirm?.type==='archive'?h(R.Fragment,null,h('h2',{id:'mc-title'},t('封存{name}？',{name:confirm.name})),confirm.detail&&h('p',{className:'mc-archive-identity'},confirm.avatar&&h('img',{className:'mc-avatar',alt:'',src:confirm.avatar,width:40,height:40,style:{width:40,height:40,borderRadius:'50%',objectFit:'cover',flex:'0 0 40px'}}),h('span',null,confirm.detail)),note(t('將從全家總覽、切換清單與照顧時間表隱藏。紀錄、照片、未完成的紀錄、提醒設定及 JSON 備份都會保留；之後可在「已封存毛孩」恢復。')),note(t('其他毛孩不受影響。恢復後，原本啟用的提醒會再次出現在照顧時間表。')),error&&h('p',{role:'alert',className:'mc-error'},error),button(t('取消，繼續照顧'),()=>{setConfirm(null);setError('');},'mc-button secondary',{ref:confirmSafe,disabled:archiveBusy}),button(archiveBusy?t('正在儲存…'):t('確認封存'),()=>changeArchive(confirm.id),'mc-button',{disabled:archiveBusy||view.status!=='saved'})):
      confirm?h(R.Fragment,null,h('h2',{id:'mc-title'},confirm.type==='delete'?t('刪除這筆家庭觀察？'):t('離開未儲存的內容？')),note(confirm.type==='delete'?t('只會刪除這筆家庭觀察，其他毛孩資料保持不變。'):t('尚未儲存的表單內容將捨棄。')),button(t('保留並繼續'),()=>setConfirm(null),'mc-button',{ref:confirmSafe}),button(confirm.type==='delete'?t('確認刪除'):t('捨棄並離開'),async()=>{if(confirm.type==='delete'){if(window.__deleteSafety)await window.__deleteSafety.guard(t('刪除一筆家庭觀察'));if(await write(m=>({...m,householdEntries:m.householdEntries.filter(e=>e.id!==confirm.id)}))){setConfirm(null);window.__deleteSafety?.snack(t('家庭觀察已刪除'));}}else close();},'mc-text danger')):
      h(R.Fragment,null,body,h(MultiCatError,{react:R,error,scope:ref}),view.status==='error'&&h('p',{role:'alert',className:'mc-error'},view.error,button(t('重試儲存'),root.retry,'mc-text')),button(t('關閉'),requestClose,'mc-button secondary'))),
    created&&created.catId===id&&!panel&&h('aside',{className:'mc-created',role:'status'},h('span',null,created.care?t('已新增毛孩：{name}，疫苗與驅蟲日期已加進照顧時間表。',{name:created.name}):t('已新增毛孩：{name}。',{name:created.name})),!created.care&&h('button',{type:'button',className:'mc-created-link',onClick:()=>{setCreated(null);window.dispatchEvent(new CustomEvent('paw-care-open-request'));}},t('加上疫苗與驅蟲日期 ›')),h('button',{type:'button',className:'mc-created-close','aria-label':t('關閉新增完成提示'),onClick:()=>setCreated(null)},'×'))));
}
