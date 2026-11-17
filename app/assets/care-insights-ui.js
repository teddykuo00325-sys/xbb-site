import {buildCareInsights,careInsightQuantity,CARE_INSIGHT_SOURCES} from './care-insights-model.js?v=photo-simplify1';
import {t} from './i18n.js?v=audit1117b';

export function CareInsights({react:R,...input}){
 const h=R.createElement,m=buildCareInsights(input);
 const ref=key=>{const s=m.sourceByKey.get(key);if(!s)return null;return h('details',{key:s.key,className:'care-insight-source','data-diet-view':'source:'+s.key},h('summary',null,`${s.date} · ${s.time||t('時間未知')}${s.approximate?t(' · 日期約略'):''} · ${s.label}`),h('p',null,s.text),h('small',null,t('來源：{method} · ID {id}', {method: s.method, id: s.id})),s.kind==='record'&&input.onRecord&&h('button',{type:'button',className:'text-btn',onClick:e=>input.onRecord(s.row,e?.currentTarget),'data-diet-view':'open:'+s.key,'aria-label':t('開啟原紀錄 ')+s.id},t('開啟原紀錄')));};
 const refs=(keys,id='')=>h('details',{className:'care-insight-evidence','data-diet-view':'evidence:'+id},h('summary',null,t('查看來源（{count} 筆）', {count: keys.length})),keys.map(ref));
 const stepList=steps=>h('ul',{className:'care-insight-next'},steps.map(step=>h('li',{key:step.id},h('p',null,step.text),step.sourceKeys.length>0&&refs(step.sourceKeys,step.id))));
 return h('section',{className:'care-insights','aria-label':t('照護小提醒')},h('h3',null,t('照護小提醒')),h('p',{className:'care-insight-mode'},t('免費 · 本機固定規則，不使用 AI、不上傳')),
 h('p',{className:'care-insight-safety'},t('若有呼吸困難、昏倒、抽搐或無法排尿，請立即聯絡急診獸醫；持續完全不進食請儘速聯絡獸醫，不必等紀錄。')),
 m.error?h('p',{role:'status'},m.error):h(R.Fragment,null,
 m.noEating.length>0&&h('div',{role:'alert',className:'diet-urgent'},m.noEating.map(n=>h('div',{key:n.sourceKey},h('p',null,n.text),refs([n.sourceKey],'urgent:'+n.sourceKey)))),
 h('p',{className:'care-insight-coverage'},t('{start} 至 {end} · {foodDays} 天有飲食紀錄 · {mealCount} 餐', {start: String(m.start||'').replaceAll('-','/'), end: String(m.end||'').replaceAll('-','/'), foodDays: m.coverage.foodDays, mealCount: m.coverage.mealCount})),
 m.coverage.conflicts>0&&h('p',{role:'status'},t('{conflicts} 個重複識別碼內容不同，已排除，請先核對原資料。', {conflicts: m.coverage.conflicts})),
 h('h4',null,t('現在可以做什麼')),stepList(m.nextSteps.slice(0,2)),
 m.nextSteps.length>2&&h('details',null,h('summary',null,t('更多可核對項目（{count} 項）', {count: m.nextSteps.length-2})),stepList(m.nextSteps.slice(2))),
 h('details',{className:'care-insight-pairs','data-diet-view':'care-pairs'},h('summary',null,t('同日紀錄一起回顧（{count} 餐）', {count: m.associations.length})),h('p',null,t('僅按同一紀錄日期並列，不代表因果或統計相關。顯示裝置本地日期與原填寫時間；缺時間不補成午夜，日期約略也不判定餐前或餐後。')),m.associations.length?m.associations.map(a=>h('article',{key:a.key,'data-diet-view':'meal:'+a.key},h('strong',null,`${a.date} · ${a.time||t('時間未知')} ${t('· 已記錄一餐')}`),a.foods.map(f=>h('p',{key:f.sourceKey},`${t('{name} · 當時版本', {name: f.name})} ${f.version??t('未知')} ${t('· 吃下 {f}', {f: careInsightQuantity(f)})}`)),refs([...a.sources,...a.related].map(s=>s.key)))):h('p',null,t('尚無可並列的同日紀錄。'))),
 h('details',{className:'care-insight-all','data-diet-view':'care-all'},h('summary',null,t('完整來源與未知事項（{sourceCount} 筆）', {sourceCount: m.coverage.sourceCount})),h('p',null,m.sufficiency),h('p',null,t('此範圍 {count} 天沒有可用紀錄，不代表沒有吃飯或沒有症狀。', {count: m.coverage.missingDays.length})),m.coverage.missingDays.length>0&&h('p',null,t('沒有可用紀錄的日期：')+m.coverage.missingDays.join(t('、'))),m.sources.map(s=>ref(s.key)))),
 h('details',{className:'care-insight-about','data-diet-view':'care-about'},h('summary',null,t('整理方式與安全提醒')),h('p',null,m.mode),h('p',null,m.limits),h('p',null,m.safety),h('a',{href:CARE_INSIGHT_SOURCES.cornell,target:'_blank',rel:'noopener noreferrer'},t('Cornell：貓咪不進食'))));
}
