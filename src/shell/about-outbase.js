(() => {
  'use strict';

  const MODAL_ID='outbaseAboutModal';

  function esc(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function version(){
    return globalThis.OUTBASE_VERSION?.app
      || document.querySelector('meta[name="application-name"]')?.content
      || 'OUTBASE';
  }

  function modalMarkup(){
    return `
      <div id="${MODAL_ID}" class="ob-about-modal" hidden>
        <div class="ob-about-backdrop" data-about-close></div>
        <section class="ob-about-sheet" role="dialog" aria-modal="true" aria-labelledby="obAboutTitle">
          <div class="ob-about-grab" aria-hidden="true"></div>

          <header class="ob-about-head">
            <div class="ob-about-title-copy">
              <small>OUTBASE</small>
              <h2 id="obAboutTitle">このアプリについて</h2>
              <p>アプリ情報・権利・外部サービス</p>
            </div>
            <button type="button" aria-label="閉じる" data-about-close>×</button>
          </header>

          <div class="ob-about-body">
            <section class="ob-about-brand ob-home-card">
              <div class="ob-about-brand-top">
                <b>OUTBASE</b>
                <span>バージョン ${esc(version())}</span>
              </div>
              <p>© 2026 OUTBASE. All rights reserved.</p>
            </section>

            <details class="ob-about-section ob-home-card" open>
              <summary>
                <span><small>RIGHTS</small><b>著作権</b></span>
              </summary>
              <div>
                <p>本アプリの独自プログラム、デザイン、ロゴおよび独自コンテンツの無断転載・複製を禁じます。</p>
              </div>
            </details>

            <details class="ob-about-section ob-home-card">
              <summary>
                <span><small>SERVICES</small><b>外部サービス・データ提供元</b></span>
              </summary>
              <div>
                <p>地図、天気、外部リンクなど、提供元が画面付近での表示を求めるものは、該当画面のクレジット表示を優先します。</p>
                <p>一覧へ集約できる提供元情報は、外部参照監査に合わせて追加します。</p>
              </div>
            </details>

            <details class="ob-about-section ob-home-card">
              <summary>
                <span><small>LICENSES</small><b>オープンソースライブラリ</b></span>
              </summary>
              <div class="ob-about-license-list">
                <article><b>SheetJS Community Edition</b><span>Excel・表計算データ処理</span></article>
                <article><b>PDF.js</b><span>PDF表示・解析</span></article>
                <article><b>Tesseract.js</b><span>文字認識処理</span></article>
                <p>各ライブラリの著作権およびライセンスは、それぞれの権利者に帰属します。</p>
              </div>
            </details>

            <details class="ob-about-section ob-home-card">
              <summary>
                <span><small>POLICY</small><b>プライバシー・利用条件</b></span>
              </summary>
              <div>
                <p>プライバシーポリシーと利用規約は、一般公開・配布前に正式版を掲載します。</p>
              </div>
            </details>
          </div>
        </section>
      </div>`;
  }

  function ensureModal(){
    if(document.getElementById(MODAL_ID))return document.getElementById(MODAL_ID);
    document.body.insertAdjacentHTML('beforeend',modalMarkup());
    const modal=document.getElementById(MODAL_ID);
    modal.querySelectorAll('[data-about-close]').forEach(node=>node.addEventListener('click',close));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)close()});
    return modal;
  }

  function open(){
    const modal=ensureModal();
    modal.hidden=false;
    document.documentElement.classList.add('ob-about-open');
    modal.querySelector('.ob-about-head button')?.focus();
  }

  function close(){
    const modal=document.getElementById(MODAL_ID);
    if(!modal)return;
    modal.hidden=true;
    document.documentElement.classList.remove('ob-about-open');
  }

  function attachToSettings(){
    document.addEventListener('click',event=>{
      const settings=event.target?.closest?.('[aria-label="設定"],[data-ob-action="settings"],[data-ob3-action="settings"]');
      if(!settings)return;
      setTimeout(()=>{
        const panel=document.querySelector('.settings-panel,.ob-settings,.ob3-settings,[data-settings-panel]');
        if(!panel||panel.querySelector('[data-open-about]'))return;
        const button=document.createElement('button');
        button.type='button';
        button.dataset.openAbout='1';
        button.className='ob-about-settings-link';
        button.textContent='このアプリについて';
        button.addEventListener('click',open);
        panel.appendChild(button);
      },0);
    },true);
  }

  function boot(){
    ensureModal();
    attachToSettings();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  globalThis.OUTBASE_ABOUT=Object.freeze({open,close,version:'about-v3-home-visual-lock'});
})();
