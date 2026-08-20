(() => {
  'use strict';

  const ACTIVITY_TYPES=Object.freeze(['camp','walk','drive','shopping','event','other']);
  const ACTIVITY_STATES=Object.freeze([
    'candidate','planned','preparing','active','paused','organizing','completed','archived'
  ]);
  const MEMO_KINDS=Object.freeze(['high_feature','quick','activity']);
  const MEMO_CLASSIFICATIONS=Object.freeze(['linked','unclassified']);

  const RELATIONS=Object.freeze({
    activity_parent:Object.freeze({
      fromStore:'activities',fromKey:'parent_activity_id',toStore:'activities',nullable:true
    }),
    activity_asset_activity:Object.freeze({
      fromStore:'activity_assets',fromKey:'activity_id',toStore:'activities',nullable:false
    }),
    activity_asset_asset:Object.freeze({
      fromStore:'activity_assets',fromKey:'asset_id',toStore:'assets',nullable:false
    }),
    preparation_activity:Object.freeze({
      fromStore:'preparation_items',fromKey:'activity_id',toStore:'activities',nullable:false
    }),
    shopping_list_activity:Object.freeze({
      fromStore:'shopping_lists',fromKey:'activity_id',toStore:'activities',nullable:true
    }),
    shopping_item_list:Object.freeze({
      fromStore:'shopping_items',fromKey:'shopping_list_id',toStore:'shopping_lists',nullable:false
    }),
    shopping_item_activity:Object.freeze({
      fromStore:'shopping_items',fromKey:'activity_id',toStore:'activities',nullable:true
    })
  });

  const STORAGE_OWNERSHIP=Object.freeze({
    story:Object.freeze({
      database:'outbase_story_db',
      write:'Repository after explicit user save or explicit migration only',
      display:'openExisting only; a missing database is an empty state'
    }),
    field03:Object.freeze({
      database:'outbase_db',
      localStorage:'FIELD03 legacy keys',
      read:'legacy adapter readonly allowlist',
      write:'FIELD03 legacy implementation only; Story IDs are never written automatically'
    }),
    calendarV44:Object.freeze({
      database:null,
      localStorage:'outbase_calendar_complete_v3_*',
      cutover:'R2; outbase_calendar_db remains disconnected'
    })
  });

  function memoContract({
    activityId=null,
    kind='quick',
    classification='',
    requestId='',
    title='',
    body=''
  }={}){
    const linkedActivityId=String(activityId||'').trim()||null;
    return Object.freeze({
      activity_id:linkedActivityId,
      memo_kind:MEMO_KINDS.includes(kind)?kind:'quick',
      classification:classification||
        (linkedActivityId?MEMO_CLASSIFICATIONS[0]:MEMO_CLASSIFICATIONS[1]),
      client_request_id:String(requestId||'').trim()||null,
      title:String(title||'').trim(),
      body:String(body||'').trim()
    });
  }

  globalThis.OUTBASE_DOMAIN_CONTRACTS_V1=Object.freeze({
    ACTIVITY_TYPES,
    ACTIVITY_STATES,
    MEMO_KINDS,
    MEMO_CLASSIFICATIONS,
    RELATIONS,
    STORAGE_OWNERSHIP,
    memoContract
  });
})();
