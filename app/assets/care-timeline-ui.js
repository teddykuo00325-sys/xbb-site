// 首頁「照顧時間表」（Ian 2026-11-13）：疫苗、驅蟲、回診放在首頁最上面，到期一眼看到，按「做完了」就記下，
// 再填下次日期（依獸醫確認，App 不推算）。資料一有變（在哪一頁存的都算），就把全家的提醒同步給手機排本機通知（不連網）。
// 審查 P1：每一列都能點開，任何時候都能按「做完了」；回診按「做完了」直接開「記下這次看診」，存好就結束這一項。
import {careTimeline, syncReminders, reminderStatus, forceReminderSync, watchReminders, isFollowUp, pausedCount, takePendingFollowUp, MED_HORIZON_DAYS, hasReminderBridge} from './care-schedule.js?v=photo-simplify1';
import {activeMeds} from './vet-visit-model.js?v=1';
import {recordCareDose} from './m-draft-care-v42.js?v=r4';
import {scheduleReminderDate} from './reminder-enhancements-v34.js?v=photo-simplify1';
import {VetVisitForm, MedToday, FollowUpQuick} from './vet-visit-ui.js?v=photo-simplify1';
import {loadMedPending} from './med-bag.js?v=quota-feedback1';
import {t, tn} from './i18n.js?v=audit1117b';
import {cuteActionLabel} from './cute-action-icons.js?v=audit1117b';

// 吃藥提醒只先排近幾天（疫苗驅蟲回診優先佔名額），寫出排到哪天，免得以為整個療程都排好了。
const medHorizon = today => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + MED_HORIZON_DAYS); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const STATE_CLASS = {overdue: 'is-overdue', due: 'is-due', upcoming: 'is-soon', scheduled: '', 'needs-scheduling': 'is-todo', unscheduled: 'is-todo', snoozed: ''};

// 保存成功不等於通知成功：只在手機明確回報權限與排程數量後確認已排好。
export function reminderSaveFeedback(status, bridge = hasReminderBridge()) {
  if (!bridge) return t('這個版本無法設定手機通知。');
  if (status?.allowed === false) return t('已加進照顧時間表；手機通知尚未開啟，請先開啟通知。');
  if (status?.allowed === true && status.reminders !== false && Number.isSafeInteger(status.scheduled) && status.scheduled > 0)
    return t('手機已確認排好 {scheduled} 則通知；請以各項設定時間為準。', {scheduled: status.scheduled});
  if (status?.allowed === true && status.scheduled === 0) return t('已加進照顧時間表；目前沒有已排好的手機通知，請確認日期與時間。');
  return t('已加進照顧時間表；暫時無法確認通知是否排好，請稍後再確認。');
}

function NextDate({react: R, store, item, today, onDone, onLater}) {
  const h = R.createElement;
  const [date, setDate] = R.useState(''), [busy, setBusy] = R.useState(false), [error, setError] = R.useState('');
  const save = async () => {
    if (busy || !date) return;
    setBusy(true); setError('');
    try {
      await store.atomic(data => ({...data, careItems: data.careItems.map(x => x.id === item.id ? scheduleReminderDate(x, date, {veterinarianConfirmed: true}) : x)}));
      onDone();
    } catch (e) { setError(tn(e.message) || t('沒有存到，請再試一次。')); }
    finally { setBusy(false); }
  };
  return h('div', {className: 'care-next-date', role: 'group', 'aria-label': t('下次日期')},
    h('label', null, h('span', null, t('下次日期（依獸醫說的）')),
      h('input', {type: 'date', min: today, value: date, disabled: busy, onChange: e => { setDate(e.target.value); setError(''); }})),
    h('button', {type: 'button', className: 'primary', disabled: busy || !date, onClick: save}, busy ? t('儲存中…') : t('存下次日期')),
    onLater && h('button', {type: 'button', className: 'text-btn', disabled: busy, onClick: onLater}, t('之後再填')),
    error && h('p', {className: 'error', role: 'alert'}, error));
}

// 回診做完了：這一項是一次性的，記下看診後就拿掉（看診紀錄保留在照護分頁）；不留在提醒頁變成「已暫停」。
const endFollowUp = (store, id) =>
  store.atomic(data => ({...data, careItems: data.careItems.filter(x => x.id !== id)}));

export function CareTimeline({react: R, items, today, name, store, root, catId, onReminders, limit = 4, medCompact = false}) {
  const h = R.createElement;
  const rows = careTimeline(items, today), paused = pausedCount(items);
  const [asking, setAsking] = R.useState(null), [notice, setNotice] = R.useState(''), [status, setStatus] = R.useState(null);
  const [open, setOpen] = R.useState(null), [visiting, setVisiting] = R.useState(false), [followUp, setFollowUp] = R.useState(null), [booking, setBooking] = R.useState(false);
  const [last, setLast] = R.useState(null), [lastDate, setLastDate] = R.useState(''), [editDate, setEditDate] = R.useState(false), [doneBusy, setDoneBusy] = R.useState(false);
  const [checked, setChecked] = R.useState(false), [adding, setAdding] = R.useState(false);
  const rootData = root?.get?.().data;
  // 在任何一頁存檔都同步手機提醒（只註冊一次）；這裡另外拿最新狀態顯示「已排 N 則」。
  R.useEffect(() => { if (root) watchReminders(root); }, [root]);
  // 權限狀態以手機即時回報為準（Ian 2026-11-13：開了通知卡片還一直跳）。剛變成允許但還沒排到通知 → 重送清單。
  const rootRef = R.useRef(root); rootRef.current = root;
  const refreshPermission = R.useCallback(async () => {
    const next = await reminderStatus();
    if (!next) return;
    if (next.allowed && Number(next.scheduled) === 0) {
      const synced = await forceReminderSync(rootRef.current?.get?.().data);
      setStatus(prev => ({...(prev || {}), ...next, ...(synced || {})}));
    } else setStatus(prev => ({...(prev || {}), ...next}));
  }, []);
  R.useEffect(() => {
    let live = true;
    // 清單沒變時 sync 回的是快取；再即時問一次權限，避免快取的「未開」讓卡片一直出現。
    // 2026-11-14b：同步失敗或沒有橋接也再問一次；問完才算「查過」，查過仍不知道開了沒才顯示說明（避免閃一下）。
    syncReminders(rootData).then(async next => { if (!live) return; if (next) setStatus(next); await refreshPermission(); if (live) setChecked(true); });
    return () => { live = false; };
  }, [rootData]);
  // 回到 App（從系統設定開了通知、或系統詢問視窗關掉）就重讀權限，卡片自動收起。
  R.useEffect(() => {
    const onBack = () => { if (document.visibilityState === 'visible') refreshPermission(); };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => { document.removeEventListener('visibilitychange', onBack); window.removeEventListener('focus', onBack); };
  }, [refreshPermission]);
  const shown = rows.slice(0, limit);
  // 第一次問系統權限；之前拒絕過就打開這個 App 的通知設定。
  const askPermission = async () => {
    const cloud = typeof window !== 'undefined' ? window.V161Cloud : null;
    if (!cloud) return;
    // iOS 要等使用者在系統視窗按完才回呼，所以 await 完就是答案；Android／打開設定頁的情況再補讀兩次。
    try { await cloud.request('reminderPermission'); } catch {}
    await refreshPermission();
    setTimeout(refreshPermission, 1500); setTimeout(refreshPermission, 4000);
  };
  const startVisit = row => { setFollowUp(row || null); setVisiting(true); setNotice(''); setOpen(null); };
  const savedReminderStatus = async () => {
    if (!hasReminderBridge()) { setStatus(null); return reminderSaveFeedback(null, false); }
    let next = null;
    try { next = await forceReminderSync(rootRef.current?.get?.().data); } catch {}
    setStatus(next); setChecked(true);
    return reminderSaveFeedback(next, true);
  };
  // 從「全部提醒」頁按回診的「做完了」過來：直接開記下這次看診。
  R.useEffect(() => { const id = takePendingFollowUp(); if (!id) return; const row = rows.find(r => r.id === id); if (row && root && catId) startVisit(row); }, []);
  const hasMeds = Boolean(rootData && catId && activeMeds(rootData, catId, today).length);
  // 一按就用今天記下；記錯了可以「改日期」或「復原」（復原＝放回按之前的那一筆）。
  const restore = (data, snap) => ({...data, careItems: data.careItems.map(x => x.id === snap.prev.id ? snap.prev : x)});
  const quickDone = async row => {
    if (doneBusy || !store) return;
    setDoneBusy(true); setNotice('');
    try {
      await store.atomic(data => recordCareDose(data, row.item.id, today, today));
      setLast({id: row.id, label: row.label, prev: row.item}); setLastDate(today); setEditDate(false); setOpen(null); setAsking(row.id);
    } catch (e) { setNotice(tn(e.message) || t('沒有存到，請再試一次。')); }
    finally { setDoneBusy(false); }
  };
  const undoDone = async () => {
    if (!last || doneBusy) return;
    setDoneBusy(true);
    try { await store.atomic(data => restore(data, last)); setNotice(t('已復原，{label}還沒記完成。', {label: last.label})); setLast(null); setAsking(null); setEditDate(false); }
    catch (e) { setNotice(tn(e.message) || t('沒有復原，請再試一次。')); }
    finally { setDoneBusy(false); }
  };
  const changeDate = async date => {
    if (!last || !date || doneBusy) return;
    setDoneBusy(true);
    try { await store.atomic(data => recordCareDose(restore(data, last), last.id, date, today)); setLastDate(date); setEditDate(false); }
    catch (e) { setNotice(tn(e.message) || t('日期沒有改到，請再試一次。')); }
    finally { setDoneBusy(false); }
  };
  const done = row => isFollowUp(row.item) && root && catId
    ? h('button', {type: 'button', className: 'secondary-btn m-dose-trigger', 'aria-label': t('做完了：') + tn(row.label), onClick: () => startVisit(row)}, t('做完了'))
    : store && h('button', {type: 'button', className: 'secondary-btn m-dose-trigger', disabled: doneBusy, 'aria-label': t('做完了：') + tn(row.label), onClick: () => quickDone(row)}, t('做完了'));
  const scheduled = status && status.allowed === true && status.reminders !== false && Number.isSafeInteger(status.scheduled) ? status.scheduled : null;
  // 手機上排的是「則」（每項提前那天一則、當天一則），畫面上算「項」才不會讓人以為多排了。
  const beforeNine = new Date().getHours() < 9;
  // 網頁層沒有通知橋接（網頁預覽），或橋接查不到通知狀態（舊版 App、沒回應）：不說「已排好」也不跳權限卡，改一行溫和說明。
  const known = Boolean(status) && typeof status.allowed === 'boolean';
  const noBridge = !hasReminderBridge();
  const notifyNote = !known && (noBridge || checked) && (rows.some(row => row.item.next) || hasMeds)
    ? (noBridge ? t('這個版本無法設定手機通知，到期日會列在這張時間表；要跳通知，請打開手機上的毛孩小本本 App 確認。')
      : t('暫時讀不到手機通知狀態，到期日仍會列在這張時間表；請到手機設定確認毛孩小本本的通知已開。'))
    : '';
  const remindItems = rows.filter(row => row.item.next && row.item.enabled !== false && (row.item.next > today || (row.item.next === today && beforeNine))).length;
  return h('section', {className: 'care-timeline', 'aria-label': t('照顧時間表'), 'data-care-timeline': true},
    h('div', {className: 'care-timeline-head'},
      h('h2', null, t('照顧時間表')),
      onReminders && (rows.length > 0 || paused > 0) && h('button', {type: 'button', className: 'text-btn', onClick: onReminders}, t('全部提醒 ›'))),
    !rows.length && !paused && h('div', {className: 'care-timeline-empty'},
      h('p', null, t('還沒有照護日期。可先加上疫苗、驅蟲或回診。')),
      onReminders && !(root && catId) && h('button', {type: 'button', className: 'primary', onClick: () => window.dispatchEvent(new CustomEvent('paw-reminder-new-request'))}, cuteActionLabel(R,'care-add',t('＋ 新增照護')))),
    shown.length > 0 && h('ul', {className: 'care-timeline-list'}, shown.map(row => {
      const expanded = open === row.id;
      return h('li', {key: row.id, className: 'care-timeline-row ' + (STATE_CLASS[row.state] || '') + (expanded ? ' is-open' : '')},
        h('button', {type: 'button', className: 'care-timeline-text', 'aria-expanded': expanded, onClick: () => setOpen(expanded ? null : row.id)},
          h('strong', null, tn(row.label)), h('span', null, row.text)),
        row.canComplete && !expanded && done(row),
        !row.canComplete && !expanded && (row.state === 'needs-scheduling' || row.state === 'unscheduled') && store && asking !== row.id &&
          h('button', {type: 'button', className: 'secondary-btn', onClick: () => setAsking(row.id)}, t('填日期')),
        expanded && h('div', {className: 'care-timeline-detail'},
          row.item.note && h('p', null, row.item.note),
          row.item.last && h('p', null, t('上次完成：{last}', {last: row.item.last.replaceAll('-', '/')})),
          h('div', {className: 'care-timeline-actions'}, done(row),
            store && !isFollowUp(row.item) && h('button', {type: 'button', className: 'secondary-btn', onClick: () => { setOpen(null); setAsking(row.id); }}, row.item.next ? t('改日期') : t('填日期')))),
        last?.id === row.id && h('div', {className: 'care-done-toast', role: 'status'},
          h('span', null, t('已記下{label}（{when}）', {label: tn(row.label), when: lastDate === today ? t('今天') : `${Number(lastDate.slice(5, 7))}/${Number(lastDate.slice(8, 10))}`})),
          !editDate && h('button', {type: 'button', className: 'text-btn', disabled: doneBusy, onClick: () => setEditDate(true)}, t('改日期')),
          h('button', {type: 'button', className: 'text-btn', disabled: doneBusy, onClick: undoDone}, t('復原')),
          editDate && h('label', null, h('span', null, t('完成日期')), h('input', {type: 'date', max: today, value: lastDate, disabled: doneBusy, onChange: e => changeDate(e.target.value)}))),
        asking === row.id && store && h(NextDate, {react: R, store, item: row.item, today, onLater: () => { setAsking(null); setLast(null); setNotice(t('{label}已記下完成，下次日期之後在這裡補。', {label: tn(row.label)})); },
          onDone: async () => { setAsking(null); setLast(null); setNotice(t('已儲存{label}的下次日期。{await}', {label: tn(row.label), await: await savedReminderStatus()})); }}));
    })),
    rows.length > shown.length && h('p', {className: 'care-timeline-more'}, t('還有 {count} 項。', {count: rows.length - shown.length}), h('button', {type: 'button', className: 'text-btn', onClick: () => window.dispatchEvent(new CustomEvent('paw-care-open-request'))}, t('到照護看全部 ›'))),
    paused > 0 && h('p', {className: 'care-timeline-more'}, t('另有 {paused} 項暫停提醒，不會跳通知。', {paused}), onReminders && h('button', {type: 'button', className: 'text-btn', onClick: onReminders}, t('查看 ›'))),
    root && catId && h('ul', {className: 'care-timeline-list care-timeline-meds'}, h(MedToday, {react: R, root, catId, today, compact: medCompact})),
    // 藥袋送去線上解讀後離開了這頁：提示回到「記下這次看診」接回結果（填到一半的也會保留）。
    root && catId && !visiting && (p => p && p.catId === catId)(loadMedPending()) && h('button', {type: 'button', className: 'vv-bag-resume', onClick: () => startVisit(null)},
      h('strong', null, t('藥袋解讀')), h('span', null, t('繼續記看診，帶入藥袋讀到的藥 ›'))),
    // 2026-11-16（Ian 同意試）：原本三顆（記看診、排回診日、新增提醒）佔掉時間表一半高度，合成一顆「＋ 新增」，點開再選。
    root && catId && !booking && !visiting && h('div', {className: 'care-add'},
      h('button', {type: 'button', className: (!rows.length && !paused ? 'primary' : 'secondary-btn') + ' care-add-toggle', 'aria-expanded': adding, onClick: () => { setAdding(v => !v); setNotice(''); }}, adding ? t('收起') : cuteActionLabel(R,'care-add',t('＋ 新增照護'))),
      adding && h('div', {className: 'care-add-menu', role: 'group', 'aria-label': t('新增照護')},
        h('button', {type: 'button', className: 'care-add-item care-add-visit', onClick: () => { setAdding(false); startVisit(null); }},
          h('strong', null, cuteActionLabel(R,'vet-visit',t('記看診'))), h('span', null, t('看完醫生，記下用藥、交代與下次回診'))),
        store && h('button', {type: 'button', className: 'care-add-item care-add-follow', onClick: () => { setAdding(false); setBooking(true); setNotice(''); }},
          h('strong', null, t('排回診日')), h('span', null, t('只記下約好的回診日期'))),
        onReminders && h('button', {type: 'button', className: 'care-add-item care-add-reminder', onClick: () => { setAdding(false); window.dispatchEvent(new CustomEvent('paw-reminder-new-request')); }},
          h('strong', null, t('新增提醒')), h('span', null, t('疫苗、驅蟲、其他'))))),
    booking && store && h(FollowUpQuick, {react: R, store, today, onCancel: () => setBooking(false), autoFocus: true,
      onDone: async date => { setBooking(false); setNotice(t('已排回診 {date}/{date2}。{await}', {date: Number(date.slice(5, 7)), date2: Number(date.slice(8, 10)), await: await savedReminderStatus()})); }}),
    visiting && h(VetVisitForm, {react: R, root, catId, today, name, visitDate: followUp?.item.next || '', allowEmpty: Boolean(followUp), intro: followUp ? t('記下這次回診，存好後「{label}」就完成了。', {label: followUp.label}) : '', onClose: () => { setVisiting(false); setFollowUp(null); },
      onSaved: async visit => {
        const ended = followUp;
        setVisiting(false); setFollowUp(null);
        if (ended && store) { try { await endFollowUp(store, ended.id); } catch {} }
        const saved = `${t('已記下這次看診')}${ended ? t('，{label}完成了', {label: tn(ended.label)}) : ''}${visit.meds.length ? t('，{count} 種藥已加進照顧時間表', {count: visit.meds.length}) : ''}${visit.nextVisit ? t('，下次回診已加進時間表') : ''}${t('。')}`;
        setNotice(saved + (visit.meds.length || visit.nextVisit ? t('正在確認通知狀態…') : ''));
        setNotice(saved + (visit.meds.length || visit.nextVisit ? await savedReminderStatus() : ''));
      }}),
    notice && h('p', {className: 'care-timeline-notice', role: 'status'}, notice),
    status && status.allowed === false && (rows.some(row => row.item.next) || hasMeds)
      ? h('div', {className: 'care-timeline-permission'},
        h('p', null, h('strong', null, t('要開手機通知嗎？')), t('開啟並排程成功後，疫苗、驅蟲、回診會在提前幾天和當天依設定時間跳提醒；吃藥會在吃藥時間提醒。只在手機上排，不會上傳。')),
        h('button', {type: 'button', className: 'secondary-btn', onClick: askPermission}, t('開啟手機通知')))
      : notifyNote ? h('p', {className: 'care-timeline-status care-timeline-nobridge', role: 'note'}, notifyNote)
      // 2026-11-16：狀態縮成一行（說明拿掉，首頁短一點）；吃藥排程範圍仍要說，免得以為整個療程都排好了。
      : scheduled !== null && scheduled > 0 && h('p', {className: 'care-timeline-status is-compact'}, remindItems ? t('已排好 {remindItems} 項的手機提醒 ✓', {remindItems}) : t('吃藥提醒已排好 ✓'), hasMeds && h('span', null, t('吃藥提醒先排到 {today}，打開 App 會自動往後排。', {today: medHorizon(today)}))));
}
