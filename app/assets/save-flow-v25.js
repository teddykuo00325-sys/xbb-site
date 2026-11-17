import {t, tn, K} from './i18n.js?v=audit1117b';
// Save success belongs to the committed snapshot, never the optimistic React render.
export function localNow(now = new Date()) {
  return {date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`};
}
export function waitForDurableSave(store) {
  return new Promise((resolve, reject) => {
    let unsubscribe;
    const inspect = () => {
      const view = store.get();
      if (view.status === 'error') { unsubscribe?.(); reject(Error(tn(view.error) || t('本機保存失敗，請重試保存。'))); }
      else if (view.status === 'saved' && !view.resetting) { unsubscribe?.(); resolve(); }
    };
    unsubscribe = store.subscribe(inspect);
    inspect();
  });
}
export function useSaveAction(R, store, onError, onRecovery) {
  const running = R.useRef(false);
  const [busy, setBusy] = R.useState(false);
  const mounted = R.useRef(true);
  const recovery = R.useRef(null);
  const stopRecovery = () => { recovery.current?.(); recovery.current = null; };
  R.useEffect(() => { mounted.current = true; return () => { mounted.current = false; stopRecovery(); }; }, []);
  const save = async (write, after, onFailure = onError) => {
    if (running.current) return false;
    running.current = true; stopRecovery(); setBusy(true);
    try {
      if (store.get().resetting) throw Error(t('資料正在恢復中，請稍候再儲存。'));
      if (store.get().error?.includes(K('另一分頁'))) throw Error(store.get().error);
      const pending = write();
      if (pending?.then) await pending;
      if (store.get().status === 'error') store.retry();
      await waitForDurableSave(store);
      if (mounted.current) after?.();
      return true;
    } catch (error) {
      if (mounted.current) {
        const message=tn(error.message) || t('本機保存失敗，請重試保存。');
        onFailure(message);
        // The global retry button commits the retained write without calling
        // this action again. Clear only its matching stale form error; never
        // navigate or erase a newer validation message on that retry.
        if(onRecovery&&store.get().status==='error') {
          recovery.current=store.subscribe(()=>{
            const view=store.get();
            if(view.status==='saved'&&!view.resetting){stopRecovery();if(mounted.current)onRecovery(message);}
          });
        }
      }
      return false;
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return [save, busy];
}
// Keep the focused button in place between pointer-down and click. The action
// itself hides the simulated keyboard after the browser has dispatched click.
const pointerActions = new WeakSet();
export function preserveActionPointer(event) {
  if (!event.target.closest?.('button,a,[role="button"],[role="checkbox"],summary')) return;
  const root = event.currentTarget;
  pointerActions.add(root);
  const release = () => {
    window.removeEventListener('pointerup', release, true);
    window.removeEventListener('pointercancel', release, true);
    setTimeout(() => pointerActions.delete(root), 0);
  };
  window.addEventListener('pointerup', release, {capture:true,once:true});
  window.addEventListener('pointercancel', release, {capture:true,once:true});
}
export function preserveActionBlur(event, keyboard) {
  if (pointerActions.has(event.currentTarget)) return;
  const next = event.relatedTarget;
  if (next instanceof HTMLElement && next.closest('input,textarea,select,button,a,[role="button"],[role="checkbox"],summary')) return;
  keyboard.hide();
}
