(() => {
  'use strict';

  function create({repositories,plans,guard}){
    if(!repositories||!plans||!guard)throw new Error('Safe memo dependencies are incomplete.');
    return Object.freeze({
      async save({activityId='',title='',body='',target='memo'}={}){
        const normalizedBody=String(body||'').trim();
        if(!normalizedBody)throw new Error('memo_body_required');
        const requestedActivityId=String(activityId||'').trim();
        const item=requestedActivityId?await plans.get(requestedActivityId):null;
        const linkedActivityId=item?.id||null;
        guard.assertActivitylessMemo({
          activityId:linkedActivityId,
          activityCreated:false,
          source:'safe-memo-v1'
        });
        const common={
          activity_id:linkedActivityId,
          title:String(title||'').trim()||normalizedBody.slice(0,40),
          summary:normalizedBody,
          source:'r1-storage-safety-gate1'
        };
        const saved=target==='improvement'
          ? await repositories.improvementItems.save({
            ...common,
            status:'open',
            payload:{text:normalizedBody,classification:linkedActivityId?'linked':'unclassified'}
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
              classification:linkedActivityId?'linked':'unclassified'
            },
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
    create,
    save:input=>production().save(input)
  });
})();
