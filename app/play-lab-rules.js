import {t,K} from './assets/i18n.js?v=audit1117b';
// Local, explicitly labelled examples. This module never calls a model or a network.
// Schema version 1 is a finite state graph, not executable model-generated code.
export const OBSERVATIONS = Object.freeze([
  {id:'watch',label:K('會盯著看，但很少拍')},
  {id:'chase',label:K('喜歡追著移動的目標')},
  {id:'ambush',label:K('喜歡等目標出現再拍')},
  {id:'search',label:K('目標消失後還會找')},
  {id:'leave',label:K('玩一下就走開')},
  {id:'unknown',label:K('還不清楚，先探索看看')}
].map(Object.freeze));

// 小魚個性（2026-11-16，Ian 批准）：AI 只選個性，反應動作由本機執行，不改關卡、不改外觀與聲音。
export const PERSONALITIES = Object.freeze([
  {id:'shy',label:K('膽小'),touch:K('被碰到會嚇一跳，快速游開'),idle:K('太久沒人理，會躲到藏身處旁偷看')},
  {id:'curious',label:K('好奇'),touch:K('被碰到會轉一圈，留在附近'),idle:K('太久沒人理，會游向牠最後拍的地方探頭')},
  {id:'teasing',label:K('調皮'),touch:K('被碰到會閃開，又馬上回頭'),idle:K('太久沒人理，會在原地扭來扭去逗牠')},
  {id:'playdead',label:K('愛裝死'),touch:K('被碰到會定住裝死，再突然衝走'),idle:K('太久沒人理，會停住不動，再突然衝出去')}
].map(Object.freeze));
export const PERSONALITY_IDS = Object.freeze(PERSONALITIES.map(item=>item.id));
export const personalityOf = plan => PERSONALITIES.find(item=>item.id===plan?.personality)||null;
const clone = value => JSON.parse(JSON.stringify(value));
const target = (visible,motion='still',anchor='active',kind='fish') => ({visible,motion,anchor,kind});
const covers = (active=false,clue=false) => ({active,clue});
const next = (to,options={}) => ({to,...options});
const state = (id,label,seconds,shape,cover,transitions) => ({id,label,seconds,target:shape,covers:cover,transitions});

const plans = [
  {
    id:'water-hide',title:K('水草捉迷藏'),version:1,source:'example',durationSeconds:60,personality:'shy',
    scene:{theme:'water',fishCount:1,coverCount:8},
    description:K('一隻小魚游過整片池塘，再藏進水草；碰到有水波的草叢，牠就換個地方躲。'),
    reason:K('這個示例用藏身處與線索，探索「目標消失後還會找」的反應。'),
    hypothesis:K('觀察牠會不會跟著小魚，再碰有水波的水草找魚。'),start:'swim',
    states:[
      state('swim',K('小魚游過池塘，看看牠躲去哪裡'),4,target(true,'drift','center'),covers(),{target:next('escape',{advanceCover:true}),idle:next('approach')}),
      state('approach',K('小魚游向水草，跟著牠的藏身路線'),1.2,target(true,'dash'),covers(),{target:next('escape',{advanceCover:true}),idle:next('hide')}),
      state('hide',K('小魚藏起來了，找找水波'),3,target(false),covers(true,true),{cover:next('escape',{activeOnly:true,advanceCover:true}),idle:next('peek')}),
      state('peek',K('小魚探頭，給一點線索'),2,target(true),covers(true,true),{target:next('escape',{advanceCover:true}),cover:next('escape',{activeOnly:true,advanceCover:true}),idle:next('swim',{advanceCover:true})}),
      state('escape',K('找到牠了，小魚游向另一叢水草'),2,target(true,'dash'),covers(),{target:next('swim'),idle:next('swim')})
    ]
  },
  {
    id:'reef-peek',title:K('礁石探頭'),version:1,source:'example',durationSeconds:60,personality:'curious',
    scene:{theme:'reef',fishCount:1,coverCount:7},
    description:K('一隻小魚輪流從不同礁石旁探頭；等牠現身再拍，牠就鑽回石縫，再換一區出現。'),
    reason:K('這個示例把等待與出手機會分開，探索「等目標出現再拍」的反應。'),
    hypothesis:K('觀察牠會不會留意不同石縫，等小魚探頭再拍。'),start:'arrive',
    states:[
      state('arrive',K('小魚游進礁石區了'),3,target(true,'drift'),covers(),{target:next('retreat',{advanceCover:true}),idle:next('approach')}),
      state('approach',K('小魚游向石縫，留意牠鑽進哪裡'),1.2,target(true,'dash'),covers(),{target:next('retreat',{advanceCover:true}),idle:next('wait')}),
      state('wait',K('石縫有水波，等小魚探頭'),1.5,target(false),covers(false,true),{idle:next('peek')}),
      state('peek',K('小魚探頭了，看看在哪一處'),2.4,target(true),covers(),{target:next('retreat',{advanceCover:true}),idle:next('wait',{advanceCover:true})}),
      state('retreat',K('小魚躲回石縫，換一區等等'),1.2,target(false),covers(),{idle:next('arrive')})
    ]
  },
  {
    id:'single-cruise',title:K('小魚巡游'),version:1,source:'example',durationSeconds:60,personality:'teasing',
    scene:{theme:'open',fishCount:1,coverCount:6},
    description:K('一隻小魚沿彎曲路線游遍池塘；拍到牠時，牠會轉向游開，再回到巡游路線。'),
    reason:K('這個示例讓觸碰改變小魚的方向與路線，探索持續追逐的反應。'),
    hypothesis:K('觀察小魚轉向後，牠會不會繼續追同一隻魚。'),start:'cruise',
    states:[
      state('cruise',K('小魚巡游中，跟著牠游過池塘'),8,target(true,'drift','center'),covers(),{target:next('dart',{advanceCover:true}),idle:next('return')}),
      state('dart',K('小魚轉向游開了，繼續追牠'),2.2,target(true,'dash','edge'),covers(),{target:next('return'),idle:next('return')}),
      state('return',K('小魚回到巡游路線，準備再出發'),4,target(true,'drift','center'),covers(),{target:next('dart',{advanceCover:true}),idle:next('cruise')})
    ]
  }
];

function freezeDeep(value) {
  for(const child of Object.values(value))if(child&&typeof child==='object')freezeDeep(child);
  return Object.freeze(value);
}
export const EXAMPLE_PLANS = freezeDeep(plans);

export function chooseExample(observationIds=[],variant=0) {
  const ids = Array.isArray(observationIds) ? observationIds : [];
  const base = ids.includes('search') ? 0 : ids.includes('ambush')||ids.includes('watch') ? 1 : ids.includes('chase') ? 2 : 0;
  const offset = Number.isInteger(variant)&&variant>=0 ? variant : 0;
  return clone(EXAMPLE_PLANS[(base+offset)%EXAMPLE_PLANS.length]);
}

const fail = message => {throw new Error(t('玩法規則無法使用：{message}',{message}));};
const isObject = value => value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
function object(value,keys,label) {
  if(!isObject(value))fail(t('{label}格式不正確。',{label}));
  if(Object.keys(value).some(key=>!keys.includes(key)))fail(t('{label}包含未支援的欄位。',{label}));
}
function text(value,max,label) {
  if(typeof value!=='string'||!value.trim()||value.length>max)fail(t('{label}超出長度或為空白。',{label}));
}
function number(value,min,max,label) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(t('{label}超出可用範圍。',{label}));
}
const isId = value => typeof value==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(value);
// 2026-11-12 新增：night、sand 兩個背景；circle、zigzag、wiggle 三種動作（只在池塘場景）。
// worker 的 play_validate、提示詞與這裡要同步（cloud/mjadm-worker/worker.py）。
export const SCENE_THEMES = Object.freeze(['water','reef','open','night','sand']);
export const POND_MOTIONS = Object.freeze(['circle','zigzag','wiggle']);
export const MOTIONS = Object.freeze(['still','drift','dash',...POND_MOTIONS]);
export const PLAY_SPEEDS = Object.freeze(['slow','normal','fast']);
export const PLAY_SPEED_PIXELS = Object.freeze({slow:45,normal:85,fast:130});

// The allowlist is intentionally shared with future model output validation.
// Graphs may contain cycles, but every state must have a timed exit and the whole
// session has a hard deadline. No URLs, functions, scripts, or arbitrary actions.
export function validatePlan(plan) {
  object(plan,['id','title','description','reason','hypothesis','version','source','durationSeconds','start','states','scene','personality'],t('玩法'));
  if('personality' in plan&&!PERSONALITY_IDS.includes(plan.personality))fail(t('小魚個性不正確。'));
  if(!isId(plan.id)||![1,2].includes(plan.version)||!['example','ai'].includes(plan.source))fail(t('版本或來源不正確。'));
  const freeplay=plan.version===2;
  // AI 設計的玩法走同一份白名單，再多兩條：一定要池塘場景，而且一次只有一隻小魚（Ian 2026-11-11 定案）。
  if(plan.source==='ai'&&(!plan.scene||plan.scene.fishCount!==1))fail(t('AI 設計的玩法必須是單魚池塘。'));
  text(plan.title,60,t('名稱'));text(plan.description,500,t('說明'));text(plan.reason,500,t('依據'));text(plan.hypothesis,300,t('觀察目標'));
  number(plan.durationSeconds,10,60,t('陪玩時間'));
  if('scene' in plan){
    object(plan.scene,freeplay?['fishCount','coverCount']:['theme','fishCount','coverCount'],t('池塘'));
    if(!freeplay&&!SCENE_THEMES.includes(plan.scene.theme))fail(t('池塘主題不正確。'));
    if(!Number.isInteger(plan.scene.fishCount)||plan.scene.fishCount<1||plan.scene.fishCount>7)fail(t('小魚數量超出範圍。'));
    if(!Number.isInteger(plan.scene.coverCount)||plan.scene.coverCount<6||plan.scene.coverCount>9||plan.scene.coverCount<plan.scene.fishCount)fail(t('藏身處數量超出範圍。'));
  }
  if(!Array.isArray(plan.states)||plan.states.length<2||plan.states.length>12)fail(t('階段數量不正確。'));
  const ids = new Set();
  for(const item of plan.states) {
    object(item,['id','label','seconds','target','covers','transitions'],t('階段'));
    if(!isId(item.id)||ids.has(item.id))fail(t('階段代號重複或無效。'));
    ids.add(item.id);text(item.label,100,t('階段提示'));number(item.seconds,.5,12,t('階段時間'));
    object(item.target,freeplay?['visible','motion','anchor','kind','speed']:['visible','motion','anchor','kind'],t('目標'));
    if(freeplay&&!PLAY_SPEEDS.includes(item.target.speed))fail(t('速度超出可用範圍。'));
    if(!plan.scene&&POND_MOTIONS.includes(item.target.motion))fail(t('這個動作只能用在池塘場景。'));
    if(typeof item.target.visible!=='boolean'||!MOTIONS.includes(item.target.motion)||!['active','center','edge'].includes(item.target.anchor)||!['fish','bug'].includes(item.target.kind))fail(t('目標包含未支援的動作。'));
    if(plan.scene&&item.target.kind!=='fish')fail(t('池塘只支援小魚。'));
    object(item.covers,['active','clue'],t('遮蔽物'));
    if(typeof item.covers.active!=='boolean'||typeof item.covers.clue!=='boolean')fail(t('遮蔽物設定不正確。'));
    object(item.transitions,['target','cover','idle'],t('事件'));
    if(!item.transitions.idle)fail(t('每個階段都必須能自動接續。'));
    if(item.transitions.target&&!item.target.visible)fail(t('隱藏目標不能接收目標觸碰。'));
    if(item.transitions.cover&&!item.covers.active)fail(t('停用遮蔽物不能接收遮蔽物觸碰。'));
    for(const [event,transition] of Object.entries(item.transitions)) {
      object(transition,['to','advanceCover','activeOnly'],t('接續規則'));
      if(!isId(transition.to))fail(t('接續階段無效。'));
      for(const key of ['advanceCover','activeOnly'])if(key in transition&&typeof transition[key]!=='boolean')fail(t('接續選項必須是開關。'));
      if(event!=='cover'&&'activeOnly' in transition)fail(t('藏身處條件只能用於遮蔽物觸碰。'));
    }
  }
  if(plan.source==='ai'&&!plan.states.some(item=>item.target.visible))fail(t('AI 設計的玩法至少要有一個看得到小魚的階段。'));
  if(!ids.has(plan.start))fail(t('找不到起始階段。'));
  const graph = new Map(plan.states.map(item=>[item.id,item]));
  for(const item of plan.states)for(const transition of Object.values(item.transitions))if(!ids.has(transition.to))fail(t('接續到不存在的階段。'));
  const reachable = new Set(),visit = id => {
    if(reachable.has(id))return;
    reachable.add(id);for(const transition of Object.values(graph.get(id).transitions))visit(transition.to);
  };
  visit(plan.start);if(reachable.size!==ids.size)fail(t('包含無法進入的階段。'));
  return plan;
}

// Paid/free speed limits are applied locally, including restored v2 favourites.
// The result retains the AI's route and pause/hide seconds; it never changes presentation.
export function applyPlaySpeedLimit(input,maxSpeed='normal') {
  validatePlan(input);
  if(!PLAY_SPEEDS.includes(maxSpeed))fail(t('速度上限不正確。'));
  const plan=clone(input);
  if(plan.version===2)for(const item of plan.states){
    if(PLAY_SPEEDS.indexOf(item.target.speed)>PLAY_SPEEDS.indexOf(maxSpeed))item.target.speed=maxSpeed;
  }
  return plan;
}

// 本機變奏（2026-11-13 第一包 G1）：在手機上改現有玩法，不送任何資料、不用進階模式額度。
// 只改既有欄位（秒數、主題、插入一個躲藏階段），結果一律再走 validatePlan；不合格或沒有變化就不提供。
export const REMIX_KINDS = Object.freeze([
  {id:'faster',label:K('快一點')},
  {id:'slower',label:K('慢一點')},
  {id:'hide',label:K('多躲一次')},
  {id:'theme',label:K('換背景')},
  {id:'personality',label:K('換個性')}
].map(Object.freeze));
const REMIX_SUFFIX = /(?:・(?:快一點|慢一點|多躲一次|換背景|換個性))+$/;
const roundTenth = value => Math.round(value*10)/10;
export function remixPlan(input,kind,maxSpeed='fast') {
  validatePlan(input);
  const option = REMIX_KINDS.find(item=>item.id===kind);
  if(!option)fail(t('不支援這種調整。'));
  const plan = clone(input),snap = () => JSON.stringify(plan.states)+JSON.stringify(plan.scene||null)+String(plan.personality||''),before = snap();
  if(kind==='personality') {
    if(!plan.scene)fail(t('這個玩法沒有小魚可以換個性。'));
    plan.personality = PERSONALITY_IDS[(PERSONALITY_IDS.indexOf(plan.personality)+1)%PERSONALITY_IDS.length];
  } else if(kind==='faster'||kind==='slower') {
    if(plan.version===2){
      for(const item of plan.states)if(item.target.visible&&item.target.motion!=='still'){
        const n=PLAY_SPEEDS.indexOf(item.target.speed)+(kind==='faster'?1:-1);
        item.target.speed=PLAY_SPEEDS[clamp(n,0,maxSpeed==='fast'?2:maxSpeed==='slow'?0:1)];
      }
    }else{
      const rate = kind==='faster'?.7:1.3;
      for(const item of plan.states)item.seconds = clamp(roundTenth(item.seconds*rate),.5,12);
    }
  } else if(kind==='theme') {
    if(plan.version===2)fail(t('自由陪玩的背景沿用使用者設定。'));
    if(!plan.scene)fail(t('這個玩法沒有可換的背景。'));
    plan.scene.theme = SCENE_THEMES[(SCENE_THEMES.indexOf(plan.scene.theme)+1)%SCENE_THEMES.length];
  } else {
    // 多躲一次：找一個「看得到魚、時間到會接到另一個看得到魚的階段」，中間插入 2 秒躲藏；時間到魚會自己回來。
    if(!plan.scene)fail(t('這個玩法沒有藏身處可以躲。'));
    const byId = new Map(plan.states.map(item=>[item.id,item]));
    if(plan.states.length>=12||plan.states.filter(item=>!item.target.visible).length>=2)fail(t('這個玩法的躲藏已經夠多了。'));
    const host = plan.states.find(item=>item.target.visible&&byId.get(item.transitions.idle.to)?.target.visible);
    if(!host)fail(t('這個玩法找不到可以插入躲藏的地方。'));
    let hideId = 'hide-extra',n = 2;
    while(byId.has(hideId))hideId = 'hide-extra-'+n++;
    const back = host.transitions.idle.to;
    plan.states.splice(plan.states.indexOf(host)+1,0,{id:hideId,label:K('小魚躲進藏身處了，找找水波'),seconds:2,
      target:{visible:false,motion:'still',anchor:'active',kind:'fish',...(plan.version===2?{speed:'slow'}:{})},covers:{active:true,clue:true},
      transitions:{idle:{to:back},cover:{to:back,activeOnly:true}}});
    host.transitions.idle = {to:hideId,advanceCover:true};
  }
  if(snap()===before)fail(t('這個玩法已經調到底了。'));
  const suffix = '・'+option.label,base = String(plan.title).replace(REMIX_SUFFIX,'');
  plan.title = base.slice(0,60-suffix.length)+suffix;
  return validatePlan(plan);
}
// 這個玩法目前可用的變奏：每一種都實際試算並通過驗證才列出。
export function remixOptions(plan,maxSpeed='fast') {
  return REMIX_KINDS.filter(item=>{try{remixPlan(plan,item.id,maxSpeed);return true;}catch{return false;}});
}

const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

// 分段記錄（2026-11-16）：每個階段的停留秒數與觸碰數，成果頁與再設計用來說「哪一段最有反應」。
export const STAGE_MOTION_LABEL = Object.freeze({still:K('停留'),drift:K('緩游'),dash:K('衝刺'),circle:K('繞圈'),zigzag:K('之字形'),wiggle:K('原地擺動')});
export const STAGE_SPEED_LABEL = Object.freeze({slow:K('慢速'),normal:K('一般'),fast:K('快速')});
// 回傳中文原值片段（顯示時逐段 t()），例如 ['繞圈','快速']；躲藏階段固定 ['躲藏']。
export function stageNameParts(state) {
  if(!state?.target)return [K('未知')];
  if(state.target.visible===false)return [K('躲藏')];
  const parts=[STAGE_MOTION_LABEL[state.target.motion]||K('未知')];
  if(state.target.speed&&state.target.motion!=='still')parts.push(STAGE_SPEED_LABEL[state.target.speed]);
  return parts;
}
export function bestStage(plan,stats) {
  const rows=Array.isArray(stats?.stages)?stats.stages:[],states=new Map((plan?.states||[]).map(item=>[item.id,item]));
  // 同樣動作的不同階段（例如兩段「衝刺」）合併計算，和成果頁一致。
  const groups=new Map();
  for(const row of rows){
    const state=states.get(row.id);if(!state)continue;
    const key=stageNameParts(state).join('・'),g=groups.get(key)||{id:row.id,state,targetTouches:0,seconds:0};
    g.targetTouches+=Number.isSafeInteger(row.targetTouches)?row.targetTouches:0;g.seconds+=Number(row.seconds)||0;groups.set(key,g);
  }
  let best=null;
  for(const g of groups.values()){
    if(!(g.targetTouches>0))continue;
    const rate=g.targetTouches/Math.max(g.seconds,1);
    if(!best||g.targetTouches>best.targetTouches||(g.targetTouches===best.targetTouches&&rate>best.rate))best={...g,rate};
  }
  return best;
}
// 小魚個性的本機反應：反應時間依方案速度上限放慢（免費最高一般），是短暫的驚嚇或回頭，不改路線速度。
const REACTION_PACE = {slow:1.6,normal:1.25,fast:1};
const IDLE_AFTER_SECONDS = 6;
const REACTIONS = {
  shy:{touch:1.2,idle:2.6},curious:{touch:1,idle:3},teasing:{touch:1.4,idle:1.8},playdead:{touch:1.9,idle:2.4}
};
const smooth = p => p*p*(3-2*p);
const unit = (x,y) => {const len=Math.hypot(x,y);return len>1e-6?{x:x/len,y:y/len}:{x:0,y:-1};};
const legacyCoverPoints = [{x:.22,y:.48},{x:.5,y:.67},{x:.78,y:.38}];
// Alternating shores give every screen region a destination, even on a tablet.
const pondPoints = [{x:.09,y:.12},{x:.87,y:.82},{x:.85,y:.16},{x:.12,y:.83},{x:.12,y:.47},{x:.87,y:.49},{x:.49,y:.1},{x:.51,y:.87},{x:.5,y:.5}];
const safeSize = (value,fallback) => Number.isFinite(value)&&value>0?value:fallback;

export function createPlaySession(input,{width=320,height=440,reducedMotion=false,targetRadius=44,maxSpeed='fast'}={}) {
  const plan=applyPlaySpeedLimit(input,maxSpeed),graph=new Map(plan.states.map(item=>[item.id,item]));
  const radius=safeSize(targetRadius,44);
  const pond=plan.scene,coverPoints=pond?pondPoints.slice(0,pond.coverCount):legacyCoverPoints,fishCount=pond?.fishCount||1;
  let w=safeSize(width,320),h=safeSize(height,440),elapsed=0,local=0,activeCover=0,current=graph.get(plan.start),soundEvent=0;
  let origin={...coverPoints[activeCover]};
  const assignedCover=index=>(activeCover+index)%coverPoints.length;
  let origins=Array.from({length:fishCount},(_,index)=>({...coverPoints[assignedCover(index)]})),ripples=[];
  const stats={targetTouches:0,coverTouches:0,blankTouches:0};
  const stageRows=new Map(),stageRow=id=>{let row=stageRows.get(id);if(!row){row={id,seconds:0,targetTouches:0,coverTouches:0};stageRows.set(id,row);}return row;};
  stageRow(current.id);
  // 個性反應只在池塘場景、未開啟「減少動態效果」時啟用；沒有個性的舊玩法完全照原本路線。
  const personality=pond&&!reducedMotion&&PERSONALITY_IDS.includes(plan.personality)?plan.personality:null;
  const pace=REACTION_PACE[maxSpeed]||1;
  let reaction=null,lastActivity=0,lastTouchPoint=null,lastAngles=[],reactionCount=0;
  const finished=()=>elapsed>=plan.durationSeconds;
  function anchor() {
    if(current.target.anchor==='center')return {x:.5,y:.42};
    if(current.target.anchor==='edge')return {x:activeCover%2?.88:.12,y:.45};
    return coverPoints[activeCover];
  }
  function position() {
    const destination=anchor();
    if(reducedMotion||current.target.motion==='still')return {...destination};
    if(current.target.motion==='dash') {
      const p=clamp(local/current.seconds,0,1),ease=p*p*(3-2*p);
      return {x:origin.x+(destination.x-origin.x)*ease,y:origin.y+(destination.y-origin.y)*ease};
    }
    return {x:clamp(destination.x+Math.sin(local*1.4)*.22,.08,.92),y:clamp(destination.y+Math.sin(local*.9)*.13,.08,.92)};
  }
  function fishPosition(index,offset=0) {
    const base=routePosition(index,offset);
    return reaction&&index===0?react(base,offset):base;
  }
  function react(point,offset) {
    const r=reaction,p=clamp((elapsed+offset-r.at)/r.duration,0,1);
    if(p>=1)return point;
    const d=r.dir;let x=point.x,y=point.y;
    if(r.style==='flee'){const e=p<.25?smooth(p/.25):1-smooth((p-.25)/.75);x+=d.x*.28*e;y+=d.y*.28*e;}
    else if(r.style==='dodge'){const e=Math.sin(2*Math.PI*p)*(1-p*.4);x+=d.x*.18*e;y+=d.y*.18*e;}
    else if(r.style==='spin'){const e=Math.sin(Math.PI*p);x+=Math.cos(3*Math.PI*p)*.06*e;y+=Math.sin(3*Math.PI*p)*.06*e;}
    else if(r.style==='freeze'){
      if(p<.55)return {...r.from};
      const q=(p-.55)/.45,w=smooth(clamp(q*1.6,0,1)),tx=point.x+d.x*.25*(1-q),ty=point.y+d.y*.25*(1-q);
      x=r.from.x+(tx-r.from.x)*w;y=r.from.y+(ty-r.from.y)*w;
    }
    else if(r.style==='approach'||r.style==='peek'){const e=Math.sin(Math.PI*p),k=r.style==='peek'?.75:.6;x+=(r.goal.x-point.x)*k*e;y+=(r.goal.y-point.y)*k*e;}
    else if(r.style==='tease'){x+=Math.sin(p*Math.PI*8)*.04*Math.sin(Math.PI*p);}
    return {x:clamp(x,0,1),y:clamp(y,0,1)};
  }
  const reacting=()=>!!reaction&&elapsed-reaction.at<reaction.duration;
  function startReaction(trigger) {
    if(!personality||!current.target.visible||finished())return;
    const from=fishPosition(0),ahead=fishPosition(0,.05);
    // 逃開方向：和游動方向垂直、偏向池塘中央，避免一直卡在邊上。
    const heading=unit(ahead.x-from.x,ahead.y-from.y),side={x:-heading.y,y:heading.x},toCenter={x:.5-from.x,y:.5-from.y};
    const dir=side.x*toCenter.x+side.y*toCenter.y>=0?side:{x:-side.x,y:-side.y};
    const spec=REACTIONS[personality],duration=(trigger==='touch'?spec.touch:spec.idle)*pace;
    let style,goal=null;
    if(trigger==='touch')style={shy:'flee',curious:'spin',teasing:'dodge',playdead:'freeze'}[personality];
    else if(personality==='curious'){style='approach';goal=lastTouchPoint||{x:.5,y:.82};}
    else if(personality==='shy'){style='peek';goal=coverPoints.reduce((a,b)=>Math.hypot(b.x-from.x,b.y-from.y)<Math.hypot(a.x-from.x,a.y-from.y)?b:a);}
    else if(personality==='teasing')style='tease';
    else style='freeze';
    reaction={style,trigger,at:elapsed,duration,from,dir,goal};reactionCount++;
  }
  function routePosition(index,offset=0) {
    if(!pond)return position();
    const home=coverPoints[assignedCover(index)],phase=index*Math.PI*2/fishCount,t=elapsed+offset,stage=local+offset;
    if(plan.version===2)return freeplayPosition(index,offset);
    if(reducedMotion||current.target.motion==='still')return {...home};
    if(current.target.motion==='dash'){
      const lane=fishCount===1?(origins[index].y<.5?.85:.15):.08+.84*(index/(fishCount-1));
      const destination=current.target.anchor==='edge'?{x:origins[index].x<.5?.94:.06,y:lane}:home;
      const p=clamp(stage/current.seconds,0,1),ease=p*p*(3-2*p);
      return {x:origins[index].x+(destination.x-origins[index].x)*ease,y:origins[index].y+(destination.y-origins[index].y)*ease};
    }
    if(POND_MOTIONS.includes(current.target.motion)){
      // 新動作：先算路線點，再用 0.8 秒從原位置融入，避免觸碰後瞬間跳位。
      const c=anchor(),o=origins[index],p=clamp(stage/current.seconds,0,1),ease=p*p*(3-2*p);
      let route;
      if(current.target.motion==='circle')route={x:c.x+Math.cos(stage*1.7)*.24,y:c.y+Math.sin(stage*1.7)*.2};
      else if(current.target.motion==='wiggle')route={x:c.x+Math.sin(stage*9)*.03,y:c.y+Math.cos(stage*7)*.025};
      else{
        const dx=c.x-o.x,dy=c.y-o.y,len=Math.hypot(dx,dy)||1,swing=Math.sin(stage*6)*.1*(1-p*.5);
        route={x:o.x+dx*ease+(-dy/len)*swing,y:o.y+dy*ease+(dx/len)*swing};
      }
      route={x:clamp(route.x,.06,.94),y:clamp(route.y,.06,.94)};
      const blend=current.target.motion==='zigzag'?1:clamp(stage/.8,0,1),mix=blend*blend*(3-2*blend);
      return {x:o.x+(route.x-o.x)*mix,y:o.y+(route.y-o.y)*mix};
    }
    const grouping=current.id==='regroup',spread=grouping?.23:.43;
    const route={x:.5+Math.sin(t*.38+phase)*spread,y:.5+Math.sin(t*.29+phase*1.7)*spread};
    // Blend into a new swimming route instead of teleporting after a touch.
    const blend=clamp(stage/.8,0,1),ease=blend*blend*(3-2*blend);
    return {x:origins[index].x+(route.x-origins[index].x)*ease,y:origins[index].y+(route.y-origins[index].y)*ease};
  }
  function freeplayPosition(index,offset=0){
    const o=origins[index],c=anchor(),stage=local+offset;
    if(reducedMotion||current.target.motion==='still')return {...o};
    // Route time uses actual pixel speed. Stage seconds control only when the next
    // route/pause/hide begins, so changing a pause does not secretly change speed.
    const rate=PLAY_SPEED_PIXELS[current.target.speed],sw=Math.max(1,w-2*Math.min(radius,w/2)),sh=Math.max(1,h-2*Math.min(radius,h/2));
    const routeTime=stage*rate/85;
    if(current.target.motion==='dash'){
      const dest=current.target.anchor==='edge'?{x:o.x<.5?.94:.06,y:c.y}:c;
      const distance=Math.hypot((dest.x-o.x)*sw,(dest.y-o.y)*sh)||1,p=clamp(stage*rate/distance,0,1);
      return {x:o.x+(dest.x-o.x)*p,y:o.y+(dest.y-o.y)*p};
    }
    let route;
    if(current.target.motion==='circle')route={x:c.x+Math.cos(routeTime*1.7)*.24,y:c.y+Math.sin(routeTime*1.7)*.2};
    else if(current.target.motion==='wiggle')route={x:c.x+Math.sin(routeTime*9)*.03,y:c.y+Math.cos(routeTime*7)*.025};
    else if(current.target.motion==='zigzag'){
      const progress=clamp(routeTime/4,0,1),dx=c.x-o.x,dy=c.y-o.y,len=Math.hypot(dx,dy)||1,swing=Math.sin(routeTime*6)*.1;
      route={x:o.x+dx*progress-dy/len*swing,y:o.y+dy*progress+dx/len*swing};
    }else route={x:.5+Math.sin(routeTime*.38)*.43,y:.5+Math.sin(routeTime*.29)*.43};
    const blend=clamp(stage/.8,0,1),ease=blend*blend*(3-2*blend);
    return {x:clamp(o.x+(route.x-o.x)*ease,0,1),y:clamp(o.y+(route.y-o.y)*ease,0,1)};
  }
  function visibleFish(index){return current.target.visible&&!finished()&&(!pond||current.target.motion!=='still'||local>=index*.18);}
  function enter(transition) {
    const wasHidden=!current.target.visible;
    if(pond)origins=Array.from({length:fishCount},(_,index)=>fishPosition(index));
    origin=position();if(transition.advanceCover)activeCover=(activeCover+1)%coverPoints.length;
    // 換階段時位置已記進 origins，反應到此結束，畫面不會跳位。
    reaction=null;
    current=graph.get(transition.to);local=0;soundEvent++;stageRow(current.id);
    // A visible pause holds its incoming location. A hide moves the unseen fish
    // to the indicated cover, so a still peek appears where the clue was shown.
    if(plan.version===2&&pond&&(!current.target.visible||(wasHidden&&current.target.anchor==='active'))){
      origins=Array.from({length:fishCount},(_,index)=>({...coverPoints[assignedCover(index)]}));
    }
  }
  const pixels = point => {
    const mx=Math.min(radius,w/2),my=Math.min(radius,h/2);
    return {x:mx+clamp(point.x,0,1)*(w-2*mx),y:my+clamp(point.y,0,1)*(h-2*my)};
  };
  function snapshot() {
    const point=position(),visible=current.target.visible&&!finished();
    const occupied=index=>pond?Array.from({length:fishCount},(_,i)=>assignedCover(i)).includes(index):index===activeCover;
    return {
      elapsed,finished:finished(),stageLabel:finished()?K('這次先休息'):current.label,
      speed:current.target.speed||null,motion:current.target.motion,
      personality,reaction:reacting()?reaction.style:null,reactions:reactionCount,
      targets:pond?Array.from({length:fishCount},(_,index)=>{
        const at=fishPosition(index),ahead=fishPosition(index,.025),dx=(ahead.x-at.x)*(w-88),dy=(ahead.y-at.y)*(h-88);
        // 個性反應停住（裝死）時保留上一個方向，不會突然轉回 0 度。
        const moving=Math.abs(dx)+Math.abs(dy)>.00001,angle=moving?Math.atan2(dy,dx)*180/Math.PI:(personality&&lastAngles[index]!==undefined?lastAngles[index]:0);
        if(moving)lastAngles[index]=angle;
        return {id:'target-'+index,...pixels(at),angle,visible:visibleFish(index),kind:'fish',scale:[1,.88,.94,.82][index%4],color:['coral','gold','silver'][index%3]};
      }):[{id:'target',...pixels(point),angle:current.target.motion==='dash'?Math.atan2(anchor().y-origin.y,anchor().x-origin.x)*180/Math.PI:0,visible,kind:current.target.kind}],
      covers:coverPoints.map((point,index)=>({id:'cover-'+index,...pixels(point),active:!finished()&&current.covers.active&&occupied(index),clue:!finished()&&current.covers.clue&&occupied(index)})),
      ripples:ripples.filter(r=>elapsed-r.at<.8).map(r=>({id:r.id,...pixels(r),progress:clamp((elapsed-r.at)/.8,0,1)})),
      stats:{...stats,stages:[...stageRows.values()].map(row=>({...row,seconds:Math.round(row.seconds*10)/10}))},soundEvent
    };
  }
  const normalized=point=>{
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
    const mx=Math.min(radius,w/2),my=Math.min(radius,h/2);
    return {x:clamp((point.x-mx)/Math.max(1,w-2*mx),0,1),y:clamp((point.y-my)/Math.max(1,h-2*my),0,1)};
  };
  return {
    snapshot,
    step(dtSeconds) {
      if(!Number.isFinite(dtSeconds)||dtSeconds<=0||finished())return snapshot();
      let left=Math.min(dtSeconds,plan.durationSeconds-elapsed);
      while(left>1e-9&&!finished()) {
        const amount=Math.min(left,current.seconds-local,plan.durationSeconds-elapsed);
        local+=amount;elapsed+=amount;left-=amount;stageRow(current.id).seconds+=amount;
        if(elapsed>=plan.durationSeconds-1e-9){elapsed=plan.durationSeconds;break;}
        if(local>=current.seconds-1e-9)enter(current.transitions.idle);
        // 太久沒人理：依個性做一次本機反應，做完再重新計時。
        // AI 自由陪玩（v2）的「停留」是刻意的節奏，不插入閒置反應；內建玩法的探頭停留可以。
        if(personality&&!reacting()&&current.target.visible&&local>=.5&&!(plan.version===2&&current.target.motion==='still')&&elapsed-lastActivity>=IDLE_AFTER_SECONDS){
          startReaction('idle');lastActivity=elapsed+(reaction?reaction.duration:0);
        }
      }
      return snapshot();
    },
    // point：觸碰位置（遊戲區內像素，可省略），只用來讓好奇的小魚游向牠拍過的地方。
    touch(kind,index=0,point=null) {
      if(finished())return snapshot();
      const at=normalized(point);
      if(kind==='target') {
        if(!Number.isInteger(index)||index<0||index>=fishCount||!visibleFish(index))return snapshot();
        stats.targetTouches++;stageRow(current.id).targetTouches++;
        lastTouchPoint=at||fishPosition(index);
        if(pond){ripples=ripples.filter(r=>elapsed-r.at<.8).slice(-7);ripples.push({...fishPosition(index),at:elapsed,id:stats.targetTouches});}
      } else if(kind==='cover') {
        if(!Number.isInteger(index)||index<0||index>=coverPoints.length)return snapshot();
        stats.coverTouches++;stageRow(current.id).coverTouches++;
        lastTouchPoint=at||coverPoints[index];
      } else if(kind==='blank') {stats.blankTouches++;if(at)lastTouchPoint=at;lastActivity=Math.max(lastActivity,elapsed);return snapshot();}
      else return snapshot();
      lastActivity=Math.max(lastActivity,elapsed);
      const transition=current.transitions[kind];
      const occupied=pond?Array.from({length:fishCount},(_,i)=>assignedCover(i)).includes(index):index===activeCover;
      if(transition&&(!transition.activeOnly||occupied))enter(transition);
      else if(kind==='target')soundEvent++;
      if(kind==='target'&&(!reacting()||reaction.trigger==='idle'))startReaction('touch');
      return snapshot();
    },
    resize(width,height) {w=safeSize(width,w);h=safeSize(height,h);return snapshot();}
  };
}
