(function(){
  'use strict';

  const EVENT_KEY='outbase_asset_events_v1';
  const GEAR_KEY='outbase_gear_library_v1';
  const KIT_KEY='outbase_gear_kits_v1';
  const EDITOR_TYPE_KEY='outbase_library_hotfix_editor_type';
  const EDITOR_ID_KEY='outbase_library_hotfix_editor_id';
  const SCROLL_PREFIX='outbase_library_scroll_fix2:';

  const readJson=(key,fallback)=>{
    try{
      const value=JSON.parse(localStorage.getItem(key));
      return value==null?fallback:value;
    }catch(_e){return fallback;}
  };
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const makeId=()=>`event-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const today=()=>new Date().toISOString().slice(0,10);

  function currentScrollKey(){
    const tab=localStorage.getItem('outbase_library_tab_v1')||'gear';
    const view=localStorage.getItem('outbase_library_gear_view_v1')||'items';
    return SCROLL_PREFIX+(tab==='gear'?`${tab}:${view}`:tab);
  }

  function saveScroll(){
    const scroller=document.querySelector('.libraryPageScroll');
    if(scroller)sessionStorage.setItem(currentScrollKey(),String(scroller.scrollTop||0));
  }

  function restoreScroll(){
    const scroller=document.querySelector('.libraryPageScroll');
    if(!scroller)return;
    const value=Number(sessionStorage.getItem(currentScrollKey())||0);
    requestAnimationFrame(()=>{scroller.scrollTop=Math.max(0,value);});
  }

  function fixTransferIcon(){
    const button=document.querySelector('[data-transfer-section="bulk"]');
    if(!button)return;
    const icon=button.querySelector('i');
    if(icon&&(!icon.innerHTML.trim()||icon.textContent.trim()==='undefined')){
      icon.innerHTML='<span aria-hidden="true" style="font-size:24px;font-weight:700;line-height:1">＋</span>';
    }
    Array.from(button.childNodes).forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE&&node.textContent.includes('undefined'))node.textContent=node.textContent.replace(/undefined/g,'');
    });
  }

  function bindScroller(){
    const scroller=document.querySelector('.libraryPageScroll');
    if(!scroller||scroller.dataset.hotfixScrollBound==='1')return;
    scroller.dataset.hotfixScrollBound='1';
    scroller.addEventListener('scroll',()=>{
      sessionStorage.setItem(currentScrollKey(),String(scroller.scrollTop||0));
    },{passive:true});
    restoreScroll();
  }

  function normalizeKitReferences(){
    const gears=readJson(GEAR_KEY,[]);
    const kits=readJson(KIT_KEY,[]);
    if(!Array.isArray(gears)||!Array.isArray(kits))return;
    const ids=new Set(gears.map(x=>x&&x.id).filter(Boolean));
    let changed=false;
    const next=kits.map(kit=>{
      if(!kit||typeof kit!=='object')return kit;
      const gearIds=Array.isArray(kit.gearIds)?kit.gearIds.filter(id=>ids.has(id)):[];
      const requiredGearIds=Array.isArray(kit.requiredGearIds)?kit.requiredGearIds.filter(id=>gearIds.includes(id)):gearIds.slice();
      if(JSON.stringify(gearIds)!==JSON.stringify(kit.gearIds||[])||JSON.stringify(requiredGearIds)!==JSON.stringify(kit.requiredGearIds||[]))changed=true;
      return {...kit,gearIds,requiredGearIds};
    });
    if(changed)writeJson(KIT_KEY,next);
  }

  function saveAssetEvent(){
    const targetRaw=document.getElementById('lib-event-target')?.value||'';
    const [targetType,targetId]=targetRaw.split(':');
    const eventType=document.getElementById('lib-event-type')?.value||'使用';
    const date=document.getElementById('lib-event-date')?.value||today();
    const title=(document.getElementById('lib-name')?.value||'').trim();
    const detail=(document.getElementById('lib-memo')?.value||'').trim();
    const rawCost=document.getElementById('lib-event-cost')?.value??'';
    const nextDate=document.getElementById('lib-event-next')?.value||'';

    if(!targetId){alert('対象を選択してください');return false;}
    if(!title){alert('内容を入力してください');return false;}

    const events=readJson(EVENT_KEY,[]);
    const rows=Array.isArray(events)?events:[];
    const editingId=sessionStorage.getItem(EDITOR_ID_KEY)||'';
    const index=editingId?rows.findIndex(x=>x&&x.id===editingId):-1;
    const previous=index>=0?rows[index]:null;
    const row={
      id:previous?.id||makeId(),
      targetType:['gear','mobility','pet'].includes(targetType)?targetType:'gear',
      targetId,
      eventType,
      date,
      title,
      detail,
      cost:rawCost===''?'':Math.max(0,Number(rawCost)||0),
      nextDate,
      createdAt:Number(previous?.createdAt||Date.now())
    };
    if(index>=0)rows[index]={...previous,...row};else rows.unshift(row);
    writeJson(EVENT_KEY,rows);
    sessionStorage.removeItem(EDITOR_ID_KEY);
    sessionStorage.removeItem(EDITOR_TYPE_KEY);
    alert('共通台帳へ保存しました');
    location.reload();
    return true;
  }

  document.addEventListener('click',event=>{
    const edit=event.target.closest?.('[data-library-edit]');
    if(edit){
      sessionStorage.setItem(EDITOR_TYPE_KEY,edit.dataset.libraryEdit||'');
      sessionStorage.setItem(EDITOR_ID_KEY,edit.dataset.libraryId||'');
    }
    const add=event.target.closest?.('[data-library-add]');
    if(add){
      sessionStorage.setItem(EDITOR_TYPE_KEY,add.dataset.libraryAdd||'');
      sessionStorage.removeItem(EDITOR_ID_KEY);
    }

    const tab=event.target.closest?.('[data-library-tab],[data-library-gear-view],[data-dashboard-jump]');
    if(tab){
      saveScroll();
      setTimeout(()=>{bindScroller();restoreScroll();fixTransferIcon();},40);
    }

    const button=event.target.closest?.('button');
    const save=event.target.closest?.('[data-library-save],[data-library-editor-save],[data-save-library]')
      ||(button&&document.querySelector('.libraryEditor')&&document.getElementById('lib-event-target')&&button.textContent.trim()==='保存'?button:null);
    if(save&&document.getElementById('lib-event-target')){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      saveAssetEvent();
      return;
    }

    const del=event.target.closest?.('[data-library-delete]');
    if(del&&sessionStorage.getItem(EDITOR_TYPE_KEY)==='gear'){
      setTimeout(normalizeKitReferences,80);
    }
  },true);

  const observer=new MutationObserver(()=>{
    bindScroller();
    fixTransferIcon();
  });

  window.addEventListener('DOMContentLoaded',()=>{
    observer.observe(document.body,{childList:true,subtree:true});
    bindScroller();
    fixTransferIcon();
    normalizeKitReferences();
  });
})();
