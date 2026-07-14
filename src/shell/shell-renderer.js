(() => {
  'use strict';
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const icons={
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    vault:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5V3h10v2M8 10h8"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>',
    people:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M16 5.5a3 3 0 0 1 0 5.5M17 14c2.4.5 3.7 2.2 4 5"/></svg>',
    record:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
    memo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    grid:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
  };

  function dateLabel(value,options={}){if(!value)return '日付未設定';const d=new Date(value);if(Number.isNaN(d.getTime()))return '日付未設定';return d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:options.weekday===false?undefined:'short'});}
  function dateTimeLabel(value){if(!value)return '日時未設定';const d=new Date(value);if(Number.isNaN(d.getTime()))return '日時未設定';return d.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
  function dateRange(item){const start=dateLabel(item.startAt);if(!item.endAt||dateLabel(item.endAt)===start)return start;return `${start}〜${dateLabel(item.endAt)}`;}
  function people(item){
    const rows=item.participants?.rows||[];
    if(!rows.length)return '<span class="ob4-participant-empty">参加者未設定</span>';
    return rows.slice(0,6).map(row=>`<span class="ob4-person ${row.type==='pet'?'pet':'member'}">${esc(row.name)}</span>`).join('')+(rows.length>6?`<span class="ob4-person more">＋${rows.length-6}</span>`:'');
  }
  function meta(item){
    const location=item.place?`<span>${icons.pin}${esc(item.place)}</span>`:'';
    return `<div class="ob4-meta"><span>${icons.calendar}${esc(dateRange(item))}</span>${location}</div><div class="ob4-people" aria-label="参加者">${icons.people}${people(item)}</div>`;
  }
  function progress(item){
    const value=item.preparation;if(!value)return '';
    return `<div class="ob4-progress"><div><span>準備</span><b>${value.completed}/${value.total}</b></div><div class="ob4-progress-track"><i style="width:${Math.max(0,Math.min(100,Number(value.progress)||0))}%"></i></div><small>${value.progress}%</small></div>`;
  }
  function shellLink(route,values={},label='開く',className='ob4-button'){
    const href=globalThis.OUTBASE_ROUTER.shellUrl(route,values);
    return `<a class="${className}" href="${esc(href)}" data-ob5-nav data-ob5-route="${esc(route)}"${values.activityId?` data-ob5-activity-id="${esc(values.activityId)}"`:''}${values.month?` data-ob5-month="${esc(values.month)}"`:''}>${label}</a>`;
  }
  function activityCard(item,mode='next'){
    const lead=mode==='now'?item.stateLabel:item.relativeDay;
    const detailLabel=mode==='recent'?'思い出を見る':'活動を見る';
    const primary=mode==='now'?`<a class="ob4-button primary" href="${esc(item.recordUrl)}" data-activity-id="${esc(item.id)}">記録を開く</a>`:mode==='next'?`<a class="ob4-button primary" href="${esc(item.preparationUrl)}" data-activity-id="${esc(item.id)}">準備する</a>`:'';
    const counts=mode==='recent'?`<div class="ob4-counts"><span>${icons.record}${item.recordCount}件の記録</span><span>${item.mediaCount}件の写真・動画</span></div>`:'';
    return `<article class="ob4-activity-card ${mode}"><div class="ob4-card-head"><span class="ob4-type">${esc(item.typeLabel)}</span><span class="ob4-lead">${esc(lead)}</span></div><h3>${esc(item.title)}</h3>${meta(item)}${progress(item)}${counts}<div class="ob4-card-actions">${shellLink('activity',{activityId:item.id},detailLabel)}${primary}</div></article>`;
  }
  function compactRow(item){return `<a class="ob3-row ob4-recent-row" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><span><b>${esc(item.title)}</b><small>${esc(dateRange(item))}・${Number(item.recordCount||0)}件の記録</small></span>${icons.arrow}</a>`;}
  function emptyNow(){return `<div class="ob4-empty-action"><div><b>今は活動していません</b><p>始める時だけ中央の追加から記録を開けます。</p></div><button data-ob3-action="start">活動を始める</button></div>`;}
  function family(model){const family=model.home.family;const names=family.names.slice(0,6).join('・');return `<div class="ob4-family-summary"><div><small>${esc(family.household.name)}</small><b>家族${family.memberCount}人・ペット${family.petCount}匹</b></div><p>${esc(names||'家族情報を登録できます')}${family.names.length>6?`・ほか${family.names.length-6}`:''}</p><button data-ob5-nav data-ob5-route="calendar">家族で絞る</button></div>`;}
  function quick(model){return `<div class="ob4-quick">${model.home.quick.map(item=>`<button data-ob3-action="${esc(item.action)}"><span class="ob4-quick-icon">${icons[item.icon]||icons.arrow}</span><span><b>${esc(item.label)}</b><small>${esc(item.hint)}</small></span></button>`).join('')}</div>`;}
  function home(model){
    const current=model.home.current||[],next=model.home.next||[],recent=model.home.recent||[];
    const nowHtml=current.length?current.map(item=>activityCard(item,'now')).join(''):emptyNow();
    const nextHtml=next.length?activityCard(next[0],'next')+(next.slice(1,3).length?`<div class="ob4-following">${next.slice(1,3).map(item=>compactRow(item)).join('')}</div>`:''):'<p class="ob3-empty">近い予定はまだありません。</p>';
    const recentHtml=recent.length?recent.slice(0,4).map(item=>compactRow(item)).join(''):'<p class="ob3-empty">最近の思い出はまだありません。</p>';
    return `<section class="ob4-home-lead"><div><small>ACTIVITY STORY</small><h1>${esc(model.home.todayLabel)}</h1></div><button data-ob5-nav data-ob5-route="calendar" aria-label="カレンダーを開く">${icons.calendar}</button></section>${family(model)}<section class="ob3-section"><div class="ob3-section-head"><h2>今</h2></div>${nowHtml}</section><section class="ob3-section"><div class="ob3-section-head"><h2>次</h2><button data-ob5-nav data-ob5-route="calendar">${icons.calendar}<span>カレンダー</span></button></div>${nextHtml}</section><section class="ob3-section"><div class="ob3-section-head"><h2>すぐ使う</h2></div>${quick(model)}</section><section class="ob3-section"><div class="ob3-section-head"><h2>最近</h2><button data-ob3-route="vault">すべて見る</button></div>${recentHtml}</section>`;
  }
  function search(){return `<section class="ob3-hero"><h1>探す</h1><p>次に行く場所や、これまでの記録を探します。</p></section><section class="ob3-section ob3-menu"><button data-ob3-legacy="search"><b>キャンプ場や候補を探す</b><small>場所・天気・過去の候補</small>${icons.arrow}</button><button data-ob3-route="vault"><b>過去の記録から探す</b><small>思い出・写真・メモ</small>${icons.arrow}</button><button data-ob5-nav data-ob5-route="calendar"><b>予定から探す</b><small>カレンダーと家族フィルタ</small>${icons.arrow}</button></section>`;}
  function vault(model){const rows=model.vaultActivities.length?model.vaultActivities.map(item=>compactRow(item)).join(''):'<p class="ob3-empty">保存された思い出はまだありません。</p>';return `<section class="ob3-hero"><h1>保管庫</h1><p>思い出、記録、ギアをまとめて確認します。</p></section><section class="ob3-summary"><div><b>${model.vaultSummary.activityCount}</b><span>思い出</span></div><div><b>${model.vaultSummary.recordCount}</b><span>記録</span></div><div><b>${model.vaultSummary.assetCount}</b><span>持ち物</span></div></section><section class="ob3-section"><div class="ob3-section-head"><h2>活動ストーリー</h2><button data-ob3-legacy="vault">旧保管庫</button></div>${rows}</section>`;}

  function recordLabel(record){const payload=record.payload||{};return String(payload.title||payload.memo||payload.text||payload.note||payload.transcript||record.type||'記録').trim().slice(0,90);}
  function detailSection(title,body,extra=''){return `<section class="ob5-detail-section"><div class="ob3-section-head"><h2>${esc(title)}</h2>${extra}</div>${body}</section>`;}
  function activityDetail(model){
    const result=model.detail;if(!result||result.status!=='ready'||!result.activity)return `<section class="ob5-page-head">${shellLink('home',{},icons.back,'ob5-back')}<div><small>ACTIVITY STORY</small><h1>活動が見つかりません</h1></div></section><p class="ob3-empty">指定された活動は削除されたか、まだ移行されていません。</p>`;
    const item=result.activity;
    const prep=item.preparation;
    const prepBody=prep?`<div class="ob5-progress-card"><div><b>${prep.completed}/${prep.total}</b><span>完了</span></div><div class="ob4-progress-track"><i style="width:${Math.max(0,Math.min(100,prep.progress||0))}%"></i></div><p>未完了 ${prep.pending}件</p></div>`:'<p class="ob3-empty">準備項目はまだありません。</p>';
    const records=item.records.length?item.records.slice(0,8).map(row=>`<article class="ob5-timeline"><time>${esc(dateTimeLabel(row.occurredAt))}</time><div><b>${esc(recordLabel(row))}</b><small>${esc(row.type)}・${esc(row.visibility)}</small></div></article>`).join(''):'<p class="ob3-empty">記録はまだありません。</p>';
    const improvements=item.organization.improvements.length?item.organization.improvements.map(row=>`<div class="ob5-line"><span class="ob5-status ${row.status==='completed'?'done':''}">${row.status==='completed'?icons.check:'・'}</span><div><b>${esc(row.title||row.summary||row.payload?.text||'改善項目')}</b><small>${esc(row.status||'open')}</small></div></div>`).join(''):'<p class="ob3-empty">次回改善はまだありません。</p>';
    const assets=item.assets.length?`<div class="ob5-tags">${item.assets.slice(0,10).map(row=>`<span>${esc(row.name)}</span>`).join('')}</div>`:'<p class="ob3-empty">活動に紐づくギアはまだありません。</p>';
    return `<section class="ob5-page-head">${shellLink('home',{},icons.back,'ob5-back')}<div><small>${esc(item.typeLabel)}・${esc(item.stateLabel)}</small><h1>${esc(item.title)}</h1></div>${shellLink('calendar',{month:(item.startAt||'').slice(0,7)},icons.calendar,'ob5-icon-link')}</section><article class="ob5-detail-hero">${meta(item)}<div class="ob5-visibility">${esc(item.visibilityLabel)}</div></article>${detailSection('参加者',`<div class="ob4-people large">${icons.people}${people(item)}</div>`)}${detailSection('予定',`<div class="ob5-facts"><div><small>期間</small><b>${esc(dateRange(item))}</b></div><div><small>場所</small><b>${esc(item.place||'未設定')}</b></div></div>`)}${detailSection('準備',prepBody,`<a href="${esc(item.preparationUrl)}">旧準備画面</a>`)}${detailSection('記録',records,`<a href="${esc(item.recordUrl)}">記録を開く</a>`)}${detailSection('整理・改善',`<div class="ob5-summary-row"><span>レビュー ${item.organization.reviewCount}件</span><span>未完了改善 ${item.organization.openImprovementCount}件</span></div>${improvements}`)}${detailSection('思い出',`<div class="ob3-summary"><div><b>${item.recordCount}</b><span>記録</span></div><div><b>${item.media.types.photo}</b><span>写真</span></div><div><b>${item.media.types.video}</b><span>動画</span></div></div>${assets}<div class="ob5-subcounts"><span>献立 ${item.mealCount}</span><span>買い物リスト ${item.shoppingListCount}</span></div>`)}<div class="ob5-detail-actions"><a href="${esc(item.legacyDetailUrl)}">FIELD03で確認</a><a class="primary" href="${esc(item.recordUrl)}">記録を開く</a></div>`;
  }

  function filterChips(calendar){
    const rows=calendar.filters.rows||[];
    if(!rows.length)return '';
    return `<div class="ob5-filter-block"><div><b>家族・ペット</b>${calendar.filters.selectedCount?`<a href="${esc(calendar.clearFilterUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(calendar.month)}">解除</a>`:''}</div><div class="ob5-filter-chips">${rows.map(row=>`<button class="${row.selected?'selected':''}" data-ob5-filter="${esc(row.key)}" aria-pressed="${row.selected?'true':'false'}">${row.type==='pet'?'🐾':''}${esc(row.name)}</button>`).join('')}</div></div>`;
  }
  function calendar(model){
    const value=model.calendar;if(!value)return '<p class="ob3-empty">カレンダーを読み込めませんでした。</p>';
    const weekdays=['日','月','火','水','木','金','土'].map((label,index)=>`<div class="ob5-weekday w${index}">${label}</div>`).join('');
    const cells=value.days.map(day=>`<div class="ob5-day ${day.inMonth?'':'outside'} ${day.today?'today':''}"><time>${day.day}</time><div>${day.activities.slice(0,3).map(item=>`<a href="${esc(item.detailUrl)}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><i class="type-${esc(item.type)}"></i><span>${esc(item.title)}</span></a>`).join('')}${day.activityCount>3?`<small>ほか${day.activityCount-3}件</small>`:''}</div></div>`).join('');
    return `<section class="ob5-page-head calendar">${shellLink('home',{},icons.back,'ob5-back')}<div><small>ACTIVITY CALENDAR</small><h1>${esc(value.label)}</h1></div><button data-ob3-action="plan-add" class="ob5-icon-link">${icons.plus}</button></section>${filterChips(value)}<section class="ob5-calendar"><div class="ob5-calendar-nav"><a href="${esc(value.previousUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(value.previousMonth)}">${icons.back}<span>${esc(value.previousMonth)}</span></a><b>${value.activities.length}件</b><a href="${esc(value.nextUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(value.nextMonth)}"><span>${esc(value.nextMonth)}</span>${icons.arrow}</a></div><div class="ob5-calendar-grid">${weekdays}${cells}</div></section>`;
  }

  function nav(model){const homeActive=['home','activity','calendar'].includes(model.route.name);return `<nav class="ob3-nav" aria-label="メインメニュー"><button data-ob3-route="home" class="${homeActive?'active':''}">${icons.home}<span>ホーム</span></button><button data-ob3-route="search" class="${model.route.name==='search'?'active':''}">${icons.search}<span>探す</span></button><button class="ob3-central" data-ob3-central>${icons.plus}<span>追加</span></button><button data-ob3-route="vault" class="${model.route.name==='vault'?'active':''}">${icons.vault}<span>保管庫</span></button></nav>`;}
  function centralSheet(){return `<div class="ob3-backdrop" data-ob3-backdrop><section class="ob3-sheet" role="dialog" aria-modal="true" aria-label="追加する"><div class="ob3-sheet-handle"></div><div class="ob3-sheet-head"><h2>何をする？</h2><button data-ob3-close aria-label="閉じる">×</button></div><div class="ob3-sheet-actions"><button data-ob3-action="start"><b>活動を始める</b><small>散歩、キャンプ、ドライブ</small></button><button data-ob3-action="memo"><b>メモを残す</b><small>写真や声より先に文字で残す</small></button><button data-ob3-action="plan-add"><b>予定を追加</b><small>カレンダーにつながる予定</small></button></div></section></div>`;}
  function body(model){if(model.route.name==='search')return search(model);if(model.route.name==='vault')return vault(model);if(model.route.name==='activity')return activityDetail(model);if(model.route.name==='calendar')return calendar(model);return home(model);}
  async function mount(root){
    const model=await (globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164).build();
    root.innerHTML=`<div class="ob3-shell"><header class="ob3-header"><a href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('home'))}" data-ob3-route="home" class="ob3-brand"><span class="ob3-mark" aria-hidden="true"><i></i><i></i><i></i></span><b>OUTBASE</b></a><span class="ob3-network ${model.online?'':'offline'}">${model.online?'接続中':'オフライン'}</span></header><main class="ob3-main">${body(model)}</main>${nav(model)}<div id="outbaseShellModal"></div></div>`;
    return model;
  }
  function showCentral(){const host=document.getElementById('outbaseShellModal');if(host)host.innerHTML=centralSheet();}
  function hideCentral(){const host=document.getElementById('outbaseShellModal');if(host)host.innerHTML='';}
  const api=Object.freeze({mount,showCentral,hideCentral,homeHtml:home,activityHtml:activityDetail,calendarHtml:calendar,activityCard});
  globalThis.OUTBASE_SHELL_RENDERER_V165=api;
  globalThis.OUTBASE_SHELL_RENDERER_V164=api;
})();
