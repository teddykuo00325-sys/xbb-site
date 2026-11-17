import {t} from './i18n.js?v=audit1117b';
// Session-only navigation. Never writes care data or browser history.
export function navigationStep(path, destination) {
  const history = Array.isArray(path) && path.length ? path : ['home'];
  const index = history.lastIndexOf(destination);
  const returning = index >= 0;
  return {
    returning,
    path: ['home','feeding','interaction','records','profile'].includes(destination) ? [destination] : returning ? history.slice(0, index + 1) : [...history, destination].slice(-32)
  };
}

export function HomeButton({react:R, onHome, disabled=false}) {
  return R.createElement('button', {
    type:'button', className:'navigation-home', 'aria-label':t('回首頁'),
    disabled, onClick:onHome
  }, t('⌂ 回首頁'));
}
