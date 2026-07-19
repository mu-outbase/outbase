(() => {
  'use strict';

  const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
  const homeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
  const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const plusIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const vaultIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5V3h10v2M8 10h8"/></svg>';

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
    const query=new URLSearchParams({embedded:'1',source:'shell-renderer-fix',release:'formal-v44-direct3'});
    ['month','people','activityId','planId','sheet'].forEach(key=>{
      const value=route?.[key];
      if(value)query.set(key,String(value));
    });
    return `./calendar-formal-v44.html?${query.toString()}`;
  }

  function apply(root,model){
    const shell=root?.querySelector?.('.ob3-shell');
    if(!shell)return;

    const route=model?.route?.name||'home';
    const nav=shell.querySelector('.ob3-nav');
    if(nav){
      nav.classList.add('ob-nav-five','ob-nav-direct');
      nav.innerHTML=navHtml(route);
    }

    if(route==='calendar'){
      const main=shell.querySelector('.ob3-main');
      if(main){
        main.innerHTML=`<section class="ob-calendar-direct" aria-label="カレンダー"><iframe id="outbaseIntegratedCalendar" title="OUTBASE カレンダー" src="${calendarUrl(model.route)}" loading="eager"></iframe></section>`;
      }
    }
  }

  function wrap(base){
    if(!base||base.__directFix)return base;
    const wrapped={
      ...base,
      __directFix:true,
      async mount(root,options={}){
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
      frame.style.height=`${Math.max(760,Number(event.data.height)||0)}px`;
    });
  }

  const base=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
  if(!base)throw new Error('OUTBASE shell renderer is not ready');

  const fixed=wrap(base);
  globalThis.OUTBASE_SHELL_RENDERER_V166=fixed;
  globalThis.OUTBASE_SHELL_RENDERER_V165=fixed;
  globalThis.OUTBASE_SHELL_RENDERER_V164=fixed;
})();
