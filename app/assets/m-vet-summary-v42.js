import {mealQuantityText} from './clear-presentation.js?v=audit1117';
import {waterKind} from './record-summary.js?v=8f5745b7843b';
import {t, K} from './i18n.js?v=audit1117b';

/** M3: presentation-only wording. Never change stored records or infer measurements. */
const escapeRegExp=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const quantityPattern=/\d+(?:\.\d+)?/;
export function compactSummarySentence(value=''){
 let text=String(value);
 // Remove only a repeated whole phrase, never equal bare numbers in independent facts.
 text=text.replace(/([^。；\n（）]{3,})（([^（）]*)）/g,(whole,front,inside)=>{
  const lead=front.trim(),body=inside.trim();
  if(!quantityPattern.test(lead))return whole;
  const candidates=[lead,...lead.split(/[：:]/).slice(1)].filter(x=>x.length>=3);
  const repeated=candidates.find(x=>body===x||body.startsWith(x+'，')||body.startsWith(x+'、'));
  if(!repeated)return whole;
  let rest=body.slice(repeated.length).replace(/^[，、]\s*/,'');
  const unit=lead.match(/(公斤|公克|kg|g|毫升|ml|餐|次|筆)$/)?.[1];
  if(unit&&new RegExp('^[+-]\\d+(?:\\.\\d+)?\\s*'+escapeRegExp(unit)+'$','i').test(rest))rest=rest.replace(new RegExp('\\s*'+escapeRegExp(unit)+'$','i'),'');
  return front+(rest?'（'+rest+'）':'');
 });
 return text;
}
export function summaryRecordContent(row,kind='record'){
 const raw=(kind==='change'?row.note:row.text)?.trim()||'',text=compactSummarySentence(raw);
 // A saved meal already has separate offered and eaten quantities in its text.
 // Its compatibility amount field mirrors the offered amount.
 if(kind==='record'&&row.category===K('飲食')&&row.feeding)return text||mealQuantityText(row);
 const amount=kind==='record'&&String(row.amount??'').trim()?`${row.amount} ${row.unit||''}`.trim():'';
 if(kind==='record'&&row.category===K('喝水')&&waterKind(row)==='refill'){
  const refill=text.replace(/^(?:水碗)?補水(?:一次|1次| 1 次)?(?:[；;]\s*|$)/,'');
  return [t('水碗補水（非喝入量）'),refill,amount&&t('補水量 {amount}', {amount})].filter(Boolean).join(' · ');
 }
 if(!amount)return text;
 const aliases={公斤:K('(?:公斤|kg)'),kg:K('(?:公斤|kg)'),公克:K('(?:公克|g)'),g:K('(?:公克|g)'),毫升:K('(?:毫升|ml)'),ml:K('(?:毫升|ml)')};
 const unit=aliases[row.unit]||escapeRegExp(row.unit||'');
 const num=Number(row.amount),number=Number.isFinite(num)?escapeRegExp(String(num))+(String(num).includes('.')?'0*':'(?:\\.0+)?'):escapeRegExp(row.amount);
 const exactQuantity=new RegExp('^'+number+'\\s*'+unit+'$','i');
 // Only explicit current-record labels qualify. Historical or comparative prose
 // stays intact even when its numeric value equals the structured measurement.
 const labelledWeight=row.category===K('體重')&&new RegExp(K('(?:^|[｜·，；。\\n])\\s*(?:目前|這次|本次|今天)?(?:體重|量體重|秤重)\\s*[：:]?\\s*')+number+'\\s*'+unit+'(?:[。！!]|$)','i').test(text);
 const semanticLabels={[K('飲食')]:K('(?:實際吃下量|吃下量|吃下量|吃下|吃了|吃掉|實吃)'),[K('嘔吐')]:K('(?:嘔吐|吐了|吐毛球)'),[K('喝水')]:K('(?:飲水量|喝水|喝下|喝了)')};
 const label=semanticLabels[row.category];
 // The appended amount is the consumed/observed quantity, never the offered
 // quantity, food-label mass, body weight, time, or a separate comparison.
 const labelledQuantity=label&&new RegExp(K('(?:^|[｜·，；。\\n])\\s*(?:目前|這次|本次|今天|早餐|午餐|晚餐|點心)?')+label+'\\s*[：:]?\\s*'+number+'\\s*'+unit+'(?=[，。；！!?？、\\s]|$)','i').test(text);
 return exactQuantity.test(text)||labelledWeight||labelledQuantity?text:[text,amount].filter(Boolean).join(' · ');
}
export function summaryRange(start,end,label=t('選取期間')){
 return t('{label}（{start} 至 {end}）', {label, start: String(start||'').replaceAll('-','/'), end: String(end||'').replaceAll('-','/')});
}
export function shiftSummaryDate(date,days){return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10)}
export function vetObservationParagraphs(item,today){
 const text=compactSummarySentence(item.calculation||item.text||'');
 if(item.id==='stool'&&item.stoolDetails){
  const {recentCount,priorCount,recentDays,priorDays,comparable,explanation}=item.stoolDetails;
  const prior=priorDays?t('軟便／腹瀉記錄 {priorCount} 筆；有分類排泄記錄 {priorDays} 天。', {priorCount, priorDays}):t('沒有可比較紀錄。');
  return [summaryRange(shiftSummaryDate(today,-2),today,t('最近 3 天'))+t('：軟便／腹瀉記錄 {recentCount} 筆；有分類排泄記錄 {recentDays} 天。', {recentCount, recentDays}),
   summaryRange(shiftSummaryDate(today,-9),shiftSummaryDate(today,-3),t('之前 7 天'))+'：'+prior,
   (priorDays&&!comparable?t('兩段期間的紀錄天數不足，暫不比較。'):'')+explanation];
 }
 if(item.id==='appetite'){
  const match=text.match(/^(.*?) 已記錄吃下量分別為 (.*?) 公克，連續 2 天低於之前 7 日已記錄日均 (.*?) 公克的一半（同一食品）。([\s\S]*)$/);
  if(match)return [summaryRange(shiftSummaryDate(today,-2),shiftSummaryDate(today,-1),t('前日與昨日'))+t('：已記錄吃下量依序為 {match} 公克。', {match: match[2]}),summaryRange(shiftSummaryDate(today,-9),shiftSummaryDate(today,-3),t('之前 7 天'))+t('：同一食品已記錄日均 {match} 公克；上述兩日均低於此基準一半。', {match: match[3]}),match[4]];
 }
 if(item.id==='weight')return [summaryRange(shiftSummaryDate(today,-29),today,t('最近 30 天'))+'：'+text];
 return [text];
}
