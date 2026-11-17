// 每月小本本（Ian 2026-11-16）：生活日記每個月自動成一本。
// - 月份結束、當月有 3 篇以上就成冊；同一個月滿 12 篇就先成一冊，不用等月底。
// - 月底剩下不到 3 篇、但這個月已經有成冊時，併進最後一冊，不會被丟掉。
// - 書只記得是哪幾篇日記（每次從日記算出來），不另存照片；改或刪日記，書會跟著變。
// - 只在 App 內顯示，不發通知。
export const BOOK_MIN_ENTRIES=3;
export const BOOK_MAX_ENTRIES=12;

const month=row=>String(row?.date||'').slice(0,7);
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const ascending=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||String(a.createdAt).localeCompare(String(b.createdAt))||String(a.id).localeCompare(String(b.id));

/** entries：同一隻毛孩的日記（任何順序）；today：'YYYY-MM-DD'（本機日期）。
 *  回傳 {books:[新到舊], progress:本月尚未成冊的部分或 null}。 */
export function diaryBooks(entries,{today}={}){
 const current=String(today||'').slice(0,7);
 if(!validMonth(current))throw Error('diaryBooks needs today as YYYY-MM-DD');
 const groups=new Map();
 for(const row of (Array.isArray(entries)?entries:[]).filter(r=>validMonth(month(r))&&month(r)<=current).sort(ascending)){
  if(!groups.has(month(row)))groups.set(month(row),[]);
  groups.get(month(row)).push(row);
 }
 const books=[];let progress=null;
 for(const [key,rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  const closed=key<current,volumes=[];
  const full=Math.floor(rows.length/BOOK_MAX_ENTRIES);
  for(let i=0;i<full;i++)volumes.push(rows.slice(i*BOOK_MAX_ENTRIES,(i+1)*BOOK_MAX_ENTRIES));
  const rest=rows.slice(full*BOOK_MAX_ENTRIES);
  if(closed){
   if(rest.length>=BOOK_MIN_ENTRIES)volumes.push(rest);
   else if(rest.length&&volumes.length)volumes[volumes.length-1]=volumes[volumes.length-1].concat(rest);
  }else if(rest.length){
   progress={month:key,entries:rest,count:rest.length,need:Math.max(0,BOOK_MIN_ENTRIES-rest.length),volume:volumes.length+1};
  }
  const many=volumes.length>1||(!closed&&volumes.length>0);
  volumes.forEach((list,index)=>books.push({id:`${key}-${index+1}`,month:key,volume:index+1,numbered:many,entries:list,closed}));
 }
 books.sort((a,b)=>b.month.localeCompare(a.month)||b.volume-a.volume);
 return {books,progress};
}

/** 封面照片：使用者選過且還在書裡的那篇；否則第一篇「第一次」；否則第一篇。 */
export function bookCoverEntry(book,chosenId=''){
 const list=book?.entries||[];
 return list.find(r=>r.id===chosenId)||list.find(r=>r.first)||list[0]||null;
}

/** 內頁編排：依時間排，同一個小故事集中在它第一次出現的位置；
 *  「第一次」或長文字（超過 110 字）自己一頁，其他兩篇一頁。 */
export const BOOK_PAIR_CAPTION_LIMIT=110;
export function bookPagePlan(book){
 const list=[...(book?.entries||[])].sort(ascending),order=[],seen=new Set();
 for(const row of list){
  if(!row.story){order.push({story:'',rows:[row]});continue;}
  if(seen.has(row.story))continue;
  seen.add(row.story);order.push({story:row.story,rows:list.filter(r=>r.story===row.story)});
 }
 const pages=[{kind:'cover'}];
 for(const group of order){
  let chapter=group.story;
  const queue=[...group.rows];
  while(queue.length){
   const row=queue.shift(),solo=row.first||Array.from(row.caption).length>BOOK_PAIR_CAPTION_LIMIT;
   const next=queue[0],pair=!solo&&next&&!next.first&&Array.from(next.caption).length<=BOOK_PAIR_CAPTION_LIMIT;
   pages.push({kind:pair?'pair':'single',entries:pair?[row,queue.shift()]:[row],chapter});
   chapter='';
  }
 }
 // 沒有小故事的日常會被拆成一篇一組；相鄰兩組單篇日常再合成一頁。
 const merged=[pages[0]];
 for(const page of pages.slice(1)){
  const last=merged.at(-1);
  const joinable=p=>p.kind==='single'&&!p.chapter&&!p.entries[0].first&&!p.entries[0].story&&Array.from(p.entries[0].caption).length<=BOOK_PAIR_CAPTION_LIMIT;
  if(last.kind==='single'&&joinable(last)&&joinable(page))merged[merged.length-1]={kind:'pair',entries:[last.entries[0],page.entries[0]],chapter:''};
  else merged.push(page);
 }
 merged.push({kind:'ending'});
 return merged;
}

export function bookStats(book){
 const list=book?.entries||[];
 return {count:list.length,firsts:list.filter(r=>r.first).length,stories:[...new Set(list.map(r=>r.story).filter(Boolean))]};
}
