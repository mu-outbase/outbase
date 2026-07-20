(() => {
  'use strict';
  if(globalThis.OUTBASE_UI_V21)return;

  const svg=body=>`<svg class="ob21-icon" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const icons=Object.freeze({
    home:svg('<path d="M3.5 11.2 12 4l8.5 7.2v8.3a1 1 0 0 1-1 1h-5.2v-6.1H9.7v6.1H4.5a1 1 0 0 1-1-1Z"/>'),
    calendar:svg('<rect x="3.5" y="5.2" width="17" height="15.2" rx="2.3"/><path d="M7.7 3.2v4M16.3 3.2v4M3.5 9.5h17"/>'),
    plus:svg('<path d="M12 5v14M5 12h14"/>'),
    search:svg('<circle cx="10.5" cy="10.5" r="6.3"/><path d="m15.3 15.3 5 5"/>'),
    vault:svg('<rect x="3.5" y="5.3" width="17" height="15" rx="2.3"/><path d="M7.5 5.3V3.4h9v1.9M8 10.2h8"/>'),
    back:svg('<path d="m14.8 5.2-6.7 6.8 6.7 6.8"/>'),
    arrow:svg('<path d="m9.2 5.2 6.7 6.8-6.7 6.8"/>'),
    play:svg('<path d="m8.3 5.3 10.8 6.7-10.8 6.7Z"/>'),
    pause:svg('<path d="M8.3 5v14M15.7 5v14"/>'),
    stop:svg('<rect x="6.2" y="6.2" width="11.6" height="11.6" rx="2"/>'),
    prep:svg('<rect x="5.2" y="4.4" width="13.6" height="16.2" rx="2.1"/><path d="M9 4.4V2.5h6v1.9M8.5 9.2h7M8.5 13.2h7M8.5 17.2h4.3"/>'),
    record:svg('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 8.3h7M8.5 12.3h7M8.5 16.3h4.5"/>'),
    memo:svg('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 8.3h7M8.5 12.3h7M8.5 16.3h4.5"/>'),
    memory:svg('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 8.3h7M8.5 12.3h7M8.5 16.3h4.5"/>'),
    activity:svg('<path d="m8.3 5.3 10.8 6.7-10.8 6.7Z"/>'),
    photo:svg('<rect x="3.5" y="5.2" width="17" height="14.7" rx="2.2"/><circle cx="9" cy="10" r="1.8"/><path d="m5.2 17.8 4.7-4.7 3.2 3.2 2.2-2.2 3.5 3.7"/>'),
    video:svg('<rect x="3.5" y="6.2" width="12.3" height="11.6" rx="2.1"/><path d="m15.8 10.1 4.7-2.7v9.2l-4.7-2.7Z"/>'),
    audio:svg('<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.2 10.8a6.8 6.8 0 0 0 13.6 0M12 17.6v3.2M8.5 20.8h7"/>'),
    pin:svg('<path d="M12 21s6.7-5 6.7-11.8a6.7 6.7 0 1 0-13.4 0C5.3 16 12 21 12 21Z"/><circle cx="12" cy="9.2" r="2"/>'),
    locate:svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>'),
    parking:svg('<circle cx="12" cy="12" r="8.7"/><path d="M9.1 17V7.2h4a3 3 0 0 1 0 6h-4M9.1 13.2h4"/>'),
    settings:svg('<circle cx="12" cy="12" r="3"/><path d="M19 15a2 2 0 0 0 .4 2.2l-2.2 2.2A2 2 0 0 0 15 19l-1 2h-4l-1-2a2 2 0 0 0-2.2.4l-2.2-2.2A2 2 0 0 0 5 15l-2-1v-4l2-1a2 2 0 0 0-.4-2.2l2.2-2.2A2 2 0 0 0 9 5l1-2h4l1 2a2 2 0 0 0 2.2-.4l2.2 2.2A2 2 0 0 0 19 9l2 1v4Z"/>'),
    bell:svg('<path d="M6 9a6 6 0 0 1 12 0c0 6.7 2.8 7 2.8 9H3.2C3.2 16 6 15.7 6 9Z"/><path d="M10 21h4"/>'),
    check:svg('<path d="m5 12.3 4.1 4.1L19 6.5"/>'),
    gear:svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
    weather:svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>'),
    route:svg('<path d="M5 18c0-4.6 4-4.8 4-9a3 3 0 1 0-6 0c0 3.9 2 5 2 5s2-1.1 2-5"/><path d="M10.5 17c2.1-3 4-4 7-4h2M16.5 9l3 4-3 4"/>'),
    meal:svg('<path d="M5 10h14l-1 8H6l-1-8Z"/><path d="M8 10V8a4 4 0 0 1 8 0v2M3 12h2M19 12h2"/>'),
    cook:svg('<path d="M5 10h14l-1 8H6l-1-8Z"/><path d="M8 10V8a4 4 0 0 1 8 0v2M3 12h2M19 12h2"/>'),
    shopping:svg('<path d="M3.5 4.5h2l2 10.2h9.7l2.2-7.4H7"/><circle cx="9" cy="19.2" r="1.3"/><circle cx="17" cy="19.2" r="1.3"/>'),
    pet:svg('<ellipse cx="7.1" cy="7.2" rx="2.05" ry="2.45" transform="rotate(-18 7.1 7.2)"/><ellipse cx="11.1" cy="5.8" rx="1.95" ry="2.35" transform="rotate(-6 11.1 5.8)"/><ellipse cx="15.2" cy="6.2" rx="1.95" ry="2.35" transform="rotate(8 15.2 6.2)"/><ellipse cx="18" cy="9.5" rx="1.95" ry="2.35" transform="rotate(22 18 9.5)"/><path d="M12.1 10.3c-1.55 0-2.95.58-4.02 1.5-1.38 1.2-2.3 3.15-1.35 4.94.84 1.58 2.42 1.35 3.77.99.52-.14 1.03-.28 1.6-.28.57 0 1.08.14 1.6.28 1.35.36 2.93.59 3.77-.99.95-1.79.03-3.74-1.35-4.94-1.07-.92-2.47-1.5-4.02-1.5Z"/>'),
    ticket:svg('<path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z"/><path d="M12 7v12"/>'),
    improve:svg('<path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Z"/><path d="M9 20h6M9.5 11.5l1.5 1.5 3.5-4"/>'),
    cloud:svg('<path d="M6.5 18h11a4 4 0 0 0 .1-8 6 6 0 0 0-11.2-1.5A4.8 4.8 0 0 0 6.5 18Z"/><path d="m9 14 3 3 5-6"/>'),
    walk:svg('<circle cx="13" cy="4" r="2"/><path d="m10 8 3-1 2.5 3.5M12 7l-2 5-3 3M12 12l3 3 1 5M9 13l1 7"/>'),
    camp:svg('<path d="m4 19 8-14 8 14M7 19h10M9.2 14.5h5.6"/>'),
    drive:svg('<path d="M4 14h16l-2-6H6zM4 14v4h2m14-4v4h-2M8 18h8"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/>'),
    event:svg('<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3.5v5M16 3.5v5M4 10.5h16"/>'),
    close:svg('<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>')
  });

  const categoryIcons=Object.freeze({
    weather:icons.weather,route:icons.route,gear:icons.gear,meal:icons.meal,cooking:icons.meal,
    shopping:icons.shopping,pet:icons.pet,parking:icons.parking,ticket:icons.ticket,note:icons.record,memo:icons.record
  });

  function shellUrl(name,values={}){
    try{return globalThis.OUTBASE_ROUTER?.shellUrl?.(name,values)||`./?shell=1&view=${encodeURIComponent(name)}`;}
    catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}
  }

  function legacyNavMarkup(){
    return `<button type="button" data-ob21-route="home"><span>${icons.home}</span><span>ホーム</span></button>
      <button type="button" data-ob21-route="calendar"><span>${icons.calendar}</span><span>カレンダー</span></button>
      <button type="button" data-ob21-route="add" class="ob21-nav-add"><span>${icons.plus}</span><span>追加</span></button>
      <button type="button" data-ob21-route="search"><span>${icons.search}</span><span>探す</span></button>
      <button type="button" data-ob21-route="vault"><span>${icons.vault}</span><span>保管庫</span></button>`;
  }

  function setSharedIcon(host,icon,key='shared'){
    if(!host||!icon||host.dataset?.ob21Icon===key)return;
    host.innerHTML=icon;
    if(host.dataset)host.dataset.ob21Icon=key;
  }

  function replaceInlineSvg(container,icon,key='shared'){
    if(!container||!icon||container.dataset?.ob21InlineIcon===key)return;
    const current=container.querySelector?.(':scope > svg')||container.querySelector?.('svg');
    if(current)current.outerHTML=icon;
    else container.insertAdjacentHTML?.('afterbegin',icon);
    if(container.dataset)container.dataset.ob21InlineIcon=key;
  }

  function normalizeLegacyIcons(root=document){
    root.querySelectorAll?.('.prepModuleCard').forEach(card=>{
      const title=card.querySelector?.('.prepModuleCopy h3')?.textContent?.trim()||'';
      const key=title.includes('天気')?'weather':title.includes('ギア')||title.includes('持ち物')?'gear':title.includes('料理')||title.includes('献立')?'meal':title.includes('買')?'shopping':title.includes('ルート')?'route':'prep';
      setSharedIcon(card.querySelector?.('.prepModuleIcon'),icons[key],key);
    });
    root.querySelectorAll?.('.prepCommandBar button').forEach(button=>{
      const text=button.textContent||'';
      const key=text.includes('主役')||text.includes('予定')?'calendar':text.includes('台帳')||text.includes('ギア')?'gear':'prep';
      setSharedIcon(button.querySelector?.(':scope > span'),icons[key],key);
    });
    root.querySelectorAll?.('.locationSaveNotice,.pinSavedPosition').forEach(node=>replaceInlineSvg(node,icons.pin,'pin'));
    root.querySelectorAll?.('.detailPreview').forEach(node=>replaceInlineSvg(node,icons.photo,'photo'));
    root.querySelectorAll?.('.parkingAssistButtons button,.parkingRecallActions button').forEach(button=>{
      const text=button.textContent||'';
      const key=text.includes('話')||text.includes('音声')?'audio':text.includes('撮')||text.includes('写真')?'photo':text.includes('地図')||text.includes('戻る')?'route':text.includes('メモ')?'memo':'pin';
      replaceInlineSvg(button,icons[key],key);
    });
    root.querySelectorAll?.('.parkingRecallEvidence > div').forEach(row=>{
      const text=row.textContent||'';
      const key=text.includes('音声')?'audio':text.includes('写真')?'photo':'pin';
      replaceInlineSvg(row,icons[key],key);
    });
  }

  function normalizeLegacyChrome(root=document){
    root.documentElement?.classList?.add('outbase-ui-v21');
    root.body?.classList?.add('ob21-body');
    let legacyTab='';
    try{legacyTab=new URLSearchParams(location.search).get('tab')||location.hash.replace('#','');}catch(_error){}
    const protectField03=legacyTab==='record';
    if(!protectField03){
      root.querySelectorAll?.('.header').forEach(node=>node.classList.add('ob21-legacy-header'));
      root.querySelectorAll?.('.bottomNav').forEach(nav=>{
        if(nav.dataset.ob21Unified==='1')return;
        nav.dataset.ob21Unified='1';
        nav.classList.add('ob21-legacy-nav');
        nav.innerHTML=legacyNavMarkup();
      });
    }
    root.querySelectorAll?.('[data-plan-sheet-panel],.planSheet,.planEditSheet,.recordSheet,.prepSheet,.librarySheet,.flowApp,.flowPrepDashboard').forEach(node=>node.classList.add('ob21-legacy-surface'));
    normalizeLegacyIcons(root);
  }

  function openAddFromRoute(){
    const query=new URLSearchParams(location.search);
    if(query.get('openAdd')!=='1')return;
    const clean=()=>{const next=new URL(location.href);next.searchParams.delete('openAdd');history.replaceState(history.state,'',next.href);};
    let tries=0;
    const attempt=()=>{
      tries++;
      const renderer=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
      if(renderer?.showCentral){renderer.showCentral();clean();return;}
      const button=document.querySelector('[data-ob3-central]');
      if(button){button.click();clean();return;}
      if(tries<30)setTimeout(attempt,80);else clean();
    };
    attempt();
  }

  document.addEventListener('click',event=>{
    const control=event.target.closest?.('[data-ob21-route]');
    if(!control)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const route=control.dataset.ob21Route;
    if(route==='add'){
      location.assign(`${shellUrl('home')}${shellUrl('home').includes('?')?'&':'?'}openAdd=1`);
      return;
    }
    location.assign(shellUrl(route));
  },true);

  const boot=()=>{
    normalizeLegacyChrome(document);
    openAddFromRoute();
    const observer=new MutationObserver(()=>normalizeLegacyChrome(document));
    observer.observe(document.documentElement,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

  globalThis.OUTBASE_UI_V21=Object.freeze({icons,categoryIcons,svg,shellUrl,normalizeLegacyChrome,normalizeLegacyIcons,setSharedIcon,replaceInlineSvg});
})();
