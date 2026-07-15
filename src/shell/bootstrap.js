(() => {
  'use strict';
  const router=globalThis.OUTBASE_ROUTER,legacy=globalThis.OUTBASE_LEGACY_UI_V165,renderer=globalThis.OUTBASE_SHELL_RENDERER_V165,modals=globalThis.OUTBASE_MODAL_STACK_V164;
  let root=null,mounted=false,rendering=false,bound=false,previousScrollRestoration=null;
  function requested(){return router?.shellRequested?.()===true;}
  function snapshot(){return Object.freeze({version:'v165.2-scroll-restore',requested:requested(),mounted,route:router?.current?.()||null,safe:legacy?.shellSafe?.()??false,cutover:false,previewOnly:true});}
  function restoreBrowserScrollMode(){if(previousScrollRestoration!==null&&'scrollRestoration'in history)history.scrollRestoration=previousScrollRestoration;previousScrollRestoration=null;}
  function fallback(reason){restoreBrowserScrollMode();document.body.classList.remove('outbaseShellPreview');root?.remove();root=null;mounted=false;globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-fallback',{detail:{reason,snapshot:snapshot()}}));return {status:'fallback',reason};}
  function currentScrollY(){const number=Number(globalThis.scrollY??document.scrollingElement?.scrollTop??0);return Number.isFinite(number)&&number>0?Math.round(number):0;}
  function routeScrollTarget(reason,before){if(reason==='popstate'||reason==='replace-preserve')return router.savedScrollY?.()||0;if(['initial','push','replace'].includes(reason))return 0;return before;}
  function applyScroll(top){
    const value=Math.max(0,Number(top)||0);
    return new Promise(resolve=>{
      const run=()=>{
        const scroller=document.scrollingElement||document.documentElement||document.body;
        if(scroller)scroller.scrollTop=value;
        if(typeof globalThis.scrollTo==='function')globalThis.scrollTo(0,value);
        resolve(value);
      };
      if(typeof globalThis.requestAnimationFrame==='function')globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(run));else setTimeout(run,0);
    });
  }
  async function render(reason='refresh'){
    if(!mounted||rendering||!root)return;
    const before=currentScrollY();
    rendering=true;
    try{await renderer.mount(root);await applyScroll(routeScrollTarget(reason,before));}
    catch(error){console.error('[OUTBASE v165.2] shell render failed',error);fallback('render_failed');}
    finally{rendering=false;}
  }
  function action(name){if(name==='plan-add')return legacy.openPlanAdd();if(name==='memo')return legacy.openMemo();if(name==='start')return legacy.openStart();if(name==='calendar')return router.navigate('calendar');}
  function navValues(element){return {activityId:element.dataset.ob5ActivityId||'',month:element.dataset.ob5Month||'',people:element.dataset.ob5People||''};}
  function bind(){
    if(bound)return;bound=true;
    document.addEventListener('click',event=>{
      if(!mounted)return;
      const shellNav=event.target.closest?.('[data-ob5-nav]');if(shellNav){event.preventDefault();router.navigate(shellNav.dataset.ob5Route||'home',navValues(shellNav));return;}
      const route=event.target.closest?.('[data-ob3-route]');if(route){event.preventDefault();router.navigate(route.dataset.ob3Route);return;}
      const filter=event.target.closest?.('[data-ob5-filter]');if(filter){event.preventDefault();const current=router.current();const next=globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.toggle(current.people,filter.dataset.ob5Filter);router.navigate('calendar',{month:current.month,people:globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.serialize(next)},{replace:true,preserveScroll:true});return;}
      if(event.target.closest?.('[data-ob3-central]')){modals.open('central');renderer.showCentral();return;}
      if(event.target.closest?.('[data-ob3-close]')||event.target.matches?.('[data-ob3-backdrop]')){renderer.hideCentral();modals.close();return;}
      const button=event.target.closest?.('[data-ob3-action]');if(button){action(button.dataset.ob3Action);return;}
      const old=event.target.closest?.('[data-ob3-legacy]');if(old){const target=old.dataset.ob3Legacy;if(target==='search')legacy.openSearch();else if(target==='vault')legacy.openVault();else legacy.openLegacyHome();}
    },true);
    router.subscribe((_route,reason)=>render(reason));
    modals.subscribe((stack,reason)=>{if(!stack.length&&reason==='back')renderer.hideCentral();});
    addEventListener('online',()=>render('refresh'));addEventListener('offline',()=>render('refresh'));
  }
  async function start(){
    if(!requested())return {status:'not_requested',snapshot:snapshot()};
    if(!legacy.shellSafe())return fallback('active_session_protected');
    if('scrollRestoration'in history){previousScrollRestoration=history.scrollRestoration;history.scrollRestoration='manual';}
    root=document.getElementById('outbaseShellRoot');if(!root){root=document.createElement('div');root.id='outbaseShellRoot';document.body.insertBefore(root,document.body.firstChild);}
    document.body.classList.add('outbaseShellPreview');mounted=true;bind();await render('initial');
    const detail={status:'ready',version:'v165.2-scroll-restore',previewOnly:true,cutover:false,route:router.current()};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-ready',{detail}));return detail;
  }
  const ready=start();
  const api=Object.freeze({ready,start,render,snapshot,fallback,applyScroll,routeScrollTarget});
  globalThis.OUTBASE_SHELL_V165=api;
  globalThis.OUTBASE_SHELL_V164=api;
})();
