/** Fresh, self-contained Canvas2D artwork. Coordinates use the caller's canvas pixels.
 * Does not draw/crop photos or text. All motif work is clipped outside their safe zones.
 */
export const FRESH_DIARY_FRAMES = ['catcloud', 'pawparty', 'sweetcat'];
const palettes = {
 catcloud: {bg:'#E6F2F8',paper:'#FFFEFA',edge:'#B1D4E5',a:'#A8CEDF',b:'#F6C9CB'},
 pawparty: {bg:'#FBE8ED',paper:'#FFFDF7',edge:'#E8B7C8',a:'#D78CA8',b:'#A8CDBE'},
 sweetcat: {bg:'#F8E9D2',paper:'#FFF8E9',edge:'#D6A36F',a:'#DCA876',b:'#EEB2A4'}
};
function ellipse(c,x,y,rx,ry,color,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fillStyle=color;c.fill();}
function round(c,x,y,w,h,r,color){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
function paw(c,x,y,s,color,angle=0){c.save();c.translate(x,y);c.rotate(angle);ellipse(c,0,s*.18,s*.42,s*.34,color);for(const [dx,dy,r] of [[-.42,-.25,.18],[-.16,-.5,.19],[.16,-.5,.19],[.42,-.25,.18]])ellipse(c,dx*s,dy*s,r*s,r*s*1.15,color);c.restore();}
function star(c,x,y,s,color){c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x+s*.18,y-s*.18,x+s,y);c.quadraticCurveTo(x+s*.18,y+s*.18,x,y+s);c.quadraticCurveTo(x-s*.18,y+s*.18,x-s,y);c.quadraticCurveTo(x-s*.18,y-s*.18,x,y-s);c.fillStyle=color;c.fill();}
function cat(c,x,y,s,color,inner){c.save();c.translate(x,y);c.beginPath();c.moveTo(-s*.65,0);c.quadraticCurveTo(-s*.8,-s*.3,-s*.6,-s*.8);c.lineTo(-s*.2,-s*.5);c.quadraticCurveTo(0,-s*.6,s*.2,-s*.5);c.lineTo(s*.6,-s*.8);c.quadraticCurveTo(s*.8,-s*.3,s*.65,0);c.bezierCurveTo(s*.6,s*.65,-s*.6,s*.65,-s*.65,0);c.fillStyle=color;c.fill();ellipse(c,-s*.23,-s*.02,s*.035,s*.055,'#765B57');ellipse(c,s*.23,-s*.02,s*.035,s*.055,'#765B57');ellipse(c,0,s*.13,s*.055,s*.04,inner);ellipse(c,-s*.4,s*.13,s*.12,s*.06,inner);ellipse(c,s*.4,s*.13,s*.12,s*.06,inner);c.restore();}
export function drawDiaryFrame(ctx,{frame,width,height,padding=60,photoX=padding,photoY=160,photoW=width-padding*2,photoH=height-420}){
 const p=palettes[frame]||palettes.catcloud,s=width/1080,c=ctx;
 c.save();c.fillStyle=p.bg;c.fillRect(0,0,width,height);
 // A central cream island keeps all caller-owned text and the full logo readable.
 round(c,padding*.55,24*s,width-padding*1.1,height-48*s,48*s,p.paper);
 // Photo backing is a fresh silhouette, not a reused book/tape/postcard treatment.
 const gap=Math.min(20*s,padding*.35),x=photoX-gap,y=photoY-gap,w=photoW+gap*2,h=photoH+gap*2;
 c.save();c.shadowColor=frame==='sweetcat'?'#BC895A24':'#56778B18';c.shadowBlur=22*s;c.shadowOffsetY=8*s;
 round(c,x,y,w,h,frame==='pawparty'?52*s:36*s,p.edge);
 round(c,x+5*s,y+5*s,w-10*s,h-10*s,32*s,p.paper);c.restore();
 // Decorative silhouette protrusions stay behind the future, unaltered photo.
 if(frame==='catcloud'){
  for(let i=0;i<Math.ceil(h/(70*s));i++){const yy=y+32*s+i*70*s;ellipse(c,x+3*s,yy,18*s,31*s,p.paper);ellipse(c,x+w-3*s,yy,18*s,31*s,p.paper);}
 }else if(frame==='pawparty'){
  for(let i=0;i<Math.ceil(h/(86*s));i++){const yy=y+35*s+i*86*s;ellipse(c,x+3*s,yy,14*s,22*s,i%2?p.b:'#F0D0D9');ellipse(c,x+w-3*s,yy,14*s,22*s,i%2?'#F0D0D9':p.b);}
 }else{
  // Biscuit crimping, without a dashed postcard border.
  for(let yy=y+24*s;yy<y+h-15*s;yy+=38*s){ellipse(c,x+3*s,yy,8*s,12*s,p.a);ellipse(c,x+w-3*s,yy,8*s,12*s,p.a);}
 }
 // Bold silhouettes live in the 118..photoY band: no header/photo collision.
 const bandTop=120*s, bandBottom=photoY-3*s, bandH=Math.max(0,bandBottom-bandTop);
 if(bandH>18*s){
  c.save();c.beginPath();c.rect(0,bandTop,width,Math.max(0,photoY-bandTop));c.clip();
  const earW=96*s, earH=Math.min(50*s,bandH), centers=[photoX+65*s,photoX+photoW-65*s];
  if(frame==='catcloud'){
   // Two oversized rounded cat ears turn the whole cloud surround into a cat.
   for(const cx of centers){c.beginPath();c.moveTo(cx-earW*.55,bandBottom+10*s);c.quadraticCurveTo(cx-earW*.42,bandTop-9*s,cx-earW*.24,bandTop);c.quadraticCurveTo(cx,bandTop+4*s,cx+earW*.55,bandBottom+10*s);c.closePath();c.fillStyle=p.edge;c.fill();c.beginPath();c.moveTo(cx-26*s,bandBottom);c.quadraticCurveTo(cx-24*s,bandTop+14*s,cx-17*s,bandTop+14*s);c.lineTo(cx+22*s,bandBottom);c.fillStyle='#F4D1D4';c.fill();}
   for(let i=0;i<5;i++)ellipse(c,photoX+photoW*(.28+i*.11),bandBottom+5*s,34*s,Math.min(19*s,earH*.4),'#FFFEFA');
  }else if(frame==='pawparty'){
   // Plush paws grip the upper corners; each is visibly larger than a tiny icon.
   for(const cx of centers){paw(c,cx,bandTop+bandH*.56,52*s,p.b,cx<width/2?-.25:.25);paw(c,cx,bandTop+bandH*.56,35*s,'#F8D6DC',cx<width/2?-.25:.25);}
  }else{
   // A wide, piped-cream crown with a little strawberry-cat face.
   const cx=width*.5;
   for(let i=-3;i<=3;i++)ellipse(c,cx+i*28*s,bandBottom+3*s,24*s,Math.min(27*s,bandH*.55),'#E5B585');
   for(let i=-3;i<=3;i++)ellipse(c,cx+i*27*s,bandBottom,22*s,Math.min(22*s,bandH*.46),'#FFF0CE');
   cat(c,cx,bandTop+bandH*.55,38*s,'#EDA6A1','#FFE0CB');
  }
  c.restore();
 }
 // Clip ornament ink away from the full photo, header, caption and official-logo footer.
 c.save();c.beginPath();c.rect(0,0,width,height);
 c.rect(photoX-2*s,photoY-2*s,photoW+4*s,photoH+4*s);
 c.rect(padding*.8,36*s,width-padding*1.6,82*s);
 c.rect(padding*.8,photoY+photoH+22*s,width-padding*1.6,Math.max(0,height-103*s-(photoY+photoH+22*s)));
 c.rect(padding*.8,height-108*s,width-padding*1.6,92*s);c.clip('evenodd');
 const left=Math.max(15*s,photoX*.45),right=width-left,top=Math.max(140*s,photoY-22*s),bottom=photoY+photoH;
 if(frame==='catcloud'){

  // Puffy cloud companions and tiny glints follow the photo height.
  for(const [xx,yy] of [[right,photoY+photoH*.22],[left,photoY+photoH*.72]]){ellipse(c,xx,yy,23*s,12*s,'#FFFFFF');ellipse(c,xx-12*s,yy-7*s,12*s,12*s,'#FFFFFF');ellipse(c,xx+8*s,yy-12*s,15*s,16*s,'#FFFFFF');}
  star(c,right,photoY+photoH*.57,12*s,p.b);star(c,left,photoY+photoH*.3,10*s,p.a);
 }else if(frame==='pawparty'){
  paw(c,left,photoY+photoH*.2,64*s,p.a,-.35);paw(c,left,photoY+photoH*.2,43*s,'#F7CCD7',-.35);paw(c,right,photoY+photoH*.66,64*s,p.b,.4);paw(c,right,photoY+photoH*.66,43*s,'#D8E9D8',.4);

  for(let i=0;i<8;i++){const yy=photoY+(i+.5)*photoH/8,xx=i%2?left:right;c.save();c.translate(xx,yy);c.rotate(i*.7);round(c,-4*s,-9*s,8*s,18*s,4*s,i%3?p.b:'#EDC36E');c.restore();}
 }else{

  // Macaron satellites along the side rails.
  for(const [xx,yy] of [[right,photoY+photoH*.24],[left,photoY+photoH*.72]]){ellipse(c,xx,yy,21*s,14*s,'#E9B1A5');round(c,xx-22*s,yy-2*s,44*s,6*s,3*s,'#FFF2D6');ellipse(c,xx,yy-7*s,20*s,11*s,'#F0C2B7');}
  star(c,left,photoY+photoH*.3,10*s,'#D5AB6C');star(c,right,photoY+photoH*.76,10*s,'#D5AB6C');
 }
 // Quiet perimeter dots provide continuity on both 4:5 and 9:16 canvases.
 for(let yy=130*s;yy<height-120*s;yy+=115*s){ellipse(c,16*s,yy,3*s,3*s,p.edge);ellipse(c,width-16*s,yy+44*s,3*s,3*s,p.edge);}
 c.restore();c.restore();
}
