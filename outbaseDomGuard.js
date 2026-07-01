/* =========================================================
   OUTBASE outbaseDomGuard.js
   UI v191: ホーム再設計後の旧DOM参照ガード
   - app.js 本体は触らない
   - homeUI がホームを置き換えても、既存 app.js の必須IDを保持
   - 画面には表示しない
========================================================= */
(function(){
  "use strict";

  const GUARD_ID = "outbaseLegacyDomGuardV191";

  const REQUIRED_NODES = [
    {id:"storageInfo", tag:"div"},
    {id:"stats", tag:"div"},
    {id:"recordList", tag:"div"},
    {id:"searchInput", tag:"input", type:"text"},
    {id:"searchResultCount", tag:"div"},
    {id:"searchStatus", tag:"div"}
  ];

  function getGuardBox(){
    let box = document.getElementById(GUARD_ID);

    if(!box){
      box = document.createElement("div");
      box.id = GUARD_ID;
      box.setAttribute("aria-hidden","true");
      box.style.cssText = "display:none !important; visibility:hidden !important; height:0 !important; overflow:hidden !important;";
      document.body.appendChild(box);
    }

    return box;
  }

  function hasGuardedNode(box,id){
    return Boolean(box.querySelector('[data-ob-guard-id="' + id + '"]'));
  }

  function createGuardedNode(definition){
    const element = document.createElement(definition.tag || "div");
    element.id = definition.id;
    element.setAttribute("data-ob-guard-id",definition.id);

    if(definition.tag === "input"){
      element.type = definition.type || "text";
      element.value = "";
    }else{
      element.innerHTML = "";
    }

    return element;
  }

  function ensureLegacyDom(){
    if(!document.body) return;

    const box = getGuardBox();

    REQUIRED_NODES.forEach(definition=>{
      if(!hasGuardedNode(box,definition.id)){
        box.appendChild(createGuardedNode(definition));
      }
    });
  }

  function startGuard(){
    ensureLegacyDom();

    const intervalId = setInterval(ensureLegacyDom,200);

    setTimeout(()=>clearInterval(intervalId),5000);

    try{
      const observer = new MutationObserver(()=>{
        ensureLegacyDom();
      });
      observer.observe(document.body,{childList:true,subtree:false});
      window.__outbaseLegacyDomGuardObserverV191 = observer;
    }catch(error){
      console.warn("OUTBASE DOMガード監視を開始できません",error);
    }
  }

  window.ensureOutbaseLegacyDomV191 = ensureLegacyDom;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",startGuard);
  }else{
    startGuard();
  }

  window.addEventListener("load",()=>{
    ensureLegacyDom();
    setTimeout(ensureLegacyDom,300);
    setTimeout(ensureLegacyDom,1000);
  });
})();
