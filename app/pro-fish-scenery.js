import {t} from './assets/i18n.js?v=audit1117b';
// Decorative, locally rendered Pro variants. Keep all interaction on the fish.
const rows={
 pond:[['blue','睡蓮清池','#234e53','#12343e','#6eae83','#f4d9d6'],['reef','竹影溪流','#345960','#193942','#6c9a84','#c7d4af'],['moon','螢火夜池','#20344b','#102335','#54777b','#c8e29b'],['sand','秋日蘆葦','#635c43','#333e39','#ae9c64','#e6c07e']],
 night:[['blue','銀河星河','#222e59','#101b38','#8797cd','#dbe5f2'],['reef','極光夜空','#173c50','#102436','#77cfb2','#d0ece1'],['moon','月光雲海','#353650','#191e38','#a8aacb','#f0e1bd'],['sand','落日星空','#6d4961','#252c4d','#c58e9b','#f1cba0']],
 garden:[['blue','晨露花園','#375b54','#1e3b3b','#7ead89','#eadcc0'],['reef','蕨葉秘境','#284c46','#16332e','#6a9b6a','#bdd4ad'],['moon','月下紫藤','#3b3b57','#21233e','#8583ad','#c6b5dc'],['sand','金色花田','#63593e','#363c32','#a2a06e','#edc76c']]
};
export const PRO_FISH_THEMES=Object.freeze(Object.fromEntries(Object.entries(rows).map(([scene,items])=>[scene,items.map(([id,label])=>({id,label:t(label)}))])));
export function ProFishScenery({react:R,scene='pond',theme='blue',preview=false}){
 const h=R.createElement,H=preview?220:540,items=rows[scene]||rows.pond;
 const palette=items.find(x=>x[0]===theme)||items[0],[id,,top,bottom,leafColor,accent]=palette;
 const gradient=`pro-fish-${scene}-${id}-${preview?'preview':'field'}`;
 const path=(d,fill,props={})=>h('path',{d,fill,...props});
 const dot=(x,y,r,color,opacity=1)=>h('circle',{cx:x,cy:y,r,fill:color,opacity});
 const leaf=(x,y,size=1,angle=0)=>h('g',{transform:`translate(${x} ${y}) rotate(${angle}) scale(${size})`},path('M0 0Q-24-36 0-65Q25-32 0 0',leafColor),path('M0-5V-55','none',{stroke:bottom,strokeWidth:1.5,opacity:.5}));
 const flower=(x,y,size=1)=>h('g',{transform:`translate(${x} ${y}) scale(${size})`},...Array.from({length:6},(_,i)=>h('ellipse',{key:i,cx:0,cy:-10,rx:5,ry:11,fill:accent,transform:`rotate(${i*60})`})),dot(0,0,5,'#b6a46e'));
 const lily=(x,y,size=1)=>h('g',{transform:`translate(${x} ${y}) scale(${size})`},path('M0 0 18-13A28 19 0 1 1-2-21Z',leafColor),path('M-20 4Q0-4 20 4','none',{stroke:accent,strokeWidth:1,opacity:.25}));
 let art=[];
 if(scene==='pond'){
  art.push(...[.22,.5,.77].map((y,i)=>path(`M-20 ${H*y}Q60 ${H*y-14} 136 ${H*y}T380 ${H*y}`, 'none',{key:i,stroke:leafColor,strokeWidth:2,opacity:.15})));
  if(id==='blue')art.push(lily(25,H-18,1.2),lily(338,38,.9),lily(335,H-43,.8),flower(37,H-35,.7),flower(337,24,.48));
  if(id==='reef')art.push(...[9,23,346].map((x,i)=>h('g',{key:x,stroke:leafColor,strokeWidth:5,opacity:.7},path(`M${x} ${H}V${i===1?H-170:0}`,'none'),...[.2,.4,.6,.8].map(y=>path(`M${x-4} ${H*y}H${x+4}`,'none',{key:y,stroke:accent,strokeWidth:2})))),leaf(30,80,.55,42),leaf(344,H-35,.8,-25),h('ellipse',{cx:26,cy:H-12,rx:50,ry:20,fill:bottom}),h('ellipse',{cx:336,cy:H-5,rx:40,ry:25,fill:leafColor,opacity:.5}));
  if(id==='moon')art.push(lily(22,H-10,1.25),lily(344,H-26,1),...[ [35,39],[95,70],[304,55],[336,137],[33,H-90],[278,H-60] ].map(([x,y])=>h('g',{key:x},dot(x,y,9,accent,.04),dot(x,y,3,accent,.3),dot(x,y,1.5,accent,.85))));
  if(id==='sand')art.push(...[10,24,337,350].map((x,i)=>h('g',{key:x},path(`M${x} ${H}Q${x-13} ${H-75} ${x+(i%2?7:-7)} ${H-135}`,'none',{stroke:leafColor,strokeWidth:2}),h('ellipse',{cx:x+(i%2?7:-7),cy:H-132,rx:4,ry:20,fill:accent,opacity:.7}))),leaf(30,H,.8,-30),leaf(330,H,.9,30));
 }
 if(scene==='night'){
  art.push(...Array.from({length:42},(_,i)=>dot((i*79+17)%360,((i*97+31)%(H-35))+10,i%7===0?1.8:1,accent,.3+(i%4)*.12)));
  if(id==='blue')art.push(path(`M-40 ${H*.6}Q160 ${H*.52} 330-40`, 'none',{stroke:leafColor,strokeWidth:48,opacity:.06}),...Array.from({length:30},(_,i)=>dot(10+i*11,H*.62-i*(H*.7/30)+(i%3)*8,1.3,accent,.35)));
  if(id==='reef')art.push(...[0,1,2].map(i=>path(`M-20 ${40+i*20}Q80 ${-30+i*40} 150 ${55+i*8}T380 ${10+i*25}L380 ${65+i*25}Q230 ${130+i*10} 140 ${95+i*15}T-20 ${100+i*20}Z`,i===1?accent:leafColor,{key:i,opacity:i===1?.07:.13})));
  if(id==='moon')art.push(dot(285,43,26,accent,.06),path('M291 22A22 22 0 1 1 265 57A23 23 0 0 0 291 22',accent),path(`M-20 ${H-17}Q0 ${H-55} 35 ${H-27}Q65 ${H-75} 108 ${H-25}T240 ${H-20}T380 ${H-34}V${H}H-20Z`,leafColor,{opacity:.25}));
  if(id==='sand')art.push(dot(292,H*.76,25,accent,.4),path(`M0 ${H*.82}Q80 ${H*.72} 170 ${H*.84}T360 ${H*.8}V${H}H0Z`,bottom),path(`M0 ${H*.92}Q120 ${H*.82} 220 ${H*.94}T360 ${H*.9}V${H}H0Z`,leafColor,{opacity:.2}));
 }
 if(scene==='garden'){
  art.push(path(`M-10 ${H}Q8 ${H-100} 27 ${H-165}M370 ${H}Q340 ${H-130} 330 ${H-180}`,'none',{stroke:leafColor,strokeWidth:3,opacity:.6}));
  if(id==='blue')art.push(leaf(8,H,1.2,-20),leaf(25,H,.8,15),leaf(350,H,1.3,20),flower(35,H-45,.8),flower(337,H-70,.65),...[[15,30],[40,56],[322,34]].map(([x,y])=>dot(x,y,2.5,accent,.6)));
  if(id==='reef')art.push(...[0,1].map(side=>h('g',{key:side,transform:`translate(${side?355:5} ${H}) scale(${side?-1:1} 1)`},path('M0 0Q45-55 55-155','none',{stroke:leafColor,strokeWidth:3}),...Array.from({length:8},(_,i)=>h('g',{key:i},leaf(12+i*5,-i*17,.35,40),leaf(12+i*5,-i*17,.3,-50))))));
  if(id==='moon')art.push(...[12,34,330,352].map((x,i)=>h('g',{key:x},path(`M${x} 0Q${x-12} 45 ${x} ${75+(i%2)*35}`,'none',{stroke:leafColor,strokeWidth:2}),...Array.from({length:7},(_,j)=>h('ellipse',{key:j,cx:x+(j%2?4:-4),cy:25+j*9,rx:9-j*.8,ry:6,fill:accent,opacity:.65})))),leaf(20,H,.8,-20),leaf(350,H,.7,20));
  if(id==='sand')art.push(...[[25,H-55],[344,H-82],[67,H-17],[310,H-22]].map(([x,y],i)=>h('g',{key:x},path(`M${x} ${H}V${y}`,'none',{stroke:leafColor,strokeWidth:3}),leaf(x,H,.45,i%2?30:-30),flower(x,y,i<2?.9:.55))));
 }
 return h('svg',{className:'play-scene-art pro-fish-art',viewBox:`0 0 360 ${H}`,preserveAspectRatio:'xMidYMid slice','aria-hidden':true,focusable:false,'data-scene':scene,'data-pro-theme':id},
  h('defs',null,h('linearGradient',{id:gradient,x1:0,y1:0,x2:0,y2:1},h('stop',{offset:0,stopColor:top}),h('stop',{offset:1,stopColor:bottom}))),h('rect',{width:360,height:H,fill:`url(#${gradient})`}),...art);
}
