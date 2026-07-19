(() => {
  'use strict';

  const rendererBase=
    globalThis.OUTBASE_SHELL_RENDERER_V166||
    globalThis.OUTBASE_SHELL_RENDERER_V165||
    globalThis.OUTBASE_SHELL_RENDERER_V164;

  if(!rendererBase)throw new Error('OUTBASE add menu renderer is not ready');
  if(rendererBase.__addMenuV12)return;

  const icons={
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
    memo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
  };

  function addSheetMarkup(){
    return `<div class="ob3-backdrop ob12-add-backdrop" data-ob3-backdrop>
      <section class="ob3-sheet ob12-add-sheet" role="dialog" aria-modal="true" aria-labelledby="ob12AddTitle">
        <div class="ob3-sheet-handle"></div>
        <div class="ob3-sheet-head ob12-add-head">
          <div>
            <h2 id="ob12AddTitle">何をする？</h2>
            <p>新しく作る・今から始める</p>
          </div>
          <button type="button" data-ob3-close aria-label="閉じる">×</button>
        </div>

        <div class="ob12-add-actions">
          <button type="button" class="tone-plan" data-ob3-action="plan-add">
            <span class="ob12-add-icon">${icons.calendar}</span>
            <span><b>予定を追加</b><em>これからの予定をカレンダーへ</em></span>
            ${icons.arrow}
          </button>

          <button type="button" class="tone-start" data-ob3-action="start">
            <span class="ob12-add-icon">${icons.play}</span>
            <span><b>活動を始める</b><em>散歩・キャンプ・ドライブを記録開始</em></span>
            ${icons.arrow}
          </button>

          <button type="button" class="tone-record" data-ob3-action="memo">
            <span class="ob12-add-icon">${icons.memo}</span>
            <span><b>記録を残す</b><em>気づきやメモをすぐに残す</em></span>
            ${icons.arrow}
          </button>

          <button type="button" class="tone-gear" data-ob12-action="gear-add">
            <span class="ob12-add-icon">${icons.gear}</span>
            <span><b>持ち物を登録</b><em>ギア・消耗品を共通台帳へ</em></span>
            ${icons.arrow}
          </button>
        </div>
      </section>
    </div>`;
  }

  const renderer=Object.freeze({
    ...rendererBase,
    __addMenuV12:true,
    showCentral(){
      const host=document.getElementById('outbaseShellModal');
      if(host)host.innerHTML=addSheetMarkup();
    }
  });

  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;

  function closeCentral(){
    renderer.hideCentral?.();
    const stack=globalThis.OUTBASE_MODAL_STACK_V164;
    if(stack?.top?.()?.id==='central')stack.close?.();
  }

  function openLegacyGearAdd(){
    closeCentral();
    const next=new URL(location.href);
    next.search='';
    next.hash='';
    next.searchParams.set('tab','prep');
    next.searchParams.set('outbaseAdd','gear');
    location.assign(next.href);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-ob12-action]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if(button.dataset.ob12Action==='gear-add'){
      openLegacyGearAdd();
    }
  },true);

  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function waitFor(selector,timeout=5000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      const node=document.querySelector(selector);
      if(node)return node;
      await delay(80);
    }
    return null;
  }

  async function openGearEditorFromLegacyRoute(){
    const query=new URLSearchParams(location.search);
    if(query.get('outbaseAdd')!=='gear')return;
    if(query.get('tab')!=='prep')return;

    const cleanUrl=()=>{
      const next=new URL(location.href);
      next.searchParams.delete('outbaseAdd');
      history.replaceState(history.state,'',next.href);
    };

    try{
      const manager=await waitFor('[data-open-gear-manager]');
      if(!manager){cleanUrl();return;}
      manager.click();

      const gearTab=await waitFor('[data-library-tab="gear"]');
      gearTab?.click();

      const itemsTab=await waitFor('[data-library-gear-view="items"]');
      itemsTab?.click();

      const addButton=await waitFor('[data-library-add="gear"]');
      if(!addButton){cleanUrl();return;}
      addButton.click();

      await waitFor('#lib-name',3000);
      cleanUrl();
    }catch(_error){
      cleanUrl();
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',openGearEditorFromLegacyRoute,{once:true});
  }else{
    openGearEditorFromLegacyRoute();
  }
})();
