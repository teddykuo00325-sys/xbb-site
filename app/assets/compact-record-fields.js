import {t, K} from './i18n.js?v=audit1117b';
import {observationTextRequired,weightConfirmIssue,weightValueConfirmed,confirmWeightValue,bindWeightEdit} from './observation-entry.js?v=audit1117';
// 體重超出一般範圍（貓 0.1–20 公斤）時請飼主再確認一次；勾選後照原值保存，不硬擋。
// 與主程式同一個 observation-entry 模組網址，確認狀態才會共用。
// 2026-11-14：按儲存仍未勾選時，錯誤只在這個框裡顯示一次（data-inline-error 讓表單底部不再重複）；平常輸入時只用 status 提示。
export const WEIGHT_CONFIRM_FIELD=K('體重數值已確認');
function WeightRangeCheck({react:R,record,error=''}){
 const h=R.createElement,issue=weightConfirmIssue(record),[,refresh]=R.useState(0);
 if(!issue)return null;
 const confirmed=weightValueConfirmed(record),failing=!!error&&!confirmed;
 return h('div',{className:'weight-range-check',role:failing?'alert':'status',style:{border:'1px solid #c9a24a',background:'#fff8e6',color:'#4a3b12',borderRadius:12,padding:'8px 10px',fontSize:14,lineHeight:1.5}},
  h('style',null,`.weight-range-check p,.weight-range-check label{color:#4a3b12!important}`),
  h('p',{style:{margin:'0 0 6px',fontWeight:failing?700:undefined},'data-inline-error':failing?'':undefined},failing?error:issue),
  h('label',{style:{display:'flex',gap:8,alignItems:'center',minHeight:36}},h('input',{type:'checkbox','aria-label':t('體重數值已確認'),checked:confirmed,onChange:e=>{confirmWeightValue(record,e.target.checked);refresh(n=>n+1);}}),t('我確認數值正確，照這樣保存')));
}
export function CompactRecordFields({react:R,record,catId='',field,error,children}){
 const h=R.createElement,required=observationTextRequired(record);
 const [more,setMore]=R.useState(false),[time,setTime]=R.useState(false);
 const [weightSession]=R.useState({active:true,confirmed:''});
 bindWeightEdit(record,weightSession,catId);
 R.useEffect(()=>{if(!weightSession||typeof weightSession!=='object')return;weightSession.active=true;return()=>{weightSession.active=false;weightSession.confirmed='';};},[weightSession]);
 R.useEffect(()=>{if(error){if([K('日期'),K('時間')].includes(field))setTime(true);else if(field!==WEIGHT_CONFIRM_FIELD&&field!==K('體重（公斤）'))setMore(true);}},[error,field]);
 return h('section',{className:'compact-record-fields'},
  h('style',null,`.compact-observation-choices{border:0;padding:0;margin:0;display:flex;gap:8px;flex-wrap:wrap}.compact-observation-choices legend{margin-bottom:6px}.compact-observation-choices button{min-height:44px;padding:8px 12px;border:1px solid var(--paw-rim,#b5beb7);border-radius:12px;background:var(--paw-canvas,#fff);color:inherit;font:inherit}.compact-observation-choices button[aria-pressed=true]{border:2px solid #699377;font-weight:700}`),
  h('style',null,`.ij-page-review:has(.compact-record-fields) .app-content>.subtitle,.ij-page-review:has(.compact-record-fields) .pet-owner-hint{display:none}.ij-page-review:has(.compact-record-fields) .pet-owner-static{margin:0 0 6px}.ij-page-review:has(.compact-record-fields) .persistence-status.unsaved{margin:4px 0;padding:3px 8px;font-size:12px}.inpaw-app.ij-page-review .ij-review-fields:has(.compact-record-fields){margin:6px 0 0;padding:12px}.compact-record-fields{display:grid;gap:10px;align-content:start}.compact-record-fields>.field{margin:0}.compact-record-fields>details{border:1px solid var(--paw-rim,#b5beb7);border-radius:14px;padding:8px 10px}.compact-record-fields>details>summary{cursor:pointer;min-height:32px;line-height:32px;font-size:14px}.compact-record-fields>details[open]>summary{margin-bottom:10px}.compact-record-fields .field-pair{margin:0}.compact-record-fields textarea{min-height:80px}`),
  children[0],children[1],record.category===K('體重')&&h(WeightRangeCheck,{react:R,record,error:field===WEIGHT_CONFIRM_FIELD?error:''}),required&&children[2],
  h('details',{open:more,onToggle:e=>setMore(e.currentTarget.open)},h('summary',null,(required?t('補充數量與單位（選填）'):t('備註與補充細節（選填）'))+(record.category!==K('體重')&&String(record.amount??'').trim()?` · ${record.amount} ${t(record.unit||'')}`:'')),!required&&children[2],children[4]),
  h('details',{open:time,onToggle:e=>setTime(e.currentTarget.open)},h('summary',null,t('{v0} {time} · 改時間', {v0: (d=>{const n=new Date(),today=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');return d===today?t('今天'):String(d||'').replace(/^\d{4}-(\d{2})-(\d{2})$/,(m,a,b)=>Number(a)+'/'+Number(b));})(record.date), time: record.time})),children[3]));
}
