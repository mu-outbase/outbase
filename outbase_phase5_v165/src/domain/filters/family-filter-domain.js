(() => {
  'use strict';

  const home=()=>globalThis.OUTBASE_HOME_DOMAIN_V164;
  const clean=value=>String(value??'').trim();

  function normalize(values){
    const source=Array.isArray(values)?values:String(values||'').split(',');
    return Object.freeze([...new Set(source.map(clean).filter(value=>/^(member|pet):[^:,]+$/.test(value)))]);
  }

  function serialize(values){return normalize(values).join(',');}

  function key(type,id){return type&&id?`${type}:${id}`:'';}

  async function options(selected=[]){
    const directory=await home().directory();
    const selectedSet=new Set(normalize(selected));
    const rows=[...directory.members,...directory.pets].map(item=>Object.freeze({
      ...item,key:key(item.type,item.id),selected:selectedSet.has(key(item.type,item.id))
    }));
    return Object.freeze({
      household:directory.household,
      rows:Object.freeze(rows),
      selected:Object.freeze([...selectedSet]),
      selectedCount:selectedSet.size,
      memberCount:directory.members.length,
      petCount:directory.pets.length
    });
  }

  function participantKeys(activity){
    return new Set((activity?.participants||[]).map(item=>key(item.type||item.participant_type,item.id||item.participant_id)).filter(Boolean));
  }

  function matches(activity,selected=[]){
    const filters=normalize(selected);
    if(!filters.length)return true;
    const participants=participantKeys(activity);
    return filters.every(value=>participants.has(value));
  }

  function apply(activities,selected=[]){return (activities||[]).filter(activity=>matches(activity,selected));}

  function toggle(selected,value){
    const next=new Set(normalize(selected));
    const normalized=clean(value);
    if(!/^(member|pet):[^:,]+$/.test(normalized))return Object.freeze([...next]);
    if(next.has(normalized))next.delete(normalized);else next.add(normalized);
    return Object.freeze([...next]);
  }

  globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165=Object.freeze({normalize,serialize,key,options,matches,apply,toggle,participantKeys});
})();
