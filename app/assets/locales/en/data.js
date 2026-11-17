// 英文字典：data（2026-11-14 英文收尾，由負責該項的同事維護；key 是繁中原句）。
// 這一區是「寫進資料的中文」在英文介面的顯示（assets/stored-text.js）與英文介面新建的示範資料。
// key 是存檔句型本身；{name}、{note} 這類使用者內容原樣代入。
export default {
  // ---- 結構化觀察（舊紀錄或「；」接備註時用）----
  '吐了 {count} 次': {one: 'Vomited {count} time', other: 'Vomited {count} times'},
  '吐毛球 {count} 次': {one: 'Threw up a hairball {count} time', other: 'Threw up a hairball {count} times'},
  '發現嘔吐物（發生時間不確定），已確認 {count} 次': {one: 'Found vomit (time unknown), {count} time confirmed', other: 'Found vomit (time unknown), {count} times confirmed'},
  '發現嘔吐物（發生時間不確定），次數未記': 'Found vomit (time unknown), times not noted',
  '皮下輸液 {qty}': 'Subcutaneous fluids {qty}',
  '皮下輸液，量未記': 'Subcutaneous fluids, amount not noted',
  '；{note}': '; {note}',

  // ---- 餵食紀錄自動產生的文字 ----
  '{name}｜餵了 {provided} {unit} · 吃了 {eaten} {unit2}': '{name} | Fed {provided} {unit} · Ate {eaten} {unit2}',
  '{name}｜餵了 {provided} {unit} · 吃下量未記錄': '{name} | Fed {provided} {unit} · Eaten amount not recorded',
  '{name}｜餵食量 {qty} · 吃下量 {qty2}': '{name} | Fed {qty} · Ate {qty2}',
  '{name}（v{version}）｜提供 {qty}，吃下 {qty2}': '{name} (v{version}) | Offered {qty}, ate {qty2}',

  // ---- 換糧／生活變化註記 ----
  '開始使用 {name}（首次記錄此食品）': 'Started {name} (first time logging this food)',
  '開始使用 {name}（{kind}）v{version}': 'Started {name} ({kind}) v{version}',
  '更正餐點食品：{text}': 'Meal food corrected: {text}',
  '換糧前：{before}；換糧後：{after}；想觀察：{question}': 'Before the switch: {before}; after the switch: {after}; watching for: {question}',
  '換糧前：{before}；換糧後：{after}': 'Before the switch: {before}; after the switch: {after}',
  '{name}（v{version}，ID {id}）': '{name} (v{version}, ID {id})',
  '未填／未知': 'Not filled in / unknown',

  // ---- 多貓共用食盆／家庭清砂 ----
  '共用食盆：開始 {initial} g、期間補入 {added} g、結束剩 {left} g，全家約吃下 {eaten} g（未分到個別毛孩）': 'Shared bowl: started {initial} g, added {added} g, {left} g left at the end; the household ate about {eaten} g (not assigned to a pet)',
  '共用食盆：補了 {added} g、剩 {left} g，全家約吃下 {eaten} g（未分到個別毛孩）': 'Shared bowl: added {added} g, {left} g left; the household ate about {eaten} g (not assigned to a pet)',
  '家庭清砂：尿團 {urine} 團、便便 {stool} 坨（未分到個別毛孩）': 'Household litter: urine clumps {urine}, stools {stool} (not assigned to a pet)',
  '共用食盆指派：開始 {initial} g、期間補入 {added} g、結束剩 {left} g，約吃下 {eaten} g': 'Shared bowl (assigned): started {initial} g, added {added} g, {left} g left at the end; ate about {eaten} g',
  '共用食盆指派：補了 {added} g、剩 {left} g，約吃下 {eaten} g': 'Shared bowl (assigned): added {added} g, {left} g left; ate about {eaten} g',
  '清砂時發現尿團 {n} 團（家庭清砂指派）': {one: 'Found {n} urine clump while scooping (household litter, assigned)', other: 'Found {n} urine clumps while scooping (household litter, assigned)'},
  '清砂時發現便便 {n} 坨（家庭清砂指派）': {one: 'Found {n} stool while scooping (household litter, assigned)', other: 'Found {n} stools while scooping (household litter, assigned)'},
  '坨': 'stools',

  // ---- 文字快記 ----
  '文字快記・{model} 本機整理・已核對': 'Quick note · {model} on-device · reviewed',

  // ---- 記錄方式（source）----
  '照護任務手動記錄': 'Entered manually in a care task',
  '家庭共用紀錄': 'Household shared record',
  '家庭紀錄指派': 'Assigned from household record',

  // ---- 示範資料（英文介面建立時直接寫英文；舊的中文示範顯示時翻譯）----
  '吐了 1 次': 'Vomited once',
  '吐毛球 1 次': 'Threw up a hairball once',
  '開始換新乾乾': 'Started the new dry food',
  '晚餐吃了一罐': 'Ate a whole can at dinner',
  '早餐吃得比平常少': 'Ate less than usual at breakfast',
  '改吃新的乾乾（示範）': 'Switched to a new dry food (demo)',
  '疫苗回診確認': 'Vaccine follow-up check',
  '驅蟲照護': 'Deworming care',
  '示範日期，請照獸醫說的調整。': 'Demo date. Adjust it to what your vet says.',
  '示範日期，不代表建議用藥週期。': 'Demo date. Not a recommended dosing schedule.',
  '雞肉主食罐': 'Chicken complete wet food',
  '雞肉、水、雞肝、礦物質（虛構示範資料）': 'Chicken, water, chicken liver, minerals (fictional demo data)',
};
