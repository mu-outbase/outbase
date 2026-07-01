/* =========================================================
   OUTBASE assetCapture.js
   M0 v186: 音声メモ音量強化 + 同時文字起こし
   - 写真/動画/ファイル/音声/メモ入力
   - 音声メモはWeb Audioで録音前に音量を持ち上げる
   - Android Chrome想定で Web Speech API による同時文字起こし
   - app.js本体は触らない
========================================================= */
(function(){
  "use strict";

  const M0 = window.OUTBASE_ASSET_M0 || {};
  const core = M0.core || {};
  const store = M0.store || {};
  const DEFAULT_AUDIO_GAIN = 3.0;

  let recorder = null;
  let chunks = [];
  let currentStream = null;
  let recordStream = null;
  let currentAudioContext = null;
  let currentGainNode = null;
  let currentGainValue = DEFAULT_AUDIO_GAIN;

  let speechRecognition = null;
  let transcriptFinal = "";
  let transcriptInterim = "";
  let transcriptSupported = false;
  let transcriptActive = false;
  let transcriptError = "";

  function fileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = e=>resolve(e.target.result);
      reader.onerror = ()=>reject(reader.error || new Error("ファイル読込失敗"));
      reader.readAsDataURL(file);
    });
  }

  function getAudioConstraints(){
    return {
      audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true,
        channelCount:1
      }
    };
  }

  function getSupportedRecorderOptions(){
    const candidates = [
      {mimeType:"audio/webm;codecs=opus"},
      {mimeType:"audio/webm"},
      {mimeType:"audio/mp4"}
    ];

    if(typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function"){
      return undefined;
    }

    return candidates.find(option=>MediaRecorder.isTypeSupported(option.mimeType));
  }

  function makeCompressor(audioContext){
    if(!audioContext || typeof audioContext.createDynamicsCompressor !== "function"){
      return null;
    }

    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    return compressor;
  }

  function createAmplifiedStream(sourceStream,gainValue){
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if(!AudioContextClass || !sourceStream){
      return {
        stream:sourceStream,
        audioContext:null,
        gainNode:null,
        gainValue:1,
        mode:"raw_stream"
      };
    }

    try{
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(sourceStream);
      const gainNode = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      const compressor = makeCompressor(audioContext);

      gainNode.gain.value = gainValue;
      source.connect(gainNode);

      if(compressor){
        gainNode.connect(compressor);
        compressor.connect(destination);
      }else{
        gainNode.connect(destination);
      }

      return {
        stream:destination.stream,
        audioContext:audioContext,
        gainNode:gainNode,
        gainValue:gainValue,
        mode:"web_audio_gain"
      };
    }catch(error){
      console.error("音声増幅ストリーム作成失敗",error);
      return {
        stream:sourceStream,
        audioContext:null,
        gainNode:null,
        gainValue:1,
        mode:"raw_stream_fallback"
      };
    }
  }

  function getSpeechRecognitionClass(){
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function cleanTranscript(text){
    return String(text || "")
      .replace(/\s+/g," ")
      .trim();
  }

  function notifyTranscriptUpdate(){
    if(typeof window.updateAssetM0Transcript === "function"){
      window.updateAssetM0Transcript(getTranscriptInfo());
    }
  }

  function resetTranscript(){
    transcriptFinal = "";
    transcriptInterim = "";
    transcriptError = "";
    transcriptActive = false;
    notifyTranscriptUpdate();
  }

  function startTranscript(){
    resetTranscript();
    const RecognitionClass = getSpeechRecognitionClass();
    transcriptSupported = Boolean(RecognitionClass);

    if(!RecognitionClass){
      transcriptError = "このブラウザでは文字起こし未対応";
      notifyTranscriptUpdate();
      return false;
    }

    try{
      speechRecognition = new RecognitionClass();
      speechRecognition.lang = "ja-JP";
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.maxAlternatives = 1;

      speechRecognition.onstart = ()=>{
        transcriptActive = true;
        transcriptError = "";
        notifyTranscriptUpdate();
      };

      speechRecognition.onresult = event=>{
        let interim = "";
        let finalText = "";

        for(let i=event.resultIndex;i<event.results.length;i++){
          const result = event.results[i];
          const text = result && result[0] ? result[0].transcript : "";
          if(result.isFinal){
            finalText += text;
          }else{
            interim += text;
          }
        }

        if(finalText){
          transcriptFinal = cleanTranscript(transcriptFinal + " " + finalText);
        }
        transcriptInterim = cleanTranscript(interim);
        notifyTranscriptUpdate();
      };

      speechRecognition.onerror = event=>{
        transcriptError = event?.error ? "文字起こしエラー：" + event.error : "文字起こしエラー";
        notifyTranscriptUpdate();
      };

      speechRecognition.onend = ()=>{
        transcriptActive = false;
        notifyTranscriptUpdate();
      };

      speechRecognition.start();
      return true;
    }catch(error){
      console.error("文字起こし開始失敗",error);
      speechRecognition = null;
      transcriptError = "文字起こし開始失敗";
      transcriptActive = false;
      notifyTranscriptUpdate();
      return false;
    }
  }

  function stopTranscript(){
    if(speechRecognition){
      try{
        speechRecognition.stop();
      }catch(error){
        console.error("文字起こし停止失敗",error);
      }
    }
    transcriptActive = false;
    notifyTranscriptUpdate();
  }

  function getTranscriptText(){
    return cleanTranscript([transcriptFinal,transcriptInterim].filter(Boolean).join(" "));
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

  function cleanupAudioResources(){
    try{
      if(currentStream){
        currentStream.getTracks().forEach(track=>track.stop());
      }
      if(recordStream && recordStream !== currentStream){
        recordStream.getTracks().forEach(track=>track.stop());
      }
      if(currentAudioContext && typeof currentAudioContext.close === "function"){
        currentAudioContext.close();
      }
    }catch(error){
      console.error("音声リソース解放失敗",error);
    }

    currentStream = null;
    recordStream = null;
    currentAudioContext = null;
    currentGainNode = null;
  }

  async function startAudio(){
    if(recorder && recorder.state === "recording"){
      alert("録音中です");
      return;
    }

    try{
      currentStream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      const amplified = createAmplifiedStream(currentStream,DEFAULT_AUDIO_GAIN);
      recordStream = amplified.stream;
      currentAudioContext = amplified.audioContext;
      currentGainNode = amplified.gainNode;
      currentGainValue = amplified.gainValue;
      chunks = [];

      const options = getSupportedRecorderOptions();
      recorder = options ? new MediaRecorder(recordStream,options) : new MediaRecorder(recordStream);

      recorder.ondataavailable = e=>{
        if(e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onerror = error=>{
        console.error("音声メモ録音エラー",error);
        alert("音声メモの録音中にエラーが出ました");
        stopTranscript();
        cleanupAudioResources();
      };

      recorder.start();
      startTranscript();
      alert("音声メモ開始（音量強化・文字起こし）");
    }catch(error){
      console.error(error);
      stopTranscript();
      cleanupAudioResources();
      alert("音声メモを開始できません");
    }
  }

  async function stopAudio(){
    if(!recorder || recorder.state !== "recording"){
      alert("録音中の音声メモはありません");
      return null;
    }

    const transcriptAtStop = getTranscriptText();
    stopTranscript();

    return new Promise(resolve=>{
      recorder.onstop = async ()=>{
        try{
          const mimeType = recorder?.mimeType || "audio/webm";
          const blob = new Blob(chunks,{type:mimeType});
          const dataUrl = await fileToDataUrl(blob);
          const transcript = cleanTranscript(transcriptAtStop || getTranscriptText());
          const asset = await store.saveAssetAndQueue({
            kind:"audio",
            title:"音声メモ",
            name:"audio_" + Date.now() + ".webm",
            mimeType:mimeType,
            sizeBytes:blob.size || 0,
            dataUrl:dataUrl,
            transcript:transcript,
            text:transcript,
            audioGain:currentGainValue,
            audioProcessing:"web_audio_gain_speech_v186",
            speechRecognitionSupported:transcriptSupported,
            memo:transcript || "音量強化録音",
            context:core.getActiveContext ? core.getActiveContext() : {}
          });

          recorder = null;
          chunks = [];
          cleanupAudioResources();
          if(typeof window.renderAssetM0Panels === "function") window.renderAssetM0Panels();
          alert(transcript ? "音声メモ保存（文字起こしあり）" : "音声メモ保存（文字起こしなし）");
          resetTranscript();
          resolve(asset);
        }catch(error){
          console.error("音声メモ保存失敗",error);
          recorder = null;
          chunks = [];
          cleanupAudioResources();
          resetTranscript();
          alert("音声メモ保存に失敗しました");
          resolve(null);
        }
      };

      recorder.stop();
    });
  }

  function isRecording(){
    return Boolean(recorder && recorder.state === "recording");
  }

  function getAudioGainInfo(){
    return {
      active:isRecording(),
      gain:currentGainValue,
      mode:currentGainNode ? "web_audio_gain" : "raw_stream"
    };
  }

  function getTranscriptInfo(){
    return {
      supported:transcriptSupported,
      active:transcriptActive,
      finalText:transcriptFinal,
      interimText:transcriptInterim,
      text:getTranscriptText(),
      error:transcriptError
    };
  }

  M0.capture = {
    importFiles,
    saveTextMemo,
    startAudio,
    stopAudio,
    isRecording,
    getAudioGainInfo,
    getTranscriptInfo
  };

  window.OUTBASE_ASSET_M0 = M0;
  window.importAssetM0Files = importFiles;
  window.saveAssetM0Memo = saveTextMemo;
  window.startAssetM0Audio = startAudio;
  window.stopAssetM0Audio = stopAudio;
  window.getAssetM0AudioGainInfo = getAudioGainInfo;
  window.getAssetM0TranscriptInfo = getTranscriptInfo;
})();
