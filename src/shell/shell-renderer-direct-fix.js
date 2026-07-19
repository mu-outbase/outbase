(() => {
  'use strict';

  const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
  let lastShellRoute='';
  const homeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
  const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const plusIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const vaultIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5V3h10v2M8 10h8"/></svg>';

  const bellIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21h4"/></svg>';
  const settingsIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 15a2 2 0 0 0 .4 2.2l-2.2 2.2A2 2 0 0 0 15 19l-1 2h-4l-1-2a2 2 0 0 0-2.2.4l-2.2-2.2A2 2 0 0 0 5 15l-2-1v-4l2-1a2 2 0 0 0-.4-2.2l2.2-2.2A2 2 0 0 0 9 5l1-2h4l1 2a2 2 0 0 0 2.2-.4l2.2 2.2A2 2 0 0 0 19 9l2 1v4Z"/></svg>';


  function commonHeaderHtml(){
    return `
      <a href="./?shell=1&view=home" data-ob3-route="home" class="ob-common-header-brand" aria-label="OUTBASEホーム">
        <b>OUTBASE</b>
      </a>
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
