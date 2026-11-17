import {PREP_ITEMS,VET_QUESTIONS,PREP_NOTE,getPreparation,savePreparation,preparationLines} from './vet-preparation-model.js?v=1';
import {t, tn} from './i18n.js?v=audit1117b';

// 草稿只暫存在此頁操作的記憶體；寫入成功後才標示已儲存。每個資料庫與毛孩分開。
const drafts=new WeakMap();
const signature=value=>JSON.stringify(value);
const cacheFor=root=>{if(!drafts.has(root))drafts.set(root,new Map());return drafts.get(root);};
export function exportPreparation(input){
 const data=input.root?.get?.()?.data;
 return data?preparationLines(getPreparation(data,input.catId)):[];
}
export function VetPreparation({react:R,root,catId,name=t('毛孩')}){
 const h=R.createElement,view=R.useSyncExternalStore(root.subscribe,root.get,root.get);
 const saved=getPreparation(view.data,catId),cache=cacheFor(root);
 const [form,setForm]=R.useState(()=>cache.get(catId)?.value||saved);
 const [baseline,setBaseline]=R.useState(()=>cache.get(catId)?.baseline||signature(saved));
 const [busy,setBusy]=R.useState(false),[error,setError]=R.useState(''),[notice,setNotice]=R.useState('');
 const [expanded,setExpanded]=R.useState(false),[reset,setReset]=R.useState(null);
 const lock=R.useRef(false),dirty=signature(form)!==baseline,conflict=signature(saved)!==baseline;
 R.useEffect(()=>{if(!dirty&&conflict){setForm(saved);setBaseline(signature(saved));cache.delete(catId);}},[signature(saved),dirty]);
 R.useEffect(()=>{if(!dirty)return;const guard=e=>{e.preventDefault();e.returnValue='';};globalThis.addEventListener?.('beforeunload',guard);return()=>globalThis.removeEventListener?.('beforeunload',guard);},[dirty]);
 const edit=patch=>{const value={...form,...patch};setForm(value);cache.set(catId,{value,baseline});setError('');setNotice('');};
 const toggle=(key,id)=>edit({[key]:form[key].includes(id)?form[key].filter(x=>x!==id):[...form[key],id]});
 const save=async event=>{
  event?.preventDefault?.();if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{await root.atomic(data=>{if(signature(getPreparation(data,catId))!==baseline)throw Error(t('已儲存的清單有變更，請先載入已儲存版本再編輯。'));return savePreparation(data,catId,form);});setBaseline(signature(form));cache.delete(catId);setNotice(t('回診清單已儲存在這台裝置，會附進看診資料包。'));}
  catch(e){setError(tn(e.message)||t('沒有儲存成功，內容仍保留，請再試一次。'));}
  finally{lock.current=false;setBusy(false);}
 };
 const group=(title,key,items)=>h('details',{className:'vp-group',open:key==='checked'?true:undefined},h('summary',null,title,`（${form[key].length}${key==='checked'?'/'+items.length:t(' 題')}）`),h('fieldset',{style:{border:0,padding:0,margin:0,minWidth:0}},h('legend',{className:'vp-sr-only'},title),items.map(item=>h('label',{key:item.id,className:'vp-option',style:{display:'flex',alignItems:'flex-start',gap:10,padding:'7px 0',lineHeight:1.6}},h('input',{type:'checkbox',checked:form[key].includes(item.id),disabled:busy,onChange:()=>toggle(key,item.id),style:{width:20,minWidth:20,height:20,marginTop:3,flexShrink:0},'aria-label':item.text}),h('span',{style:{flex:1,minWidth:0}},item.text)))));
 return h('details',{className:'advanced-vet av-card vet-preparation','data-testid':'vet-preparation',onToggle:e=>{if(e.target===e.currentTarget)setExpanded(e.currentTarget.open);}},
  h('style',null,`.vet-preparation{--vp-bg:#fffaf4}.vet-preparation>summary{display:flex;flex-wrap:nowrap;justify-content:space-between;gap:10px;list-style:none}.vet-preparation>summary::-webkit-details-marker{display:none}.vp-summary-copy{min-width:0}.vp-progress{display:block;font-size:13px;font-weight:400;margin-top:6px}.vp-chevron{font-size:24px;flex-shrink:0}.vp-savebar{position:sticky;top:0;z-index:3;background:var(--vp-bg);border:1px solid currentColor;border-radius:12px;padding:10px;margin:12px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.vp-savebar p{flex:1 1 110px;margin:0!important;font-size:12px}.vp-savebar button{min-height:44px;flex:1 1 110px}.vet-preparation .vp-group{border:1px solid var(--av-line,currentColor);border-radius:12px;padding:12px;margin:12px 0;min-width:0}.vp-group>summary{cursor:pointer;min-height:44px;display:list-item;font-weight:600}.vp-option{display:flex;align-items:flex-start;gap:10px;padding:7px 0;line-height:1.6}.vp-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.vp-next{border-top:1px solid currentColor;margin-top:16px;padding-top:12px}.vp-next button{min-height:44px;margin:5px 0;max-width:100%;width:100%}html[data-theme=dark] .vet-preparation{--vp-bg:#302b25}@media(prefers-color-scheme:dark){html:not([data-theme=light]) .vet-preparation{--vp-bg:#302b25}}`),
  h('summary',null,h('span',{className:'vp-summary-copy'},h('strong',null,t('回診準備清單・問獸醫清單')),h('span',{className:'vp-progress'},`${t('準備 {count}/{count2}・想問 {count3} 題', {count: form.checked.length, count2: PREP_ITEMS.length, count3: form.questions.length})}${dirty?t('・未儲存'):''}`)),h('span',{className:'vp-chevron','aria-hidden':true},expanded?'⌃':'⌄')),
  h('p',null,t('{name}的回診準備。依這次需要選擇即可，不必全部勾選；提問勾選只表示想問，不代表已得到解答。', {name})),
  h('p',{className:'av-note'},PREP_NOTE),
  h('form',{onSubmit:save},h('div',{className:'vp-savebar'},h('p',{role:'status'},dirty?t('尚未儲存，下載只帶已儲存版本。'):t('已保存的清單會附進看診資料包。')),h('button',{type:'submit',className:'primary',disabled:busy||!dirty},busy?t('正在儲存…'):t('儲存回診清單'))),error&&h('p',{role:'alert',className:'av-error'},error),notice&&h('p',{role:'status'},notice),group(t('回診準備清單'),'checked',PREP_ITEMS),group(t('問獸醫清單（勾選想問的問題）'),'questions',VET_QUESTIONS),
   h('label',{className:'field'},t('自己想問的問題'),h('textarea',{value:form.note,maxLength:2000,disabled:busy,'aria-label':t('自己想問的問題'),placeholder:t('例如：這週的變化，需要再補記哪些資訊？'),onChange:e=>edit({note:e.target.value})})),
   h('p',{className:'av-note',role:'status'},dirty?t('有尚未儲存的變更，下載只會帶入已儲存版本。'):t('清單依毛孩分開保存在本機，包含在備份中；不用 AI、不扣額度。')),
   conflict&&h('button',{type:'button',className:'secondary',disabled:busy,onClick:()=>{setForm(saved);setBaseline(signature(saved));cache.delete(catId);setError('');setNotice(t('已載入先前儲存的版本。'));}},t('載入已儲存版本'))),
  h('section',{className:'vp-next'},!reset?h('button',{type:'button',className:'secondary',disabled:busy,onClick:()=>setReset('choose')},t('開始下一次回診準備')):h('div',{role:'group','aria-label':t('下一次回診準備')},h('strong',null,t('下一次回診要怎麼準備？')),h('p',null,dirty?t('目前有未儲存修改。套用下列選項會變更這份草稿，原本已儲存的版本不會自動被覆蓋。'):t('選擇後會先變成草稿，還要按「儲存回診清單」才會保存。')),reset==='choose'?h(R.Fragment,null,h('button',{type:'button',className:'secondary',onClick:()=>setReset('keep')},t('清除準備勾選，保留提問')),h('button',{type:'button',className:'secondary',onClick:()=>setReset('all')},t('全部重新準備'))):h(R.Fragment,null,h('p',null,reset==='keep'?t('將清除準備勾選，保留目前選擇的提問與自填問題。'):t('將清除這份草稿的準備、提問勾選及自填問題。')),h('button',{type:'button',className:'primary',onClick:()=>{edit(reset==='keep'?{checked:[]}:{checked:[],questions:[],note:''});setReset(null);setNotice(t('已套用到草稿，請按「儲存回診清單」完成保存。'));}},t('確認套用到草稿'))),h('button',{type:'button',className:'secondary',onClick:()=>setReset(null)},t('取消')))),
  h('details',{className:'av-sources'},h('summary',null,t('一般準備建議的參考資料')),
   h('p',null,t('清單協助整理資料與提問，不提供診斷或自行調整用藥的建議。')),
   h('p',null,h('a',{href:'https://www.zoetispetcare.com/blog/article/what-bring-pet-veterinary-appointment',target:'_blank',rel:'noopener noreferrer'},t('Zoetis：看診要帶的資料'))),
   h('p',null,h('a',{href:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10845437/',target:'_blank',rel:'noopener noreferrer'},t('AAFP／ISFM：貓友善看診指引')))));
}
