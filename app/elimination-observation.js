/** Read-only family classification. Ambiguous historical prose stays unclassified. */
export const URINE_OPTIONS=Object.freeze({usual:'看到排尿，尿團和平常差不多',smaller:'看到排尿，尿團比平常小',larger:'看到排尿，尿團比平常大',observed:'看到排尿，尿量未比較',litter:'清砂時發現尿團，大小未比較',litterUsual:'清砂時發現尿團，和平常差不多',litterSmaller:'清砂時發現尿團，比平常小',litterLarger:'清砂時發現尿團，比平常大',unseen:'進砂盆，未看到是否排出',frequent:'比平常頻繁進砂盆，排出情況不確定'});
const valid=(o,v)=>typeof v==='string'&&Object.hasOwn(o,v);
export const isLitterUrine=row=>row.category==='排泄'&&eliminationKind(row)==='urine'&&valid(URINE_OPTIONS,row.urineStatus)&&row.urineStatus.startsWith('litter');
export function eliminationKind(row={}){
 if(row.category!=='排泄')return 'unknown';
 if(['urine','stool','unknown'].includes(row.eliminationKind))return row.eliminationKind;
 if(valid(URINE_OPTIONS,row.urineStatus)||row.metric==='urine'||String(row.text||'').trim()==='尿團變小')return 'urine';
 if(['normal','soft','diarrhea','blood'].includes(row.stoolStatus)||row.stoolEvent==='observed')return 'stool';
 const text=String(row.text||'');
 if(/尿/.test(text))return 'unknown';
 if(/便便|大便|糞便|排便|軟便|腹瀉|水便|拉肚子|血便|便血/.test(text))return 'stool';
 return 'unknown';
}
export const urineLabel=row=>valid(URINE_OPTIONS,row.urineStatus)?URINE_OPTIONS[row.urineStatus]:String(row.text||'').trim()==='尿團變小'?'尿團比平常小':'狀態未分類';
export function eliminationCounts(rows=[]){const counts={urine:0,stool:0,unknown:0};for(const row of rows)counts[eliminationKind(row)]++;return counts;}
export function chooseEliminationKind(record,kind){
 // Clear only the structured classification. Preserve the original note, time and ID.
 return {...record,...(isLitterUrine(record)?{amount:'',unit:''}:{}),eliminationKind:kind,metric:kind==='urine'?'urine':kind==='stool'?'stool':undefined,urineStatus:undefined,stoolStatus:undefined,stoolEvent:undefined};
}
