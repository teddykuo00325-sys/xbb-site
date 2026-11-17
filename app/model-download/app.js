import {t} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
import {getSharedModelStore} from '/xbb-site/app/assets/local-voice-download.js?v=ai-names1';
export function mountModelDownload(root,{onBack=()=>{},onNavigate=()=>{},model='asr'}={}){
root.innerHTML=`<link rel="stylesheet" href="/xbb-site/app/model-download/style.css?v=caa4c6bb2ec4"><div id="app" tabindex="-1"></div><dialog id="reset-dialog" aria-labelledby="reset-title"><h2 id="reset-title">${t('重設下載示範？')}</h2><p>${t('只清除目前選定模型的示範進度，另一個模型的進度保留。照護紀錄與毛孩資料不會改變。')}</p><div class="actions"><button id="confirm-reset" class="button">${t('重設示範')}</button><button id="close-reset" class="button secondary">${t('保留進度')}</button></div></dialog>`;
const app=root.querySelector('#app'),dialog=root.querySelector('#reset-dialog');
let active=true,destroyed=false;

const models={asr:{title:t('語音轉文字模型'),short:t('語音轉文字 ASR'),kind:'ASR',purpose:t('規劃把說出的照護內容轉成文字，供你核對與修改；不負責解讀報告或作診斷。'),note:t('語音與文字快記中的下載入口，也使用這一份 ASR 示範進度。')},text:{title:t('文字整理模型'),short:t('文字整理模型'),kind:'TEXT',purpose:t('規劃在手機整理你輸入或核對過的文字，協助形成待確認草稿；最終能力尚未定案，不代表能分析醫療報告。'),note:t('文字整理與 ASR 分開管理；看懂報告仍屬進階模式示範。')}};
const stores=Object.fromEntries(Object.keys(models).map(model=>[model,getSharedModelStore(model)]));
let selected=['asr','text'].includes(model?.replace(/^#/,''))?model.replace(/^#/,''):'asr',store=stores[selected];
const preferences={asr:{consent:false,scenario:'normal'},text:{consent:false,scenario:'normal'}};
let consent=false,network=store.get().network,scenario='normal';
const names={idle:t('準備下載前，先看清楚'),waiting:t('等待 Wi-Fi（示範）'),downloading:t('正在示範下載'),paused:t('下載示範已暫停'),complete:t('下載流程示範完成')};
function demoStatus(s){return s.phase==='idle'?t('下載流程尚未體驗'):t('{phase} · {percent}%（非安裝狀態）',{phase:names[s.phase],percent:s.percent});}
const button=(id,title,kind='',disabled=false)=>`<button id="${id}" class="button ${kind}" ${disabled?'disabled':''}>${title}</button>`;
function render(){const focused=root.activeElement?.id,expanded=app.querySelector('details.scenario')?.open;const meta=models[selected],s=store.get(),started=s.phase!=='idle',complete=s.phase==='complete';
app.innerHTML=`<div class="hero-top"><span class="eyebrow">ON-DEVICE AI</span><span class="tag">${t('手機模式 · 選配規劃')}</span></div><p class="intro">${t('先記錄，需要時再選手機模式。')}<br>${t('進階模式文字整理、摘要與看懂報告不需下載手機模型；進階模式功能不用登入。兩種手機模型都尚未提供真正下載，現在只體驗流程。')}</p><div class="model-list" aria-label="${t('選擇要管理的模型')}">${Object.entries(models).map(([id,model])=>`<button type="button" class="model-option ${selected===id?'selected':''}" data-model="${id}" aria-pressed="${selected===id}"><span class="eyebrow">${model.kind} · ${t('手機模式')}</span><strong>${model.short}</strong><span class="model-real-status">${t('未安裝 · 功能未啟用')}</span><small data-model-progress="${id}">${demoStatus(stores[id].get())}</small><span class="model-manage">${selected===id?t('正在查看 ↓'):t('查看用途與下載示範 →')}</span></button>`).join('')}</div><ol class="steps" aria-label="${t('下載流程')}"><li class="${!started?'active':''}"><b>01</b>${t('下載前說明')}</li><li class="${started&&!complete?'active':''}"><b>02</b>${t('示範進度')}</li><li class="${complete?'active':''}"><b>03</b>${t('確認狀態')}</li></ol>
<section class="card"><div class="model-title"><div class="model-art" aria-hidden="true">↓</div><div><h2>${meta.title}</h2><span class="tag amber">${t('模型與最終功能尚未選定')}</span></div></div><p class="helper" style="margin-top:17px">${meta.purpose}</p><p class="helper">${meta.note}</p><p class="model-real-status">${t('實際狀態：未安裝 · 功能未啟用 · 尚未提供離線 AI')}</p><p class="helper">${t('容量：待選型與實測確認 · 裝置支援：待驗證')}</p><details class="specs"><summary>${t('下載前規格與支援說明')}</summary><dl class="facts"><div><dt>${t('模型名稱與版本')}</dt><dd>${t('待選型確認')}</dd></div><div><dt>${t('目前下載與功能狀態')}</dt><dd>${t('未開放，僅流程示範')}</dd></div><div><dt>${t('實際下載大小')}</dt><dd>${t('待選型與實測確認')}</dd></div><div><dt>${t('需要的可用空間')}</dt><dd>${t('待確認（含安裝空間）')}</dd></div><div><dt>${t('支援機型與系統版本')}</dt><dd>${t('尚未確認')}</dd></div><div><dt>${t('手機模式使用方式')}</dt><dd>${t('規劃免費 · 不用進階模式額度')}</dd></div></dl><div class="notice"><strong>${t('正式下載尚未開放')}</strong>${t('下載大小、空間、支援裝置、網路與電量條件確認後，才會提供真正的下載按鈕。這裡不顯示假裝測出的裝置相容結果。')}</div></details></section>
<section class="card" aria-label="${t('模型下載流程示範')}"><span class="model-section-label">${t('{name} · 下載流程',{name:meta.short})}</span><div class="download-title"><div><span class="eyebrow">INTERACTIVE DEMO</span><h2>${names[s.phase]}</h2></div>${started?`<strong aria-hidden="true">${s.percent}%</strong>`:''}</div><p class="helper">${t('示範動畫不代表真實網路傳輸；不會下載模型、開啟麥克風、辨識錄音或自動轉線上。')}</p>${started?`<progress max="100" value="${s.percent}" aria-label="${t('模型下載示範進度')}"></progress><p class="status" role="status">${names[s.phase]} · ${s.percent}%</p>`:''}${s.phase==='waiting'?'<div class="notice">'+t('目前示範為行動網路或離線。等待 Wi-Fi，進度保留；沒有偵測真實網路。')+'</div>':''}${s.phase==='paused'?'<p class="helper">'+t('示範進度已保留，可接續。重新整理也不會自動開始下載。')+'</p>':''}${complete?`<div class="notice green"><div class="completed"><span class="completed-mark" aria-hidden="true">✓</span><div><strong>${t('流程已走完，沒有安裝模型。')}</strong>${t('{name}尚未啟用，沒有取得離線 AI 能力。你仍可回小本本，手動免費記錄。',{name:meta.short})}</div></div></div>`:''}${!s.persistent?'<div class="notice error" role="alert">'+t('瀏覽器無法保留示範進度；重新整理後可能重設。照護紀錄不受這個示範影響。')+'</div>':''}
${!started?`<label class="check"><input id="consent" type="checkbox" ${consent?'checked':''}><span>${t('我已閱讀下載前說明，開始操作示範')}<small>${t('這不是下載、安裝或資料傳送的正式授權，也不會收費。')}</small></span></label>`:''}
${scenario==='storage'?'<div class="notice error" role="alert"><strong>'+t('示範：可用空間不足')+'</strong>'+t('不開始或繼續下載。正式功能需先提示所需空間；目前沒有讀取你的手機空間。')+'</div>':scenario==='interrupted'?'<div class="notice error" role="alert"><strong>'+t('示範：下載中斷')+'</strong>'+t('保留目前示範進度。先確認網路，再由你決定重試，不會自動重新下載。')+'</div>':''}
<div class="actions">${scenario==='interrupted'?button('retry',t('重試下載示範')):''}${started&&!complete?button('cancel',t('取消下載示範'),'secondary'):''}${complete?button('remove',t('移除示範狀態'),'secondary'):''}${!started?button('start',t('開始下載流程示範'),'',!consent||scenario!=='normal'):['downloading','waiting'].includes(s.phase)?button('pause',t('暫停示範'),'secondary'):s.phase==='paused'?button('resume',t('從 {percent}% 接續示範',{percent:s.percent}),'',scenario!=='normal'):''}${complete?'<a class="button" href="/" data-back>'+t('回小本本，手動記錄')+'</a>':`<a class="button secondary" href="/" data-back>${started?t('先去手動記錄'):t('稍後再說，回小本本')}</a>`}</div>
<details class="scenario" ${scenario!=='normal'||expanded?'open':''}><summary>${t('試試不同下載情境')}</summary><div class="two"><label class="field">${t('示範網路（不偵測真實連線）')}<select id="network"><option value="wifi" ${network==='wifi'?'selected':''}>Wi-Fi</option><option value="mobile" ${network==='mobile'?'selected':''}>${t('行動網路')}</option><option value="offline" ${network==='offline'?'selected':''}>${t('離線')}</option></select></label><label class="field">${t('示範狀況（不讀取裝置狀態）')}<select id="scenario"><option value="normal" ${scenario==='normal'?'selected':''}>${t('一般流程')}</option><option value="storage" ${scenario==='storage'?'selected':''}>${t('可用空間不足')}</option><option value="interrupted" ${scenario==='interrupted'?'selected':''}>${t('下載中斷')}</option></select></label></div><p>${t('選擇「一般流程」後，再點接續。重整會暫停進度，示範網路恢復 Wi-Fi；只儲存各模型的示範進度，不儲存模型檔案。')}</p><div class="actions">${button('reset',t('重設下載示範'),'ghost')}</div></details></section>
<section class="card"><h2>${t('手機模式與進階模式，分開選擇')}</h2><div class="compare"><div><h3>${t('手機模式 · 規劃中')}</h3><p>${t('手機模式是選配，不是開始記錄的門檻。ASR 與文字整理分開驗證，目前都未實作。必須確認裝置、語言與資源支援真正在手機上辨識，並取得麥克風許可，才開放語音；狀態不明、不支援或失敗就手動輸入，保留可取得的文字草稿。錄音不會傳送到線上。')}</p><span class="tag">${t('規劃免費 · 不用額度')}</span></div><div><h3>${t('進階模式')}</h3><p>${t('文字整理與摘要已可使用，不需下載手機模型；看懂報告的進階模式功能還沒開放。每次送出前，會先確認要送的文字、用途、接收服務與額度；辨識後的文字也須另外確認。手機端失敗不會自動上傳。')}</p><a class="text-link" href="/#/ai/report" data-route="report">${t('體驗看懂報告 →')}</a></div></div><p class="helper">${t('進階模式不用登入，每次送出會用 1 次額度；方案說明請到設定的「方案」。這次示範不收費。')}</p></section><details class="card"><summary>${t('不下載，可以做什麼？')}</summary><p>${t('可以繼續手動記錄、查看與修改已儲存的照護資料。體驗進階模式文字與報告流程也不需下載模型。此頁不會讀取或改動毛孩資料，不影響既有免費與 Pro 預覽功能。')}</p><ul><li>${t('不下載，不代表要改用線上；沒有網路或額度也能手動記錄。')}</li><li>${t('下載流程示範完成，不代表安裝成功。')}</li><li>${t('AI 處理、登入與備份分開；進階模式不會自動備份，登入也不是全部資料的上傳同意。目前沒有雲端備份。')}</li><li>${t('正式上線前仍需確認裝置相容性、模型用途、大小與安全來源。')}</li></ul></details>`;
bind();const focusId=({start:'pause',pause:'resume',resume:'pause'})[focused]||focused;if(focusId)root.getElementById(focusId)?.focus({preventScroll:true});}
const byId=(id,fn,event='click')=>{const el=root.getElementById(id);if(el)el.addEventListener(event,fn)};
function selectModel(id){
 if(!stores[id]||id===selected)return;
 preferences[selected]={consent,scenario};
 store.send({type:'pause'});selected=id;store=stores[selected];
 ({consent,scenario}=preferences[selected]);network=store.get().network;previousPhase=store.get().phase;
 render();
}
function bind(){
 for(const link of app.querySelectorAll('[data-back]'))link.onclick=e=>{e.preventDefault();pause();onBack();};
 for(const link of app.querySelectorAll('[data-route]'))link.onclick=e=>{e.preventDefault();pause();onNavigate(link.dataset.route);};
 for(const option of app.querySelectorAll('[data-model]'))option.onclick=()=>{selectModel(option.dataset.model);app.querySelector('[data-model="'+selected+'"]')?.focus({preventScroll:true});};
 byId('consent',e=>{consent=e.target.checked;root.getElementById('start').disabled=!consent||scenario!=='normal'},'change');byId('start',()=>{if(consent&&scenario==='normal')store.send({type:'start'})});byId('pause',()=>store.send({type:'pause'}));byId('resume',()=>{if(scenario==='normal')store.send({type:'resume'})});byId('network',e=>{network=e.target.value;store.send({type:'network',value:network})},'change');byId('scenario',e=>{scenario=e.target.value;if(scenario!=='normal')store.send({type:'pause'});render();root.getElementById('scenario')?.focus({preventScroll:true})},'change');byId('retry',()=>{scenario='normal';if(store.get().phase==='idle'){render();}else store.send({type:'resume'});});byId('cancel',()=>{store.send({type:'pause'});root.getElementById('reset-title').textContent=t('取消{name}下載示範？',{name:models[selected].short});dialog.showModal()});byId('remove',()=>{root.getElementById('reset-title').textContent=t('移除{name}示範狀態？',{name:models[selected].short});dialog.showModal()});byId('reset',()=>{root.getElementById('reset-title').textContent=t('重設{name}示範？',{name:models[selected].short});dialog.showModal()});}
// Update progress without replacing focused controls during each timer tick.
let previousPhase=store.get().phase;
const unsubscribers=Object.entries(stores).map(([id,current])=>current.subscribe(()=>{if(!active||destroyed)return;if(id!==selected){const label=app.querySelector('[data-model-progress="'+id+'"]');if(label)label.textContent=demoStatus(current.get());return;}const s=store.get();if(s.phase===previousPhase&&s.phase==='downloading'){const progress=app.querySelector('progress'),percent=app.querySelector('.download-title>strong'),status=app.querySelector('.status');const modelProgress=app.querySelector('[data-model-progress="'+selected+'"]');if(modelProgress)modelProgress.textContent=demoStatus(s);if(progress)progress.value=s.percent;if(percent)percent.textContent=s.percent+'%';if(status)status.textContent=names[s.phase]+' · '+s.percent+'%';return;}previousPhase=s.phase;network=s.network;render();}));
root.getElementById('confirm-reset').onclick=()=>{dialog.close();consent=false;scenario='normal';store.send({type:'reset'});app.focus({preventScroll:true})};root.getElementById('close-reset').onclick=()=>dialog.close();
function pause(){
 if(destroyed)return;
 active=false;
 Object.values(stores).forEach(s=>s.send({type:'pause'}));
 if(dialog.open)dialog.close();
}
function resume(nextModel){
 if(destroyed)return;
 active=true;
 if(nextModel)selectModel(nextModel.replace(/^#/,''));
 network=store.get().network;previousPhase=store.get().phase;render();
}
function destroy(){
 if(destroyed)return;
 pause();destroyed=true;unsubscribers.forEach(unsubscribe=>unsubscribe());root.innerHTML='';
}
render();
return {pause,resume,destroy};
}
