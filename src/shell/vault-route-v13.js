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

  if(!modelBase||!rendererBase)throw new Error('OUTBASE vault dependencies are not ready');
  if(modelBase.__vaultV15&&rendererBase.__vaultV15)return;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
  const ui=globalThis.OUTBASE_UI_V21;
  if(!ui)throw new Error('OUTBASE UI v21 is not ready');
  const icons=ui.icons;

  const routeUrl=(name,params={})=>{
    try{return globalThis.OUTBASE_ROUTER.shellUrl(name,params);}
    catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}
  };

  const activityUrl=id=>routeUrl('activity',{activityId:id});

  function legacyGearUrl(id=''){
    return routeUrl('assets',id?{assetId:id}:{});
  }

  const dateObject=value=>{
    const date=new Date(value||'');
    return Number.isNaN(date.getTime())?null:date;
  };

  const shortDate=value=>{
    const date=dateObject(value);
    return date?`${date.getMonth()+1}/${date.getDate()}（${'日月火水木金土'[date.getDay()]}）`:'日付未設定';
  };

  const dateRange=item=>{
    const start=shortDate(item?.startAt);
    if(!item?.endAt||String(item.startAt||'').slice(0,10)===String(item.endAt||'').slice(0,10))return start;
    return `${start}〜${shortDate(item.endAt)}`;
  };

  const activityIcon=item=>{
    const text=`${item?.type||''} ${item?.typeLabel||''}`.toLowerCase();
    if(text.includes('camp')||text.includes('キャンプ'))return icons.camp;
    if(text.includes('walk')||text.includes('散歩'))return icons.walk;
    return icons.activity;
  };

  const recordIcon=record=>{
    const type=String(record?.type||'').toLowerCase();
    if(type.includes('photo')||type.includes('image')||type.includes('video'))return icons.photo;
    if(type.includes('audio')||type.includes('voice'))return icons.audio;
    return icons.record;
  };

  function recordTitle(record){
    const payload=record?.payload||{};
    return String(
      payload.title||
      payload.memo||
      payload.text||
      payload.note||
      payload.transcript||
      payload.caption||
      record?.type||
      '記録'
    ).trim().slice(0,90)||'記録';
  }

  function recordTypeLabel(record){
    const type=String(record?.type||'記録').toLowerCase();
    if(type.includes('photo')||type.includes('image'))return '写真';
    if(type.includes('video'))return '動画';
    if(type.includes('audio')||type.includes('voice'))return '音声';
    if(type.includes('memo')||type.includes('text')||type.includes('note'))return 'メモ';
    return '記録';
  }

  function assetCategory(asset){
    const payload=asset?.payload||{};
    return String(payload.category||payload.typeLabel||asset?.type||'持ち物');
  }

  function assetSub(asset){
    const payload=asset?.payload||{};
    return [payload.brand,payload.model,payload.storage]
      .filter(Boolean).map(String).join('・')||String(asset?.status||'登録済み');
  }

  const model=Object.freeze({
    ...modelBase,
    __vaultV15:true,
    async build(options={}){
      const value=await modelBase.build(options);
      if(value?.route?.name!=='vault')return value;
      const vaultV15=await globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162.build({
        activityLimit:60,
        recordLimit:80,
        assetLimit:120
      });
      return Object.freeze({...value,vaultV15});
    }
  });

  function featureActivity(item){
    if(!item)return `<section class="ob15-vault-feature empty">
      <span class="ob15-vault-feature-icon">${icons.activity}</span>
      <span><b>活動ストーリーはまだありません</b><small>活動を終了して整理すると、ここに残ります。</small></span>
    </section>`;

    return `<a class="ob15-vault-feature activity" href="${esc(activityUrl(item.id))}"
      data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}">
      <span class="ob15-vault-feature-icon">${activityIcon(item)}</span>
      <span class="ob15-vault-feature-copy">
        <small>最近の活動</small>
        <b>${esc(item.title||'名称未設定')}</b>
        <em>${esc(dateRange(item))}・記録 ${Number(item.recordCount||0)}件</em>
        <span class="ob15-vault-feature-tags">
          ${Number(item.mediaCount||0)?`<i>写真・動画 ${Number(item.mediaCount)}件</i>`:''}
          ${Number(item.openImprovementCount||0)?`<i>改善 ${Number(item.openImprovementCount)}件</i>`:''}
        </span>
      </span>
      ${icons.arrow}
    </a>`;
  }

  function featureRecord(record,activityMap){
    if(!record)return `<section class="ob15-vault-feature empty">
      <span class="ob15-vault-feature-icon">${icons.record}</span>
      <span><b>記録はまだありません</b><small>メモ・写真・音声を残すと、ここから振り返れます。</small></span>
    </section>`;

    const activity=activityMap.get(record.activityId);
    const href=activity?activityUrl(activity.id):routeUrl('vault');

    return `<a class="ob15-vault-feature record" href="${esc(href)}"
      ${activity?`data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(activity.id)}"`:''}>
      <span class="ob15-vault-feature-icon">${recordIcon(record)}</span>
      <span class="ob15-vault-feature-copy">
        <small>最近の${esc(recordTypeLabel(record))}</small>
        <b>${esc(recordTitle(record))}</b>
        <em>${esc(shortDate(record.occurredAt))}・${esc(activity?.title||'活動未設定')}</em>
      </span>
      ${icons.arrow}
    </a>`;
  }

  function featureAsset(){
    return `<a class="ob15-vault-feature asset" href="${esc(legacyGearUrl())}">
      <span class="ob15-vault-feature-icon">${icons.gear}</span>
      <span class="ob15-vault-feature-copy">
        <small>共通台帳</small>
        <b>持ち物を整理する</b>
        <em>ギア・消耗品・保管場所を確認</em>
      </span>
      ${icons.arrow}
    </a>`;
  }

  function activityRow(item,hidden=false){
    const badges=[];
    if(Number(item.mediaCount||0))badges.push(`写真・動画 ${Number(item.mediaCount)}件`);
    if(Number(item.reviewCount||0))badges.push(`レビュー ${Number(item.reviewCount)}件`);
    if(Number(item.openImprovementCount||0))badges.push(`改善 ${Number(item.openImprovementCount)}件`);

    return `<a class="ob13-vault-row activity${hidden?' ob15-vault-extra':''}" ${hidden?'hidden':''}
      href="${esc(activityUrl(item.id))}" data-ob5-nav data-ob5-route="activity"
      data-ob5-activity-id="${esc(item.id)}">
      <span class="ob13-vault-row-icon">${activityIcon(item)}</span>
      <span class="ob13-vault-row-copy">
        <small>${esc(dateRange(item))}・${esc(item.typeLabel||'活動')}</small>
        <b>${esc(item.title||'名称未設定')}</b>
        <em>${esc(item.place||`${Number(item.recordCount||0)}件の記録`)}</em>
        ${badges.length?`<span class="ob13-vault-badges">${badges.map(label=>`<i>${esc(label)}</i>`).join('')}</span>`:''}
      </span>
      ${icons.arrow}
    </a>`;
  }

  function recordRow(record,activityMap,hidden=false){
    const activity=activityMap.get(record.activityId);
    const href=activity?activityUrl(activity.id):routeUrl('vault');

    return `<a class="ob13-vault-row record${hidden?' ob15-vault-extra':''}" ${hidden?'hidden':''}
      href="${esc(href)}"
      ${activity?`data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(activity.id)}"`:''}>
      <span class="ob13-vault-row-icon">${recordIcon(record)}</span>
      <span class="ob13-vault-row-copy">
        <small>${esc(shortDate(record.occurredAt))}・${esc(recordTypeLabel(record))}</small>
        <b>${esc(recordTitle(record))}</b>
        <em>${esc(activity?.title||'活動未設定')}</em>
      </span>
      ${icons.arrow}
    </a>`;
  }

  function assetRow(asset,hidden=false){
    return `<a class="ob13-vault-row asset${hidden?' ob15-vault-extra':''}" ${hidden?'hidden':''}
      href="${esc(legacyGearUrl(asset.id))}">
      <span class="ob13-vault-row-icon">${icons.gear}</span>
      <span class="ob13-vault-row-copy">
        <small>${esc(assetCategory(asset))}</small>
        <b>${esc(asset.name||'名称未設定')}</b>
        <em>${esc(assetSub(asset))}</em>
      </span>
      ${icons.arrow}
    </a>`;
  }

  function expandButton(id,remaining){
    if(remaining<=0)return '';
    return `<button type="button" class="ob15-vault-expand" data-vault-expand="${esc(id)}">
      あと${remaining}件を見る
    </button>`;
  }

  function panelMarkup(id,title,feature,body,remaining){
    return `<section class="ob13-vault-panel" data-vault-panel="${esc(id)}">
      <div class="ob13-vault-section-head"><h2>${esc(title)}</h2></div>
      ${feature}
      <div class="ob13-vault-list">${body||`<div class="ob13-vault-empty"><b>まだありません</b><p>追加・記録した内容がここへ整理されます。</p></div>`}</div>
      ${expandButton(id,remaining)}
    </section>`;
  }

  function vaultMarkup(vault){
    const summary=vault?.summary||{};
    const activities=vault?.activities||[];
    const records=vault?.records||[];
    const assets=vault?.assets||[];
    const activityMap=new Map(activities.map(item=>[item.id,item]));

    const activityRest=activities.slice(1);
    const recordRest=records.slice(1);
    const activityVisible=4;
    const recordVisible=5;
    const assetVisible=8;

    const activityBody=activityRest
      .map((item,index)=>activityRow(item,index>=activityVisible))
      .join('');

    const recordBody=recordRest
      .map((item,index)=>recordRow(item,activityMap,index>=recordVisible))
      .join('');

    const assetBody=assets
      .map((item,index)=>assetRow(item,index>=assetVisible))
      .join('');

    return `<section class="ob13-vault ob15-vault">
      <header class="ob13-vault-hero">
        <h1>保管庫</h1>
        <p>残した記録を、活動・記録・持ち物から振り返ります。</p>
      </header>

      <nav class="ob13-vault-tabs ob15-vault-tabs" aria-label="保管庫の表示">
        <button type="button" data-vault-tab="activity"><span>活動</span><b>${Number(summary.activityCount||0)}</b></button>
        <button type="button" data-vault-tab="record"><span>記録</span><b>${Number(summary.recordCount||0)}</b></button>
        <button type="button" data-vault-tab="asset"><span>持ち物</span><b>${Number(summary.assetCount||0)}</b></button>
      </nav>

      ${panelMarkup(
        'activity',
        '活動ストーリー',
        featureActivity(activities[0]||null),
        activityBody,
        Math.max(0,activityRest.length-activityVisible)
      )}

      ${panelMarkup(
        'record',
        '最近の記録',
        featureRecord(records[0]||null,activityMap),
        recordBody,
        Math.max(0,recordRest.length-recordVisible)
      )}

      ${panelMarkup(
        'asset',
        '持ち物',
        featureAsset(),
        assetBody,
        Math.max(0,assets.length-assetVisible)
      )}

      <button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer"
        aria-label="このアプリについて">© 2026 OUTBASE</button>
      <div class="ob13-vault-nav-reserve" aria-hidden="true"></div>
    </section>`;
  }

  function bindVault(main){
    const root=main.querySelector('.ob15-vault');
    if(!root)return;

    const storageKey='outbase_vault_tab_v15';
    const queryTab=new URLSearchParams(location.search).get('vaultTab');
    let active=queryTab||localStorage.getItem(storageKey)||'activity';
    if(!['activity','record','asset'].includes(active))active='activity';

    const apply=tab=>{
      active=tab;
      localStorage.setItem(storageKey,tab);

      root.querySelectorAll('[data-vault-tab]').forEach(button=>{
        button.classList.toggle('active',button.dataset.vaultTab===tab);
      });

      root.querySelectorAll('[data-vault-panel]').forEach(panel=>{
        panel.hidden=panel.dataset.vaultPanel!==tab;
      });
    };

    root.querySelectorAll('[data-vault-tab]').forEach(button=>{
      button.addEventListener('click',()=>apply(button.dataset.vaultTab));
    });

    root.querySelectorAll('[data-vault-expand]').forEach(button=>{
      button.addEventListener('click',()=>{
        const panel=root.querySelector(`[data-vault-panel="${CSS.escape(button.dataset.vaultExpand)}"]`);
        panel?.querySelectorAll('.ob15-vault-extra[hidden]').forEach(row=>row.hidden=false);
        button.remove();
      });
    });

    root.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ABOUT?.open?.();
    });

    apply(active);
  }

  const renderer=Object.freeze({
    ...rendererBase,
    __vaultV15:true,
    async mount(root,options={}){
      const value=await rendererBase.mount(root,options);
      if(value?.route?.name==='vault'){
        const main=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
        if(main){
          main.classList.remove('ob3-main-calendar');
          main.innerHTML=vaultMarkup(value.vaultV15);
          bindVault(main);
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
