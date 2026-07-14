(() => {
  'use strict';

  async function build(activityId){
    const domain=globalThis.OUTBASE_PREPARATION_DOMAIN_V162;
    const summary=await domain.summary(activityId);
    if(!summary)return null;
    const sections=summary.items.reduce((output,item)=>{
      const key=item.category||'note';
      const group=output.find(section=>section.key===key)||(()=>{const next={key,label:domain.CATEGORY_LABELS[key]||item.title,items:[]};output.push(next);return next;})();
      group.items.push(item);
      return output;
    },[]);
    return Object.freeze({...summary,sections:Object.freeze(sections.map(section=>Object.freeze({...section,items:Object.freeze(section.items)}))),generatedAt:new Date().toISOString()});
  }

  globalThis.OUTBASE_PREPARATION_SCREEN_MODEL_V162=Object.freeze({build});
})();
