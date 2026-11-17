import {t} from './i18n.js?v=audit1117b';
// 每日加總趨勢（Ian 2026-11-14）：喝水 ml、尿團數、皮下輸液 ml，可切近 7／30 天。
// 未記錄的天畫灰色短線並寫「未記錄」，不當 0；有紀錄但沒填量另外標示。只整理已記下的內容，不做判讀。
import {DAILY_METRIC_IDS,dailyTotals,dailyMetricLabel,dailyMetricUnit,dailyCellText,dailySummaryText,shortDay} from './record-quantity.js?v=1';

const fmt = n => Number(Number(n).toPrecision(10)).toString();
export function dailyTotalsModel(rows = [], {today, days = 7} = {}) {
  return DAILY_METRIC_IDS.map(metric => {
    const list = dailyTotals(rows, {end: today, days, metric});
    return {metric, label: dailyMetricLabel(metric), unit: dailyMetricUnit(metric), days: list, hasAny: list.some(d => d.status !== 'missing'), text: dailySummaryText(list, metric)};
  });
}

export function DailyTotalsCard({react: R, rows = [], today, cardStyle}) {
  const h = R.createElement, [days, setDays] = R.useState(7);
  const model = dailyTotalsModel(rows, {today, days});
  const shown = model.filter(item => item.hasAny || item.metric === 'water');
  const note = text => h('p', {className: 'microcopy left'}, text);
  const chart = item => {
    const max = Math.max(1, ...item.days.map(d => d.total || 0));
    const columns = days > 7 ? 'repeat(30,minmax(0,1fr))' : 'repeat(7,minmax(0,1fr))';
    return h('div', {key: item.metric, className: 'daily-total-metric', 'data-daily-metric': item.metric, style: {margin: '12px 0'}},
      h('h4', {style: {margin: '0 0 6px'}}, t('{label}（每日加總，{unit}）', {label: item.label, unit: item.unit})),
      h('div', {role: 'img', 'aria-label': t('{label}近 {days} 天每日加總：', {label: item.label, days}) + item.days.map(d => `${shortDay(d.date)} ${dailyCellText(d, item.unit)}`).join(t('；')),
        style: {display: 'grid', gridTemplateColumns: columns, gap: days > 7 ? '2px' : '5px', alignItems: 'end'}},
        item.days.map(d => h('div', {key: d.date, title: t('{day}：{value}', {day: shortDay(d.date), value: dailyCellText(d, item.unit)}), style: {textAlign: 'center', minWidth: 0}},
          days <= 7 && h('small', {style: {display: 'block', fontSize: '11px', color: d.status === 'value' ? 'inherit' : '#66707d', overflowWrap: 'anywhere'}}, d.status === 'value' ? fmt(d.total) : d.status === 'unknown' ? t('未填') : t('未記')),
          h('div', {style: {height: '56px', display: 'flex', alignItems: 'end', justifyContent: 'center'}},
            h('div', {className: 'daily-total-bar', 'data-status': d.status, style: {width: days > 7 ? '80%' : '65%', height: d.status === 'value' ? Math.max(4, d.total / max * 52) + 'px' : '2px',
              background: d.status === 'value' ? '#4f7ebc' : d.status === 'unknown' ? '#c9a24a' : '#b6bdc6', borderRadius: '3px 3px 0 0'}})),
          days <= 7 && h('small', {style: {fontSize: '11px', whiteSpace: 'nowrap'}}, shortDay(d.date))))),
      days > 7 && h('div', {style: {display: 'flex', justifyContent: 'space-between', fontSize: '11px'}}, h('small', null, shortDay(item.days[0]?.date)), h('small', null, shortDay(item.days.at(-1)?.date))),
      h('p', {style: {margin: '6px 0 0'}}, item.text),
      h('details', null, h('summary', null, t('逐日數值')), h('ul', {style: {paddingLeft: '18px', margin: '6px 0'}}, [...item.days].reverse().map(d => h('li', {key: d.date}, t('{day}：{value}', {day: shortDay(d.date), value: dailyCellText(d, item.unit)}))))));
  };
  return h('article', {style: cardStyle, 'data-testid': 'vet-daily-totals'},
    h('h3', null, t('每日加總')),
    h('div', {role: 'group', 'aria-label': t('加總期間'), style: {display: 'flex', gap: '8px', margin: '6px 0'}},
      [7, 30].map(value => h('button', {key: value, type: 'button', className: 'secondary-btn', 'aria-pressed': days === value, style: {minHeight: '40px', padding: '6px 14px', fontWeight: days === value ? 700 : 400}, onClick: () => setDays(value)}, t('近 {value} 天', {value})))),
    note(t('{v0} 至 {v1} · 藍色是已填量的加總；黃色是有紀錄但沒填量；灰線是未記錄，不代表 0。', {v0: shortDay(dailyTotals([], {end: today, days, metric: 'water'})[0]?.date || today), v1: shortDay(today)})),
    shown.map(chart),
    model.filter(item => !shown.includes(item)).length > 0 && note(t('這段期間沒有{v0}紀錄。', {v0: model.filter(item => !shown.includes(item)).map(item => item.label).join(t('、'))})),
    note(t('喝水量只加總「喝下的水量」，水碗補水量不算喝下的水；尿團數只加總清砂時填的團數，不等於排尿次數。')));
}
