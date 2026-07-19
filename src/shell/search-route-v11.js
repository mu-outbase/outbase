(() => {
  'use strict';

  const modelBase=
    globalThis.OUTBASE_SHELL_MODEL_V166||
    globalThis.OUTBASE_SHELL_MODEL_V165||
    globalThis.OUTBASE_SHELL_MODEL_V164;

  const rendererBase=
    globalThis.OUTBASE_SHELL_RENDERER_V166||
    globalThis.OUTBASE_SHELL_RENDERER_V165||
    globalThis.OUTBASE_SHELL_RENDERER_V164;

  if(!modelBase||!rendererBase)throw new Error('OUTBASE search dependencies are not ready');
  if(modelBase.__searchV11&&rendererBase.__searchV11)return;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const lower=value=>{
    let text=String(value??'');
    try{text=text.normalize('NFKC');}catch(_error){}
    return text.toLowerCase().replace(/[　\s]+/g,' ').trim();
  };

  const icons={
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    camp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 19 8-14 8 14M7 19h10M9.2 14.5h5.6"/></svg>',
    memory:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h6M8 17h5"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
  };

  const routeUrl=(name,params={})=>{
    try{return globalThis.OUTBASE_ROUTER.shellUrl(name,params);}
    catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}
  };

  const dateLabel=value=>{
    if(!value)return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return `${date.getMonth()+1}/${date.getDate()}（${'日月火水木金土'[date.getDay()]}）`;
  };

  const rangeLabel=item=>{
    const start=item?.startAt||item?.start||item?.date||'';
    const end=item?.endAt||item?.end||'';
    if(!start)return '';
    if(!end||String(start).slice(0,10)===String(end).slice(0,10))return dateLabel(start);
    return `${dateLabel(start)}〜${dateLabel(end)}`;
  };

  async function buildSearchPayload(){
    const homeApi=globalThis.OUTBASE_HOME_SCREEN_MODEL_V164;
    const vaultApi=globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162;
    const [home,vault]=await Promise.all([
      homeApi?.build?.().catch?.(()=>null)??null,
      vaultApi?.build?.({activityLimit:30,recordLimit:20,assetLimit:30}).catch?.(()=>null)??null
    ]);
    return Object.freeze({
      plans:Array.isArray(home?.next)?home.next.slice(0,24):[],
      activities:Array.isArray(vault?.activities)?vault.activities.slice(0,30):[],
      assets:Array.isArray(vault?.assets)?vault.assets.slice(0,30):[]
    });
  }

  const model=Object.freeze({
    ...modelBase,
    __searchV11:true,
    async build(options={}){
      const value=await modelBase.build(options);
      if(value?.route?.name!=='search')return value;
      const search=await buildSearchPayload();
      return Object.freeze({...value,search});
    }
  });

  function normalizeRows(search){
    const plans=(search?.plans||[]).map(item=>({
      key:`plan:${item.id||item.title}`,
      kind:'plan',
      kindLabel:'予定',
      title:item.title||'名称未設定の予定',
      sub:item.place||item.typeLabel||'場所未設定',
      meta:rangeLabel(item),
      href:item.detailUrl||routeUrl('activity',{activityId:item.id}),
      text:lower([item.title,item.place,item.typeLabel,item.stateLabel,(item.participants?.rows||[]).map(x=>x.name).join(' ')].join(' '))
    }));

    const activities=(search?.activities||[]).map(item=>({
      key:`memory:${item.id||item.title}`,
      kind:'memory',
      kindLabel:'思い出',
      title:item.title||'名称未設定の活動',
      sub:item.place||item.typeLabel||'記録',
      meta:rangeLabel(item),
      href:item.detailUrl||routeUrl('activity',{activityId:item.id}),
      text:lower([item.title,item.place,item.typeLabel,item.stateLabel,item.summary].join(' '))
    }));

    const assets=(search?.assets||[]).map(item=>({
      key:`asset:${item.id||item.name}`,
      kind:'asset',
      kindLabel:'持ち物',
      title:item.name||item.title||'名称未設定',
      sub:item.category||item.type||item.role||'持ち物',
      meta:item.quantity?`数量 ${item.quantity}`:'',
      href:routeUrl('vault'),
      text:lower([item.name,item.title,item.category,item.type,item.role,item.memo].join(' '))
    }));

    return [...plans,...activities,...assets];
  }

  function resultIcon(kind){
    if(kind==='plan')return icons.calendar;
    if(kind==='asset')return icons.gear;
    return icons.memory;
  }

  function resultMarkup(row){
    return `<a class="ob-search-result tone-${esc(row.kind)}" href="${esc(row.href)}">
      <span class="ob-search-result-icon">${resultIcon(row.kind)}</span>
      <span class="ob-search-result-copy">
        <small>${esc(row.kindLabel)}</small>
        <b>${esc(row.title)}</b>
        <em>${esc(row.sub)}</em>
      </span>
      <span class="ob-search-result-meta">${esc(row.meta)}</span>
      <span class="ob-search-result-arrow">${icons.arrow}</span>
    </a>`;
  }

  function searchMarkup(search){
    const rows=normalizeRows(search);
    return `<section class="ob-search-v11" data-ob-search-root>
      <header class="ob-search-hero">
        <small>SEARCH</small>
        <h1>探す</h1>
        <p>予定、思い出、持ち物をまとめて見つけます。</p>
      </header>

      <section class="ob-search-box" aria-label="横断検索">
        <span>${icons.search}</span>
        <input id="outbaseSearchInput" type="search" inputmode="search" autocomplete="off"
          placeholder="予定名・場所・記録・持ち物">
        <button id="outbaseSearchClear" type="button" aria-label="検索を消去" hidden>${icons.close}</button>
      </section>

      <div class="ob-search-filters" role="group" aria-label="検索対象">
        <button type="button" class="active" data-search-kind="all">すべて</button>
        <button type="button" data-search-kind="plan">予定</button>
        <button type="button" data-search-kind="memory">思い出</button>
        <button type="button" data-search-kind="asset">持ち物</button>
      </div>

      <section class="ob-search-actions">
        <button type="button" data-search-place>
          <span>${icons.pin}</span>
          <span><b>キャンプ場・場所を探す</b><small>候補、天気、保存した場所</small></span>
          ${icons.arrow}
        </button>
        <a href="${esc(routeUrl('vault'))}">
          <span>${icons.memory}</span>
          <span><b>保管庫から探す</b><small>写真、記録、活動ストーリー</small></span>
          ${icons.arrow}
        </a>
      </section>

      <section class="ob-search-result-section">
        <div class="ob-search-result-head">
          <h2 id="outbaseSearchResultTitle">最近とこれから</h2>
          <span id="outbaseSearchResultCount"></span>
        </div>
        <div id="outbaseSearchResults" class="ob-search-results"></div>
        <div id="outbaseSearchEmpty" class="ob-search-empty" hidden>
          <span>${icons.search}</span>
          <b>一致するものがありません</b>
          <p>言葉を短くするか、キャンプ場・場所検索も確認してください。</p>
        </div>
      </section>

      <button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer" aria-label="このアプリについて">© 2026 OUTBASE</button>
      <div class="ob-search-nav-reserve" aria-hidden="true"></div>
    </section>`;
  }

  function bindSearch(main,search){
    const root=main.querySelector('[data-ob-search-root]');
    if(!root)return;

    const rows=normalizeRows(search);
    const input=root.querySelector('#outbaseSearchInput');
    const clear=root.querySelector('#outbaseSearchClear');
    const results=root.querySelector('#outbaseSearchResults');
    const empty=root.querySelector('#outbaseSearchEmpty');
    const count=root.querySelector('#outbaseSearchResultCount');
    const title=root.querySelector('#outbaseSearchResultTitle');
    let kind='all';

    const render=()=>{
      const query=lower(input?.value||'');
      const filtered=rows.filter(row=>
        (kind==='all'||row.kind===kind)&&
        (!query||row.text.includes(query)||lower(row.title).includes(query)||lower(row.sub).includes(query))
      );
      const visible=query||kind!=='all'?filtered:filtered.slice(0,10);
      results.innerHTML=visible.map(resultMarkup).join('');
      empty.hidden=visible.length>0;
      count.textContent=`${filtered.length}件`;
      title.textContent=query?'検索結果':kind==='all'?'最近とこれから':{
        plan:'予定',memory:'思い出',asset:'持ち物'
      }[kind];
      clear.hidden=!query;
    };

    input?.addEventListener('input',render);
    input?.addEventListener('keydown',event=>{
      if(event.key==='Escape'){input.value='';render();input.blur();}
    });
    clear?.addEventListener('click',()=>{input.value='';render();input.focus();});

    root.querySelectorAll('[data-search-kind]').forEach(button=>button.addEventListener('click',()=>{
      kind=button.dataset.searchKind;
      root.querySelectorAll('[data-search-kind]').forEach(x=>x.classList.toggle('active',x===button));
      render();
    }));

    root.querySelector('[data-search-place]')?.addEventListener('click',()=>{
      (globalThis.OUTBASE_LEGACY_UI_V165||globalThis.OUTBASE_LEGACY_UI_V164)?.openSearch?.();
    });

    root.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ABOUT?.open?.();
    });

    render();
  }

  const renderer=Object.freeze({
    ...rendererBase,
    __searchV11:true,
    async mount(root,options={}){
      const value=await rendererBase.mount(root,options);
      if(value?.route?.name==='search'){
        const shell=root?.querySelector?.('.ob3-shell');
        const main=shell?.querySelector?.('.ob3-main');
        if(main){
          main.classList.remove('ob3-main-calendar');
          main.innerHTML=searchMarkup(value.search);
          bindSearch(main,value.search);
        }
      }
      return value;
    },
    updateNav(root,value){
      rendererBase.updateNav?.(root,value);
    }
  });

  globalThis.OUTBASE_SHELL_MODEL_V166=model;
  globalThis.OUTBASE_SHELL_MODEL_V165=model;
  globalThis.OUTBASE_SHELL_MODEL_V164=model;
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
