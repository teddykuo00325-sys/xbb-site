// Rule-based first pass for voice/text quick notes: no AI, no network.
// It only proposes a cat and one of the eight kinds for each sentence so the owner starts from cards that are
// mostly right instead of blank ones. Everything stays an editable draft; nothing is saved from here.
//
// Doubt is split in two on purpose:
// - cat doubt (「另一隻」, or 「兩隻」 with three or more cats): the card may belong to another cat, so saving
//   waits until the owner taps 「這樣對」 or picks a cat. No name at all just uses the selected cat;
//   「兩隻都／大家／都…」 gives every cat its own card.
// - guess doubt (sound-alike name, kind, time, negation, numbers): marked 「已猜」 but does not block saving.

const KIND_RULES=Object.freeze([
 ['vomit',/吐|嘔/],
 ['weight',/體重|公斤|kg|KG/],
 ['elimination',/便便|大便|小便|軟便|便秘|拉肚子|腹瀉|屎|尿|清砂|貓砂/],
 ['water',/喝|飲水|水碗|飲水機|補水/],
 ['appetite',/食慾|胃口|不想吃|不吃|吃很少|吃得少|沒吃完|吃不完/],
 ['mood',/精神|活力|無精打采|沒力|很懶|心情/],
 ['food',/吃|餵|罐|飼料|乾糧|飯|零食|凍乾|肉泥|點心/]
]);
const KIND_NAMES=Object.freeze({food:'餵食',water:'喝水',elimination:'排泄',weight:'體重',vomit:'嘔吐',appetite:'食慾',mood:'精神',other:'其他'});
export const kindName=kind=>KIND_NAMES[kind]||'其他';

const NEGATION=/沒有|沒|未曾|不曾|不會|不再|並沒|未/;
const HEDGE=/好像|可能|大概|似乎|應該|不確定|不知道有沒有/;
const WEIGHT_CHANGE=/胖了|瘦了|增加|減少|重了|輕了|變重|變輕/;
const ANOTHER=/另一隻|另外一隻|另隻/;
const ALL_SURE=/大家|全部|雙雙|他們|牠們|她們|每隻|每一隻/;
const VAGUE_TIME=/剛剛|剛才|分鐘前|小時前|等一下|之前|前陣子|最近|早些/;
const CJK_NUMBER=/[零一二兩三四五六七八九十百千半]+\s*(?:次|罐|包|顆|片|公斤|毫升|碗|匙|杯)/;
const COUNTED_KINDS=['water','weight','vomit'];

// ── 常見語音錯字對照表（Ian 2026-11-13）──────────────────────
// 語音辨識常把照護用詞聽成同音字。分卡「判斷」前先換回正確的字；原文一個字都不改（卡片內容仍是你說的話）。
// 有換過的卡標「已猜」並寫出換了什麼。只收「換錯也不太會傷人」的組合，並用前後文擋住常見正常用法。
// 來源：A（11/12 A33 實測聽錯）、G（常見同音字推測，尚無實測）。新錯字直接加一列＋測試。
// [錯字規則, 換成（給規則判斷用）, 顯示的正確字]
const ASR_FIXES=Object.freeze([
 [/軟[面變辯遍麵]/g,'軟便','軟便'],                                  // A：軟便→軟面／軟變
 [/(?<=[一兩二三四五六七八九十\d]\s*次\s*)[變遍辨辯](?![胖瘦重輕化成得少多了])/g,'便便','便'], // A：有一次便→一次變（只在「幾次」後面）
 [/[錢前甘][飼四似事]料/g,'乾飼料','乾飼料'],                          // A：乾飼料→錢飼料／前飼料／前四料
 [/[四似事]料/g,'飼料','飼料'],                                       // G
 [/[管灌]頭/g,'罐頭','罐頭'],                                         // G
 [/[歐偶]吐/g,'嘔吐','嘔吐'],                                         // G
 [/[毛貓][沙紗]/g,'貓砂','貓砂'],                                     // G
 [/河水/g,'喝水','喝水'],                                             // G
 [/[題提]重/g,'體重','體重'],                                         // G
 [/(?<=\d\s*)(?:工[斤金今巾]|公[金今巾])/g,'公斤','公斤'],          // G：只在數字後面
 [/引水機|飲水雞/g,'飲水機','飲水機'],                                // G
 [/精申/g,'精神','精神'],                                             // G（內建例句就是這個錯字）
 [/食欲|食域|時欲/g,'食慾','食慾'],                                   // G
 [/拉[度杜]子/g,'拉肚子','拉肚子'],                                   // G
 [/便密|變秘/g,'便秘','便秘'],                                        // G
 [/[洞動]乾/g,'凍乾','凍乾'],                                         // G
 [/肉[你尼]/g,'肉泥','肉泥']                                          // G
]);
// 回傳 {text：給規則判斷用的文字, fixes：[{from, to}]}。不在對照表的字不動。
export function fixAsrWords(text){
 let out=String(text||'');const fixes=[];
 for(const [pattern,replacement,label] of ASR_FIXES){
  // 換成的字是固定字串（不用 $1）；前後文條件一律寫成 lookbehind／lookahead，只換聽錯的那幾個字。
  out=out.replace(pattern,from=>{if(replacement!==from)fixes.push({from,to:label});return replacement;});
 }
 return {text:out,fixes};
}
export const fixReasons=fixes=>fixes.length?[`可能是語音聽錯，當成${fixes.map(f=>`「${f.to}」（原文「${f.from}」）`).join('、')}`]:[];

// Returns the draft fields this sentence supports plus `reasons` for guesses. Numbers are taken only when
// written as digits with a unit. Negated or hedged event words become a plain note (kind 其他).
// 判斷用錯字修正後的文字（fixAsrWords），卡片內容仍保留原文。
export function classifyVoiceSentence(original){
 const {text,fixes}=fixAsrWords(original);
 const found=KIND_RULES.find(([,pattern])=>pattern.test(text));
 const kind=found?found[0]:'other';
 const result={kind,amount:'',unit:'',eliminationKind:'unknown',reasons:fixReasons(fixes)};
 const event=['vomit','elimination','water','food','weight'].includes(kind);
 if(event&&(NEGATION.test(text)||HEDGE.test(text))){
  result.kind='other';
  result.reasons.push('有「沒／不／好像」這類說法，先存成「其他」，保留你說的話');
  return result;
 }
 if(kind==='weight'&&WEIGHT_CHANGE.test(text)){
  result.kind='other';
  result.reasons.push('是胖了或瘦了多少，不是體重，先存成「其他」');
  return result;
 }
 if(kind==='weight'){
  const m=text.match(/(\d+(?:\.\d+)?)\s*(?:公斤|kg|KG)/);
  // Weight needs an explicit number; without one keep the words as a plain note.
  if(m)Object.assign(result,{amount:m[1],unit:'公斤'});
  else{result.kind='other';result.reasons.push('沒有看到「幾公斤」，先存成「其他」');}
 }else if(kind==='water'){
  const m=text.match(/(\d+(?:\.\d+)?)\s*(?:ml|ML|mL|毫升|cc|CC|c\.c\.)/);
  if(m)Object.assign(result,{amount:m[1],unit:'ml'});
 }else if(kind==='vomit'){
  const m=text.match(/(\d+)\s*次/);
  if(m&&Number(m[1])>=1)Object.assign(result,{amount:m[1],unit:'次'});
 }else if(kind==='elimination'){
  const stool=/便便|大便|軟便|便秘|拉肚子|腹瀉|屎/.test(text),urine=/尿|小便/.test(text);
  result.eliminationKind=stool&&urine?'unknown':stool?'stool':urine?'urine':'unknown';
 }
 if(COUNTED_KINDS.includes(result.kind)&&CJK_NUMBER.test(text))result.reasons.push('數字是中文，沒有帶入數量');
 if(!found)result.reasons.push('沒有判斷出類別');
 return result;
}

// 一句沒說名字、卻在講「每一隻」時，分給每隻毛孩各一張（Ian 2026-11-12）。
// 'sure'：大家／全部／雙雙／他們／每隻，或兩隻貓的家說「兩隻」；'guess'：只有「都」（可能是「都沒有」的語氣），標已猜。
export function allCatsWord(text,catCount){
 if(catCount<2||ANOTHER.test(text))return '';
 if(ALL_SURE.test(text))return 'sure';
 if(/兩隻/.test(text))return catCount===2?'sure':'';
 return /都/.test(text)?'guess':'';
}
// Cat-side doubt that blocks saving: only when a sentence without names points at a cat we cannot tell.
// No name at all is NOT doubt (Ian 2026-11-12): the card goes to the cat picked in 「這次照顧」, shown on the card.
export function catReasons(text,{catCount,named=false}){
 if(named||catCount<2)return [];
 if(ANOTHER.test(text))return ['說「另一隻」，不知道是哪隻'];
 if(/兩隻/.test(text)&&catCount>2)return ['說「兩隻」，不知道是哪兩隻'];
 return [];
}
// Cat-side guess that does not block: a name heard as sound-alike characters (麻糬→麻薯), or a bare 「都」.
export const catGuesses=(fuzzy,allGuess=false)=>[...(fuzzy?[`名字聽起來像「${fuzzy}」`]:[]),...(allGuess?['說「都」，先分給每一隻，不對的請刪除']:[])];

const DAY_PARTS=Object.freeze([[/凌晨|半夜/,'03:00','凌晨'],[/早上|早晨|一早|清晨/,'08:00','早上'],[/上午/,'09:00','上午'],[/中午/,'12:00','中午'],[/下午/,'15:00','下午'],[/晚上|昨晚|今晚|晚間/,'19:00','晚上']]);
const PERIOD_WORD=/上午|下午|晚上|晚間|昨晚|今晚|凌晨|半夜|早上|早晨|一早|清晨|中午/;
const pad=n=>String(n).padStart(2,'0');
function shiftDate(date,days){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return date;
 const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
// Simple, explicit time words only: 昨天/前天, 早上/中午/晚上…, "7點". The record date/time is the fallback.
// `flags` lists time words it could not place; those make the card 「已猜」.
export function resolveWhen(text,baseDate,baseTime){
 const flags=[];
 let days=0;
 const yesterday=/昨天|昨晚|昨日/.test(text),today=/今天|今早|今晚|今日/.test(text);
 if(/前天/.test(text))days=-2;else if(yesterday)days=-1;
 if(yesterday&&today)flags.push('一句同時有昨天和今天，日期可能不對');
 let time='',note='';
 const clock=text.match(/(\d{1,2})\s*點\s*(半|(\d{1,2})\s*分?)?/);
 if(clock){
  let hour=Number(clock[1]);const minute=clock[2]==='半'?30:Number(clock[3]||0);
  if(/下午|晚上|晚間|昨晚|今晚/.test(text)&&hour<12)hour+=12;
  if(!PERIOD_WORD.test(text)&&hour>=1&&hour<=6)flags.push('沒說上午還是下午，時間沒有換算');
  else if(hour<=23&&minute<=59){time=`${pad(hour)}:${pad(minute)}`;note=`時間依「${clock[0].trim()}」設為 ${time}`;}
 }else if(/[一二兩三四五六七八九十]+\s*點/.test(text)){
  flags.push('時間是中文數字，沒有換算');
 }
 if(!time){
  const part=DAY_PARTS.find(([pattern])=>pattern.test(text));
  if(part){time=part[1];note=`時間依「${part[2]}」先設為 ${time}`;}
 }
 const date=days?shiftDate(baseDate,days):baseDate;
 if(days&&!note)note=`日期依「${days===-1?'昨天':'前天'}」設為 ${date}`;
 else if(days)note=`日期依「${days===-1?'昨天':'前天'}」設為 ${date}，${note}`;
 return {date,time:time||baseTime,note,flags};
}
// 不存出未來時間（Ian 2026-11-14）：早上 08:29 說「下午精神很好」，猜出的 15:00 還沒到。
// 猜出的日期時間晚於現在時，改用現在，卡片標「時間待確認」讓人自己改；`now` 沒給就不檢查。
export const FUTURE_TIME_REASON='說的時間還沒到，先改成現在時間，請確認';
export function clampFutureWhen(when,now){
 if(!now||!now.date||!now.time||!when.date||!when.time)return when;
 if(`${when.date} ${when.time}`<=`${now.date} ${now.time}`)return when;
 const guessed=when.date===now.date?when.time:`${when.date} ${when.time}`;
 return {...when,date:now.date,time:now.time,future:true,noteBefore:when.note,
  note:`${when.note?when.note.replace(/[，。]?$/,'')+'，但 ':''}${guessed} 還沒到，先改成現在 ${now.time}，時間待確認`,
  flags:[...when.flags,FUTURE_TIME_REASON]};
}
// Reasons about time words rules cannot place.
export function timeReasons(text,when){
 const reasons=[...when.flags];
 if(VAGUE_TIME.test(text))reasons.push('時間說法不明確，日期時間沒有換算');
 return reasons;
}

// Reasons shown on a card = whichever kinds of doubt still apply to the current choices.
function applyDoubt(draft){
 if(draft.confirmed)return {...draft,uncertain:[],catUnsure:false};
 const sameCat=draft.catId===draft.guess.catId,sameKind=draft.kind===draft.guess.kind;
 const cat=sameCat?draft.catReasons0:[],catGuess=sameCat?(draft.catGuesses0||[]):[],kind=sameKind?draft.kindReasons0:[];
 return {...draft,catUnsure:cat.length>0,uncertain:[...cat,...catGuess,...kind,...draft.timeReasons0]};
}
// Apply an edit. Picking a different cat or kind settles that doubt; changing it back brings the doubt back,
// and only an explicit confirm ({confirmed:true}) clears it for good.
export function settleDraft(draft,patch={}){
 const next={...draft,...patch};
 // 自己改過日期或時間，就不再標「時間待確認」。
 if(draft.timeFuture&&(Object.hasOwn(patch,'date')||Object.hasOwn(patch,'time'))){next.timeFuture=false;next.timeNote=draft.timeNoteBefore||'';next.timeReasons0=(draft.timeReasons0||[]).filter(r=>r!==FUTURE_TIME_REASON);}
 return next.guess?applyDoubt(next):next;
}

export const uncertainCount=rows=>rows.filter(row=>row.uncertain?.length>0).length;
export const blockingCount=rows=>rows.filter(row=>row.catUnsure).length;
export const guessedCount=rows=>rows.filter(row=>row.uncertain?.length>0&&!row.catUnsure).length;

// ── 貓名比對 ──────────────────────────────────────────────
// 名字比對忽略括號裡的註記（「麻糬（示範）」只要說「麻糬」）。語音辨識常把同音字寫成別的字（麻糬→麻薯），
// 所以名字只差同音字時也算「像」，卡片標「已猜」（不擋儲存，存了還能改）。
const NAME_DECOR=/[（(【\[][^）)】\]]*[）)】\]]/g;
export const baseName=name=>String(name||'').replace(NAME_DECOR,'').replace(/\s+/g,'').trim();
const SOUND_ALIKE=Object.freeze(['糬薯署暑鼠','芝之知枝汁','麻嘛','咪米迷','橘菊局','豆逗痘','球求','花華','寶保','貝背輩','虎戶','熊雄','奶乃','糖唐','蛋但','仔子']);
const alike=(a,b)=>a===b||SOUND_ALIKE.some(set=>set.includes(a)&&set.includes(b));
// 回傳 'exact'、'fuzzy' 或 ''。fuzzy：每個不同的字都是同音字，且至少有一個字完全相同。
function matchName(text,base){
 if(text.includes(base))return 'exact';
 if(base.length<2)return '';
 for(let i=0;i+base.length<=text.length;i++){
  let same=0,diff=0,ok=true;
  for(let j=0;j<base.length;j++){
   const a=text[i+j],b=base[j];
   if(a===b)same++;else if(alike(a,b))diff++;else{ok=false;break;}
  }
  if(ok&&same>=1&&diff>=1)return 'fuzzy';
 }
 return '';
}
function catHits(text,named){
 const hits=[];
 for(const cat of named){
  const how=text.includes(cat.name)?'exact':matchName(text,cat.base);
  if(how)hits.push({...cat,fuzzy:how==='fuzzy'});
 }
 return hits;
}
const dropContained=hits=>hits.filter(cat=>!hits.some(other=>other!==cat&&other.base.length>cat.base.length&&other.base.includes(cat.base)));

// ── 一句話拆成多張卡 ──────────────────────────────────────
// splitVoiceText 只在句號等處切，逗號不切（數量和食物子句要留在一起）。語音常常整段只有逗號，
// 所以這裡再依「項目」和「貓名」把子句分組：項目換了（吃飯→排泄→喝水）或換了一隻貓，就另開一張卡；
// 沒有項目的子句（「30 克」「很開心」「但是只吃一點」）留在前一張，不會被拆出去。原文逐字保留，不增刪。
const CONTINUE=/^\s*(但是?|可是|不過|因為|所以|而且|只是|只有)/;
const COMPATIBLE=[['food','appetite']];
const sameKindFamily=(a,b)=>a===b||COMPATIBLE.some(group=>group.includes(a)&&group.includes(b));
const sameSet=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
const MAX_ROWS=24;
export function splitVoiceClauses(rows,named=[]){
 const out=[];
 rows.forEach((row,index)=>{
  const clauses=row.text.match(/[^，,、]+[，,、]*|[，,、]+/g)||[row.text];
  if(clauses.length<2){out.push(row);return;}
  const groups=[];let cur=null;
  for(const clause of clauses){
   const fixed=fixAsrWords(clause).text,found=KIND_RULES.find(([,pattern])=>pattern.test(fixed)),kind=found?found[0]:'';
   const cats=dropContained(catHits(clause,named)).map(cat=>cat.id);
   const startsNew=cur&&!CONTINUE.test(clause)&&((cats.length>0&&(cur.cats.length>0||cur.kind)&&!sameSet(cats,cur.cats))||(kind&&cur.kind&&!sameKindFamily(kind,cur.kind)));
   if(!cur)cur={text:clause,kind,cats};
   else if(startsNew){groups.push(cur);cur={text:clause,kind,cats};}
   else{cur.text+=clause;if(!cur.kind&&kind)cur.kind=kind;if(!cur.cats.length&&cats.length)cur.cats=cats;}
  }
  groups.push(cur);
  const room=MAX_ROWS-out.length-(rows.length-index-1);
  if(groups.length<2||groups.length>room){out.push(row);return;}
  for(const [i,group] of groups.entries())out.push({...row,sourceSentenceKey:(row.sourceSentenceKey||row.key)+':clause-'+i,raw:group.text,text:group.text});
 });
 return out;
}

/**
 * rows: drafts from splitVoiceText (one per sentence). cats: [{id, profile:{name}}].
 * - one name in a sentence -> that cat; later sentences without a name stay with the last named cat
 * - several names in one sentence -> one card per cat (flagged `shared`)
 * - no name but 「兩隻／大家／全部／都…」 -> one card per cat (flagged `shared`; a bare 「都」 is marked 已猜)
 * - no name at all -> the cat currently selected (`owner`) (flagged `assumed`)
 */
export function suggestVoiceDrafts(rows,cats,{owner='',date='',time='',now=null}={}){
 const named=cats.map(cat=>({id:cat.id,name:String(cat.profile?.name||'').trim(),base:baseName(cat.profile?.name)})).filter(cat=>cat.name&&cat.base);
 const only=cats.length===1?cats[0].id:'';
 let last=only,serial=0;
 const out=[];
 for(const row of splitVoiceClauses(rows,named)){
  const text=row.text;
  const hits=catHits(text,named);
  // "小白" inside "小白白" must not count as a second cat.
  const ids=dropContained(hits).map(cat=>cat.id);
  let targets,assumed=false,all='';
  if(only)targets=[only];
  else if(ids.length)targets=ids;
  else if((all=allCatsWord(text,cats.length))&&out.length+cats.length<=MAX_ROWS)targets=cats.map(cat=>cat.id);
  else{all='';targets=[last||owner||''];assumed=!last;}
  if(ids.length===1)last=ids[0];
  const {reasons,...fields}=classifyVoiceSentence(text);
  const when=clampFutureWhen(resolveWhen(text,date,time),now);
  for(const catId of targets){
   const flags={shared:targets.length>1,assumed:assumed&&!only,inherited:!ids.length&&!all&&!!last&&!only};
   const draft={...row,sourceSentenceKey:row.sourceSentenceKey||row.key,key:`draft-${serial++}`,catId,date:when.date,time:when.time,timeNote:when.note,...(when.future?{timeFuture:true,timeNoteBefore:when.noteBefore||''}:{}),...fields,suggested:true,...flags,
    confirmed:false,guess:{catId,kind:fields.kind},
    catReasons0:catReasons(text,{catCount:cats.length,named:ids.length>0||!!all}),
    catGuesses0:catGuesses(hits.find(hit=>hit.id===catId&&hit.fuzzy)?.base||'',all==='guess'),
    kindReasons0:reasons,timeReasons0:timeReasons(text,when)};
   out.push(applyDoubt(draft));
  }
 }
 return out;
}
