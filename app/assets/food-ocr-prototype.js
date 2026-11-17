import {t, tn, K} from './i18n.js?v=audit1117b';
import {useCloudQuota} from './cloud-quota.js?v=quota-feedback1';
import { cloudMode, cloudStatus, STATUS_REASONS, startSignIn, prepareJpeg, submitCloudJob, resumeCloudJob, DETACH_REASON, CONSENT, failureMessage, foodAnalysisView } from './cloud-care.js?v=quota-feedback1';

export const OCR_TEXT_FIELDS=Object.freeze([
 {key:'name',label:t('食品名稱')}, {key:'brand',label:t('品牌')}, {key:'flavor',label:t('口味')},
 {key:'netWeight',label:t('每包淨重'),number:true}, {key:'ingredients',label:t('原料')}
]);
export const OCR_NUTRIENTS=Object.freeze([K('蛋白質'),K('脂肪'),K('纖維'),K('水分'),K('熱量'),K('鈣'),K('磷')]);
export const OCR_SAMPLE_LINES=Object.freeze([
 K('小本本示範｜示範雞肉配方｜雞肉口味'), K('淨重 80 g'), K('原料：雞肉、水、雞肝、礦物質（虛構示範）'),
 K('每 100 g：蛋白質最低 10%、脂肪最低 5%、纖維最高 1%、水分最高 78%、熱量 95 kcal。'),
 K('鈣、磷與主食／副食分類未標示。')
]);
const present=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const defaultNutrient=name=>({name,value:'',unit:name===K('熱量')?'kcal':'%',basis:K('每 100 g'),bound:K('標示值')});
const NUMERIC_LABELS={netWeight:K('淨重|净重|net\\s*weight'),蛋白質:K('蛋白質|蛋白质|(?:crude\\s*)?protein'),脂肪:K('脂肪|(?:crude\\s*)?fat'),纖維:K('纖維|纤维|(?:crude\\s*)?fib(?:er|re)'),水分:K('水分|moisture'),熱量:K('熱量|热量|代謝能|代谢能|calories|energy'),鈣:K('鈣|钙|calcium'),磷:K('磷|phosphorus')};
export function numericSourceStatus(row){
 let source=String(row.source||'').normalize('NFKC').replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g,s=>s.replaceAll(',','')).replace(/(?:每|per|\/)\s*(?:100\s*(?:g|公克|克)|1?\s*(?:kg|公斤))/gi,' ');
 const pattern=NUMERIC_LABELS[row.key?.replace(/^nutrient:/,'')],found=pattern?new RegExp(pattern,'i').exec(source):null;
 if(found){source=source.slice(found.index+found[0].length);const following=new RegExp(Object.values(NUMERIC_LABELS).join('|'),'i').exec(source);if(following)source=source.slice(0,following.index);}
 const values=[...source.matchAll(/(?<![\d.])([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(kcal|mg|g|%|毫克|公克|克|大卡|千卡)(?![A-Za-z])/gi)];
 if(!values.length)return 'unknown';
 const aliases={毫克:'mg',公克:'g',克:'g',大卡:'kcal',千卡:'kcal'},unit=row.key==='netWeight'?'g':row.unit;
 const amounts=new Set(values.filter(m=>(aliases[m[2].toLowerCase()]||m[2].toLowerCase())===unit).map(m=>Number(m[1])));
 if(!amounts.size)return 'mismatch';if(amounts.size!==1)return 'unknown';return amounts.has(Number(row.value))?'match':'mismatch';
}
export function createOCRReview(mode='photo') {
 if(!['photo','sample','cloud'].includes(mode))throw Error(t('請重新選擇核對方式。'));
 const values={name:[K('示範雞肉配方'),OCR_SAMPLE_LINES[0]],brand:[K('小本本示範'),OCR_SAMPLE_LINES[0]],flavor:[K('雞肉'),OCR_SAMPLE_LINES[0]],netWeight:['80',OCR_SAMPLE_LINES[1]],ingredients:[K('雞肉、水、雞肝、礦物質（虛構示範）'),OCR_SAMPLE_LINES[2]]};
 const nutrition={蛋白質:['10',K('最低值')],脂肪:['5',K('最低值')],纖維:['1',K('最高值')],水分:['78',K('最高值')],熱量:['95',K('標示值')]};
 return {mode,confirmedAtOnce:false,fields:[...OCR_TEXT_FIELDS.map(f=>({...f,value:mode==='sample'?values[f.key][0]:'',source:mode==='sample'?values[f.key][1]:'',checked:false})),...OCR_NUTRIENTS.map(name=>({key:'nutrient:'+name,label:t(name),nutrient:true,...defaultNutrient(name),...(mode==='sample'&&nutrition[name]?{value:nutrition[name][0],bound:nutrition[name][1],source:OCR_SAMPLE_LINES[3]}:{unit:'',basis:'',bound:'',source:''}),checked:false}))]};
}
export function validateOCRField(row) {
 if(!present(row.value)||[K('未知'),K('不明'),K('無法辨識'),K('不確定'),'?','？',K('待確認')].includes(String(row.value).trim()))return t('未標示或無法讀取，留空即可。');
 if(!present(row.source))return t('來源尚未確認；請對照包裝照片填寫。');
 if(row.number||row.nutrient){
  if(!/^\d+(\.\d+)?$/.test(String(row.value).trim())||!Number.isFinite(Number(row.value))||Number(row.value)<0)return t('請填有效的非負數字；無法讀取請留空。');
  if(row.key==='netWeight'&&Number(row.value)<=0)return t('淨重需大於 0 g；未標示請留空。');
 }
 if(row.nutrient){
  const units=row.name===K('熱量')?['kcal']:['%','g','mg'];
  if(!units.includes(row.unit)||![K('每 100 g'),K('每 kg'),K('每包')].includes(row.basis)||![K('標示值'),K('最低值'),K('最高值')].includes(row.bound))return t('請核對單位、計量基準與標示方式。');
  if(row.unit==='%'&&Number(row.value)>100)return t('百分比不可超過 100；請再核對原文與單位。');
 }
 if((row.number||row.nutrient)&&numericSourceStatus(row)==='mismatch'&&row.manualNumericConfirmed!==true)return t('辨識數值與來源原文不一致，請對照照片修正並逐項確認。');
 return '';
}
export function createCloudOCRReview(payload) {
 if(payload?.schema!=='food-ocr.v1'||!Array.isArray(payload.fields))throw Error(t('辨識結果格式有誤，請重試或手動填寫。'));
 const review=createOCRReview('cloud'), byKey=new Map();
 for(const item of payload.fields){
  if(typeof item?.key!=='string')continue;
  // A conflicting duplicate leaves the field blank for the user to check.
  byKey.set(item.key,byKey.has(item.key)?null:item);
 }
 const read=(value,limit)=>typeof value==='string'&&value.length<=limit?value.trim():'';
 review.fields=review.fields.map(row=>{
  const item=byKey.get(row.key);
  if(!item)return row;
  const candidate={...row,value:read(item.value,2000),source:read(item.source,2000),sourceKind:'cloud-ocr'};
  if(row.nutrient)Object.assign(candidate,{unit:read(item.unit,12),basis:read(item.basis,20),bound:read(item.bound,12)});
  if(row.key==='netWeight'&&item.unit!=='g')return row;
  // 明確的數值矛盾保留候選與來源原文，供飼主修正；確認／帶入仍會阻擋，不能靜默丟掉來源。
  if((candidate.number||candidate.nutrient)&&numericSourceStatus(candidate)==='mismatch')return candidate;
  return validateOCRField(candidate)?row:candidate;
 });
 if(!review.fields.some(row=>present(row.value)))throw Error(t('這張照片沒有讀到可帶入的資料，請重拍或手動填寫。'));
 review.analysis=foodAnalysisView(payload.analysis)?payload.analysis:null;
 return review;
}
// A single explicit action confirms only complete, valid fields. Unknown fields are not promoted.
export function confirmFoodOCRReview(review) {
 if(!review||!Array.isArray(review.fields))return review;
 return {...review,confirmedAtOnce:true,fields:review.fields.map(row=>({...row,checked:!validateOCRField(row)}))};
}
export function foodOCRFieldStatus(row,mode) {
 const error=validateOCRField(row);
 if(error)return {pending:true,label:t('待確認'),reason:error};
 if(row.manualNumericConfirmed===true)return {pending:false,label:t('已逐項對照照片'),reason:t('修正值與讀到的原文不同，已由你明確核對；原文仍會保留。')};
 if(mode==='cloud'&&(row.number||row.nutrient)&&numericSourceStatus(row)==='unknown')return {pending:false,label:t('待整體確認'),reason:t('來源原文沒有可直接比對的單一數值，請逐項對照照片。')};
 if(mode==='sample'){
  const original=createOCRReview('sample').fields.find(item=>item.key===row.key);
  const changed=original&&['value','unit','basis','bound'].some(key=>(row[key]??'')!==(original[key]??''));
  if(changed)return {pending:false,label:t('已修改 · 待整體確認'),reason:t('與固定示範標籤不同；帶入時會保留原文與你修改後的值。')};
 }
 return {pending:false,label:t('待整體確認'),reason:''};
}
export function hasExistingOCRContent(draft) {
 return ['id','familyId','pendingFoodCardId','name','brand','flavor','netWeight','ingredients'].some(key=>present(draft[key]))||!!draft.photos?.length||(draft.nutrients||[]).some(row=>present(row.value)||['unit','basis','bound'].some(key=>row[key]!==defaultNutrient(row.name)[key]));
}
export function editFoodOCRReview(review,key,patch){
 return {...review,confirmedAtOnce:false,fields:review.fields.map(row=>{
  if(row.key!==key)return row;
  const next={...row,...patch,checked:false,...(!Object.hasOwn(patch,'manualNumericConfirmed')?{manualNumericConfirmed:false}:{})};
  if(review.mode!=='sample'&&!row.source)Object.assign(next,{source:K('使用者對照包裝照片填寫'),sourceKind:'photo-manual'});
  return next;
 })};
}
export function mergeFoodOCRDraft(current,review) {
 const unchanged=error=>({draft:current,applied:[],skipped:[],error});
 if(!review||!['photo','sample','cloud'].includes(review.mode)||!Array.isArray(review.fields))return unchanged(t('請重新開啟照片核對。'));
 if(review.mode==='sample'&&hasExistingOCRContent(current))return unchanged(t('虛構示範不會混入已有內容。請返回手填，或在空白的新食品卡練習。'));
 const selected=review.fields.filter(row=>row.checked);
 if(!selected.length)return unchanged(t('目前沒有可帶入的完整欄位；請對照來源填寫，未知可留空。'));
 if(new Set(selected.map(row=>row.key)).size!==selected.length)return unchanged(t('欄位重複，請重新核對。'));
 for(const row of selected){
  if(!OCR_TEXT_FIELDS.some(f=>f.key===row.key)&&!OCR_NUTRIENTS.some(name=>row.key==='nutrient:'+name&&row.name===name&&row.nutrient))return unchanged(t('不支援的欄位不會帶入。'));
  const err=validateOCRField({...row,number:row.key==='netWeight',nutrient:row.key.startsWith('nutrient:')});
  if(err)return unchanged(row.label+t('：')+err);
 }
 const next={...current,nutrients:(current.nutrients||[]).map(row=>({...row}))},applied=[],skipped=[];
 for(const row of selected){
  if(row.nutrient){
   const target=next.nutrients.find(n=>n.name===row.name),base=defaultNutrient(row.name);
   // Preserve both previously entered values (including 0) and edited metadata.
   if(!target||present(target.value)||['unit','basis','bound'].some(key=>target[key]!==base[key])){skipped.push(row.label);continue;}
   Object.assign(target,{value:String(row.value).trim(),unit:row.unit,basis:row.basis,bound:row.bound});
  }else{
   if(present(next[row.key])){skipped.push(row.label);continue;}
   next[row.key]=String(row.value).trim();
  }
  applied.push(row.key);
 }
 if(!applied.length)return {...unchanged(t('可帶入的欄位已有內容，已全部保留。可回到原表單手動修改。')),skipped};
 // 2026-11-14b：拍照／選照片建立時，照片（已壓縮的 JPEG data URL）存進卡片的包裝照片；來源標成照片建立，
 // 不再保留新表單預設的「手動輸入」。最多 4 張（與手動附照片相同）；滿了就不加，並在結果回報。
 const photoSource=review.mode==='cloud'?K('包裝照片・進階模式 OCR 後人工核對'):K('包裝照片・手動核對'),priorSource=String(current.source||'').split('／').filter(part=>part&&part!==K('手動輸入')).join('／');
 next.source=review.mode==='sample'?K('虛構 OCR 流程示範'):priorSource.includes(photoSource)?priorSource:[priorSource,photoSource].filter(Boolean).join('／');
 let photo='';
 if(review.mode!=='sample'&&validFoodPhotoData(review.photo)){
  const photos=Array.isArray(current.photos)?current.photos:[];
  if(photos.includes(review.photo))photo='already';
  else if(photos.length>=FOOD_PHOTO_LIMIT)photo='full';
  else{next.photos=[...photos,review.photo];photo='saved';}
 }
 if(review.mode==='sample'||current.demo===true||priorSource.includes(K('示範'))||String(current.familyId||'').startsWith('food-demo'))next.demo=true;
 const currentValue=row=>row.nutrient?next.nutrients.find(n=>n.name===row.name)?.value:next[row.key];
 const pendingFields=[...(current.ocrReview?.pendingFields||[]).filter(row=>!applied.includes(row.key)),...review.fields.filter(row=>!row.checked&&!present(currentValue(row))).map(row=>({key:row.key,label:row.label,rawValue:String(row.value??''),unit:row.unit||'',basis:row.basis||'',bound:row.bound||'',reason:validateOCRField(row)||t('未確認')}))];
 const executedOCR=review.mode==='cloud'||current.ocrReview?.executedOCR===true;
 next.ocrReview={...current.ocrReview,mode:review.mode,prototype:!executedOCR,executedOCR,confirmation:review.confirmedAtOnce?K('整頁確認'):K('歷史逐欄確認'),pendingFields:Array.from(new Map(pendingFields.map(row=>[row.key,row])).values()),fields:[...(current.ocrReview?.fields||[]),...selected.filter(row=>applied.includes(row.key)).map(row=>({key:row.key,source:String(row.source).trim(),sourceKind:row.manualNumericConfirmed?'cloud-ocr-manual':row.sourceKind||'label-text',value:String(row.value).trim(),...(row.nutrient?{unit:row.unit,basis:row.basis,bound:row.bound}:row.key==='netWeight'?{unit:'g'}:{} )}))]};
 // id, familyId, version, classification and historical food cards are never changed; photos only gain this review's own photo.
 return {draft:next,applied,skipped,error:'',photo};
}
export const FOOD_PHOTO_LIMIT=4;
// 卡片保存的包裝照片：和進階模式送出前一樣先轉正、縮到長邊 2048、重新壓成 660 KB 內的 JPEG（去掉拍攝資訊）。
export const validFoodPhotoData=value=>typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)&&value.length<=9*1024*1024;
export async function foodPhotoDataUrl(file){const jpeg=await prepareJpeg(file);return 'data:image/jpeg;base64,'+jpeg.base64;}
export function validOCRPhoto(file){return !!file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=6*1024*1024;}

// 進階模式食品結果是替哪一張食品卡送的（新卡為 new）：離開後在別張卡的表單帶回時要提醒，免得套錯商品。
const FOOD_TARGET_KEY='xbb.foodOcrTarget';
const foodTarget=draft=>String(draft?.familyId||'new');
const rememberFoodTarget=draft=>{try{localStorage.setItem(FOOD_TARGET_KEY,foodTarget(draft));}catch{/* 只是提醒用 */}};
const recalledFoodTarget=()=>{try{return localStorage.getItem(FOOD_TARGET_KEY)||'';}catch{return '';}};
export function FoodOCRPrototype({react:R,draft,onApply,disabled=false,preparePhoto=foodPhotoDataUrl}){
 const h=R.createElement;
 const [open,setOpen]=R.useState(false),[review,setReview]=R.useState(null),[photo,setPhoto]=R.useState(null);
 const [error,setError]=R.useState(''),[notice,setNotice]=R.useState(''),[scanning,setScanning]=R.useState(false);
 const [mode]=R.useState(()=>cloudMode()),[gate,setGate]=R.useState(null),[consenting,setConsenting]=R.useState(false),[phase,setPhase]=R.useState(''),[failure,setFailure]=R.useState(null);
 const trigger=R.useRef(null),heading=R.useRef(null),camera=R.useRef(null),gallery=R.useRef(null);
 const wasOpen=R.useRef(false),inFlight=R.useRef(null),cloudHeld=R.useRef(false),savedPhoto=R.useRef(null),[saving,setSaving]=R.useState(false);
 const [restored,setRestored]=R.useState(false);
 // The user is done with a cloud result (applied, cancelled or replaced): delete the cloud copy.
 // A failure here never blocks the user; the native bridge retries later.
 const releaseCloud=()=>{
  if(!cloudHeld.current)return;
  cloudHeld.current=false;
  try{globalThis.CloudCare?.release?.();}catch{/* retried later by the native bridge */}
 };
 const stage=review?'review':consenting?'consent':photo?'preview':'capture';
 const quota=useCloudQuota(R,stage==='consent'&&mode==='native',globalThis.V161Cloud);
 R.useEffect(()=>{if(open){wasOpen.current=true;heading.current?.focus();}else if(wasOpen.current){trigger.current?.focus();wasOpen.current=false;}},[open,stage]);
 R.useEffect(()=>()=>{if(photo?.url)URL.revokeObjectURL(photo.url);},[photo]);
 // Leaving the page only detaches: the cloud job keeps running and is brought back on return.
 R.useEffect(()=>()=>{inFlight.current?.abort(DETACH_REASON);inFlight.current=null;},[]);
 // Back on this form (or app start): bring back a food result that finished while the user was away.
 R.useEffect(()=>{
  if(mode!=='native'||inFlight.current)return;
  const controller=new AbortController();
  inFlight.current=controller;
  let live=true,billing='unknown';
  resumeCloudJob('food',{signal:controller.signal,onBilling:value=>{billing=value;},onUpdate:status=>{
   if(!live)return;
   setOpen(true);setConsenting(true);setScanning(true);setPhase(status==='running'?'running':'');
  }}).then(result=>{
   if(!live||!result)return;
   void quota.settle({outcome:'success',billing});
   cloudHeld.current=true;
   try{
    const next=createCloudOCRReview(result.payload);
    setOpen(true);setConsenting(false);setScanning(false);setPhase('');setRestored(true);setReview(next);
    const target=recalledFoodTarget();
    if(target&&target!==foodTarget(draft))setNotice(t('這份辨識結果是在另一張食品卡送出的，請確認是同一個商品再帶入。'));
   }catch(err){
    releaseCloud();setOpen(true);setConsenting(false);setScanning(false);setError(tn(err.message)||t('辨識結果格式有誤，請重試或手動填寫。'));
   }
  }).catch(err=>{
   if(!live)return;
   setConsenting(false);setScanning(false);setPhase('');
   void quota.settle({outcome:err?.code==='cancelled'?'pending':'failure',billing:err?.billing||billing});
   if(err?.code==='cancelled')return;
   const m=failureMessage(err?.code||'unavailable');
   setOpen(true);setError(m.title+'。'+m.body);
  }).finally(()=>{if(inFlight.current===controller)inFlight.current=null;});
  return()=>{live=false;};
 },[]);
 R.useEffect(()=>{if(open&&photo&&mode!=='off'){let live=true;cloudStatus('food').then(s=>{if(live)setGate(s);});return()=>{live=false;};}},[open,!!photo,mode]);
 const clearPhoto=()=>{quota.clearResult();releaseCloud();setRestored(false);setConsenting(false);setFailure(null);setPhase('');
  inFlight.current?.abort();
  inFlight.current=null;
  setScanning(false);
  setReview(null);
  setPhoto(null);
  setError('');
 };
 const reset=()=>{clearPhoto();setOpen(false);};
 const update=(key,patch)=>setReview(old=>editFoodOCRReview(old,key,patch));
 const choose=file=>{
  if(!file)return;
  if(!validOCRPhoto(file)){setError(t('請選 6 MB 以內的 JPG、PNG 或 WebP 照片。'));return;}
  clearPhoto();
  setPhoto({url:URL.createObjectURL(file),file});
 };
 const scan=async()=>{
  if(!photo||mode==='off'||disabled||inFlight.current)return;
  const controller=new AbortController();
  let timedOut=false;
  const attempt={sent:false,done:false,billing:'unknown'};
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},200000);
  inFlight.current=controller;
  setScanning(true);
  setError('');
  setFailure(null);
  setPhase('');
  quota.clearResult();
  try{
   const jpeg=await prepareJpeg(photo.file);
   savedPhoto.current={file:photo.file,data:'data:image/jpeg;base64,'+jpeg.base64};
   rememberFoodTarget(draft);
   attempt.sent=true;
   const payload=await submitCloudJob('food',jpeg.base64,{signal:controller.signal,onUpdate:setPhase,onBilling:value=>{attempt.billing=value;}});
   attempt.done=true;
   if(inFlight.current===controller&&!controller.signal.aborted){cloudHeld.current=true;setConsenting(false);setReview(createCloudOCRReview(payload));}
  }catch(err){
   attempt.billing=err?.billing||attempt.billing;
   releaseCloud();
   if(inFlight.current===controller){
    setConsenting(false);
    // A user cancel just goes back to the photo; anything else shows a plain-language reason.
    if(err?.code!=='cancelled'||timedOut)setFailure(timedOut?'expired':err?.code||'unreadable');
   }
  }finally{
   clearTimeout(timeout);
   if(inFlight.current===controller){
    inFlight.current=null;setScanning(false);setPhase('');
    if(mode==='native')void quota.settle({outcome:attempt.done?'success':!attempt.sent?'not-sent':controller.signal.aborted?'pending':'failure',billing:attempt.billing});
   }
  }
 };
 const confirmed=review?confirmFoodOCRReview(review):null,plan=confirmed?mergeFoodOCRDraft(draft,confirmed):null,ready=confirmed?.fields.filter(row=>row.checked).length||0;
 // 帶入時順便把這張包裝照片（壓縮後）存進卡片；壓縮失敗只略過照片，欄位照常帶入。
 const apply=async()=>{
  if(saving)return;
  let withPhoto=confirmed,photoNote='';
  if(photo?.file&&confirmed?.mode!=='sample'){
   setSaving(true);
   try{const data=savedPhoto.current?.file===photo.file?savedPhoto.current.data:await preparePhoto(photo.file);if(validFoodPhotoData(data))withPhoto={...confirmed,photo:data};else photoNote=t('照片無法保存，可在下方另外附上包裝照片。');}
   catch{photoNote=t('照片無法保存，可在下方另外附上包裝照片。');}
   finally{setSaving(false);}
  }
  const result=mergeFoodOCRDraft(draft,withPhoto);if(result.error){setError(result.error);return;}
  if(result.photo==='full')photoNote=t('這張食品卡已有 {n} 張照片，這張沒有另外保存。',{n:FOOD_PHOTO_LIMIT});
  onApply(withPhoto);setNotice(t('已帶入 {n} 個欄位{kept}{photo}。{photoNote}確認名稱與分類後，按「{button}」。', {n: result.applied.length, kept: result.skipped.length?t('，並保留原本已填的內容'):'', photo: result.photo==='saved'?t('，包裝照片已存進卡片（已壓縮）'):'', photoNote, button: draft.familyId?t('儲存修改'):t('建立食品卡')}));savedPhoto.current=null;reset();
 };
 const icon=h('svg',{viewBox:'0 0 24 24',width:28,height:28,fill:'none',stroke:'currentColor',strokeWidth:1.5,'aria-hidden':true},h('path',{d:'M8 6l1.5-2h5L16 6h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'}),h('circle',{cx:12,cy:13,r:4}));
 const button=(label,fn,extra={})=>h('button',{type:'button',onClick:fn,...extra},label);
 const renderField=row=>{const reason=present(row.value)?validateOCRField(row):'';return h('article',{key:row.key,className:'ocr-field'+(reason?' is-pending':'')},
  h('div',{className:'ocr-field-content'},
   h('label',null,row.label+(row.key==='netWeight'?t('（g）'):''),h(row.key==='ingredients'?'textarea':'input',{'aria-label':t('核對')+row.label,value:row.value,inputMode:row.number||row.nutrient?'decimal':undefined,placeholder:t('未知／未標示請留空'),onChange:e=>update(row.key,{value:e.target.value})})),
   row.sourceKind==='cloud-ocr'&&h('p',{className:'ocr-original'},t('讀到的原文：')+row.source),
   row.sourceKind==='cloud-ocr'&&(row.number||row.nutrient)&&numericSourceStatus(row)==='mismatch'&&h('label',{className:'ocr-numeric-review',style:{display:'flex',alignItems:'flex-start',gap:8}},h('input',{type:'checkbox',checked:row.manualNumericConfirmed===true,'aria-label':row.label+t('已對照照片確認修正值'),style:{width:20,minWidth:20,height:20},onChange:e=>update(row.key,{manualNumericConfirmed:e.target.checked})}),h('span',null,t('我已對照照片，確認使用這個修正值'))),
   row.sourceKind==='cloud-ocr'&&(row.number||row.nutrient)&&numericSourceStatus(row)==='unknown'&&h('p',{className:'ocr-hint'},t('來源原文沒有可直接比對的單一數值，請逐項對照照片。')),
   row.nutrient&&h('div',{className:'ocr-meta'},[['unit',t('單位'),row.name===K('熱量')?['kcal']:['%','g','mg']],['bound',t('標示方式'),[K('標示值'),K('最低值'),K('最高值')]],['basis',t('計量基準'),[K('每 100 g'),K('每 kg'),K('每包')]]].map(([key,label,options])=>h('label',{key},label,h('select',{'aria-label':t('核對')+row.label+label,value:row[key],onChange:e=>update(row.key,{[key]:e.target.value})},h('option',{value:''},t('未知／待確認')),options.map(value=>h('option',{key:value,value},t(value))))))),
   reason&&h('p',{className:'ocr-hint'},reason)));};
 const preview=(open)=>h('details',{className:'ocr-source',open},h('summary',null,t('包裝照片')),
  h('img',{src:photo.url,alt:t('本次選擇的包裝照片'),onError:()=>{clearPhoto();setError(t('照片無法顯示，請重拍或重新選擇。'));}}));
 return h('section',{className:'food-ocr','aria-label':t('食品包裝掃描')},
  !open?h(R.Fragment,null,button(h(R.Fragment,null,h('span',{className:'ocr-camera'},icon),h('span',{className:'ocr-entry-copy'},h('strong',null,mode!=='off'?t('拍照讓 AI 幫我填'):t('拍照對照手填')),h('small',null,mode!=='off'?t('讀出名稱與營養，用 1 次額度'):t('可拍照或選照片對照填寫'))),h('span',{'aria-hidden':true},'›')),()=>{setOpen(true);setNotice('');},{ref:trigger,className:'ocr-entry',disabled}),notice&&h('p',{role:'status',className:'ocr-success'},notice)):
  h(R.Fragment,null,h('div',{className:'ocr-titlebar'},h('h2',{ref:heading,tabIndex:-1},review?t('核對食品資料'):consenting?t('送出前確認'):photo?t('確認包裝照片'):t('掃描食品包裝')),button(t('取消'),reset,{className:'ocr-cancel','aria-label':t('取消包裝掃描')})),
   quota.resultLine&&h('p',{className:'ocr-success',role:'status','data-food-quota-result':true},quota.resultLine),
   h('input',{ref:camera,type:'file',accept:'image/jpeg,image/png,image/webp',capture:'environment',hidden:true,'aria-label':t('拍攝食品包裝'),onChange:e=>{choose(e.target.files?.[0]);e.target.value='';}}),
   h('input',{ref:gallery,type:'file',accept:'image/jpeg,image/png,image/webp',hidden:true,'aria-label':t('選擇食品包裝照片'),onChange:e=>{choose(e.target.files?.[0]);e.target.value='';}}),
   stage==='capture'&&h(R.Fragment,null,
    h('div',{className:'ocr-photo-prompt'},h('span',{className:'ocr-camera'},icon),h('strong',null,t('拍清楚名稱與營養標示')),h('p',null,t('讓文字清楚入鏡，避開反光。')),
     h('div',{className:'ocr-photo-actions'},button(t('拍照'),()=>camera.current?.click(),{className:'ocr-primary',disabled}),button(t('選照片'),()=>gallery.current?.click(),{className:'ocr-secondary',disabled}))),
    mode==='off'&&h('p',{className:'ocr-hint'},t('這個版本不能用進階模式辨識，可拍照對照填寫。')),
    button(t('直接手填食品卡'),reset,{className:'ocr-manual'})),
   stage==='preview'&&h(R.Fragment,null,preview(true),
    h('div',{className:'ocr-apply-box'},
     mode!=='off'?h(R.Fragment,null,
      mode==='mock'&&h('p',{className:'cc-sample-tag'},t('示範模式：結果是模擬的範例，不是真的辨識。')),
      failure&&h(CloudFailure,{R,code:failure,onRetry:()=>{setFailure(null);setConsenting(true);},onManual:()=>{setFailure(null);setError('');setReview(createOCRReview('photo'));}}),
      !failure&&gate&&!gate.ok&&h(CloudGate,{R,reason:gate.reason,onSignIn:()=>startSignIn()}),
      !failure&&(!gate||gate.ok)&&h(R.Fragment,null,h('p',null,t('進階模式辨識會讀出名稱與營養標示，並估算乾物質成分。送出前會先請你確認。')),button(t('用進階模式辨識這張照片'),()=>setConsenting(true),{className:'ocr-primary',disabled:disabled||!gate})),
      button(t('對照照片手填'),()=>{setError('');setReview(createOCRReview('photo'));},{className:'ocr-manual',disabled})):
      h(R.Fragment,null,h('p',null,t('這個版本不能用進階模式辨識。照片只留在這台裝置，不會上傳；帶入時會存進食品卡。')),button(t('對照照片填寫'),()=>{setError('');setReview(createOCRReview('photo'));},{className:'ocr-primary',disabled})),
     error&&h('p',{className:'ocr-error',role:'alert'},error)),
    button(t('重新拍照或選照片'),clearPhoto,{className:'ocr-reselect'})),
   stage==='consent'&&h(R.Fragment,null,
    scanning?h(CloudWaiting,{R,phase,onCancel:()=>inFlight.current?.abort()}):
    h(CloudConsent,{R,copy:{...CONSENT.food,cost:mode==='native'?quota.line:t('操作範例，不使用額度。')},sample:mode==='mock',onAccept:scan,onDecline:()=>setConsenting(false),disabled:disabled||quota.empty})),
   stage==='review'&&h(R.Fragment,null,
    restored&&h('p',{role:'status',className:'ocr-success'},t('已帶回進階模式整理結果，請核對後儲存。')),
    h('p',{className:'ocr-explain'},t('有錯可直接改。看不清楚或未標示的資料請留空。')),
    photo&&preview(review.mode==='photo'),
    button(t('重新拍照或選照片'),clearPhoto,{className:'ocr-reselect'}),
    h('div',{className:'ocr-review-heading'},h('h3',null,t('基本資料'))),
    h('div',{className:'ocr-fields'},review.fields.filter(row=>!row.nutrient).map(renderField)),
    h('details',{className:'ocr-nutrition',open:review.fields.some(row=>row.nutrient&&row.sourceKind==='cloud-ocr')},h('summary',null,t('營養標示（選填）')),
     h('div',{className:'ocr-fields'},review.fields.filter(row=>row.nutrient).map(renderField))),
    review.analysis&&h(FoodAnalysisCard,{R,analysis:review.analysis,sample:mode==='mock'}),
    h('div',{className:'ocr-apply-box'},
     h('p',null,photo?.file&&review.mode!=='sample'?t('確認後會帶入食品卡，這張包裝照片也會壓縮後存進卡片；選好分類即可儲存。'):t('確認後會帶入食品卡，選好分類即可儲存。')),
     plan?.error&&ready>0&&h('p',{className:'ocr-hint'},plan.error),
     button(saving?t('正在保存照片…'):t('核對完成，帶入食品卡'),apply,{className:'ocr-primary',disabled:disabled||saving||!ready||!!plan?.error}))),
   stage!=='preview'&&error&&h('p',{className:'ocr-error',role:'alert'},error)));
}

export function FoodOCRProvenance({react:R,food}){
 const h=R.createElement,source=food?.ocrReview;if(!source||!Array.isArray(source.fields))return null;
 return h('details',{className:'food-ocr-provenance'},h('summary',null,source.mode==='sample'?t('虛構示範 · 確認來源'):t('包裝照片 · 確認來源')),h('p',null,source.executedOCR?t('部分欄位由進階模式辨識後人工核對。以下保留原文與帶入時的值。'):t('以下保留人工核對的來源與帶入時的值。')),h('ul',null,source.fields.map((row,index)=>h('li',{key:index},h('strong',null,OCR_TEXT_FIELDS.find(f=>f.key===row.key)?.label||t(row.key.replace('nutrient:',''))),h('div',null,(row.sourceKind==='photo-manual'?t('來源註記：'):t('原文：'))+row.source),h('div',null,t('帶入時：')+[row.value,row.unit,row.bound&&t(row.bound),row.basis&&t(row.basis)].filter(Boolean).join(' · '))))),source.pendingFields?.length>0&&h('div',{className:'ocr-pending-provenance'},h('strong',null,t('待確認 · 未帶入')),h('ul',null,source.pendingFields.map((row,index)=>h('li',{key:index},row.label+t('：')+(row.rawValue||t('未知'))+t('。')+row.reason)))));
}

// ---- Cloud flow pieces (consent, waiting, failure, sign-in gate) and the 成分解讀 card ----
export function CloudConsent({R,copy,sample,onAccept,onDecline,disabled}){
 const h=R.createElement;
 return h('section',{className:'cc-consent','aria-label':copy.title},
  sample&&h('p',{className:'cc-sample-tag'},t('示範模式：不會真的送出任何資料。')),
  h('h3',null,copy.title),
  h('dl',{className:'cc-facts'},
   [[t('送出什麼'),copy.sends],[t('送到哪裡'),copy.to],[t('用來做什麼'),copy.use],[t('要用額度'),copy.cost],[t('保存多久'),copy.keep]].map(([k,v])=>h('div',{key:k},h('dt',null,k),h('dd',null,v)))),
  copy.reminder&&h('p',{className:'cc-reminder'},copy.reminder),
  h('div',{className:'cc-actions'},
   h('button',{type:'button',className:'ocr-primary',onClick:onAccept,disabled},copy.accept),
   h('button',{type:'button',className:'ocr-manual',onClick:onDecline},copy.decline)));
}
export function CloudWaiting({R,phase,onCancel}){
 const h=R.createElement;
 return h('section',{className:'cc-waiting',role:'status','aria-live':'polite'},
  h('div',{className:'cc-spinner','aria-hidden':true}),
  h('strong',null,phase==='running'?t('正在讀取…'):t('已送出，排隊中…')),
  h('p',null,t('可以留在這裡等。通常不到一分鐘。')),
  phase!=='running'&&h('button',{type:'button',className:'ocr-manual',onClick:onCancel},t('取消')),
  phase==='running'&&h('p',{className:'cc-tiny'},t('已經開始處理，這時取消不一定來得及，結果出來後可以直接丟掉。')));
}
export function CloudFailure({R,code,onRetry,onManual}){
 const h=R.createElement,m=failureMessage(code);
 return h('section',{className:'cc-failure',role:'alert'},h('strong',null,m.title),h('p',null,m.body),
  h('div',{className:'cc-actions'},m.retry&&h('button',{type:'button',className:'ocr-primary',onClick:onRetry},t('再試一次')),h('button',{type:'button',className:'ocr-manual',onClick:onManual},t('改用手動核對'))));
}
export function CloudGate({R,reason,onSignIn}){
 const h=R.createElement,info=STATUS_REASONS[reason]||STATUS_REASONS.denied;
 return h('section',{className:'cc-gate'},h('strong',null,info.title),h('p',null,info.body),info.action==='signIn'&&h('button',{type:'button',className:'ocr-primary',onClick:onSignIn},t('用 Google 登入')));
}
const pct=v=>v===null?'—':v+'%';
export function FoodAnalysisCard({R,analysis,sample}){
 const h=R.createElement,view=foodAnalysisView(analysis);
 if(!view)return null;
 const dryTotals=view.nutrients.some(n=>n.dryMatter!==null);
 return h('details',{className:'cc-analysis',open:true},h('summary',null,t('成分解讀（估算）')),
  h('p',{className:'cc-note'},sample?t('範例資料。'):'',t('依包裝標示的保證值估算，不是實測。只描述標籤，不代表好或不好，也不能取代獸醫或營養師的建議。')),
  view.nutrients.length>0&&h('table',{className:'cc-table'},h('caption',null,t('營養標示換算')),
   h('thead',null,h('tr',null,h('th',null,t('項目')),h('th',null,t('標示')),h('th',null,t('乾物質')))),
   h('tbody',null,view.nutrients.map(n=>h('tr',{key:n.label},h('th',{scope:'row'},t(n.label)+n.bound),h('td',null,pct(n.asFed)),h('td',null,pct(n.dryMatter)))))),
  !dryTotals&&h('p',{className:'cc-hint'},(m=>m?t(m):'')(view.notes.find(x=>x.includes(K('水分'))||/moisture/i.test(x)))||t('標示不完整，無法換算乾物質。')),
  view.moisture!==null&&h('p',{className:'cc-line'},h('b',null,t('換算用水分　')),view.moisture+'%'),
  view.ratio!==null&&h('p',{className:'cc-line'},h('b',null,t('鈣磷比　')),view.ratio+' : 1'),
  view.energy&&h('p',{className:'cc-line'},h('b',null,t('熱量　')),view.energy.per100g+t(' kcal／100 g')+(view.energy.perKg!==null?t('（約 ')+view.energy.perKg+t(' kcal／kg）'):'')),
  view.references.map(block=>h('div',{key:block.label,className:'cc-ref'},h('h4',null,t(block.label)),
   h('ul',null,block.items.map(item=>h('li',{key:item.label,className:'cc-ref-'+item.status},h('span',null,t(item.label)+t('　乾物質 ')+pct(item.dryMatter)+(item.minimum!==null?t('（參考 ≥ ')+item.minimum+t('%）'):'')),h('em',null,item.statusText)))))),
  view.ingredientGroups.length>0&&h('div',{className:'cc-ingredients'},h('h4',null,t('原料分類（依標示順序）')),
   h('ul',null,view.ingredientGroups.map(g=>h('li',{key:g.category},h('b',null,t(g.category)),h('span',null,g.items.join(t('、'))))))),
  h('p',{className:'cc-tiny'},t('這張卡目前只在核對時顯示，不會存進食品卡。')));
}
