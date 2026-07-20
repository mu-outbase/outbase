(() => {
  'use strict';

  let lastShellRoute='';
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll("'",'&#039;');

  const ui=globalThis.OUTBASE_UI_V21;
  if(!ui)throw new Error('OUTBASE UI v21 is not ready');
  const {home:homeIcon,calendar:calendarIcon,plus:plusIcon,search:searchIcon,vault:vaultIcon,bell:bellIcon,settings:settingsIcon}=ui.icons;


  function headerContext(){
    const api=globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
    return api?.current?.()||{};
  }

  function contextChipHtml(){
    const context=headerContext();
    const title=context.activityTitle||'予定を選ぶ';
    const meta=context.activityTypeLabel||context.activityType||'主役プラン';
    return `<button type="button" class="ob18-context-chip ${context.activityId?'':'is-empty'}" data-ob18-plan-switch aria-label="主役プランを切り替える">
      <span><b data-ob18-plan-title>${esc(title)}</b><small data-ob18-plan-meta>${esc(meta)}</small></span><i aria-hidden="true">切替</i>
    </button>`;
  }

  function commonHeaderHtml(){
    return `
      <a href="./?shell=1&view=home" data-ob3-route="home" class="ob-common-header-brand" aria-label="OUTBASEホーム">
        <b>OUTBASE</b>
      </a>
      ${contextChipHtml()}
      <div class="ob-common-header-actions">
        <button type="button" data-ob36-notify class="ob-common-header-icon notify" aria-label="通知">
          ${bellIcon}
        </button>
        <button type="button" data-ob36-settings class="ob-common-header-icon" aria-label="設定">
          ${settingsIcon}
        </button>
      </div>`;
  }

  function navHtml(route){
    const active=name=>route===name?'active':'';
    const current=name=>route===name?'aria-current="page"':'';
    return `
      <button data-ob3-route="home" class="${active('home')}" ${current('home')}>
        <span class="ob36-nav-icon">${homeIcon}</span><span>ホーム</span>
      </button>
      <button data-ob3-route="calendar" class="${active('calendar')}" ${current('calendar')}>
        <span class="ob36-nav-icon">${calendarIcon}</span><span>カレンダー</span>
      </button>
      <button class="ob3-central" data-ob3-central>
        <span class="ob36-nav-icon">${plusIcon}</span><span>追加</span>
      </button>
      <button data-ob3-route="search" class="${active('search')}" ${current('search')}>
        <span class="ob36-nav-icon">${searchIcon}</span><span>探す</span>
      </button>
      <button data-ob3-route="vault" class="${active('vault')}" ${current('vault')}>
        <span class="ob36-nav-icon">${vaultIcon}</span><span>保管庫</span>
      </button>`;
  }

  function calendarUrl(route){
    const query=new URLSearchParams({embedded:'1',defaultToday:'1',source:'shell-renderer-fix',release:'formal-v44-swipe-today-bg-v1'});
    ['month','people','activityId','planId','sheet'].forEach(key=>{
      const value=route?.[key];
      if(value)query.set(key,String(value));
    });
    return `./calendar-formal-v44.html?${query.toString()}`;
  }


  function shellModelApi(){
    return globalThis.OUTBASE_SHELL_MODEL_V166||
      globalThis.OUTBASE_SHELL_MODEL_V165||
      globalThis.OUTBASE_SHELL_MODEL_V164;
  }

  function ensureShellSkeleton(root,route='preparation'){
    let shell=root?.querySelector?.(':scope > .ob3-shell')||root?.querySelector?.('.ob3-shell');
    if(shell)return shell;
    if(!root)return null;
    root.innerHTML=`<div class="ob3-shell ob6-north" data-ob6-route="${route}"><header class="ob3-header"></header><main class="ob3-main"></main><nav class="ob3-nav"></nav><div id="outbaseShellModal"></div></div>`;
    return root.querySelector?.(':scope > .ob3-shell')||root.querySelector?.('.ob3-shell');
  }

  async function mountPreparationShell(root,options={}){
    const route=globalThis.OUTBASE_ROUTER?.current?.()||{name:'preparation',activityId:null};
    const model=Object.freeze({route,online:navigator.onLine,fastPreparationShell:true});
    const shell=ensureShellSkeleton(root,route?.name||'preparation');
    if(!shell)throw new Error('OUTBASE preparation shell is not ready');
    shell.dataset.ob6Route=route?.name||'preparation';
    const main=shell.querySelector('.ob3-main');
    const renderedId=main?.querySelector?.('.ob17-preparation[data-ob17-activity-id]')?.dataset?.ob17ActivityId||'';
    if(main&&String(renderedId)!==String(route?.activityId||'')){
      main.innerHTML='<section class="ob17-preparation"><div class="ob17-loading">準備を読み込んでいます。</div></section>';
    }
    apply(root,model);
    return model;
  }

  function ensureCopyright(main){
    if(!main)return;

    main.querySelectorAll('#outbaseCopyrightFooter').forEach((node,index)=>{
      if(index>0)node.remove();
    });

    let footer=main.querySelector('#outbaseCopyrightFooter');
    if(!footer){
      footer=document.createElement('button');
      footer.id='outbaseCopyrightFooter';
      footer.type='button';
      footer.className='ob-copyright-footer';
      footer.textContent='© 2026 OUTBASE';
      footer.setAttribute('aria-label','このアプリについて');
      footer.addEventListener('click',()=>globalThis.OUTBASE_ABOUT?.open?.());
    }

    const reserve=main.querySelector('.ob36-nav-reserve');
    if(reserve){
      if(footer.nextElementSibling!==reserve)main.insertBefore(footer,reserve);
    }else if(main.lastElementChild!==footer){
      main.appendChild(footer);
    }
  }

  function apply(root,model){
    const shell=root?.querySelector?.('.ob3-shell');
    if(!shell)return;

    const route=model?.route?.name||'home';
    const routeChanged=route!==lastShellRoute;
    lastShellRoute=route;
    const header=shell.querySelector('.ob3-header');
    const main=shell.querySelector('.ob3-main');
    const nav=shell.querySelector('.ob3-nav');
    main?.classList.toggle('ob3-main-calendar',route==='calendar');

    if(header){
      header.className='ob3-header ob-common-header-lock';
      header.innerHTML=commonHeaderHtml();
    }

    if(main){
      // HOME previously rendered its own OUTBASE topbar inside the page.
      // The shared shell header is now the only header.
      main.querySelectorAll('.ob36-topbar').forEach(node=>node.remove());

      if(route==='calendar'){
        main.innerHTML=`<section class="ob-calendar-direct" aria-label="カレンダー"><iframe id="outbaseIntegratedCalendar" title="OUTBASE カレンダー" src="${calendarUrl(model.route)}" loading="eager" scrolling="no"></iframe></section>`;
      }

      ensureCopyright(main);
    }

    if(nav){
      nav.className='ob3-nav ob36-nav ob-nav-five ob-nav-direct';
      nav.innerHTML=navHtml(route);
    }

    if(routeChanged){
      requestAnimationFrame(()=>{
        window.scrollTo({top:0,left:0,behavior:'auto'});
      });
    }
  }

  function wrap(base){
    if(!base||base.__directFix)return base;
    const wrapped={
      ...base,
      __directFix:true,
      async mount(root,options={}){
        const requested=globalThis.OUTBASE_ROUTER?.current?.();
        if(requested?.name==='preparation')return mountPreparationShell(root,options);
        const model=await base.mount(root,options);
        apply(root,model);
        return model;
      },
      updateNav(root,model){
        base.updateNav?.(root,model);
        apply(root,model);
      }
    };
    return Object.freeze(wrapped);
  }

  if(!globalThis.__OUTBASE_CALENDAR_DIRECT_RESIZE_BOUND__){
    globalThis.__OUTBASE_CALENDAR_DIRECT_RESIZE_BOUND__=true;
    addEventListener('message',event=>{
      if(event.origin!==location.origin)return;
      if(event.data?.type!=='OUTBASE_CALENDAR_RESIZE')return;
      const frame=document.getElementById('outbaseIntegratedCalendar');
      if(!frame)return;
      const height=Math.max(360,Math.ceil(Number(event.data.height)||0));
      const current=Math.round(frame.getBoundingClientRect().height);
      if(Math.abs(current-height)>2){
        frame.style.setProperty('height',`${height}px`,'important');
      }
      frame.style.setProperty('overflow','hidden','important');
    });
  }

  const base=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
  if(!base)throw new Error('OUTBASE shell renderer is not ready');

  const fixed=wrap(base);
  globalThis.OUTBASE_SHELL_RENDERER_V166=fixed;
  globalThis.OUTBASE_SHELL_RENDERER_V165=fixed;
  globalThis.OUTBASE_SHELL_RENDERER_V164=fixed;
})();
