import {t, tn} from './i18n.js?v=audit1117b';
// Read-only capability status. Opening this panel never downloads or requests permission.
export function voiceCapability(host,status){
 if(!host)return t('此版本未提供本機語音');
 if(!status)return t('正在確認語音狀態');
 if(status.recordingSupported===false)return t('此裝置不支援錄音');
 if(status.state==='unavailable')return t('暫時無法確認語音狀態');
 if(status.state==='error')return tn(status.message)||t('語音暫時無法使用');
 if(status.engine==='system'&&(status.onDevice||status.nativeDefault))return status.available===false?(tn(status.message)||t('此語言暫不支援系統語音')):status.modelReady===false?t('系統離線語音包待安裝；尚未開始錄音'):t('系統提供離線語音；開始錄音時才確認權限');
 if(status.state==='downloading')return t('語音模型下載中');
 return status.modelReady?t('語音模型已安裝；錄音時會確認麥克風權限'):t('語音模型待下載；尚未開始錄音');
}
export function DeviceCapabilities({react:R}){
 const h=R.createElement,host=globalThis.window?.V161Asr;
 const [status,setStatus]=R.useState(null);
 R.useEffect(()=>{if(!host?.request)return;let active=true;const refresh=()=>host.request('status').then(value=>{if(active)setStatus(value)}).catch(()=>{if(active)setStatus({state:'unavailable'})});refresh();const timer=setInterval(refresh,5000);return()=>{active=false;clearInterval(timer)};},[host]);
 return h('p',{role:'status'},voiceCapability(!!host?.request,status));
}
