(() => {
  'use strict';

  const ACTIVITY_STATES=new Set(['candidate','planned','preparing','active','paused','organizing','completed','archived']);
  const VISIBILITY_VALUES=new Set(['private','household','public_candidate']);
  const RECORD_TYPES=new Set(['note','photo','video','audio_transcript','location','gps_point','pin','weather','checklist','measurement','review_fact','legacy']);

  const text=(value,fallback='')=>String(value??fallback).trim();
  const iso=value=>{
    if(!value)return null;
    const date=new Date(value);
    return Number.isNaN(date.getTime())?null:date.toISOString();
  };
  const visibility=value=>VISIBILITY_VALUES.has(value)?value:'private';
  const activityState=value=>ACTIVITY_STATES.has(value)?value:'candidate';
  const recordType=value=>RECORD_TYPES.has(value)?value:'legacy';

  function base(input={},defaults={}){
    const ids=globalThis.OUTBASE_IDS;
    if(!ids)throw new Error('OUTBASE_IDS is not ready');
    const now=ids.nowIso();
    return {
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
    const title=text(input.title)||'名称未設定の活動';
    return {
      ...common,
      type:text(input.type||input.activity_type,'other'),
      title:title.slice(0,120),
      state:activityState(input.state),
      start_at:iso(input.start_at),
      end_at:iso(input.end_at),
      timezone:text(input.timezone,'Asia/Tokyo'),
      primary_place_id:text(input.primary_place_id)||null,
      visibility:visibility(input.visibility),
      legacy_ref:text(input.legacy_ref)||null,
      legacy_refs:Array.isArray(input.legacy_refs)?[...new Set(input.legacy_refs.filter(Boolean).map(String))]:[],
      metadata:input.metadata??input.payload??null,
      source:text(input.source,'outbase-v160')
    };
  }

  function record(input={},defaults={}){
    const common=base(input,defaults);
    return {
      ...common,
      activity_id:text(input.activity_id)||null,
      type:recordType(input.type),
      occurred_at:iso(input.occurred_at)||common.created_at,
      actor_id:text(input.actor_id||defaults.actor_id)||null,
      visibility:visibility(input.visibility),
      payload:input.payload??null,
      legacy_ref:text(input.legacy_ref)||null,
      source:text(input.source,'outbase-v160')
    };
  }

  function errors(entity,required=[]){
    const output=[];
    for(const key of required){
      if(entity[key]===null||entity[key]===undefined||entity[key]==='')output.push(`${key} is required`);
    }
    if(entity.id&&!globalThis.OUTBASE_IDS?.isUlid?.(entity.id))output.push('id must be ULID');
    return output;
  }

  globalThis.OUTBASE_VALIDATION=Object.freeze({
    ACTIVITY_STATES:[...ACTIVITY_STATES],
    VISIBILITY_VALUES:[...VISIBILITY_VALUES],
    RECORD_TYPES:[...RECORD_TYPES],
    text,iso,visibility,activityState,recordType,base,activity,record,errors
  });
})();
