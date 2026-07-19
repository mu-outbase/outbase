(() => {
  'use strict';

  const modelBase=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
  const rendererBase=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
  if(!modelBase||!rendererBase)throw new Error('OUTBASE vault dependencies are not ready');
  if(modelBase.__vaultV13&&rendererBase.__vaultV13)return;

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const icons={
    camp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 19 8-14 8 14M7 19h10M9.2 14.5h5.6"/></svg>',
    walk:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m10 8 3-1 2.5 3.5M12 7l-2 5-3 3M12 12l3 3 1 5M9 13l1 7"/></svg>',
    activity:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h7"/></svg>',
    record:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h6M8 17h5"/></svg>',
    photo:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>',
    audio:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>',
    gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
  };

  const routeUrl=(name,params={})=>{try{return globalThis.OUTBASE_ROUTER.shellUrl(name,params);}catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}};
  const activityUrl=id=>routeUrl('activity',{activityId:id});
  function legacyGearUrl(id=''){
    const next=new URL(location.href);next.search='';next.hash='';next.searchParams.set('tab','prep');next.searchParams.set('outbaseVault','gear');if(id)next.searchParams.set('gearId',id);return next.href;
  }
  const dateObject=value=>{const date=new Date(value||'');return Number.isNaN(date.getTime())?null:date;};
  const shortDate=value=>{const date=dateObject(value);return date?`${date.getMonth()+1}/${date.getDate()}（${'日月火水木金土'[date.getDay()]}）`:'日付未設定';};
  const dateRange=item=>{const start=shortDate(item?.startAt);if(!item?.endAt||String(item.startAt||'').slice(0,10)===String(item.endAt||'').slice(0,10))return start;return `${start}〜${shortDate(item.endAt)}`;};
  const activityIcon=item=>{const text=`${item?.type||''} ${item?.typeLabel||''}`.toLowerCase();if(text.includes('camp')||text.includes('キャンプ'))return icons.camp;if(text.includes('walk')||text.includes('散歩'))return icons.walk;return icons.activity;};
  const recordIcon=record=>{const type=String(record?.type||'').toLowerCase();if(type.includes('photo')||type.includes('image')||type.includes('video'))return icons.photo;if(type.includes('audio')||type.includes('voice'))return icons.audio;return icons.record;};
  function recordTitle(record){const payload=record?.payload||{};return String(payload.title||payload.memo||payload.text||payload.note||payload.transcript||payload.caption||record?.type||'記録').trim().slice(0,90)||'記録';}
  function recordTypeLabel(record){const type=String(record?.type||'記録').toLowerCase();if(type.includes('photo')||type.includes('image'))return '写真';if(type.includes('video'))return '動画';if(type.includes('audio')||type.includes('voice'))return '音声';if(type.includes('memo')||type.includes('text')||type.includes('note'))return 'メモ';return '記録';}
  function assetCategory(asset){const payload=asset?.payload||{};return String(payload.category||payload.typeLabel||asset?.type||'持ち物');}
  function assetSub(asset){const payload=asset?.payload||{};return [payload.brand,payload.model,payload.storage].filter(Boolean).map(String).join('・')||String(asset?.status||'登録済み');}

  const model=Object.freeze({...modelBase,__vaultV13:true,async build(options={}){const value=await modelBase.build(options);if(value?.route?.name!=='vault')return value;const vaultV13=await globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162.build({activityLimit:60,recordLimit:80,assetLimit:120});return Object.freeze({...value,vaultV13});}});

  function latestMarkup(item){
    if(!item)return `<section class="ob13-vault-latest empty"><span>${icons.activity}</span><div><b>活動ストーリーはまだありません</b><p>活動を終了して整理すると、ここに残ります。</p></div></section>`;
    return `<a class="ob13-vault-latest" href="${esc(activityUrl(item.id))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><span class="ob13-vault-latest-icon">${activityIcon(item)}</span><span><small>最近の活動</small><b>${esc(item.title||'名称未設定')}</b><em>${esc(dateRange(item))}・記録 ${Number(item.recordCount||0)}件</em></span>${icons.arrow}</a>`;
  }
  function activityRow(item){
    const badges=[];if(Number(item.mediaCount||0))badges.push(`写真・動画 ${Number(item.mediaCount)}件`);if(Number(item.reviewCount||0))badges.push(`レビュー ${Number(item.reviewCount)}件`);if(Number(item.openImprovementCount||0))badges.push(`改善 ${Number(item.openImprovementCount)}件`);
    return `<a class="ob13-vault-row activity" href="${esc(activityUrl(item.id))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><span class="ob13-vault-row-icon">${activityIcon(item)}</span><span class="ob13-vault-row-copy"><small>${esc(dateRange(item))}・${esc(item.typeLabel||'活動')}</small><b>${esc(item.title||'名称未設定')}</b><em>${esc(item.place||`${Number(item.recordCount||0)}件の記録`)}</em>${badges.length?`<span class="ob13-vault-badges">${badges.map(label=>`<i>${esc(label)}</i>`).join('')}</span>`:''}</span>${icons.arrow}</a>`;
  }
  function recordRow(record,activityMap){
    const activity=activityMap.get(record.activityId);const href=activity?activityUrl(activity.id):routeUrl('vault');
    return `<a class="ob13-vault-row record" href="${esc(href)}" ${activity?`data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(activity.id)}"`:''}><span class="ob13-vault-row-icon">${recordIcon(record)}</span><span class="ob13-vault-row-copy"><small>${esc(shortDate(record.occurredAt))}・${esc(recordTypeLabel(record))}</small><b>${esc(recordTitle(record))}</b><em>${esc(activity?.title||'活動未設定')}</em></span>${icons.arrow}</a>`;
  }
  function assetRow(asset){return `<a class="ob13-vault-row asset" href="${esc(legacyGearUrl(asset.id))}"><span class="ob13-vault-row-icon">${icons.gear}</span><span class="ob13-vault-row-copy"><small>${esc(assetCategory(asset))}</small><b>${esc(asset.name||'名称未設定')}</b><em>${esc(assetSub(asset))}</em></span>${icons.arrow}</a>`;}
  function panelMarkup(id,title,count,body,action=''){return `<section class="ob13-vault-panel" data-vault-panel="${esc(id)}"><div class="ob13-vault-section-head"><div><h2>${esc(title)}</h2></div><span>${Number(count||0)}件</span></div>${action}<div class="ob13-vault-list">${body||`<div class="ob13-vault-empty"><b>まだありません</b><p>追加・記録した内容がここへ整理されます。</p></div>`}</div></section>`;}

  function vaultMarkup(vault){
    const summary=vault?.summary||{},activities=vault?.activities||[],records=vault?.records||[],assets=vault?.assets||[];const activityMap=new Map(activities.map(item=>[item.id,item]));
    const gearAction=`<a class="ob13-vault-ledger" href="${esc(legacyGearUrl())}"><span>${icons.gear}</span><span><b>共通台帳を開く</b><small>ギア・消耗品・保管場所を整理</small></span>${icons.arrow}</a>`;
    return `<section class="ob13-vault"><header class="ob13-vault-hero"><h1>保管庫</h1><p>残した記録を、活動・記録・持ち物から振り返ります。</p></header>${latestMarkup(activities[0]||null)}<section class="ob13-vault-metrics"><button type="button" data-vault-tab="activity"><small>活動</small><b>${Number(summary.activityCount||0)}</b></button><button type="button" data-vault-tab="record"><small>記録</small><b>${Number(summary.recordCount||0)}</b></button><button type="button" data-vault-tab="asset"><small>持ち物</small><b>${Number(summary.assetCount||0)}</b></button></section><nav class="ob13-vault-tabs" aria-label="保管庫の表示"><button type="button" data-vault-tab="activity">活動</button><button type="button" data-vault-tab="record">記録</button><button type="button" data-vault-tab="asset">持ち物</button></nav>${panelMarkup('activity','活動ストーリー',summary.activityCount,activities.map(activityRow).join(''))}${panelMarkup('record','最近の記録',summary.recordCount,records.map(row=>recordRow(row,activityMap)).join(''))}${panelMarkup('asset','持ち物',summary.assetCount,assets.map(assetRow).join(''),gearAction)}<button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer" aria-label="このアプリについて">© 2026 OUTBASE</button><div class="ob13-vault-nav-reserve" aria-hidden="true"></div></section>`;
  }

  function bindVault(main){
    const root=main.querySelector('.ob13-vault');if(!root)return;const key='outbase_vault_tab_v13';let active=localStorage.getItem(key)||'activity';if(!['activity','record','asset'].includes(active))active='activity';
    const apply=tab=>{active=tab;localStorage.setItem(key,tab);root.querySelectorAll('[data-vault-tab]').forEach(button=>button.classList.toggle('active',button.dataset.vaultTab===tab));root.querySelectorAll('[data-vault-panel]').forEach(panel=>{panel.hidden=panel.dataset.vaultPanel!==tab;});};
    root.querySelectorAll('[data-vault-tab]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.vaultTab)));root.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>globalThis.OUTBASE_ABOUT?.open?.());apply(active);
  }

  const renderer=Object.freeze({...rendererBase,__vaultV13:true,async mount(root,options={}){const value=await rendererBase.mount(root,options);if(value?.route?.name==='vault'){const main=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');if(main){main.classList.remove('ob3-main-calendar');main.innerHTML=vaultMarkup(value.vaultV13);bindVault(main);}}return value;},updateNav(root,value){rendererBase.updateNav?.(root,value);}});
  globalThis.OUTBASE_SHELL_MODEL_V166=model;globalThis.OUTBASE_SHELL_MODEL_V165=model;globalThis.OUTBASE_SHELL_MODEL_V164=model;globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;

  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function waitFor(selector,timeout=5000){const started=Date.now();while(Date.now()-started<timeout){const node=document.querySelector(selector);if(node)return node;await delay(80);}return null;}
  async function openLegacyGear(){
    const query=new URLSearchParams(location.search);if(query.get('outbaseVault')!=='gear')return;const gearId=query.get('gearId')||'';const clean=()=>{const next=new URL(location.href);next.searchParams.delete('outbaseVault');next.searchParams.delete('gearId');history.replaceState(history.state,'',next.href);};
    try{const manager=await waitFor('[data-open-gear-manager]');if(!manager){clean();return;}manager.click();(await waitFor('[data-library-tab="gear"]'))?.click();(await waitFor('[data-library-gear-view="items"]'))?.click();if(gearId){(await waitFor(`[data-library-edit="gear"][data-library-id="${CSS.escape(gearId)}"]`,2500))?.click();}clean();}catch(_error){clean();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openLegacyGear,{once:true});else openLegacyGear();
})();
