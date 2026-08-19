(() => {
  'use strict';

  class MemoContractError extends Error{
    constructor(code,message,detail={}){
      super(message);
      this.name='MemoContractError';
      this.code=code;
      this.detail=Object.freeze({...detail});
    }
  }

  let memoWriteQueue=Promise.resolve();
  function enqueueMemoWrite(worker){
    const pending=memoWriteQueue.then(worker,worker);
    memoWriteQueue=pending.catch(()=>undefined);
    return pending;
  }

  function create({repositories,plans,guard}){
    if(!repositories||!plans||!guard)throw new Error('Safe memo dependencies are incomplete.');
    return Object.freeze({
      async save({
        activityId='',displayActivityId='',title='',body='',target='memo',
        kind='quick',requestId=''
      }={}){
        return enqueueMemoWrite(async()=>{
          const normalizedBody=String(body||'').trim();
        if(!normalizedBody)throw new MemoContractError(
          'memo_body_required','Memo body is required.'
        );
        const requestedActivityId=String(activityId||'').trim();
        const item=requestedActivityId?await plans.get(requestedActivityId):null;
        if(requestedActivityId&&!item)throw new MemoContractError(
          'memo_activity_not_found',
          'The selected activity does not exist.',
          {activityId:requestedActivityId}
        );
        const linkedActivityId=item?.id||null;
        const displayed=String(displayActivityId||'').trim();
        if(displayed&&displayed!==String(linkedActivityId||''))throw new MemoContractError(
          'memo_context_mismatch',
          'Displayed activity and memo destination do not match.',
          {displayActivityId:displayed,activityId:linkedActivityId}
        );
        guard.assertActivitylessMemo({
          activityId:linkedActivityId,
          activityCreated:false,
          source:'safe-memo-v1'
        });
        const memoContract=globalThis.OUTBASE_DOMAIN_CONTRACTS_V1.memoContract({
          activityId:linkedActivityId,
          kind:linkedActivityId&&kind==='quick'?'activity':kind,
          requestId,
          title,
          body:normalizedBody
        });
        if(memoContract.client_request_id){
          const targetRepository=target==='improvement'
            ? repositories.improvementItems
            : repositories.records;
          const existing=(await targetRepository.all()).find(row=>
            !row.deleted_at&&String(row.client_request_id||row.payload?.client_request_id||'')===
              memoContract.client_request_id
          );
          if(existing)return Object.freeze({
            ok:true,deduplicated:true,item,activityId:linkedActivityId,
            unclassified:!linkedActivityId,target,saved:existing
          });
        }
        const common={
          activity_id:linkedActivityId,
          title:memoContract.title||normalizedBody.slice(0,40),
          summary:normalizedBody,
          client_request_id:memoContract.client_request_id,
          source:'r1-contract-and-rollback-boundary-gate2'
        };
        const saved=target==='improvement'
          ? await repositories.improvementItems.save({
            ...common,
            status:'open',
            payload:{
              text:normalizedBody,
              classification:memoContract.classification,
              memo_kind:memoContract.memo_kind,
              client_request_id:memoContract.client_request_id
            }
          })
          : await repositories.records.save({
            activity_id:linkedActivityId,
            type:'note',
            occurred_at:new Date().toISOString(),
            visibility:'private',
            payload:{
              title:common.title,
              text:normalizedBody,
              memo:normalizedBody,
              classification:memoContract.classification,
              memo_kind:memoContract.memo_kind,
              client_request_id:memoContract.client_request_id
            },
            client_request_id:memoContract.client_request_id,
            source:common.source
          });
        return Object.freeze({
          ok:true,
          item,
          activityId:linkedActivityId,
          unclassified:!linkedActivityId,
          target,
          saved
        });
        });
      }
    });
  }

  function production(){
    return create({
      repositories:globalThis.OUTBASE_REPOSITORIES_V160,
      plans:{get:id=>globalThis.OUTBASE_PLAN_DOMAIN_V162?.get?.(id)},
      guard:globalThis.OUTBASE_PERSISTENCE_GUARD_V1
    });
  }

  globalThis.OUTBASE_SAFE_MEMO_V1=Object.freeze({
    MemoContractError,
    enqueueMemoWrite,
    create,
    save:input=>production().save(input)
  });
})();
