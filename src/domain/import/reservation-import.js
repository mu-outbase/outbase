(() => {
  'use strict';
  const clean=value=>String(value??'').normalize('NFKC').trim();
  function validDate(year,month,day){const text=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const d=new Date(`${text}T00:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===text?text:'';}
  function extract(raw){
    const source=clean(raw);if(!source||source.length>20000)throw Error('reservation_text_invalid');
    const lines=source.split(/\n/).map(clean).filter(Boolean);
    const labeled=lines.find(line=>/^(?:施設名|キャンプ場名|宿泊施設|予約施設)\s*[:：]/.test(line));
    const place=(labeled?labeled.replace(/^[^:：]+[:：]\s*/,''):lines.find(line=>/(キャンプ場|キャンプフィールド|オートキャンプ|ふもとっぱら)/.test(line)&&!/(住所|https?:|キャンセル)/.test(line))||'').slice(0,120);
    let startDate='',endDate='';
    // Prefer explicitly labelled stay dates; booking/payment dates must not become check-in.
    const stayLines=lines.filter(line=>/(チェックイン|チェックアウト|宿泊日|利用日|日程|到着日|出発日)/.test(line));
    const stay=stayLines.join('\n');const dateSource=stay||lines.filter(line=>/[〜～~–—]/.test(line)&&!/(予約日|決済日|支払日)/.test(line)).join('\n');const dates=[...dateSource.matchAll(/(20\d{2})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})(?:日)?/g)];
    if(dates.length){startDate=validDate(+dates[0][1],+dates[0][2],+dates[0][3]);if(dates[1])endDate=validDate(+dates[1][1],+dates[1][2],+dates[1][3]);else{
      const tail=dateSource.slice(dates[0].index+dates[0][0].length);const range=tail.match(/^[^\n]*?[〜～~–—]\s*(?:(\d{1,2})\s*[月/.-]\s*)?(\d{1,2})(?:日)?/);
      if(range)endDate=validDate(+dates[0][1],+(range[1]||dates[0][2]),+range[2]);
    }}
    const time=label=>{const match=label.exec(source);const line=match?source.slice(match.index+match[0].length).split('\n')[0]:'';const m=line.match(/(?:^|[^\d])(\d{1,2}):([0-5]\d)(?!\d)/);return m&&+m[1]<24?`${m[1].padStart(2,'0')}:${m[2]}`:'';};
    return {source,place,title:place,startDate,endDate,startTime:time(/チェックイン|到着時刻/),endTime:time(/チェックアウト|出発時刻/),warnings:[!place&&'施設名を確認してください。',!startDate&&'年を含む開始日を確認してください。',!endDate&&'終了日を確認してください。'].filter(Boolean)};
  }
  function suggestions({pet=false}={}){return [
    {category:'ticket',title:'予約内容・チェックイン方法・キャンセル期限を確認する'},
    {category:'gear',title:'テント・寝具・照明と電池を確認する'},
    {category:'shopping',title:'献立を決め、手持ち食材を確認して不足分を買う'},
    {category:'note',title:'前回の反省を見て、今回の準備へ反映する'},
    ...(pet?[{category:'pet',title:'コタの水・フード・リード・排泄用品を準備する'}]:[])
  ];}
  async function approve({requestId,title,place,note,startAt,endAt,source,preparation=[]}){
    const ids=globalThis.OUTBASE_IDS,repos=globalThis.OUTBASE_REPOSITORIES_V160;
    if(!ids.isUlid(requestId)||!clean(title)||!clean(source)||source.length>20000||!Number.isFinite(Date.parse(startAt))||!Number.isFinite(Date.parse(endAt))||Date.parse(endAt)<Date.parse(startAt))throw Error('reservation_invalid');
    if(preparation.length>20||preparation.some(p=>!['ticket','gear','shopping','note','pet'].includes(p.category)||!clean(p.title)||p.title.length>240))throw Error('reservation_preparation_invalid');
    const signature=JSON.stringify({title,place,note,startAt,endAt,source,preparation});
    const metadata={location:place,placeName:place,note,reservation_import_v1:{request_id:requestId,source_text:source,signature},legacy_plan:{id:`shell-${requestId}`,title,location:place,placeName:place,activityType:'camp',startAt,endAt,memo:note}};
    const activity=repos.activities.normalize({id:requestId,title,type:'camp',state:'planned',start_at:startAt,end_at:endAt,visibility:'private',timezone:'Asia/Tokyo',metadata,source:'reservation-import-v1'});
    const calendar=repos.calendarEntries.normalize({id:requestId,activity_id:requestId,start_at:startAt,end_at:endAt,all_day:false,timezone:'Asia/Tokyo',source:'reservation-import-v1'});
    const rows=preparation.map((row,index)=>repos.preparationItems.normalize({activity_id:requestId,category:row.category,title:clean(row.title),status:'pending',sort_order:index,origin:'reservation',source:'reservation-import-v1'}));
    for(const [store,row] of [['activities',activity],['calendar_entries',calendar],...rows.map(row=>['preparation_items',row])])globalThis.OUTBASE_VALIDATION.assertEntity(store,row);
    let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['activities','calendar_entries','preparation_items'],'readwrite',tx=>{
      const req=tx.objectStore('activities').get(requestId);req.onsuccess=()=>{try{
        if(req.result){if(req.result.deleted_at||req.result.metadata?.reservation_import_v1?.signature!==signature)throw Error('reservation_request_conflict');result=req.result;return;}
        tx.objectStore('activities').put(activity);tx.objectStore('calendar_entries').put(calendar);for(const row of rows)tx.objectStore('preparation_items').put(row);result=activity;
      }catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}
    return result;
  }
  globalThis.OUTBASE_RESERVATION_IMPORT=Object.freeze({extract,suggestions,approve});
})();
