(() => {
  'use strict';
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const token=value=>String(value??'activity').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,48)||'activity';
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
  function initials(name){const text=String(name||'・').trim();return esc(text.slice(0,1)||'・');}
  function participantRows(item){return item?.participants?.rows||[];}
  function people(item){
    const rows=participantRows(item);
    if(!rows.length)return '<span class="ob4-participant-empty">参加者未設定</span>';
    return rows.slice(0,6).map(row=>`<span class="ob4-person ${row.type==='pet'?'pet':'member'}">${esc(row.name)}</span>`).join('')+(rows.length>6?`<span class="ob4-person more">＋${rows.length-6}</span>`:'');
  }
  function avatarStack(names=[]){
    const rows=names.slice(0,5).map((name,index)=>`<span class="ob6-avatar a${index}" aria-label="${esc(name)}">${initials(name)}</span>`).join('');
    return `<span class="ob6-avatars">${rows}${names.length>5?`<span class="ob6-avatar more">+${names.length-5}</span>`:''}</span>`;
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
  function storyRow(item){
    return `<a class="ob6-story-row" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><time>${esc(dateLabel(item.startAt,{weekday:false}))}</time><span><b>${esc(item.title)}</b><small>${Number(item.recordCount||0)}件の記録${item.mediaCount?`・${Number(item.mediaCount)}件の写真/動画`:''}</small></span>${icons.arrow}</a>`;
  }
  function emptyNow(){return `<div class="ob6-now-line"><div><b>今は活動していません</b><p>必要な時だけ記録を開始します。</p></div><button class="ob6-primary" data-ob3-action="start">活動を始める</button></div>`;}
  function currentLine(item){
    return `<article class="ob6-current-line" data-activity-id="${esc(item.id)}" style="view-transition-name:ob-activity-${token(item.id)}"><div><small>${esc(item.typeLabel)}・${esc(item.stateLabel)}</small><h3>${esc(item.title)}</h3>${meta(item)}</div><div class="ob6-current-actions">${shellLink('activity',{activityId:item.id},'活動を見る','ob6-secondary')}<a class="ob6-primary" href="${esc(item.recordUrl)}">記録を開く</a></div></article>`;
  }
  function nextBand(item){
    const prep=item.preparation||{completed:0,total:0,progress:0};
    return `<article class="ob6-next-band" data-activity-id="${esc(item.id)}" style="view-transition-name:ob-activity-${token(item.id)}"><div class="ob6-next-top"><span>NEXT / ${esc(String(item.typeLabel||'ACTIVITY').toUpperCase())}</span><b>${esc(item.relativeDay)}</b></div><h3>${esc(item.title)}</h3>${meta(item)}<div class="ob6-prep"><b>準備 ${prep.completed}/${prep.total}</b><div class="ob4-progress-track"><i style="width:${Math.max(0,Math.min(100,Number(prep.progress)||0))}%"></i></div><span>${Number(prep.progress)||0}%</span></div><div class="ob6-next-actions">${shellLink('activity',{activityId:item.id},'活動を見る','ob6-secondary light')}<a class="ob6-primary brass" href="${esc(item.preparationUrl)}">準備する</a></div></article>`;
  }
  function family(model){
    const value=model.home.family;const names=value.names||[];
    return `<section class="ob6-family-line"><div><small>${esc(value.household.name)}</small><b>家族${value.memberCount}人・ペット${value.petCount}匹</b></div><button data-ob5-nav data-ob5-route="calendar" aria-label="家族とペットで絞り込む">${avatarStack(names)}<span>絞り込む</span></button></section>`;
  }
  function quick(model){
    return `<div class="ob6-command-strip">${model.home.quick.map(item=>`<button data-ob3-action="${esc(item.action)}"><span>${icons[item.icon]||icons.arrow}</span><b>${esc(item.label)}</b><small>${esc(item.hint)}</small></button>`).join('')}</div>`;
  }
  function home(model){
    const current=model.home.current||[],next=model.home.next||[],recent=model.home.recent||[];
    const nowHtml=current.length?current.slice(0,2).map(currentLine).join(''):emptyNow();
    const nextHtml=next.length?nextBand(next[0]):'<p class="ob3-empty">近い予定はまだありません。</p>';
    const following=next.slice(1,3).length?`<div class="ob6-following">${next.slice(1,3).map(storyRow).join('')}</div>`:'';
    const recentHtml=recent.length?recent.slice(0,4).map(storyRow).join(''):'<p class="ob3-empty">最近の思い出はまだありません。</p>';
    return `<section class="ob6-home-hero"><div><small>ACTIVITY STORY</small><h1>${esc(model.home.todayLabel)}</h1></div><button data-ob5-nav data-ob5-route="calendar" aria-label="カレンダーを開く">${icons.calendar}</button></section>${family(model)}<section class="ob6-section"><div class="ob6-section-title"><h2>今</h2></div>${nowHtml}</section><section class="ob6-section"><div class="ob6-section-title"><h2>次</h2><button data-ob5-nav data-ob5-route="calendar">${icons.calendar}<span>カレンダー</span></button></div>${nextHtml}${following}</section><section class="ob6-section"><div class="ob6-section-title"><h2>すぐ使う</h2></div>${quick(model)}</section><section class="ob6-section"><div class="ob6-section-title"><h2>最近</h2><button data-ob3-route="vault">すべて見る</button></div><div class="ob6-story-list">${recentHtml}</div></section>`;
  }
  function menuRow(title,sub,action,kind='route'){
    const data=kind==='legacy'?`data-ob3-legacy="${esc(action)}"`:`data-ob3-route="${esc(action)}"`;
    return `<button class="ob6-menu-row" ${data}><span><b>${esc(title)}</b><small>${esc(sub)}</small></span>${icons.arrow}</button>`;
  }
  function search(){return `<section class="ob6-page-hero"><small>DISCOVER</small><h1>探す</h1><p>次に行く場所と、これまでの記録を同じ入口から探します。</p></section><section class="ob6-line-menu">${menuRow('キャンプ場や候補を探す','場所・天気・過去の候補','search','legacy')}${menuRow('過去の記録から探す','思い出・写真・メモ','vault')}${menuRow('予定から探す','カレンダーと家族フィルタ','calendar')}</section>`;}
  function vault(model){
    const rows=model.vaultActivities.length?model.vaultActivities.map(storyRow).join(''):'<p class="ob3-empty">保存された思い出はまだありません。</p>';
    return `<section class="ob6-page-hero"><small>ARCHIVE</small><h1>保管庫</h1><p>思い出、記録、ギアを活動ストーリーとして保管します。</p></section><section class="ob6-metric-strip"><div><small>思い出</small><b>${model.vaultSummary.activityCount}</b></div><div><small>記録</small><b>${model.vaultSummary.recordCount}</b></div><div><small>持ち物</small><b>${model.vaultSummary.assetCount}</b></div></section><section class="ob6-section"><div class="ob6-section-title"><h2>活動ストーリー</h2><button data-ob3-legacy="vault">旧保管庫</button></div><div class="ob6-story-list">${rows}</div></section>`;
  }

  function recordLabel(record){const payload=record.payload||{};return String(payload.title||payload.memo||payload.text||payload.note||payload.transcript||record.type||'記録').trim().slice(0,90);}
  function stateIndex(state){if(['candidate','planned'].includes(state))return 0;if(state==='preparing')return 1;if(['active','paused'].includes(state))return 2;if(state==='organizing')return 3;return 4;}
  function storyRail(item){
    const labels=['予定','準備','実行','整理','思い出'];const current=stateIndex(item.state);
    return `<section class="ob6-story-rail"><div><small>ACTIVITY STORY</small><b>${esc(item.stateLabel)}</b></div><div class="ob6-rail">${labels.map((label,index)=>`<span class="${index<current?'done':index===current?'current':''}"><i></i><small>${label}</small></span>`).join('')}</div></section>`;
  }
  function detailLine(title,body,extra=''){return `<section class="ob6-detail-line"><h2>${esc(title)}</h2><div>${body}</div><span>${extra}</span></section>`;}
  function activityDetail(model){
    const result=model.detail;if(!result||result.status!=='ready'||!result.activity)return `<section class="ob6-detail-head">${shellLink('home',{},icons.back,'ob6-icon')}<div><small>ACTIVITY STORY</small><h1>活動が見つかりません</h1></div></section><p class="ob3-empty">指定された活動は削除されたか、まだ移行されていません。</p>`;
    const item=result.activity;const prep=item.preparation;
    const prepText=prep?`<b>${prep.completed}/${prep.total} 完了</b><p>未完了 ${prep.pending}件・進捗 ${prep.progress}%</p>`:'<p>準備項目はまだありません。</p>';
    const records=item.records.length?item.records.slice(0,4).map(row=>`<article class="ob6-timeline"><time>${esc(dateTimeLabel(row.occurredAt))}</time><span><b>${esc(recordLabel(row))}</b><small>${esc(row.type)}・${esc(row.visibility)}</small></span></article>`).join(''):'<p>記録はまだありません。</p>';
    const improvements=item.organization.improvements.length?item.organization.improvements.slice(0,4).map(row=>`<div class="ob6-improvement"><i class="${row.status==='completed'?'done':''}">${row.status==='completed'?icons.check:'・'}</i><span><b>${esc(row.title||row.summary||row.payload?.text||'改善項目')}</b><small>${esc(row.status||'open')}</small></span></div>`).join(''):'<p>次回改善はまだありません。</p>';
    const assetText=item.assets.length?item.assets.slice(0,6).map(row=>esc(row.name)).join('・'):'活動に紐づくギアはまだありません。';
    return `<section class="ob6-detail-head" style="view-transition-name:ob-activity-${token(item.id)}"><div class="ob6-detail-tools">${shellLink('home',{},icons.back,'ob6-icon')}${shellLink('calendar',{month:(item.startAt||'').slice(0,7)},icons.calendar,'ob6-icon')}</div><small>${esc(item.typeLabel)} / ${esc(item.stateLabel)}</small><h1>${esc(item.title)}</h1>${meta(item)}</section>${storyRail(item)}<section class="ob6-facts"><div><small>期間</small><b>${esc(dateRange(item))}</b></div><div><small>場所</small><b>${esc(item.place||'未設定')}</b></div><div><small>公開</small><b>${esc(item.visibilityLabel)}</b></div><div><small>参加者</small><b>${item.participants?.count||0}人/匹</b></div></section><section class="ob6-detail-list">${detailLine('参加者',`<div class="ob4-people large">${people(item)}</div>`,icons.arrow)}${detailLine('準備',prepText,`<a href="${esc(item.preparationUrl)}">開く</a>`)}${detailLine('記録',records,`<a href="${esc(item.recordUrl)}">開く</a>`)}${detailLine('整理・改善',`<div class="ob6-summary-line"><span>レビュー ${item.organization.reviewCount}件</span><span>未完了 ${item.organization.openImprovementCount}件</span></div>${improvements}`,icons.arrow)}${detailLine('思い出',`<div class="ob6-summary-line"><span>記録 ${item.recordCount}</span><span>写真 ${item.media.types.photo}</span><span>動画 ${item.media.types.video}</span></div><p>${assetText}</p><small>献立 ${item.mealCount}・買い物リスト ${item.shoppingListCount}</small>`,icons.arrow)}</section><div class="ob6-detail-actions"><a href="${esc(item.legacyDetailUrl)}">FIELD03で確認</a><a class="primary" href="${esc(item.recordUrl)}">記録を開く</a></div>`;
  }

  function filterChips(calendar){
    const rows=calendar.filters.rows||[];if(!rows.length)return '';
    return `<section class="ob6-filter-strip"><div><b>家族・ペット</b>${calendar.filters.selectedCount?`<a href="${esc(calendar.clearFilterUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(calendar.month)}">解除</a>`:''}</div><div>${rows.map(row=>`<button class="${row.selected?'selected':''}" data-ob5-filter="${esc(row.key)}" aria-pressed="${row.selected?'true':'false'}">${row.type==='pet'?'🐾 ':''}${esc(row.name)}</button>`).join('')}</div></section>`;
  }
  function calendar(model){
    const value=model.calendar;if(!value)return '<p class="ob3-empty">カレンダーを読み込めませんでした。</p>';
    const weekdays=['日','月','火','水','木','金','土'].map((label,index)=>`<div class="ob5-weekday w${index}">${label}</div>`).join('');
    const cells=value.days.map(day=>`<div class="ob5-day ${day.inMonth?'':'outside'} ${day.today?'today':''}"><time>${day.day}</time><div>${day.activities.slice(0,3).map(item=>`<a href="${esc(item.detailUrl)}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><i class="type-${esc(item.type)}"></i><span>${esc(item.title)}</span></a>`).join('')}${day.activityCount>3?`<small>ほか${day.activityCount-3}件</small>`:''}</div></div>`).join('');
    const agenda=value.activities.slice(0,8).map(item=>`<a class="ob6-agenda-row" href="${esc(item.detailUrl)}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}"><time>${esc(dateRange(item))}</time><span><b>${esc(item.title)}</b><small>${esc(item.typeLabel||'活動')}</small></span>${icons.arrow}</a>`).join('');
    return `<section class="ob6-calendar-head"><div class="ob6-detail-tools">${shellLink('home',{},icons.back,'ob6-icon')}<button data-ob3-action="plan-add" class="ob6-icon" aria-label="予定を追加">${icons.plus}</button></div><small>ACTIVITY CALENDAR</small><h1>${esc(value.label)}</h1></section>${filterChips(value)}<section class="ob6-calendar-sheet"><div class="ob6-calendar-nav"><a href="${esc(value.previousUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(value.previousMonth)}">${icons.back}<span>${esc(value.previousMonth)}</span></a><b>${value.activities.length}件</b><a href="${esc(value.nextUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(value.nextMonth)}"><span>${esc(value.nextMonth)}</span>${icons.arrow}</a></div><div class="ob5-calendar-grid">${weekdays}${cells}</div></section><section class="ob6-section"><div class="ob6-section-title"><h2>この月</h2><span>${value.activities.length}件</span></div><div class="ob6-agenda">${agenda||'<p class="ob3-empty">この月の活動はありません。</p>'}</div></section>`;
  }

  function nav(model){const homeActive=['home','activity','calendar'].includes(model.route.name);return `<nav class="ob3-nav" aria-label="メインメニュー"><button data-ob3-route="home" class="${homeActive?'active':''}">${icons.home}<span>ホーム</span></button><button data-ob3-route="search" class="${model.route.name==='search'?'active':''}">${icons.search}<span>探す</span></button><button class="ob3-central" data-ob3-central>${icons.plus}<span>追加</span></button><button data-ob3-route="vault" class="${model.route.name==='vault'?'active':''}">${icons.vault}<span>保管庫</span></button></nav>`;}
  function centralSheet(){return `<div class="ob3-backdrop" data-ob3-backdrop><section class="ob3-sheet" role="dialog" aria-modal="true" aria-label="追加する"><div class="ob3-sheet-handle"></div><div class="ob3-sheet-head"><div><small>QUICK ACTION</small><h2>何をする？</h2></div><button data-ob3-close aria-label="閉じる">×</button></div><div class="ob3-sheet-actions"><button data-ob3-action="start"><span>${icons.play}</span><div><b>活動を始める</b><small>散歩、キャンプ、ドライブ</small></div>${icons.arrow}</button><button data-ob3-action="memo"><span>${icons.memo}</span><div><b>メモを残す</b><small>気づきをすぐ記録</small></div>${icons.arrow}</button><button data-ob3-action="plan-add"><span>${icons.calendar}</span><div><b>予定を追加</b><small>カレンダーにつながる予定</small></div>${icons.arrow}</button></div></section></div>`;}
  function body(model){if(model.route.name==='search')return search(model);if(model.route.name==='vault')return vault(model);if(model.route.name==='activity')return activityDetail(model);if(model.route.name==='calendar')return calendar(model);return home(model);}
  function ensureShell(root,model){
    let shell=root.querySelector?.(':scope > .ob3-shell')||root.querySelector?.('.ob3-shell');
    if(shell)return shell;
    root.innerHTML=`<div class="ob3-shell ob6-north" data-ob6-route="${esc(model.route.name)}"><header class="ob3-header"><a href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('home'))}" data-ob3-route="home" class="ob3-brand"><span class="ob3-mark" aria-hidden="true"><i></i><i></i><i></i></span><b>OUTBASE</b></a><span class="ob3-network"></span></header><main class="ob3-main"></main>${nav(model)}<div id="outbaseShellModal"></div></div>`;
    return root.querySelector?.(':scope > .ob3-shell')||root.querySelector?.('.ob3-shell');
  }
  function updateNetwork(root,online=navigator.onLine){
    const target=root?.querySelector?.('.ob3-network');if(!target)return;
    target.classList.toggle('offline',!online);target.textContent=online?'接続中':'オフライン';
  }
  function updateNav(root,model){
    const activeHome=['home','activity','calendar'].includes(model.route.name);
    root.querySelectorAll?.('[data-ob3-route]').forEach(button=>{
      const route=button.dataset.ob3Route;
      const active=route==='home'?activeHome:route===model.route.name;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
  }
  async function mount(root,options={}){
    const model=await (globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164).build(options);
    const shell=ensureShell(root,model);
    shell.dataset.ob6Route=model.route.name;
    const main=shell.querySelector('.ob3-main');
    main.innerHTML=body(model);
    updateNetwork(shell,model.online);updateNav(shell,model);
    globalThis.OUTBASE_THEME_V166?.sync?.('shell-render');
    return model;
  }
  function showCentral(){const host=document.getElementById('outbaseShellModal');if(host)host.innerHTML=centralSheet();}
  function hideCentral(){const host=document.getElementById('outbaseShellModal');if(host)host.innerHTML='';}
  const api=Object.freeze({mount,showCentral,hideCentral,updateNetwork,updateNav,homeHtml:home,activityHtml:activityDetail,calendarHtml:calendar,storyRow,nextBand});
  globalThis.OUTBASE_SHELL_RENDERER_V166=api;
  globalThis.OUTBASE_SHELL_RENDERER_V165=api;
  globalThis.OUTBASE_SHELL_RENDERER_V164=api;
})();
