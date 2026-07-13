(() => {
  'use strict';

  const SCHEMA_VERSION='outbase-chappy-v1';

  function core(){
    if(!globalThis.OUTBASE_CORE)throw new Error('OUTBASE_CORE is not ready');
    return globalThis.OUTBASE_CORE;
  }

  function compact(value,max=12000){
    const text=typeof value==='string'?value:JSON.stringify(value);
    return text.length<=max?text:`${text.slice(0,max)}\n…省略`;
  }

  function selectedContext(options={}){
    const snapshot=core().snapshot();
    const include=options.include||[
      'activities','intents','parkings','memos','events','facts','relations',
      'imports','metadata','candidates'
    ];
    const data={};
    include.forEach(key=>{if(Object.prototype.hasOwnProperty.call(snapshot,key))data[key]=snapshot[key];});
    return {
      generatedAt:new Date().toISOString(),
      coreVersion:core().VERSION,
      purpose:options.purpose||'general',
      instruction:options.instruction||'',
      data
    };
  }

  function responseSchema(){
    return {
      schemaVersion:SCHEMA_VERSION,
      summary:'string',
      message:'string',
      candidates:[{
        candidateType:'string',
        value:'any',
        confidence:'number 0-1',
        reason:'string',
        sourceRefs:['entity id']
      }],
      relations:[{
        fromId:'string',
        fromType:'string',
        toId:'string',
        toType:'string',
        relationType:'string',
        confidence:'number 0-1',
        reason:'string'
      }],
      actions:[{
        actionType:'string',
        targetId:'string|null',
        payload:'object'
      }],
      warnings:['string']
    };
  }

  function generatePrompt(options={}){
    const context=selectedContext(options);
    const schema=responseSchema();
    const prompt=[
      'あなたはOUTBASEの補助AI「Chappy」です。',
      '入力データの事実を変更せず、推測は候補として分離してください。',
      '予定・プランは任意です。予定なしの活動や複数Activityを異常扱いしないでください。',
      '大量承認を要求せず、確信度が低い候補だけ確認対象にしてください。',
      '回答は説明文を付けず、指定JSONだけを返してください。',
      '',
      '【依頼】',
      options.instruction||'現在のOUTBASEデータを整理し、役立つ候補と関連を返してください。',
      '',
      '【出力JSONスキーマ】',
      JSON.stringify(schema,null,2),
      '',
      '【OUTBASEコンテキスト】',
      compact(context,options.maxContextChars||20000)
    ].join('\n');

    const request=core().saveAiRequest({
      purpose:options.purpose||'general',
      prompt,
      context,
      schemaVersion:SCHEMA_VERSION,
      state:'prepared',
      source:'outbase-chappy'
    });
    return {...request,prompt};
  }

  function parseJsonText(input){
    if(input&&typeof input==='object')return input;
    const raw=String(input||'').trim();
    if(!raw)throw new Error('JSON response is empty');
    const fenced=raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text=(fenced?fenced[1]:raw).trim();
    try{return JSON.parse(text);}catch(_e){
      const start=text.indexOf('{'),end=text.lastIndexOf('}');
      if(start>=0&&end>start)return JSON.parse(text.slice(start,end+1));
      throw new Error('JSON response could not be parsed');
    }
  }

  function clampConfidence(value){
    const n=Number(value);
    return Number.isFinite(n)?Math.max(0,Math.min(1,n)):null;
  }

  function normalizeResponse(input){
    const raw=parseJsonText(input);
    const warnings=Array.isArray(raw.warnings)?raw.warnings.map(String):[];
    const candidates=(Array.isArray(raw.candidates)?raw.candidates:[]).map((item,index)=>({
      candidateType:String(item?.candidateType||item?.type||'unknown'),
      value:item?.value??item?.payload??null,
      confidence:clampConfidence(item?.confidence),
      reason:String(item?.reason||''),
      sourceRefs:Array.isArray(item?.sourceRefs)?item.sourceRefs.filter(Boolean).map(String):[],
      order:index
    }));
    const relations=(Array.isArray(raw.relations)?raw.relations:[]).filter(item=>
      item&&item.fromId&&item.toId
    ).map(item=>({
      fromId:String(item.fromId),
      fromType:item.fromType?String(item.fromType):null,
      toId:String(item.toId),
      toType:item.toType?String(item.toType):null,
      relationType:String(item.relationType||'related_to'),
      confidence:clampConfidence(item.confidence),
      reason:String(item.reason||'')
    }));
    const actions=(Array.isArray(raw.actions)?raw.actions:[]).map(item=>({
      actionType:String(item?.actionType||'unknown'),
      targetId:item?.targetId==null?null:String(item.targetId),
      payload:item?.payload&&typeof item.payload==='object'?item.payload:{}
    }));
    return {
      schemaVersion:String(raw.schemaVersion||SCHEMA_VERSION),
      summary:String(raw.summary||''),
      message:String(raw.message||''),
      candidates,
      relations,
      actions,
      warnings
    };
  }

  function importResponse(input,options={}){
    const normalized=normalizeResponse(input);
    const api=core();
    const saved=api.saveAiResponse({
      requestId:options.requestId||null,
      rawText:typeof input==='string'?input:JSON.stringify(input),
      normalized,
      warnings:normalized.warnings,
      schemaVersion:normalized.schemaVersion,
      state:'imported',
      source:'chatgpt'
    });

    normalized.candidates.forEach(item=>{
      api.saveCandidate({
        candidateId:`chappy_${saved.responseId}_${item.order}`,
        candidateType:item.candidateType,
        value:item.value,
        confidence:item.confidence,
        reason:item.reason,
        source:'chappy',
        status:'pending',
        sourceRefs:item.sourceRefs,
        importId:saved.responseId
      });
    });

    normalized.relations.forEach(item=>{
      api.addRelation({
        ...item,
        source:'chappy',
        evidence:[{responseId:saved.responseId,reason:item.reason}]
      });
    });

    globalThis.dispatchEvent(new CustomEvent('outbase:chappy-response',{
      detail:{responseId:saved.responseId,normalized}
    }));
    return {response:saved,normalized};
  }

  function exportRequestFile(options={}){
    const request=generatePrompt(options);
    const blob=new Blob([JSON.stringify({
      schemaVersion:SCHEMA_VERSION,
      requestId:request.requestId,
      prompt:request.prompt
    },null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`OUTBASE_Chappy依頼_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return request;
  }

  async function sharePrompt(options={}){
    const request=generatePrompt(options);
    if(navigator.share){
      await navigator.share({title:'OUTBASE → Chappy',text:request.prompt});
      return request;
    }
    await navigator.clipboard?.writeText(request.prompt);
    return request;
  }

  globalThis.OUTBASE_CHAPPY=Object.freeze({
    VERSION:'1.0.0',
    SCHEMA_VERSION,
    responseSchema,
    selectedContext,
    generatePrompt,
    normalizeResponse,
    importResponse,
    exportRequestFile,
    sharePrompt
  });

  globalThis.dispatchEvent(new CustomEvent('outbase:chappy-ready',{
    detail:{version:'1.0.0',schemaVersion:SCHEMA_VERSION}
  }));
})();
