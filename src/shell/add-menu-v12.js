(() => {
  'use strict';

  const rendererBase=
    globalThis.OUTBASE_SHELL_RENDERER_V166||
    globalThis.OUTBASE_SHELL_RENDERER_V165||
    globalThis.OUTBASE_SHELL_RENDERER_V164;

  if(!rendererBase)throw new Error('OUTBASE add menu renderer is not ready');
  if(rendererBase.__addMenuV12)return;
  const ui=globalThis.OUTBASE_UI_V21;
  if(!ui)throw new Error('OUTBASE UI v21 is not ready');
  const icons=ui.icons;

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
          <button type="button" class="tone-start" data-ob22-route="start">
            <span class="ob12-add-icon">${icons.play}</span>
            <span><b>活動を始める</b><em>散歩・キャンプ・ドライブを記録開始</em></span>
            ${icons.arrow}
          </button>

          <button type="button" class="tone-plan" data-ob22-route="plan-editor">
            <span class="ob12-add-icon">${icons.calendar}</span>
            <span><b>予定を追加</b><em>これからの予定をカレンダーへ</em></span>
            ${icons.arrow}
          </button>

          <button type="button" class="tone-record" data-ob22-route="memo">
            <span class="ob12-add-icon">${icons.memo}</span>
            <span><b>記録を残す</b><em>気づきやメモをすぐに残す</em></span>
            ${icons.arrow}
          </button>

          <button type="button" class="tone-gear" data-ob22-route="assets" data-ob22-mode="add">
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

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-ob22-route]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeCentral();
    const values=button.dataset.ob22Mode?{mode:button.dataset.ob22Mode}:{};
    globalThis.OUTBASE_ROUTER?.navigate?.(button.dataset.ob22Route||'home',values,{transition:false,skipTransition:true});
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

})();
