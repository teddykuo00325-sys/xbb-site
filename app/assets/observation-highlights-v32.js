import {t, K} from './i18n.js?v=audit1117b';
import {eliminationKind} from './elimination-observation.js?v=8f5745b7843b';
import {calendarDay, localCalendarDate} from './today-overview-v29.js?v=8f5745b7843b';

const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const demo = r => r.demo === true || String(r.source || '').includes(K('示範')) || r.source === K('聲音反應');
const actual = r => r && !demo(r) && !r.draft && r.confirmed !== false && !r.deleted && !r.deletedAt && !r.isDeleted && r.status !== 'deleted' && r.status !== 'draft';
const belongs = (r,id) => r.ownership !== 'unconfirmed' && (!own(r,'catId') || r.catId !== null && r.catId === id);
const order = (a,b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`) || String(a.id || '').localeCompare(String(b.id || ''));
const round = n => Number(n.toFixed(2)).toString();
const shift = (date,n) => new Date((calendarDay(date)+n)*864e5).toISOString().slice(0,10);
function cleanRows(rows,today,catId) {
  const day = calendarDay(today), seen = new Set();
  if(day === null) return [];
  return rows.filter(r => actual(r) && belongs(r,catId) && typeof r.id === 'string' && r.id && typeof r.text === 'string' && r.text.trim() && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) && calendarDay(r.date) !== null && calendarDay(r.date) <= day).sort(order).filter(r => {if(seen.has(r.id)) return false; seen.add(r.id); return true;});
}
// One read-only classifier for all stool summaries and classified-day counts.
export function stoolState(row) {
  // A general abnormal observation does not identify a stool subtype.
  if(row.stoolStatus==='abnormal')return 'unknown';
  if(row.eliminationKind==='urine'||row.metric==='urine'||eliminationKind(row)==='urine')return 'unknown';
  if(['normal','soft','diarrhea','blood','unknown'].includes(row.stoolStatus)) return row.stoolStatus;
  const text=typeof row.text==='string'?row.text.trim():'';
  if(!text) return 'unknown';
  const clauses=text.split(/[，,；;。.!！\n、]|但是|不過|然而|而且|並且|以及|但|且|和|與/);
  // Only a complete, separate food-change cause clause is exempted. Uncertainty
  // about the observation (including "可能看錯了") still makes it unclassified.
  // This records what was seen; it does not infer or confirm the cause.
  const causeOnly=/^\s*(?:原因)?(?:可能|或許)(?:是)?(?:因為|由於|因)?(?:最近|剛)?(?:換糧|換飼料|換了飼料|換食物)(?:所)?(?:造成|引起|導致|有關)?(?:的)?\s*$/;
  const stoolTerms=/便便|大便|糞便|排便|(?<!小)便中|軟便|水便|腹瀉|拉肚子|血便|便血|成形/;
  const otherObservation=/喝水|飲水|水量|尿|嘔吐|吐出|鼻涕|咳痰|咳出|牙齦|傷口|口水|唾液|食慾|吃下|體重|精神|活動量|活力/;
  const observations=clauses.filter(clause=>!causeOnly.test(clause)&&
    !(otherObservation.test(clause)&&!stoolTerms.test(clause)));
  if(/不確定|不清楚|無法判斷|不明|疑似|可能|或許|是否|有沒有|有無|嗎|\?|？/.test(observations.join(t('，')))) return 'unknown';
  const positive=new Set(),negative=new Set();
  const states={腹瀉:'diarrhea',水便:'diarrhea',拉肚子:'diarrhea',軟便:'soft',正常:'normal',成形:'normal'};
  for(const clause of observations) {
    for(const match of clause.matchAll(/血便|便血|(?:便便|大便|糞便|(?<!小)便中)(?:中)?\s*(?:有|見)血|帶血|血絲|腹瀉|水便|拉肚子|軟便|正常|成形/g)) {
      const before=clause.slice(0,match.index),after=clause.slice(match.index+match[0].length),state=states[match[0]]||'blood';
      // Generic blood wording must not relabel an explicitly non-stool source.
      if(/^(?:帶血|血絲)$/.test(match[0])&&/尿|嘔吐|吐出|鼻涕|咳痰|咳出|牙齦|傷口|口水|唾液/.test(before)&&!/便便|大便|糞便|排便/.test(before)) continue;
      // A negated stool term must not count as positive. Keep negation in its
      // clause so "血便，沒有嘔吐" retains the independent stool observation.
      const negated=/沒|無|未見|未觀察|未發現|不是|不算|否認|排除|非|不曾|並未|尚未/.test(before)||/[不未](?:太)?\s*$/.test(before)||/^\s*(?:已)?(?:排除|否認|未見|沒有|不存在|不是|不算)/.test(after);
      (negated?negative:positive).add(state);
    }
  }
  if([...positive].some(state=>negative.has(state))) return 'unknown';
  return ['blood','diarrhea','soft','normal'].find(state=>positive.has(state))||'unknown';
}
function numeric(value) {
  if(!['number','string'].includes(typeof value) || String(value).trim() === '') return null;
  const n=Number(value); return Number.isFinite(n) && n >= 0 ? n : null;
}
function grams(value,unit) {
  const n=numeric(value);
  return n === null ? null : ['g',K('公克')].includes(unit) ? n : ['kg',K('公斤')].includes(unit) ? n*1000 : null;
}
function weight(r) {const g=r.category === K('體重') ? grams(r.amount,r.unit) : null; return g !== null && g > 0 ? g/1000 : null;}

// Compare recorded intake only, never infer complete daily consumption.
// Every calendar date must have measured records; any unmeasured food entry
// makes that date unsuitable. Today is excluded because it is still in progress.
export function appetiteAssessment({rows=[],catId,today=localCalendarDate()}={}) {
  return assessAppetite(cleanRows(rows,today,catId),today);
}
function assessAppetite(rows,today) {
  const data=rows.filter(r=>r.category===K('飲食'));
  const insufficient = reason => ({status:'insufficient',reason,highlight:null});
  if(calendarDay(today)===null) return insufficient(t('日期無效，無法比較。'));
  const confirmed=data.filter(r=>r.date===today&&r.feeding?.noEatingConfirmed===true&&numeric(r.feeding.eaten)===0&&['g',K('公克'),'kg',K('公斤'),'ml',K('毫升'),K('包'),K('罐'),K('顆'),K('片')].includes(r.feeding.unit)).at(-1);
  if(confirmed){
    const later=data.findLast(row=>row.date===today&&row.time>confirmed.time&&numeric(row.feeding?.eaten)>0&&row.feeding.unit);
    const update=later?t(' {time} 另有吃下 {eaten} {unit} 的紀錄。', {time: later.time, eaten: later.feeding.eaten, unit: t(later.feeding.unit)}):'';
    const message=t('{date} {time} 主人已確認完全不進食。{update} 若目前仍未進食，請儘速聯絡獸醫，不要等待比較天數或紀錄累積。這是主人填寫的觀察，不是系統由空白或 0 推測。', {date: confirmed.date, time: confirmed.time, update});
    return {status:'owner-confirmed',source:confirmed,highlight:{id:'no-eating',title:later?t('今日進食紀錄'):t('不進食提醒'),icon:'bowl-food',shortText:message,text:message}};
  }
  const daily = date => {
    const meals=data.filter(r=>r.date===date);
    if(!meals.length || meals.some(r=>!r.feeding)) return null;
    const amounts=meals.map(r=>grams(r.feeding.eaten,r.feeding.unit));
    if(amounts.some(n=>n===null)) return null;
    // Same measured food across all days avoids comparing unlike food masses.
    const foods=new Set(meals.map(r=>r.feeding.foodId));
    if(foods.size!==1 || typeof [...foods][0]!=='string' || ![...foods][0].trim()) return null;
    if(meals.some(r=>{const provided=grams(r.feeding.provided,r.feeding.unit);return provided!==null && grams(r.feeding.eaten,r.feeding.unit)>provided;})) return null;
    return {date,total:amounts.reduce((a,b)=>a+b,0),foodId:[...foods][0]};
  };
  // Use the two immediately preceding completed calendar dates, not today.
  const end=shift(today,-1);
  const dates=Array.from({length:9},(_,i)=>shift(end,i-8)),days=dates.map(daily);
  if(days.some(d=>!d)) return insufficient(t('食慾規則尚無足夠資料：需昨日與前日、以及之前 7 日每天都有可比較的實際吃下量、同一食品與重量單位；任一飲食記錄缺量或缺日都不能判定，未記錄不視為 0。'));
  if(new Set(days.map(d=>d.foodId)).size!==1) return insufficient(t('食品不同，重量不宜直接當作食慾比較；尚無足夠可比較資料。'));
  const baseline=days.slice(0,7).reduce((n,d)=>n+d.total,0)/7;
  if(!(baseline>0) || days.slice(0,7).some(d=>d.total<=0)) return insufficient(t('之前 7 日每天的已記錄吃下量須大於 0，才能建立比較基準。'));
  const recent=days.slice(-2), triggered=recent.every(d=>d.total<baseline/2);
  return {status:triggered?'triggered':'not-triggered',baselineGrams:baseline,dates:recent.map(d=>d.date),totalsGrams:recent.map(d=>d.total),highlight:triggered?{id:'appetite',title:t('食慾'),icon:'bowl-food',shortText:t('前日與昨日已記錄吃下量分別為 {v0}、{v1} 公克，連續 2 天低於先前 7 日均量的一半。若持續少吃，建議帶看診摘要與獸醫討論。', {v0: round(recent[0].total), v1: round(recent[1].total)}),text:t('{v0}、{v1} 已記錄吃下量分別為 {v2}、{v3} 公克，連續 2 天低於之前 7 日已記錄日均 {v4} 公克的一半（同一食品）。每天有記錄不保證涵蓋全日食量；這只是已記錄吃下量的變化，不能據此判定食慾或診斷。若持續少吃，建議帶看診摘要與獸醫討論。', {v0: recent[0].date.replaceAll('-','/'), v1: recent[1].date.replaceAll('-','/'), v2: round(recent[0].total), v3: round(recent[1].total), v4: round(baseline)})}:null};
}

// Pure projection: callers recompute on every render after edits/deletions.
// Stable priority: stool, weight, appetite. Return no more than two cards.
export function observationHighlights({rows=[],changes=[],catId,today=localCalendarDate(),isDemoChange=demo}={}) {
  const data=cleanRows(rows,today,catId),day=calendarDay(today),highlights=[];
  if(day===null) return highlights;
  const appetite=assessAppetite(data,today);
  if(appetite.status==='owner-confirmed')highlights.push(appetite.highlight);
  const stool=data.filter(r=>r.category===K('排泄')&&eliminationKind(r)==='stool'),recent=stool.filter(r=>calendarDay(r.date)>=day-2),prior=stool.filter(r=>calendarDay(r.date)>=day-9 && calendarDay(r.date)<=day-3);
  const count=a=>a.filter(r=>['soft','diarrhea'].includes(stoolState(r))).length;
  const n=count(recent),p=count(prior),coverage=a=>new Set(a.filter(r=>stoolState(r)!=='unknown').map(r=>r.date)).size;
  const recentDays=coverage(recent),priorDays=coverage(prior),comparable=recentDays===3&&priorDays===7;
  if(n>=2 && n>p) {
    const change=changes.filter(c=>actual(c) && belongs(c,catId) && !isDemoChange(c) && /換飼料|換糧/.test(c.kind) && calendarDay(c.date)!==null && calendarDay(c.date)>=day-6 && calendarDay(c.date)<=day && (!c.sourceEntryId || data.some(r=>r.id===c.sourceEntryId))).sort(order).at(-1);
    const basis=comparable?t('前 7 日記下 {p} 筆', {p}):priorDays===0?t('前 7 日沒有可比較紀錄'):t('兩段期間的紀錄天數不足，暫不比較');
    const lead=t('近 3 日軟便／腹瀉記錄 {n} 筆，{basis}。', {n, basis});
    const explanation=t('筆數不是實際發生頻率，未觀察或未記錄不代表未發生。{v0}若持續軟便，建議把看診摘要帶去給獸醫看。', {v0: change?t('{v0}{v1} 曾記下換糧，僅供一起回顧，不代表原因。', {v0: change.uncertain?t('約 '):'', v1: change.date.replaceAll('-','/')}):''});
    highlights.push({id:'stool',title:t('排泄'),icon:'notebook',stoolDetails:{recentCount:n,priorCount:p,recentDays,priorDays,comparable,explanation},
      shortText:t('{lead}{v1}若持續軟便，建議帶看診摘要與獸醫討論。', {lead, v1: change?t('{v0}{v1} 記下換糧，可一起回顧；', {v0: change.uncertain?t('約 '):'', v1: change.date.slice(5).replace('-','/')}):''}),
      text:t('{lead}有分類排泄記錄的日數：近 3 日 {recentDays}/3 天、前 7 日 {priorDays}/7 天；{explanation}', {lead, recentDays, priorDays, explanation})});
  }
  const weights=data.filter(r=>calendarDay(r.date)>=day-29 && weight(r)!==null);
  if(weights.length>=2) {
    const first=weights[0],last=weights.at(-1),delta=weight(last)-weight(first),pct=delta/weight(first)*100;
    if(first.date!==last.date && (Math.abs(delta)>=.3-1e-9 || Math.abs(pct)>=5-1e-9)) highlights.push({id:'weight',title:t('體重'),icon:'scales',shortText:t('{v0} 至 {v1}，體重記錄{v2} {v3} 公斤（{v4}%）。可留意量測時間與方式是否一致，有疑問可帶看診摘要與獸醫討論。', {v0: first.date.slice(5).replace('-','/'), v1: last.date.slice(5).replace('-','/'), v2: delta>0?t('上升'):t('下降'), v3: round(Math.abs(delta)), v4: round(Math.abs(pct))}),text:t('{v0} 至 {v1}，記錄的體重{v2} {v3} 公斤（{v4}%）。可留意量測時間與方式是否一致；這是紀錄變化，不是醫療判斷。', {v0: first.date.slice(5).replace('-','/'), v1: last.date.slice(5).replace('-','/'), v2: delta>0?t('上升'):t('下降'), v3: round(Math.abs(delta)), v4: round(Math.abs(pct))})});
  }
  if(appetite.highlight&&appetite.status!=='owner-confirmed') highlights.push(appetite.highlight);
  return highlights.slice(0,2).map(item=>({...item,calculation:item.text}));
}
