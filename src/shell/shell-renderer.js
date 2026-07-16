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
    camp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 19 8-14 8 14M7 19h10M9.2 14.5h5.6"/></svg>',
    walk:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m10 8 3-1 2.5 3.5M12 7l-2 5-3 3M12 12l3 3 1 5M9 13l1 7"/></svg>',
    drive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h16l-2-6H6zM4 14v4h2m14-4v4h-2M8 18h8"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/></svg>',
    event:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM8 4v6M16 4v6M4 11h16"/></svg>',
    other:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/></svg>',
    photo:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>',
    memory:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h7"/></svg>',
    gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    paw:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="8" cy="8" rx="2" ry="3"/><ellipse cx="16" cy="8" rx="2" ry="3"/><ellipse cx="5" cy="13" rx="2" ry="2.5"/><ellipse cx="19" cy="13" rx="2" ry="2.5"/><path d="M8 18c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 3s-4-1-4-3Z"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
  };

  function dateLabel(value,options={}){if(!value)return '日付未設定';const d=new Date(value);if(Number.isNaN(d.getTime()))return '日付未設定';return d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:options.weekday===false?undefined:'short'});}
  function dateTimeLabel(value){if(!value)return '日時未設定';const d=new Date(value);if(Number.isNaN(d.getTime()))return '日時未設定';return d.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
  function dateRange(item){const start=dateLabel(item.startAt);if(!item.endAt||dateLabel(item.endAt)===start)return start;return `${start}〜${dateLabel(item.endAt)}`;}
  function initials(name){const text=String(name||'・').trim();return esc(text.slice(0,1)||'・');}
  const previewUrls=new Map();
  const previewPromises=new Map();
  let previewObserver=null;
  function typeKey(item){const value=String(item?.type||'other');return ['camp','walk','drive','event','shopping'].includes(value)?value:'other';}
  function displayTypeKey(item){
    const title=String(item?.title||'').toLowerCase();
    if(/散歩|さんぽ|walk|ドッグウォーク|犬/.test(title))return 'walk';
    if(/キャンプ|camp|野営|テント|赤城山|鹿沼|白河|ふもとっぱら/.test(title))return 'camp';
    if(/ドライブ|drive|車中|道の駅/.test(title))return 'drive';
    if(/買い物|購入|発売|ショップ|shop|タンブラー|ギア/.test(title))return 'shopping';
    if(/イベント|event|祭|フェス|展示|講習/.test(title))return 'event';
    return typeKey(item);
  }
  function previewKey(item){return String(item?.previewMedia?.key||'').trim();}
  function sceneSvg(type){
    const scenes={
      camp:'<svg class="ob8-scene-svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 110" aria-hidden="true"><rect class="sky" width="160" height="110"/><circle class="sun" cx="126" cy="24" r="11"/><path class="ridge back" d="M0 69 34 42l24 18 31-35 28 31 18-13 25 24v43H0Z"/><path class="ridge front" d="M0 79 42 58l24 15 28-20 30 22 36-17v52H0Z"/><path class="tent" d="m53 91 21-34 23 34Z"/><path class="tent-line" d="M74 57v34M64 91l10-17 11 17"/><circle class="ember" cx="111" cy="89" r="4"/><path class="spark" d="m111 81 3-6m-8 7-4-5"/></svg>',
      walk:'<svg class="ob8-scene-svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 110" aria-hidden="true"><rect class="sky" width="160" height="110"/><circle class="sun" cx="126" cy="22" r="10"/><path class="ridge back" d="M0 61 28 39l24 18 32-31 30 27 19-13 27 21v49H0Z"/><path class="ground" d="M0 69c35-12 54-6 81 4 32 12 50 4 79-5v42H0Z"/><path class="trail" d="M91 110c-9-19-13-30-7-42 5-10 16-15 21-26"/><path class="tree" d="M25 82V51m-12 20 12-25 12 25m-8-8 8 16m92 12V58m-11 20 11-24 11 24"/><circle class="step" cx="91" cy="91" r="3"/><circle class="step" cx="88" cy="78" r="2.5"/></svg>',
      drive:'<svg class="ob8-scene-svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 110" aria-hidden="true"><rect class="sky" width="160" height="110"/><circle class="sun" cx="126" cy="22" r="10"/><path class="ridge back" d="M0 64 31 43l25 17 31-32 27 27 19-11 27 20v46H0Z"/><path class="ground" d="M0 70h160v40H0Z"/><path class="road" d="M64 110 78 65h19l23 45Z"/><path class="road-line" d="m91 72 4 13m3 10 5 15"/><path class="car" d="M47 82h32l-5-11H54l-7 11v10h5m27-10v10h-5"/><circle class="wheel" cx="56" cy="91" r="4"/><circle class="wheel" cx="70" cy="91" r="4"/></svg>',
      event:'<svg class="ob8-scene-svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 110" aria-hidden="true"><rect class="night" width="160" height="110"/><path class="lights" d="M8 23c38 16 91 16 144 0"/><circle class="bulb b1" cx="25" cy="29" r="4"/><circle class="bulb b2" cx="56" cy="37" r="4"/><circle class="bulb b3" cx="88" cy="38" r="4"/><circle class="bulb b4" cx="121" cy="31" r="4"/><path class="stage" d="M29 94h102V58H29Z"/><path class="stage-roof" d="m22 59 58-26 58 26Z"/><path class="crowd" d="M0 110V91c11-12 22-12 33 0 12-13 24-13 36 0 13-14 27-14 40 0 13-13 26-13 39 0 5-5 8-7 12-8v27Z"/></svg>',
      shopping:'<svg class="ob8-scene-svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 110" aria-hidden="true"><rect class="sky" width="160" height="110"/><rect class="shop" x="28" y="37" width="104" height="65" rx="4"/><path class="awning" d="M22 40h116l-9-21H31Z"/><path class="awning-line" d="m43 19-5 21m27-21-2 21m29-21 2 21m25-21 5 21"/><rect class="window" x="40" y="53" width="38" height="31"/><rect class="door" x="91" y="52" width="27" height="50"/><path class="bag" d="M50 96h24l-3-18H53Zm6-18c0-8 12-8 12 0"/></svg>',
      other:'<svg class="ob8-scene-svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 110" aria-hidden="true"><rect class="sky" width="160" height="110"/><circle class="sun" cx="126" cy="23" r="10"/><path class="ridge back" d="M0 66 34 43l25 18 28-31 29 27 18-13 26 22v44H0Z"/><path class="ground" d="M0 75c35-10 66-5 91 4 25 9 45 4 69-5v36H0Z"/><path class="trail" d="M62 110c7-18 17-26 31-31 12-4 19-11 24-23"/><circle class="waypoint" cx="116" cy="54" r="6"/><path class="waypoint-line" d="M116 60v12"/></svg>'
    };
    return scenes[type]||scenes.other;
  }
  function activityVisual(item,{className='ob7-thumb',label=true}={}){
    const type=displayTypeKey(item);const key=previewKey(item);const typeLabel=item?.typeLabel||({camp:'キャンプ',walk:'散歩',drive:'ドライブ',event:'イベント',shopping:'買い物'}[type]||'活動');
    return `<span class="${className} type-${esc(type)}" role="img" aria-label="${esc(typeLabel)}の情景"${key?` data-ob-media-key="${esc(key)}"`:''}><span class="ob7-visual-fallback ob8-scene">${sceneSvg(type)}${label?`<small>${esc(typeLabel)}</small>`:''}</span></span>`;
  }
  async function previewUrl(key){
    if(!key)return null;if(previewUrls.has(key))return previewUrls.get(key);if(previewPromises.has(key))return previewPromises.get(key);
    const task=(async()=>{try{const blob=await globalThis.OUTBASE_LEGACY_ADAPTER_V160?.getRecordBlob?.(key);if(!(blob instanceof Blob)||!String(blob.type||'').startsWith('image/'))return null;const url=URL.createObjectURL(blob);previewUrls.set(key,url);return url;}catch(_error){return null;}finally{previewPromises.delete(key);}})();
    previewPromises.set(key,task);return task;
  }
  async function loadPreview(element){
    if(!element||element.dataset.obMediaLoaded==='1')return;element.dataset.obMediaLoaded='1';const key=element.dataset.obMediaKey;const url=await previewUrl(key);if(!url)return;element.style.setProperty('--ob-preview-image',`url("${url}")`);element.classList.add('has-photo');
  }
  function hydrateMedia(root){
    const rows=[...(root?.querySelectorAll?.('[data-ob-media-key]')||[])].filter(row=>row.dataset.obMediaLoaded!=='1');if(!rows.length)return;
    if(!('IntersectionObserver' in globalThis)){rows.forEach(loadPreview);return;}
    if(!previewObserver)previewObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;previewObserver.unobserve(entry.target);loadPreview(entry.target);}),{rootMargin:'180px 0px'});
    rows.forEach(row=>previewObserver.observe(row));
  }
  function participantRows(item){return item?.participants?.rows||[];}
  function people(item){
    const rows=participantRows(item);
    if(!rows.length)return '<span class="ob4-participant-empty">参加者未設定</span>';
    return rows.slice(0,6).map(row=>`<span class="ob4-person ${row.type==='pet'?'pet':'member'}">${esc(row.name)}</span>`).join('')+(rows.length>6?`<span class="ob4-person more">＋${rows.length-6}</span>`:'');
  }
  function avatarStack(rows=[]){
    const visible=rows.slice(0,5).map((row,index)=>`<span class="ob6-avatar a${index} ${row.type==='pet'?'pet':'member'}" aria-label="${esc(row.name)}">${row.type==='pet'?icons.paw:initials(row.name)}</span>`).join('');
    return `<span class="ob6-avatars">${visible}${rows.length>5?`<span class="ob6-avatar more">+${rows.length-5}</span>`:''}</span>`;
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
    return `<a class="ob6-story-row ob7-story-row" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}">${activityVisual(item,{className:'ob7-thumb',label:false})}<span><time>${esc(dateLabel(item.startAt,{weekday:false}))}</time><b>${esc(item.title)}</b><small>${Number(item.recordCount||0)}件の記録${item.mediaCount?`・写真/動画 ${Number(item.mediaCount)}件`:''}</small></span>${icons.arrow}</a>`;
  }
  function emptyNow(){
    return `<div class="ob10-live-row"><span class="ob10-live-icon">${icons.play}</span><div class="ob10-live-copy"><small>現在の活動</small><b>待機中</b><p>出かける時に記録を始めます。</p></div><button class="ob10-start" data-ob3-action="start">開始</button></div>`;
  }
  function currentLine(item){
    return `<article class="ob10-live-row active" data-activity-id="${esc(item.id)}" style="view-transition-name:ob-activity-${token(item.id)}"><span class="ob10-live-icon">${icons.record}</span><div class="ob10-live-copy"><small>${esc(item.typeLabel)}・${esc(item.stateLabel)}</small><b>${esc(item.title)}</b><p>${esc(item.place||dateRange(item))}</p></div><a class="ob10-start" href="${esc(item.recordUrl)}">記録</a></article>`;
  }
  function nextBand(item){
    const prep=item.preparation||{completed:0,total:0,progress:0};
    return `<article class="ob10-next-row type-${esc(displayTypeKey(item))}" data-activity-id="${esc(item.id)}" style="view-transition-name:ob-activity-${token(item.id)}"><div class="ob10-next-copy"><div class="ob10-next-eyebrow"><span>次の予定</span><b>${esc(item.relativeDay)}</b></div><h2>${esc(item.title)}</h2><p>${esc(dateRange(item))}${item.place?` · ${esc(item.place)}`:''}</p><div class="ob10-next-progress"><span><b>${prep.completed}/${prep.total}</b> 準備済み</span><i><em style="width:${Math.max(0,Math.min(100,Number(prep.progress)||0))}%"></em></i><small>${Number(prep.progress)||0}%</small></div><div class="ob10-next-actions">${shellLink('activity',{activityId:item.id},'詳細','ob10-link')}<a class="ob10-primary" href="${esc(item.preparationUrl)}">準備する</a></div></div>${activityVisual(item,{className:'ob10-next-thumb',label:false})}</article>`;
  }
  function family(model){
    const value=model.home.family;const rows=value.rows||[];
    return `<button class="ob10-family" data-ob5-nav data-ob5-route="calendar" aria-label="家族とペットで絞り込む"><span>${avatarStack(rows)}</span><b>家族${value.memberCount}人・ペット${value.petCount}匹</b>${icons.arrow}</button>`;
  }
  function quick(model){
    const items=model.home.quick||[];
    return `<nav class="ob10-tools" aria-label="すぐ使う">${items.slice(0,4).map(item=>`<button data-ob3-action="${esc(item.action)}"><span>${icons[item.icon]||icons.arrow}</span><b>${esc(item.label)}</b></button>`).join('')}</nav>`;
  }
  function recentRailItem(item){
    return `<a class="ob10-recent-row" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}">${activityVisual(item,{className:'ob10-recent-thumb',label:false})}<span><small>${esc(dateLabel(item.startAt,{weekday:false}))} · ${esc(item.typeLabel||'活動')}</small><b>${esc(item.title)}</b><em>${Number(item.recordCount||0)}件の記録${item.mediaCount?` · 写真/動画 ${Number(item.mediaCount)}件`:''}</em></span>${icons.arrow}</a>`;
  }
  function home(model){
    const current=model.home.current||[],next=model.home.next||[],recent=model.home.recent||[];
    const nowHtml=current.length?currentLine(current[0]):emptyNow();
    const nextHtml=next.length?nextBand(next[0]):'<div class="ob10-empty">次の予定はまだありません。</div>';
    const recentHtml=recent.length?recent.slice(0,4).map(recentRailItem).join(''):'<div class="ob10-empty">最近の活動はまだありません。</div>';
    return `<div class="ob10-dashboard"><section class="ob10-overview"><div><small>今日</small><h1>${esc(model.home.todayLabel)}</h1></div><button data-ob5-nav data-ob5-route="calendar" aria-label="カレンダーを開く">${icons.calendar}</button></section>${family(model)}<section class="ob10-command">${nowHtml}<div class="ob10-divider"></div>${nextHtml}</section><section class="ob10-tool-section"><div class="ob10-section-head"><h2>すぐ使う</h2></div>${quick(model)}</section><section class="ob10-recent"><div class="ob10-section-head"><h2>最近の活動</h2><button data-ob3-route="vault">すべて見る ${icons.arrow}</button></div><div>${recentHtml}</div></section></div>`;
  }
  function searchPreview(tone){
    if(tone==='memory')return '<span class="ob8-search-preview memory" aria-hidden="true"><i class="photo-one"></i><i class="photo-two"></i><i class="photo-three"></i></span>';
    if(tone==='calendar')return `<span class="ob8-search-preview calendar" aria-hidden="true"><i class="calendar-head"></i><span>${Array.from({length:14},(_,index)=>`<i class="${[3,8,12].includes(index)?'marked':''}"></i>`).join('')}</span></span>`;
    return '<span class="ob8-search-preview map" aria-hidden="true"><svg viewBox="0 0 120 74"><path class="grid" d="M0 18h120M0 38h120M0 58h120M28 0v74M61 0v74M94 0v74"/><path class="route" d="M9 60c22-8 28-38 51-34 18 3 20 24 47 13"/><circle class="pin" cx="15" cy="57" r="5"/><path class="tent" d="m94 48 9-15 10 15Z"/></svg></span>';
  }
  function searchCard({title,sub,action,kind='route',tone='camp',icon='pin'}){
    const data=kind==='legacy'?`data-ob3-legacy="${esc(action)}"`:`data-ob3-route="${esc(action)}"`;
    return `<button class="ob7-search-card ob8-search-card tone-${esc(tone)}" ${data}><span class="ob7-search-icon">${icons[icon]||icons.arrow}</span><span class="ob8-search-copy"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${searchPreview(tone)}<span class="ob8-search-arrow">${icons.arrow}</span></button>`;
  }
  function search(){
    const panels=[
      {title:'場所から',sub:'キャンプ場や候補を地図で探す',action:'search',kind:'legacy',tone:'camp',icon:'pin',label:'MAP'},
      {title:'写真から',sub:'過去の活動ストーリーをたどる',action:'vault',kind:'route',tone:'memory',icon:'photo',label:'MEMORY'},
      {title:'予定から',sub:'家族の予定と次の活動を見る',action:'calendar',kind:'route',tone:'calendar',icon:'calendar',label:'CALENDAR'}
    ];
    return `<section class="ob6-page-hero ob7-page-hero ob9-page-hero"><small>DISCOVER</small><h1>探す</h1><p>入口を選ぶのではなく、見たい中身から探します。</p></section><nav class="ob9-search-tabs" aria-label="探し方">${panels.map((panel,index)=>{const data=panel.kind==='legacy'?`data-ob3-legacy="${esc(panel.action)}"`:`data-ob3-route="${esc(panel.action)}"`;return `<button class="${index===0?'active':''}" ${data}><small>${esc(panel.label)}</small><b>${esc(panel.title)}</b></button>`;}).join('')}</nav><section class="ob9-search-rail">${panels.map(panel=>{const data=panel.kind==='legacy'?`data-ob3-legacy="${esc(panel.action)}"`:`data-ob3-route="${esc(panel.action)}"`;return `<button class="ob9-search-panel tone-${esc(panel.tone)}" ${data}><span class="ob9-search-panel-preview">${searchPreview(panel.tone)}</span><span class="ob9-search-panel-copy"><small>${esc(panel.label)}</small><b>${esc(panel.title)}</b><em>${esc(panel.sub)}</em><i>開く ${icons.arrow}</i></span></button>`;}).join('')}</section>`;
  }

  function vaultTile(item){
    return `<a class="ob8-vault-tile" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}">${activityVisual(item,{className:'ob8-vault-tile-visual',label:false})}<span><small>${esc(dateLabel(item.startAt,{weekday:false}))}</small><b>${esc(item.title)}</b></span></a>`;
  }
  function vault(model){
    const activities=model.vaultActivities||[];const rows=activities.length?activities.map(storyRow).join(''):'<p class="ob3-empty">保存された思い出はまだありません。</p>';
    const latest=activities[0]||null;const side=activities.slice(1,3);
    const feature=latest?`<a class="ob9-bento-main" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:latest.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(latest.id)}">${activityVisual(latest,{className:'ob9-bento-visual',label:false})}<span><small>LATEST · ${esc(dateLabel(latest.startAt,{weekday:false}))}</small><b>${esc(latest.title)}</b><em>記録 ${Number(latest.recordCount||0)}件${latest.mediaCount?` · 写真/動画 ${Number(latest.mediaCount)}件`:''}</em></span></a>`:'';
    const sideHtml=side.map((item,index)=>`<a class="ob9-bento-side side-${index+1}" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}">${activityVisual(item,{className:'ob9-bento-visual',label:false})}<span><small>${esc(dateLabel(item.startAt,{weekday:false}))}</small><b>${esc(item.title)}</b></span></a>`).join('');
    return `<section class="ob6-page-hero ob7-page-hero ob9-page-hero ob9-vault-head"><small>ARCHIVE</small><h1>保管庫</h1><p>${model.vaultSummary.activityCount} activities · ${model.vaultSummary.recordCount} records · ${model.vaultSummary.assetCount} items</p></section><section class="ob9-vault-bento">${feature}${sideHtml}</section><section class="ob9-vault-metrics"><span><b>${model.vaultSummary.activityCount}</b><small>活動</small></span><span><b>${model.vaultSummary.recordCount}</b><small>記録</small></span><button data-ob3-legacy="vault"><b>${model.vaultSummary.assetCount}</b><small>持ち物 ${icons.arrow}</small></button></section><section class="ob9-vault-list"><div class="ob9-kicker"><span>ALL STORIES</span><h2>すべての活動</h2><i>${activities.length}件</i></div><div class="ob6-story-list ob7-story-list">${rows}</div></section>`;
  }


  function recordLabel(record){const payload=record.payload||{};return String(payload.title||payload.memo||payload.text||payload.note||payload.transcript||record.type||'記録').trim().slice(0,90);}
  function stateIndex(state){if(['candidate','planned'].includes(state))return 0;if(state==='preparing')return 1;if(['active','paused'].includes(state))return 2;if(state==='organizing')return 3;return 4;}
  function storyRail(item){
    const labels=['予定','準備','実行','整理','思い出'];const current=stateIndex(item.state);
    return `<section class="ob6-story-rail"><div><small>進み具合</small><b>${esc(item.stateLabel)}</b></div><div class="ob6-rail">${labels.map((label,index)=>`<span class="${index<current?'done':index===current?'current':''}"><i></i><small>${label}</small></span>`).join('')}</div></section>`;
  }
  function detailLine(title,body,extra=''){return `<section class="ob6-detail-line"><h2>${esc(title)}</h2><div>${body}</div><span>${extra}</span></section>`;}
  function activityDetail(model){
    const result=model.detail;if(!result||result.status!=='ready'||!result.activity)return `<section class="ob6-detail-head">${shellLink('home',{},icons.back,'ob6-icon')}<div><h1>活動が見つかりません</h1></div></section><p class="ob3-empty">指定された活動は削除されたか、まだ移行されていません。</p>`;
    const item=result.activity;const prep=item.preparation;
    const prepText=prep?`<b>${prep.completed}/${prep.total} 完了</b><p>未完了 ${prep.pending}件・進捗 ${prep.progress}%</p>`:'<p>準備項目はまだありません。</p>';
    const records=item.records.length?item.records.slice(0,4).map(row=>`<article class="ob6-timeline"><time>${esc(dateTimeLabel(row.occurredAt))}</time><span><b>${esc(recordLabel(row))}</b><small>${esc(row.type)}・${esc(row.visibility)}</small></span></article>`).join(''):'<p>記録はまだありません。</p>';
    const improvements=item.organization.improvements.length?item.organization.improvements.slice(0,4).map(row=>`<div class="ob6-improvement"><i class="${row.status==='completed'?'done':''}">${row.status==='completed'?icons.check:'・'}</i><span><b>${esc(row.title||row.summary||row.payload?.text||'改善項目')}</b><small>${esc(row.status||'open')}</small></span></div>`).join(''):'<p>次回改善はまだありません。</p>';
    const assetText=item.assets.length?item.assets.slice(0,6).map(row=>esc(row.name)).join('・'):'活動に紐づくギアはまだありません。';
    return `<section class="ob6-detail-head ob7-detail-head type-${esc(typeKey(item))}" style="view-transition-name:ob-activity-${token(item.id)}">${activityVisual(item,{className:'ob7-detail-visual',label:false})}<div class="ob7-detail-content"><div class="ob6-detail-tools">${shellLink('home',{},icons.back,'ob6-icon')}${shellLink('calendar',{month:(item.startAt||'').slice(0,7)},icons.calendar,'ob6-icon')}</div><small>${esc(item.typeLabel)} / ${esc(item.stateLabel)}</small><h1>${esc(item.title)}</h1>${meta(item)}</div></section>${storyRail(item)}<section class="ob6-facts"><div><small>期間</small><b>${esc(dateRange(item))}</b></div><div><small>場所</small><b>${esc(item.place||'未設定')}</b></div><div><small>公開</small><b>${esc(item.visibilityLabel)}</b></div><div><small>参加者</small><b>${item.participants?.count||0}人/匹</b></div></section><section class="ob6-detail-list">${detailLine('参加者',`<div class="ob4-people large">${people(item)}</div>`,icons.arrow)}${detailLine('準備',prepText,`<a href="${esc(item.preparationUrl)}">開く</a>`)}${detailLine('記録',records,`<a href="${esc(item.recordUrl)}">開く</a>`)}${detailLine('整理・改善',`<div class="ob6-summary-line"><span>レビュー ${item.organization.reviewCount}件</span><span>未完了 ${item.organization.openImprovementCount}件</span></div>${improvements}`,icons.arrow)}${detailLine('思い出',`<div class="ob6-summary-line"><span>記録 ${item.recordCount}</span><span>写真 ${item.media.types.photo}</span><span>動画 ${item.media.types.video}</span></div><p>${assetText}</p><small>献立 ${item.mealCount}・買い物リスト ${item.shoppingListCount}</small>`,icons.arrow)}</section><div class="ob6-detail-actions"><a href="${esc(item.legacyDetailUrl)}">FIELD03で確認</a><a class="primary" href="${esc(item.recordUrl)}">記録を開く</a></div>`;
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
    return `<section class="ob6-calendar-head"><div class="ob6-detail-tools">${shellLink('home',{},icons.back,'ob6-icon')}<button data-ob3-action="plan-add" class="ob6-icon" aria-label="予定を追加">${icons.plus}</button></div><h1>${esc(value.label)}</h1></section>${filterChips(value)}<section class="ob6-calendar-sheet"><div class="ob6-calendar-nav"><a href="${esc(value.previousUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(value.previousMonth)}">${icons.back}<span>${esc(value.previousMonth)}</span></a><b>${value.activities.length}件</b><a href="${esc(value.nextUrl)}" data-ob5-nav data-ob5-route="calendar" data-ob5-month="${esc(value.nextMonth)}"><span>${esc(value.nextMonth)}</span>${icons.arrow}</a></div><div class="ob5-calendar-grid">${weekdays}${cells}</div></section><section class="ob6-section"><div class="ob6-section-title"><h2>この月</h2><span>${value.activities.length}件</span></div><div class="ob6-agenda">${agenda||'<p class="ob3-empty">この月の活動はありません。</p>'}</div></section>`;
  }

  function nav(model){const homeActive=['home','activity','calendar'].includes(model.route.name);return `<nav class="ob3-nav" aria-label="メインメニュー"><button data-ob3-route="home" class="${homeActive?'active':''}">${icons.home}<span>ホーム</span></button><button data-ob3-route="search" class="${model.route.name==='search'?'active':''}">${icons.search}<span>探す</span></button><button class="ob3-central" data-ob3-central>${icons.plus}<span>追加</span></button><button data-ob3-route="vault" class="${model.route.name==='vault'?'active':''}">${icons.vault}<span>保管庫</span></button></nav>`;}
  function centralSheet(){return `<div class="ob3-backdrop" data-ob3-backdrop><section class="ob3-sheet ob7-sheet ob8-sheet ob9-sheet" role="dialog" aria-modal="true" aria-label="追加する"><div class="ob3-sheet-handle"></div><div class="ob3-sheet-head"><div><small>CREATE</small><h2>今、何を残す？</h2></div><button data-ob3-close aria-label="閉じる">×</button></div><div class="ob9-sheet-actions"><button class="ob9-sheet-primary" data-ob3-action="start"><span>${icons.play}</span><div><small>FIELD SESSION</small><b>活動を始める</b><em>GPS・写真・音声をひとつの活動へ</em></div><strong>始める</strong></button><button class="ob9-sheet-line" data-ob3-action="memo"><span>${icons.memo}</span><div><b>メモを残す</b><small>気づきや忘れたくないこと</small></div>${icons.arrow}</button><button class="ob9-sheet-line" data-ob3-action="plan-add"><span>${icons.calendar}</span><div><b>予定を追加</b><small>キャンプ・散歩・イベント</small></div>${icons.arrow}</button></div></section></div>`;}
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
    updateNetwork(shell,model.online);updateNav(shell,model);hydrateMedia(main);
    globalThis.OUTBASE_THEME_V166?.sync?.('shell-render');
    return model;
  }
  function showCentral(){const host=document.getElementById('outbaseShellModal');if(host)host.innerHTML=centralSheet();}
  function hideCentral(){const host=document.getElementById('outbaseShellModal');if(host)host.innerHTML='';}
  const api=Object.freeze({mount,showCentral,hideCentral,updateNetwork,updateNav,hydrateMedia,activityVisual,sceneSvg,displayTypeKey,homeHtml:home,searchHtml:search,vaultHtml:vault,activityHtml:activityDetail,calendarHtml:calendar,storyRow,nextBand});
  globalThis.OUTBASE_SHELL_RENDERER_V166=api;
  globalThis.OUTBASE_SHELL_RENDERER_V165=api;
  globalThis.OUTBASE_SHELL_RENDERER_V164=api;
})();
