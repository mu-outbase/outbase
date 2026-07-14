(() => {
  'use strict';

  const plans=()=>globalThis.OUTBASE_PLAN_DOMAIN_V162;
  const filters=()=>globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165;
  const home=()=>globalThis.OUTBASE_HOME_DOMAIN_V164;
  const utils=()=>globalThis.OUTBASE_DOMAIN_UTILS_V162;

  function monthKey(value,base=new Date()){
    const match=String(value||'').match(/^(\d{4})-(\d{2})$/);
    if(match){const month=Number(match[2]);if(month>=1&&month<=12)return `${match[1]}-${match[2]}`;}
    return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
  }

  function monthStart(value){const [year,month]=monthKey(value).split('-').map(Number);return new Date(year,month-1,1);}
  function addMonths(value,amount){const date=monthStart(value);date.setMonth(date.getMonth()+Number(amount||0));return monthKey('',date);}
  function dateKey(value){const date=utils().asDate(value);if(!date)return '';return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function startOfDay(value){const date=utils().asDate(value);if(!date)return null;return new Date(date.getFullYear(),date.getMonth(),date.getDate());}
  function endOfDay(value){const date=startOfDay(value);if(!date)return null;date.setHours(23,59,59,999);return date;}

  function activityRange(activity){
    const start=startOfDay(activity?.startAt||activity?.calendar?.[0]?.startAt);
    const end=endOfDay(activity?.endAt||activity?.calendar?.[0]?.endAt||activity?.startAt||activity?.calendar?.[0]?.startAt);
    return {start,end};
  }

  function occursOn(activity,date){
    const {start,end}=activityRange(activity);if(!start||!end)return false;
    const target=startOfDay(date);return target>=start&&target<=end;
  }

  function gridRange(value){
    const first=monthStart(value);const start=new Date(first);start.setDate(first.getDate()-first.getDay());
    const end=new Date(start);end.setDate(start.getDate()+41);end.setHours(23,59,59,999);
    return {first,start,end};
  }

  function activityView(activity,book){
    const people=home().participants(activity,book);
    return Object.freeze({
      ...activity,
      typeLabel:home().TYPE_LABELS[activity.type]||home().TYPE_LABELS.other,
      stateLabel:home().STATE_LABELS[activity.state]||'活動',
      participants:people,
      detailUrl:globalThis.OUTBASE_ROUTER.shellUrl('activity',{activityId:activity.id})
    });
  }

  async function build({month=null,selected=[],today=new Date()}={}){
    const key=monthKey(month,today);const range=gridRange(key);
    const [activities,book,filterModel]=await Promise.all([
      plans().list({from:range.start,to:range.end,includeDeleted:false,limit:2000}),
      home().directory(),filters().options(selected)
    ]);
    const filtered=filters().apply(activities,filterModel.selected).map(item=>activityView(item,book));
    const days=[];
    for(let index=0;index<42;index+=1){
      const date=new Date(range.start);date.setDate(range.start.getDate()+index);
      const rows=filtered.filter(activity=>occursOn(activity,date));
      days.push(Object.freeze({
        date:date.toISOString(),dateKey:dateKey(date),day:date.getDate(),weekday:date.getDay(),
        inMonth:date.getMonth()===range.first.getMonth(),today:dateKey(date)===dateKey(today),
        activities:Object.freeze(rows),activityCount:rows.length
      }));
    }
    return Object.freeze({
      month:key,label:new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long'}).format(range.first),
      previousMonth:addMonths(key,-1),nextMonth:addMonths(key,1),
      days:Object.freeze(days),activities:Object.freeze(filtered),filters:filterModel,
      previousUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar',{month:addMonths(key,-1),people:filters().serialize(filterModel.selected)}),
      nextUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar',{month:addMonths(key,1),people:filters().serialize(filterModel.selected)}),
      clearFilterUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar',{month:key}),
      generatedAt:new Date().toISOString(),blobReads:0
    });
  }

  globalThis.OUTBASE_CALENDAR_DOMAIN_V165=Object.freeze({build,monthKey,addMonths,dateKey,occursOn,gridRange});
})();
