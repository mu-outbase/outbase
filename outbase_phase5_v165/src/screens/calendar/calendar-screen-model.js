(() => {
  'use strict';
  async function build(options={}){
    const value=await globalThis.OUTBASE_CALENDAR_DOMAIN_V165.build(options);
    return Object.freeze({...value,version:'v165-integrated'});
  }
  globalThis.OUTBASE_CALENDAR_SCREEN_MODEL_V165=Object.freeze({build});
})();
