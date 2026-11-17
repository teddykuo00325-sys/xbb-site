// 把一頁一張 JPEG 組成 A5 直式 PDF（148 × 210 mm）。每頁圖片鋪滿整頁，不另外排字型，
// 所以中文、手寫風格與畫面看到的一模一樣。只用標準 PDF 1.4 物件，不需要外部套件。
export const A5_POINTS=Object.freeze({width:419.53,height:595.28});

const encoder=new TextEncoder();
function utf16Hex(text){
 let hex='FEFF';
 for(const unit of String(text))for(let i=0;i<unit.length;i++)hex+=unit.charCodeAt(i).toString(16).padStart(4,'0').toUpperCase();
 return '<'+hex+'>';
}
export function jpegSize(bytes){
 if(!(bytes instanceof Uint8Array)||bytes[0]!==0xFF||bytes[1]!==0xD8)throw Error('not a JPEG');
 let i=2;
 while(i+9<bytes.length){
  if(bytes[i]!==0xFF){i++;continue;}
  const marker=bytes[i+1],length=bytes[i+2]<<8|bytes[i+3];
  if(marker>=0xC0&&marker<=0xCF&&![0xC4,0xC8,0xCC].includes(marker))return {height:bytes[i+5]<<8|bytes[i+6],width:bytes[i+7]<<8|bytes[i+8]};
  i+=2+length;
 }
 throw Error('JPEG size not found');
}

/** pages：Uint8Array（JPEG）陣列。回傳 application/pdf 的 Blob。 */
export function jpegPagesToPdf(pages,{title='',author=''}={}){
 if(!Array.isArray(pages)||!pages.length)throw Error('no pages');
 const parts=[],offsets=[];let length=0;
 const push=chunk=>{const bytes=typeof chunk==='string'?encoder.encode(chunk):chunk;parts.push(bytes);length+=bytes.length;};
 const object=(id,body)=>{offsets[id]=length;push(`${id} 0 obj\n`);for(const piece of [].concat(body))push(piece);push('\nendobj\n');};
 push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 const {width:W,height:H}=A5_POINTS,first=4,kids=pages.map((_,i)=>`${first+i*3} 0 R`).join(' ');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`);
 object(3,`<< /Title ${utf16Hex(title)} /Author ${utf16Hex(author)} /Creator ${utf16Hex('毛孩小本本')} >>`);
 pages.forEach((bytes,index)=>{
  const id=first+index*3,size=jpegSize(bytes),draw=`q ${W} 0 0 ${H} 0 0 cm /P${index} Do Q`;
  object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /P${index} ${id+2} 0 R >> >> /Contents ${id+1} 0 R >>`);
  object(id+1,[`<< /Length ${draw.length} >>\nstream\n`,draw,'\nendstream']);
  object(id+2,[`<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,bytes,'\nendstream']);
 });
 const count=first+pages.length*3,xref=length;
 push(`xref\n0 ${count}\n0000000000 65535 f \n`);
 for(let id=1;id<count;id++)push(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 return new Blob(parts,{type:'application/pdf'});
}
