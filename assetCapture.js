/* =========================================================
   OUTBASE assetCapture.js
   M0 v178: 写真/動画/ファイル/音声/メモ入力
   - FileReader / MediaRecorder を共通assetに変換
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const core = M0.core || {};
  const store = M0.store || {};
  let recorder = null;
  let chunks = [];
  let currentStream = null;

  function fileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = e=>resolve(e.target.result);
      reader.onerror = ()=>reject(reader.error || new Error("ファイル読込失敗"));
      reader.readAsDataURL(file);
    });
  }

  async function importFiles(fileList, options){
    const files = Array.from(fileList || []);
    const saved = [];
    const context = options?.context || (core.getActiveContext ? core.getActiveContext() : {});

    for(const file of files){
      const dataUrl = await fileToDataUrl(file);
      const kind = options?.kind || (core.classifyMime ? core.classifyMime(file.type,file.name) : "file");
      const asset = await store.saveAssetAndQueue({
        kind:kind,
        name:file.name,
        title:options?.title || file.name,
        mimeType:file.type || "",
        sizeBytes:file.size || 0,
        dataUrl:dataUrl,
        context:context,
        memo:options?.memo || ""
      });
      saved.push(asset);
    }

    if(typeof window.renderAssetM0Panels === "function") window.renderAssetM0Panels();
    return saved;
  }

  async function saveTextMemo(text, options){
    const clean = String(text || "").trim();
    if(!clean){
      alert("メモを入力してください");
      return null;
    }

    const asset = await store.saveAssetAndQueue({
      kind:"memo",
      title:options?.title || "手入力メモ",
      text:clean,
      memo:clean,
      mimeType:"text/plain",
      context:options?.context || (core.getActiveContext ? core.getActiveContext() : {})
    });

    if(typeof window.renderAssetM0Panels === "function") window.renderAssetM0Panels();
    return asset;
  }

  async function startAudio(){
    if(recorder && recorder.state === "recording"){
      alert("録音中です");
      return;
    }

    try{
      currentStream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunks = [];
      recorder = new MediaRecorder(currentStream);
      recorder.ondataavailable = e=>{
        if(e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.start();
      alert("音声メモ開始");
    }catch(error){
      console.error(error);
      alert("音声メモを開始できません");
    }
  }

  async function stopAudio(){
    if(!recorder || recorder.state !== "recording"){
      alert("録音中の音声メモはありません");
      return null;
    }

    return new Promise(resolve=>{
      recorder.onstop = async ()=>{
        const blob = new Blob(chunks,{type:"audio/webm"});
        const dataUrl = await fileToDataUrl(blob);
        const asset = await store.saveAssetAndQueue({
          kind:"audio",
          title:"音声メモ",
          name:"audio_" + Date.now() + ".webm",
          mimeType:"audio/webm",
          sizeBytes:blob.size || 0,
          dataUrl:dataUrl,
          transcript:"",
          context:core.getActiveContext ? core.getActiveContext() : {}
        });

        if(currentStream){
          currentStream.getTracks().forEach(track=>track.stop());
          currentStream = null;
        }

        recorder = null;
        chunks = [];
        if(typeof window.renderAssetM0Panels === "function") window.renderAssetM0Panels();
        alert("音声メモ保存");
        resolve(asset);
      };

      recorder.stop();
    });
  }

  function isRecording(){
    return Boolean(recorder && recorder.state === "recording");
  }

  M0.capture = {
    importFiles,
    saveTextMemo,
    startAudio,
    stopAudio,
    isRecording
  };

  window.OUTBASE_ASSET_M0 = M0;
  window.importAssetM0Files = importFiles;
  window.saveAssetM0Memo = saveTextMemo;
  window.startAssetM0Audio = startAudio;
  window.stopAssetM0Audio = stopAudio;
})();
