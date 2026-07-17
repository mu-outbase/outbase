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
    paw:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="7.1" cy="7.2" rx="2.05" ry="2.45" transform="rotate(-18 7.1 7.2)"/><ellipse cx="11.1" cy="5.8" rx="1.95" ry="2.35" transform="rotate(-6 11.1 5.8)"/><ellipse cx="15.2" cy="6.2" rx="1.95" ry="2.35" transform="rotate(8 15.2 6.2)"/><ellipse cx="18" cy="9.5" rx="1.95" ry="2.35" transform="rotate(22 18 9.5)"/><path d="M12.1 10.3c-1.55 0-2.95.58-4.02 1.5-1.38 1.2-2.3 3.15-1.35 4.94.84 1.58 2.42 1.35 3.77.99.52-.14 1.03-.28 1.6-.28.57 0 1.08.14 1.6.28 1.35.36 2.93.59 3.77-.99.95-1.79.03-3.74-1.35-4.94-1.07-.92-2.47-1.5-4.02-1.5Z"/></svg>',
    prep:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 10h7M8.5 14h7M8.5 18h4"/></svg>',
    cook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h14l-1 8H6l-1-8Z"/><path d="M8 10V8a4 4 0 0 1 8 0v2M3 12h2M19 12h2M8 21h8"/></svg>',
    improve:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Z"/><path d="M9 20h6M10 17v3M14 17v3M9.5 11.5l1.5 1.5 3.5-4"/></svg>',
    bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21h4"/></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 15a2 2 0 0 0 .4 2.2l-2.2 2.2A2 2 0 0 0 15 19l-1 2h-4l-1-2a2 2 0 0 0-2.2.4l-2.2-2.2A2 2 0 0 0 5 15l-2-1v-4l2-1a2 2 0 0 0-.4-2.2l2.2-2.2A2 2 0 0 0 9 5l1-2h4l1 2a2 2 0 0 0 2.2-.4l2.2 2.2A2 2 0 0 0 19 9l2 1v4Z"/></svg>',
    info:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>',
    weatherNow:'<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true"><defs><radialGradient id="ob36SunNow" cx="42%" cy="35%"><stop offset="0" stop-color="#fffdf0"/><stop offset=".3" stop-color="#fff3a8"/><stop offset=".7" stop-color="#ffd45b"/><stop offset="1" stop-color="#efad25"/></radialGradient><linearGradient id="ob36CloudNow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f2f6f7"/><stop offset="1" stop-color="#d4dee2"/></linearGradient></defs><circle cx="22" cy="21" r="17" fill="#ffe58a" opacity=".22"/><circle cx="22" cy="21" r="10.8" fill="url(#ob36SunNow)" stroke="#d99b1f" stroke-width="1.05"/><path d="M22 3v6M22 33v6M4 21h6M34 21h6M9 8l4.1 4.1M31 30l4.1 4.1M35 8l-4.1 4.1" stroke="#d99b1f" stroke-width="1.45" stroke-linecap="round"/><path d="M16.5 47H48a7.4 7.4 0 0 0 0-14.8 11.1 11.1 0 0 0-20.8-2.3A8.9 8.9 0 0 0 16.5 47Z" fill="url(#ob36CloudNow)" stroke="#b8c2c6" stroke-width=".85"/><ellipse cx="31" cy="35" rx="9" ry="2.2" fill="#fff" opacity=".38"/></svg>',
    insight:'<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true"><defs><radialGradient id="ob36SunIntel"><stop offset="0" stop-color="#fff7a6"/><stop offset=".62" stop-color="#ffd653"/><stop offset="1" stop-color="#f5aa19"/></radialGradient><linearGradient id="ob36CloudIntel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset=".58" stop-color="#f4f7f8"/><stop offset="1" stop-color="#dbe3e6"/></linearGradient></defs><circle cx="22" cy="21" r="11" fill="url(#ob36SunIntel)" stroke="#dda014" stroke-width="1.4"/><path d="M22 3v6M22 33v6M4 21h6M34 21h6M9 8l4 4M31 30l4 4M35 8l-4 4" stroke="#dda014" stroke-width="1.55" stroke-linecap="round"/><path d="M17 47h31a8 8 0 0 0 0-16 12 12 0 0 0-22-2 9 9 0 0 0-9 18Z" fill="url(#ob36CloudIntel)" stroke="#afb9bd"/></svg>',
    rain:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 14h10a4 4 0 0 0 .2-8 5.8 5.8 0 0 0-10.8-1.4A4.7 4.7 0 0 0 6.5 14Z"/><path d="m8 17-1 3M12 17l-1 3M16 17l-1 3"/></svg>',
    wind:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h11c3.5 0 3.5-5 0-5-1.5 0-2.5.7-3 1.8M3 12h15c4 0 4 6 0 6-1.8 0-3-.8-3.5-2M3 16h7"/></svg>',
    temperature:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5a2 2 0 0 1 4 0v8.2a4 4 0 1 1-4 0Z"/><path d="M12 8v8M12 18h.01"/></svg>',
    setup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 19 8-14 8 14M7 19h10M9.5 14h5"/><circle cx="18" cy="7" r="3"/><path d="M18 5.5V7l1 1"/></svg>',
    pack:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 8-12 8 12M7 16h10M9.5 12h5"/><path d="M12 15v6M9.5 18.5 12 21l2.5-2.5"/></svg>',
    hourly:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="12" r="6"/><path d="M10 8v4l3 2M17 6h4M18 10h3M17 14h4"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M18.5 15.5A7 7 0 1 1 19 8l1 4"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
  };

  function weatherArt(condition,variant='now'){
    const text=String(condition||'');
    const cloud='<path d="M13 45h36a8 8 0 0 0 0-16 12 12 0 0 0-22.8-1.8A10 10 0 0 0 13 45Z" fill="#f5f7f8" stroke="#aeb8bd" stroke-width="1.2"/>';
    if(/雷/.test(text))return `<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true">${cloud}<path d="m31 35-5 10h6l-3 8 11-13h-7l4-5" fill="#e8ad28" stroke="#ba7d12" stroke-width=".8"/></svg>`;
    if(/雨|にわか雨|霧雨/.test(text))return `<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true">${cloud}<path d="M22 48l-2 5M32 48l-2 5M42 48l-2 5" stroke="#4c91ba" stroke-width="2.2" stroke-linecap="round"/></svg>`;
    if(/雪/.test(text))return `<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true">${cloud}<path d="M22 48v6M19 51h6M32 48v6M29 51h6M42 48v6M39 51h6" stroke="#73a9c5" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    if(/霧/.test(text))return `<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true">${cloud}<path d="M12 48h38M17 52h30" stroke="#93a0a5" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    if(text==='晴れ')return '<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true"><circle cx="32" cy="28" r="13" fill="#ffd45b" stroke="#d99b1f" stroke-width="1.2"/><path d="M32 4v8M32 44v8M8 28h8M48 28h8M15 11l6 6M43 39l6 6M49 11l-6 6M21 39l-6 6" stroke="#d99b1f" stroke-width="1.8" stroke-linecap="round"/></svg>';
    if(/くもり/.test(text)&&!/晴/.test(text))return `<svg class="ob36-weather-reference" viewBox="0 0 64 56" aria-hidden="true">${cloud}</svg>`;
    return variant==='insight'?icons.insight:icons.weatherNow;
  }

  function dateLabel(value,options={}){if(!value)return '日付未設定';const d=new Date(value);if(Number.isNaN(d.getTime()))return '日付未設定';return d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:options.weekday===false?undefined:'short'});}
  function dateTimeLabel(value){if(!value)return '日時未設定';const d=new Date(value);if(Number.isNaN(d.getTime()))return '日時未設定';return d.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
  function dateRange(item){const start=dateLabel(item.startAt);if(!item.endAt||dateLabel(item.endAt)===start)return start;return `${start}〜${dateLabel(item.endAt)}`;}
  function dateTimeRange(item){const start=new Date(item?.startAt||'');const end=new Date(item?.endAt||item?.startAt||'');if(Number.isNaN(start.getTime()))return '日時未設定';const fmt=d=>`${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}） ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;return Number.isNaN(end.getTime())?fmt(start):`${fmt(start)} 〜 ${fmt(end)}`;}
  function initials(name){const text=String(name||'・').trim();return esc(text.slice(0,1)||'・');}
  const previewUrls=new Map();
  const previewPromises=new Map();
  let previewObserver=null;
  function typeKey(item){const value=String(item?.type||'other');return ['camp','walk','drive','event','shopping'].includes(value)?value:'other';}
  function previewKey(item){return String(item?.previewMedia?.key||'').trim();}
  function coverVariant(item){
    const named=String(item?.coverVariant||'');if(['lake','group','sea','autumn','festival'].includes(named))return named;
    const type=typeKey(item);if(type==='walk')return 'group';if(type==='drive')return 'sea';if(type==='event')return 'festival';if(type==='shopping')return 'autumn';
    if(type!=='camp')return 'lake';const variants=['lake','group','sea','autumn'];const text=String(item?.id||item?.title||'camp');let total=0;for(const char of text)total=(total+char.charCodeAt(0))%997;return variants[total%variants.length];
  }
  function defaultCover(item){return `assets/default-covers/${coverVariant(item)}.jpg`;}
  function activityVisual(item,{className='ob7-thumb',label=true}={}){
    const type=typeKey(item);const key=previewKey(item);const typeLabel=item?.typeLabel||({camp:'キャンプ',walk:'散歩',drive:'ドライブ',event:'イベント',shopping:'買い物'}[type]||'活動');const cover=defaultCover(item);
    return `<span class="${className} type-${esc(type)} has-default-cover" style="--ob-default-cover:url('${esc(cover)}')"${key?` data-ob-media-key="${esc(key)}"`:''}><span class="ob7-visual-fallback">${icons[type]||icons.other}${label?`<small>${esc(typeLabel)}</small>`:''}</span></span>`;
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
  function emptyNow(){return `<div class="ob6-now-line ob7-now-line"><span class="ob7-now-mark">${icons.play}</span><div><b>今は活動していません</b><p>出かける時に、ここから記録を始めます。</p></div><button class="ob6-primary" data-ob3-action="start">始める</button></div>`;}
  function currentLine(item){
    return `<article class="ob6-current-line" data-activity-id="${esc(item.id)}" style="view-transition-name:ob-activity-${token(item.id)}"><div><small>${esc(item.typeLabel)}・${esc(item.stateLabel)}</small><h3>${esc(item.title)}</h3>${meta(item)}</div><div class="ob6-current-actions">${shellLink('activity',{activityId:item.id},'活動を見る','ob6-secondary')}<a class="ob6-primary" href="${esc(item.recordUrl)}">記録を開く</a></div></article>`;
  }
  function nextBand(item){
    const prep=item.preparation||{completed:0,total:0,progress:0};
    return `<article class="ob6-next-band ob7-next-band type-${esc(typeKey(item))}" data-activity-id="${esc(item.id)}" style="view-transition-name:ob-activity-${token(item.id)}">${activityVisual(item,{className:'ob7-next-visual',label:false})}<div class="ob7-next-content"><div class="ob6-next-top"><span>次の${esc(item.typeLabel||'活動')}</span><b>${esc(item.relativeDay)}</b></div><h3>${esc(item.title)}</h3>${meta(item)}<div class="ob6-prep"><b>準備 ${prep.completed}/${prep.total}</b><div class="ob4-progress-track"><i style="width:${Math.max(0,Math.min(100,Number(prep.progress)||0))}%"></i></div><span>${Number(prep.progress)||0}%</span></div><div class="ob6-next-actions">${shellLink('activity',{activityId:item.id},'活動を見る','ob6-secondary light')}<a class="ob6-primary brass" href="${esc(item.preparationUrl)}">準備する</a></div></div></article>`;
  }
  function family(model){
    const value=model.home.family;const rows=value.rows||[];
    return `<section class="ob6-family-line ob7-family-line"><div><small>${esc(value.household.name)}</small><b>家族${value.memberCount}人・ペット${value.petCount}匹</b></div><button data-ob5-nav data-ob5-route="calendar" aria-label="家族とペットで絞り込む">${avatarStack(rows)}<span>絞り込む</span></button></section>`;
  }
  function quick(model){
    const next=model.home.next?.[0]||null;
    return `<section class="ob36-quick"><div class="ob36-quick-head"><h2>クイックアクション</h2><button type="button" data-ob36-settings>編集</button></div><div class="ob36-quick-strip">${model.home.quick.map(item=>`<button type="button" class="ob36-quick-item tone-${esc(item.tone||'green')}" data-ob36-quick="${esc(item.action)}"${item.action==='prep'&&next?.preparationUrl?` data-ob36-url="${esc(next.preparationUrl)}"`:''}><span class="ob36-quick-icon ${item.icon==='paw'?'paw':''}">${icons[item.icon]||icons.arrow}</span><b>${esc(item.label)}</b><small>${esc(item.hint)}</small></button>`).join('')}</div></section>`;
  }
  function ob36Topbar(){return `<div class="ob36-topbar"><b>OUTBASE</b><div><button type="button" class="ob36-icon-btn" data-ob36-notify aria-label="通知">${icons.bell}</button><button type="button" class="ob36-icon-btn" data-ob36-app-settings aria-label="設定">${icons.settings}</button></div></div>`;}
  function ob36Value(value,suffix=''){return value===null||value===undefined||value===''?`—${suffix}`:`${esc(value)}${suffix}`;}
  function weatherTone(kind,value){
    const number=Number(value);
    if(kind==='temperature'){if(number>=35)return 'danger';if(number>=28)return 'warm';if(number<10)return 'cool';return 'good';}
    if(kind==='rain'){if(number>=70)return 'danger';if(number>=40)return 'watch';if(number>=20)return 'info';return 'good';}
    if(kind==='wind'){if(number>=8)return 'danger';if(number>=4)return 'watch';return 'good';}
    if(kind==='confidence'){const text=String(value||'');if(/^A/.test(text))return 'good';if(/^B/.test(text))return 'watch';return 'danger';}
    return 'info';
  }
  function metricClass(kind,value){return `ob36-value tone-${weatherTone(kind,value)}`;}
  function updateMarkup(update,compact=false){
    if(!update)return '';
    return `<div class="ob36-weather-update ${compact?'compact':''}"><span>最終更新 ${esc(update.updatedLabel||'—')}</span><span>次回 ${esc(update.nextUpdateLabel||'—')}頃</span><button type="button" data-ob36-weather-refresh aria-label="天気を更新">${icons.refresh}</button></div>`;
  }
  function ob36Today(model){
    const weather=model.home.weather||{};const active=weather.scope==='current'?'current':'home';
    const title=`<div class="ob36-today-summary"><div class="ob36-weather-title"><b>今日の天気</b><small>${esc(model.home.todayLabel)}・${esc(weather.locationLabel||'場所未設定')}</small></div><span class="ob36-scope"><button type="button" class="${active==='home'?'active':''}" data-ob36-weather-scope="home">自宅</button><button type="button" class="${active==='current'?'active':''}" data-ob36-weather-scope="current">現在地</button></span></div><h1 class="ob36-weather-message">${esc(model.home.todaySummary)}</h1>`;
    const hasData=weather.status==='ready'||weather.status==='sample';
    if(!hasData)return `<section class="ob36-weather-card ob36-card is-unavailable">${title}<div class="ob36-weather-unavailable"><span class="ob36-weather-symbol">${weatherArt(weather.condition,'now')}</span><div class="ob36-weather-unavailable-copy"><div class="ob36-weather-state"><b>${esc(weather.condition||'天気情報未接続')}</b><span><i aria-hidden="true"></i>接続待ち</span></div><p>気温・降水確率・風速は天気接続後に表示します。</p></div></div>${updateMarkup(weather.update)}</section>`;
    const temp=Number(weather.temperature).toFixed(1).replace(/\.0$/,'');
    const sample=weather.sample?`<i class="ob36-sample-tag">${esc(weather.sampleLabel||'サンプル')}</i>`:'';
    return `<section class="ob36-weather-card ob36-card is-ready ${weather.sample?'is-sample':''}">${title}<div class="ob36-weather-lower"><span class="ob36-weather-symbol">${weatherArt(weather.condition,'now')}</span><div class="ob36-weather-content"><div class="ob36-weather-head"><em>${esc(weather.condition)}</em>${sample}</div><div class="ob36-weather-body"><div class="ob36-current"><strong class="${metricClass('temperature',weather.temperature)}">${esc(temp)}°</strong><small>最高 ${esc(weather.high)}°／最低 ${esc(weather.low)}°</small></div><div class="ob36-metric"><b>降水確率</b><span class="${metricClass('rain',weather.rain)}">${esc(weather.rain)}%</span></div><div class="ob36-metric"><b>風速</b><span class="${metricClass('wind',weather.wind)}">${esc(weather.wind)} m/s</span></div></div></div></div>${updateMarkup(weather.update)}</section>`;
  }
  function planWeather(item){
    const live=globalThis.OUTBASE_WEATHER_SERVICE_V1?.getPlan?.(item);
    if(live?.status==='ready'){
      const summary=live.rainPeak>=50?`降水${live.rainPeak}%`:live.windMax>=5?`風${live.windMax}m/s`:'大きな崩れ小';
      return [`${ob36Value(live.high,'°')}／${ob36Value(live.low,'°')}`,summary];
    }
    if(live?.status==='out-of-range')return ['予報待ち','日程が近づくと表示'];
    return ['—','選択すると取得'];
  }
  function ob36PlanCard(item,selected){
    const weather=planWeather(item);const classes=['ob36-plan',selected?'selected':'',item.sample?'is-sample':''].filter(Boolean).join(' ');
    const content=`<span class="ob36-plan-tag">${esc(item.typeLabel||'活動')}</span>${activityVisual(item,{className:'ob36-plan-photo',label:false})}<h3>${esc(item.title)}</h3><p>${esc(dateRange(item))}</p><div class="ob36-plan-temp"><span>${esc(weather[0])}</span><em>${esc(weather[1])}</em></div>`;
    if(item.sample)return `<button type="button" class="${classes}" data-ob36-sample-plan="${esc(item.id)}" aria-label="${esc(item.title)}・表示サンプル">${content}</button>`;
    const href=globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:item.id});
    return `<a class="${classes}" href="${esc(href)}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(item.id)}">${content}</a>`;
  }
  function ob36Plans(model){
    const rows=(model.home.next||[]).slice(0,5);
    if(!rows.length)return `<section class="ob36-plans ob36-card is-empty"><div class="ob36-section-head"><h2>今後の予定</h2><button type="button" data-ob3-action="calendar">カレンダー　›</button></div><div class="ob36-plan-strip"><div class="ob36-empty"><b>今後の予定はまだありません。</b><button type="button" data-ob3-action="plan-add">予定を追加</button></div></div></section>`;
    return `<section class="ob36-plans ob36-card is-multiple"><div class="ob36-section-head"><h2>今後の予定</h2><button type="button" data-ob3-action="calendar">カレンダー　›</button></div><div class="ob36-plan-strip">${rows.map(item=>ob36PlanCard(item,item.id===model.home.selectedPlanId)).join('')}</div></section>`;
  }
  function ob36Intel(model){
    const rows=model.home.next||[];const selected=model.home.selectedPlan||rows[0]||null;const intel=model.home.weatherIntel||{};
    const options=rows.map(item=>`<option value="${esc(item.id)}"${item.id===model.home.selectedPlanId?' selected':''}>${esc(item.title)}</option>`).join('');
    if(!selected)return `<section class="ob36-intel ob36-card is-empty"><div class="ob36-intel-title"><h2>予定の天気見立て</h2></div><p class="ob36-intel-empty">予定を登録すると、ここに期間中の見立てを表示します。</p></section>`;
    if(intel.status==='loading')return `<section class="ob36-intel ob36-card is-unavailable"><div class="ob36-intel-title"><h2>予定の天気見立て</h2><div><select data-ob36-weather-plan aria-label="対象予定">${options}</select></div></div><p class="ob36-intel-place">${esc(intel.place||selected.place||'場所未設定')}</p><div class="ob36-intel-loading"><span class="ob36-intel-weather-icon">${weatherArt(intel.condition,'insight')}</span><div><b>${esc(intel.condition||'予報を取得しています')}</b><p>${esc(intel.message||'最新予報へ接続しています。')}</p></div></div>${updateMarkup(intel.update,true)}</section>`;
    if(intel.status==='out-of-range')return `<section class="ob36-intel ob36-card is-unavailable"><div class="ob36-intel-title"><h2>予定の天気見立て</h2><div><select data-ob36-weather-plan aria-label="対象予定">${options}</select></div></div><p class="ob36-intel-place">${esc(intel.place||selected.place||'場所未設定')}</p><div class="ob36-intel-loading"><span class="ob36-intel-weather-icon">${weatherArt(intel.condition,'insight')}</span><div><b>${esc(intel.condition||'予報期間外')}</b><p>${esc(intel.message||'日程が近づくと自動表示します。')}</p></div></div>${updateMarkup(intel.update,true)}</section>`;
    const alerts=(Array.isArray(intel.alerts)?intel.alerts:[]).slice(0,3).map(alert=>`<div class="ob36-notice-row"><time>${esc(alert.time)}</time><span>${esc(alert.text||alert.title||'注意情報')}</span></div>`).join('');
    const source=intel.sample?`<span>${esc(intel.sampleLabel||'表示サンプル')}</span>`:`<span>${esc(intel.provider||'自動取得')}</span>`;
    return `<section class="ob36-intel ob36-card is-ready ${intel.sample?'is-sample':''}"><div class="ob36-intel-title"><h2>予定の天気見立て</h2><div><select data-ob36-weather-plan aria-label="対象予定">${options}</select></div></div><p class="ob36-intel-place">${esc(intel.place||selected.place||'場所未設定')}　${source}</p><div class="ob36-intel-range"><strong>${esc(dateTimeRange(selected))}</strong><span>${esc(intel.durationLabel||'')}</span></div><div class="ob36-intel-weather-summary"><span class="ob36-intel-weather-icon">${weatherArt(intel.condition,'insight')}</span><div class="ob36-intel-weather-copy"><small>期間中の天気傾向</small><div class="ob36-intel-condition"><h3>${esc(intel.condition)}</h3><strong class="${metricClass('temperature',intel.high)}">${ob36Value(intel.high,'°')}／${ob36Value(intel.low,'°')}</strong></div><div class="ob36-intel-metric-row"><div><b class="${metricClass('rain',intel.rainPeak)}">${ob36Value(intel.rainPeak,'%')}</b><small>降水ピーク</small></div><div><b class="${metricClass('wind',intel.windMax)}">${ob36Value(intel.windMax,'m/s')}</b><small>最大風速</small></div><div><b class="${metricClass('confidence',intel.confidenceLabel||intel.confidence)}">${esc(intel.confidenceLabel||intel.confidence||'—')}</b><small>信頼度</small></div></div></div></div><div class="ob36-notice-panel"><div class="ob36-notice-heading"><h3>今回の注意</h3><p>${esc(intel.message)}</p></div><div class="ob36-notice-list">${alerts||'<p class="ob36-intel-empty">大きな注意情報はありません。</p>'}</div></div><button type="button" class="ob36-intel-detail-button" data-ob36-weather-detail><span class="ob36-intel-detail-icon">${icons.hourly}</span><span><b>時間ごとの天気</b><small>一覧はシンプル、押すと詳しく表示</small></span>${icons.arrow}</button>${updateMarkup(intel.update,true)}</section>`;
  }
  function home(model){return `${ob36Topbar()}${ob36Today(model)}${ob36Plans(model)}${ob36Intel(model)}${quick(model)}<div class="ob36-nav-reserve" aria-hidden="true"></div>`;}
  function searchCard({title,sub,action,kind='route',tone='camp',icon='pin'}){
    const data=kind==='legacy'?`data-ob3-legacy="${esc(action)}"`:`data-ob3-route="${esc(action)}"`;
    return `<button class="ob7-search-card tone-${esc(tone)}" ${data}><span class="ob7-search-icon">${icons[icon]||icons.arrow}</span><span><b>${esc(title)}</b><small>${esc(sub)}</small></span>${icons.arrow}</button>`;
  }
  function search(){return `<section class="ob6-page-hero ob7-page-hero"><h1>探す</h1><p>次の場所も、残した記録も、ここから見つけます。</p></section><section class="ob7-search-grid">${searchCard({title:'キャンプ場や候補',sub:'場所・天気・過去の候補',action:'search',kind:'legacy',tone:'camp',icon:'camp'})}${searchCard({title:'過去の記録',sub:'思い出・写真・メモ',action:'vault',tone:'memory',icon:'photo'})}${searchCard({title:'これからの予定',sub:'カレンダーと家族フィルタ',action:'calendar',tone:'calendar',icon:'calendar'})}</section>`;}

  function vault(model){
    const activities=model.vaultActivities||[];const rows=activities.length?activities.map(storyRow).join(''):'<p class="ob3-empty">保存された思い出はまだありません。</p>';
    const latest=activities[0]||null;
    const feature=latest?`<a class="ob7-vault-feature" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:latest.id}))}" data-ob5-nav data-ob5-route="activity" data-ob5-activity-id="${esc(latest.id)}">${activityVisual(latest,{className:'ob7-vault-visual',label:false})}<span><small>最近の活動</small><b>${esc(latest.title)}</b><em>${esc(dateLabel(latest.startAt))}・記録 ${Number(latest.recordCount||0)}件</em></span>${icons.arrow}</a>`:'';
    return `<section class="ob6-page-hero ob7-page-hero"><h1>保管庫</h1><p>写真、記録、持ち物を、活動ごとの思い出として残します。</p></section>${feature}<section class="ob6-metric-strip ob7-metric-strip"><div><small>思い出</small><b>${model.vaultSummary.activityCount}</b></div><div><small>記録</small><b>${model.vaultSummary.recordCount}</b></div><div><small>持ち物</small><b>${model.vaultSummary.assetCount}</b></div></section><section class="ob6-section"><div class="ob6-section-title"><h2>活動ストーリー</h2><button data-ob3-legacy="vault">旧保管庫</button></div><div class="ob6-story-list ob7-story-list">${rows}</div></section>`;
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

  function nav(model){const homeActive=['home','activity','calendar'].includes(model.route.name);return `<nav class="ob3-nav ob36-nav" aria-label="メインメニュー"><button data-ob3-route="home" class="${homeActive?'active':''}"><span class="ob36-nav-icon">${icons.home}</span><span>ホーム</span></button><button data-ob3-route="search" class="${model.route.name==='search'?'active':''}"><span class="ob36-nav-icon">${icons.search}</span><span>探す</span></button><button class="ob3-central" data-ob3-central><span class="ob36-nav-icon">${icons.plus}</span><span>追加</span></button><button data-ob3-route="vault" class="${model.route.name==='vault'?'active':''}"><span class="ob36-nav-icon">${icons.vault}</span><span>保管庫</span></button></nav>`;}
  function centralSheet(){return `<div class="ob3-backdrop" data-ob3-backdrop><section class="ob3-sheet ob7-sheet" role="dialog" aria-modal="true" aria-label="追加する"><div class="ob3-sheet-handle"></div><div class="ob3-sheet-head"><div><h2>何をする？</h2></div><button data-ob3-close aria-label="閉じる">×</button></div><div class="ob3-sheet-actions"><button class="tone-field" data-ob3-action="start"><span>${icons.play}</span><div><b>活動を始める</b><small>散歩、キャンプ、ドライブ</small></div>${icons.arrow}</button><button class="tone-memory" data-ob3-action="memo"><span>${icons.memo}</span><div><b>メモを残す</b><small>気づきをすぐ記録</small></div>${icons.arrow}</button><button class="tone-calendar" data-ob3-action="plan-add"><span>${icons.calendar}</span><div><b>予定を追加</b><small>カレンダーにつながる予定</small></div>${icons.arrow}</button></div></section></div>`;}
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
  const api=Object.freeze({mount,showCentral,hideCentral,updateNetwork,updateNav,hydrateMedia,activityVisual,homeHtml:home,activityHtml:activityDetail,calendarHtml:calendar,storyRow,nextBand});
  globalThis.OUTBASE_SHELL_RENDERER_V166=api;
  globalThis.OUTBASE_SHELL_RENDERER_V165=api;
  globalThis.OUTBASE_SHELL_RENDERER_V164=api;
})();
