import {t, K} from './i18n.js?v=audit1117b';
import {requireActivePet,assertPetArchiveTransition} from './pet-archive.js?v=8f5745b7843b';
/** Same-browser care coordination. Role checks are application safeguards, not authentication. */
const ROOT='cat-original';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const roles=['admin','caregiver','viewer'];
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_:.-]{1,180}$/.test(value);
const iso=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))return false;return new Date(value).toISOString()===value.replace(/Z$/,value.includes('.')?'Z':'.000Z');};
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const time=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const cleanName=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>40)throw Error(t('請填寫 1–40 字的成員姓名。'));return value.trim();};
const snapshot=member=>({id:member.id,name:member.name});
const actorValid=actor=>object(actor)&&validId(actor.id)&&typeof actor.name==='string'&&actor.name.trim().length>0&&actor.name.length<=40;
const live=row=>row&&!row.deleted&&!row.deletedAt&&!row.isDeleted&&row.status!=='deleted';
const dates=item=>[...new Set([...(item?.history||[]),item?.last].filter(day))];
const sets=data=>[{id:ROOT,data},...(data.multiCat?.cats||[]).filter(cat=>cat.id!==ROOT).map(cat=>({id:cat.id,data:cat.data}))];
const scope=(data,id)=>{const found=sets(data).find(cat=>cat.id===(id||ROOT));if(!found?.data)throw Error(t('找不到這隻毛孩，資料未變更。'));return found.data;};
const putScope=(data,id,next)=>id===ROOT?next:{...data,multiCat:{...data.multiCat,cats:data.multiCat.cats.map(cat=>cat.id===id?{...cat,data:next}:cat)}};
const localDay=now=>{const date=new Date(now);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
export const FAMILY_ROLES=Object.freeze({admin:t('管理者'),caregiver:t('共同照顧者'),viewer:t('僅檢視')});
export function ensureFamilyData(data,now=new Date().toISOString()){
 if(!object(data))throw Error(t('無法讀取本機家庭資料。'));
 if(own(data,'familySharing'))return data;
 return {...data,familySharing:{version:1,currentMemberId:'member-self',members:[{id:'member-self',name:K('我'),role:'admin',joinedAt:now}],invites:[]}};
}
export function activeMembers(data){return (data.familySharing?.members||[]).filter(member=>!member.removedAt);}
export function currentMember(data){return activeMembers(data).find(member=>member.id===data.familySharing?.currentMemberId)||null;}
export function familyRole(data){return currentMember(data)?.role||'viewer';}
export function careAssignee(data,item){return activeMembers(data).find(member=>member.id===item.assigneeId)||null;}
export function latestDoseActor(item,date){const event=[...(item.familyEvents||[])].reverse().find(event=>event.date===date&&['completed','dose-removed'].includes(event.type));return event?.type==='completed'?event.actor:null;}
export function canDeleteRecord(data,row){const actor=currentMember(data);return Boolean(actor&&(actor.role==='admin'||actor.role==='caregiver'&&row?.createdBy?.id===actor.id));}
export function canDeleteDose(data,item,date){const actor=currentMember(data);return Boolean(actor&&(actor.role==='admin'||actor.role==='caregiver'&&latestDoseActor(item,date)?.id===actor.id));}

function validRowMetadata(row){
 if(row.createdBy!==undefined&&!actorValid(row.createdBy)||row.editedBy!==undefined&&!actorValid(row.editedBy))return false;
 if(row.createdAt!==undefined&&!iso(row.createdAt)||row.editedAt!==undefined&&!iso(row.editedAt))return false;
 if(row.handover!==undefined&&(!object(row.handover)||!actorValid(row.handover.from)||!actorValid(row.handover.to)||!iso(row.handover.at)))return false;
 return true;
}
export function validFamilyData(data){
 if(!object(data))return false;
 if(!own(data,'familySharing'))return true;
 const family=data.familySharing;
 if(!object(family)||family.version!==1||!Array.isArray(family.members)||!family.members.length||!Array.isArray(family.invites))return false;
 const ids=new Set();
 for(const member of family.members){if(!object(member)||!validId(member.id)||ids.has(member.id)||typeof member.name!=='string'||!member.name.trim()||member.name.length>40||!roles.includes(member.role)||!iso(member.joinedAt)||member.removedAt!==undefined&&!iso(member.removedAt))return false;ids.add(member.id);}
 if(!currentMember(data)||!activeMembers(data).some(member=>member.role==='admin'))return false;
 const invitationIds=new Set(),codes=new Set();
 for(const invite of family.invites){
  if(!object(invite)||!validId(invite.id)||invitationIds.has(invite.id)||typeof invite.code!=='string'||!invite.code.trim()||invite.code.length>100||codes.has(invite.code)||!roles.includes(invite.role)||!iso(invite.createdAt)||!iso(invite.expiresAt)||Date.parse(invite.expiresAt)<=Date.parse(invite.createdAt)||!['pending','joined','cancelled'].includes(invite.status))return false;
  if(invite.status==='joined'&&(!ids.has(invite.memberId)||!iso(invite.usedAt)))return false;
  if(invite.status==='cancelled'&&!iso(invite.cancelledAt))return false;
  invitationIds.add(invite.id);codes.add(invite.code);
 }
 for(const {data:cat} of sets(data)){
  if(!cat||!['entries','changes','careItems'].every(key=>Array.isArray(cat[key]||[])))return false;
  if([...(cat.entries||[]),...(cat.changes||[])].some(row=>!validRowMetadata(row)))return false;
  for(const item of cat.careItems||[]){
   if(!validRowMetadata(item)||item.assigneeId!==undefined&&item.assigneeId!==null&&!activeMembers(data).some(member=>member.id===item.assigneeId&&member.role!=='viewer')||item.snoozedUntil!==undefined&&item.snoozedUntil!==null&&!iso(item.snoozedUntil))return false;
   if(item.familyEvents!==undefined){
    if(!Array.isArray(item.familyEvents))return false;const eventIds=new Set();
    for(const event of item.familyEvents){if(!object(event)||!validId(event.id)||eventIds.has(event.id)||!['assigned','unassigned','completed','dose-removed','snoozed','rescheduled','restored'].includes(event.type)||!iso(event.at)||!actorValid(event.actor)||['completed','dose-removed'].includes(event.type)&&!day(event.date)||event.assignee!==undefined&&event.assignee!==null&&!actorValid(event.assignee))return false;eventIds.add(event.id);}
   }
  }
 }
 return (data.multiCat?.householdEntries||[]).every(validRowMetadata);
}
function readOnlyComparable(data){
 const family=data.familySharing?{...data.familySharing,currentMemberId:null}:undefined;
 return {...data,...(family?{familySharing:family}:{}),...(data.multiCat?{multiCat:{...data.multiCat,activeId:null}}:{})};
}
function assertFamilyMetadata(before,after,actor){
 const old=before.familySharing,next=after.familySharing;
 if(!next)throw Error(t('家庭資料不可移除，原資料仍保留。'));
 if(actor.role!=='admin'&&!equal({...old,currentMemberId:null},{...next,currentMemberId:null}))throw Error(t('只有管理者可以管理成員與邀請。'));
 for(const member of old.members){const kept=next.members.find(row=>row.id===member.id);if(!kept)throw Error(t('移除成員須保留原成員資料與歷史。'));if(member.removedAt&&!equal(member,kept))throw Error(t('已移除成員的歷史資料不可變更。'));if(member.joinedAt!==kept.joinedAt)throw Error(t('成員加入時間不可變更。'));}
}
function stripAttribution(row){const {createdBy,createdAt,editedBy,editedAt,...rest}=row;return rest;}
function stampRows(before,after,actor,now){
 const prior=new Map((before||[]).map(row=>[row.id,row]));
 for(const row of before||[]){const next=(after||[]).find(item=>item.id===row.id);if((!next||live(row)&&!live(next))&&actor.role!=='admin'&&row.createdBy?.id!==actor.id)throw Error(t('共同照顧者不可刪除他人的紀錄；舊紀錄請由管理者處理。'));}
 return (after||[]).map(row=>{
  const old=prior.get(row.id);
  if(!old){if(row.demo===true)return row;return {...row,createdBy:snapshot(actor),createdAt:now};}
  const base={...row};
  // Edits must not rewrite or manufacture the historical creator.
  for(const key of ['createdBy','createdAt','handover'])if(own(old,key))base[key]=old[key];else delete base[key];
  if(!equal(stripAttribution(old),stripAttribution(row))){base.editedBy=snapshot(actor);base.editedAt=now;}else for(const key of ['editedBy','editedAt'])if(own(old,key))base[key]=old[key];else delete base[key];
  return equal(base,row)?row:base;
 });
}
const schedule=item=>({next:item.next||'',snoozedUntil:item.snoozedUntil??null});
function stampCare(before,after,actor,now,operationId,data){
 const map=new Map((before||[]).map(item=>[item.id,item]));
 for(const old of before||[])if(!(after||[]).some(item=>item.id===old.id)&&actor.role!=='admin')throw Error(t('只有管理者可以刪除整項照護提醒。'));
 return (after||[]).map(item=>{
  const old=map.get(item.id),oldEvents=old?.familyEvents||[],incoming=item.familyEvents||[];
  if(incoming.length<oldEvents.length||!equal(incoming.slice(0,oldEvents.length),oldEvents))throw Error(t('照護歷程不可改寫或移除。'));
  const events=[...oldEvents,...incoming.slice(oldEvents.length).map(event=>({...event,actor:snapshot(actor)}))];
  const add=(type,extra)=>{const matching=events.slice(oldEvents.length).some(event=>event.type===type&&(extra.date===undefined||event.date===extra.date));if(!matching)events.push({id:`${operationId}:${item.id}:${type}:${extra.date||events.length}`,type,at:now,actor:snapshot(actor),...extra});};
  const oldDates=dates(old),newDates=dates(item);
  for(const date of oldDates)if(!newDates.includes(date)){if(actor.role!=='admin'&&latestDoseActor(old,date)?.id!==actor.id)throw Error(t('共同照顧者不可刪除他人的完成紀錄；舊紀錄請由管理者處理。'));add('dose-removed',{date});}
  for(const date of newDates)if(!oldDates.includes(date)&&!item.demo)add('completed',{date});
  if((old?.assigneeId??null)!==(item.assigneeId??null)){
   const member=item.assigneeId?activeMembers(data).find(member=>member.id===item.assigneeId&&member.role!=='viewer'):null;
   if(item.assigneeId&&!member)throw Error(t('負責人必須是仍在家庭中的管理者或共同照顧者。'));
   add(member?'assigned':'unassigned',{before:{assigneeId:old?.assigneeId??null},after:{assigneeId:item.assigneeId??null},assignee:member?snapshot(member):null});
  }
  if(old&&old.next!==item.next&&!events.slice(oldEvents.length).some(event=>['rescheduled','restored'].includes(event.type)))add('rescheduled',{before:schedule(old),after:schedule(item)});
  if(old&&(old.snoozedUntil??null)!==(item.snoozedUntil??null)&&!events.slice(oldEvents.length).some(event=>['snoozed','restored'].includes(event.type)))add('snoozed',{before:schedule(old),after:schedule(item)});
  const base={...item,...(events.length||own(item,'familyEvents')?{familyEvents:events}:{})};
  if(old)for(const key of ['createdBy','createdAt'])if(own(old,key))base[key]=old[key];else delete base[key];
  else if(!item.demo){base.createdBy=snapshot(actor);base.createdAt=now;}
  return equal(base,item)?item:base;
 });
}
/** Guard every domain mutation, including stale UI callbacks; no account security is claimed. */
export function applyFamilyTransition(before,after,context={}){
 assertPetArchiveTransition(before,after);
 if(!before.familySharing)return after;
 const actor=currentMember(before);if(!actor)throw Error(t('目前身分已失效，請重新選擇家庭成員。'));
 const now=context.now||new Date().toISOString(),operationId=context.id||`operation-${Date.parse(now)}`;
 if(!iso(now))throw Error(t('操作時間無效。'));
 assertFamilyMetadata(before,after,actor);
 if(actor.role==='viewer'){
  if(!equal(readOnlyComparable(before),readOnlyComparable(after)))throw Error(t('僅檢視身分不能修改'));
  if(!validFamilyData(after))throw Error(t('家庭資料格式錯誤，原資料未變更。'));
  return after;
 }
 const oldSets=sets(before),newSets=sets(after);
 if(actor.role!=='admin'&&!equal(oldSets.map(cat=>cat.id),newSets.map(cat=>cat.id)))throw Error(t('只有管理者可以新增或移除毛孩。'));
 if(actor.role!=='admin'&&!equal((before.multiCat?.cats||[]).map(({id,archivedAt,archiveGeneration})=>({id,archivedAt,archiveGeneration})),(after.multiCat?.cats||[]).map(({id,archivedAt,archiveGeneration})=>({id,archivedAt,archiveGeneration}))))throw Error(t('只有管理者可以封存或恢復毛孩。'));
 let next=after;
 for(const cat of newSets){
  const old=oldSets.find(item=>item.id===cat.id)?.data||{},value=scope(next,cat.id);
  if(actor.role!=='admin'){
   for(const key of ['name','age','note','breed','sex','colorId','photo'])if(!equal(old.cat?.[key],value.cat?.[key]))throw Error(t('只有管理者可以修改毛孩基本資料。'));
   if((old.foodCards||[]).some(card=>!(value.foodCards||[]).some(row=>row.id===card.id)))throw Error(t('只有管理者可以清除食品資料。'));
  }
  const entries=own(value,'entries')?stampRows(old.entries,value.entries,actor,now):value.entries,changes=own(value,'changes')?stampRows(old.changes,value.changes,actor,now):value.changes,careItems=own(value,'careItems')?stampCare(old.careItems,value.careItems,actor,now,operationId,next):value.careItems;
  if(!equal(entries,value.entries)||!equal(changes,value.changes)||!equal(careItems,value.careItems))next=putScope(next,cat.id,{...value,...(own(value,'entries')?{entries}:{}),...(own(value,'changes')?{changes}:{}),...(own(value,'careItems')?{careItems}:{})});
 }
 if(next.multiCat){const householdEntries=stampRows(before.multiCat?.householdEntries,next.multiCat.householdEntries,actor,now);if(!equal(householdEntries,next.multiCat.householdEntries))next={...next,multiCat:{...next.multiCat,householdEntries}};}
 if(!validFamilyData(next))throw Error(t('家庭資料格式錯誤，原資料未變更。'));
 return next;
}
function findMember(data,id,assignable=false){const member=activeMembers(data).find(member=>member.id===id);if(!member||assignable&&member.role==='viewer')throw Error(assignable?t('請選擇管理者或共同照顧者。'):t('找不到這位家庭成員。'));return member;}
function admin(actor){if(actor.role!=='admin')throw Error(t('只有管理者可以管理成員與邀請。'));}
function uniqueMember(family,id){if(!validId(id)||family.members.some(member=>member.id===id))throw Error(t('成員識別碼已使用，請重新操作。'));}
function clearMemberAssignments(data,memberId,actor,now,id){
 let next=data;
 for(const cat of sets(data)){
  const careItems=(cat.data.careItems||[]).map(item=>item.assigneeId===memberId?{...item,assigneeId:null,familyEvents:[...(item.familyEvents||[]),{id:`${id}:${cat.id}:${item.id}:unassigned`,type:'unassigned',at:now,actor:snapshot(actor),before:{assigneeId:memberId},after:{assigneeId:null},assignee:null,reason:K('成員移除或改為僅檢視')}]}:item);
  if(careItems.some((item,index)=>item!==cat.data.careItems[index]))next=putScope(next,cat.id,{...scope(next,cat.id),careItems});
 }
 return next;
}
export function familyAction(input,action){
 if(!object(action)||!validId(action.id)||!iso(action.now))throw Error(t('操作缺少有效識別碼或時間。'));
 const data=ensureFamilyData(input,action.now),family=data.familySharing,actor=currentMember(data),now=action.now,id=action.id;
 if(!actor)throw Error(t('目前身分已失效。'));
 let next=data;
 const changeFamily=patch=>{next={...next,familySharing:{...next.familySharing,...patch}};};
 const type=action.type;
 if(type==='switchMember'){findMember(data,action.memberId);changeFamily({currentMemberId:action.memberId});}
 else if(type==='addMember'){
  admin(actor);uniqueMember(family,id);if(!roles.includes(action.role))throw Error(t('請選擇有效角色。'));
  changeFamily({members:[...family.members,{id,name:cleanName(action.name),role:action.role,joinedAt:now}]});
 }else if(type==='updateMember'||type==='removeMember'){
  admin(actor);const member=findMember(data,action.memberId),remove=type==='removeMember';
  if(action.role!==undefined&&!roles.includes(action.role))throw Error(t('請選擇有效角色。'));
  const updated=remove?{...member,removedAt:now}:{...member,...(action.name!==undefined?{name:cleanName(action.name)}:{}),...(action.role!==undefined?{role:action.role}:{})};
  const members=family.members.map(item=>item.id===member.id?updated:item);
  if(!members.some(item=>!item.removedAt&&item.role==='admin'))throw Error(t('至少需要保留一位管理者。'));
  const currentMemberId=remove&&member.id===actor.id?members.find(item=>!item.removedAt&&item.role==='admin').id:family.currentMemberId;
  changeFamily({members,currentMemberId});
  if(remove||updated.role==='viewer')next=clearMemberAssignments(next,member.id,actor,now,id);
 }else if(type==='createInvite'){
  admin(actor);if(!roles.includes(action.role))throw Error(t('請選擇有效的邀請角色。'));
  const code=String(action.code||'').trim();
  if(!code||code.length>100||family.invites.some(invite=>invite.code===code||invite.id===id))throw Error(t('邀請碼不可空白或重複，請重新產生。'));
  if(!iso(action.expiresAt)||Date.parse(action.expiresAt)<=Date.parse(now))throw Error(t('邀請到期時間必須晚於現在。'));
  changeFamily({invites:[...family.invites,{id,code,role:action.role,status:'pending',createdAt:now,expiresAt:action.expiresAt,createdBy:snapshot(actor)}]});
 }else if(type==='cancelInvite'){
  admin(actor);const invite=family.invites.find(invite=>invite.id===action.inviteId);
  if(!invite||invite.status!=='pending')throw Error(t('邀請已使用或取消，不能再變更。'));
  changeFamily({invites:family.invites.map(row=>row.id===invite.id?{...row,status:'cancelled',cancelledAt:now}:row)});
 }else if(type==='redeemInvite'){
  admin(actor);const invite=family.invites.find(invite=>invite.code===String(action.code||'').trim());
  if(!invite||invite.status!=='pending'||Date.parse(invite.expiresAt)<=Date.parse(now))throw Error(t('邀請碼不存在、已過期、已取消或已使用。'));
  uniqueMember(family,id);const member={id,name:cleanName(action.name),role:invite.role,joinedAt:now};
  changeFamily({members:[...family.members,member],invites:family.invites.map(row=>row.id===invite.id?{...row,status:'joined',memberId:id,usedAt:now}:row)});
 }else{
  if(actor.role==='viewer')throw Error(t('僅檢視身分不能修改'));
  const catId=action.catId||ROOT;requireActivePet(data,catId);const cat=scope(data,catId);
  if(type==='handover'){
   const recipient=findMember(data,action.recipientId,true),text=typeof action.text==='string'?action.text.trim():'';
   if(!text||text.length>5000)throw Error(t('請填寫 1–5000 字的交接內容。'));
   if(!day(action.date)||action.date>localDay(now)||!time(action.time))throw Error(t('請填寫今天或以前的有效交接日期與時間。'));
   if(cat.entries.some(row=>row.id===id))throw Error(t('這筆交接已送出。'));
   const entry={id,date:action.date,time:action.time,category:K('交接'),text,amount:'',unit:'',source:K('家庭交接'),createdBy:snapshot(actor),createdAt:now,handover:{from:snapshot(actor),to:snapshot(recipient),at:now}};
   next=putScope(next,catId,{...cat,entries:[entry,...cat.entries]});
  }else{
   const item=cat.careItems.find(item=>item.id===action.careId);if(!item||!live(item)||item.demo)throw Error(t('找不到可操作的真實照護提醒。'));
   let updated=item,event;
   if(type==='assignCare'){
    const recipient=action.memberId?findMember(data,action.memberId,true):null;
    if((item.assigneeId??null)===(recipient?.id??null))return data;
    updated={...item,assigneeId:recipient?.id??null};event={type:recipient?'assigned':'unassigned',before:{assigneeId:item.assigneeId??null},after:{assigneeId:recipient?.id??null},assignee:recipient?snapshot(recipient):null};
   }else if(type==='completeCare'){
    if(!day(action.date)||action.date>localDay(now))throw Error(t('完成日期必須是今天或以前的有效日期。'));
    if(dates(item).includes(action.date))throw Error(t('這天已經記過一次。'));
    if(item.last&&action.date<item.last)throw Error(t('完成日期不能早於上次完成。'));
    updated={...item,last:action.date,history:[action.date,...dates(item)]};event={type:'completed',date:action.date};
   }else if(type==='snoozeCare'){
    if(!iso(action.until)||Date.parse(action.until)<=Date.parse(now))throw Error(t('延後時間必須晚於現在。'));
    updated={...item,snoozedUntil:action.until};event={type:'snoozed',before:schedule(item),after:schedule(updated)};
   }else if(type==='rescheduleCare'){
    if(!day(action.date))throw Error(t('請選擇有效的安排日期。'));
    updated={...item,next:action.date};event={type:'rescheduled',before:schedule(item),after:schedule(updated)};
   }else if(type==='restoreCare'){
    const history=item.familyEvents||[],restored=new Set(history.filter(event=>event.type==='restored').map(event=>event.restores));
    const latest=[...history].reverse().find(event=>['snoozed','rescheduled'].includes(event.type)&&!restored.has(event.id));
    if(!latest||latest.id!==action.eventId||!equal(schedule(item),latest.after))throw Error(t('安排已更新，請先復原最近一次的延後或改期。'));
    updated={...item,next:latest.before.next};
    if(latest.before.snoozedUntil===null)delete updated.snoozedUntil;else updated.snoozedUntil=latest.before.snoozedUntil;
    event={type:'restored',restores:latest.id,before:schedule(item),after:schedule(updated)};
   }else throw Error(t('不支援的家庭操作。'));
   if((item.familyEvents||[]).some(event=>event.id===id))throw Error(t('這次操作已保存，請勿重複送出。'));
   updated={...updated,familyEvents:[...(item.familyEvents||[]),{id,at:now,actor:snapshot(actor),...event}]};
   next=putScope(next,catId,{...cat,careItems:cat.careItems.map(row=>row.id===item.id?updated:row)});
  }
 }
 return applyFamilyTransition(data,next,{now,id});
}
