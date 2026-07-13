(() => {
  'use strict';

  const VERSION='1.0.0';
  const DB_NAME='outbase_db';
  const STORE_NAME='coreImportBlobs';

  const api=()=>globalThis.OUTBASE_CORE||null;
  const now=()=>new Date().toISOString();

  function openDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,11);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)){
          db.createObjectStore(STORE_NAME,{keyPath:'blobId'});
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  async function saveBlob(file,importId){
    const db=await openDb();
    const blobId=`import_blob_${importId}`;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');
      tx.objectStore(STORE_NAME).put({
        blobId,importId,fileName:file.name,mimeType:file.type||'application/octet-stream',
        size:file.size,lastModified:file.lastModified||null,blob:file,storedAt:now()
      });
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
    return blobId;
  }

  async function sha256(file){
    if(!crypto?.subtle)return null;
    const buffer=await file.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',buffer);
    return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  }

  function classify(file){
    const name=String(file.name||'').toLowerCase();
    const mime=String(file.type||'').toLowerCase();
    if(mime.startsWith('image/'))return 'image';
    if(mime.startsWith('audio/'))return 'audio';
    if(mime.startsWith('video/'))return 'video';
    if(mime==='application/pdf'||name.endsWith('.pdf'))return 'pdf';
    if(name.endsWith('.xlsx')||name.endsWith('.xls')||name.endsWith('.csv'))return 'spreadsheet';
    if(mime.startsWith('text/')||name.endsWith('.txt')||name.endsWith('.md')||name.endsWith('.json'))return 'text';
    return 'file';
  }

  async function extractText(file,kind){
    if(kind==='text'){
      return (await file.text()).slice(0,200000);
    }
    if(kind==='spreadsheet'&&globalThis.XLSX){
      const workbook=globalThis.XLSX.read(await file.arrayBuffer(),{type:'array'});
      return workbook.SheetNames.map(name=>{
        const sheet=workbook.Sheets[name];
        return `# ${name}\n${globalThis.XLSX.utils.sheet_to_csv(sheet)}`;
      }).join('\n').slice(0,300000);
    }
    if(kind==='pdf'&&globalThis.pdfjsLib){
      const document=await globalThis.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
      const pages=[];
      for(let pageNo=1;pageNo<=document.numPages;pageNo++){
        const page=await document.getPage(pageNo);
        const content=await page.getTextContent();
        pages.push(content.items.map(item=>item.str).join(' '));
      }
      return pages.join('\n').slice(0,300000);
    }
    if(kind==='image'&&globalThis.Tesseract){
      const result=await globalThis.Tesseract.recognize(file,'jpn+eng');
      return String(result?.data?.text||'').slice(0,200000);
    }
    return '';
  }

  function candidateType(kind,text,file){
    const source=`${file.name}\n${text}`.toLowerCase();
    if(/receipt|領収|レシート|合計|税込/.test(source))return 'receipt';
    if(/予約|チェックイン|宿泊|キャンプ場/.test(source))return 'reservation';
    if(/購入|注文|商品|snow peak|スノーピーク/.test(source))return 'purchase';
    if(kind==='audio')return 'audio_note';
    return `${kind}_import`;
  }

  async function ingestFile(file,context={}){
    const core=api();
    if(!core)throw new Error('OUTBASE_CORE is not ready');

    const kind=classify(file);
    const importJob=core.createImportJob({
      sourceType:kind,fileName:file.name,mimeType:file.type,size:file.size,
      state:'queued',planIds:context.planIds||[],activityIds:context.activityIds||[]
    });

    try{
      core.updateImportJob(importJob.importId,{state:'processing',startedAt:now()});
      const [hash,blobId]=await Promise.all([
        sha256(file).catch(()=>null),
        saveBlob(file,importJob.importId)
      ]);

      const media=core.saveMedia({
        importId:importJob.importId,kind,fileName:file.name,mimeType:file.type,
        size:file.size,hash,originalRef:{db:DB_NAME,store:STORE_NAME,key:blobId},
        capturedAt:file.lastModified?new Date(file.lastModified).toISOString():null
      });

      [
        ['file_name',file.name],['mime_type',file.type||''],['size',file.size],
        ['last_modified',file.lastModified||null],['sha256',hash],['kind',kind]
      ].forEach(([key,value])=>core.saveMetadata({
        importId:importJob.importId,mediaId:media.mediaId,key,value,
        source:'local-file',immutable:true
      }));

      const text=await extractText(file,kind).catch(()=> '');
      if(text){
        if(kind==='audio'){
          core.saveTranscript({
            importId:importJob.importId,mediaId:media.mediaId,text,
            source:'speech-recognition',state:'raw'
          });
        }
        core.saveMetadata({
          importId:importJob.importId,mediaId:media.mediaId,
          key:'extracted_text',value:text,source:'local-extractor'
        });
        core.saveCandidate({
          importId:importJob.importId,
          candidateType:candidateType(kind,text,file),
          payload:{fileName:file.name,kind,text},
          source:'local-extractor',state:'pending'
        });
      }else{
        core.saveCandidate({
          importId:importJob.importId,
          candidateType:candidateType(kind,'',file),
          payload:{fileName:file.name,kind,requiresExtraction:true},
          source:'local-classifier',state:'pending'
        });
      }

      core.updateImportJob(importJob.importId,{
        state:'completed',completedAt:now(),hash
      });
      return {importId:importJob.importId,mediaId:media.mediaId,kind};
    }catch(error){
      core.updateImportJob(importJob.importId,{
        state:'failed',failedAt:now(),error:String(error?.message||error),
        retryable:true
      });
      throw error;
    }
  }

  async function ingestFiles(files,context={}){
    const results=[];
    for(const file of Array.from(files||[])){
      try{results.push({ok:true,...await ingestFile(file,context)});}
      catch(error){results.push({ok:false,fileName:file.name,error:String(error?.message||error)});}
    }
    return results;
  }

  const publicApi={VERSION,ingestFile,ingestFiles,classify};
  globalThis.OUTBASE_IMPORT=Object.freeze(publicApi);
  globalThis.dispatchEvent(new CustomEvent('outbase:import-ready',{detail:{version:VERSION}}));

  const input=document.getElementById('fileInput');
  if(input&&!input.dataset.coreImportBound){
    input.dataset.coreImportBound='1';
    input.addEventListener('change',async()=>{
      if(!input.files?.length)return;
      const core=api();
      const context=core?.contextSnapshot?.()||{};
      const results=await ingestFiles(input.files,{
        planIds:context.planIds||[],
        activityIds:context.activityIds||[]
      });
      globalThis.dispatchEvent(new CustomEvent('outbase:import-complete',{detail:{results}}));
      input.value='';
    });
  }
})();
