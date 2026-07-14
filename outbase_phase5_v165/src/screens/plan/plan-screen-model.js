(() => {
  'use strict';

  async function build({now=new Date(),upcomingDays=120}={}){
    const domain=globalThis.OUTBASE_PLAN_DOMAIN_V162;
    const [current,active,upcoming]=await Promise.all([domain.current(),domain.now(),domain.upcoming({from:now,days:upcomingDays,limit:60})]);
    return Object.freeze({
      current,now:active,next:upcoming,
      calendarUrl:domain.legacyUrl(upcoming[0]||current||{},'calendar'),
      generatedAt:new Date().toISOString()
    });
  }

  globalThis.OUTBASE_PLAN_SCREEN_MODEL_V162=Object.freeze({build});
})();
