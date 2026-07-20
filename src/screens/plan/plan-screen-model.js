(() => {
  'use strict';

  const MAX_UPCOMING_ROWS=60;

  function startOfDay(value){
    const date=new Date(value instanceof Date?value:value||Date.now());
    if(Number.isNaN(date.getTime()))return new Date(new Date().setHours(0,0,0,0));
    date.setHours(0,0,0,0);
    return date;
  }

  function endOfRange(start,days){
    const end=new Date(start);
    end.setDate(end.getDate()+Math.max(0,Number(days||120)));
    end.setHours(23,59,59,999);
    return end;
  }

  function dateOf(item,key){
    const utils=globalThis.OUTBASE_DOMAIN_UTILS_V162;
    const direct=key==='start'
      ?item?.startAt||item?.calendar?.[0]?.startAt
      :item?.endAt||item?.calendar?.[0]?.endAt||item?.startAt||item?.calendar?.[0]?.startAt;
    return utils?.asDate?.(direct)||null;
  }

  function overlaps(item,from,to){
    const start=dateOf(item,'start');
    if(!start)return false;
    const rawEnd=dateOf(item,'end')||start;
    const end=rawEnd<start?start:rawEnd;
    return end>=from&&start<=to;
  }

  async function upcomingForHome(domain,{now,upcomingDays}){
    const utils=globalThis.OUTBASE_DOMAIN_UTILS_V162;
    const from=startOfDay(now);
    const to=endOfRange(from,upcomingDays);

    if(domain?.list&&Array.isArray(utils?.FUTURE_STATES)){
      const rows=await domain.list({states:utils.FUTURE_STATES,limit:300});
      return rows
        .filter(item=>overlaps(item,from,to))
        .sort((a,b)=>Number(dateOf(a,'start')||0)-Number(dateOf(b,'start')||0))
        .slice(0,MAX_UPCOMING_ROWS);
    }

    return domain?.upcoming
      ?domain.upcoming({from,days:upcomingDays,limit:MAX_UPCOMING_ROWS})
      :[];
  }

  async function build({now=new Date(),upcomingDays=120}={}){
    const domain=globalThis.OUTBASE_PLAN_DOMAIN_V162;
    if(!domain)throw new Error('OUTBASE plan domain is not ready');

    const [current,active,upcoming]=await Promise.all([
      domain.current(),
      domain.now(),
      upcomingForHome(domain,{now,upcomingDays})
    ]);

    return Object.freeze({
      current,
      now:Object.freeze([...(active||[])]),
      next:Object.freeze([...(upcoming||[])]),
      calendarUrl:domain.legacyUrl(upcoming?.[0]||current||{},'calendar'),
      generatedAt:new Date().toISOString(),
      version:'v18.3-current-day-overlap'
    });
  }

  globalThis.OUTBASE_PLAN_SCREEN_MODEL_V162=Object.freeze({
    build,
    startOfDay,
    endOfRange,
    overlaps,
    upcomingForHome,
    MAX_UPCOMING_ROWS
  });
})();
