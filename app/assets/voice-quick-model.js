import {t, K, isEnglish} from './i18n.js?v=audit1117b';
import {listCareCats,saveCareMeal} from './care-journey-model.js?v=photo-simplify1';
import {requireActivePet,petArchiveGeneration} from './pet-archive.js?v=8f5745b7843b';
import {calendarDay,localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';

// Manual splitting keeps the source verbatim. The Android adapter supplies its
// separately validated suggestions to the same editable draft and review flow.
export const VOICE_KINDS=Object.freeze([['food',t('餵食')],['water',t('喝水')],['elimination',t('排泄')],['weight',t('體重')],['vomit',t('嘔吐')],['appetite',t('食慾')],['mood',t('精神')],['other',t('其他')]]);
const categories={food:K('飲食'),water:K('喝水'),elimination:K('排泄'),weight:K('體重'),vomit:K('嘔吐'),appetite:K('飲食'),mood:K('其他'),other:K('其他')};
const fail=message=>{throw Error(message)};
const clean=v=>typeof v==='string'?v.trim():'';
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const scope=(root,id)=>listCareCats(root).find(cat=>cat.id===id)?.data||fail(t('請重新確認毛孩歸屬。'));
const replace=(root,id,data)=>id==='cat-original'?data:{...root,multiCat:{...root.multiCat,cats:root.multiCat.cats.map(cat=>cat.id===id?{...cat,data}:cat)}};
export function voiceContext(view){return {restoreGeneration:view.restoreGeneration||0,generations:Object.fromEntries((view.data.multiCat?.cats||[{id:'cat-original'}]).map(cat=>[cat.id,petArchiveGeneration(cat)]))};}
export function assertVoiceContext(view,context,ids){
 if(!context||(view.restoreGeneration||0)!==context.restoreGeneration)fail(t('資料已還原，這批舊草稿不能保存或撤銷。請保留文字後重新開啟。'));
 for(const id of new Set(ids)){if(!Object.hasOwn(context.generations,id))fail(t('毛孩清單已變更，請保留文字後重新開啟。'));requireActivePet(view.data,id,context.generations[id]);}
}
export function voiceWarnings(text){
 const warnings=[];
 if(/[0-9零〇一二兩三四五六七八九十百千]/.test(text))warnings.push(t('數字與單位請對照原文；不會自行換算或補值。'));
 if(/沒有|沒|未|不|無|可能|好像|大概|約|不確定/.test(text))warnings.push(t('否定或不確定用語已保留；觀察文字不代表事件次數。'));
 if(/昨天|今天|明天|早上|晚上|剛剛|點|分鐘|小時|上午|下午|\d{1,2}:\d{2}/.test(text))warnings.push(t('語句中的時間不自動換算；請確認每筆日期與時間。'));
 return warnings;
}
export function newVoiceDraft(text='',index=0){return {key:`draft-${index}`,raw:text,text,catId:'',kind:'',date:'',time:'',amount:'',unit:'',eliminationKind:'unknown',status:'',meal:false,foodId:'',provided:'',eaten:'',mealUnit:''};}
export function splitVoiceText(text){
 if(typeof text!=='string'||!text.trim()||text.length>4000)fail(t('請輸入 1–4000 字的原始文字。'));
 // Keep punctuation and whitespace in each source slice. Decimal points and
// commas are not boundaries, so quantities and food clauses stay together.
 const pieces=text.match(/[^。！？；\n]+[。！？；\n]*|[。！？；\n]+/g)||[text];
 const rows=[];let prefix='';
 for(const piece of pieces){if(piece.trim()){rows.push(prefix+piece);prefix='';}else if(rows.length)rows[rows.length-1]+=piece;else prefix+=piece;}
 if(prefix&&rows.length)rows[rows.length-1]+=prefix;
 if(rows.length>24)fail(t('一次最多核對 24 項，請分次輸入；原文仍保留。'));
 return rows.map(newVoiceDraft);
}
export function voiceExample(cats,today){
 const first=cats[0],second=cats[1]||first;if(!first)fail(t('先建立一隻毛孩，再體驗示範。'));
 const a=first.profile.name,b=second.profile.name;
 const specs=[
 ['food',first,K(`${a}今天早上吃飯，餵食量與吃下量未記。`)],
 ['water',first,K(`${a}有喝水，喝入量未記。`)],
 ['elimination',first,K(`${a}有便便，狀態未記。`)],
 ['weight',first,K(`${a}體重 4.2 公斤。`)],
 ['vomit',first,K(`${a}沒有嘔吐。`)],
 ['appetite',second,K(`${b}食慾比平常少。`)],
 ['mood',second,K(`${b}精申跟平常差不多。`)],
 ['other',second,K(`${b}今天剪指甲。`)]
 ];
 const rows=specs.map(([kind,cat,text],index)=>({...newVoiceDraft(text,index),kind,catId:cat.id,date:today,time:'08:00',...(kind==='weight'?{amount:'4.2',unit:K('公斤')}:{})}));
 return {raw:rows.map(row=>row.raw).join('\n'),rows,correction:{index:6,from:K('精申'),to:K('精神')}};
}
// 改過內容時，存進紀錄的文字＝核對後內容＋換行＋前綴＋原文。繁中前綴維持「輸入原文：」（逐字不變）；
// 英文介面存英文前綴。兩種前綴都是資料值（不隨字典改變），比對或顯示時用下面兩個函式同時認兩種。
export const RETAINED_SOURCE_PREFIXES=Object.freeze([K('輸入原文：'),'Original input: ']);
export function retainedVoiceText(draft){return draft.text===draft.raw?draft.raw:K(`${draft.text}\n${RETAINED_SOURCE_PREFIXES[isEnglish()?1:0]}${draft.raw}`);}
const RETAINED_SOURCE_RE=/\n(?:輸入原文：|Original input: )/;
/** 拆回 {text, raw}（認兩種前綴）；不是語音快記改過的文字時 raw 為 null。 */
export function splitRetainedVoiceText(value){const s=String(value??''),m=s.match(RETAINED_SOURCE_RE);return m?{text:s.slice(0,m.index),raw:s.slice(m.index+m[0].length)}:{text:s,raw:null};}
/** 顯示用：把存檔文字裡的原文前綴換成目前介面語言的前綴（只換第一個，其餘原樣）。繁中介面看繁中存檔＝原樣。 */
export function localizeRetainedVoiceText(value){return String(value??'').replace(RETAINED_SOURCE_RE,'\n'+RETAINED_SOURCE_PREFIXES[isEnglish()?1:0]);}
/**
 * 英文介面的拆句（不套中文規則）：在換行，以及後面接空白或結尾的 . ! ? ; 斷句；4.2 這類小數不會斷。
 * 每段保留原文（含標點與空白），全部接起來等於原文。只讓使用者自己選類別，不猜毛孩、類別或數字。
 */
export function splitEnglishVoiceText(text){
 if(typeof text!=='string'||!text.trim()||text.length>4000)fail(t('請輸入 1–4000 字的原始文字。'));
 const pieces=[];let cur='';
 for(let i=0;i<text.length;i++){
  const ch=text[i];cur+=ch;
  if(ch==='\n'||/[.!?;。！？；]/.test(ch)&&(i+1>=text.length||/\s/.test(text[i+1]))){while(i+1<text.length&&/[ \t]/.test(text[i+1]))cur+=text[++i];pieces.push(cur);cur='';}
 }
 if(cur)pieces.push(cur);
 const rows=[];let prefix='';
 for(const piece of pieces){if(piece.trim()){rows.push(prefix+piece);prefix='';}else if(rows.length)rows[rows.length-1]+=piece;else prefix+=piece;}
 if(prefix&&rows.length)rows[rows.length-1]+=prefix;
 if(rows.length>24)fail(t('一次最多核對 24 項，請分次輸入；原文仍保留。'));
 return rows.map(newVoiceDraft);
}
function numberFor(draft){
 const amount=clean(draft.amount),unit=clean(draft.unit);
 if(!amount){if(draft.kind==='weight')fail(t('體重需填明確公斤數；不確定可改選「其他」保留原文。'));if(unit)fail(t('數量留空時，單位也請留空。'));return {amount:'',unit:''};}
 if(!/^\d+(?:\.\d+)?$/.test(amount)||!Number.isFinite(Number(amount)))fail(t('數量請填有限的非負數；不確定請留空。'));
 const units={water:['ml',K('毫升')],weight:[K('公斤')],vomit:[K('次')]};
 if(!units[draft.kind]?.includes(unit))fail(t('這個分類不接受此數量或單位，請核對原文。'));
 if(draft.kind==='weight'&&Number(amount)<=0||draft.kind==='vomit'&&(!/^\d+$/.test(amount)||!Number.isSafeInteger(Number(amount))||Number(amount)<1))fail(t('體重需大於 0；嘔吐次數只能填已確認的正整數。'));
 return {amount,unit};
}
/** Pure append transaction. No food-card creation, automatic changes, draft
 * replacement, user text mutation, or partial writes. Caller owns one CAS save. */
// `clock`（{date,time}，選填）：給了就擋住晚於現在的日期時間（Ian 2026-11-14：不存出未來紀錄）。
export function futureVoiceRow(draft,clock){return !!(clock&&clock.date&&clock.time&&`${draft.date} ${draft.time}`>`${clock.date} ${clock.time}`);}
export function saveVoiceBatch(root,drafts,{id,demo=false,today=localCalendarDate(),now=new Date().toISOString(),clock=null}={}){
 if(typeof id!=='string'||!/^voice-[a-zA-Z0-9_-]+$/.test(id)||!Array.isArray(drafts)||!drafts.length||drafts.length>24)fail(t('沒有可保存的草稿，請重新核對。'));
 if(typeof demo!=='boolean')fail(t('示範來源無效。'));
 let next=root;
 for(const [index,draft] of drafts.entries()){
  if(!draft||!Object.hasOwn(categories,draft.kind))fail(t('第 {v0} 項：請選擇八類中的一類。', {v0: index+1}));
  requireActivePet(next,draft.catId);const data=scope(next,draft.catId),key=`${id}-${index+1}`;
  if((data.entries||[]).some(row=>row.id===key||row.mealGroupId===key))fail(t('這批草稿已保存，請勿重複送出。'));
  if(calendarDay(draft.date)===null||draft.date>today||!time(draft.time))fail(t('第 {v0} 項：請核對今天或以前的日期與有效時間。', {v0: index+1}));
  if(futureVoiceRow(draft,clock))fail(t('第 {v0} 項：{v1}{time} 還沒到，不能存成未來的紀錄。請把時間改成現在（{time2}）或更早。', {v0: index+1, v1: draft.date===clock.date?t('今天 '):draft.date+' ', time: draft.time, time2: clock.time}));
  if(typeof draft.raw!=='string'||draft.raw.length>4000||!clean(draft.text)||draft.text.length>4000)fail(t('請保留原文，並填寫 1–4000 字的核對內容。'));
  const text=retainedVoiceText(draft),source=demo?K('語音快記流程示範・已核對'):
   ['gemma-e2b','gemma-e4b'].includes(draft.localModel)?K(`文字快記・${draft.localModel} 本機整理・已核對`):draft.cloud===true?K('文字快記・進階模式整理・已核對'):K('文字快記・已核對');
  if(draft.kind==='food'&&draft.meal===true){
   if(text.length>1000)fail(t('完整餐次備註最多 1000 字；可取消完整餐次，原文仍能保存為飲食文字。'));
   const before=data.entries;
   next=saveCareMeal(next,{catId:draft.catId,date:draft.date,time:draft.time,note:text,parts:[{foodId:draft.foodId,provided:draft.provided,eaten:draft.eaten,unit:draft.mealUnit}]},{id:key,now});
   const updated=scope(next,draft.catId);
   next=replace(next,draft.catId,{...updated,entries:[...before,...updated.entries.slice(before.length).map(row=>({...row,source,demo}))]});
   continue;
  }
  const numbers=numberFor(draft),row={id:key,catId:draft.catId,date:draft.date,time:draft.time,category:categories[draft.kind],text,...numbers,source,demo,confirmed:true,createdAt:now};
  if(['mood','appetite','food','other'].includes(draft.kind))row.metric=draft.kind;
  if(draft.kind==='elimination'){
   if(!['unknown','urine','stool'].includes(draft.eliminationKind))fail(t('請核對排泄類型。'));
   row.eliminationKind=draft.eliminationKind;
   if(draft.eliminationKind!=='unknown')row.metric=draft.eliminationKind;
  }
  next=replace(next,draft.catId,{...data,entries:[...data.entries,row]});
 }
 return next;
}
export function voiceReceipt(root,id,drafts){
 const ids=[...new Set(drafts.map(row=>row.catId))];
 const rows=ids.flatMap(catId=>scope(root,catId).entries.filter(row=>row.id.startsWith(id+'-')).map(row=>({catId,id:row.id,value:structuredClone(row)})));
 if(rows.length!==drafts.length)fail(t('保存結果需重新核對，請到紀錄查看；不要再次保存。'));
 return {id,rows};
}
/** Selective undo preserves every unrelated edit. An edited, removed, archived,
 * restored or reassigned target makes the whole undo fail without mutations. */
export function undoVoiceBatch(root,receipt){
 if(!receipt?.rows?.length)fail(t('沒有可撤銷的這批紀錄。'));
 for(const item of receipt.rows){requireActivePet(root,item.catId);const found=scope(root,item.catId).entries.find(row=>row.id===item.id);if(!found||JSON.stringify(found)!==JSON.stringify(item.value))fail(t('這批紀錄已有修改或刪除，未撤銷任何項目。請到紀錄逐筆查看。'));}
 let next=root;
 for(const catId of new Set(receipt.rows.map(row=>row.catId))){const data=scope(next,catId),ids=new Set(receipt.rows.filter(row=>row.catId===catId).map(row=>row.id));next=replace(next,catId,{...data,entries:data.entries.filter(row=>!ids.has(row.id))});}
 return next;
}

/** V156 UX prototype only: no provider, credits, recording or network adapter. */
export function simulateCloudQuickText(raw,{confirmed=false,outcome='success'}={}){
 if(!confirmed)fail(t('請先確認本次文字範圍，再開始模擬。'));
 const messages={network:t('模擬沒有網路，未產生整理結果。'),points:t('模擬額度不足，未產生整理結果。'),failure:t('模擬整理失敗，未產生整理結果。')};
 if(Object.hasOwn(messages,outcome))return {ok:false,raw,rows:null,message:t('{v0}原文保留，可改用手動紀錄；沒有傳送，也沒用額度。', {v0: messages[outcome]})};
 if(outcome!=='success')fail(t('請選擇有效的模擬情境。'));
 return {ok:true,raw,rows:splitVoiceText(raw),message:t('進階模式整理流程模擬完成：本次實際僅在此裝置按句拆項，未執行 AI 語意分類、沒有傳送，也沒用額度。毛孩、類別、日期時間與數量均待主人確認。')};
}
