const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
(async()=>{
  const activity={id:'act-camp',type:'camp',title:'赤城山キャンプ',state:'planned',startAt:'2026-07-18T00:00:00.000Z',endAt:'2026-07-19T00:00:00.000Z',visibility:'household',legacyPlanId:'plan-1',participants:[{id:'m1',type:'member',role:'creator'},{id:'m2',type:'member',role:'participant'},{id:'p1',type:'pet',role:'participant'}],calendar:[{id:'ce1',activityId:'act-camp',startAt:'2026-07-18T00:00:00.000Z',endAt:'2026-07-19T00:00:00.000Z'}],metadata:{legacy_plan:{location:'赤城山'}}};
  const rows={members:[{id:'m1',name:'むー',role:'owner'},{id:'m2',name:'リン'}],pets:[{id:'p1',name:'コタ',species:'犬'}],households:[{id:'h1',name:'わが家'}],records:[{id:'r1',activity_id:'act-camp',type:'note',occurred_at:'2026-07-18T05:00:00.000Z',visibility:'private',payload:{text:'設営完了'}}],media:[{id:'x1',activity_id:'act-camp',record_id:'r1',media_type:'photo',local_ref:{database:'outbase_db'}}],reviews:[{id:'rv1',activity_id:'act-camp',summary:'良かった'}],improvementItems:[{id:'i1',activity_id:'act-camp',title:'次回は早く出る',status:'open'}],activityAssets:[{id:'aa1',activity_id:'act-camp',asset_id:'g1'}],assets:[{id:'g1',name:'ランドロック',asset_type:'gear'}],meals:[],shoppingLists:[]};
  const repo=(name)=>({all:async()=>rows[name]||[],byIndex:async(_index,value)=>(rows[name]||[]).filter(row=>row.activity_id===value),forActivity:async value=>(rows[name]||[]).filter(row=>row.activity_id===value)});
  const location={search:'?shell=1&view=calendar&month=2026-07&people=member:m2,pet:p1',hash:'',pathname:'/outbase/'};
  const store=new Map();
  const context={console,Date,Intl,Object,Array,Map,Set,Math,JSON,URL,URLSearchParams,navigator:{onLine:true},location,history:{state:null,pushState(_s,_t,url){location.search=url.slice(url.indexOf('?'));},replaceState(_s,_t,url){location.search=url.slice(url.indexOf('?'));}},localStorage:{getItem:k=>store.get(k)||null},addEventListener(){},dispatchEvent(){},CustomEvent:class{},globalThis:null,
    OUTBASE_REPOSITORIES_V160:{members:repo('members'),pets:repo('pets'),households:repo('households'),records:repo('records'),media:repo('media'),reviews:repo('reviews'),improvementItems:repo('improvementItems'),activityAssets:repo('activityAssets'),assets:repo('assets'),meals:repo('meals'),shoppingLists:repo('shoppingLists')},
    OUTBASE_PLAN_DOMAIN_V162:{async list(){return [activity];},async get(id){return id===activity.id?activity:null;},legacyUrl:(a,s)=>`/outbase/?tab=${s==='preparation'?'prep':'plan'}&activityId=${a.id}&planId=${a.legacyPlanId}`},
    OUTBASE_PREPARATION_SCREEN_MODEL_V162:{async build(){return {total:6,completed:2,pending:4,progress:33,persisted:true};}},
    OUTBASE_DOMAIN_UTILS_V162:{asDate:v=>v?new Date(v):null,iso:v=>v?new Date(v).toISOString():null}
  };
  context.globalThis=context;vm.createContext(context);
  for(const file of ['src/router.js','src/domain/home/home-domain.js','src/domain/filters/family-filter-domain.js','src/domain/calendar/calendar-domain.js','src/screens/calendar/calendar-screen-model.js','src/domain/activity/activity-detail-domain.js','src/screens/activity/activity-detail-screen-model.js'])vm.runInContext(read(file),context,{filename:file});
  const calendar=await context.OUTBASE_CALENDAR_SCREEN_MODEL_V165.build({month:'2026-07',selected:'member:m2,pet:p1',today:new Date('2026-07-15T00:00:00Z')});
  assert.equal(calendar.activities.length,1);assert.equal(calendar.filters.selectedCount,2);assert.equal(calendar.days.filter(day=>day.activities.length).length,2);assert.equal(calendar.blobReads,0);
  const detail=await context.OUTBASE_ACTIVITY_DETAIL_SCREEN_MODEL_V165.build('act-camp');
  assert.equal(detail.status,'ready');assert.equal(detail.activity.id,'act-camp');assert.equal(detail.activity.recordCount,1);assert.equal(detail.activity.media.types.photo,1);assert.equal(detail.activity.organization.openImprovementCount,1);assert(detail.activity.calendarUrl.includes('view=calendar'));assert.equal(detail.blobReads,0);
  assert.equal(context.OUTBASE_FAMILY_FILTER_DOMAIN_V165.matches(activity,['member:m2','pet:p1']),true);assert.equal(context.OUTBASE_FAMILY_FILTER_DOMAIN_V165.matches(activity,['pet:missing']),false);
  const manifest=JSON.parse(read('manifest.json'));assert.equal(manifest.display,'standalone');assert(manifest.start_url.includes('shell=1'));assert.equal(manifest.icons.length,2);
  const css=read('style-shell.css');assert(!/(body|#outbaseShellRoot|\.ob3-shell)[^{]*\{[^}]*overflow\s*:\s*hidden/i.test(css));assert.equal((css.match(/MutationObserver/g)||[]).length,0);
  console.log(JSON.stringify({status:'pass',activityId:detail.activity.id,calendarDays:2,selectedFilters:2,recordCount:1,photoCount:1,blobReads:0,pwa:'standalone',mutationObserverAdded:0,wholeScreenOverflowHiddenAdded:0},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
