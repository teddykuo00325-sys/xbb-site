// Decorative SVG stickers. The original text labels and data/action semantics stay intact.
const ICONS=new Set(['meal','water','litter','weight','voice','diary-add','diary-save','care-add','vet-visit']);
export function cuteActionIconProps(name,size=28){
 if(!ICONS.has(name))throw new RangeError('Unknown cute action icon: '+name);
 return {className:'cute-action-icon',src:'/xbb-site/app/assets/cute-actions/'+name+'.svg?v=cute1',width:size,height:size,alt:'','aria-hidden':true,draggable:false,'data-cute-icon':name};
}
export function cuteActionLabel(R,name,label){return R.createElement(R.Fragment,null,R.createElement('img',cuteActionIconProps(name)),R.createElement('span',{className:'cute-action-label'},label));}
