import {t, tn, isEnglish} from './i18n.js?v=audit1117b';
import { networkNote } from './download-confirm.js?v=r3';

const workingStates = ['requesting-permission', 'recording', 'transcribing'];
const busyStates = [...workingStates, 'downloading', 'result'];

export function NativeVoiceCapture({ react: R, host, disabled, onActive, onTranscript, onType, engine = 'local', autoStart = false }) {
  const h = R.createElement;
  // 系統語音請求顯式帶 engine，與舊版本機模型協定相容。
  const extra = {engine};
  const [status, setStatus] = R.useState(null);
  const [working, setWorking] = R.useState(false);
  const [showDownload, setShowDownload] = R.useState(false);
  const [seconds, setSeconds] = R.useState(0);
  const statusRef = R.useRef(null);
  const mounted = R.useRef(false);
  const command = R.useRef(false);
  const polling = R.useRef(false);
  const revision = R.useRef(0);
  const attempted = R.useRef(false);
  const accepted = R.useRef(false);

  async function request(op) {
    const ticket = ++revision.current;
    try {
      const next = await host.request(op, extra);
      if (!next || typeof next.state !== 'string') throw Error(t('本機語音暫時無法回應。'));
      if (mounted.current && ticket === revision.current) { statusRef.current = next; setStatus(next); }
    } catch (error) {
      if (mounted.current && ticket === revision.current) {
        setStatus({ state: 'error', message: tn(error.message) || t('本機語音暫時無法回應。') });
      }
    }
  }

  R.useEffect(() => {
    mounted.current = true;
    async function poll() {
      if (polling.current || command.current) return;
      // Idle states need no polling; commands refresh the status themselves.
      const known = statusRef.current?.state;
      if (known && !busyStates.includes(known)) return;
      polling.current = true;
      try { await request('status'); } finally { polling.current = false; }
    }
    poll();
    const timer = setInterval(poll, 600);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      host.request('cancel', extra).catch(() => {});
    };
  }, [host]);

  const state = status?.state;
  R.useEffect(() => {
    if (state !== 'recording') { setSeconds(0); return undefined; }
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(tick);
  }, [state]);
  R.useEffect(() => {
    onActive(working || workingStates.includes(state));
    return () => onActive(false);
  }, [onActive, state, working]);

  async function run(op, useText = false) {
    if (command.current || disabled) return;
    command.current = true;
    setWorking(true);
    try {
      if (op === 'start') {
        attempted.current = false;
        accepted.current = false;
      }
      if (useText) {
        if (!onTranscript(status.text)) return;
        accepted.current = true;
      }
      await request(op);
    } finally {
      command.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  // 從首頁「語音文字」進來：一打開就開始錄音（只做一次）。要下載語音功能時只跳出確認，不自動下載。
  const autoDone = R.useRef(!autoStart);
  R.useEffect(() => {
    if (autoDone.current || disabled || working) return;
    if (state === 'ready') { autoDone.current = true; void run('start'); }
    else if (state === 'needs-model') { autoDone.current = true; setShowDownload(true); }
    else if (state && state !== 'downloading') autoDone.current = true;
  }, [state, disabled, working]);

  R.useEffect(() => {
    if (state !== 'result' || disabled || working || attempted.current) return;
    attempted.current = true;
    void run('cancel', true);
  }, [state, status?.text, disabled, working]);

  const actionButton = (label, action, primary = false) => h('button', {
    type: 'button', className: primary ? 'cj-primary' : undefined,
    disabled: disabled || working, onClick: action,
  }, label);
  const button = (label, op, { primary = false, useText = false } = {}) =>
    actionButton(label, () => run(op, useText), primary);
  const progress = Number.isFinite(status?.progress) ? Math.max(0, Math.min(1, status.progress)) : null;
  const recordLabel = accepted.current ? t('再錄一段') : t('開始錄音');
  const downloadPrompt = state === 'needs-model' && showDownload;
  const readyNote = engine === 'system'
    ? (status?.onDevice
      ? (status?.provider==='apple'?t('使用 Apple 原生語音辨識，在這支手機上轉成文字。'):t('使用手機系統的語音辨識，在這支手機上轉成文字。'))
      : t('實驗：用手機系統的語音辨識，聲音可能被送到系統的語音服務（不是本 App 處理）。'))
    : t('錄音會在這支手機上轉成文字。');
  const system = engine === 'system';
  // 英文介面時原生端用英文辨識，系統語音包也是英文的（Android AppLocale.speechTag）。
  const english = isEnglish();
  const downloadLabel = system ? (english ? t('下載英文語音包') : t('下載中文語音包')) : t('下載語音功能');
  const downloadNote = system
    ? (english
      ? t('要先下載英文（美國）離線語音包。由手機系統下載，大小由系統決定（App 查不到），下載後辨識不用網路。{networkNote}', {networkNote: networkNote()})
      : t('要先下載中文（台灣）離線語音包。由手機系統下載，大小由系統決定（App 查不到），下載後辨識不用網路。{networkNote}', {networkNote: networkNote()}))
    : t('要先下載語音功能（約 240 MB），之後不用網路。{networkNote}', {networkNote: networkNote()});
  const retryNote = system
    ? (english
      ? t('再下載一次英文語音包（由手機系統下載，大小由系統決定）。{networkNote}', {networkNote: networkNote()})
      : t('再下載一次中文語音包（由手機系統下載，大小由系統決定）。{networkNote}', {networkNote: networkNote()}))
    : t('再下載一次語音功能（約 240 MB）。{networkNote}', {networkNote: networkNote()});
  let message = t('正在確認本機語音狀態…');
  let controls;
  if (status?.recordingSupported === false) {
    message = t('模擬器可測試文字草稿。請用 iPhone 實機測試錄音與轉寫。');
  } else if (engine === 'system' && status?.languagePack === 'unavailable') {
    message = tn(status.message);
  } else if (engine === 'system' && status && status.available === false) {
    message = tn(status.message)||t('這支手機沒有可用的系統語音辨識，請改用內建語音或直接打字。');
  } else if (state === 'needs-model') {
    message = downloadPrompt
      ? downloadNote : readyNote;
    controls = downloadPrompt
      ? button(downloadLabel, 'prepare', { primary: true })
      : actionButton(recordLabel, () => setShowDownload(true), !!onType);
  } else if (state === 'error' && status.modelReady === false) {
    // A retry downloads again, so it goes through the same confirm step (size + network) as the first download.
    message = showDownload
      ? (system ? `${tn(status.message)} ${retryNote}` : retryNote) : tn(status.message);
    controls = showDownload
      ? button(downloadLabel, 'prepare', { primary: true })
      : actionButton(t('重試下載'), () => setShowDownload(true), true);
  } else if (state === 'downloading') {
    message = system
      ? (english
        ? (progress === null ? t('系統正在下載英文語音包，完成後就能開始錄音…') : t('系統正在下載英文語音包 · {percent}%', {percent: Math.floor(progress * 100)}))
        : (progress === null ? t('系統正在下載中文語音包，完成後就能開始錄音…') : t('系統正在下載中文語音包 · {percent}%', {percent: Math.floor(progress * 100)})))
      : progress === null ? t('正在準備本機語音模型…') : progress === 1
        ? t('正在驗證語音模型…') : t('語音模型背景下載中 · {percent}%', {percent: Math.floor(progress * 100)});
    controls = h('progress', { max: 1, value: progress ?? undefined, 'aria-label': t('語音模型下載進度') });
  } else if (state === 'ready' || state === 'error') {
    message = state === 'error' ? tn(status.message) : readyNote;
    controls = button(recordLabel, 'start', { primary: !!onType });
  } else if (state === 'requesting-permission') {
    message = t('請允許麥克風與系統語音辨識所需的權限。');
  } else if (state === 'recording') {
    message = h('span', { className: 'vq-rec' }, h('span', { className: 'vq-rec-dot', 'aria-hidden': true }), t('錄音中 {min}:{sec} · 最長 {limit} 分鐘', {limit: Math.ceil((status?.maxRecordingSeconds||120)/60), min: Math.floor(seconds / 60), sec: String(seconds % 60).padStart(2, '0')}));
    controls = [button(t('停止並轉寫'), 'stop', { primary: true }), button(t('取消錄音'), 'cancel')];
  } else if (state === 'transcribing') {
    message = h('span', { className: 'vq-rec' }, h('span', { className: 'vq-spin', 'aria-hidden': true }), t('正在轉寫成文字，通常幾秒鐘…'));
    controls = button(t('取消轉寫'), 'cancel');
  } else if (state === 'result') {
    message = accepted.current || !attempted.current || working
      ? t('正在開啟文字草稿…') : t('請縮短原有文字，再加入這段轉寫。');
    if (attempted.current && !accepted.current && !working) {
      controls = [button(t('加入轉寫'), 'cancel', { useText: true }), button(t('捨棄轉寫'), 'cancel')];
    }
  }

  return h('section', { className: 'vq-capture', 'aria-label': engine === 'system' ? t('手機系統語音轉寫') : t('本機語音轉寫') },
    h('div', { className: 'vq-capture-actions' }, ...[].concat(controls || []),
      onType && !working && !workingStates.includes(state) && h('button', {
        type: 'button', disabled, onClick: () => { setShowDownload(false); onType(); },
      }, downloadPrompt ? t('先用打字') : t('直接打字'))),
    h('p', { className: 'vq-muted', role: state === 'error' ? 'alert' : 'status' }, message),
    state === 'result' && attempted.current && !accepted.current && !working &&
      h('p', { className: 'vq-verbatim' }, status.text));
}
