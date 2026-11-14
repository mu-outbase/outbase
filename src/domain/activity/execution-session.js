(() => {
  'use strict';

  const queues=new Map();
  const targets={start:'active',pause:'paused',resume:'active',end:'organizing'};
  const allowed={start:['candidate','planned','preparing'],pause:['active'],resume:['paused'],end:['active','paused']};
  const positive=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;

  function fromActivity(activity){
    const session=activity?.metadata?.execution_session_v1||{};
    const mode=['organizing','completed','archived'].includes(activity?.state)?'ended'
      :['active','paused'].includes(activity?.state)?activity.state:'idle';
    const updated=Date.parse(activity?.updated_at||activity?.updatedAt||'');
    return {
      activityId:activity?.id||'',mode,elapsedMs:positive(session.elapsed_ms),
      startedAt:mode==='active'?(positive(session.started_at_ms)||(Number.isFinite(updated)?updated:Date.now())):0,
      endedAt:session.ended_at||null
    };
  }

  async function transition(activityId,action,{expectedMode}={}){
    if(!allowed[action])throw new Error('unknown_execution_action');
    const previous=queues.get(activityId)||Promise.resolve();
    const task=previous.catch(()=>{}).then(()=>{
      const work=async()=>{
        const repo=globalThis.OUTBASE_REPOSITORIES_V160.activities;
        const activity=await repo.get(activityId);
        if(!activity||activity.deleted_at)throw new Error('activity_not_found');
        const current=fromActivity(activity);
        if(!allowed[action].includes(activity.state)||(expectedMode&&current.mode!==expectedMode)){
          throw new Error('execution_state_changed');
        }
        const now=Date.now();
        const elapsed=current.elapsedMs+(current.mode==='active'?Math.max(0,now-current.startedAt):0);
        const session={
          ...(activity.metadata?.execution_session_v1||{}),
          elapsed_ms:action==='start'?0:elapsed,
          started_at_ms:['start','resume'].includes(action)?now:0,
          updated_at:new Date(now).toISOString(),
          ended_at:action==='end'?new Date(now).toISOString():null
        };
        if(action==='start')session.began_at=new Date(now).toISOString();
        if(action==='end'&&globalThis.OUTBASE_KOTA_WALK?.isWalk(activity)){
          let result,failure;
          try{await globalThis.OUTBASE_DB_V160.transaction(['activities','calendar_entries'],'readwrite',tx=>{
            const a=tx.objectStore('activities').get(activityId),c=tx.objectStore('calendar_entries').get(activityId);let loaded=0;
            const ready=()=>{if(++loaded!==2)return;try{
              const fresh=a.result,current=fromActivity(fresh);
              if(!fresh||fresh.deleted_at||!allowed.end.includes(fresh.state)||(expectedMode&&current.mode!==expectedMode))throw Error('execution_state_changed');
              const ended=new Date(now).toISOString(),timer={...fresh.metadata.execution_session_v1,elapsed_ms:current.elapsedMs+(current.mode==='active'?Math.max(0,now-current.startedAt):0),started_at_ms:0,updated_at:ended,ended_at:ended};
              const repos=globalThis.OUTBASE_REPOSITORIES_V160;
              result=repos.activities.normalize({...fresh,state:'organizing',end_at:ended,updated_at:ended,metadata:{...fresh.metadata,execution_session_v1:timer}});
              globalThis.OUTBASE_VALIDATION.assertEntity('activities',result);tx.objectStore('activities').put(result);
              if(c.result&&!c.result.deleted_at&&c.result.activity_id===activityId&&c.result.source==='kota-walk-v1'){
                const calendar=repos.calendarEntries.normalize({...c.result,end_at:ended,updated_at:ended});globalThis.OUTBASE_VALIDATION.assertEntity('calendar_entries',calendar);tx.objectStore('calendar_entries').put(calendar);
              }
            }catch(error){failure=error;tx.abort();}};a.onsuccess=c.onsuccess=ready;
          });}catch(error){throw failure||error;}
          return result;
        }
        // State and timer live in the same activity row, so a failed save
        // cannot commit one without the other. Scheduled dates stay intact.
        return repo.save({...activity,state:targets[action],metadata:{...activity.metadata,execution_session_v1:session}});
      };
      const locks=globalThis.navigator?.locks;
      return locks?.request?locks.request(`outbase-execution:${activityId}`,work):work();
    });
    queues.set(activityId,task);
    try{return await task;}finally{if(queues.get(activityId)===task)queues.delete(activityId);}
  }

  globalThis.OUTBASE_EXECUTION_SESSION=Object.freeze({fromActivity,transition});
})();
