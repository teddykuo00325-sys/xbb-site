import {t, K} from './i18n.js?v=audit1117b';
import {repairLegacyMealDrafts} from './meal-draft-references.js?v=8f5745b7843b';
import {countCareDrafts} from './usability-v49.js?v=8f5745b7843b';
import {validCatAge} from './cat-age.js';
import {validPlayLab} from '../play-lab-data.js?v=play-personality1';
import {validateDiaryEntry,validateDiaryCollection} from './life-diary-model.js?v=1';
// Strict contract for JSON exports. Unknown fields are rejected,
// never stripped, so unsupported historical data cannot be silently discarded.
export const RESTORE_MAX_BYTES=64*1024*1024;
export const BACKUP_LIMIT_LABEL='64 MiB';
// 聲音探索每天抽籤的曲目版本（sound-game.js 的 CURRENT_CATALOG_VERSION 與 validSoundDaily 接受的值）。
// 新增版本時兩邊要一起改；tool/test-backup-sound-roundtrip.mjs 會檢查一致，並做「匯出後立刻還原」（GitHub #4）。
export const SOUND_CATALOG_VERSIONS=Object.freeze([1,2,3]);
export const BACKUP_LEGACY_PHOTO_LIMIT_LABEL=t('3,200 萬像素');
const NEW_PHOTO_PIXELS=16_000_000;
const LEGACY_PHOTO_PIXELS=32_000_000;
const PHOTO_EDGE_LIMIT=8192;
export const backupSizeExceeded=(source,bytes)=>source.length>RESTORE_MAX_BYTES||
 (bytes??new TextEncoder().encode(source).length)>RESTORE_MAX_BYTES;
// backupFailure 標記取代原本「訊息以『備份』開頭」的判斷，英文訊息也能正確辨識（2026-11-14 多語言）。
const fail=message=>{throw Object.assign(Error(message),{backupFailure:true})};
const bad=path=>fail(t('備份內容無法安全還原：{path}。原資料未更動。',{path}));
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,p)=>{if(typeof v!=='string'||v.length>200000)bad(p+t(' 文字格式不符'));};
const bool=(v,p)=>{if(typeof v!=='boolean')bad(p+t(' 必須是是／否'));};
const number=(v,p)=>{if(typeof v!=='number'||!Number.isFinite(v))bad(p+t(' 數字格式不符'));};
const integer=(v,p)=>{number(v,p);if(!Number.isSafeInteger(v)||v<0)bad(p+t(' 整數格式不符'));};
const enumeration=(...values)=>(v,p)=>{if(!values.includes(v))bad(p+t(' 不支援的值或版本'));};
const nullable=fn=>(v,p)=>{if(v!==null)fn(v,p);};
const array=(fn,max=50000)=>(v,p)=>{if(!Array.isArray(v)||v.length>max)bad(p+t(' 清單格式或數量不符'));v.forEach((r,i)=>fn(r,p+'['+i+']'));};
const date=(v,p)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)bad(p+t(' 日期無效'));};
const stamp=(v,p)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v.replace(/Z$/,v.includes('.')?'Z':'.000Z'))bad(p+t(' 時間無效'));};
const optionalDate=(v,p)=>{if(v!=='')date(v,p);};
const time=(v,p)=>{if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))bad(p+t(' 時間無效'));};
const strings=keys=>Object.fromEntries(keys.split(' ').filter(Boolean).map(k=>[k,text]));
const shape=(fields,required=[]) => (value,path)=>{
 if(!object(value))bad(path+t(' 不是資料物件'));
 for(const key of Object.keys(value)){if(!Object.hasOwn(fields,key))bad(path+'.'+key+t(' 是尚未支援的欄位'));if(value[key]===undefined&&!required.includes(key))continue;fields[key](value[key],path+'.'+key);}
 for(const key of required)if(!Object.hasOwn(value,key))bad(path+'.'+key+t(' 缺少必要欄位'));
};
const dict=(keyCheck,valueCheck)=>(v,p)=>{if(!object(v))bad(p);for(const [k,x] of Object.entries(v)){keyCheck(k,p);valueCheck(x,p+'.'+k);}};
// 照護花已於 2026-11-14 移除；舊資料與舊備份的花型設定仍照原規則接受與還原（不再顯示或寫入新值）。
const LEGACY_FLOWER_STYLE_IDS=['classic','camellia','sakura','star','oxalis','peony','lotus','ginkgo'];
const careFlowerStyles=dict(date,enumeration(...LEGACY_FLOWER_STYLE_IDS));
const unique=(rows,p,key='id')=>{const values=rows.map(r=>r[key]);if(values.some(v=>typeof v!=='string'||!v.trim())||new Set(values).size!==values.length)bad(p+t(' 識別碼空白或重複'));};
const actor=shape(strings('id name'),['id','name']);
const metadata={...strings('id source ownership status'),catId:nullable(text),demo:bool,confirmed:bool,draft:bool,deleted:bool,isDeleted:bool,deletedAt:nullable(stamp),createdAt:stamp,editedAt:stamp,createdBy:actor,editedBy:actor,handover:shape({from:actor,to:actor,at:stamp},['from','to','at'])};
const validImageDimensions=(width,height,maxPixels)=>Number.isInteger(width)&&Number.isInteger(height)&&
 width>0&&height>0&&width<=PHOTO_EDGE_LIMIT&&height<=PHOTO_EDGE_LIMIT&&width*height<=maxPixels;

function imagePixels(value,path,maxPixels){
 if(typeof value!=='string'||value.length>8*1024*1024+64)bad(path+t(' 過大'));
 const match=/^data:image\/(jpeg|png|webp);base64,/.exec(value),encoded=match?value.slice(match[0].length):'';
 // Avoid repeated capture groups: large valid base64 can exhaust a regexp VM's stack.
 if(!match||!encoded||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))bad(path+t(' 需為完整內嵌 JPG、PNG 或 WebP，不能是網址'));
 const bytes=atob(encoded);if(bytes.length>6*1024*1024)bad(path+t(' 單張照片超過 6 MB'));
 const signature=match[1]==='jpeg'?bytes.startsWith('\xff\xd8\xff'):match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
 if(!signature)bad(path+t(' 檔案內容與類型不符'));
 const u=i=>bytes.charCodeAt(i),le=(i,n)=>Array.from({length:n},(_,j)=>u(i+j)*2**(j*8)).reduce((a,b)=>a+b,0);let width,height;
 if(match[1]==='png'){if(bytes.slice(12,16)!=='IHDR')bad(path+t(' PNG 標頭損壞'));width=((u(16)*256+u(17))*256+u(18))*256+u(19);height=((u(20)*256+u(21))*256+u(22))*256+u(23);}
 else if(match[1]==='webp'){const kind=bytes.slice(12,16);if(kind==='VP8X'){width=le(24,3)+1;height=le(27,3)+1;}else if(kind==='VP8L'&&u(20)===47){width=1+((u(22)&63)<<8)+u(21);height=1+((u(24)&15)<<10)+(u(23)<<2)+(u(22)>>6);}else if(kind==='VP8 '&&bytes.slice(23,26)==='\x9d\x01\x2a'){width=le(26,2)&16383;height=le(28,2)&16383;}}
 else {let i=2;while(i+4<bytes.length){if(u(i++)!==255)break;while(u(i)===255)i++;const marker=u(i++);if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;const length=u(i)*256+u(i+1);if(length<2||i+length>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=u(i+3)*256+u(i+4);width=u(i+5)*256+u(i+6);break;}i+=length;}}
 if(!validImageDimensions(width,height,maxPixels))bad(path+t(' 尺寸過大或影像標頭無效'));
 return width*height;
}
export function inlineImage(value,path=t('照片')){
 imagePixels(value,path,NEW_PHOTO_PIXELS);
 return value;
}
// The old food editor accepted images over the current selection limit.
// Keep a bounded compatibility path for the original bytes in a backup.
const backupImage=(value,path=t('照片'))=>imagePixels(value,path,LEGACY_PHOTO_PIXELS);
export function backupPhotoCompatibility(photos){
 let legacyPhotos=0,unsupportedPhotos=0;
 const results=new Map();
 for(const photo of photos){
  if(!results.has(photo)){
   let pixels;
   try{pixels=backupImage(photo);}catch{/* The archive still retains the original value. */}
   results.set(photo,pixels);
  }
  const pixels=results.get(photo);
  if(pixels===undefined)unsupportedPhotos++;
  else if(pixels>NEW_PHOTO_PIXELS)legacyPhotos++;
 }
 return {legacyPhotos,unsupportedPhotos};
}
const nutrient=shape(strings('name value unit bound basis'),['name','value','unit','bound','basis']);
const ocrField=shape(strings('key source sourceKind value unit basis bound'),['key','source','value']);
const ocrPending=shape(strings('key label rawValue unit basis bound reason'),['key','label','rawValue','reason']);
const food=shape({...metadata,...strings('id familyId brand name flavor kind netWeight ingredients source confirmed foodCategory pendingFoodCardId'),version:integer,photos:array(backupImage,4),nutrients:array(nutrient,100),archived:shape({batchId:text,at:stamp},['batchId','at']),ocrReview:shape({mode:enumeration('photo','sample','cloud'),prototype:bool,executedOCR:bool,confirmation:text,fields:array(ocrField,2000),pendingFields:array(ocrPending,2000)},['mode','prototype','executedOCR','fields'])},['id','familyId','version','brand','name','flavor','kind','netWeight','ingredients','source','confirmed','photos','nutrients']);
const partFields={...strings('id foodId quickName quickCategory unit date time note entrySource eatenBeforeNoEating'),provided:nullable(text),eaten:nullable(text),change:bool,noEatingConfirmed:bool};
// Older meal editors left an own `parts: undefined` in IndexedDB. JSON
// omits that placeholder. Accept it for the pre-import recovery snapshot,
// while continuing to reject actual nested part arrays in imported JSON.
const part=shape({...partFields,parts:(_value,path)=>bad(path+t(' 不支援巢狀餐次'))},['id','foodId','provided','eaten','unit']);
const feeding=shape({...partFields,parts:array(part,30),removedPartIds:array(text,30)},['id','foodId','date','time','provided','eaten','unit','note','change']);
const session=shape({screen:enumeration('list','scan','review','detail','feed'),selected:text,draft:food,feeding,foodOrigin:enumeration('list','feed','detail'),dirty:bool,confirmed:bool,foodPending:bool,feedPending:bool,feedDirty:bool,moduleOrigin:enumeration('home','feeding','profile','records','interaction'),feedOrigin:shape({screen:enumeration('home','feeding','records','profile','interaction','list','detail','entry'),id:text,parent:enumeration('feeding','records')},['screen'])},['screen','selected','draft','feeding','foodOrigin','dirty','confirmed','foodPending','feedPending','feedDirty']);
const soundRecord=shape({id:text,trackId:text,at:stamp,day:date,reaction:nullable(text),pending:bool,charged:bool},['id','trackId','at','day','reaction']);
const soundLegacy=shape({version:enumeration(1),balance:integer,walletCap:enumeration(3,5),baselineIds:array(text),claimedIds:array(text),days:dict(date,shape({granted:enumeration(true),explorations:integer,rewards:integer},['granted','explorations','rewards']))},['version','balance','walletCap','baselineIds','claimedIds','days']);
const soundGame=shape({legacy:soundLegacy,version:enumeration(1,2),activatedAt:stamp,preferences:dict(text,text),usedIds:array(text),records:array(soundRecord),balance:integer,walletCap:integer,baselineIds:array(text),claimedIds:array(text),days:dict(date,shape({granted:enumeration(true),explorations:integer,rewards:integer},['granted','explorations','rewards']))},['version','activatedAt','preferences','usedIds','records']);
const fish=shape({version:enumeration(1),settings:shape({count:integer,scene:text,speed:text,appearance:text,randomRoutes:bool,unlimited:bool,sizeId:enumeration('small','medium','large'),waterTheme:enumeration('blue','reef','moon','sand'),soundEnabled:bool,volume:(v,p)=>{number(v,p);if(v<0||v>1)bad(p+t(' 音量超出範圍'));},bgSound:text,hitSound:text},['count','scene','speed']),completed:array(integer,6)},['version','settings','completed']);
const intro=shape({version:enumeration(1),demo:enumeration(true),audioPlayed:enumeration(false),microphoneUsed:enumeration(false),observation:text,simulatedMs:integer,endedBy:text,savedAt:stamp},['version','demo','audioPlayed','microphoneUsed','observation','simulatedMs','endedBy','savedAt']);
const prepIds=['appointment','records','meds','reports','carrier','questions'],questionIds=['changes','tests','meds','food','warning','followup'];
const prepSelection=ids=>(value,path)=>{array(enumeration(...ids),ids.length)(value,path);if(new Set(value).size!==value.length)bad(path+t(' 重複選項'));};
const vetPreparation=shape({checked:prepSelection(prepIds),questions:prepSelection(questionIds),note:(value,path)=>{text(value,path);if(value.length>2000)bad(path+t(' 自填問題超過 2000 字'));}},['checked','questions','note']);
const profile=shape({vetPreparation,playLab:(value,path)=>{if(!validPlayLab({playLab:value}))bad(path+t(' 陪玩資料無效'));},careFlowerStyles,careFlowerStart:date,careFlowerFirstStart:date,...strings('id name age ageMonths note breed sex colorId'),birthDate:optionalDate,birthEstimated:bool,species:enumeration(K('貓'),K('狗'),K('其他'),K('未填')),neutered:enumeration(K('已結紮'),K('未結紮'),K('未填')),profileEstablished:bool,photo:(v,p)=>{if(v!=='')backupImage(v,p);},summaryFavorites:array(enumeration('food','water','weight','vomit','stool','mood'),20),mealDrafts:array(shape({key:text,feeding,feedDirty:bool,foodDraft:shape({draft:food,dirty:bool,confirmed:bool},['draft','dirty','confirmed'])},['key','feeding','feedDirty'])),foodDrafts:array(shape({key:text,draft:food,dirty:bool,confirmed:bool,foodOrigin:enumeration('list','detail')},['key','draft','dirty','confirmed','foodOrigin'])),firstFoodDecisions:array(shape({...strings('foodKey foodName entryId status'),feedingDate:date,createdDate:date},['foodKey','foodName','entryId','status','feedingDate','createdDate'])),soundGame,fishPlay:fish,soundIntroDemo:intro},['name','age','note']);
const entryFields={...metadata,...strings('id category text unit source metric mealGroupId observationNote'),amount:nullable(text),date,time,feeding,observationSummaryVersion:enumeration(1),stoolStatus:enumeration('','unknown','normal','soft','diarrhea','blood','abnormal'),stoolEvent:enumeration('','observed'),appetiteStatus:enumeration('','usual','less','more','none'),moodStatus:enumeration('','usual','low','active'),eliminationKind:enumeration('','urine','stool','unknown'),urineStatus:enumeration('','usual','smaller','larger','observed','litter','litterUsual','litterSmaller','litterLarger','unseen','frequent','abnormal','litterAbnormal'),waterAction:enumeration('','observed','refill'),vomitEvent:enumeration('','observed','witnessed','found')};
const entryRequired=['id','date','time','category','text','amount','unit','source'];
const revisionEntry=shape(entryFields,entryRequired);
const entry=shape({...entryFields,mealRevisions:array(shape({at:stamp,rows:array(revisionEntry,30),changes:(value,path)=>array(change)(value,path)},['at','rows']))},entryRequired);
const change=shape({...metadata,...strings('id kind note sourceEntryId firstFoodEntryId sourceType foodFamilyId journeyId oldFoodId newFoodId'),date,uncertain:bool},['id','date','kind','note','uncertain']);
const eventState=shape({assigneeId:nullable(text),snoozedUntil:nullable(stamp),next:optionalDate,enabled:bool});
const care=shape({...metadata,...strings('id kind name note fromVisit medicine confirmedDose dose reminderTime remindTime notificationTime notifyTime time reminder_time remind_time notification_time notify_time'),careSubtype:enumeration('','internal','external','combined'),last:optionalDate,next:optionalDate,enabled:bool,doseConfirmed:bool,lead:number,history:array(date),undatedHistory:array(shape({id:text,dateStatus:enumeration('unknown')},['id','dateStatus'])),assigneeId:nullable(text),snoozedUntil:nullable(stamp),familyEvents:array(shape({id:text,type:text,at:stamp,actor,date,assignee:nullable(actor),before:eventState,after:eventState,reason:text,restores:text},['id','type','at','actor']))},['id','kind','name','last','next','note','enabled','lead','history']);
const householdCareShape=shape({kind:enumeration('bowl','litter'),initial:number,added:number,left:number,unit:enumeration('g'),urineClumps:integer,stoolCount:integer},['kind']);
const householdCare=(value,path)=>{householdCareShape(value,path);if(Object.hasOwn(value,'initial')){if(value.kind!=='bowl'||!['initial','added','left'].every(k=>typeof value[k]==='number'&&Number.isFinite(value[k])&&value[k]>=0&&value[k]<=5000)||value.initial+value.added<=0||value.initial+value.added>5000||value.left>value.initial+value.added||value.unit!=='g')bad(path+t(' 食盆開始量、補入量與剩量不符'));}};
const household=shape({...metadata,id:text,catId:enumeration(null),ownership:enumeration('unconfirmed'),date,time,category:enumeration(K('嘔吐'),K('排泄'),K('其他')),text,householdCare},['id','catId','ownership','date','time','category','text']);
const family=shape({version:enumeration(1),currentMemberId:text,members:array(shape({id:text,name:text,role:enumeration('admin','caregiver','viewer'),joinedAt:stamp,removedAt:stamp},['id','name','role','joinedAt']),500),invites:array(shape({...strings('id code role status memberId'),createdAt:stamp,expiresAt:stamp,usedAt:stamp,cancelledAt:stamp,createdBy:actor},['id','code','role','status','createdAt','expiresAt']))},['version','currentMemberId','members','invites']);
const daily=shape({version:enumeration(1),activatedAt:stamp,seed:text,seenIds:array(text),days:dict(date,shape({catalogVersion:enumeration(...SOUND_CATALOG_VERSIONS),baseIds:array(text,2),bonusId:nullable(text)},['baseIds','bonusId']))},['version','activatedAt','seed','seenIds','days']);
const journey=shape({...metadata,...strings('id catId kind oldFoodId newFoodId question status'),start:date,end:optionalDate,focus:array(enumeration('intake','urine','stool','vomit','mood','weight'),6),createdAt:stamp},['id','catId','kind','start','oldFoodId','newFoodId','question','status','focus','createdAt']);
const optionalSummaryTime=(v,p)=>{if(v!=='')time(v,p);};
const summarySnapshot=shape({id:text,kind:enumeration('record','change','care'),date,time:optionalSummaryTime,text,raw:text},['id','kind','date','time','text','raw']);
const snapshotSummaryModes=['local-rules-v1','phone-ai-v1','cloud-ai-v1'];
const summary=shape({mode:enumeration(...snapshotSummaryModes),catName:text,question:text,sourceSnapshots:array(summarySnapshot),id:text,catId:text,journeyId:text,start:date,end:date,text,sources:array(shape({id:text,kind:enumeration('record','change','care')},['id','kind'])),careBrief:array(text),createdAt:stamp},['id','catId','journeyId','start','end','text','sources','createdAt']);
const scopedFields={cat:profile,foodCards:array(food),entries:array(entry),changes:array(change),careItems:array(care),foodSession:nullable(session)};
const scope=shape(scopedFields,Object.keys(scopedFields));
// 看診紀錄與吃藥療程（2026-11-13，vet-visit-model.js）：根層，用 catId 分毛孩。
const takenDose=(v,p)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(v))bad(p+t(' 吃藥時間格式不符'));};
const outcomeKey=(v,p)=>{takenDose(v,p);date(v.slice(0,10),p);};
const doseOutcome=shape({status:enumeration('unsuccessful','uncertain'),reason:enumeration('','refused','spat-out','partial','other'),note:(v,p)=>{text(v,p);if(v.length>500)bad(p+t(' 用藥備註最多 500 字'));},updatedAt:stamp},['status','reason','note','updatedAt']);
const doseOutcomes=(v,p)=>{if(!object(v)||Object.keys(v).length>500)bad(p+t(' 清單格式或數量不符'));dict(outcomeKey,doseOutcome)(v,p);};
const medShape=shape({...strings('id name dose'),times:array(time,4),start:date,end:date,stoppedAt:date,taken:array(takenDose,500),doseOutcomes},['id','name','times','start','end','taken']);
const med=(v,p)=>{medShape(v,p);if(v.doseOutcomes&&Object.keys(v.doseOutcomes).some(key=>v.taken.includes(key)))bad(p+t(' 同一次用藥有互相衝突的狀態'));};
const vetVisit=shape({...strings('id catId reason notes'),date,nextVisit:optionalDate,meds:array(med,10),createdAt:stamp,deletedAt:stamp,removedFollowUps:array(care,10)},['id','catId','date','meds','createdAt']);
const dataSchema=shape({...scopedFields,lifeDiary:array((entry,path)=>{if(!validateDiaryEntry(entry))bad(path);backupImage(entry.photo,path+'.photo');},50000),multiCat:shape({version:enumeration(1),activeId:text,cats:array(shape({id:text,data:scope,archivedAt:stamp,archiveGeneration:integer},['id']),100),householdEntries:array(household)},['version','activeId','cats','householdEntries']),familySharing:family,soundDaily:daily,careJourneys:array(journey),careAISummaries:array(summary),vetVisits:array(vetVisit,2000)},Object.keys(scopedFields));
export function validateRestoreData(data,validateRuntime){
 dataSchema(data,t('資料'));
 if(!validateDiaryCollection(data))bad('lifeDiary');
 data=repairLegacyMealDrafts(data);
 const cats=data.multiCat?.cats||[{id:'cat-original'}],ids=new Set(cats.map(c=>c.id));
 const scopes=cats.map(c=>({id:c.id,data:c.id==='cat-original'?data:c.data}));
 for(const s of scopes){
  if(!s.data)bad(t('毛孩資料缺漏'));
  if(!s.data.cat.name.trim()||s.data.cat.name.length>40||!validCatAge(s.data.cat))bad(t('毛孩姓名或歲月年齡格式不符'));
  const checkFeeding=row=>{if(!row.feeding)return;const f=row.feeding,missing=v=>v===null||v==='',quantity=v=>typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)&&Number.isFinite(Number(v));if(!missing(f.provided)&&(!quantity(f.provided)||Number(f.provided)<=0)||!missing(f.eaten)&&(!quantity(f.eaten)||!missing(f.provided)&&Number(f.eaten)>Number(f.provided))||!['g',K('公克'),'kg',K('公斤'),'ml',K('毫升'),K('包'),K('罐'),K('顆'),K('片')].includes(f.unit))bad(t('正式餵食紀錄的份量或單位不符，未知份量須保留空白'));if(f.noEatingConfirmed===true&&(missing(f.eaten)||Number(f.eaten)!==0))bad(t('正式紀錄的不進食標記與吃下量不一致'));};
  const groups=new Map();for(const row of s.data.entries){checkFeeding(row);if(row.mealGroupId){const signature=row.date+' '+row.time;if(groups.has(row.mealGroupId)&&groups.get(row.mealGroupId)!==signature)bad(t('同一餐的日期或時間不一致'));groups.set(row.mealGroupId,signature);}for(const revision of row.mealRevisions||[]){if(!row.feeding||!revision.rows.length)bad(t('餐點修訂缺少原餐快照'));unique(revision.rows,t('餐點修訂'));const first=revision.rows[0];for(const prior of revision.rows){checkFeeding(prior);if(!prior.feeding||prior.category!==K('飲食')||Object.hasOwn(prior,'catId')&&prior.catId!==s.id||prior.date!==first.date||prior.time!==first.time||prior.mealGroupId!==first.mealGroupId)bad(t('餐點修訂的毛孩或餐次歸屬不符'));}if(revision.changes){unique(revision.changes,t('餐點修訂的換糧事件'));for(const event of revision.changes){const belongs=revision.rows.some(prior=>event.sourceType==='feeding'&&prior.id===event.sourceEntryId||prior.id===event.firstFoodEntryId);if(!belongs||Object.hasOwn(event,'catId')&&event.catId!==s.id)bad(t('餐點修訂的換糧事件歸屬不符'));}}}}
  for(const item of s.data.careItems)if(!Number.isSafeInteger(item.lead)||item.lead<0||item.lead>36600)bad(t('提醒提前天數不合理'));
  for(const key of ['entries','foodCards','changes','careItems'])unique(s.data[key],s.id+'.'+key);
  for(const rows of [s.data.cat.mealDrafts,s.data.cat.foodDrafts])if(rows)unique(rows,t('草稿'),'key');
  for(const rows of [s.data.entries,s.data.changes,s.data.careItems,s.data.foodCards])for(const row of rows)if(Object.hasOwn(row,'catId')&&row.catId!==s.id)bad(t('紀錄的毛孩歸屬不符'));
  const checkMeal=f=>{for(const p of [f,...(f.parts||[])]){if(p.foodId&&!s.data.foodCards.some(c=>c.id===p.foodId))bad(t('草稿中的食品已不存在'));if(p.id&&!s.data.entries.some(e=>e.id===p.id))bad(t('草稿中的原紀錄已不存在'));}};
  if(s.data.foodSession?.feedPending)checkMeal(s.data.foodSession.feeding);
  for(const d of s.data.cat.mealDrafts||[])checkMeal(d.feeding);
 }
 for(const j of data.careJourneys||[]){if((Date.parse(j.end||new Date().toISOString().slice(0,10))-Date.parse(j.start))/86400000>3660)bad(t('照護觀察期間超過可安全還原的十年範圍'));if(!ids.has(j.catId)||!['food-change','vet'].includes(j.kind)||!['active','completed'].includes(j.status)||j.end&&(j.end<j.start||(Date.parse(j.end)-Date.parse(j.start))/86400000>3660))bad(t('照護觀察格式或期間不支援'));const d=scopes.find(s=>s.id===j.catId).data;for(const id of [j.oldFoodId,j.newFoodId])if(id&&!d.foodCards.some(f=>f.id===id))bad(t('照護觀察的食品已不存在'));}
 for(const s of data.careAISummaries||[])if(!ids.has(s.catId)||(snapshotSummaryModes.includes(s.mode)?s.journeyId!=='':!(data.careJourneys||[]).some(j=>j.id===s.journeyId&&j.catId===s.catId))||s.end<s.start||(Date.parse(s.end)-Date.parse(s.start))/86400000>3660)bad(t('已保存摘要的歸屬或期間不符'));
 for(const s of data.careAISummaries||[]){
  if(snapshotSummaryModes.includes(s.mode)){
   if(!s.catName?.trim()||typeof s.question!=='string'||s.question.length>2000||!s.text.trim()||s.text.length>50000||!Array.isArray(s.sourceSnapshots)||(!s.sourceSnapshots.length&&!s.careBrief?.length)||s.sources.length!==s.sourceSnapshots.length)bad(t('摘要缺少已核對內容或來源快照'));
   const seen=new Set();for(let i=0;i<s.sourceSnapshots.length;i++){const r=s.sourceSnapshots[i],key=r.kind+':'+r.id;if(!r.id.trim()||seen.has(key)||r.date<s.start||r.date>s.end||s.sources[i].id!==r.id||s.sources[i].kind!==r.kind)bad(t('摘要來源快照對照不符'));seen.add(key);let raw;try{raw=JSON.parse(r.raw);}catch{bad(t('摘要原文快照格式不符'));}if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.id!==r.id||raw.date!==r.date||(raw.time||'')!==r.time||Object.hasOwn(raw,'catId')&&raw.catId!==s.catId)bad(t('摘要原文快照識別或毛孩歸屬不符'));}
  }else if(s.sourceSnapshots!==undefined||s.catName!==undefined||s.question!==undefined)bad(t('摘要快照缺少支援的處理模式'));
 }
 if(data.careJourneys)unique(data.careJourneys,t('照護觀察'));if(data.careAISummaries)unique(data.careAISummaries,t('摘要'));
 if(typeof validateRuntime!=='function'||!validateRuntime(data))bad(t('核心資料格式、關聯或版本檢查未通過'));
 return data;
}
// A bounded JSON grammar scan detects duplicate keys before JSON.parse would
// overwrite one. Key validation never inspects the content of ordinary text.
export function parseBoundedJSON(source){
 if(typeof source!=='string'||!source.trim())fail(t('請選擇 JSON 備份檔，或貼上完整 JSON。'));
 if(backupSizeExceeded(source))fail(t('備份超過 {limit}，未讀取或覆蓋任何資料。',{limit:BACKUP_LIMIT_LABEL}));
 let i=0,nodes=0;const ws=()=>{while(/\s/.test(source[i]||'')&&i<source.length)i++;};
 const str=()=>{const start=i++;while(i<source.length){const c=source[i++];if(c==='"')return JSON.parse(source.slice(start,i));if(c==='\\')i++;}throw Error(t('字串未結束'));};
 const scan=(depth,parentKey='')=>{if(depth>48||++nodes>400000)fail(t('備份結構過深或項目過多，未更動資料。'));ws();const c=source[i];if(c==='{'){i++;ws();const keys=new Set();if(source[i]==='}'){i++;return;}while(true){ws();if(source[i]!=='"')throw Error(t('缺少欄位'));const k=str();if(['__proto__','constructor'].includes(k)||(k==='prototype'&&parentKey!=='ocrReview'))fail(t('備份含不安全的欄位名稱，未更動資料。'));if(keys.has(k))fail(t('備份有重複欄位，無法確認哪份內容正確。'));keys.add(k);ws();if(source[i++]!==':')throw Error(t('缺少冒號'));ws();if(k==='prototype'&&source.slice(i,i+4)!=='true')fail(t('備份含不安全的 prototype 欄位，未更動資料。'));scan(depth+1,k);ws();const end=source[i++];if(end==='}')return;if(end!==',')throw Error(t('物件格式錯誤'));}}if(c==='['){i++;ws();if(source[i]===']'){i++;return;}let count=0;while(true){if(++count>50000)fail(t('備份清單過長，未更動資料。'));scan(depth+1);ws();const end=source[i++];if(end===']')return;if(end!==',')throw Error(t('清單格式錯誤'));}}if(c==='"'){str();return;}const token=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(i));if(!token)throw Error(t('值無效'));i+=token[0].length;};
 try{scan(0);ws();if(i!==source.length)throw Error(t('多餘內容'));const parsed=JSON.parse(source);const walk=v=>{if(typeof v==='number'&&!Number.isFinite(v))fail(t('備份含過大的數字。'));if(v&&typeof v==='object')Object.values(v).forEach(walk);};walk(parsed);return parsed;}catch(e){if(e.backupFailure)throw e;fail(t('JSON 檔案不完整或格式錯誤，原資料未更動。'));}
}
const anyJSON=(v,p)=>{if(v!==null&&typeof v!=='object'&&!['string','number','boolean'].includes(typeof v))bad(p);};
const envelope=shape({format:enumeration('inpaw-local-backup'),formatVersion:enumeration(1),exportedAt:stamp,snapshot:shape({schemaVersion:enumeration(2),revision:integer,data:anyJSON},['schemaVersion','data']),sessionOnlyDemoSettings:anyJSON,inventory:shape(Object.fromEntries('familyMembers familyInvites handovers cats entries householdEntries photos inlinePhotos foodOrMealDrafts'.split(' ').map(k=>[k,integer]))),limitations:array(text,100),completeInlinePhotos:bool},['format','formatVersion','exportedAt','snapshot','sessionOnlyDemoSettings','inventory','limitations','completeInlinePhotos']);
export function parseBackup(source,validateRuntime){const value=parseBoundedJSON(source);envelope(value,t('備份'));value.snapshot.data=validateRestoreData(value.snapshot.data,validateRuntime);return value;}
export function restoreInventory(data){
 const cats=(data.multiCat?.cats||[{id:'cat-original'}]).map(c=>({id:c.id,data:c.id==='cat-original'?data:c.data}));
 const inventory={cats:cats.length,names:cats.map(c=>c.data.cat.name),entries:0,foods:0,drafts:0,reminders:0,photos:0,householdEntries:data.multiCat?.householdEntries?.length||0,journeys:data.careJourneys?.length||0,summaries:data.careAISummaries?.length||0};
 for(const {data:d} of cats){inventory.entries+=d.entries.length;inventory.foods+=d.foodCards.length;inventory.reminders+=d.careItems.length;inventory.drafts+=countCareDrafts(d);inventory.photos+=restoreImages(d,false).length;}
 inventory.entries+=(data.lifeDiary||[]).length;
 const archived=(data.multiCat?.cats||[]).filter(c=>typeof c.archivedAt==='string');
 if(archived.length)inventory.archivedCats=archived.length;
 return inventory;
}
export function restoreImages(data,all=true){const sets=all?[data,...(data.multiCat?.cats||[]).filter(c=>c.id!=='cat-original').map(c=>c.data)]:[data];return sets.flatMap(d=>[...(d.cat.photo?[d.cat.photo]:[]),...d.foodCards.flatMap(f=>f.photos),...(d.foodSession?.draft.photos||[]),...(d.cat.foodDrafts||[]).flatMap(d=>d.draft.photos),...(d.cat.mealDrafts||[]).flatMap(d=>d.foodDraft?.draft.photos||[])]).concat((data.lifeDiary||[]).map(entry=>entry.photo));}
export async function decodeRestoreImages(data){
 for(const source of new Set(restoreImages(data))){
  backupImage(source);
  await new Promise((resolve,reject)=>{
   const image=new Image();
   let finished=false;
   const finish=message=>{
    if(finished)return;
    finished=true;
    clearTimeout(timer);
    image.onload=null;
    image.onerror=null;
    image.removeAttribute?.('src');
    if(message)reject(Error(message));else resolve();
   };
   const timer=setTimeout(()=>finish(t('照片讀取逾時，未更動原資料。')),10000);
   const badDecode=()=>finish(t('備份有損壞的照片，未更動原資料。'));
   image.onload=async()=>{
    if(!validImageDimensions(image.naturalWidth,image.naturalHeight,LEGACY_PHOTO_PIXELS)){
     finish(t('照片尺寸無法安全讀取，未更動原資料。'));
     return;
    }
    try{await image.decode?.();finish();}catch{badDecode();}
   };
   image.onerror=badDecode;
   image.src=source;
  });
 }
}
