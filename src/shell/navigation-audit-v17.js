(() => {
  'use strict';

  if(globalThis.OUTBASE_NAVIGATION_AUDIT_V17)return;

  const router=globalThis.OUTBASE_ROUTER;
  if(!router)return;

  function valuesFrom(url){
    const values={};
    for(const [key,value] of url.searchParams.entries()){
      if(key==='shell'||key==='view'||value==='')continue;
      values[key]=value;
    }
    return values;
  }

  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
    if(link.matches('[data-ob5-nav],[data-ob3-route],[data-ob17-context]'))return;

    let url;
    try{url=new URL(link.href,location.href);}catch(_error){return;}
    if(url.origin!==location.origin)return;
    if(url.searchParams.get('shell')!=='1')return;

    const name=url.searchParams.get('view')||'home';
    if(!router.SHELL_ROUTES?.includes?.(name))return;

    event.preventDefault();
    router.navigate(name,valuesFrom(url),{transition:true});
  },true);

  addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type!=='OUTBASE_CALENDAR_NAVIGATE')return;
    const name=String(event.data?.name||'');
    if(!router.SHELL_ROUTES?.includes?.(name))return;
    router.navigate(name,event.data?.values||{},{transition:true});
  });

  globalThis.OUTBASE_NAVIGATION_AUDIT_V17=Object.freeze({
    version:'v17.1',
    valuesFrom
  });
})();
