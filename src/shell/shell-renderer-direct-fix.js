(() => {
  'use strict';

  const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
  const homeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
  const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const plusIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const vaultIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5V3h10v2M8 10h8"/></svg>';

  function navHtml(route){
    const item=(name,label,icon,extra='')=>`<button ${extra||`data-ob3-route="${name}"`} class="${route===name?'active':''}" ${route===name?'aria-current="page"':''}><span class="ob36-nav-icon">${icon}</span><span>${label}</span></button>`;
    return [
      item('home','ホーム',homeIcon),
      item('calendar','カレンダー',calendarIcon),
      item('add','追加',plusIcon,'class="ob3-central" data-ob3-central'),
      item('search','探す',searchIcon),
      item('vault','保管庫',vaultIcon)
    ].join('');
  }

  function calendarUrl(route){
    const query=new URLSearchParams({embedded:'1',source:'shell-renderer-fix',release:'formal-v44-direct2'});
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

  const base=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
  if(!base)throw new Error('OUTBASE shell renderer is not ready');

  const fixed=wrap(base);
  globalThis.OUTBASE_SHELL_RENDERER_V166=fixed;
  globalThis.OUTBASE_SHELL_RENDERER_V165=fixed;
  globalThis.OUTBASE_SHELL_RENDERER_V164=fixed;
})();
