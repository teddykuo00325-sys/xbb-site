import {t,K} from './i18n.js?v=audit1117b';
// 3D 列印公仔（Ian 2026-11-13）：導引到「萌點3D」網站試算與詢價。App 內只做本機預覽；
// 不上傳照片、不帶出任何資料（連結沒有參數），報價、收件與付款都在萌點3D 進行，小本本不收款。
// 外部連結由原生層交給手機瀏覽器開啟（Android MainActivity.openExternal、iOS openExternal），不在 App 內載入。
export const FIGURINE_PURCHASE_OPEN = true;
export const FIGURINE_SHOP = Object.freeze({name: t('萌點3D'), url: 'https://cutepoint.vercel.app/'});
export const FIGURINE_DRAFT_VERSION = 1;
export const FIGURINE_NOTICE = {
  status: t('由萌點3D 訂製'),
  partner: t('公仔由「萌點3D 創客工作室」製作。到他們的網站可以先試算價格與工作天數，再填詢價單。'),
  payment: t('價格以萌點3D 的正式報價單為準；收件資訊與付款都在萌點3D 進行，毛孩小本本不收取公仔款項。'),
  terms: t('價格、運費、尺寸、材質、製作與配送時間，以及取消、退款與售後方式，請以萌點3D 的說明與報價為準。'),
  privacy: t('小本本不會自動把照片或任何資料傳給萌點3D。要訂製時，請在萌點3D 的網站、LINE 或 Email 自己提供照片，並先看清楚他們的資料使用方式。'),
  local: t('照片只暫存在這一頁，關閉 App 或切換毛孩就會清除，不會上傳。'),
};
// 開手機瀏覽器前往萌點3D；不帶任何參數或來源網址。
const shopLink = (h, text, className) => h('a', {className, href: FIGURINE_SHOP.url, rel: 'noopener noreferrer', 'data-figurine-shop': true}, text);

export function cleanFigurineDraft(value = {}) {
  const draft = value?.version === FIGURINE_DRAFT_VERSION ? value : {};
  const photos = [0, 1].map(i => typeof draft.photos?.[i] === 'string' && (/^data:image\/(jpeg|png|webp);base64,/.test(draft.photos[i]) || draft.photos[i] === '/xbb-site/app/assets/mochi.png') ? draft.photos[i] : '');
  const localRights = draft.localRights === true;
  const style = [K('寫實'), K('Q 版')].includes(draft.style) ? draft.style : K('寫實');
  const size = [K('迷你款'), K('標準款')].includes(draft.size) ? draft.size : K('標準款');
  const preferenceConfirmed = draft.preferenceConfirmed === true && localRights && photos.every(Boolean);
  let step = Number.isInteger(draft.step) && draft.step >= 0 && draft.step <= 3 ? draft.step : 0;
  if (step > 1 && (!localRights || photos.some(p => !p))) step = 1;
  if (step > 2 && !preferenceConfirmed) step = 2;
  return {version: FIGURINE_DRAFT_VERSION, step, photos, localRights, style, size, preferenceConfirmed};
}

export function validateFigurinePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file?.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) return t('請選擇 10 MB 以內的 JPG、PNG 或 WebP。');
  return '';
}

export function FigurinePartner({react: R, name, onClose, initialDraft, onDraft, onNavigate, navActive, Scroll = 'div', Tabs, Owner, hideKeyboard = () => {}}) {
  const h = R.createElement;
  const [draft, setDraft] = R.useState(() => cleanFigurineDraft(initialDraft));
  const [error, setError] = R.useState('');
  const [loading, setLoading] = R.useState([false, false]);
  const [zoom, setZoom] = R.useState(false);
  const reads = R.useRef([0, 0]);
  const live = R.useRef(true);
  R.useEffect(() => {live.current = true; return () => {live.current = false; reads.current = reads.current.map(n => n + 1);};}, []);
  R.useEffect(() => {onDraft?.(cleanFigurineDraft(draft));}, [draft]);
  const update = values => {setDraft(current => ({...current, ...values})); setError('');};
  const go = step => {hideKeyboard(); update({step}); setZoom(false);};
  const close = () => {hideKeyboard(); onClose();};
  const photo = (file, index) => {
    if (!file) return;
    const failure = validateFigurinePhoto(file);
    const token = ++reads.current[index];
    setLoading(old => old.map((v, i) => i === index ? false : v));
    if (failure) {setError(failure); return;}
    setLoading(old => old.map((v, i) => i === index ? true : v)); setError('');
    const current = () => live.current && token === reads.current[index];
    const fail = () => {if (current()) {setError(t('照片無法讀取，請換一張。')); setLoading(old => old.map((v, i) => i === index ? false : v));}};
    try {
      const reader = new FileReader();
      reader.onerror = fail; reader.onabort = fail;
      reader.onload = () => {
        if (!current()) return;
        const image = new Image();
        image.onerror = fail;
        image.onload = () => {
          if (!current()) return;
          setDraft(old => ({...old, photos: old.photos.map((p, i) => i === index ? String(reader.result) : p), localRights: false, preferenceConfirmed: false}));
          setLoading(old => old.map((v, i) => i === index ? false : v)); setError('');
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    } catch {fail();}
  };
  const example = () => {
    reads.current = reads.current.map(n => n + 1); setLoading([false, false]);
    update({photos: ['/xbb-site/app/assets/mochi.png', '/xbb-site/app/assets/mochi.png'], localRights: false, preferenceConfirmed: false});
  };
  const nextPhotos = () => {
    if (loading.some(Boolean)) {setError(t('照片仍在讀取，請稍候。')); return;}
    if (draft.photos.some(p => !p)) {setError(t('請先選擇正面與側面兩張照片，或使用示範照片。')); return;}
    if (!draft.localRights) {setError(t('請先確認照片使用權與預覽說明。')); return;}
    go(2);
  };
  const image = h('img', {src: '/xbb-site/app/assets/figurine.png', alt: t('固定公仔概念示意，並非由所選照片產生')});
  const button = (text, onClick, className = 'primary', more = {}) => h('button', {type: 'button', className, onClick, ...more}, text);
  const notice = h('section', {className: 'figurine-partner-notice', 'aria-label': t('合作廠商與購買狀態')},
    h('strong', null, FIGURINE_NOTICE.status), h('p', null, FIGURINE_NOTICE.partner), h('p', null, FIGURINE_NOTICE.payment));
  const stepTitles = [t('專屬毛孩公仔'), t('準備照片'), t('選擇公仔偏好'), t('到萌點3D 訂製')];
  let body;
  if (draft.step === 0) body = h(R.Fragment, null,
    h('h1', null, t('把陪伴，留在手心。')),
    h('p', {className: 'subtitle'}, t('幫{name}做一隻專屬公仔：先在這裡看看照片與偏好，再到萌點3D 試算與詢價。',{name})),
    h('div', {className: 'figurine-hero'}, image, h('span', null, t('全彩公仔 · 固定概念圖'))),
    notice,
    h('p', {className: 'figurine-process-line'}, t('照片與偏好只在這台裝置預覽；要訂製時到萌點3D 網站試算、填詢價單，照片與付款都在萌點3D 進行。')),
    button(t('先整理照片與偏好'), () => go(1), 'primary apricot'),
    shopLink(h, t('直接前往{name} 試算價格',{name:FIGURINE_SHOP.name}), 'secondary-btn figurine-shop-link'),
    h('p', {className: 'microcopy left'}, FIGURINE_NOTICE.terms));
  if (draft.step === 1) body = h(R.Fragment, null,
    h('h1', null, t('先收集，熟悉的模樣')), h('p', {className: 'subtitle'}, t('正面與側面各一張，也可以直接用示範照片。')),
    h('div', {className: 'photo-grid'}, [t('正面照'), t('側面照')].map((label, i) => h('div', {className: 'figurine-photo-field', key: label},
      h('label', {className: 'photo-slot'}, draft.photos[i] ? h('img', {src: draft.photos[i], alt: t('{label}預覽', {label})}) : h('div', null, h('span', null, t('選擇照片'))),
        h('strong', null, label), h('input', {type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': label, onChange: e => {photo(e.target.files?.[0], i); e.target.value = '';}})),
      loading[i] && h('small', {role: 'status'}, t('正在讀取照片…')),
      draft.photos[i] && button(t('移除{label}', {label}), () => {reads.current[i]++; setLoading(old => old.map((v, j) => j === i ? false : v)); update({photos: draft.photos.map((p, j) => i === j ? '' : p), localRights: false, preferenceConfirmed: false});}, 'text-btn')))),
    button(t('先用示範照片體驗'), example, 'text-btn centered'),
    h('section', {className: 'print-card'}, h('h2', null, t('照片只在這台裝置預覽')), h('p', null, t('自然光、全身入鏡，耳朵與尾巴不要裁掉。請避免包含人物、門牌或其他個人資料。')), h('small', null, t('JPG／PNG／WebP，每張上限 10 MB。示範照片重用同一張，只供操作體驗。'))),
    h('label', {className: 'print-check'}, h('input', {type: 'checkbox', checked: draft.localRights, onChange: e => update({localRights: e.target.checked, preferenceConfirmed: false})}), h('span', null, t('我有照片使用權（或使用示範照片），並了解這次只在這台裝置預覽。這不是傳送給廠商的同意。'))),
    button(t('選擇規格與查看概念圖'), nextPhotos, 'primary', {disabled: loading.some(Boolean)}));
  if (draft.step === 2) body = h(R.Fragment, null,
    h('h1', null, t('先選擇，喜歡的方向')), h('p', {className: 'subtitle'}, t('以下只是需求偏好，尚未確認為廠商提供的規格。')),
    button(h(R.Fragment, null, image, h('span', null, (zoom ? t('點一下縮小') : t('點一下放大')) + t(' · 固定概念圖'))), () => setZoom(!zoom), 'figurine-hero preview ' + (zoom ? 'zoom' : ''), {'aria-label': t('切換公仔放大預覽'), 'aria-pressed': zoom}),
    h('p', {className: 'microcopy left'}, t('固定示意圖不會隨照片或偏好改變；沒有生成 3D 模型，也不是成品保證。')),
    h('h2', null, t('造型偏好')), h('div', {className: 'print-options'}, [K('寫實'), K('Q 版')].map(style => button(t(style), () => update({style, preferenceConfirmed: false}), draft.style === style ? 'chosen' : '', {'aria-pressed': draft.style === style, key: style}))),
    h('h2', null, t('尺寸偏好')), h('p', {className: 'microcopy left'}, t('實際公分數、材質與可製作範圍待廠商確認。')), h('div', {className: 'print-options'}, [K('迷你款'), K('標準款')].map(size => button(t(size), () => update({size, preferenceConfirmed: false}), draft.size === size ? 'chosen' : '', {'aria-pressed': draft.size === size, key: size}))),
    h('label', {className: 'print-check'}, h('input', {type: 'checkbox', checked: draft.preferenceConfirmed, onChange: e => update({preferenceConfirmed: e.target.checked})}), h('span', null, t('已確認示範偏好：{style}／{size}。這不代表確認模型或下單。',{style:t(draft.style),size:t(draft.size)}))),
    button(t('下一步：到萌點3D 訂製'), () => draft.preferenceConfirmed ? go(3) : setError(t('請先確認這次的造型與尺寸偏好。'))));
  if (draft.step === 3) body = h(R.Fragment, null,
    h('h1', null, t('到萌點3D 試算與詢價')), h('p', {className: 'subtitle'}, t('照片與偏好已整理好，尚未送出任何資料。')),
    h('section', {className: 'print-order'}, image, h('div', null, h('strong', null, t('{name}的公仔偏好',{name})), h('p', null, `${t(draft.style)} · ${t(draft.size)}`), h('small', null, t('偏好摘要 · 詢價時可以告訴萌點3D')))),
    notice,
    h('section', {className: 'print-card'}, h('h2', null, t('怎麼訂製')),
      h('ol', {className: 'figurine-process'}, h('li', null, t('點下方按鈕，用手機瀏覽器打開萌點3D 網站。')), h('li', null, t('用「成本試算」看預估價格與工作天數，再填詢價單（可附上你想要的造型與尺寸）。')), h('li', null, t('在萌點3D 提供照片、確認正式報價，再填收件資訊與付款。'))),
      h('p', null, t('會離開小本本、打開萌點3D 網站；小本本不會帶出照片或任何資料，也不會建立訂單。'))),
    h('section', {className: 'print-card'}, h('h2', null, t('傳送前，先確認清楚')), h('p', null, FIGURINE_NOTICE.privacy), h('p', null, t('本頁不收集收件人、電話或地址。在萌點3D 填寫的資料，依萌點3D 的規則處理。'))),
    h('p', {className: 'figurine-terms'}, FIGURINE_NOTICE.terms),
    shopLink(h, t('前往{name} 試算與詢價',{name:FIGURINE_SHOP.name}), 'primary figurine-shop-link'),
    button(t('返回我的毛孩'), close, 'text-btn centered'));
  return h('div', {className: 'inpaw-app shell-with-tabs print-app ij-secondary partner-print-app'},
    Tabs && h(Tabs, {react: R, active: navActive, onNavigate: page => {hideKeyboard(); onNavigate?.(page);}}),
    h('header', {className: 'app-header'}, button(t('‹ 返回毛孩'), close, 'h-back', {'aria-label': t('返回毛孩')}), h('strong', null, stepTitles[draft.step])),
    h(Scroll, {className: 'app-scroll', key: draft.step}, h('main', {className: 'app-content print-content'},
      Owner && h(Owner, {react: R, name}), h('p', {className: 'figurine-status'}, FIGURINE_NOTICE.status),
      draft.step > 0 && button(t('‹ 上一步，修改內容'), () => go(draft.step - 1), 'text-btn'),
      draft.step > 0 && h('ol', {className: 'print-steps'}, [t('選照片'), t('選偏好'), t('到萌點3D 訂製')].map((label, i) => h('li', {key: label, className: i + 1 <= draft.step ? 'active' : '', 'aria-current': i + 1 === draft.step ? 'step' : undefined}, h('span', null, i + 1), label))),
      body, error && h('p', {className: 'error', role: 'alert'}, error), h('p', {className: 'microcopy left figurine-local-note'}, FIGURINE_NOTICE.local))));
}
