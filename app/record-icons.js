// One presentation-only icon family. Category colors never indicate health status.
export const RECORD_ICONS=Object.freeze({
 food:{color:'#99633f',shape:'<path d="M3 11h18l-1.7 6.2a3 3 0 0 1-2.9 2.2H7.6a3 3 0 0 1-2.9-2.2L3 11ZM7 22h10M7 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M17 7c0-1 1-1.5 1-2.5"/>'},
 water:{color:'#46778e',shape:'<path d="M12 2.8c-2.4 3.6-6.5 7.7-6.5 11.4a6.5 6.5 0 0 0 13 0C18.5 10.5 14.4 6.4 12 2.8Z"/><path d="M8.8 14.4a3.2 3.2 0 0 0 3.2 3.2"/>'},
 stool:{color:'#79543b',shape:'<path d="M9 9.3C7.5 7 12 6.3 11.3 3.2c3.7.8 5.2 3.8 3.7 6.1M8.3 9.3h7.4a3 3 0 0 1 2.3 5.2H6a3 3 0 0 1 2.3-5.2ZM6 14.5h12a3.4 3.4 0 0 1 0 6.8H6a3.4 3.4 0 0 1 0-6.8Z"/>'},
 weight:{color:'#586f98',shape:'<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M7.5 10a4.5 4.5 0 0 1 9 0ZM12 9l1.5-2M8 16v1.5m8-1.5v1.5"/>'},
 vomit:{color:'#91703f',shape:'<path d="M5 14h14l-1 4.2a2.5 2.5 0 0 1-2.4 1.9H8.4A2.5 2.5 0 0 1 6 18.2L5 14ZM11.7 3.5c-1 1.5-2.2 2.8-2.2 4a2.2 2.2 0 0 0 4.4 0c0-1.2-1.2-2.5-2.2-4ZM16.5 7.5c1 .4 1.5 1.2 1.5 2.2"/>'},
 mood:{color:'#806592',shape:'<circle cx="12" cy="12" r="8.5"/><path d="M8 10h.1M15.9 10h.1M8.5 14.5c1.7 1.6 5.3 1.6 7 0"/>'},
 other:{color:'#716780',shape:'<path d="M11 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M9 15l1-4 8-8a1.6 1.6 0 0 1 2.3 2.3l-8 8L9 15ZM16.5 4.5l3 3M8 18h7"/>'},
 care:{color:'#527c68',shape:'<path d="m14 3 7 7M16 5l-3 3M19 8l-3 3M12 7l5 5-7.5 7.5H5v-4.5L12 7ZM8 12l2 2M5 19.5l-2 2M4 20.5l-1-1"/>'}
});
const ALIASES=Object.freeze({'飲食':'food','餵食':'food','喝水':'water','排泄':'stool','體重':'weight','嘔吐':'vomit','精神':'mood','精神狀態':'mood','其他':'other','疫苗／驅蟲':'care'});
export const recordIconKey=kind=>Object.hasOwn(RECORD_ICONS,kind)?kind:ALIASES[kind]||'other';
export function recordIconProps(kind,size=22){
 const key=recordIconKey(kind);
 return {className:'record-kind-icon',src:'/xbb-site/app/assets/icons/record-'+key+'.svg?v=1',width:size,height:size,alt:'','aria-hidden':true,draggable:false,'data-record-icon':key};
}
export function recordIconSVG(kind){const icon=RECORD_ICONS[recordIconKey(kind)];return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="'+icon.color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon.shape+'</svg>\n';}
