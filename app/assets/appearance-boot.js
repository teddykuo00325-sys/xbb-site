/* Run before styles and app modules: no first-paint white flash or data migration. */
(()=>{
 const root=document.documentElement,key='inpaw-appearance-v1';
 const valid=value=>value==='dark'||value==='light'?value:'system';
 let choice='system';try{choice=valid(localStorage.getItem(key))}catch{}
 const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
 const apply=()=>{choice=valid(root.dataset.appearance||choice);const theme=choice==='system'?(media?.matches?'dark':'light'):choice;root.dataset.appearance=choice;root.dataset.theme=theme;root.style.colorScheme='only '+theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#211f1d':'#fbf7ef');};
 apply();if(media?.addEventListener)media.addEventListener('change',apply);else media?.addListener?.(apply);
 window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;choice=valid(event.newValue);root.dataset.appearance=choice;apply();window.dispatchEvent(new Event('inpaw-appearance-change'));});
})();
