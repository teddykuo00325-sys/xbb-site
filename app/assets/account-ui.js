import {t, tn} from './i18n.js?v=audit1117b';
// 會員帳號（Ian 2026-11-13：先做登入，不接付費）。設定 → 方案 → 最上面「帳號」；設定首頁另有一列 AccountShortcut 直達。
// 登入、登出、刪帳號都在手機原生層（Android：Google；iOS：Apple、Google）；這裡只顯示狀態、送指令。
// 網頁拿不到任何權杖。原則：不登入也能完整使用本機功能；登入不會上傳或同步照護紀錄；刪帳號與刪本機資料分開。
const PROVIDERS = Object.freeze({google: 'Google', apple: 'Apple'});
// 長 Email 只在「@」後面換行（不要斷成「…gmail.co／m」）；CSS 另把 .ps-account strong 設成能不斷字就不斷字。
function displayName(h, text) {
  const at = typeof text === 'string' ? text.indexOf('@') : -1;
  return at > 0 ? [text.slice(0, at + 1), h('wbr', {key: 'wbr'}), text.slice(at + 1)] : text;
}

// 設定首頁頂端的一列：只顯示登入狀態，點了到「方案」分頁的帳號卡。不做登入動作。
export function AccountShortcut({react: R, avatar = null, chevron = null, onOpen}) {
  const h = R.createElement;
  const host = typeof window !== 'undefined' && typeof window.V161Cloud?.request === 'function' ? window.V161Cloud : null;
  const [status, setStatus] = R.useState(null);
  R.useEffect(() => {
    let alive = true;
    if (host) host.request('account').then(s => { if (alive) setStatus(s); }).catch(() => { if (alive) setStatus({account: false}); });
    return () => { alive = false; };
  }, []);
  const signedIn = !!status?.signedIn;
  const title = signedIn ? (status.name || status.email || t('已登入')) : t('帳號');
  const detail = signedIn
    ? (PROVIDERS[status.provider] ? t('已登入 {provider}', {provider: PROVIDERS[status.provider]}) : t('已登入')) + (status.email && status.name ? ' · ' + status.email : '')
    : t('訪客模式 · 不登入也能用，訂閱或買額度包時登入');
  return h('div', {className: 'ps-shortcuts ps-account-shortcut'},
    h('button', {type: 'button', className: 'ps-shortcut', onClick: onOpen, 'data-account-shortcut': signedIn ? 'signed-in' : 'guest'},
      avatar, h('span', null, h('strong', null, displayName(h, title)), h('small', null, detail)), chevron));
}

export function AccountPanel({react: R, avatar = null}) {
  const h = R.createElement;
  const host = typeof window !== 'undefined' && typeof window.V161Cloud?.request === 'function' ? window.V161Cloud : null;
  const [status, setStatus] = R.useState(null), [busy, setBusy] = R.useState(''), [error, setError] = R.useState('');
  const [notice, setNotice] = R.useState(''), [confirmDelete, setConfirmDelete] = R.useState(false), [confirmSignOut, setConfirmSignOut] = R.useState(false);
  const mounted = R.useRef(true);
  R.useEffect(() => {
    mounted.current = true;
    if (host) host.request('account').then(s => { if (mounted.current) setStatus(s); })
      .catch(() => { if (mounted.current) setStatus({account: false}); });
    return () => { mounted.current = false; };
  }, []);
  const run = (label, op, fields, done) => {
    if (busy || !host) return;
    window.dispatchEvent(new CustomEvent('xbb-account-changed',{detail:{changing:true}}));
    setBusy(label); setError(''); setNotice('');
    host.request(op, fields).then(s => {
      if (!mounted.current) return;
      setStatus(s);
      window.dispatchEvent(new CustomEvent('xbb-account-changed'));
      if (s.error) setError(tn(s.error)); else done?.(s);
    }).catch(e => { if (mounted.current) setError(tn(e && e.message) || t('沒有完成，請再試一次。')); })
      .finally(() => { window.dispatchEvent(new CustomEvent('xbb-account-changed'));if (mounted.current) setBusy(''); });
  };
  const button = (label, action, props = {}) => h('button', {type: 'button', disabled: !!busy, onClick: action, ...props}, label);
  const note = text => h('p', {className: 'ps-note'}, text);
  const rules = note(t('不登入也能完整記錄，也能用進階模式。訂閱或購買額度包時需登入綁定帳號；登入本身不會上傳或同步照護紀錄。進階模式每次送出前會另行取得同意。'));

  let body;
  if (!host || (status && status.account === false)) {
    body = h(R.Fragment, null, h('div', {className: 'ps-account'}, avatar, h('div', null, h('strong', null, t('訪客模式')), h('small', null, t('這個版本不能登入')))),
      note(t('照護紀錄、食品卡都存在這台手機，不需要帳號。')));
  } else if (!status) {
    body = h('p', {role: 'status'}, t('正在確認帳號狀態…'));
  } else if (status.signedIn) {
    const who = status.name || status.email || t('已登入');
    body = h(R.Fragment, null,
      h('div', {className: 'ps-account', 'data-account-signed-in': true}, avatar,
        h('div', null, h('strong', null, displayName(h, who)), h('small', null, t('{provider} 帳號', {provider: PROVIDERS[status.provider] || ''}) + (status.email && status.name ? ' · ' + status.email : '')))),
      rules,
      !confirmDelete && !confirmSignOut && h('div', {className: 'ps-actions'},
        button(busy === 'signOut' ? t('登出中…') : t('登出'), () => { setNotice(''); setConfirmSignOut(true); }, {className: 'ps-button secondary', 'data-account-sign-out': true}),
        button(t('刪除帳號'), () => setConfirmDelete(true), {className: 'ps-text-button', 'data-account-delete': true})),
      // 登出先問一次（Ian 2026-11-14）：說清楚紀錄還在，只是訂閱與額度包要再登入才拿得回來。
      confirmSignOut && h('div', {className: 'ps-account-delete ps-account-sign-out', role: 'alertdialog', 'aria-label': t('登出')},
        h('strong', null, t('要登出嗎？')),
        note(t('登出後，這台手機上的照護紀錄、食品卡、草稿都還在，可以繼續用。')),
        note(t('訂閱與額度包跟著帳號，登出後要再登入同一個帳號才會回來。')),
        h('div', {className: 'ps-actions'},
          button(busy === 'signOut' ? t('登出中…') : t('確認登出'), () => run('signOut', 'signOut', {}, () => { setConfirmSignOut(false); setNotice(t('已登出。這台手機上的紀錄都還在。')); }), {className: 'ps-button', 'data-account-sign-out-confirm': true}),
          button(t('先不要'), () => setConfirmSignOut(false), {className: 'ps-button secondary', 'data-account-sign-out-cancel': true}))),
      confirmDelete && h('div', {className: 'ps-account-delete', role: 'alertdialog', 'aria-label': t('刪除帳號')},
        h('strong', null, t('要刪除這個帳號嗎？')),
        note(t('刪除帳號不會取消 App Store 或 Google Play 的自動續訂。請先到商店管理訂閱；刪除後可能無法再取回綁定帳號的購買額度。')),
        note(t('會刪掉你的登入帳號，以及AI 伺服器上這個帳號的整理結果（幾分鐘內清除）。這台手機上的照護紀錄、食品卡、草稿都會保留；要清掉本機資料請另外操作。')),
        note(t('按下後會請你再用 {provider} 確認一次身分。刪除後不能復原。', {provider: PROVIDERS[status.provider] || t('同一個帳號')})),
        h('div', {className: 'ps-actions'},
          button(busy === 'delete' ? t('刪除中…') : t('確認刪除帳號'), () => run('delete', 'deleteAccount', {}, () => { setConfirmDelete(false); setNotice(t('帳號已刪除。這台手機上的紀錄都還在。')); }), {className: 'ps-button danger', 'data-account-delete-confirm': true}),
          button(t('先不要'), () => setConfirmDelete(false), {className: 'ps-button secondary'}))));
  } else {
    const providers = (status.providers || []).filter(p => PROVIDERS[p]);
    body = h(R.Fragment, null,
      h('div', {className: 'ps-account'}, avatar, h('div', null, h('strong', null, t('訪客模式')), h('small', null, t('還沒登入')))),
      providers.length
        ? h('div', {className: 'ps-actions'}, providers.map(p => button(busy === 'signIn:' + p ? t('登入中…') : t('用 {provider} 登入', {provider: PROVIDERS[p]}),
            () => run('signIn:' + p, 'signIn', {provider: p}, () => setNotice(t('已登入。'))), {key: p, className: 'ps-button', 'data-account-sign-in': p})))
        : note(t('登入功能還在設定中，暫時不能登入。')),
      rules);
  }
  return h('div', {className: 'ps-account-panel'}, body,
    notice && h('p', {className: 'ps-success', role: 'status'}, notice),
    error && h('p', {className: 'cj-error', role: 'alert'}, error));
}
