// 陪玩「請 AI 設計玩法」：只負責組出送出的文字，以及把線上回傳的文字變成通過驗證的玩法。
// 這個檔案不連網、不碰原生橋接；送出與等待在 play-lab.js。
// 線上回來的只是 JSON 文字，絕不執行；一律走 validatePlan 的白名單，來源由 App 強制標成 'ai'。
import {OBSERVATIONS,validatePlan,applyPlaySpeedLimit,personalityOf,PERSONALITY_IDS,bestStage,stageNameParts} from './play-lab-rules.js?v=play-personality1';
import {t,K,withLocaleMarker} from './assets/i18n.js?v=audit1117b';

export const PLAY_DESIGN_MODE = 'play-design';
export const PLAY_FREEPLAY_SCHEMA='play-freeplay.v2';
export const PLAY_FREEPLAY_MARKER='[XBB_PLAY_FREEPLAY_V2]';
// 2026-11-16：新版 App 看得懂 personality；worker 只在看到這個標記時才回個性，舊 App 不受影響。
export const PLAY_PERSONALITY_MARKER='[XBB_PLAY_PERSONALITY_V1]';
export const PLAY_DESIGN_LIMITS = Object.freeze({noteMax:500,recentSessions:3,resultMax:12000,requestMax:4000,previousMax:400,favorites:5,sessionNoteMax:120});

const label = id => OBSERVATIONS.find(item=>item.id===id)?.label;
const PLAN_KEYS = ['title','description','reason','hypothesis','durationSeconds','start','states','scene','personality'];
const stageName = state => stageNameParts(state).join('・');
const personalityText = plan => {const item=personalityOf(plan);return item?K(`｜個性：${item.label}`):'';};
const bestText = (plan,stats) => {const best=bestStage(plan,stats);return best?K(`｜最有反應：${stageName(best.state)}（${best.targetTouches} 次）`):'';};

// 送出內容固定只有這幾段：勾選的觀察、飼主補充、最近幾次的反應（含觸碰次數與反應補充）、收藏玩法的動作摘要。
// 不自動附上毛孩檔案的名字、編號、照片、錄音、其他照護紀錄；自填補充會送出，可能含名字，同意畫面會顯示。
const MOTION_LABEL = {still:K('固定'),drift:K('緩游'),dash:K('衝刺'),circle:K('繞圈'),zigzag:K('之字形'),wiggle:K('原地擺動')};
const SPEED_LABEL = {slow:K('慢速'),normal:K('一般'),fast:K('快速')};
// 「依這次反應請 AI 再設計」：只帶上一個玩法的名稱、各階段動作／速度／秒數，不帶文字描述與任何識別資料。
export function summarizePlan(plan) {
  if(!plan||!Array.isArray(plan.states))return '';
  const stages = plan.states.slice(0,12).map(s=>K(`${MOTION_LABEL[s?.target?.motion]||K('未知')}${s?.target?.speed?'・'+SPEED_LABEL[s.target.speed]:''}${s?.target?.visible===false?K('（藏起來）'):''}${Math.round((Number(s?.seconds)||0)*10)/10}秒`)).join('、');
  return K(`${String(plan.title||K('玩法')).slice(0,60)}｜階段：${stages}`).slice(0,PLAY_DESIGN_LIMITS.previousMax);
}

// 2026-11-13 第一包 G2：最近幾次多帶觸碰次數、玩了幾秒與反應補充；另帶最近幾個收藏玩法的動作摘要。
// 名稱一律用玩法本身的名稱（plan.title），不用飼主自己取的收藏名稱（可能寫了毛孩名字）。
const count = value => Number.isSafeInteger(value)&&value>=0?value:0;
const oneLine = (value,max) => String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
function sessionLine(row) {
  const seen = (Array.isArray(row?.feedback)?row.feedback:[]).map(label).filter(Boolean);
  const stats = row?.stats||{},elapsed = Number(row?.elapsed),seconds = Number.isFinite(elapsed)&&elapsed>=0?Math.round(elapsed):0;
  const remark = oneLine(row?.note,PLAY_DESIGN_LIMITS.sessionNoteMax);
  return `${oneLine(row?.plan?.title||K('玩法'),60)}：${seen.length?seen.join('、'):K('沒有記下反應')}`+
    K(`｜玩了 ${seconds} 秒，碰目標 ${count(stats.targetTouches)} 次、碰藏身處 ${count(stats.coverTouches)} 次、碰空白處 ${count(stats.blankTouches)} 次`)+
    personalityText(row?.plan)+bestText(row?.plan,stats)+
    (remark?K(`｜補充：${remark}`):'');
}
function favoriteLine(row) {
  const states = Array.isArray(row?.plan?.states)?row.plan.states:[];
  const motions = [...new Set(states.filter(s=>s?.target?.visible!==false).map(s=>MOTION_LABEL[s?.target?.motion]).filter(Boolean))];
  const hides = states.some(s=>s?.target?.visible===false);
  const speeds=[...new Set(states.map(s=>SPEED_LABEL[s?.target?.speed]).filter(Boolean))];
  const character=personalityOf(row?.plan);
  return K(`${oneLine(row?.plan?.title||K('玩法'),60)}（動作：${motions.join('、')||K('未知')}${speeds.length?K('；速度：')+speeds.join('、'):''}${hides?K('；有躲藏'):''}${character?K('；個性：')+character.label:''}）`);
}

export function buildPlayDesignRequest({observationIds=[],note='',sessions=[],favorites=[],previous=null,presentation={},maxSpeed='normal'}={}) {
  const observed = (Array.isArray(observationIds)?observationIds:[]).map(label).filter(Boolean);
  const extra = String(note||'').trim().slice(0,PLAY_DESIGN_LIMITS.noteMax);
  const recent = (Array.isArray(sessions)?sessions:[]).slice(-PLAY_DESIGN_LIMITS.recentSessions).map(sessionLine);
  const liked = (Array.isArray(favorites)?favorites:[]).slice(-PLAY_DESIGN_LIMITS.favorites).map(favoriteLine);
  const lines = [
    PLAY_FREEPLAY_MARKER,
    PLAY_PERSONALITY_MARKER,
    K('任務：幫一隻貓設計自由陪玩的速度、路線、停留與躲藏節奏；沒有關卡、勝負或過關目標。'),
    K(`本機沿用的顯示與聲音設定：大小 ${['small','medium','large'].includes(presentation.sizeId)?presentation.sizeId:'medium'}；場景 ${['basic','pond','night','garden'].includes(presentation.scene)?presentation.scene:'basic'}；水域 ${['blue','reef','moon','sand'].includes(presentation.waterTheme)?presentation.waterTheme:'blue'}；外觀 ${['gold','sunshine','rose'].includes(presentation.appearance)?presentation.appearance:'gold'}；聲音 ${presentation.soundEnabled===false?K('關閉'):K('開啟')}；音量 ${Number.isFinite(presentation.volume)?Math.max(0,Math.min(1,presentation.volume)):.25}。這些設定由使用者決定，AI 不得更改大小、背景、外觀或聲音。`),
    K(`目前可用速度：${maxSpeed==='fast'?'slow、normal、fast':'slow、normal'}。請只設計游動速度、路線、停留與躲藏節奏。`),
    K(`牠平常怎麼玩（飼主勾選）：${observed.length?observed.join('、'):K('還不清楚，先探索看看')}`),
    K(`飼主補充：${extra||K('無')}`),
    K(`最近的陪玩反應：${recent.length?'\n'+recent.map(line=>'- '+line).join('\n'):K('無')}`),
    K(`收藏過的玩法：${liked.length?'\n'+liked.map(line=>'- '+line).join('\n'):K('無')}`)
  ];
  const before = previous?summarizePlan(previous.plan):'';
  if(before){
    const seen = (Array.isArray(previous.feedback)?previous.feedback:[]).map(label).filter(Boolean);
    const remark = String(previous.feedbackNote||'').trim().slice(0,PLAY_DESIGN_LIMITS.noteMax);
    const stats = previous.stats||{}, elapsed = Number(previous.elapsed);
    // 當次反應優先於較早的歷史，避免接近 4,000 字上限時被尾端截掉。
    const byId = new Map((previous.plan?.states||[]).map(state=>[state.id,state]));
    const stages = (Array.isArray(stats.stages)?stats.stages:[]).filter(row=>byId.has(row?.id)).slice(0,12)
      .map(row=>K(`${stageName(byId.get(row.id))} ${Math.round((Number(row.seconds)||0)*10)/10}秒 碰目標${count(row.targetTouches)}次`)).join('、');
    // 插在「飼主補充」之後、「最近的陪玩反應」之前（前面有兩個標記行）。
    lines.splice(7,0,K(`剛玩過的玩法：${before}${personalityText(previous.plan)}`),K(`這次看到：${seen.length?seen.join('、'):K('沒有記下反應')}`),
      K(`這次補充：${remark||K('無')}`),
      K(`這次試玩：${Number.isFinite(elapsed)&&elapsed>=0?Math.round(elapsed):0} 秒，碰目標 ${count(stats.targetTouches)} 次、碰藏身處 ${count(stats.coverTouches)} 次、碰空白處 ${count(stats.blankTouches)} 次`),
      ...(stages?[K(`這次各段：${stages}`)]:[]),
      K('請依這次反應重新設計，換不同的速度、路線、停留與躲藏節奏，不改使用者背景，不要重複剛玩過的玩法。'));
  }
  // 送出內容維持中文（見 K()）；英文介面時在最外層（自由陪玩標記之前）加語言標記，worker 會先拿掉再判斷玩法標記。
  const marker = withLocaleMarker('');
  const text = withLocaleMarker(lines.join('\n').slice(0,PLAY_DESIGN_LIMITS.requestMax-marker.length));
  return {text,observed,extra,recent,favorites:liked,previous:before};
}

const fail = message => {throw new Error(message);};
const randomId = () => 'ai-'+Array.from(globalThis.crypto?.getRandomValues?.(new Uint8Array(4))||[1,2,3,4].map(()=>Math.floor(Math.random()*256))).map(n=>n.toString(16).padStart(2,'0')).join('');

function extractJson(text) {
  const raw = String(text||'').trim();
  if(!raw)fail(t('進階模式沒有回傳玩法。'));
  if(raw.length>PLAY_DESIGN_LIMITS.resultMax)fail(t('進階模式回傳的內容太長，無法使用。'));
  const unfenced = raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const start = unfenced.indexOf('{'),end = unfenced.lastIndexOf('}');
  if(start<0||end<start)fail(t('進階模式回傳的內容不是玩法格式。'));
  try{return JSON.parse(unfenced.slice(start,end+1));}
  catch{fail(t('進階模式回傳的內容不是玩法格式。'));}
}

// 回傳通過 validatePlan 的玩法；任何不合格都丟錯，呼叫端不得改標成 example 繞過。
export function parsePlayDesign(text,{maxSpeed='normal'}={}) {
  const data = extractJson(text);
  if(data===null||typeof data!=='object'||Array.isArray(data))fail(t('進階模式回傳的內容不是玩法格式。'));
  const extra = Object.keys(data).filter(key=>!PLAN_KEYS.includes(key)&&!['id','version','source','schema'].includes(key));
  if(extra.length)fail(t('進階模式回傳的玩法包含未支援的欄位。'));
  if('schema' in data&&data.schema!==PLAY_FREEPLAY_SCHEMA)fail(t('進階模式回傳的玩法版本無法使用。'));
  const plan = {id:randomId(),version:data.schema===PLAY_FREEPLAY_SCHEMA?2:1,source:'ai'};
  for(const key of PLAN_KEYS)if(key in data)plan[key]=data[key];
  // 個性是加分項：不認得的值直接拿掉，不讓整份玩法失敗。
  if('personality' in plan&&!PERSONALITY_IDS.includes(plan.personality))delete plan.personality;
  validatePlan(plan);
  return applyPlaySpeedLimit(plan,maxSpeed);
}
