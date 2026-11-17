import {t} from './assets/i18n.js?v=audit1117b';
// Decorative free-fish environments; no state, records or interaction handlers.
export const FISH_WATER_THEMES = Object.freeze([
 {id:'blue',label:t('湛藍水灣')}, {id:'reef',label:t('珊瑚礁')},
 {id:'moon',label:t('月光海')}, {id:'sand',label:t('淺沙灘')}
]);
export function FishWaterScenery({react:R,theme='blue',preview=false}){
 const h=R.createElement,H=preview?220:540;
 const id=FISH_WATER_THEMES.some(t=>t.id===theme)?theme:'blue';
 const p=(d,fill,props={})=>h('path',{d,fill,...props});
 const stone=(x,y,rx,ry,color)=>h('ellipse',{cx:x,cy:y,rx,ry,fill:color});
 const grass=(x,y,color,scale=1)=>h('g',{transform:`translate(${x} ${y}) scale(${scale})`},
  h('g',{className:'fish-water-sway',fill:'none',stroke:color,strokeWidth:5,strokeLinecap:'round'},
   h('path',{d:'M0 0C-26-28 10-47-8-82'}),h('path',{d:'M4 0C25-23-8-39 12-65'}),h('path',{d:'M-4 0C-35-16-12-34-26-50'})));
 const coral=(x,y,color,scale=1)=>h('g',{transform:`translate(${x} ${y}) scale(${scale})`,fill:'none',stroke:color,strokeWidth:7,strokeLinecap:'round',strokeLinejoin:'round'},
  h('path',{d:'M0 0V-82M0-20-20-38V-55M0-42 22-62V-79M0-61-14-75V-92M-20-38-33-42M22-62 34-61'}));
 let art;
 if(id==='blue')art=h('g',null,
  p(`M0 ${H-50}Q65 ${H-78} 118 ${H-20}L135 ${H}H0Z`,'#132c58'),
  p(`M360 ${H-74}Q299 ${H-104} 258 ${H-18}L250 ${H}H360Z`,'#102952'),
  stone(35,H-22,47,23,'#29416a'),stone(88,H-8,34,18,'#345379'),stone(337,H-31,40,31,'#243a60'),
  p(`M7 ${H-29}Q31 ${H-43} 57 ${H-30}M302 ${H-44}Q329 ${H-64} 352 ${H-41}`,'none',{stroke:'#6d91ab',strokeWidth:2,opacity:.4}),
  grass(18,H-26,'#397b80',.9),grass(344,H-45,'#4c838f',.7),
  p('M-18 28Q30 9 84 25M284 47Q325 28 378 45','none',{stroke:'#8eb4df',strokeWidth:3,opacity:.17}));
 if(id==='reef')art=h('g',null,
  p(`M0 ${H-35}Q70 ${H-67} 154 ${H-30}T360 ${H-43}V${H}H0Z`,'#416f75'),
  p(`M0 ${H-17}Q104 ${H-36} 204 ${H-10}T360 ${H-24}V${H}H0Z`,'#8c9c83'),
  grass(9,H-18,'#58a38f',1.2),grass(324,H-16,'#39948a',1.3),
  coral(39,H-16,'#cd887d',.9),coral(353,H-8,'#ddaa8b',.75),
  stone(64,H-11,31,17,'#597a78'),stone(300,H-5,29,16,'#557b7b'),
  h('g',{fill:'none',stroke:'#8cbbc1',strokeWidth:2,opacity:.25},h('circle',{cx:20,cy:53,r:6}),h('circle',{cx:29,cy:33,r:3}),h('circle',{cx:338,cy:79,r:4})));
 if(id==='moon')art=h('g',null,
  p(`M263 0 170 ${H}H249L291 0Z`,'#b9d5ef',{opacity:.055}),
  p(`M292 0 292 ${H}H355L313 0Z`,'#b9d5ef',{opacity:.045}),
  h('circle',{cx:282,cy:37,r:27,fill:'#d5e4ef',opacity:.08}),
  h('circle',{cx:282,cy:37,r:19,fill:'#e1e9d5',opacity:.78}),
  h('circle',{cx:289,cy:31,r:19,fill:'#192a4b'}),
  h('g',{fill:'#b7d2e7',opacity:.5},[[28,39,1.3],[82,19,1],[159,46,1.4],[222,15,1],[338,62,1.2]].map(([cx,cy,r])=>h('circle',{key:cx,cx,cy,r}))),
  p(`M0 ${H-33}Q48 ${H-52} 111 ${H-16}T240 ${H-25}T360 ${H-40}V${H}H0Z`,'#101d3c'),
  stone(15,H-15,34,24,'#263655'),grass(345,H-12,'#3c566f',.7),
  p(`M211 91Q253 85 300 91M206 105Q263 100 312 105`,'none',{stroke:'#accbe8',strokeWidth:2,opacity:.12}));
 if(id==='sand')art=h('g',null,
  p(`M0 ${H-66}Q90 ${H-94} 173 ${H-49}T360 ${H-57}V${H}H0Z`,'#c4b48a'),
  p(`M0 ${H-34}Q70 ${H-59} 174 ${H-22}T360 ${H-32}V${H}H0Z`,'#dbcca2'),
  p(`M0 ${H-53}Q91 ${H-78} 173 ${H-34}T360 ${H-43}`,'none',{stroke:'#eee0b8',strokeWidth:2,opacity:.7}),
  h('g',{fill:'#9d956e',opacity:.5},[[17,H-24],[49,H-41],[123,H-17],[193,H-25],[271,H-12],[325,H-37]].map(([cx,cy])=>h('ellipse',{key:cx,cx,cy,rx:2,ry:1}))),
  h('g',{transform:`translate(291 ${H-34}) rotate(15)`,fill:'#b98971'},p('M0-15 5-5 17-5 8 3 11 15 0 8-11 15-8 3-17-5-5-5Z','#b98971')),
  h('g',{transform:`translate(54 ${H-22})`,stroke:'#a79074',strokeWidth:1.5},p('M-15 0Q-18-19 0-22Q18-19 15 0Z','#ece0c1'),p('M-10-1-6-16M0-1V-18M10-1 6-16','none')),
  grass(343,H-43,'#568c7b',.6),stone(13,H-44,23,13,'#7e9b91'));
 return h('svg',{className:'play-scene-art fish-water-art',viewBox:`0 0 360 ${H}`,preserveAspectRatio:id==='moon'?'xMidYMin slice':'xMidYMax slice','aria-hidden':true,focusable:false,'data-scene':'basic','data-water-theme':id},art);
}
