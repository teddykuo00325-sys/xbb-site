import {t, K} from './i18n.js?v=audit1117b';
import {displayStoredText} from './stored-text.js?v=i18n1';
// Today cards are a pure projection of the selected cat's saved data.
// No random, session, visibility, loading, demo, or persisted card-state flags.
export const localCalendarDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
// Use the local clock, so a calendar date never compares against UTC by accident.
export function laterToday(date,time,now=new Date()) {
  return localObservationCutoff(now)(date,time);
}
export function localObservationCutoff(now=new Date()) {
  const clock=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(clock.getTime()))return ()=>false;
  const day=localCalendarDate(clock),minute=`${String(clock.getHours()).padStart(2,'0')}:${String(clock.getMinutes()).padStart(2,'0')}`;
  return (date,time)=>date===day&&time>minute&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
export function calendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(value+'T12:00:00Z');
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0,10) === value ? Math.floor(parsed/86400000) : null;
}
export function useLocalDay(R) {
  const [,setDay] = R.useState(localCalendarDate);
  R.useEffect(()=>{
    let midnight;
    const refresh=()=>{
      setDay(localCalendarDate());
      clearTimeout(midnight);
      const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
      midnight=setTimeout(refresh,Math.max(1,next.getTime()-now.getTime()+25));
    };
    const visible=()=>{if(document.visibilityState!=='hidden')refresh();};
    refresh();
    // The interval also catches timezone/manual-clock changes while already open.
    const clock=setInterval(refresh,60000);
    window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visible);
    return()=>{clearTimeout(midnight);clearInterval(clock);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visible);};
  },[]);
  // Read synchronously on every render, including navigation and cat switches.
  return localCalendarDate();
}
const own=(o,key)=>Object.prototype.hasOwnProperty.call(o,key);
const belongs=(row,catId)=>row && row.ownership!=='unconfirmed' && (!own(row,'catId') || row.catId!==null && row.catId===catId);
const demo=row=>row.demo===true || String(row.source||'').includes(K('示範')) || row.source===K('聲音反應');
const compare=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.id.localeCompare(b.id);
const distinct=rows=>{const ids=new Set();return rows.filter(row=>{if(ids.has(row.id))return false;ids.add(row.id);return true;});};
export function demoCare(item,seeds=[]) {
  return demo(item) || seeds.some(seed=>['id','kind','name','last','next','lead','note','enabled'].every(key=>item[key]===seed[key]) && JSON.stringify(item.history??[])===JSON.stringify(seed.history??[]));
}
function numericWeight(row) {
  // The form records kilograms. Historical explicit kg is also a weight unit,
  // but separate units are never combined to reach the two-record threshold.
  const value=typeof row.amount==='string'?row.amount.trim():'';
  return row.category===K('體重') && [K('公斤'),'kg',K('公克'),'g'].includes(row.unit) && value!=='' && Number.isFinite(Number(value)) && Number(value)>0;
}
export function reminderSummary(items,today) {
  const todayDay=calendarDay(today);
  if(!items.length)return {headline:t('尚未設定提醒'),detail:t('可新增疫苗或驅蟲提醒。')};
  const active=items.filter(item=>item.enabled===true);
  if(!active.length)return {headline:t('提醒已暫停'),detail:t('已設定 {n} 項，可點開管理。', {n: items.length})};
  const scheduled=active.filter(item=>{
    const last=[item.last,...(Array.isArray(item.history)?item.history:[])].filter(date=>calendarDay(date)!==null).sort().at(-1);
    return calendarDay(item.next)!==null && (!last||item.next>last);
  }).sort((a,b)=>a.next.localeCompare(b.next)||a.id.localeCompare(b.id));
  const due=scheduled.filter(item=>calendarDay(item.next)-todayDay<=Math.max(0,Number(item.lead)||0));
  if(due.length){const item=due[0],days=calendarDay(item.next)-todayDay;return {headline:t('{n} 項待留意', {n: due.length}),detail:`${item.name} · ${days<0?t('逾期 {days} 天', {days: -days}):days===0?t('今天到期'):t('{days} 天後到期', {days})}`};}
  const pending=active.length-scheduled.length;
  if(pending)return {headline:t('{pending} 項待安排日期', {pending}),detail:t('請依照護安排設定下次日期。')};
  return {headline:t('目前沒有到期提醒'),detail:t('下次：{next} {name}', {next: scheduled[0].next, name: scheduled[0].name})};
}
export function todayOverviewModel({entries=[],careItems=[],today=localCalendarDate(),now=new Date(),catId,isDemo=demo,isDemoCare=demoCare}={}) {
  const day=calendarDay(today);
  const late=localObservationCutoff(now);
  const eligible=distinct(entries.filter(row=>belongs(row,catId)&&typeof row.id==='string'&&row.id&&typeof row.text==='string'&&row.text.trim()&&typeof row.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)&&calendarDay(row.date)!==null&&calendarDay(row.date)<=day&&(!row.feeding||!late(row.date,row.time))&&!demo(row)&&!isDemo(row)&&row.draft!==true&&row.confirmed!==false).sort(compare));
  const todayRows=eligible.filter(row=>row.date===today);
  const recent=eligible.filter(row=>calendarDay(row.date)>=day-6);
  const weightRows=recent.filter(numericWeight),groups=new Map();
  for(const row of weightRows){const key=row.unit;groups.set(key,[...(groups.get(key)||[]),row]);}
  const weights=[...groups.values()].filter(rows=>rows.length>=2).sort((a,b)=>compare(b.at(-1),a.at(-1))||a[0].unit.localeCompare(b[0].unit));
  const care=distinct(careItems.filter(row=>belongs(row,catId)&&typeof row.id==='string'&&row.id&&typeof row.name==='string'&&row.name.trim()&&!isDemoCare(row)));
  return {today,food:todayRows.filter(row=>row.category===K('飲食')),observations:todayRows.filter(row=>[K('排泄'),K('嘔吐'),K('喝水'),K('其他'),K('聲音反應')].includes(row.category)),weight:weightRows.length>=2?weightRows:[],trends:weights,reminders:reminderSummary(care,today)};
}
// 2026-11-14：存檔的自動產生文字在英文介面要顯示英文。
const excerpt=raw=>{const text=displayStoredText(raw);return text.length>70?text.slice(0,70)+'…':text;};
const at=row=>`${row.date.slice(5).replace('-','/')} ${row.time}`;
export function TodayOverview({react:R,onRecords,onSummary,onReminders,...data}) {
  const h=R.createElement,m=todayOverviewModel(data),cards=[];
  const card=(key,title,headline,detail,onClick)=>h('button',{type:'button',key,'data-today-card':key,onClick},h('span',null,title),h('strong',null,headline),h('small',null,detail));
  cards.push(card('food',t('今天吃到什麼'),m.food.length?t('{n} 筆餵食紀錄', {n: m.food.length}):t('今天尚無餵食紀錄'),m.food.length?excerpt(m.food.at(-1).text):t('記下一餐，方便之後回顧。'),()=>onRecords(K('飲食'),m.today)));
  cards.push(card('reminders',t('提醒'),m.reminders.headline,m.reminders.detail,onReminders));
  if(m.weight.length){const latest=m.weight.at(-1);cards.push(card('weight',t('體重'),`${latest.amount} ${t(latest.unit)}`,t('近 7 天 {n} 筆 · 最近 {latest}', {n: m.weight.length, latest: at(latest)}),()=>onRecords(K('體重'),latest.date)));}
  if(m.observations.length)cards.push(card('observations',t('貓咪觀察'),t('{n} 筆今日觀察', {n: m.observations.length}),excerpt(m.observations.at(-1).text),()=>onRecords(K('全部'),m.today)));
  if(m.trends.length)cards.push(card('trends',t('健康趨勢'),t('近 7 天體重紀錄'),m.trends.map(rows=>{const first=rows[0],last=rows.at(-1);return t('{from}：{amount} {unit} → {to}：{amount2} {unit2}（{n} 筆）', {from: at(first), amount: first.amount, unit: t(first.unit), to: at(last), amount2: last.amount, unit2: t(last.unit), n: rows.length});}).join(t('；')),()=>onSummary(K('體重'))));
  return h('section',{className:'today-overview','aria-label':t('今日摘要')},h('h2',null,t('今日摘要')),h('div',{className:'today-overview-grid'},cards),h('p',null,t('只依目前毛孩的實際紀錄顯示，不計示範或未確認歸屬的資料。近 7 天含今天；體重須有兩筆數值，趨勢只比較同單位。未記錄不代表正常，趨勢不提供診斷。')));
}
