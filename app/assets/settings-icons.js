// Same 24px grid and rounded 1.8px stroke as navigation-icons.js. Presentation only.
export const SETTINGS_ICON_PATHS=Object.freeze({
 data:['M4 7h16v14H4Z','M3 3h18v4H3ZM9 11h6'],
 general:['M4 7h16M4 17h16','M8 4v6M16 14v6'],
 plans:['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z','M3 8h18M7 13h4M7 17h7'],
 ai:['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
 spark:['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
 privacy:['M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z','m8 12 3 3 5-6'],
 shield:['M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z','m8 12 3 3 5-6'],
 person:['M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z','M4 21v-2a8 8 0 0 1 16 0v2'],
 voice:['M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0Z','M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6'],
 box:['M4 7h16v14H4Z','M3 3h18v4H3ZM9 11h6'],
 chevron:['m9 5 7 7-7 7']
});
export function SettingsIcon({react:R,name,size=20}){
 const stickers={data:'box',general:'sliders',plans:'care-add',ai:'spark',spark:'spark',privacy:'shield',shield:'shield',person:'person',voice:'voice',box:'box'};
 if(stickers[name])return R.createElement('img',{className:'settings-icon',src:'/xbb-site/app/assets/cute-actions/'+stickers[name]+'.svg?v=expanded1',width:size,height:size,alt:'','aria-hidden':true,draggable:false,'data-settings-icon':name});
 const paths=SETTINGS_ICON_PATHS[name]||SETTINGS_ICON_PATHS.chevron;
 return R.createElement('svg',{className:'settings-icon',viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:'false'},paths.map((d,key)=>R.createElement('path',{key,d})));
}
