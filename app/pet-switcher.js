import {t} from '/xbb-site/app/assets/i18n.js?v=audit1117b';
import {FamilyRail} from './family-overview.js?v=photo-simplify1';
export function PetSwitchButton({react:R,profile={},onClick,color,family,photo,disabled=false,compact=false}) {
  const h=R.createElement,name=profile.name;
  if(typeof name!=='string'||!name.trim())return null;
  if(family)return h(FamilyRail,{react:R,family,disabled,compact});
  return h('div',{className:'pet-owner-header'},
    h('span',{className:'pet-owner-prefix','aria-hidden':true},t('目前照顧：')),
    h('button',{type:'button',className:'pet-switch-button','aria-label':t('目前照顧：{name}，切換毛孩',{name}),'aria-haspopup':'dialog',onClick,disabled},
      photo?h('img',{className:'pet-switch-photo',src:photo,alt:'',width:28,height:28,draggable:false}):
        h('span',{className:'pet-switch-color','aria-hidden':true,style:{backgroundColor:color?.coat||'#D99550'}}),
      h('strong',{className:'pet-switch-name'},name),
      h('span',{className:'pet-switch-arrow','aria-hidden':true},'▾')));
}

export function PetOwnerLabel({react:R,name,profile={},hint}) {
  const h=R.createElement,owner=name??profile.name;
  if(typeof owner!=='string'||!owner.trim())return null;
  return h('div',{className:'pet-owner-static'},
    h('p',{className:'pet-owner-label'},t('目前照顧：'),h('strong',null,owner)),
    hint&&h('p',{className:'pet-owner-hint'},hint));
}
