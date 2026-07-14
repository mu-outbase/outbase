(() => {
  'use strict';
  const router=globalThis.OUTBASE_ROUTER,legacy=globalThis.OUTBASE_LEGACY_UI_V165,renderer=globalThis.OUTBASE_SHELL_RENDERER_V165,modals=globalThis.OUTBASE_MODAL_STACK_V164;
  let root=null,mounted=false,rendering=false,bound=false;
  function requested(){return router?.shellRequested?.()===true;}
  function snapshot(){return Object.freeze({version:'v165-integrated',requested:requested(),mounted,route:router?.current?.()||null,safe:legacy?.shellSafe?.()??false,cutover:false,previewOnly:true});}
  function fallback(reason){document.body.classList.remove('outbaseShellPreview');root?.remove();root=null;mounted=false;globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-fallback',{detail:{reason,snapshot:snapshot()}}));return {status:'fallback',reason};}
  async function render(){if(!mounted||rendering||!root)return;rendering=true;try{await renderer.mount(root);}catch(error){console.error('[OUTBASE v165] shell render failed',error);fallback('render_failed');}finally{rendering=false;}}
  function action(name){if(name==='plan-add')return legacy.openPlanAdd();if(name==='memo')return legacy.openMemo();if(name==='start')return legacy.openStart();if(name==='calendar')return router.navigate('calendar');}
  function navValues(element){return {activityId:element.dataset.ob5ActivityId||'',month:element.dataset.ob5Month||'',people:element.dataset.ob5People||''};}
  function bind(){
    if(bound)return;bound=true;
    document.addEventListener('click',event=>{
      if(!mounted)return;
      const shellNav=event.target.closest?.('[data-ob5-nav]');if(shellNav){event.preventDefault();router.navigate(shellNav.dataset.ob5Route||'home',navValues(shellNav));return;}
      const route=event.target.closest?.('[data-ob3-route]');if(route){event.preventDefault();router.navigate(route.dataset.ob3Route);return;}
      const filter=event.target.closest?.('[data-ob5-filter]');if(filter){event.preventDefault();const current=router.current();const next=globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.toggle(current.people,filter.dataset.ob5Filter);router.navigate('calendar',{month:current.month,people:globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.serialize(next)},{replace:true});return;}
      if(event.target.closest?.('[data-ob3-central]')){modals.open('central');renderer.showCentral();return;}
      if(event.target.closest?.('[data-ob3-close]')||event.target.matches?.('[data-ob3-backdrop]')){renderer.hideCentral();modals.close();return;}
      const button=event.target.closest?.('[data-ob3-action]');if(button){action(button.dataset.ob3Action);return;}
      const old=event.target.closest?.('[data-ob3-legacy]');if(old){const target=old.dataset.ob3Legacy;if(target==='search')legacy.openSearch();else if(target==='vault')legacy.openVault();else legacy.openLegacyHome();}
    },true);
    router.subscribe(()=>render());
    modals.subscribe((stack,reason)=>{if(!stack.length&&reason==='back')renderer.hideCentral();});
    addEventListener('online',()=>render());addEventListener('offline',()=>render());
  }
  async function start(){
    if(!requested())return {status:'not_requested',snapshot:snapshot()};
    if(!legacy.shellSafe())return fallback('active_session_protected');
    root=document.getElementById('outbaseShellRoot');if(!root){root=document.createElement('div');root.id='outbaseShellRoot';document.body.insertBefore(root,document.body.firstChild);}
    document.body.classList.add('outbaseShellPreview');mounted=true;bind();await render();
    const detail={status:'ready',version:'v165-integrated',previewOnly:true,cutover:false,route:router.current()};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-ready',{detail}));return detail;
  }
  const ready=start();
  const api=Object.freeze({ready,start,render,snapshot,fallback});
  globalThis.OUTBASE_SHELL_V165=api;
  globalThis.OUTBASE_SHELL_V164=api;
})();
