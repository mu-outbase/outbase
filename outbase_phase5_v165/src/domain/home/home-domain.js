(() => {
  'use strict';

  const repos=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const plans=()=>globalThis.OUTBASE_PLAN_DOMAIN_V162;
  const prep=()=>globalThis.OUTBASE_PREPARATION_SCREEN_MODEL_V162;
  const utils=()=>globalThis.OUTBASE_DOMAIN_UTILS_V162;

  const TYPE_LABELS=Object.freeze({camp:'キャンプ',walk:'散歩',drive:'ドライブ',shopping:'買い物',event:'イベント',other:'活動'});
  const STATE_LABELS=Object.freeze({candidate:'候補',planned:'予定',preparing:'準備中',active:'実行中',paused:'休止中',organizing:'整理中',completed:'思い出',archived:'保管済み'});
  const VISIBILITY_LABELS=Object.freeze({private:'自分のみ',household:'家族',participants:'参加者',public:'公開'});

  const cleanRows=rows=>(rows||[]).filter(row=>row&&!row.deleted_at);
  const safeName=(row,fallback)=>String(row?.name||row?.display_name||fallback||'').trim()||fallback;

  async function directory(){
    const [members,pets,households]=await Promise.all([repos().members.all(),repos().pets.all(),repos().households.all()]);
    const memberRows=cleanRows(members).map(row=>Object.freeze({id:row.id,type:'member',name:safeName(row,'家族'),role:row.role||'member'}));
    const petRows=cleanRows(pets).map(row=>Object.freeze({id:row.id,type:'pet',name:safeName(row,'ペット'),species:row.species||'',breed:row.breed||''}));
    return Object.freeze({
      household:Object.freeze({id:cleanRows(households)[0]?.id||null,name:safeName(cleanRows(households)[0],'わが家')}),
      members:Object.freeze(memberRows),pets:Object.freeze(petRows),
      byKey:new Map([...memberRows,...petRows].map(row=>[`${row.type}:${row.id}`,row]))
    });
  }

  function participants(activity,book){
    const seen=new Set();
    const rows=[];
    for(const ref of activity?.participants||[]){
      const key=`${ref.type}:${ref.id}`;
      const person=book.byKey.get(key);
      if(!person||seen.has(key))continue;
      seen.add(key);
      rows.push(Object.freeze({...person,role:ref.role||person.role||'participant'}));
    }
    rows.sort((a,b)=>{
      if(a.role==='creator'&&b.role!=='creator')return -1;
      if(b.role==='creator'&&a.role!=='creator')return 1;
      if(a.type!==b.type)return a.type==='member'?-1:1;
      return a.name.localeCompare(b.name,'ja');
    });
    return Object.freeze({
      rows:Object.freeze(rows),names:Object.freeze(rows.map(row=>row.name)),count:rows.length,
      memberCount:rows.filter(row=>row.type==='member').length,petCount:rows.filter(row=>row.type==='pet').length
    });
  }

  function place(activity){
    const meta=activity?.metadata||{};
    const legacyPlan=meta.legacy_plan||{};
    const legacyCore=meta.legacy_core_activity||{};
    return String(legacyPlan.location||legacyPlan.placeName||legacyCore.location||meta.location||'').trim();
  }

  function dateStart(activity){return utils().asDate(activity?.startAt||activity?.calendar?.[0]?.startAt);}
  function dateEnd(activity){return utils().asDate(activity?.endAt||activity?.calendar?.[0]?.endAt);}
  function dayDistance(activity,base=new Date()){
    const start=dateStart(activity);if(!start)return null;
    const a=new Date(base.getFullYear(),base.getMonth(),base.getDate());
    const b=new Date(start.getFullYear(),start.getMonth(),start.getDate());
    return Math.round((b-a)/86400000);
  }
  function relativeDay(activity,base=new Date()){
    const days=dayDistance(activity,base);
    if(days===null)return '日付未設定';
    if(days===0)return '今日';if(days===1)return '明日';if(days>1)return `あと${days}日`;
    if(days===-1)return '昨日';return `${Math.abs(days)}日前`;
  }

  function groupCount(rows,key){
    const map=new Map();
    for(const row of cleanRows(rows)){const id=row?.[key];if(id)map.set(id,(map.get(id)||0)+1);}
    return map;
  }

  function enrich(activity,book,recordCounts,mediaCounts,{preparation=null,base=new Date()}={}){
    if(!activity)return null;
    const people=participants(activity,book);
    const start=dateStart(activity),end=dateEnd(activity);
    return Object.freeze({
      ...activity,
      typeLabel:TYPE_LABELS[activity.type]||TYPE_LABELS.other,
      stateLabel:STATE_LABELS[activity.state]||'活動',
      visibilityLabel:VISIBILITY_LABELS[activity.visibility]||VISIBILITY_LABELS.private,
      place:place(activity),participants:people,
      startAt:start?.toISOString()||activity.startAt||null,endAt:end?.toISOString()||activity.endAt||null,
      relativeDay:relativeDay(activity,base),daysUntil:dayDistance(activity,base),
      recordCount:recordCounts.get(activity.id)||Number(activity.recordCount||0),
      mediaCount:mediaCounts.get(activity.id)||Number(activity.mediaCount||0),
      preparation:preparation?Object.freeze({total:preparation.total,completed:preparation.completed,pending:preparation.pending,progress:preparation.progress,persisted:preparation.persisted}):null,
      detailUrl:globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:activity.id}),
      preparationUrl:plans().legacyUrl(activity,'preparation'),
      recordUrl:globalThis.OUTBASE_ROUTER.legacyUrl('record',{activityId:activity.id,planId:activity.legacyPlanId||null})
    });
  }

  async function build({now=new Date(),nowLimit=3,nextLimit=5,recentLimit=5}={}){
    const [planModel,vaultModel,book,records,media]=await Promise.all([
      globalThis.OUTBASE_PLAN_SCREEN_MODEL_V162.build({now,upcomingDays:180}),
      globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162.build({activityLimit:Math.max(12,recentLimit),recordLimit:1,assetLimit:1}),
      directory(),repos().records.all(),repos().media.all()
    ]);
    const recordCounts=groupCount(records,'activity_id');
    const mediaCounts=groupCount(media,'activity_id');
    const nextSource=(planModel.next||[]).slice(0,nextLimit);
    const preparationRows=await Promise.all(nextSource.map(activity=>prep().build(activity.id).catch(()=>null)));
    const current=(planModel.now||[]).slice(0,nowLimit).map(activity=>enrich(activity,book,recordCounts,mediaCounts,{base:now}));
    const next=nextSource.map((activity,index)=>enrich(activity,book,recordCounts,mediaCounts,{preparation:preparationRows[index],base:now}));
    const recent=(vaultModel.activities||[]).slice(0,recentLimit).map(activity=>enrich(activity,book,recordCounts,mediaCounts,{base:now}));
    const familyRows=[...book.members,...book.pets];
    return Object.freeze({
      current:Object.freeze(current),next:Object.freeze(next),recent:Object.freeze(recent),
      family:Object.freeze({
        household:book.household,memberCount:book.members.length,petCount:book.pets.length,
        rows:Object.freeze(familyRows),names:Object.freeze(familyRows.map(row=>row.name))
      }),
      calendarUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar'),
      vaultSummary:vaultModel.summary,
      generatedAt:new Date().toISOString(),
      blobReads:0
    });
  }

  globalThis.OUTBASE_HOME_DOMAIN_V164=Object.freeze({build,directory,participants,TYPE_LABELS,STATE_LABELS,VISIBILITY_LABELS});
})();
