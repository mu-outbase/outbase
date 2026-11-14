(() => {
  'use strict';
  const CATEGORIES=Object.freeze({shopping:'買い物',gear:'持ち物',pet:'コタ用品',note:'反省'});
  const READY=new Set(['candidate','planned','preparing']);
  async function destinations(sourceId){
    return (await globalThis.OUTBASE_REPOSITORIES_V160.activities.all()).filter(a=>!a.deleted_at&&a.id!==sourceId&&READY.has(a.state));
  }
  async function apply({improvementId,displayActivityId,targetActivityId,category,title}){
    title=String(title||'').trim();
    if(!improvementId||!displayActivityId||!targetActivityId||targetActivityId===displayActivityId||!Object.hasOwn(CATEGORIES,category)||!title||title.length>240)throw Error('improvement_invalid');
    const repos=globalThis.OUTBASE_REPOSITORIES_V160;
    // Read before opening a write transaction: invalid targets cannot create a database.
    const [source,target]=await Promise.all([repos.improvementItems.get(improvementId),repos.activities.get(targetActivityId)]);
    if(!source||source.deleted_at||source.activity_id!==displayActivityId||!target||target.deleted_at)throw Error('improvement_missing');
    let failure,result;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','improvement_items','preparation_items'],'readwrite',tx=>{
      const requests=[tx.objectStore('improvement_items').get(improvementId),tx.objectStore('activities').get(targetActivityId),tx.objectStore('activities').get(displayActivityId)];
      let loaded=0;
      const fail=error=>{failure=error;tx.abort();};
      for(const request of requests)request.onsuccess=()=>{
        if(++loaded!==requests.length)return;
        try{
          const [fresh,destination,origin]=requests.map(r=>r.result);
          if(!fresh||fresh.deleted_at||fresh.activity_id!==displayActivityId||!destination||destination.deleted_at||!origin||origin.deleted_at)throw Error('improvement_missing');
          const previous=fresh.payload?.preparation_transfer;
          if(previous){
            if(previous.activity_id!==targetActivityId||previous.category!==category||previous.title!==title)throw Error('improvement_already_applied');
            const check=tx.objectStore('preparation_items').get(previous.item_id);
            check.onsuccess=()=>{if(!check.result||check.result.deleted_at){fail(Error('improvement_destination_missing'));return;}result={item:check.result,deduplicated:true};};
            return;
          }
          if(fresh.status==='completed'||!READY.has(destination.state))throw Error('improvement_state_changed');
          const now=globalThis.OUTBASE_IDS.nowIso();
          const item=repos.preparationItems.normalize({activity_id:targetActivityId,household_id:destination.household_id,category,title,status:'pending',sort_order:999,origin:'improvement',source:'improvement-preparation-v1',payload:{source_improvement_id:improvementId,source_activity_id:displayActivityId}});
          const updated=repos.improvementItems.normalize({...fresh,status:'completed',updated_at:now,payload:{...(fresh.payload||{}),preparation_transfer:{activity_id:targetActivityId,item_id:item.id,category,title,applied_at:now}}});
          globalThis.OUTBASE_VALIDATION.assertEntity('preparation_items',item);globalThis.OUTBASE_VALIDATION.assertEntity('improvement_items',updated);
          tx.objectStore('preparation_items').put(item);tx.objectStore('improvement_items').put(updated);result={item,deduplicated:false};
        }catch(error){fail(error);}
      };
    });}catch(error){throw failure||error;}
    return result;
  }
  globalThis.OUTBASE_IMPROVEMENT_PREPARATION=Object.freeze({CATEGORIES,destinations,apply});
})();
