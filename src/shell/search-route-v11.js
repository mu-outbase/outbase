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
  if(modelBase.__searchV15&&rendererBase.__searchV15)return;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const token=value=>String(value??'default')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g,'-')
    .slice(0,32)||'default';

  const lower=value=>{
    let text=String(value??'');
    try{text=text.normalize('NFKC');}catch(_error){}
    return text.toLowerCase().replace(/[　\s]+/g,' ').trim();
  };
  const ui=globalThis.OUTBASE_UI_V21;
  if(!ui)throw new Error('OUTBASE UI v21 is not ready');
  const icons=ui.icons;
  const SEARCH_CACHE_TTL_MS=60000;
  let searchCache=null;
  let searchJob=null;

  const routeUrl=(name,params={})=>{
    try{return globalThis.OUTBASE_ROUTER.shellUrl(name,params);}
    catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}
  };

  const vaultUrl=tab=>routeUrl('vault',{vaultTab:tab});
  const assetsUrl=(id='')=>routeUrl('assets',id?{assetId:id}:{});

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

  async function buildSearchPayload({force=false}={}){
    if(!force&&searchCache&&Date.now()-searchCache.createdAt<SEARCH_CACHE_TTL_MS)return searchCache.value;
    if(!force&&searchJob)return searchJob;
    const homeApi=globalThis.OUTBASE_HOME_SCREEN_MODEL_V164;
    const vaultApi=globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162;
    searchJob=Promise.all([
      homeApi?.build?.().catch?.(()=>null)??null,
      vaultApi?.build?.({activityLimit:24,recordLimit:16,assetLimit:24}).catch?.(()=>null)??null
    ]).then(([home,vault])=>Object.freeze({
      plans:Array.isArray(home?.next)?home.next.slice(0,24):[],
      activities:Array.isArray(vault?.activities)?vault.activities.slice(0,24):[],
      assets:Array.isArray(vault?.assets)?vault.assets.slice(0,24):[]
    })).then(value=>{searchCache={value,createdAt:Date.now()};return value;}).finally(()=>{searchJob=null;});
    return searchJob;
  }

  const model=Object.freeze({
    ...modelBase,
    __searchV15:true,
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
      activityId:item.id||'',
      kind:'plan',
      kindLabel:'予定',
      title:item.title||'名称未設定の予定',
      sub:item.place||item.typeLabel||'場所未設定',
      meta:rangeLabel(item),
      href:item.detailUrl||routeUrl('activity',{activityId:item.id}),
      coverVariant:item.coverVariant||item.type||'default',
      typeLabel:item.typeLabel||'予定',
      text:lower([item.title,item.place,item.typeLabel,item.stateLabel,(item.participants?.rows||[]).map(x=>x.name).join(' ')].join(' '))
    }));

    const activities=(search?.activities||[]).map(item=>({
      key:`memory:${item.id||item.title}`,
      activityId:item.id||'',
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
      href:assetsUrl(item.id),
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
    return `<a class="ob-search-result tone-${esc(row.kind)}" href="${esc(row.href)}"${row.activityId?` data-ob-search-activity-id="${esc(row.activityId)}"`:''}>
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

  function planCover(row){
    const known=new Set(['lake','group','sea','festival','autumn']);
    const direct=token(row.coverVariant);
    if(known.has(direct))return direct;

    const hint=lower([
      row.title,
      row.sub,
      row.typeLabel,
      row.coverVariant
    ].join(' '));

    if(/海|海辺|海岸|ドライブ|sea|ocean/.test(hint))return 'sea';
    if(/湖|湖畔|lake/.test(hint))return 'lake';
    if(/公園|散歩|紅葉|walk|park|autumn/.test(hint))return 'autumn';
    if(/祭|イベント|発売|festival|event/.test(hint))return 'festival';
    return 'group';
  }

  function planPreview(row){
    return `<a class="ob15-search-plan cover-${planCover(row)}" href="${esc(row.href)}"${row.activityId?` data-ob-search-activity-id="${esc(row.activityId)}"`:''}>
      <span class="ob15-search-plan-cover">
        <i>${esc(row.typeLabel)}</i>
      </span>
      <span class="ob15-search-plan-copy">
        <b>${esc(row.title)}</b>
        <small>${esc(row.meta)}</small>
        <em>${esc(row.sub)}</em>
      </span>
    </a>`;
  }

  function memoryPreview(row){
    return `<a class="ob15-search-memory" href="${esc(row.href)}"${row.activityId?` data-ob-search-activity-id="${esc(row.activityId)}"`:''}>
      <span>${icons.memory}</span>
      <span><small>${esc(row.meta||'思い出')}</small><b>${esc(row.title)}</b><em>${esc(row.sub)}</em></span>
      ${icons.arrow}
    </a>`;
  }

  function assetPreview(row){
    return `<a class="ob15-search-asset" href="${esc(row.href)}">
      <span>${icons.gear}</span>
      <span><b>${esc(row.title)}</b><small>${esc(row.sub)}</small></span>
    </a>`;
  }

  function emptyPreview(label){
    return `<div class="ob15-search-preview-empty">${esc(label)}はまだありません。</div>`;
  }

  function browseMarkup(search){
    const rows=normalizeRows(search);
    const plans=rows.filter(row=>row.kind==='plan').slice(0,3);
    const memories=rows.filter(row=>row.kind==='memory').slice(0,3);
    const assets=rows.filter(row=>row.kind==='asset').slice(0,4);

    return `<section class="ob15-search-browse" id="outbaseSearchBrowse">
      <section class="ob15-search-group">
        <div class="ob15-search-group-head">
          <h2>これからの予定</h2>
          <a href="${esc(routeUrl('calendar'))}">カレンダー <span>›</span></a>
        </div>
        <div class="ob15-search-plan-strip">
          ${plans.length?plans.map(planPreview).join(''):emptyPreview('予定')}
        </div>
      </section>

      <section class="ob15-search-group">
        <div class="ob15-search-group-head">
          <h2>最近の思い出</h2>
          <button type="button" data-search-preview-kind="memory">すべて見る <span>›</span></button>
        </div>
        <div class="ob15-search-memory-list">
          ${memories.length?memories.map(memoryPreview).join(''):emptyPreview('思い出')}
        </div>
      </section>

      <section class="ob15-search-group">
        <div class="ob15-search-group-head">
          <h2>登録した持ち物</h2>
          <a href="${esc(assetsUrl())}">持ち物 <span>›</span></a>
        </div>
        <div class="ob15-search-asset-grid">
          ${assets.length?assets.map(assetPreview).join(''):emptyPreview('持ち物')}
        </div>
      </section>
    </section>`;
  }

  function searchMarkup(search){
    return `<section class="ob-search-v11 ob15-search" data-ob-search-root>
      <header class="ob-search-hero">
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

      <section class="ob-search-actions" id="outbaseSearchActions">
        <button type="button" data-search-place>
          <span>${icons.pin}</span>
          <span><b>キャンプ場・場所を探す</b><small>候補、天気、保存した場所</small></span>
          ${icons.arrow}
        </button>
        <a href="${esc(vaultUrl('activity'))}">
          <span>${icons.memory}</span>
          <span><b>保管庫から探す</b><small>写真、記録、活動ストーリー</small></span>
          ${icons.arrow}
        </a>
      </section>

      ${browseMarkup(search)}

      <section class="ob-search-result-section" id="outbaseSearchResultSection" hidden>
        <div class="ob-search-result-head">
          <h2 id="outbaseSearchResultTitle">検索結果</h2>
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
    const browse=root.querySelector('#outbaseSearchBrowse');
    const actions=root.querySelector('#outbaseSearchActions');
    const resultSection=root.querySelector('#outbaseSearchResultSection');
    const results=root.querySelector('#outbaseSearchResults');
    const empty=root.querySelector('#outbaseSearchEmpty');
    const count=root.querySelector('#outbaseSearchResultCount');
    const title=root.querySelector('#outbaseSearchResultTitle');
    let kind='all';

    const setKind=value=>{
      kind=value;
      root.querySelectorAll('[data-search-kind]').forEach(button=>{
        button.classList.toggle('active',button.dataset.searchKind===kind);
      });
    };

    const render=()=>{
      const query=lower(input?.value||'');
      const resultMode=Boolean(query)||kind!=='all';
      const filtered=rows.filter(row=>
        (kind==='all'||row.kind===kind)&&
        (!query||row.text.includes(query)||lower(row.title).includes(query)||lower(row.sub).includes(query))
      );

      browse.hidden=resultMode;
      actions.hidden=resultMode;
      resultSection.hidden=!resultMode;
      clear.hidden=!query;

      if(!resultMode)return;

      results.innerHTML=filtered.map(resultMarkup).join('');
      empty.hidden=filtered.length>0;
      count.textContent=`${filtered.length}件`;
      title.textContent=query?'検索結果':{
        plan:'予定',memory:'思い出',asset:'持ち物'
      }[kind]||'検索結果';
    };

    input?.addEventListener('input',render);
    input?.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        input.value='';
        setKind('all');
        render();
        input.blur();
      }
    });

    clear?.addEventListener('click',()=>{
      input.value='';
      setKind('all');
      render();
      input.focus();
    });

    root.querySelectorAll('[data-search-kind]').forEach(button=>button.addEventListener('click',()=>{
      setKind(button.dataset.searchKind);
      render();
    }));

    root.querySelectorAll('[data-search-preview-kind]').forEach(button=>button.addEventListener('click',()=>{
      setKind(button.dataset.searchPreviewKind);
      render();
      root.querySelector('.ob-search-box')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));

    root.querySelector('[data-search-place]')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ROUTER?.navigate?.('places',{returnShell:'search'}, {transition:false,skipTransition:true});
    });

    root.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ABOUT?.open?.();
    });

    const warmActivity=id=>{
      if(!id)return;
      const modelApi=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
      Promise.resolve(modelApi?.preload?.('activity',{activityId:id})).then(payload=>{if(payload?.detail)globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.prime?.(payload);}).catch(()=>{});
    };
    root.addEventListener('pointerdown',event=>warmActivity(event.target.closest?.('[data-ob-search-activity-id]')?.dataset?.obSearchActivityId),{passive:true});
    const warmVisible=()=>root.querySelectorAll('[data-ob-search-activity-id]').forEach((link,index)=>{if(index<5)warmActivity(link.dataset.obSearchActivityId);});
    if(typeof requestIdleCallback==='function')requestIdleCallback(warmVisible,{timeout:900});else setTimeout(warmVisible,80);
    const prefetch=globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.prefetch;if(prefetch){const run=()=>prefetch(['places','assets']);if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1000});else setTimeout(run,120);}

    render();
  }

  const renderer=Object.freeze({
    ...rendererBase,
    __searchV15:true,
    async mount(root,options={}){
      const requested=globalThis.OUTBASE_ROUTER?.current?.();
      const beforeMain=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      if(requested?.name==='search'&&beforeMain){beforeMain.classList.remove('ob3-main-calendar');beforeMain.innerHTML='<section class="ob-search-v11 ob15-search"><header class="ob-search-hero"><h1>探す</h1><p>予定、思い出、持ち物を読み込んでいます。</p></header><section class="ob22-card"><div class="ob22-loading-inline"><span></span><b>検索できる内容を準備しています</b></div></section></section>';}
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
  globalThis.OUTBASE_SEARCH_ROUTE_V11=Object.freeze({invalidate(){searchCache=null;searchJob=null;},preload(){return buildSearchPayload();}});
})();
