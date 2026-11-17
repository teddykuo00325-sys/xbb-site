// Entry point shared by shelf previews, PNG and A5 PDF.
import {t} from './i18n.js?v=audit1117b';
import {drawDistinctBook} from './life-diary-book-layouts.js?v=distinct1';
export const BOOK_PAGE=Object.freeze({width:1240,height:1754});
export const BOOK_STYLES=Object.freeze(['photo','handmade','storybook']);

export function bookMonthLabel(book){
 const [year,month]=String(book?.month||'').split('-').map(Number);
 const en=String(document.documentElement.lang).startsWith('en');
 const base=en?new Date(year,month-1,15).toLocaleDateString('en',{month:'long',year:'numeric'}):t('{year} 年 {month} 月',{year,month});
 return book.numbered?t('{base} · 第 {n} 冊',{base,n:book.volume}):base;
}
export async function renderBookPage(page,{book,petName='',petPhoto='',coverId='',index=1,total=1,scale=1,style='photo'}={}){
 const canvas=document.createElement('canvas');
 canvas.width=Math.round(BOOK_PAGE.width*scale);canvas.height=Math.round(BOOK_PAGE.height*scale);
 const c=canvas.getContext('2d');if(!c)throw Error(t('暫時無法製作小本本，請再試一次。'));
 c.scale(scale,scale);
 await drawDistinctBook(c,page,{book,petName,petPhoto,coverId,index,total},{style,monthLabel:bookMonthLabel});
 return canvas;
}
export const canvasBlob=(canvas,type='image/jpeg',quality=.9)=>new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error(t('暫時無法製作小本本，請再試一次。'))),type,quality));
