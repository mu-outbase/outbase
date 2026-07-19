(() => {
  'use strict';

  const base=
    globalThis.OUTBASE_SHELL_RENDERER_V166||
    globalThis.OUTBASE_SHELL_RENDERER_V165||
    globalThis.OUTBASE_SHELL_RENDERER_V164;

  if(!base)throw new Error('OUTBASE preparation renderer is not ready');
  if(base.__preparationV17)return;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const icons={
    back:'<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    play:'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>',
    arrow:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    prep:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 10h7M8.5 14h7M8.5 18h4"/></svg>'
  };

  const categoryIcon=Object.freeze({
    weather:'☀',
    route:'↗',
    gear:'▦',
    meal:'⌁',
    shopping:'✓',
    pet:'●',
    parking:'P',
    ticket:'券',
    note:'…'
  });

  const date=value=>{
    const d=new Date(value||'');
    return Number.isNaN(d.getTime())?null:d;
  };
  const short=value=>{
    const d=date(value);
    return d?`${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`:'日程未設定';
  };
  const range=item=>{
    if(!item?.startAt)return '日程未設定';
    const start=short(item.startAt);
    const end=short(item.endAt||item.startAt);
    return start===end?start:`${start}〜${end}`;
  };
  const planId=item=>item?.legacyPlanId||item?.metadata?.legacy_plan?.id||null;

  function legacyUrl(name,params={}){
    return globalThis.OUTBASE_ROUTER.legacyUrl(name,params);
  }

  async function activateContext(item){
    if(!item?.id)return false;
    try{
      localStorage.setItem('outbase_core_activity_id',String(item.id));
      localStorage.setItem('outbase_primary_activity_id_v2',String(item.id));
      const legacyPlanId=planId(item);
      if(legacyPlanId)localStorage.setItem('outbase_active_plan_id',String(legacyPlanId));
      await globalThis.OUTBASE_REPOSITORIES_V160?.setCurrentActivity?.(item.id,{
        mode:'legacy-shadow',
        current_plan_id:legacyPlanId||null
      });
      return true;
    }catch(_error){
      return false;
    }
  }

  async function load(activityId){
    if(!activityId)return {status:'missing'};
    try{
      await globalThis.OUTBASE_PREPARATION_DOMAIN_V162?.ensureBaseline?.(activityId);
      const [summary,detail]=await Promise.all([
        globalThis.OUTBASE_PREPARATION_SCREEN_MODEL_V162.build(activityId),
        globalThis.OUTBASE_ACTIVITY_DETAIL_SCREEN_MODEL_V165.build(activityId)
      ]);
      if(!summary||detail?.status!=='ready'||!detail?.activity)return {status:'not_found'};
      return {status:'ready',summary,item:detail.activity};
    }catch(error){
      return {status:'error',error};
    }
  }

  function itemMarkup(item){
    const done=item.status==='completed'||Boolean(item.completedAt);
    const enabled=Boolean(item.id);
    return `<button type="button" class="ob17-prep-item ${done?'done':''}" data-ob17-prep-toggle="${esc(item.id||'')}" ${enabled?'':'disabled'}>
      <span class="ob17-check">${done?icons.check:''}</span>
      <span class="ob17-prep-copy"><b>${esc(item.title||'準備')}</b><small>${done?'完了':'未完了'}</small></span>
    </button>`;
  }

  function sectionsMarkup(summary){
    const sections=summary?.sections||[];
    if(!sections.length)return '<p class="ob17-empty">準備項目はまだありません。</p>';
    return sections.map(section=>`
      <section class="ob17-prep-section">
        <header><span>${esc(categoryIcon[section.key]||'•')}</span><h2>${esc(section.label||'準備')}</h2></header>
        <div>${(section.items||[]).map(itemMarkup).join('')}</div>
      </section>
    `).join('');
  }

  function markup(result){
    if(result.status!=='ready'){
      const message=result.status==='missing'?'対象の予定が選ばれていません。':result.status==='error'?'準備を読み込めませんでした。':'予定が見つかりません。';
      return `<section class="ob17-preparation"><div class="ob17-error"><h1>準備</h1><p>${esc(message)}</p><button type="button" data-ob17-home>ホームへ戻る</button></div></section>`;
    }

    const {summary,item}=result;
    const total=Number(summary.total||0);
    const completed=Number(summary.completed||0);
    const pending=Number(summary.pending||Math.max(0,total-completed));
    const progress=Math.max(0,Math.min(100,Number(summary.progress||0)));
    const legacyPlanId=planId(item);
    const advanced=legacyUrl('activity',{
      activityId:item.id,
      planId:legacyPlanId,
      returnShell:'preparation',
      returnActivityId:item.id
    });
    const start=legacyUrl('record',{
      activityId:item.id,
      planId:legacyPlanId,
      sheet:'start',
      returnShell:'activity',
      returnActivityId:item.id
    });

    return `<section class="ob17-preparation" data-ob17-activity-id="${esc(item.id)}">
      <button type="button" class="ob17-back" data-ob17-detail>${icons.back}<span>予定詳細</span></button>

      <section class="ob17-prep-hero">
        <small>PREPARATION</small>
        <h1>${esc(item.title||'予定')}</h1>
        <p>${esc(range(item))}</p>
        <p>${esc(item.place||'場所未設定')}</p>
        <div class="ob17-progress-row">
          <strong>${completed}<i>/ ${total}</i></strong>
          <div><span style="width:${progress}%"></span></div>
          <b>${progress}%</b>
        </div>
        <em>${pending}件 未完了</em>
      </section>

      <div class="ob17-prep-sections">${sectionsMarkup(summary)}</div>

      <section class="ob17-flow-actions">
        <button type="button" class="primary" data-ob17-start data-href="${esc(start)}">
          <span>${icons.play}</span>
          <span><b>活動を始める</b><small>当日のGPS・写真・音声・メモへ</small></span>
          ${icons.arrow}
        </button>
        <button type="button" class="secondary" data-ob17-advanced data-href="${esc(advanced)}">
          <span>${icons.prep}</span>
          <span><b>詳細な準備を開く</b><small>持ち物台帳・料理・買い物など</small></span>
          ${icons.arrow}
        </button>
      </section>

      <button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer">© 2026 OUTBASE</button>
    </section>`;
  }

  async function rerender(main,activityId,{preserveScroll=true}={}){
    const y=preserveScroll?window.scrollY:0;
    main.innerHTML='<section class="ob17-preparation"><div class="ob17-loading">準備を読み込んでいます。</div></section>';
    const result=await load(activityId);
    main.innerHTML=markup(result);
    bind(main,result);
    if(preserveScroll)requestAnimationFrame(()=>window.scrollTo(0,y));
  }

  async function toggleItem(main,result,itemId){
    if(result.status!=='ready'||!itemId)return;
    const repo=globalThis.OUTBASE_REPOSITORIES_V160?.preparationItems;
    const row=await repo?.get?.(itemId);
    if(!row)return;
    const done=row.status==='completed'||Boolean(row.completed_at);
    await repo.save({
      ...row,
      status:done?'pending':'completed',
      completed_at:done?null:new Date().toISOString()
    });
    globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.(`activity:${result.item.id}`);
    await rerender(main,result.item.id);
  }

  function bind(main,result){
    main.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>globalThis.OUTBASE_ABOUT?.open?.());

    main.querySelector('[data-ob17-home]')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ROUTER.navigate('home',{}, {transition:true});
    });

    if(result.status!=='ready')return;
    const item=result.item;

    main.querySelector('[data-ob17-detail]')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ROUTER.navigate('activity',{activityId:item.id,planId:planId(item)},{transition:true});
    });

    main.querySelectorAll('[data-ob17-prep-toggle]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      try{await toggleItem(main,result,button.dataset.ob17PrepToggle||'');}
      catch(_error){button.disabled=false;}
    }));

    main.querySelector('[data-ob17-start]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;
      await activateContext(item);
      location.assign(button.dataset.href);
    });

    main.querySelector('[data-ob17-advanced]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;
      await activateContext(item);
      location.assign(button.dataset.href);
    });
  }

  const renderer=Object.freeze({
    ...base,
    __preparationV17:true,
    async mount(root,options={}){
      const value=await base.mount(root,options);
      const main=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      const active=value?.route?.name==='preparation';
      if(main)main.classList.toggle('ob3-main-preparation',active);
      if(active&&main){
        main.classList.remove('ob3-main-calendar','ob3-main-activity');
        await rerender(main,value.route.activityId,{preserveScroll:false});
      }
      return value;
    },
    updateNav(root,value){base.updateNav?.(root,value);}
  });

  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
