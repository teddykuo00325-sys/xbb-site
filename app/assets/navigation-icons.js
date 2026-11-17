// Presentation only. One 24px grid, rounded 1.8px strokes, and the label's color.
// Family means the cats in this browser, not people or cross-device sharing.
export const NAVIGATION_ICON_PATHS=Object.freeze({
 'house':Object.freeze(['M3 10.5 12 3l9 7.5','M5 9v10a2 2 0 0 0 2 2h3v-7h4v7h3a2 2 0 0 0 2-2V9']),
 // 照護分頁（2026-11-13）：日曆＋愛心
 'care-calendar':Object.freeze(['M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z','M4 9.5h16','M8.5 3v4M15.5 3v4','M12 18.2s-3.2-1.9-3.2-3.9a1.7 1.7 0 0 1 3.2-.8 1.7 1.7 0 0 1 3.2.8c0 2-3.2 3.9-3.2 3.9Z']),
 'bowl-food':Object.freeze(['M3 11h18l-1.6 6.5a3 3 0 0 1-2.9 2.3h-9a3 3 0 0 1-2.9-2.3L3 11Z','M6 11V9a3 3 0 0 1 5.6-1.5A3.5 3.5 0 0 1 18 9.5V11','M8 21h8']),
 'play-wand':Object.freeze(['m4 21 8-17','M12 4c4.6-2.4 8 0 8 3.8 0 2.3-1.4 3.6-2.7 5.2','M17.3 13c-3-.5-5.3 1.8-4.7 5.3 3.5.7 6.1-1.9 4.7-5.3Z','m12.6 18.3-1.4 1.4']),
 'notebook':Object.freeze(['M7 3.5h11a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H7a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z','M8 3.5v17M11.5 9h5M11.5 13h5']),
 'cat-face':Object.freeze(['M4 10V3.5l5 3.3a11 11 0 0 1 6 0l5-3.3V10a7.4 7.4 0 0 1 1.3 4c0 4.3-4.1 7-9.3 7s-9.3-2.7-9.3-7A7.4 7.4 0 0 1 4 10Z','M8 12v1m8-1v1m-5 3h2l-1 1.5Z']),
 'family-cats':Object.freeze(['M12.8 6.2V2.8l3 2.1a8 8 0 0 1 3 0l2.4-2.1v5.7a5.7 5.7 0 0 1 1 3.1c0 2.7-1.8 4.5-4.5 5','M3.7 13.1V7.5l3.6 2.6a9.7 9.7 0 0 1 4.7 0l3.6-2.6v5.6a5.5 5.5 0 0 1 1 3.1c0 3.4-3.1 5.3-7 5.3s-7-1.9-7-5.3a5.5 5.5 0 0 1 1.1-3.1Z'])
});

export function NavigationIcon({react:R,name,size=22}){
 const stickers={'house':'house','care-calendar':'care-add','bowl-food':'meal','play-wand':'play-wand','notebook':'notebook','cat-face':'cat-face','family-cats':'family'};
 if(stickers[name])return R.createElement('img',{className:'navigation-icon',src:'/xbb-site/app/assets/cute-actions/'+stickers[name]+'.svg?v=expanded1',width:size,height:size,alt:'','aria-hidden':true,draggable:false,'data-navigation-icon':name});
 const paths=NAVIGATION_ICON_PATHS[name];
 if(!paths)return null;
 return R.createElement('svg',{className:'navigation-icon',viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:'false','data-navigation-icon':name},
  paths.map((d,index)=>R.createElement('path',{key:index,d})));
}
