(() => {
  'use strict';

  const contracts=()=>globalThis.OUTBASE_DOMAIN_CONTRACTS_V1;
  const ACTIVITY_STATES=new Set([
    'candidate','planned','preparing','active','paused','organizing','completed','archived'
  ]);
  const ACTIVITY_TYPES=new Set(['camp','walk','drive','shopping','event','other']);
  const VISIBILITY_VALUES=new Set(['private','household','public_candidate']);
  const RECORD_TYPES=new Set([
    'note','photo','video','audio_transcript','location','gps_point','pin','weather',
    'checklist','measurement','review_fact','legacy'
  ]);
  const PARTICIPANT_TYPES=new Set(['member','pet']);
  const PREPARATION_STATUSES=new Set(['pending','completed','skipped']);
  const SHOPPING_STATUSES=new Set(['pending','purchased','skipped']);

  class EntityValidationError extends Error{
    constructor(storeName,issues,entity={}){
      super(`Validation failed for ${storeName}.`);
      this.name='EntityValidationError';
      this.code='entity_validation_failed';
      this.detail=Object.freeze({
        storeName,
        issues:Object.freeze(issues.map(issue=>Object.freeze({...issue}))),
        entityId:entity?.id||null
      });
    }
  }

  const text=(value,fallback='')=>String(value??fallback).trim();
  const iso=value=>{
    if(!value)return null;
    const date=new Date(value);
    return Number.isNaN(date.getTime())?null:date.toISOString();
  };
  const visibility=value=>text(value)||'private';
  const activityState=value=>text(value)||'candidate';
  const recordType=value=>text(value)||'legacy';

  function issue(field,code,message,value){
    return {field,code,message,...(value===undefined?{}:{value})};
  }

  function base(input={},defaults={}){
    const ids=globalThis.OUTBASE_IDS;
    if(!ids)throw new Error('OUTBASE_IDS is not ready');
    const now=ids.nowIso();
    return {
      ...input,
      id:text(input.id)||ids.ulid(),
      household_id:text(input.household_id||defaults.household_id),
      schema_version:Number(input.schema_version||defaults.schema_version||1),
      created_at:iso(input.created_at)||now,
      updated_at:iso(input.updated_at)||now,
      created_by:text(input.created_by||defaults.created_by),
      updated_by:text(input.updated_by||defaults.updated_by),
      device_id:text(input.device_id||defaults.device_id),
      deleted_at:iso(input.deleted_at)
    };
  }

  function activity(input={},defaults={}){
    const common=base(input,defaults);
    const title=text(input.title);
    return {
      ...common,
      type:text(input.type||input.activity_type,'other'),
      subtype:text(input.subtype)||null,
      title:title.slice(0,120),
      state:activityState(input.state),
      parent_activity_id:text(input.parent_activity_id||input.parentActivityId)||null,
      start_at:iso(input.start_at),
      end_at:iso(input.end_at),
      timezone:text(input.timezone,'Asia/Tokyo'),
      primary_place_id:text(input.primary_place_id)||null,
      visibility:visibility(input.visibility),
      legacy_ref:text(input.legacy_ref)||null,
      legacy_refs:Array.isArray(input.legacy_refs)
        ?[...new Set(input.legacy_refs.filter(Boolean).map(String))]:[],
      metadata:input.metadata??input.payload??null,
      source:text(input.source,'outbase-v160')
    };
  }

  function record(input={},defaults={}){
    const common=base(input,defaults);
    const activityId=text(input.activity_id)||null;
    const payload=input.payload&&typeof input.payload==='object'?{...input.payload}:input.payload??null;
    if(recordType(input.type)==='note'&&payload&&typeof payload==='object'){
      payload.classification=payload.classification||(activityId?'linked':'unclassified');
    }
    return {
      ...common,
      activity_id:activityId,
      type:recordType(input.type),
      occurred_at:iso(input.occurred_at)||common.created_at,
      actor_id:text(input.actor_id||defaults.actor_id)||null,
      visibility:visibility(input.visibility),
      payload,
      client_request_id:text(input.client_request_id)||null,
      legacy_ref:text(input.legacy_ref)||null,
      source:text(input.source,'outbase-v160')
    };
  }

  function generic(input={},defaults={}){
    return base(input,defaults);
  }

  function errors(entity,required=[]){
    const output=[];
    for(const key of required){
      if(entity[key]===null||entity[key]===undefined||entity[key]===''){
        output.push(issue(key,'required',`${key} is required`));
      }
    }
    if(entity.id&&!globalThis.OUTBASE_IDS?.isUlid?.(entity.id)){
      output.push(issue('id','invalid_id','id must be ULID',entity.id));
    }
    return output;
  }

  function entityErrors(storeName,entity={}){
    const output=[];
    const require=(...fields)=>{
      for(const field of fields){
        if(entity[field]===null||entity[field]===undefined||entity[field]===''){
          output.push(issue(field,'required',`${field} is required`));
        }
      }
    };
    if(storeName!=='app_meta'&&entity.id&&!globalThis.OUTBASE_IDS?.isUlid?.(entity.id)){
      output.push(issue('id','invalid_id','id must be ULID',entity.id));
    }
    switch(storeName){
      case 'activities':
        require('id','type','title','state');
        if(!ACTIVITY_TYPES.has(entity.type))output.push(issue(
          'type','invalid_enum',`type must be one of ${[...ACTIVITY_TYPES].join(', ')}`,entity.type
        ));
        if(!ACTIVITY_STATES.has(entity.state))output.push(issue(
          'state','invalid_enum',`state must be one of ${[...ACTIVITY_STATES].join(', ')}`,entity.state
        ));
        if(entity.subtype&&(!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(entity.subtype))){
          output.push(issue('subtype','invalid_format','subtype must be a short slug',entity.subtype));
        }
        if(entity.parent_activity_id&&!globalThis.OUTBASE_IDS?.isUlid?.(entity.parent_activity_id)){
          output.push(issue('parent_activity_id','invalid_reference_id','parent_activity_id must be ULID'));
        }
        if(!VISIBILITY_VALUES.has(entity.visibility))output.push(issue(
          'visibility','invalid_enum','invalid visibility',entity.visibility
        ));
        break;
      case 'records':
        require('id','type','occurred_at');
        if(!RECORD_TYPES.has(entity.type))output.push(issue(
          'type','invalid_enum','invalid record type',entity.type
        ));
        if(entity.activity_id&&!globalThis.OUTBASE_IDS?.isUlid?.(entity.activity_id)){
          output.push(issue('activity_id','invalid_reference_id','activity_id must be ULID'));
        }
        if(!VISIBILITY_VALUES.has(entity.visibility))output.push(issue(
          'visibility','invalid_enum','invalid visibility',entity.visibility
        ));
        if(entity.type==='note'&&entity.payload?.classification&&
          !contracts().MEMO_CLASSIFICATIONS.includes(entity.payload.classification)){
          output.push(issue('payload.classification','invalid_enum','invalid memo classification'));
        }
        if(entity.type==='note'&&entity.payload?.memo_kind&&
          !contracts().MEMO_KINDS.includes(entity.payload.memo_kind)){
          output.push(issue('payload.memo_kind','invalid_enum','invalid memo kind'));
        }
        break;
      case 'activity_participants':
        require('id','activity_id','participant_id','participant_type');
        if(!PARTICIPANT_TYPES.has(entity.participant_type))output.push(issue(
          'participant_type','invalid_enum','invalid participant type',entity.participant_type
        ));
        break;
      case 'calendar_entries':
        require('id','activity_id','start_at');
        break;
      case 'preparation_items':
        require('id','activity_id','category','title','status');
        if(!PREPARATION_STATUSES.has(entity.status))output.push(issue(
          'status','invalid_enum','invalid preparation status',entity.status
        ));
        break;
      case 'assets':
        require('id','asset_type','name','status');
        break;
      case 'activity_assets':
        require('id','activity_id','asset_id');
        break;
      case 'shopping_lists':
        require('id');
        break;
      case 'shopping_items':
        require('id','shopping_list_id','status');
        if(!SHOPPING_STATUSES.has(entity.status))output.push(issue(
          'status','invalid_enum','invalid shopping status',entity.status
        ));
        break;
      default:
        require('id');
    }
    return output.filter((candidate,index,list)=>
      list.findIndex(item=>item.field===candidate.field&&item.code===candidate.code)===index
    );
  }

  function normalize(storeName,input={},defaults={}){
    if(storeName==='activities')return activity(input,defaults);
    if(storeName==='records')return record(input,defaults);
    return generic(input,defaults);
  }

  function assertEntity(storeName,entity){
    const issues=entityErrors(storeName,entity);
    if(issues.length)throw new EntityValidationError(storeName,issues,entity);
    return entity;
  }

  globalThis.OUTBASE_VALIDATION=Object.freeze({
    ACTIVITY_STATES:[...ACTIVITY_STATES],
    ACTIVITY_TYPES:[...ACTIVITY_TYPES],
    VISIBILITY_VALUES:[...VISIBILITY_VALUES],
    RECORD_TYPES:[...RECORD_TYPES],
    EntityValidationError,
    text,iso,visibility,activityState,recordType,base,activity,record,generic,
    errors,entityErrors,normalize,assertEntity
  });
})();
