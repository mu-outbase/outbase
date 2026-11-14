(() => {
  'use strict';

  function localDateTime(value){
    if(typeof value!=='string'||!value)return null;
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return null;
    const pad=value=>String(value).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function project(activities,entries){
    const byId=new Map(activities.filter(row=>row&&!row.deleted_at).map(row=>[row.id,row]));
    return entries.flatMap(entry=>{
      const activity=entry&&entry.id&&!entry.deleted_at?byId.get(entry.activity_id):null;
      if(!activity)return [];
      const start=localDateTime(entry.start_at||activity.start_at);
      const end=localDateTime(entry.end_at||activity.end_at||entry.start_at||activity.start_at);
      if(!start||!end||end<start)return [];
      const meta=activity.metadata||{};
      return [{
        id:`story-calendar:${entry.id}`,storyActivityId:activity.id,
        title:activity.title||'予定',start,end,allDay:Boolean(entry.all_day),
        calendarId:['camp','walk'].includes(activity.type)?activity.type:'activity',
        participants:[],place:meta.location||meta.placeName||meta.legacy_plan?.location||'',
        memo:meta.note||meta.legacy_plan?.memo||'',
        repeat:entry.recurrence||{freq:'none',interval:1,until:''},reminders:entry.reminders||[]
      }];
    });
  }

  async function load(){
    // Do not initialize or upgrade a database merely to display a calendar.
    const db=await globalThis.OUTBASE_DB_V160.openExisting();
    if(!db)return [];
    try{
      if(!['activities','calendar_entries'].every(name=>db.objectStoreNames.contains(name)))return [];
      const rows=await new Promise((resolve,reject)=>{
        const tx=db.transaction(['activities','calendar_entries'],'readonly');
        const activities=tx.objectStore('activities').getAll();
        const entries=tx.objectStore('calendar_entries').getAll();
        tx.oncomplete=()=>resolve({activities:activities.result,entries:entries.result});
        tx.onerror=tx.onabort=()=>reject(tx.error||new Error('活動予定を読み込めませんでした'));
      });
      return project(rows.activities,rows.entries);
    }finally{db.close();}
  }

  globalThis.OUTBASE_STORY_CALENDAR_READER=Object.freeze({load,project});
})();
