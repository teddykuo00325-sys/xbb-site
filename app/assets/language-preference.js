// 設定頁「語言」選項（2026-11-14 多語言 M1）：跟隨手機／繁體中文／English，選完重新載入套用。
// M2（E5）：改成和「外觀」同一套卡片與單選樣式（沿用 appearance.css），放在設定「一般」分頁的外觀下面。
import {t, K, readLocaleChoice, saveLocaleChoice, getLocale} from './i18n.js?v=audit1117b';

// 語言名稱一律用該語言自己的寫法（不翻譯，以 K 標記），切到看不懂的語言時也找得回來。
const NATIVE_NAMES = Object.freeze({'zh-Hant': K('繁體中文'), en: 'English'});

export function LanguagePreference({react: R, onChange = saveLocaleChoice}) {
  const h = R.createElement;
  const [choice, setChoice] = R.useState(() => readLocaleChoice());
  const pick = value => { if (value === choice) return; setChoice(value); onChange(value); };
  const options = [['auto', t('跟隨手機')], ['zh-Hant', NATIVE_NAMES['zh-Hant']], ['en', NATIVE_NAMES.en]];
  return h('section', {className: 'ps-card appearance-card language-preference', 'aria-labelledby': 'language-heading'},
    h('h2', {id: 'language-heading'}, t('語言')),
    h('p', {className: 'ps-note', id: 'language-help'}, choice === 'auto'
      ? t('目前跟隨手機語言（{lang}）。', {lang: NATIVE_NAMES[getLocale()] || NATIVE_NAMES['zh-Hant']})
      : t('切換後會重新載入畫面，資料不受影響。')),
    h('fieldset', {className: 'appearance-options language-options', 'aria-describedby': 'language-help'},
      h('legend', {className: 'appearance-legend'}, t('選擇語言')),
      options.map(([value, label]) => h('label', {key: value, className: 'appearance-option', lang: value === 'auto' ? undefined : value},
        h('input', {type: 'radio', name: 'inpaw-language', value, checked: choice === value, onChange: () => pick(value)}),
        h('span', null, h('strong', null, label))))));
}
