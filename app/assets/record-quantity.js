import {t, K} from './i18n.js?v=audit1117b';
// 紀錄數量、食慾歸類、皮下輸液、每日加總與體重變化（Ian 2026-11-14 測試回報）。
// 純函式、沒有 import：列表、摘要、趨勢圖與匯出共用同一套口徑。只整理已記下的內容，不改原紀錄、不做診斷。
const clean = value => String(value ?? '').trim();
const numeric = value => { const text = clean(value); if (!/^\d+(?:\.\d+)?$/.test(text)) return null; const n = Number(text); return Number.isFinite(n) ? n : null; };
const round = n => Number(Number(n).toPrecision(10)).toString();
const DAY = 864e5;
const dayNumber = date => { const text = clean(date), time = Date.parse(text + 'T12:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(time) ? Math.floor(time / DAY) : null; };
const isoFromDay = day => new Date(day * DAY + 432e5).toISOString().slice(0, 10);
export const shortDay = date => clean(date).slice(5).replace('-', '/');

// ── 皮下輸液：放在「其他」下的一種，沿用既有欄位（metric／amount／unit），備份格式不用新增欄位。
export const SUBQ_METRIC = 'subq-fluid';
export const SUBQ_LABEL_SOURCE = K('皮下輸液');
export const SUBQ_LABEL = t(SUBQ_LABEL_SOURCE);
const ML_UNITS = ['ml', 'mL', 'ML', K('毫升'), 'cc'];
export const isMlUnit = unit => ML_UNITS.includes(clean(unit));
export const isSubqFluid = row => row?.category === K('其他') && row.metric === SUBQ_METRIC;
export const subqFluidMl = row => isSubqFluid(row) && isMlUnit(row.unit) ? numeric(row.amount) : null;

// ── 食慾與餵食：一鍵快記「沒吃完」= 食慾「吃得比平常少」；語音存的餵食（只有文字）仍算一餐。
export const APPETITE_LABELS = Object.freeze({usual: t('食慾和平常差不多'), less: t('吃得比平常少'), more: t('吃得比平常多'), none: t('觀察時沒有進食')});
export const LEGACY_APPETITE_TEXT = K('沒吃完');
export const isTextMeal = row => row?.category === K('飲食') && !row.feeding && row.metric === 'food';
export function appetiteStatusOf(row) {
  if (row?.category !== K('飲食') || row.feeding || isTextMeal(row)) return '';
  if (typeof row.appetiteStatus === 'string' && Object.hasOwn(APPETITE_LABELS, row.appetiteStatus)) return row.appetiteStatus;
  return clean(row.text) === LEGACY_APPETITE_TEXT ? 'less' : '';
}
export const isAppetiteRecord = row => row?.category === K('飲食') && !row.feeding && !isTextMeal(row) &&
  (Boolean(appetiteStatusOf(row)) || row.metric === 'appetite' || row.observationSummaryVersion === 1);

/** 顯示用的種類名稱：列表、摘要來源與匯出都用這個，不改存檔的 category。 */
export function recordKindLabel(row) {
  if (!row) return '';
  if (row.careId) return t('疫苗與驅蟲');
  if (row.category === K('飲食')) return row.feeding || isTextMeal(row) ? t('餵食') : isAppetiteRecord(row) ? t('食慾') : t('飲食觀察');
  if (row.category === K('其他')) return isSubqFluid(row) ? SUBQ_LABEL : row.metric === 'mood' ? t('精神') : t('其他');
  if (row.category === K('照護施作')) return t('疫苗與驅蟲');
  if (row.category === K('聲音反應')) return t('聲音探索');
  return clean(row.category) ? t(clean(row.category)) : t('其他');
}

// ── 列表上直接看到數量。標題已經寫了同一個數字時不重複。
const isLitter = row => row?.category === K('排泄') && typeof row.urineStatus === 'string' && row.urineStatus.startsWith('litter');
export function recordAmountText(row, title = '') {
  if (!row || row.feeding || row.careId) return '';
  const amount = clean(row.amount), unit = clean(row.unit);
  if (!amount) return '';
  const shown = clean(title || row.text);
  const already = shown.includes(amount + ' ' + unit) || shown.includes(amount + unit);
  if (row.category === K('喝水')) return already ? '' : `${row.waterAction === 'refill' ? t('補水量') : t('喝水量')} ${amount} ${t(unit || 'ml')}`;
  if (isSubqFluid(row)) return already ? '' : t('輸液量 {amount} {unit}', {amount, unit: t(unit || 'ml')});
  if (isLitter(row)) return already ? '' : t('尿團 {amount} {unit}', {amount, unit: unit ? t(unit) : t('團')});
  if (row.category === K('體重')) return already ? '' : `${amount} ${unit ? t(unit) : t('公斤')}`;
  if (row.category === K('嘔吐')) return already ? '' : `${amount} ${unit ? t(unit) : t('次')}`;
  return already ? '' : t('數量 {amount}{unit}', {amount, unit: unit ? ' ' + t(unit) : ''});
}

// ── 疫苗與驅蟲完成：顯示飼主填的名稱（提醒名稱、藥名、劑量），不再寫「未保存」。
export function careDoneName(row) {
  const item = row?.item || {};
  const name = clean(item.name) || clean(row?.text) || t('疫苗或驅蟲');
  const medicine = clean(item.medicine), dose = clean(item.confirmedDose) || clean(item.dose);
  return name + (medicine && medicine !== name ? t('（{medicine}）', {medicine}) : '') + (dose ? ` · ${dose}` : '');
}

// ── 每日加總：喝水 ml、尿團數、皮下輸液 ml。沒有紀錄的天標「未記錄」，不當 0。
const waterIntake = row => row?.category === K('喝水') && row.waterAction !== 'refill';
const DAILY_METRICS = Object.freeze({
  water: {label: t('喝水量'), unit: 'ml', match: waterIntake, value: row => isMlUnit(row.unit) ? numeric(row.amount) : null},
  litter: {label: t('尿團數'), unit: t('團'), match: isLitter, value: row => clean(row.unit) === K('團') && /^\d+$/.test(clean(row.amount)) ? Number(clean(row.amount)) : null},
  subq: {label: SUBQ_LABEL, unit: 'ml', match: isSubqFluid, value: subqFluidMl},
});
export const DAILY_METRIC_IDS = Object.freeze(Object.keys(DAILY_METRICS));
export const dailyMetricLabel = id => DAILY_METRICS[id]?.label || id;
export const dailyMetricUnit = id => DAILY_METRICS[id]?.unit || '';
export function dailyRange(end, days) {
  const last = dayNumber(end);
  if (last === null || !Number.isInteger(days) || days < 1) return [];
  return Array.from({length: days}, (_, i) => isoFromDay(last - days + 1 + i));
}
/** status：missing（這天沒有這類紀錄）、unknown（有紀錄但都沒填量）、value（已填量合計；partial 表示部分沒填量）。 */
export function dailyTotals(rows = [], {end, days = 7, metric = 'water'} = {}) {
  const spec = DAILY_METRICS[metric];
  if (!spec) return [];
  const list = rows.filter(row => row && spec.match(row));
  return dailyRange(end, days).map(date => {
    const dayRows = list.filter(row => row.date === date), values = dayRows.map(spec.value), known = values.filter(v => v !== null);
    const total = known.reduce((sum, n) => sum + n, 0);
    return {date, records: dayRows.length, known: known.length, unknown: dayRows.length - known.length, total: known.length ? total : null,
      status: !dayRows.length ? 'missing' : known.length ? 'value' : 'unknown', partial: known.length > 0 && known.length < dayRows.length};
  });
}
export function dailyCellText(day, unit) {
  if (day.status === 'missing') return t('未記錄');
  if (day.status === 'unknown') return t('{records} 筆，未填量', {records: day.records});
  return `${round(day.total)} ${unit}${day.partial ? t('（另 {unknown} 筆未填量）', {unknown: day.unknown}) : ''}`;
}
export function dailySummaryText(list, metric) {
  const unit = dailyMetricUnit(metric), label = dailyMetricLabel(metric), withValue = list.filter(d => d.status === 'value'), missing = list.filter(d => d.status === 'missing').length;
  if (!list.some(d => d.status !== 'missing')) return t('近 {n} 天沒有{label}紀錄；未記錄不代表 0 或沒有發生。', {n: list.length, label});
  const totals = withValue.map(d => d.total), average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
  return t('近 {n} 天：{withValue} 天有填量{average}；{missing} 天未記錄（不當 0）。', {n: list.length, withValue: withValue.length, average: average !== null ? t('，這些天平均每天 {avg} {unit}', {avg: round(Math.round(average * 10) / 10), unit}) : '', missing});
}
/** 期間內（start～end）的已填量合計，給摘要與匯出用。 */
export function periodTotal(rows = [], {start = '', end = '', metric = 'water'} = {}) {
  const spec = DAILY_METRICS[metric];
  if (!spec) return null;
  const list = rows.filter(row => row && spec.match(row) && (!start || row.date >= start) && (!end || row.date <= end));
  const known = list.map(row => ({row, value: spec.value(row)})).filter(x => x.value !== null);
  return {records: list.length, known: known.length, unknown: list.length - known.length, total: known.reduce((sum, x) => sum + x.value, 0),
    days: new Set(list.map(row => row.date)).size, valueDays: new Set(known.map(x => x.row.date)).size};
}
export function periodTotalLine(rows, options) {
  const tot = periodTotal(rows, options);
  if (!tot || !tot.records) return '';
  const label = dailyMetricLabel(options.metric), unit = dailyMetricUnit(options.metric);
  return t('{label}：{records} 筆、{days} 天有記錄', {label, records: tot.records, days: tot.days}) + (tot.known ? t('；已填量合計 {total} {unit}（{valueDays} 天）', {total: round(tot.total), unit, valueDays: tot.valueDays}) : t('；都沒有填量')) + (tot.known && tot.unknown ? t('，另 {unknown} 筆未填量不計入', {unknown: tot.unknown}) : '') + t('。');
}

// ── 體重變化：期間首末兩筆量測的公斤差與百分比。只比較已記錄的量測。
const signedText = (n, digits) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toFixed(digits);
export const WEIGHT_TREND_DAYS = 90;
export function weightChange(rows = []) {
  const list = rows.filter(row => Number.isFinite(row?.kg) && row.kg > 0).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  if (list.length < 2) return null;
  const first = list[0], last = list.at(-1), kg = last.kg - first.kg, start = dayNumber(first.date), end = dayNumber(last.date);
  return {first, last, count: list.length, kg, percent: kg / first.kg * 100, spanDays: start === null || end === null ? 0 : end - start};
}
export const spanText = days => days >= 45 ? t('{count} 個月', {count: Math.round(days / 30)}) : days >= 14 ? t('{count} 週', {count: Math.round(days / 7)}) : t('{count} 天', {count: days});
export function weightChangeText(change) {
  if (!change) return '';
  return t('{from} {fromKg} kg → {to} {toKg} kg（{kg} kg，{percent}%）', {from: shortDay(change.first.date), fromKg: round(change.first.kg), to: shortDay(change.last.date), toKg: round(change.last.kg), kg: signedText(change.kg, 2), percent: signedText(change.percent, 1)});
}
/** 溫和提醒：下降 5% 以上或上升 10% 以上才寫；一律標「一般建議」，不判讀原因。 */
export function weightAdvice(change) {
  if (!change || change.spanDays < 1) return '';
  const percent = Math.round(Math.abs(change.percent));
  if (change.percent <= -5) return t('一般建議：體重近 {span}下降約 {percent}%，可在回診時和獸醫討論。', {span: spanText(change.spanDays), percent});
  if (change.percent >= 10) return t('一般建議：體重近 {span}上升約 {percent}%，可在回診時和獸醫討論。', {span: spanText(change.spanDays), percent});
  return '';
}

// ── 體重合理範圍：超出時請飼主再確認，不硬擋（貓：0.1–20 公斤）。
export const WEIGHT_CONFIRM_RANGE = Object.freeze({min: 0.1, max: 20});
export function weightRangeIssue(amount) {
  const n = numeric(amount);
  if (n === null || n <= 0) return '';
  if (n > WEIGHT_CONFIRM_RANGE.max) return t('{v0} 公斤比一般貓咪重很多，請確認單位與小數點（例如 4.2 而不是 42）。', {v0: round(n)});
  if (n < WEIGHT_CONFIRM_RANGE.min) return t('{v0} 公斤非常輕，請確認是不是填成公斤以外的單位。', {v0: round(n)});
  return '';
}
