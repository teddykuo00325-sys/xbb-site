/** Read-only identity projection. Equal text with different IDs remains distinct. */
export function uniqueRecordRows(rows=[],{catId}={}){
 const seen=new Set();return rows.filter(row=>{if(!row)return false;const id=row.id;if(typeof id!=='string'||!id)return true;const key=JSON.stringify([row.catId??catId??null,id]);if(seen.has(key))return false;seen.add(key);return true;});
}

export const recordIsLive=(row,catId)=>row&&row.ownership!=='unconfirmed'&&row.catId!==null&&(row.catId===undefined||catId===undefined||row.catId===catId)&&!row.deleted&&!row.deletedAt&&!row.isDeleted&&!row.draft&&!['draft','deleted'].includes(row.status)&&row.confirmed!==false;
export const uniqueSavedRecords=(rows=[],{catId}={})=>uniqueRecordRows(rows.filter(row=>recordIsLive(row,catId)),{catId});
