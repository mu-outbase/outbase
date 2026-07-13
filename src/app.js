(function(){
  const tabs=['plan','search','prep','record','memory'];
  let active=new URLSearchParams(location.search).get('tab')||location.hash.replace('#','')||'plan';
  if(!tabs.includes(active)) active='plan';

  const params=new URLSearchParams(location.search);
  let recordSessionState=params.get('recordState')||localStorage.getItem('outbase_record_session_state')||'idle';
  if(!['idle','active','paused'].includes(recordSessionState)) recordSessionState='idle';
  let recordCount=Number(localStorage.getItem('outbase_record_count')||18);
  let recordTarget=localStorage.getItem('outbase_record_target')||'コタ通常散歩';
  let recordSheet=params.get('sheet')||'';
  let mapMode=Number(localStorage.getItem('outbase_record_map_mode')||0)%2;
  let wakeLock=null;
  let geoWatchId=null;
  let timerId=null;
  let gpsStatus='現在地を確認中';
  let currentPosition=readStored('outbase_record_current_position',null);
  let trackPoints=readStored('outbase_record_track_points',[]);
  let savedPins=readStored('outbase_record_saved_pins',[]);
  let elapsedMs=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
  let activeStartedAt=recordSessionState==='active'?Number(localStorage.getItem('outbase_record_active_started_at')||Date.now()):0;
  let lastOneShotRequestAt=0;
  let mapCenter=currentPosition?{lat:currentPosition.lat,lng:currentPosition.lng}:{lat:35.8667,lng:140.0123};
  let mapZoom=Number(localStorage.getItem('outbase_record_map_zoom')||16);
  let mapFollow=true;
  let savedRecords=readStored('outbase_record_saved_records',[]);
  let pendingPinId=null;
  let memoDraft='';
  let editingRecordId=null;
  let speechRecognition=null;
  let speechHoldTimer=null;
  let speechActive=false;
  let speechTranscript='';
  let speechStartLocation=null;
  let speechButton=null;
  let activeParkingId=localStorage.getItem('outbase_active_parking_id')||'';
  let parkingSpeechHoldTimer=null;
  let parkingSpeechRecognition=null;
  let parkingSpeechActive=false;
  let currentSessionId=localStorage.getItem('outbase_record_session_id')||'';
  let sessionStartedAt=Number(localStorage.getItem('outbase_record_session_started_at')||0);
  let recoverableSession=readStored('outbase_record_recoverable_session',null);
  let resumeBreakPending=localStorage.getItem('outbase_record_resume_break_pending')==='1';
  const previewMode=params.get('preview')||'';

  const defaultPlanTypes=[
    {id:'type-walk',name:'散歩',tone:'green',hidden:false},
    {id:'type-drive-walk',name:'ドライブ散歩',tone:'gold',hidden:false},
    {id:'type-camp',name:'キャンプ',tone:'green',hidden:false},
    {id:'type-shopping',name:'ショッピング',tone:'blue',hidden:false},
    {id:'type-event',name:'イベント',tone:'slate',hidden:false},
    {id:'type-other',name:'その他',tone:'slate',hidden:false}
  ];
  const defaultCompanions=[
    {id:'comp-solo',name:'ひとり',hidden:false,solo:true},
    {id:'comp-rin',name:'リン',hidden:false},
    {id:'comp-kota',name:'コタ',hidden:false},
    {id:'comp-ao',name:'アオ',hidden:false},
    {id:'comp-ela',name:'エラ',hidden:false},
    {id:'comp-yuki',name:'ユキ',hidden:false}
  ];
  const defaultPlans=[
    {id:'plan-kota-5',title:'コタ散歩',type:'散歩',start:'2026-07-05',end:'2026-07-05',startTime:'07:00',endTime:'08:00',allDay:false,companionNames:['コタ'],location:'近所',prep:'準備不要',note:''},
    {id:'plan-drive-6',title:'手賀沼ドライブ散歩',type:'ドライブ散歩',start:'2026-07-06',end:'2026-07-06',startTime:'09:00',endTime:'12:00',allDay:false,companionNames:['コタ'],location:'手賀沼',prep:'駐車場確認',note:'駐車位置も記録する。'},
    {id:'plan-shopping-10',title:'ショッピング',type:'ショッピング',start:'2026-07-10',end:'2026-07-10',startTime:'10:00',endTime:'12:00',allDay:false,companionNames:['リン','コタ'],location:'',prep:'準備不要',note:''},
    {id:'plan-kota-12',title:'コタ散歩',type:'散歩',start:'2026-07-12',end:'2026-07-12',startTime:'07:00',endTime:'08:00',allDay:false,companionNames:['コタ'],location:'近所',prep:'準備不要',note:''},
    {id:'plan-drive-13',title:'手賀沼ドライブ散歩',type:'ドライブ散歩',start:'2026-07-13',end:'2026-07-13',startTime:'09:00',endTime:'12:00',allDay:false,companionNames:['コタ'],location:'手賀沼',prep:'準備中',note:'駐車場、水飲み場、日陰を確認する。'},
    {id:'plan-akagi',title:'スノーピーク赤城山CF',type:'キャンプ',start:'2026-07-18',end:'2026-07-20',allDay:true,companionNames:['リン','コタ'],location:'群馬県前橋市',prep:'準備中',note:'2泊。買い物・料理・ギア・ルートを準備。'},
    {id:'plan-event-23',title:'地域イベント',type:'イベント',start:'2026-07-23',end:'2026-07-23',startTime:'13:00',endTime:'16:00',allDay:false,companionNames:[],location:'',prep:'未着手',note:''}
  ];
  let planTypes=readStored('outbase_plan_types_v2',defaultPlanTypes);
  let companions=readStored('outbase_plan_companions_v2',defaultCompanions);
  let plans=readStored('outbase_plans_v1',defaultPlans);
  let selectedPlanDate=localStorage.getItem('outbase_selected_plan_date')||'2026-07-13';
  let planMonth=localStorage.getItem('outbase_plan_month')||selectedPlanDate.slice(0,7);
  let planSheet=params.get('planSheet')||'';
  let selectedPlanId=params.get('planId')||'';
  let planDraft=null;
  let planDraftDirty=false;
  let planSheetDrag=null;
  let planCalendarTouchStart=null;
  let planCalendarSwipeSuppressUntil=0;
  let planReminderTimer=null;
  let activePlanId=localStorage.getItem('outbase_active_plan_id')||'plan-drive-13';
  function seedGear(id,name,category,quantity=1,brand='Snow Peak',storage='自宅',model='',role='本体'){
    return {id,name,category,quantity,brand,storage,model,role,relations:[],condition:'使用可',purchaseDate:'',purchasePrice:'',tags:[],memo:'',favorite:false,stockAmount:'',stockUnit:'個',reorderPoint:'',stockStep:'1',openedDate:'',expiryDate:'',updatedAt:0};
  }
  const defaultGearLibrary=[
    seedGear('gear-living-shell','リビングシェル アイボリー','テント'),
    seedGear('gear-amenity-dome','アメニティドームM アイボリー','テント'),
    seedGear('gear-hexa-evo','HDタープ ヘキサエヴォ Pro. アイボリー','タープ'),
    seedGear('gear-takibi-tarp','TAKIBIタープ M','タープ'),
    seedGear('gear-igt4','IGT 4ユニット','テーブル'),
    seedGear('gear-igt2','IGT 2ユニット','テーブル'),
    seedGear('gear-mytable','Myテーブル竹','テーブル',2),
    seedGear('gear-lowchair','ローチェア30','チェア',2),
    seedGear('gear-recline','リクライニングワイドチェア','チェア',2),
    seedGear('gear-cot','コット','寝具',2),
    seedGear('gear-ground-futon','グランドオフトン シングル','寝具',2),
    seedGear('gear-mat25','インフレータブルマット 2.5W','寝具',2),
    seedGear('gear-ss-single','SSシングル','寝具',2),
    seedGear('gear-shelf50','シェルフコンテナ50','収納',2),
    seedGear('gear-multi-l','マルチコンテナL','収納'),
    seedGear('gear-unit220','ユニットギアバッグ220','収納'),
    seedGear('gear-soft38','ソフトクーラー38','冷蔵'),
    seedGear('gear-delta3','DELTA 3 1500','電源',1,'EcoFlow'),
    seedGear('gear-delta3-extra','DELTA 3 拡張バッテリー','電源',1,'EcoFlow'),
    seedGear('gear-wave3','WAVE 3','空調',1,'EcoFlow'),
    seedGear('gear-wave3-addon','WAVE 3 Add-On Battery','電源',1,'EcoFlow'),
    seedGear('gear-glacier','GLACIER Classic','冷蔵',1,'EcoFlow'),
    seedGear('gear-panel220','220W 両面ソーラーパネル','電源',1,'EcoFlow'),
    seedGear('gear-alternator','Alternator Charger','電源',1,'EcoFlow'),
    seedGear('gear-glow-stove','グローストーブ','暖房'),
    seedGear('gear-ks67','KS-67H','暖房',1,'TOYOTOMI'),
    seedGear('gear-mk-stove','MKストーブ','暖房',1,'MK'),
    seedGear('gear-hozuki','ほおずき','照明'),
    seedGear('gear-tane','たねほおずき','照明',7),
    seedGear('gear-spot','スポットほおずき','照明'),
    seedGear('gear-giga-hl','ギガパワーランタン HL','照明'),
    seedGear('gear-giga-tl','ギガパワーランタン TL','照明'),
    seedGear('gear-giga-bf','ギガパワーBFランタン','照明'),
    seedGear('gear-celes','セレス','照明'),
    seedGear('gear-homecamp','HOME&CAMPランタン','照明'),
    seedGear('gear-pile','パイルドライバー','照明'),
    seedGear('gear-lantern-hanger','ランタンハンガー','照明'),
    seedGear('gear-dog-futon','ドッグオフトン','ペット'),
    seedGear('gear-dog-cushion','ドッグクッション','ペット'),
    seedGear('gear-dog-bowl','フードボウルL','ペット',2),
    seedGear('gear-kota-cart','AirBuggy Dome3 Large','ペット',1,'AirBuggy','玄関'),
    seedGear('gear-flask250','チタンスキットル250','キッチン'),
    seedGear('gear-bowl600','チタンダブルボウル600','キッチン',2),
    seedGear('gear-peltier','ペルチェクーリングデバイスベスト','空調'),
    seedGear('gear-dtpack','SPK DTパックP DC','収納'),
    seedGear('gear-gm70','トランクカーゴ 70L','収納',1,'GORDON MILLER'),
    seedGear('gear-gm50','トランクカーゴ 50L','収納',2,'GORDON MILLER'),
    seedGear('gear-gm20','トランクカーゴ 20L','収納',1,'GORDON MILLER'),
    seedGear('gear-gm18','トランクカーゴ 18L Low','収納',1,'GORDON MILLER'),
    seedGear('gear-gm22','トランクカーゴ 22L Low','収納',2,'GORDON MILLER')
  ];
  const defaultMobilityLibrary=[
    {id:'mobility-alphard',type:'車',name:'アルファード 30後期 Executive Lounge',maker:'TOYOTA',model:'2018',color:'ブラック',plate:'',storage:'自宅',condition:'使用可',primary:true,memo:'キャンプ・ドライブ散歩の主車両'},
    {id:'mobility-roadbike',type:'自転車',name:'ロードバイク',maker:'',model:'',color:'',plate:'',storage:'自宅',condition:'使用可',primary:false,memo:'メーカー・車種は未登録'}
  ];
  const defaultPetLibrary=[
    {id:'pet-kota',name:'コタ',species:'犬',breed:'フレンチブルドッグ',sex:'オス',age:'4',size:'最大',collarColor:'ダークブラウン',personality:'',medicalNote:'',photo:''},
    {id:'pet-ao',name:'アオ',species:'猫',breed:'茶トラ',sex:'オス',age:'4',size:'',collarColor:'薄青',personality:'甘えん坊・泣き虫',medicalNote:'',photo:''},
    {id:'pet-ela',name:'エラ',species:'猫',breed:'メインクーン',sex:'メス',age:'4',size:'',collarColor:'グレー',personality:'一人好き、たまに甘える',medicalNote:'',photo:''},
    {id:'pet-yuki',name:'ユキ',species:'猫',breed:'アメリカンショートヘア',sex:'メス',age:'4',size:'最小',collarColor:'白',personality:'',medicalNote:'',photo:''}
  ];
  const defaultStorageLibrary=[
    {id:'storage-home',name:'自宅',type:'住居',memo:'基本の保管場所'},
    {id:'storage-entry',name:'玄関',type:'住居',memo:'散歩・ペット用品'},
    {id:'storage-car',name:'車内',type:'車両',memo:'常備品'},
    {id:'storage-shed',name:'物置',type:'収納',memo:'季節用品・大型用品'}
  ];
  const defaultGearKits=[
    {id:'kit-power',name:'EcoFlow 電源システム',kind:'セット',gearIds:['gear-delta3','gear-delta3-extra','gear-panel220','gear-alternator'],memo:'電源本体・拡張・充電系をまとめて確認',favorite:true,updatedAt:0},
    {id:'kit-lantern',name:'ランタンスタンドまわり',kind:'組み合わせ',gearIds:['gear-giga-bf','gear-pile','gear-lantern-hanger'],memo:'本体・取付部品・スタンドの組み合わせ例',favorite:true,updatedAt:0},
    {id:'kit-kota',name:'コタ外出セット',kind:'持出しセット',gearIds:['gear-kota-cart','gear-dog-bowl','gear-dog-futon'],memo:'散歩・キャンプ時にまとめて確認',favorite:false,updatedAt:0}
  ];
  const defaultGearCustoms=[];
  const defaultAssetEvents=[];
  let gearLibrary=readStored('outbase_gear_library_v1',defaultGearLibrary);
  let mobilityLibrary=readStored('outbase_mobility_library_v1',defaultMobilityLibrary);
  let petLibrary=readStored('outbase_pet_library_v1',defaultPetLibrary);
  let storageLibrary=readStored('outbase_storage_library_v1',defaultStorageLibrary);
  let gearKits=readStored('outbase_gear_kits_v1',defaultGearKits);
  let gearCustoms=readStored('outbase_gear_customs_v1',defaultGearCustoms);
  let assetEvents=readStored('outbase_asset_events_v1',defaultAssetEvents);
  let libraryTab=localStorage.getItem('outbase_library_tab_v1')||'gear';
  let libraryGearView=localStorage.getItem('outbase_library_gear_view_v1')||'items';
  let libraryEditorType='';
  let libraryEditorId='';
  let libraryEditorRelationsDraft=[];
  let libraryEditorKitGearIds=[];
  let libraryEditorKitRequiredIds=[];
  let libraryEditorCustomPartIds=[];
  let libraryEditorDraft=null;
  let libraryKitQuery='';
  let libraryGearQuery='';
  let libraryGearCategory='すべて';
  let libraryGearSort='name';
  let libraryGearLimit=30;
  let libraryRelationFilter='すべて';
  let libraryStockFilter='すべて';
  let libraryEventFilter='すべて';
  let libraryScrollPositions={};
  let prepStore=readStored('outbase_prep_v1',{});
  let prepCommonStore=readStored('outbase_prep_common_v1',{modules:{},updatedAt:0});
  let prepSheet='';
  let prepModuleId='';
  let prepSheetDrag=null;
  let modalTapBlockUntil=0;
  let navShieldTimer=null;
  if(['prep01','prep01-module','prep011','prep012'].includes(previewMode)) activePlanId='plan-akagi';
  if(previewMode==='prep01-module'){prepSheet='module';prepModuleId='gear';}
  if(previewMode==='prep012-common'){activePlanId='none';prepSheet='common-module';prepModuleId='cooking';}
  if(previewMode==='prep012-none')activePlanId='none';
  if(previewMode==='plan-add'||previewMode==='plan011-add') planSheet='add';
  if(previewMode==='plan-detail'){planSheet='detail';selectedPlanId='plan-drive-13';}
  if(previewMode==='plan-list') planSheet='list';
  if(previewMode==='plan011-repeat'||previewMode==='plan012-repeat'){planSheet='add';}
  if(previewMode==='plan012-reminder'){planSheet='add';}
  if(previewMode==='plan011-types') planSheet='type-manager';

  function migratePlanData(){
    const schema=Number(localStorage.getItem('outbase_plan_schema')||0);
    const demoRemove=new Set(['plan-oz','plan-tani','plan-check-10']);
    plans=plans.filter(p=>!demoRemove.has(p.id)).map(p=>{
      const companionNames=Array.isArray(p.companionNames)?p.companionNames:String(p.companion||'').split(/[・,、]/).map(x=>x.trim()).filter(Boolean);
      return {...p,type:p.type==='買い物'?'ショッピング':p.type==='日常'?'その他':p.type,startTime:p.startTime||p.time||'',endTime:p.endTime||'',allDay:Boolean(p.allDay),companionNames,reminders:Array.isArray(p.reminders)?p.reminders:[],allDayReminderTime:p.allDayReminderTime||'09:00'};
    });
    if(!plans.length) plans=defaultPlans.map(p=>({...p,reminders:[],allDayReminderTime:'09:00'}));
    if(schema<3){
      localStorage.setItem('outbase_plan_schema','3');
      localStorage.setItem('outbase_plans_v1',JSON.stringify(plans));
    }
  }
  migratePlanData();
  function normalizeLibraryData(){
    const librarySchema=Number(localStorage.getItem('outbase_library_schema')||0);
    if(librarySchema<1&&Array.isArray(gearLibrary)&&gearLibrary.length<=10){const names=new Set(gearLibrary.map(x=>String(x.name||'').toLowerCase()));defaultGearLibrary.forEach(x=>{if(!names.has(x.name.toLowerCase()))gearLibrary.push({...x});});}
    gearLibrary=(Array.isArray(gearLibrary)?gearLibrary:[]).map((g,index)=>({
      id:g.id||newId('gear'),name:String(g.name||`名称未登録 ${index+1}`),category:g.category||'その他',role:g.role||'本体',brand:g.brand||'',model:g.model||'',quantity:Math.max(1,Number(g.quantity)||1),storage:g.storage||'',condition:g.condition||'使用可',purchaseDate:g.purchaseDate||'',purchasePrice:g.purchasePrice??'',tags:Array.isArray(g.tags)?g.tags:String(g.tags||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean),memo:g.memo||'',favorite:Boolean(g.favorite),relations:Array.isArray(g.relations)?g.relations.filter(r=>r&&r.type&&r.targetId).map(r=>({type:r.type,targetType:r.targetType||'gear',targetId:r.targetId,condition:r.condition||''})):[],stockAmount:g.stockAmount===''||g.stockAmount==null?'':Math.max(0,Number(g.stockAmount)||0),stockUnit:g.stockUnit||'個',reorderPoint:g.reorderPoint===''||g.reorderPoint==null?'':Math.max(0,Number(g.reorderPoint)||0),stockStep:String(g.stockStep||'1'),openedDate:g.openedDate||'',expiryDate:g.expiryDate||'',updatedAt:Number(g.updatedAt||0)
    }));
    const gearIds=new Set(gearLibrary.map(g=>g.id));
    const mobilityIds=new Set((mobilityLibrary||[]).map(x=>x.id));
    const storageIds=new Set((storageLibrary||[]).map(x=>x.id));
    gearLibrary.forEach(g=>{g.relations=g.relations.filter(r=>{const t=r.targetType||'gear';return t==='gear'?gearIds.has(r.targetId)&&r.targetId!==g.id:t==='mobility'?mobilityIds.has(r.targetId):t==='storage'?storageIds.has(r.targetId):false;});});
    const ensureRelation=(sourceId,type,targetId)=>{const source=gearLibrary.find(g=>g.id===sourceId);if(source&&gearIds.has(targetId)&&!source.relations.some(r=>r.type===type&&r.targetId===targetId))source.relations.push({type,targetId});};
    if(librarySchema<2){
      const roleMap={
        'gear-delta3-extra':'専用品','gear-wave3-addon':'専用品','gear-lantern-hanger':'取付部品','gear-panel220':'アクセサリー','gear-alternator':'アクセサリー',
        'gear-shelf50':'収納ケース','gear-multi-l':'収納ケース','gear-unit220':'収納ケース','gear-dtpack':'収納ケース','gear-gm70':'収納ケース','gear-gm50':'収納ケース','gear-gm20':'収納ケース','gear-gm18':'収納ケース','gear-gm22':'収納ケース'
      };
      gearLibrary.forEach(g=>{if(roleMap[g.id])g.role=roleMap[g.id];});
      ensureRelation('gear-delta3-extra','dedicatedFor','gear-delta3');
      ensureRelation('gear-wave3-addon','dedicatedFor','gear-wave3');
      ensureRelation('gear-lantern-hanger','mountsOn','gear-pile');
      ensureRelation('gear-panel220','useWith','gear-delta3');
      ensureRelation('gear-alternator','useWith','gear-delta3');
    }
    mobilityLibrary=Array.isArray(mobilityLibrary)?mobilityLibrary:[];
    petLibrary=Array.isArray(petLibrary)?petLibrary:[];
    storageLibrary=Array.isArray(storageLibrary)?storageLibrary:[];
    gearKits=(Array.isArray(gearKits)?gearKits:[]).map((k,index)=>{const ids=Array.isArray(k.gearIds)?k.gearIds.filter(id=>gearIds.has(id)):[];return {id:k.id||newId('kit'),name:String(k.name||`セット ${index+1}`),kind:k.kind||'セット',gearIds:ids,requiredGearIds:Array.isArray(k.requiredGearIds)?k.requiredGearIds.filter(id=>ids.includes(id)):ids.slice(),conditionTags:Array.isArray(k.conditionTags)?k.conditionTags:[],memo:k.memo||'',favorite:Boolean(k.favorite),updatedAt:Number(k.updatedAt||0)}});
    gearCustoms=(Array.isArray(gearCustoms)?gearCustoms:[]).map((c,index)=>({id:c.id||newId('custom'),name:String(c.name||`カスタム ${index+1}`),baseGearId:gearIds.has(c.baseGearId)?c.baseGearId:'',partGearIds:Array.isArray(c.partGearIds)?c.partGearIds.filter(id=>gearIds.has(id)&&id!==c.baseGearId):[],status:['現在の仕様','保存構成','過去構成'].includes(c.status)?c.status:'保存構成',memo:c.memo||'',updatedAt:Number(c.updatedAt||0)})).filter(c=>c.baseGearId);
    assetEvents=(Array.isArray(assetEvents)?assetEvents:[]).map((e,index)=>({id:e.id||newId('event'),targetType:['gear','mobility','pet'].includes(e.targetType)?e.targetType:'gear',targetId:e.targetId||'',eventType:e.eventType||'使用',date:e.date||new Date().toISOString().slice(0,10),title:e.title||`履歴 ${index+1}`,detail:e.detail||'',cost:e.cost??'',nextDate:e.nextDate||'',createdAt:Number(e.createdAt||Date.now())})).filter(e=>e.targetId);
    if(librarySchema<2&&gearKits.length===0)gearKits=defaultGearKits.map(k=>({...k,gearIds:k.gearIds.filter(id=>gearIds.has(id))}));
    if(!['gear','mobility','pets','storage','transfer'].includes(libraryTab))libraryTab='gear';
    if(!['dashboard','items','kits','customs','stock','lifecycle','relations'].includes(libraryGearView))libraryGearView='dashboard';
    const companionNames=new Set(companions.map(x=>x.name));
    petLibrary.forEach(p=>{if(p.name&&!companionNames.has(p.name)){companions.push({id:newId('comp'),name:p.name,hidden:false});companionNames.add(p.name);}});
    localStorage.setItem('outbase_plan_companions_v2',JSON.stringify(companions));
    localStorage.setItem('outbase_library_schema','3');
    persistGearLibrary();persistGearKits();persistGearCustoms();persistAssetEvents();persistMobilityLibrary();persistPetLibrary();persistStorageLibrary();
  }
  normalizeLibraryData();
  function seedLibrary03PreviewData(){
    if(!String(previewMode).startsWith('library03-')&&!String(previewMode).startsWith('library05-'))return;
    active='prep';activePlanId='none';prepSheet='gear-manager';libraryTab='gear';
    const add=x=>{if(!gearLibrary.some(g=>g.id===x.id))gearLibrary.push(x);};
    const demo=(id,name,category,role,stockAmount='',stockUnit='個',reorderPoint='',stockStep='1',relations=[])=>({id,name,category,quantity:1,brand:'',storage:'自宅',model:'名称未登録',role,relations,condition:'使用可',purchaseDate:'',purchasePrice:'',tags:['画面確認用'],memo:'画面確認用データ',favorite:false,stockAmount,stockUnit,reorderPoint,stockStep,openedDate:'',expiryDate:'',updatedAt:Date.now()});
    add(demo('demo-flat-burner','フラットバーナー','キッチン','本体'));
    add(demo('demo-lantern-shade','ランタン用カスタムシェード','照明','カスタムパーツ','','個','','1',[{type:'installedOn',targetId:'gear-giga-bf'}]));
    add(demo('demo-burner-trivet','フラットバーナー用カスタム五徳','キッチン','カスタムパーツ','','個','','1',[{type:'installedOn',targetId:'demo-flat-burner'}]));
    add(demo('demo-wick','ランタン替芯','照明','消耗品',2,'本',1,'1',[{type:'consumableFor',targetId:'gear-giga-bf'}]));
    add(demo('demo-mantle','ランタン用マントル','照明','消耗品',1,'枚',2,'1',[{type:'consumableFor',targetId:'gear-giga-bf'}]));
    add({...demo('demo-oil','ランタンオイル','照明','燃料',0.4,'L',0.5,'0.1',[{type:'fuelFor',targetId:'gear-giga-bf'}]),openedDate:'2026-06-20'});
    gearCustoms=[
      {id:'demo-custom-lantern',name:'BFランタン 現在仕様',baseGearId:'gear-giga-bf',partGearIds:['demo-lantern-shade'],status:'現在の仕様',memo:'カスタムシェード装着',updatedAt:Date.now()},
      {id:'demo-custom-burner',name:'フラットバーナー 現在仕様',baseGearId:'demo-flat-burner',partGearIds:['demo-burner-trivet'],status:'現在の仕様',memo:'カスタム五徳へ交換',updatedAt:Date.now()}
    ];
    if(previewMode==='library03-customs')libraryGearView='customs';
    if(previewMode==='library03-stock')libraryGearView='stock';
    if(previewMode==='library03-stock-editor'){libraryGearView='stock';libraryOpenEditor('gear','demo-oil');}
    if(previewMode==='library03-custom-editor'){libraryGearView='customs';libraryOpenEditor('custom','demo-custom-lantern');}
    if(String(previewMode).startsWith('library05-')){assetEvents=[
      {id:'demo-event-1',targetType:'gear',targetId:'gear-giga-bf',eventType:'カスタム',date:'2026-07-11',title:'カスタムシェードへ交換',detail:'純正シェードは物置へ保管',cost:'',nextDate:'',createdAt:4},
      {id:'demo-event-2',targetType:'gear',targetId:'demo-oil',eventType:'補充',date:'2026-07-10',title:'ランタンオイルを補充',detail:'残量0.4L。次回前に追加購入',cost:'',nextDate:'2026-07-24',createdAt:3},
      {id:'demo-event-3',targetType:'mobility',targetId:'mobility-alphard',eventType:'点検',date:'2026-06-28',title:'キャンプ後の車内清掃',detail:'ルーフボックスと車載BOXも確認',cost:'',nextDate:'2026-08-01',createdAt:2},
      {id:'demo-event-4',targetType:'pet',targetId:'pet-kota',eventType:'通院',date:'2026-06-15',title:'定期診察',detail:'体調問題なし',cost:'5800',nextDate:'2026-09-15',createdAt:1}
    ];libraryGearView=previewMode==='library05-dashboard'?'dashboard':'lifecycle';if(previewMode==='library05-event-editor')libraryOpenEditor('event','demo-event-2');}
  }
  seedLibrary03PreviewData();

  if(recordSessionState==='idle'){
    elapsedMs=0;
    activeStartedAt=0;
    trackPoints=[];
    currentSessionId='';
    sessionStartedAt=0;
    resumeBreakPending=false;
    localStorage.setItem('outbase_record_elapsed_ms','0');
    localStorage.setItem('outbase_record_track_points','[]');
    localStorage.removeItem('outbase_record_active_started_at');
    localStorage.removeItem('outbase_record_session_id');
    localStorage.removeItem('outbase_record_session_started_at');
    localStorage.removeItem('outbase_record_resume_break_pending');
  }else if(recordSessionState==='paused'){
    activeStartedAt=0;
  }
  if(currentPosition){
    gpsStatus=recordSessionState==='active'
      ?`GPS記録中 ±${currentPosition.accuracy||'-'}m`
      :recordSessionState==='paused'
        ?`一時停止中・現在地取得済み ±${currentPosition.accuracy||'-'}m`
        :`現在地取得済み ±${currentPosition.accuracy||'-'}m`;
  }

  function readStored(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch(_e){return fallback;}}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function newId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}
  function nearestTrackPosition(atTime=Date.now(),maxGapMs=180000){
    let best=null,bestGap=Infinity;
    for(const point of trackPoints){
      const gap=Math.abs(Number(point.time||0)-atTime);
      if(gap<bestGap){best=point;bestGap=gap;}
    }
    if(currentPosition){
      const gap=Math.abs(Number(currentPosition.time||Date.now())-atTime);
      if(gap<bestGap){best=currentPosition;bestGap=gap;}
    }
    return best&&bestGap<=maxGapMs?best:null;
  }
  function locationSnapshot(atTime=Date.now()){
    const p=nearestTrackPosition(atTime);
    return p
      ?{lat:p.lat,lng:p.lng,accuracy:p.accuracy||null,time:p.time||atTime,pending:false,source:'auto'}
      :{lat:null,lng:null,accuracy:null,time:atTime,pending:true,source:'auto'};
  }
  function activeParking(){
    const selected=savedPins.find(x=>x.id===activeParkingId&&x.category==='parking');
    if(selected) return selected;
    const latest=[...savedPins].reverse().find(x=>x.category==='parking'&&!x.clearedAt);
    if(latest){activeParkingId=latest.id;return latest;}
    return null;
  }
  function parkingSummary(pin){
    const p=pin&&pin.parking||{};
    return [p.floor,p.area,p.number].filter(Boolean).join('・')||pin?.note||'位置と時刻を保存済み';
  }
  function parseParkingText(text){
    const t=String(text||'').replace(/\s+/g,'');
    const floor=(t.match(/(?:地下)?[0-9０-９]+階|B[0-9０-９]+|屋上/i)||[])[0]||'';
    const color=(t.match(/(?:青|赤|緑|黄|黄色|オレンジ|橙|紫|白|黒|ピンク)(?:色)?(?:エリア)?/)||[])[0]||'';
    const pillar=(t.match(/[A-Za-zＡ-Ｚａ-ｚ][0-9０-９-]*(?:柱|エリア)?/)||[])[0]||'';
    const number=(t.match(/[0-9０-９]+(?:番|台|区画)/)||[])[0]||'';
    return {floor,area:[color,pillar].filter(Boolean).join('・'),number};
  }


  function parseYmd(value){
    const [y,m,d]=String(value).split('-').map(Number);
    return new Date(y,m-1,d,12,0,0,0);
  }
  function toYmd(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}
  function compareYmd(a,b){return String(a).localeCompare(String(b));}
  function planForId(id){return plans.find(p=>p.id===id)||null;}
  function activePlan(){
    if(activePlanId==='none')return null;
    return planForId(activePlanId)||plans.find(p=>compareYmd(p.end||p.start,new Date().toISOString().slice(0,10))>=0)||plans[0]||null;
  }
  function activePlanCandidates(){
    const today=new Date().toISOString().slice(0,10),current=planForId(activePlanId);
    const rows=plans.filter(p=>p.id===current?.id||compareYmd(p.end||p.start,today)>=0).sort((a,b)=>compareYmd(a.start,b.start)||(a.startTime||'').localeCompare(b.startTime||''));
    return rows.slice(0,12);
  }
  function anySheetOpen(){return Boolean(planSheet||prepSheet||recordSheet);}
  function blockUnderlyingNavigation(ms=720){
    modalTapBlockUntil=Math.max(modalTapBlockUntil,Date.now()+ms);
    let shield=document.getElementById('outbaseNavShield');
    if(!shield){
      shield=document.createElement('div');shield.id='outbaseNavShield';shield.setAttribute('aria-hidden','true');
      const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
      ['pointerdown','pointerup','click','touchstart','touchend'].forEach(type=>shield.addEventListener(type,stop,{capture:true,passive:false}));
      document.body.appendChild(shield);
    }
    clearTimeout(navShieldTimer);
    navShieldTimer=setTimeout(()=>{document.getElementById('outbaseNavShield')?.remove();},ms+40);
  }
  function planTypeLabel(type){return type||'予定';}
  function planTypeSetting(name){return planTypes.find(t=>t.name===name)||null;}
  function planTone(plan){return plan.tone||planTypeSetting(plan.type)?.tone||'slate';}
  function planCompanionNames(plan){
    if(Array.isArray(plan.companionNames)) return plan.companionNames.filter(Boolean);
    if(Array.isArray(plan.companionIds)) return plan.companionIds.map(id=>companions.find(c=>c.id===id)?.name).filter(Boolean);
    return String(plan.companion||'').split(/[・,、]/).map(x=>x.trim()).filter(Boolean);
  }
  function planCompanionLabel(plan){return planCompanionNames(plan).join('・');}
  function dateTimeAt(value,time,endOfDay=false){
    const [y,m,d]=String(value).split('-').map(Number);
    if(time){const [hh,mm]=time.split(':').map(Number);return new Date(y,m-1,d,hh||0,mm||0,0,0);}
    return endOfDay?new Date(y,m-1,d,23,59,59,999):new Date(y,m-1,d,0,0,0,0);
  }
  function planStatus(plan){
    if(plan.manualStatus==='中止'||plan.manualStatus==='未実施') return plan.manualStatus;
    const now=new Date();
    const start=dateTimeAt(plan.start,plan.allDay?'':(plan.startTime||plan.time||''),false);
    const end=dateTimeAt(plan.end||plan.start,plan.allDay?'':(plan.endTime||''),true);
    if(now<start) return '予定';
    if(now<=end) return '実施中';
    return '終了済み';
  }
  function planRangeLabel(plan){
    if(!plan) return '';
    const s=parseYmd(plan.start),e=parseYmd(plan.end||plan.start);
    const left=`${s.getMonth()+1}/${s.getDate()}`;
    const right=plan.end&&plan.end!==plan.start?`−${e.getMonth()+1}/${e.getDate()}`:'';
    const startTime=plan.allDay?'':(plan.startTime||plan.time||'');
    const endTime=plan.allDay?'':(plan.endTime||'');
    const times=startTime?` ${startTime}${endTime?`−${endTime}`:''}`:'';
    return `${left}${right}${times}`;
  }
  function selectedDateLabel(value){const d=parseYmd(value),w=['日','月','火','水','木','金','土'][d.getDay()];return `${d.getMonth()+1}月${d.getDate()}日（${w}）`;}
  function plansForDate(value){return plans.filter(p=>compareYmd(p.start,value)<=0&&compareYmd(p.end||p.start,value)>=0).sort((a,b)=>(a.startTime||a.time||'99:99').localeCompare(b.startTime||b.time||'99:99'));}
  function persistPlans(){
    localStorage.setItem('outbase_plans_v1',JSON.stringify(plans));
    localStorage.setItem('outbase_plan_types_v2',JSON.stringify(planTypes));
    localStorage.setItem('outbase_plan_companions_v2',JSON.stringify(companions));
    localStorage.setItem('outbase_selected_plan_date',selectedPlanDate);
    localStorage.setItem('outbase_plan_month',planMonth);
    localStorage.setItem('outbase_active_plan_id',activePlanId);
    localStorage.setItem('outbase_plan_schema','3');
  }
  function monthCalendar(monthKey){
    const [y,m]=monthKey.split('-').map(Number),first=new Date(y,m-1,1,12),last=new Date(y,m,0,12);
    const start=addDays(first,-first.getDay()),end=addDays(last,6-last.getDay());
    const days=[];for(let d=new Date(start);d<=end;d=addDays(d,1)) days.push(new Date(d));
    return {year:y,month:m,days,weeks:days.length/7,start:toYmd(start),end:toYmd(end)};
  }
  function changePlanMonth(direction){
    const [y,m]=planMonth.split('-').map(Number),d=new Date(y,m-1+direction,1,12);
    planMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    selectedPlanDate=`${planMonth}-01`;
    persistPlans();
  }
  function calendarSegments(meta){
    const visible=plans.filter(p=>compareYmd(p.end||p.start,meta.start)>=0&&compareYmd(p.start,meta.end)<=0);
    const occupied=Array.from({length:meta.weeks},()=>[[],[]]);
    const html=[];
    for(const plan of visible.sort((a,b)=>compareYmd(a.start,b.start)||compareYmd(b.end||b.start,a.end||a.start))){
      const ps=parseYmd(plan.start),pe=parseYmd(plan.end||plan.start);
      for(let week=0;week<meta.weeks;week++){
        const ws=meta.days[week*7],we=meta.days[week*7+6];
        const ss=ps>ws?ps:ws,se=pe<we?pe:we;if(ss>se) continue;
        const col=Math.round((ss-ws)/86400000)+1,span=Math.round((se-ss)/86400000)+1;
        let lane=0;while(lane<2&&occupied[week][lane].some(r=>!(col+span-1<r[0]||col>r[1]))) lane++;
        if(lane>=2) continue;occupied[week][lane].push([col,col+span-1]);
        html.push(`<div class="eventBar ${planTone(plan)} planSegment" style="grid-column:${col}/span ${span};grid-row:${week+1};--lane:${lane}" aria-hidden="true">${escapeHtml(plan.title)}</div>`);
      }
    }
    return html.join('');
  }
  function companionIdsForPlan(plan){
    if(Array.isArray(plan?.companionIds)) return plan.companionIds.filter(id=>companions.some(c=>c.id===id));
    const names=planCompanionNames(plan||{});
    return names.map(name=>companions.find(c=>c.name===name)?.id).filter(Boolean);
  }
  function defaultRepeat(startValue){
    const start=parseYmd(startValue||selectedPlanDate),day=start.getDate(),weekday=start.getDay();
    const lastDay=new Date(start.getFullYear(),start.getMonth()+1,0,12).getDate();
    const ordinal=day+7>lastDay?-1:Math.ceil(day/7);
    return {mode:'none',customFrequency:'weekly',interval:2,weekdays:[weekday],monthlyMode:'dayOfMonth',monthDay:day,monthOrdinal:ordinal,monthWeekday:weekday,endMode:'none',count:10,until:''};
  }
  function normalizeRepeat(raw,startValue){
    const base=defaultRepeat(startValue),r=raw||{};
    if(r.mode){return {...base,...r,weekdays:Array.isArray(r.weekdays)&&r.weekdays.length?r.weekdays.map(Number):base.weekdays};}
    if(r.frequency&&r.frequency!=='none'){
      const interval=Math.max(1,Number(r.interval)||1);
      return {...base,mode:interval===1?r.frequency:'custom',customFrequency:r.frequency,interval,weekdays:Array.isArray(r.weekdays)&&r.weekdays.length?r.weekdays.map(Number):base.weekdays,endMode:r.endMode||'none',count:Number(r.count)||10,until:r.until||''};
    }
    return base;
  }
  function blankPlanDraft(plan=null){
    const editing=Boolean(plan),startValue=plan?.start||selectedPlanDate;
    return {
      editingId:plan?.id||'',title:plan?.title||'',start:startValue,end:plan?.end||plan?.start||selectedPlanDate,
      startTime:plan?.startTime||plan?.time||'',endTime:plan?.endTime||'',allDay:editing?Boolean(plan.allDay):true,
      type:plan?.type||'',companionIds:companionIdsForPlan(plan),companionNames:planCompanionNames(plan||{}),location:plan?.location||'',note:plan?.note||'',
      repeat:normalizeRepeat(plan?.repeat,startValue),reminders:Array.isArray(plan?.reminders)?plan.reminders.map(x=>({...x,id:x.id||newId('reminder')})):[],allDayReminderTime:plan?.allDayReminderTime||'09:00'
    };
  }
  function ensurePlanDraft(plan=null){if(!planDraft||planDraft.editingId!==(plan?.id||'')) planDraft=blankPlanDraft(plan);return planDraft;}
  function syncPlanDraftFromForm(){
    if(!planDraft) return;
    const get=id=>document.getElementById(id);
    planDraft.title=get('planTitleInput')?.value??planDraft.title;
    planDraft.start=get('planStartInput')?.value||planDraft.start;
    planDraft.end=get('planEndInput')?.value||planDraft.end;
    planDraft.startTime=get('planStartTimeInput')?.value??planDraft.startTime;
    planDraft.endTime=get('planEndTimeInput')?.value??planDraft.endTime;
    planDraft.allDay=Boolean(get('planAllDayInput')?.checked);
    planDraft.location=get('planLocationInput')?.value??planDraft.location;
    planDraft.note=get('planNoteInput')?.value??planDraft.note;
    planDraft.allDayReminderTime=get('planAllDayReminderTime')?.value||planDraft.allDayReminderTime||'09:00';
    const mode=get('planRepeatMode');if(mode) planDraft.repeat.mode=mode.value;
    const customFrequency=get('planRepeatCustomFrequency');if(customFrequency) planDraft.repeat.customFrequency=customFrequency.value;
    const interval=get('planRepeatInterval');if(interval) planDraft.repeat.interval=Math.max(1,Number(interval.value)||1);
    const monthlyMode=get('planRepeatMonthlyMode');if(monthlyMode) planDraft.repeat.monthlyMode=monthlyMode.value;
    const monthDay=get('planRepeatMonthDay');if(monthDay) planDraft.repeat.monthDay=Math.min(31,Math.max(1,Number(monthDay.value)||1));
    const monthOrdinal=get('planRepeatMonthOrdinal');if(monthOrdinal) planDraft.repeat.monthOrdinal=Number(monthOrdinal.value)||1;
    const monthWeekday=get('planRepeatMonthWeekday');if(monthWeekday) planDraft.repeat.monthWeekday=Number(monthWeekday.value)||0;
    const endMode=get('planRepeatEndMode');if(endMode) planDraft.repeat.endMode=endMode.value;
    const count=get('planRepeatCount');if(count) planDraft.repeat.count=Math.max(1,Number(count.value)||10);
    const until=get('planRepeatUntil');if(until) planDraft.repeat.until=until.value;
    const reminderRows=[...document.querySelectorAll('[data-reminder-row]')];
    if(reminderRows.length){
      planDraft.reminders=reminderRows.map(row=>({id:row.dataset.reminderRow,value:Math.max(1,Number(row.querySelector('[data-reminder-value]')?.value)||1),unit:row.querySelector('[data-reminder-unit]')?.value||'day'}));
    }
  }
  function openPlanEditor(plan=null){selectedPlanId=plan?.id||'';planDraft=blankPlanDraft(plan);planDraftDirty=false;planSheet=plan?'edit':'add';}
  function attemptClosePlanSheet(){
    if((planSheet==='add'||planSheet==='edit')&&planDraftDirty&&!confirm('入力内容を破棄して閉じますか？')) return false;
    blockUnderlyingNavigation();
    planSheet='';selectedPlanId='';planDraft=null;planDraftDirty=false;render();return true;
  }
  function nthWeekdayOfMonth(year,month,weekday,ordinal){
    if(ordinal===-1){const last=new Date(year,month+1,0,12);last.setDate(last.getDate()-((last.getDay()-weekday+7)%7));return last;}
    const first=new Date(year,month,1,12),offset=(weekday-first.getDay()+7)%7,day=1+offset+(Math.max(1,ordinal)-1)*7;
    if(day>new Date(year,month+1,0,12).getDate()) return null;
    return new Date(year,month,day,12);
  }
  function monthDate(year,month,day){const last=new Date(year,month+1,0,12).getDate();return new Date(year,month,Math.min(last,Math.max(1,day)),12);}
  function repeatDates(draft){
    const repeat=normalizeRepeat(draft.repeat,draft.start),start=parseYmd(draft.start),mode=repeat.mode||'none';
    if(mode==='none') return [draft.start];
    const frequency=mode==='custom'?(repeat.customFrequency||'weekly'):mode;
    const interval=mode==='custom'?Math.max(1,Number(repeat.interval)||1):1;
    const max=200,countLimit=repeat.endMode==='count'?Math.min(max,Math.max(1,Number(repeat.count)||10)):max;
    const defaultDays={daily:730,weekly:3650,monthly:7300,yearly:36500}[frequency]||7300;
    const until=repeat.endMode==='until'&&repeat.until?parseYmd(repeat.until):addDays(start,defaultDays);
    const dates=[],seen=new Set();
    const push=d=>{if(!d||d<start||d>until||dates.length>=countLimit)return;const key=toYmd(d);if(!seen.has(key)){seen.add(key);dates.push(key);}};
    if(frequency==='daily'){
      for(let i=0;dates.length<countLimit;i++){const d=addDays(start,i*interval);if(d>until)break;push(d);}
    }else if(frequency==='weekly'){
      const weekdays=(repeat.weekdays&&repeat.weekdays.length?repeat.weekdays:[start.getDay()]).map(Number),anchor=addDays(start,-start.getDay());
      for(let d=new Date(start);d<=until&&dates.length<countLimit;d=addDays(d,1)){
        const week=Math.floor((d-anchor)/604800000);
        if(week%interval===0&&weekdays.includes(d.getDay())) push(d);
      }
    }else if(frequency==='monthly'){
      for(let i=0;dates.length<countLimit;i++){
        const monthIndex=start.getMonth()+i*interval,year=start.getFullYear()+Math.floor(monthIndex/12),month=((monthIndex%12)+12)%12;
        const d=repeat.monthlyMode==='nthWeekday'?nthWeekdayOfMonth(year,month,Number(repeat.monthWeekday),Number(repeat.monthOrdinal)):monthDate(year,month,Number(repeat.monthDay)||start.getDate());
        if(d&&d>until)break;push(d);
      }
    }else if(frequency==='yearly'){
      for(let i=0;dates.length<countLimit;i++){const y=start.getFullYear()+i*interval,d=monthDate(y,start.getMonth(),start.getDate());if(d>until)break;push(d);}
    }
    return dates.length?dates:[draft.start];
  }
  function rowsFromPlanDraft(draft){
    const duration=Math.max(0,Math.round((parseYmd(draft.end)-parseYmd(draft.start))/86400000));
    const dates=repeatDates(draft),seriesId=dates.length>1?newId('series'):'';
    const names=draft.companionIds.map(id=>companions.find(c=>c.id===id)?.name).filter(Boolean);
    return dates.map((date,index)=>({
      id:draft.editingId||newId('plan'),seriesId,seriesIndex:index,title:draft.title.trim(),type:draft.type||'',start:date,end:toYmd(addDays(parseYmd(date),duration)),
      startTime:draft.allDay?'':draft.startTime,endTime:draft.allDay?'':draft.endTime,allDay:Boolean(draft.allDay),companionIds:[...draft.companionIds],companionNames:names,
      location:draft.location.trim(),note:draft.note.trim(),prep:'未着手',manualStatus:'',repeat:dates.length>1?{...draft.repeat,weekdays:[...draft.repeat.weekdays]}:null,
      reminders:draft.reminders.map(x=>({...x})),allDayReminderTime:draft.allDayReminderTime||'09:00'
    }));
  }
  function reminderUnitLabel(unit){return {month:'か月前',week:'週間前',day:'日前',hour:'時間前'}[unit]||'日前';}
  function reminderDate(plan,reminder){
    const base=dateTimeAt(plan.start,plan.allDay?(plan.allDayReminderTime||'09:00'):(plan.startTime||'09:00'),false),d=new Date(base),value=Math.max(1,Number(reminder.value)||1);
    if(reminder.unit==='month')d.setMonth(d.getMonth()-value);else if(reminder.unit==='week')d.setDate(d.getDate()-value*7);else if(reminder.unit==='day')d.setDate(d.getDate()-value);else d.setHours(d.getHours()-value);
    return d;
  }
  function reminderSummary(plan){
    const rows=Array.isArray(plan?.reminders)?plan.reminders:[];
    return rows.map(r=>`${r.value}${reminderUnitLabel(r.unit)}`).join('・');
  }
  async function showPlanNotification(plan){
    const options={body:`${planRangeLabel(plan)}${plan.location?` / ${plan.location}`:''}`,tag:`outbase-plan-${plan.id}`,icon:'assets/memory_hero_art.png'};
    try{if(navigator.serviceWorker){const reg=await navigator.serviceWorker.ready;await reg.showNotification(plan.title,options);}else if(window.Notification)new Notification(plan.title,options);}catch(_e){}
  }
  function checkPlanReminders(){
    if(!window.Notification||Notification.permission!=='granted')return;
    const now=Date.now(),done=readStored('outbase_plan_notified_v1',{});let changed=false;
    for(const plan of plans){for(const reminder of (plan.reminders||[])){const at=reminderDate(plan,reminder).getTime(),key=`${plan.id}:${reminder.id}:${at}`;if(!done[key]&&now>=at&&now-at<90000){done[key]=now;changed=true;showPlanNotification(plan);}}}
    if(changed)localStorage.setItem('outbase_plan_notified_v1',JSON.stringify(done));
  }
  function requestPlanNotificationPermission(){if(window.Notification&&Notification.permission==='default')Notification.requestPermission().then(()=>checkPlanReminders()).catch(()=>{});}

  function clearRecoverableSession(){
    recoverableSession=null;
    localStorage.removeItem('outbase_record_recoverable_session');
  }
  function currentSessionRecords(){
    if(!currentSessionId) return [];
    return savedRecords.filter(r=>r.sessionId===currentSessionId&&!r.keepWithParking&&!r.parkingAssist);
  }
  function currentSessionPins(){
    if(!currentSessionId) return [];
    return savedPins.filter(pin=>pin.sessionId===currentSessionId&&pin.category!=='parking');
  }
  function destructiveSummary(){
    const rows=currentSessionRecords(),pins=currentSessionPins();
    const counts={photo:0,video:0,speech:0,memo:0,pin:pins.length};
    rows.forEach(r=>{if(r.kind!=='pin'&&Object.prototype.hasOwnProperty.call(counts,r.kind)) counts[r.kind]+=1;});
    const labels=[];
    if(counts.photo) labels.push(`写真${counts.photo}件`);
    if(counts.video) labels.push(`動画${counts.video}件`);
    if(counts.speech) labels.push(`音声${counts.speech}件`);
    if(counts.memo) labels.push(`メモ${counts.memo}件`);
    if(counts.pin) labels.push(`場所${counts.pin}件`);
    return labels.length?`${labels.join('・')}も削除されます`:'軌跡と経過時間が削除されます';
  }
  function snapshotCurrentSession(finishedElapsed,finishedDistance){
    return {
      sessionId:currentSessionId||newId('session'),
      startedAt:sessionStartedAt||Date.now(),
      finishedAt:Date.now(),
      target:recordTarget,
      elapsedMs:finishedElapsed,
      distanceKm:finishedDistance,
      trackPoints:trackPoints.map(p=>({...p})),
      records:currentSessionRecords().map(r=>({...r})),
      pins:currentSessionPins().map(pin=>({...pin,parking:pin.parking?{...pin.parking}:{}}))
    };
  }
  function resetSessionToIdle(){
    activeStartedAt=0;
    elapsedMs=0;
    recordSessionState='idle';
    currentSessionId='';
    sessionStartedAt=0;
    resumeBreakPending=false;
    recordSheet='';
    stopGeoWatch();
    releaseScreenAwake();
    trackPoints=[];
    savedPins=savedPins.filter(pin=>pin.category==='parking'&&!pin.clearedAt);
    gpsStatus=currentPosition?`現在地取得済み ±${currentPosition.accuracy||'-'}m`:'現在地を確認中';
  }
  function restoreRecoverableSession(){
    const snap=recoverableSession;
    if(!snap) return false;
    currentSessionId=snap.sessionId||newId('session');
    sessionStartedAt=Number(snap.startedAt||Date.now());
    elapsedMs=Number(snap.elapsedMs||0);
    trackPoints=Array.isArray(snap.trackPoints)?snap.trackPoints.map(p=>({...p})):[];
    const recordIds=new Set(savedRecords.map(r=>r.id));
    for(const row of (snap.records||[])) if(!recordIds.has(row.id)) savedRecords.push({...row});
    const pinIds=new Set(savedPins.map(pin=>pin.id));
    for(const pin of (snap.pins||[])) if(!pinIds.has(pin.id)) savedPins.push({...pin,parking:pin.parking?{...pin.parking}:{}});
    recordTarget=snap.target||recordTarget;
    recordSessionState='active';
    activeStartedAt=Date.now();
    resumeBreakPending=true;
    mapFollow=true;
    gpsStatus=currentPosition?`GPS記録中 ±${currentPosition.accuracy||'-'}m`:'GPSを取得しています';
    clearRecoverableSession();
    persistRecordState();
    return true;
  }
  function discardCurrentSession(){
    const records=currentSessionRecords();
    const recordIds=new Set(records.map(r=>r.id));
    savedRecords=savedRecords.filter(r=>!recordIds.has(r.id));
    recordCount=Math.max(0,recordCount-records.length);
    records.forEach(r=>deleteRecordDB(r.id));
    const pinIds=new Set(currentSessionPins().map(pin=>pin.id));
    savedPins=savedPins.filter(pin=>!pinIds.has(pin.id)||pin.category==='parking');
    clearRecoverableSession();
    resetSessionToIdle();
    persistRecordState();
  }

  if(previewMode==='parking'||previewMode==='parking-recall'||previewMode==='parking-main'){
    const pin={id:'preview-parking',lat:35.8667,lng:140.0123,accuracy:6,time:Date.now(),category:'parking',label:'駐車場',note:'入口は東側エレベーター付近',parking:{floor:'3階',area:'青エリア・C柱',number:'28番',speechText:'立体駐車場3階、青エリア、Cの28番に停めた',photoName:'C-28_柱番号.jpg'}};
    const oldPin=savedPins.find(x=>x.id===pin.id);if(oldPin) Object.assign(oldPin,pin);else savedPins.push(pin);
    activeParkingId=pin.id;
    if(previewMode==='parking'){pendingPinId=pin.id;recordSheet='pin';}
    if(previewMode==='parking-recall') recordSheet='parking-recall';
  }

  const I={
    calendar:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 4v3M9 4v3M15 4v3M19 4v3M4 8h16v12H4zM8 8v12M12 8v12M16 8v12M4 12h16M4 16h16"/></svg>',
    search:'<svg class="icon" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>',
    prep:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="7" height="14" rx="1.5"/><rect x="13" y="5" width="7" height="14" rx="1.5"/></svg>',
    record:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M7 12h10"/></svg>',
    memory:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg>',
    tent:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 19h18L12 5 3 19Z"/><path d="M12 5v14M8 19l4-7 4 7"/></svg>',
    walk:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 18c3-3 4-7 8-7 2.5 0 3.5 2 6 2"/><path d="M4 20h16M8 7l2-3 2 3M16 6l2-2 2 2"/></svg>',
    paw:'<svg class="icon" viewBox="0 0 24 24"><circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="8.5" cy="13" r="2"/><circle cx="15.5" cy="13" r="2"/><path d="M8 18c1.1-2 2.5-3 4-3s2.9 1 4 3c.7 1.2-.2 2-1.5 2h-5C8.2 20 7.3 19.2 8 18Z"/></svg>',
    cup:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2M4 20h14"/></svg>',
    note:'<svg class="icon" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5M9 2v4M15 2v4"/></svg>',
    bookmark:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg>',
    folder:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/></svg>',
    car:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 14l2-5h10l2 5"/><rect x="4" y="13" width="16" height="6" rx="2"/><circle cx="7" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></svg>',
    bike:'<svg class="icon" viewBox="0 0 24 24"><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/><path d="M6 17l4-8h4l4 8M9 11h7M12 17l-3-6M13 6h3"/></svg>',
    database:'<svg class="icon" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
    box:'<svg class="icon" viewBox="0 0 24 24"><path d="M4 7l8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>',
    people:'<svg class="icon" viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M10.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6"/></svg>',
    person:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><path d="M6 20c.7-5 2.7-7 6-7s5.3 2 6 7"/></svg>',
    bag:'<svg class="icon" viewBox="0 0 24 24"><path d="M7 8V7a5 5 0 0 1 10 0v1"/><rect x="5" y="8" width="14" height="13" rx="3"/><path d="M9 12v5M15 12v5"/></svg>',
    sun:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1"/></svg>',
    route:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 18c0-5 4-5 4-9a3 3 0 1 0-6 0c0 4 2 5 2 5s2-1 2-5"/><path d="M10 17c2-3 4-4 7-4h2M16 9l3 4-3 4"/></svg>',
    photo:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 18 5-5 4 4 2-2 3 3"/></svg>',
    cart:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 4h2l2 11h10l3-8H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M10 11l2 2 4-5"/></svg>',
    pin:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s7-5 7-11a7 7 0 0 0-14 0c0 6 7 11 7 11Z"/><circle cx="12" cy="10" r="2"/></svg>',
    link:'<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
    mic:'<svg class="icon" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    camera:'<svg class="icon" viewBox="0 0 24 24"><path d="M8 7l1.5-2h5L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Z"/><circle cx="12" cy="13" r="3"/></svg>',
    movie:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="6" width="11" height="12" rx="2"/><path d="m15 10 5-3v10l-5-3"/></svg>',
    memo:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>',
    plus:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };

  function header(){
    const saveTarget=active==='record'?`<button class="saveBar saveBarButton" data-open-sheet="target"><b>保存先：${recordTarget}</b><span>タップで変更</span></button>`:'';
    const current=activePlan(),candidateCount=activePlanCandidates().length;
    const chipTitle=current?current.title:(active==='prep'?'準備ノート':'予定を選ぶ');
    const chipMeta=current?`${planTypeLabel(current.type)}&nbsp; / &nbsp;${planRangeLabel(current)}${candidateCount>1?`&nbsp; / &nbsp;他${candidateCount-1}件`:''}`:(active==='prep'?'予定前の検討を保存':'タップして主役予定を選択');
    return `<header class="header ${active==='record'?'recordHeader':'compactHeader'}">
      <div class="topLine">
        <div class="brand"><div class="ob">OB</div><div><div class="brandName">OUTBASE</div><div class="brandSub">route design</div></div></div>
        <button class="planChip" data-open-plan-switcher><span class="planTitle"><i></i>${escapeHtml(chipTitle)}</span><span>${chipMeta}</span></button>
      </div>
      ${saveTarget}
    </header>`;
  }

  function parkingRecallButton(){
    const pin=activeParking();if(!pin||active==='record') return '';
    return `<button class="parkingRecallFloat" data-open-parking-recall>${I.car}<span><small>車に戻る</small><b>${escapeHtml(parkingSummary(pin))}</b></span><em>›</em></button>`;
  }

  function nav(){
    const data=[['plan','予定',I.calendar],['search','探す',I.search],['prep','準備',I.prep],['record','記録',I.record],['memory','思い出',I.memory]];
    return `<nav class="bottomNav">${data.map(([id,label,icon])=>`<button class="navBtn ${active===id?'active':''}" data-tab="${id}">${icon}<span>${label}</span></button>`).join('')}</nav>`;
  }

  function planPage(){
    const meta=monthCalendar(planMonth);
    const selectedRows=plansForDate(selectedPlanDate);
    const today=new Date().toISOString().slice(0,10);
    const dayCells=meta.days.map((d,index)=>{
      const key=toYmd(d),other=d.getMonth()+1!==meta.month,selected=key===selectedPlanDate,isToday=key===today,sun=d.getDay()===0,sat=d.getDay()===6;
      const classes=[other?'other':'',selected?'selected':'',isToday?'today':'',sun?'sun':'',sat?'sat':''].filter(Boolean).join(' ');
      const col=index%7+1,row=Math.floor(index/7)+1,count=plansForDate(key).length;
      return `<button class="day ${classes}" style="grid-column:${col};grid-row:${row}" data-plan-date="${key}"><span class="num">${d.getDate()}</span>${count>2?`<small class="dayMore">+${count-2}</small>`:''}</button>`;
    }).join('');
    return `<section class="page ${active==='plan'?'active':''}" id="page-plan">
      <section class="calendarCard planCalendarCard" style="--weeks:${meta.weeks}" data-plan-calendar-swipe>
        <div class="calendarHead planCalendarHead"><div class="month">${meta.year}.${String(meta.month).padStart(2,'0')}</div><div class="monthBtns"><button data-plan-month="prev">‹</button><button data-plan-today>今日</button><button data-plan-month="next">›</button></div><span class="planSwipeHint">左右スワイプで月移動</span></div>
        <div class="week"><span class="sun">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span></div>
        <div class="monthGrid planMonthGrid" style="--weeks:${meta.weeks}">${dayCells}${calendarSegments(meta)}</div>
        <p class="calendarHint">1回目で選択。同じ日をもう一度タップすると新規追加。</p>
      </section>
      <section class="scheduleCard selectedDayCard">
        <div class="selectedDayHead"><div><small>選択日</small><h2>${selectedDateLabel(selectedPlanDate)}</h2></div><button data-open-plan-add>＋追加</button></div>
        <div class="selectedDayRows">${selectedRows.length?selectedRows.map(plan=>`<button class="selectedPlanRow" data-plan-id="${plan.id}"><time>${plan.allDay?'終日':(plan.startTime||plan.time||'未定')}</time><i class="dot ${planTone(plan)}"></i><div><small>${escapeHtml(planTypeLabel(plan.type))}${planCompanionLabel(plan)?`・${escapeHtml(planCompanionLabel(plan))}`:''}</small><b>${escapeHtml(plan.title)}</b></div><em>${escapeHtml(planStatus(plan))}</em><span>›</span></button>`).join(''):`<div class="selectedDayEmpty"><b>予定はありません</b><span>同じ日をもう一度タップするか「＋追加」で登録できます。</span></div>`}</div>
        <button class="scheduleMore planAllButton" data-open-plan-list>すべての予定を見る&nbsp; ›</button>
      </section>
    </section>`;
  }

  function typeChipsMarkup(selected){
    const rows=planTypes.filter(t=>!t.hidden);
    return `<div class="planChoiceHead"><span>種類 <small>未選択は「予定」扱い</small></span><button type="button" data-manage-types>編集</button></div><div class="choiceChips typeChoiceChips"><button type="button" class="${!selected?'selected':''}" data-plan-type-choice="">予定</button>${rows.map(t=>`<button type="button" class="${selected===t.name?'selected':''}" data-plan-type-choice="${escapeHtml(t.name)}"><i class="dot ${t.tone||'slate'}"></i>${escapeHtml(t.name)}</button>`).join('')}</div>`;
  }
  function companionChipsMarkup(selectedIds){
    const rows=companions.filter(c=>!c.hidden);
    return `<div class="planChoiceHead"><span>同行者 <small>複数選択できます</small></span><button type="button" data-manage-companions>編集</button></div><div class="choiceChips companionChoiceChips">${rows.map(c=>`<button type="button" class="${selectedIds.includes(c.id)?'selected':''}" data-companion-choice="${c.id}">${escapeHtml(c.name)}</button>`).join('')}</div>`;
  }
  function repeatSummary(repeat){
    const r=repeat||{},labels={daily:'毎日',weekly:'毎週',monthly:'毎月',yearly:'毎年'};
    if(!r.mode||r.mode==='none')return 'なし';
    if(r.mode==='custom')return `${r.interval||2}${{daily:'日',weekly:'週',monthly:'か月',yearly:'年'}[r.customFrequency]||'週'}ごと`;
    return labels[r.mode]||'設定あり';
  }
  function repeatMarkup(draft){
    const r=draft.repeat,weekdayNames=['日','月','火','水','木','金','土'],actualFrequency=r.mode==='custom'?r.customFrequency:r.mode;
    const weekly=actualFrequency==='weekly',monthly=actualFrequency==='monthly';
    const weekdayButtons=weekdayNames.map((name,i)=>`<button type="button" class="${r.weekdays.includes(i)?'selected':''}" data-repeat-weekday="${i}">${name}</button>`).join('');
    return `<details class="repeatBox" ${r.mode!=='none'?'open':''}><summary>繰り返し <b>${escapeHtml(repeatSummary(r))}</b></summary><div class="repeatInner">
      <label class="planField">繰り返し<select id="planRepeatMode"><option value="none" ${r.mode==='none'?'selected':''}>なし</option><option value="daily" ${r.mode==='daily'?'selected':''}>毎日</option><option value="weekly" ${r.mode==='weekly'?'selected':''}>毎週</option><option value="monthly" ${r.mode==='monthly'?'selected':''}>毎月</option><option value="yearly" ${r.mode==='yearly'?'selected':''}>毎年</option><option value="custom" ${r.mode==='custom'?'selected':''}>カスタム</option></select></label>
      <div class="customRepeatFields ${r.mode==='custom'?'show':''}"><label class="planField">間隔<input id="planRepeatInterval" type="number" min="1" max="99" value="${r.interval||2}"></label><label class="planField">単位<select id="planRepeatCustomFrequency"><option value="daily" ${r.customFrequency==='daily'?'selected':''}>日</option><option value="weekly" ${r.customFrequency==='weekly'?'selected':''}>週</option><option value="monthly" ${r.customFrequency==='monthly'?'selected':''}>か月</option><option value="yearly" ${r.customFrequency==='yearly'?'selected':''}>年</option></select></label></div>
      <div class="repeatSubsection ${weekly?'show':''}"><div class="repeatSubHead"><span>曜日指定</span><div><button type="button" data-weekday-preset="weekday">平日</button><button type="button" data-weekday-preset="weekend">土日</button></div></div><div class="weekdayChoices show">${weekdayButtons}</div></div>
      <div class="repeatSubsection monthlyRepeatFields ${monthly?'show':''}"><label class="planField">毎月の基準<select id="planRepeatMonthlyMode"><option value="dayOfMonth" ${r.monthlyMode==='dayOfMonth'?'selected':''}>日付</option><option value="nthWeekday" ${r.monthlyMode==='nthWeekday'?'selected':''}>第◯曜日</option></select></label><div class="monthDayFields ${r.monthlyMode==='dayOfMonth'?'show':''}"><label class="planField">日<input id="planRepeatMonthDay" type="number" min="1" max="31" value="${r.monthDay||parseYmd(draft.start).getDate()}"></label></div><div class="monthOrdinalFields ${r.monthlyMode==='nthWeekday'?'show':''}"><label class="planField">週<select id="planRepeatMonthOrdinal"><option value="1" ${r.monthOrdinal===1?'selected':''}>第1</option><option value="2" ${r.monthOrdinal===2?'selected':''}>第2</option><option value="3" ${r.monthOrdinal===3?'selected':''}>第3</option><option value="4" ${r.monthOrdinal===4?'selected':''}>第4</option><option value="5" ${r.monthOrdinal===5?'selected':''}>第5</option><option value="-1" ${r.monthOrdinal===-1?'selected':''}>最終</option></select></label><label class="planField">曜日<select id="planRepeatMonthWeekday">${weekdayNames.map((name,i)=>`<option value="${i}" ${r.monthWeekday===i?'selected':''}>${name}曜日</option>`).join('')}</select></label></div></div>
      <div class="planFormGrid repeatEndGrid"><label class="planField">終了<select id="planRepeatEndMode"><option value="none" ${r.endMode==='none'?'selected':''}>指定なし</option><option value="until" ${r.endMode==='until'?'selected':''}>終了日</option><option value="count" ${r.endMode==='count'?'selected':''}>回数</option></select></label><label class="planField repeatCountField ${r.endMode==='count'?'show':''}">回数<input id="planRepeatCount" type="number" min="1" max="200" value="${r.count||10}"></label><label class="planField repeatUntilField ${r.endMode==='until'?'show':''}">終了日<input id="planRepeatUntil" type="date" value="${r.until||''}"></label></div>
    </div></details>`;
  }
  function reminderMarkup(draft){
    const rows=draft.reminders||[];
    return `<details class="reminderBox" ${rows.length?'open':''}><summary>お知らせ <b>${rows.length?`${rows.length}件`:'なし'}</b></summary><div class="reminderInner"><div class="reminderRows">${rows.map(r=>`<div class="reminderRow" data-reminder-row="${r.id}"><input type="number" min="1" max="999" value="${r.value||1}" data-reminder-value><select data-reminder-unit><option value="month" ${r.unit==='month'?'selected':''}>か月前</option><option value="week" ${r.unit==='week'?'selected':''}>週間前</option><option value="day" ${r.unit==='day'?'selected':''}>日前</option><option value="hour" ${r.unit==='hour'?'selected':''}>時間前</option></select><button type="button" data-remove-reminder="${r.id}">削除</button></div>`).join('')}</div><button type="button" class="addReminderButton" data-add-reminder>＋お知らせを追加</button><label class="planField allDayReminderField ${draft.allDay&&rows.length?'show':''}">終日予定の通知時刻<input id="planAllDayReminderTime" type="time" value="${draft.allDayReminderTime||'09:00'}"></label><p class="reminderNote">端末通知は許可後、OUTBASEが動作中のときに通知します。</p></div></details>`;
  }
  function planSheetMarkup(){
    if(!planSheet) return '';
    const plan=planForId(selectedPlanId);
    const dragHeader=(eyebrow,title)=>`<div class="planSheetDragZone" data-plan-drag-zone><div class="sheetHandle"></div><small>${eyebrow}</small><h2>${title}</h2></div>`;
    if(planSheet==='switcher'){
      const current=activePlan(),rows=activePlanCandidates();
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planSwitcherSheet" data-plan-sheet-panel>${dragHeader('CURRENT PLAN','主役予定を切り替える')}<p class="planSwitcherLead">複数の予定は同時に保持されます。ここで選んだ1件だけを、今見ている準備・記録の主役にします。</p><div class="planSwitcherRows">${rows.map(p=>{const progress=prepProgress(p),isActive=current?.id===p.id;return `<button class="planSwitcherRow ${isActive?'active':''}" data-switch-active-plan="${p.id}"><i class="dot ${planTone(p)}"></i><div><small>${escapeHtml(planTypeLabel(p.type))} ・ ${escapeHtml(planRangeLabel(p))}</small><b>${escapeHtml(p.title)}</b><span>準備 ${progress.done}/${progress.total} ・ ${escapeHtml(planStatus(p))}</span></div><em>${isActive?'選択中':'選ぶ'}</em></button>`;}).join('')}<button class="planSwitcherRow none ${!current?'active':''}" data-switch-active-plan="none"><i></i><div><small>予定に紐付けない</small><b>準備ノート</b><span>料理案や買物メモを予定前から保存</span></div><em>${!current?'選択中':'選ぶ'}</em></button></div><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="sheetPrimary" data-tab-from-switcher="plan">予定を確認</button></div></section></div>`;
    }
    if(planSheet==='add'||planSheet==='edit'){
      const editing=planSheet==='edit'&&plan,draft=ensurePlanDraft(editing?plan:null);
      if(previewMode==='plan011-repeat'||previewMode==='plan012-repeat'){draft.repeat.mode='weekly';draft.repeat.weekdays=[1,4];}
      if(previewMode==='plan012-reminder'&&!draft.reminders.length)draft.reminders=[{id:newId('reminder'),value:1,unit:'week'},{id:newId('reminder'),value:1,unit:'day'}];
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planEditSheet" data-plan-sheet-panel>${dragHeader('PLAN',editing?'予定を編集':'新しい予定')}<label class="planField wide">名前<input id="planTitleInput" value="${escapeHtml(draft.title)}" placeholder="例：手賀沼ドライブ散歩"></label><label class="allDayToggle"><input id="planAllDayInput" type="checkbox" ${draft.allDay?'checked':''}><span>終日</span></label><div class="planFormGrid dateTimeGrid"><label class="planField">開始日<input id="planStartInput" type="date" value="${draft.start}"></label><label class="planField timeField ${draft.allDay?'disabled':''}">開始時間<input id="planStartTimeInput" type="time" value="${draft.startTime}" ${draft.allDay?'disabled':''}></label><label class="planField">終了日<input id="planEndInput" type="date" value="${draft.end}"></label><label class="planField timeField ${draft.allDay?'disabled':''}">終了時間<input id="planEndTimeInput" type="time" value="${draft.endTime}" ${draft.allDay?'disabled':''}></label></div>${typeChipsMarkup(draft.type)}${companionChipsMarkup(draft.companionIds)}<label class="planField wide">場所<input id="planLocationInput" value="${escapeHtml(draft.location)}" placeholder="場所は後でもOK"></label>${repeatMarkup(draft)}${reminderMarkup(draft)}<label class="planField wide">メモ<textarea id="planNoteInput" placeholder="準備や当日の補足">${escapeHtml(draft.note)}</textarea></label><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="sheetPrimary" data-save-plan>${editing?'更新':'追加'}</button></div></section></div>`;
    }
    if(planSheet==='type-manager'){
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet managerSheet" data-plan-sheet-panel>${dragHeader('CUSTOM','種類を編集')}<p>初期種類も追加した種類も、名称・色の変更と削除ができます。</p><div class="managerRows">${planTypes.map(t=>`<div class="managerRow"><input value="${escapeHtml(t.name)}" data-type-name="${t.id}"><select data-type-tone="${t.id}">${['green','gold','blue','slate','red'].map(c=>`<option value="${c}" ${t.tone===c?'selected':''}>${{green:'緑',gold:'金',blue:'青',slate:'灰',red:'赤'}[c]}</option>`).join('')}</select><button data-type-delete="${t.id}">削除</button></div>`).join('')}</div><div class="managerAdd"><input id="newTypeName" placeholder="新しい種類"><button data-add-type>追加</button></div><div class="sheetActions"><button class="sheetPrimary" data-return-plan-editor>予定入力へ戻る</button></div></section></div>`;
    }
    if(planSheet==='companion-manager'){
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet managerSheet" data-plan-sheet-panel>${dragHeader('CUSTOM','同行者を編集')}<p>同行者は複数選択できます。「ひとり」は他と同時選択できません。</p><div class="managerRows">${companions.map(c=>`<div class="managerRow companionManagerRow"><input value="${escapeHtml(c.name)}" data-companion-name="${c.id}"><span>${c.solo?'固定':''}</span><button data-companion-delete="${c.id}" ${c.solo?'disabled':''}>削除</button></div>`).join('')}</div><div class="managerAdd"><input id="newCompanionName" placeholder="新しい同行者"><button data-add-companion>追加</button></div><div class="sheetActions"><button class="sheetPrimary" data-return-plan-editor>予定入力へ戻る</button></div></section></div>`;
    }
    if(planSheet==='detail'&&plan){
      const status=planStatus(plan),companionsText=planCompanionLabel(plan),notice=reminderSummary(plan);
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planDetailSheet" data-plan-sheet-panel>${dragHeader(escapeHtml(planTypeLabel(plan.type)),escapeHtml(plan.title))}<div class="planDetailHero"><div><small>日時</small><b>${escapeHtml(planRangeLabel(plan))}</b></div><div><small>状態</small><b>${escapeHtml(status)}</b></div></div><div class="planDetailMeta">${plan.location?`<p><span>場所</span><b>${escapeHtml(plan.location)}</b></p>`:''}${companionsText?`<p><span>同行</span><b>${escapeHtml(companionsText)}</b></p>`:''}<p><span>準備</span><b>${escapeHtml(plan.prep||'未着手')}</b></p>${plan.seriesId?`<p><span>繰り返し</span><b>${escapeHtml(repeatSummary(plan.repeat))}</b></p>`:''}${notice?`<p><span>お知らせ</span><b>${escapeHtml(notice)}</b></p>`:''}${plan.note?`<p><span>メモ</span><b>${escapeHtml(plan.note)}</b></p>`:''}</div><button class="planPrimaryAction" data-plan-set-active="${plan.id}">この予定を主役にする</button><div class="planActionGrid three"><button data-plan-prepare="${plan.id}">準備を始める</button><button data-plan-record="${plan.id}">この予定で記録</button><button data-plan-edit="${plan.id}">編集</button></div><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="planDanger" data-plan-delete="${plan.id}">削除</button></div></section></div>`;
    }
    if(planSheet==='list'){
      const sorted=[...plans].sort((a,b)=>compareYmd(a.start,b.start)||(a.startTime||a.time||'').localeCompare(b.startTime||b.time||''));
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planListSheet" data-plan-sheet-panel>${dragHeader('ALL PLANS','すべての予定')}<div class="planListRows">${sorted.map(p=>`<button data-plan-id="${p.id}"><time>${escapeHtml(planRangeLabel(p))}</time><i class="dot ${planTone(p)}"></i><div><small>${escapeHtml(planTypeLabel(p.type))}・${escapeHtml(planStatus(p))}</small><b>${escapeHtml(p.title)}</b></div><span>›</span></button>`).join('')}</div><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="sheetPrimary" data-open-plan-add>＋追加</button></div></section></div>`;
    }
    return '';
  }

  function searchCard(icon,title,sub,tags=[]){
    return `<article class="searchCard"><div class="iconCircle">${icon}</div><div class="cardCopy"><h3>${title}</h3>${tags.length?`<div class="tagRow">${tags.map(t=>`<span>${t}</span>`).join('')}</div>`:`<p>${sub}</p>`}</div><b class="chev">›</b></article>`;
  }

  function searchPage(){
    const cards=[
      [I.tent,'キャンプ場','',['犬可','温水','4時間以内']],
      [I.walk,'散歩場所','',['駐車場','日陰','水辺']],
      [I.paw,'ペットイベント','同伴あり/なしは属性で管理',[]],
      [I.cup,'ドッグカフェ','寄り道候補',[]],
      [I.note,'下見メモ','',['駐車場','トイレ','混雑']],
      [I.bookmark,'保存候補','あとで比較',[]]
    ];
    const rows=[
      ['assets/search_teganuma.jpg','散歩場所','手賀沼親水広場',['駐車場','日陰','水辺'],'保存日 7/10'],
      ['assets/search_inbanuma.jpg','キャンプ場','印旛沼サンセットヒルズ',['犬可','温水','4時間以内'],'保存日 7/08'],
      ['assets/search_hygge.jpg','ドッグカフェ','cafe HYGGE',['テラス','大型犬OK','駐車場あり'],'保存日 7/06']
    ];
    return `<section class="page ${active==='search'?'active':''}" id="page-search">
      <section class="searchHero"><img src="assets/search_hero_art.png" alt=""><div><h1>探す</h1><p>候補探し・下見・保存。<br>行く前の検討をここで。</p></div></section>
      <div class="searchGrid">${cards.map(c=>searchCard(...c)).join('')}</div>
      <section class="recentCard"><div class="recentHead"><h2>最近保存した候補</h2><span>すべて見る&nbsp; ›</span></div>${rows.map(r=>`<div class="recentRow"><img src="${r[0]}" alt=""><div class="recentCopy"><small>${r[1]}</small><b>${r[2]}</b><div>${r[3].map(t=>`<span>${t}</span>`).join('')}</div></div><em>${r[4]}</em><div class="bookmarkIcon">${I.bookmark}</div></div>`).join('')}</section>
    </section>`;
  }

  function persistPrepStore(){localStorage.setItem('outbase_prep_v1',JSON.stringify(prepStore));}
  function persistGearLibrary(){localStorage.setItem('outbase_gear_library_v1',JSON.stringify(gearLibrary));}
  function persistGearKits(){localStorage.setItem('outbase_gear_kits_v1',JSON.stringify(gearKits));}
  function persistGearCustoms(){localStorage.setItem('outbase_gear_customs_v1',JSON.stringify(gearCustoms));}
  function persistAssetEvents(){localStorage.setItem('outbase_asset_events_v1',JSON.stringify(assetEvents));}
  function persistMobilityLibrary(){localStorage.setItem('outbase_mobility_library_v1',JSON.stringify(mobilityLibrary));}
  function persistPetLibrary(){localStorage.setItem('outbase_pet_library_v1',JSON.stringify(petLibrary));}
  function persistStorageLibrary(){localStorage.setItem('outbase_storage_library_v1',JSON.stringify(storageLibrary));}
  function persistLibraryTab(){localStorage.setItem('outbase_library_tab_v1',libraryTab);}
  function persistLibraryGearView(){localStorage.setItem('outbase_library_gear_view_v1',libraryGearView);}
  const gearRelationTypes={
    alwaysWith:{label:'必ず一緒',inverse:'必ず一緒',tone:'dedicated'},
    conditionalWith:{label:'条件で一緒',inverse:'条件で一緒',tone:'pair'},
    mountsOn:{label:'取付・装着',inverse:'取付パーツ',tone:'mount'},
    compatibleWith:{label:'対応する',inverse:'対応品',tone:'custom'},
    fuelFor:{label:'燃料',inverse:'使用燃料',tone:'fuel'},
    storedIn:{label:'収納先',inverse:'収納物',tone:'storage'},
    useWith:{label:'一緒に使う',inverse:'一緒に使う',tone:'pair'},
    dedicatedFor:{label:'専用品',inverse:'専用元',tone:'dedicated'},
    installedOn:{label:'装着中',inverse:'装着パーツ',tone:'custom'},
    originalFor:{label:'純正部品',inverse:'純正構成',tone:'original'},
    consumableFor:{label:'消耗先',inverse:'消耗品',tone:'consumable'},
    packedWith:{label:'一緒に収納',inverse:'一緒に収納',tone:'packed'},
    alternative:{label:'代替',inverse:'代替',tone:'alternative'}
  };
  function assetRef(type,id){
    if(type==='gear')return gearLibrary.find(x=>x.id===id)||null;
    if(type==='mobility')return mobilityLibrary.find(x=>x.id===id)||null;
    if(type==='storage')return storageLibrary.find(x=>x.id===id)||null;
    return null;
  }
  function gearById(id){return gearLibrary.find(g=>g.id===id)||null;}
  function gearRelationsFor(id){
    const direct=(gearById(id)?.relations||[]).map(r=>{const targetType=r.targetType||'gear';return {...r,targetType,direction:'out',label:gearRelationTypes[r.type]?.label||r.type,gear:assetRef(targetType,r.targetId)};});
    const inverse=[];gearLibrary.forEach(g=>(g.relations||[]).forEach(r=>{if((r.targetType||'gear')==='gear'&&r.targetId===id)inverse.push({...r,targetType:'gear',direction:'in',label:gearRelationTypes[r.type]?.inverse||r.type,gear:g});}));
    return [...direct,...inverse].filter(r=>r.gear);
  }
  function gearRelationEdges(){return gearLibrary.flatMap(g=>(g.relations||[]).map(r=>({source:g,target:assetRef(r.targetType||'gear',r.targetId),type:r.type,condition:r.condition||''}))).filter(x=>x.target);}
  function gearRelationCount(){return gearRelationEdges().length;}
  function relationTone(type){return gearRelationTypes[type]?.tone||'pair';}
  function relationLabel(type,direction='out'){const def=gearRelationTypes[type];return def?(direction==='in'?def.inverse:def.label):type;}
  function gearRoleFor(g){return g.role||'本体';}
  function isStockRole(g){return ['消耗品','燃料'].includes(gearRoleFor(g));}
  function customById(id){return gearCustoms.find(c=>c.id===id)||null;}
  function currentCustomForBase(id){return gearCustoms.find(c=>c.baseGearId===id&&c.status==='現在の仕様')||null;}
  function customsUsingPart(id){return gearCustoms.filter(c=>(c.partGearIds||[]).includes(id));}
  function stockNumber(g){return g.stockAmount===''||g.stockAmount==null?0:Math.max(0,Number(g.stockAmount)||0);}
  function stockState(g){const amount=stockNumber(g),min=g.reorderPoint===''||g.reorderPoint==null?null:Math.max(0,Number(g.reorderPoint)||0);if(amount<=0)return {id:'empty',label:'在庫なし'};if(min!==null&&amount<=min)return {id:'low',label:'補充必要'};return {id:'ok',label:'在庫あり'};}
  function stockDisplay(g){const amount=stockNumber(g);return `${Number.isInteger(amount)?amount:amount.toFixed(1)} ${g.stockUnit||'個'}`;}

  function libraryOpenEditor(type,id=''){
    libraryEditorType=type;libraryEditorId=id;libraryKitQuery='';
    if(type==='gear'){const row=gearById(id);libraryEditorDraft=row?JSON.parse(JSON.stringify(row)):{name:'',category:'その他',role:'本体',brand:'',model:'',quantity:1,storage:'',condition:'使用可',purchaseDate:'',purchasePrice:'',tags:[],memo:'',favorite:false,relations:[],stockAmount:'',stockUnit:'個',reorderPoint:'',stockStep:'1',openedDate:'',expiryDate:''};libraryEditorRelationsDraft=(row?.relations||[]).map(r=>({...r}));libraryEditorKitGearIds=[];libraryEditorCustomPartIds=[];}
    else if(type==='event'){const row=assetEvents.find(e=>e.id===id);libraryEditorDraft=row?JSON.parse(JSON.stringify(row)):{targetType:'gear',targetId:'',eventType:'使用',date:new Date().toISOString().slice(0,10),title:'',detail:'',cost:'',nextDate:''};libraryEditorRelationsDraft=[];libraryEditorKitGearIds=[];libraryEditorCustomPartIds=[];}
    else if(type==='kit'){const row=gearKits.find(k=>k.id===id);libraryEditorDraft=row?JSON.parse(JSON.stringify(row)):{name:'',kind:'セット',gearIds:[],requiredGearIds:[],conditionTags:[],memo:'',favorite:false};libraryEditorKitGearIds=[...(row?.gearIds||[])];libraryEditorKitRequiredIds=[...(row?.requiredGearIds||row?.gearIds||[])];libraryEditorRelationsDraft=[];libraryEditorCustomPartIds=[];}
    else if(type==='custom'){const row=customById(id);libraryEditorDraft=row?JSON.parse(JSON.stringify(row)):{name:'',baseGearId:'',partGearIds:[],status:'現在の仕様',memo:''};libraryEditorCustomPartIds=[...(row?.partGearIds||[])];libraryEditorRelationsDraft=[];libraryEditorKitGearIds=[];}
    else{libraryEditorDraft=null;libraryEditorRelationsDraft=[];libraryEditorKitGearIds=[];libraryEditorCustomPartIds=[];}
  }
  function syncLibraryEditorDraftFromForm(){
    const value=id=>document.getElementById(id)?.value??'',check=id=>Boolean(document.getElementById(id)?.checked);
    if(libraryEditorType==='gear'&&libraryEditorDraft){libraryEditorDraft={...libraryEditorDraft,name:value('lib-name'),category:value('lib-category')||'その他',role:value('lib-role')||'本体',quantity:Math.max(1,Number(value('lib-quantity'))||1),brand:value('lib-brand'),model:value('lib-model'),storage:value('lib-storage'),condition:value('lib-condition')||'使用可',purchaseDate:value('lib-date'),purchasePrice:value('lib-price'),tags:String(value('lib-tags')).split(/[、,]/).map(x=>x.trim()).filter(Boolean),memo:value('lib-memo'),favorite:check('lib-favorite'),stockAmount:value('lib-stock-amount'),stockUnit:value('lib-stock-unit')||'個',reorderPoint:value('lib-reorder-point'),stockStep:value('lib-stock-step')||'1',openedDate:value('lib-opened-date'),expiryDate:value('lib-expiry-date')};}
    if(libraryEditorType==='kit'&&libraryEditorDraft){libraryEditorDraft={...libraryEditorDraft,name:value('lib-name'),kind:value('lib-kind')||'セット',conditionTags:String(value('lib-kit-conditions')).split(/[、,]/).map(x=>x.trim()).filter(Boolean),memo:value('lib-memo'),favorite:check('lib-favorite')};}
    if(libraryEditorType==='custom'&&libraryEditorDraft){libraryEditorDraft={...libraryEditorDraft,name:value('lib-name'),baseGearId:value('lib-custom-base'),status:value('lib-custom-status')||'保存構成',memo:value('lib-memo')};}
  }
  function libraryCloseEditor(){libraryEditorType='';libraryEditorId='';libraryEditorRelationsDraft=[];libraryEditorKitGearIds=[];libraryEditorKitRequiredIds=[];libraryEditorCustomPartIds=[];libraryEditorDraft=null;libraryKitQuery='';}
  function persistPrepCommonStore(){prepCommonStore.updatedAt=Date.now();localStorage.setItem('outbase_prep_common_v1',JSON.stringify(prepCommonStore));}
  function prepModuleDefinitions(_plan){
    const library={
      weather:{id:'weather',icon:I.sun,title:'天気',sub:'雨・気温・風・警報',tasks:['降水と雨雲を確認','気温と暑さ・寒さを確認','風と警報・撤収判断を確認']},
      gear:{id:'gear',icon:I.bag,title:'ギア',sub:'今回の持出し・積載・共通管理',tasks:['今回使うギアを選ぶ','積載順と忘れ物を確認','電源・燃料・電池を確認']},
      cooking:{id:'cooking',icon:I.cup,title:'料理',sub:'献立・量・調理順',tasks:['食事ごとの献立を決める','量と食べ切れるか確認','調理順と使用ギアを確認']},
      shopping:{id:'shopping',icon:I.cart,title:'買物',sub:'食材・消耗品・不足品',tasks:['食材と飲み物を確認','調味料・消耗品を確認','不足品と買い忘れを確認']},
      route:{id:'route',icon:I.route,title:'ルート',sub:'出発・休憩・駐車・到着',tasks:['出発時刻を決める','休憩・買い出し地点を確認','到着方法と駐車場を確認']}
    };
    return ['weather','gear','cooking','shopping','route'].map(id=>library[id]);
  }
  function prepCommonModuleDefinitions(){
    return [
      {id:'weather',icon:I.sun,title:'天気',sub:'候補地・季節の条件を保存',placeholder:'例：標高が高く夜は冷える'},
      {id:'gear',icon:I.bag,title:'ギア',sub:'所有品を共通管理',placeholder:''},
      {id:'cooking',icon:I.cup,title:'料理',sub:'献立案・レシピを保存',placeholder:'例：初日の夜はガーリックシュリンプ'},
      {id:'shopping',icon:I.cart,title:'買物',sub:'買いたい物・不足品を保存',placeholder:'例：ブラータチーズを買う'},
      {id:'route',icon:I.route,title:'ルート',sub:'候補地・経由地を保存',placeholder:'例：6:30出発、途中で道の駅'}
    ];
  }
  function prepPlanBucket(plan){
    if(!prepStore[plan.id]) prepStore[plan.id]={modules:{},updatedAt:0};
    if(!prepStore[plan.id].modules) prepStore[plan.id].modules={};
    return prepStore[plan.id];
  }
  function prepModuleState(plan,module){
    const bucket=prepPlanBucket(plan);
    if(!bucket.modules[module.id]) bucket.modules[module.id]={checked:[],customItems:[],note:'',gearIds:[]};
    const state=bucket.modules[module.id];
    if(!Array.isArray(state.checked))state.checked=[];
    if(!Array.isArray(state.customItems))state.customItems=[];
    if(!Array.isArray(state.gearIds))state.gearIds=[];
    return state;
  }
  function prepCommonState(moduleId){
    if(!prepCommonStore.modules)prepCommonStore.modules={};
    if(!prepCommonStore.modules[moduleId])prepCommonStore.modules[moduleId]={items:[],note:''};
    const state=prepCommonStore.modules[moduleId];
    if(!Array.isArray(state.items))state.items=[];
    state.note=String(state.note||'');
    return state;
  }
  function prepModuleItems(plan,module){const state=prepModuleState(plan,module);return [...module.tasks,...state.customItems];}
  function prepProgress(plan){
    const modules=prepModuleDefinitions(plan);let done=0,total=0;
    modules.forEach(module=>{const items=prepModuleItems(plan,module),checked=prepModuleState(plan,module).checked;total+=items.length;done+=items.filter((_,i)=>checked.includes(i)).length;});
    return {done,total,percent:total?Math.round(done/total*100):0};
  }
  function prepCommonSavedCount(){
    return prepCommonModuleDefinitions().reduce((sum,module)=>sum+(module.id==='gear'?0:prepCommonState(module.id).items.length),0);
  }
  function syncPlanPrepStatus(plan){
    const progress=prepProgress(plan);let status='未着手';
    if(progress.total&&progress.done>=progress.total)status='準備完了';
    else if(progress.done>0)status='準備中';
    plan.prep=status;prepPlanBucket(plan).updatedAt=Date.now();persistPrepStore();persistPlans();return status;
  }
  function prepStatusLabel(plan){return syncPlanPrepStatus(plan);}
  function prepCard(plan,module){
    const state=prepModuleState(plan,module),items=prepModuleItems(plan,module),done=items.filter((_,i)=>state.checked.includes(i)).length,complete=items.length&&done===items.length,percent=items.length?done/items.length*100:0,next=items.find((_,i)=>!state.checked.includes(i));
    const gearCount=module.id==='gear'?state.gearIds.filter(id=>gearLibrary.some(g=>g.id===id)).length:0;
    const foot=complete?'確認済み':module.id==='gear'&&gearCount?`今回 ${gearCount}点を選択`:next?`次：${next}`:'未着手';
    return `<button class="prepModuleCard ${complete?'complete':''}" style="--module-progress:${percent}%" data-prep-module="${module.id}"><div class="prepModuleIcon">${module.icon}</div><div class="prepModuleCopy"><h3>${escapeHtml(module.title)}</h3><small>${escapeHtml(module.sub)}</small><span>${escapeHtml(foot)}</span></div><span class="prepModuleCount">${done}/${items.length}</span><b>${complete?'✓':'›'}</b></button>`;
  }
  function prepCommonCard(module){
    const state=prepCommonState(module.id),count=module.id==='gear'?gearLibrary.length:state.items.length;
    const foot=module.id==='gear'?`共通台帳 ${gearLibrary.length}点・車両${mobilityLibrary.length}台・ペット${petLibrary.length}匹`:count?`保存 ${count}件`:'タップして検討を保存';
    return `<button class="prepModuleCard prepCommonCard" data-prep-common-module="${module.id}"><div class="prepModuleIcon">${module.icon}</div><div class="prepModuleCopy"><h3>${escapeHtml(module.title)}</h3><small>${escapeHtml(module.sub)}</small><span>${escapeHtml(foot)}</span></div><span class="prepModuleCount">${count}</span><b>›</b></button>`;
  }
  function prepCommandBar(plan,candidateCount){
    return `<div class="prepCommandBar"><button data-open-plan-switcher><span>${I.calendar}</span><div><small>${plan?'主役予定':'予定との紐付け'}</small><b>${plan?`${candidateCount}件から切替`:'予定を選ぶ'}</b></div><em>›</em></button><button data-open-gear-manager><span>${I.bag}</span><div><small>共通台帳</small><b>ギア${gearLibrary.length}・車両${mobilityLibrary.length}・ペット${petLibrary.length}</b></div><em>›</em></button></div>`;
  }
  function prepPage(){
    const plan=activePlan(),candidateCount=activePlanCandidates().length;
    if(!plan){
      const modules=prepCommonModuleDefinitions(),saved=prepCommonSavedCount();
      return `<section class="page ${active==='prep'?'active':''}" id="page-prep"><section class="prepHero prepHero01 prepNotebookHero"><img src="assets/prep_hero_art.png" alt=""><div class="prepHeroCopy"><small>PREPARATION NOTE</small><h1>準備</h1><p>予定前の準備ノート</p><span>料理案・買物メモ・ルート候補を先に保存</span></div><div class="prepNotebookStat"><b>${saved}</b><span>保存</span></div></section>${prepCommandBar(null,candidateCount)}<div class="prepSectionHead compact"><div><small>COMMON NOTE</small><h2>準備アイデア</h2></div><span>${saved}件</span></div><div class="prepModuleGrid compact">${modules.map(prepCommonCard).join('')}</div></section>`;
    }
    const modules=prepModuleDefinitions(plan),progress=prepProgress(plan),status=prepStatusLabel(plan),days=Math.ceil((parseYmd(plan.start)-new Date(new Date().setHours(0,0,0,0)))/86400000),dayText=days>0?`あと${days}日`:days===0?'今日':days===-1?'昨日':'開始済み';
    return `<section class="page ${active==='prep'?'active':''}" id="page-prep"><section class="prepHero prepHero01" data-prep-plan-detail><img src="assets/prep_hero_art.png" alt=""><div class="prepHeroCopy"><small>PREPARATION</small><h1>準備</h1><p>${escapeHtml(plan.title)}</p><span>${escapeHtml(dayText)} ・ ${escapeHtml(planRangeLabel(plan))}</span></div><div class="prepPercent" style="--prep:${progress.percent}"><b>${progress.percent}<small>%</small></b><span>${escapeHtml(status)}</span></div><em class="prepHeroLink">予定詳細&nbsp;›</em></section>${prepCommandBar(plan,candidateCount)}<div class="prepSectionHead compact"><div><small>${escapeHtml(status)}</small><h2>準備項目</h2></div><span>${progress.done}/${progress.total}</span></div><div class="prepModuleGrid compact">${modules.map(module=>prepCard(plan,module)).join('')}</div></section>`;
  }
  function libraryTotalValue(){return gearLibrary.reduce((sum,g)=>sum+(Number(g.purchasePrice)||0)*(Number(g.quantity)||1),0);}
  function gearKitMemberships(id){return gearKits.filter(k=>(k.gearIds||[]).includes(id));}
  function libraryCounts(){const stockRows=gearLibrary.filter(isStockRole),lowStock=stockRows.filter(g=>stockState(g).id!=='ok').length;return {gear:gearLibrary.reduce((n,g)=>n+(Number(g.quantity)||1),0),gearRows:gearLibrary.length,kits:gearKits.length,customs:gearCustoms.length,stockRows:stockRows.length,lowStock,events:assetEvents.length,relations:gearRelationCount(),mobility:mobilityLibrary.length,pets:petLibrary.length,storage:storageLibrary.length};}
  function libraryStorageItems(name){
    return [
      ...gearLibrary.filter(g=>g.storage===name).map(g=>({type:'gear',id:g.id,name:g.name,sub:`${g.category||'ギア'}・${g.quantity||1}点`})),
      ...mobilityLibrary.filter(g=>g.storage===name).map(g=>({type:'mobility',id:g.id,name:g.name,sub:g.type||'車両'}))
    ];
  }
  function libraryStorageCount(name){return libraryStorageItems(name).reduce((n,x)=>n+(x.type==='gear'?(Number(gearById(x.id)?.quantity)||1):1),0);}
  function petAlertSummary(p){
    const rows=[];if(p.rabiesNext)rows.push(`狂犬病 ${p.rabiesNext}`);if(p.vaccineNext)rows.push(`混合ワクチン ${p.vaccineNext}`);if(p.healthCheckNext)rows.push(`健診 ${p.healthCheckNext}`);return rows.join(' / ')||'期限情報未登録';
  }
  function mobilityAlertSummary(m){
    const rows=[];if(m.inspectionDate)rows.push(`車検 ${m.inspectionDate}`);if(m.insuranceDate)rows.push(`保険 ${m.insuranceDate}`);if(m.maintenanceNext)rows.push(`次回整備 ${m.maintenanceNext}`);return rows.join(' / ')||'期限情報未登録';
  }
  function libraryTabsMarkup(){
    const c=libraryCounts(),tabs=[['gear','ギア',c.gearRows,I.bag],['mobility','車・自転車',c.mobility,I.car],['pets','ペット',c.pets,I.paw],['storage','保管場所',c.storage,I.box],['transfer','取込・出力','',I.database]];
    return `<div class="libraryTabs">${tabs.map(([id,label,count,icon])=>`<button class="${libraryTab===id?'active':''}" data-library-tab="${id}"><i>${icon}</i><span>${label}</span>${count!==''?`<b>${count}</b>`:''}</button>`).join('')}</div>`;
  }
  function gearGlyph(category){const map={テント:I.tent,タープ:I.tent,照明:I.sun,電源:I.link,収納:I.box,ペット:I.paw,キッチン:I.cup,冷蔵:I.box,空調:I.sun,暖房:I.sun};return map[category]||I.bag;}
  function filteredGearLibrary(){
    const q=libraryGearQuery.trim().toLowerCase();
    const rows=gearLibrary.filter(g=>{
      const relationNames=gearRelationsFor(g.id).map(r=>r.gear?.name||'').join(' ');
      const customNames=[currentCustomForBase(g.id)?.name||'',...customsUsingPart(g.id).map(c=>c.name)].join(' ');return (libraryGearCategory==='すべて'||g.category===libraryGearCategory)&&(!q||[g.name,g.brand,g.model,g.storage,g.memo,g.role,relationNames,customNames,(g.tags||[]).join(' ')].join(' ').toLowerCase().includes(q));
    });
    const compare={name:(a,b)=>a.name.localeCompare(b.name,'ja'),category:(a,b)=>a.category.localeCompare(b.category,'ja')||a.name.localeCompare(b.name,'ja'),updated:(a,b)=>(b.updatedAt||0)-(a.updatedAt||0),quantity:(a,b)=>(b.quantity||1)-(a.quantity||1),connections:(a,b)=>gearRelationsFor(b.id).length-gearRelationsFor(a.id).length,stock:(a,b)=>stockNumber(a)-stockNumber(b)}[libraryGearSort];
    return rows.sort(compare||((a,b)=>a.name.localeCompare(b.name,'ja')));
  }
  function gearSystemHero(){
    const c=libraryCounts();
    return `<div class="gearSystemHero library03Hero"><div class="gearSystemCopy"><small>GEAR ECOSYSTEM</small><h3>所有品から、<br><em>現在仕様と残量</em>まで。</h3><p>カスタム構成・交換部品・消耗品・燃料を、本体との関係ごと管理します。</p></div><div class="gearSystemStats"><div><b>${c.gearRows}</b><span>種類</span></div><div><b>${c.customs}</b><span>カスタム</span></div><div><b>${c.stockRows}</b><span>在庫品</span></div><div class="${c.lowStock?'alert':''}"><b>${c.lowStock}</b><span>補充</span></div></div></div>`;
  }
  function gearModeMarkup(){
    const c=libraryCounts(),tabs=[['dashboard','概要',''],['items','アイテム',c.gearRows],['kits','セット',c.kits],['customs','カスタム',c.customs],['stock','在庫',c.stockRows],['lifecycle','履歴',c.events],['relations','つながり',c.relations]];
    return `<div class="gearModeTabs">${tabs.map(([id,label,count])=>`<button class="${libraryGearView===id?'active':''}" data-library-gear-view="${id}"><span>${label}</span><b>${count}</b></button>`).join('')}</div>`;
  }
  function gearDashboardMarkup(plan){
    const c=libraryCounts();
    const selectedIds=plan?prepModuleState(plan,prepModuleDefinitions(plan)[1]).gearIds:[];
    const upcoming=assetEvents.filter(e=>e.nextDate).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,2);
    const low=gearLibrary.filter(isStockRole).filter(g=>stockState(g).id!=='ok').slice(0,2);
    const recent=assetEvents.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0)).slice(0,2);
    const planLabel=plan?plan.title:'予定未選択';
    const actionCount=low.length+upcoming.length;
    return `<div class="gearViewBody assetDashboard compactOverview"><div class="assetOverviewTop"><label class="assetQuickSearch">${I.search}<input data-overview-search placeholder="資産を検索"></label><button data-library-gear-view="items">一覧を見る</button></div><div class="assetMetricGrid compact"><button data-dashboard-jump="items"><small>所有</small><b>${c.gear}</b><span>${c.gearRows}種類</span></button><button data-dashboard-jump="stock" class="${c.lowStock?'warn':''}"><small>補充</small><b>${c.lowStock}</b><span>在庫確認</span></button><button data-dashboard-jump="lifecycle"><small>次回整備</small><b>${upcoming.length}</b><span>点検・交換</span></button><button data-dashboard-jump="items"><small>今回</small><b>${selectedIds.length}</b><span>${escapeHtml(planLabel)}</span></button></div><section class="overviewNow"><div class="overviewHead"><div><small>NOW</small><h3>今やること</h3></div><b>${actionCount}</b></div><div class="overviewActionList">${low.map(g=>`<button data-library-edit="gear" data-library-id="${g.id}" class="danger"><span><small>${escapeHtml(stockState(g).label)}</small><b>${escapeHtml(g.name)}</b></span><em>${escapeHtml(stockDisplay(g))}</em></button>`).join('')}${upcoming.map(e=>`<button data-library-edit="event" data-library-id="${e.id}"><span><small>${escapeHtml(e.nextDate)}</small><b>${escapeHtml(assetTargetName(e))}</b></span><em>${escapeHtml(e.title)}</em></button>`).join('')||`<div class="overviewEmpty"><b>今すぐ対応する項目はありません</b><span>補充や次回予定を登録すると表示されます。</span></div>`}</div></section><section class="overviewRecent"><div class="overviewHead"><div><small>RECENT</small><h3>最近の動き</h3></div><button data-dashboard-jump="lifecycle">履歴</button></div><div>${recent.map(e=>`<button data-library-edit="event" data-library-id="${e.id}"><time>${escapeHtml(e.date.slice(5).replace('-','/'))}</time><span>${escapeHtml(e.title)}</span></button>`).join('')||`<p>履歴はまだありません</p>`}</div></section></div>`;
  }
  function gearItemsMarkup(plan){
    const module=plan?prepModuleDefinitions(plan)[1]:null,selected=plan&&module?prepModuleState(plan,module).gearIds:[];
    const categories=['すべて',...new Set(gearLibrary.map(g=>g.category).filter(Boolean))];
    const filtered=filteredGearLibrary(),shown=filtered.slice(0,libraryGearLimit);
    return `<div class="gearViewBody"><div class="libraryToolbar premium"><label class="librarySearch">${I.search}<input id="libraryGearSearch" value="${escapeHtml(libraryGearQuery)}" placeholder="名前・型番・関係・保管場所を検索"></label><button class="libraryAddPrimary" data-library-add="gear">＋追加</button></div><div class="libraryCategoryChips">${categories.map(c=>`<button class="${libraryGearCategory===c?'active':''}" data-gear-filter="${escapeHtml(c)}">${escapeHtml(c)}<b>${c==='すべて'?gearLibrary.length:gearLibrary.filter(g=>g.category===c).length}</b></button>`).join('')}</div><div class="libraryResultBar"><span><b>${filtered.length}</b>件中 ${shown.length}件を表示</span><select id="libraryGearSort"><option value="name" ${libraryGearSort==='name'?'selected':''}>名前順</option><option value="category" ${libraryGearSort==='category'?'selected':''}>分類順</option><option value="connections" ${libraryGearSort==='connections'?'selected':''}>つながり順</option><option value="updated" ${libraryGearSort==='updated'?'selected':''}>更新順</option><option value="quantity" ${libraryGearSort==='quantity'?'selected':''}>数量順</option><option value="stock" ${libraryGearSort==='stock'?'selected':''}>在庫少ない順</option></select></div><div class="libraryGearRows">${shown.map(g=>{const rels=gearRelationsFor(g.id),currentCustom=currentCustomForBase(g.id),partCustoms=customsUsingPart(g.id),relationBadges=rels.slice(0,2).map(r=>`<span class="gearRelationBadge ${relationTone(r.type)}"><i></i>${escapeHtml(r.label)}：${escapeHtml(r.gear.name)}</span>`).join(''),specialBadge=currentCustom?`<span class="gearSpecialBadge custom">CUSTOM：${escapeHtml(currentCustom.name)}</span>`:partCustoms.length?`<span class="gearSpecialBadge part">構成パーツ：${escapeHtml(partCustoms[0].name)}</span>`:isStockRole(g)?`<span class="gearSpecialBadge stock ${stockState(g).id}">${escapeHtml(stockState(g).label)}：${escapeHtml(stockDisplay(g))}</span>`:'';return `<article class="libraryGearRow ${selected.includes(g.id)?'selected':''} ${rels.length||specialBadge?'connected':''}"><button class="libraryGearMain" data-library-edit="gear" data-library-id="${g.id}"><i class="gearGlyph">${gearGlyph(g.category)}</i><div class="gearRowCopy"><small>${escapeHtml(g.category)} ・ ${escapeHtml(gearRoleFor(g))}${g.brand?` ・ ${escapeHtml(g.brand)}`:''}</small><b>${escapeHtml(g.name)}</b><span>${g.model?`${escapeHtml(g.model)} ・ `:''}${escapeHtml(g.storage||'保管場所未設定')} ・ ${escapeHtml(g.condition||'使用可')}</span>${specialBadge||''}${rels.length?`<div class="gearRelationMini">${relationBadges}${rels.length>2?`<em>＋${rels.length-2}</em>`:''}</div>`:''}</div><div class="gearRowMeta"><strong>${isStockRole(g)?escapeHtml(String(stockNumber(g))):Number(g.quantity)||1}</strong><small>${isStockRole(g)?escapeHtml(g.stockUnit||'個'):(rels.length?`${rels.length}関係`:'単品')}</small><em>›</em></div></button>${plan?`<button class="libraryPlanToggle ${selected.includes(g.id)?'active':''}" data-toggle-gear-plan="${g.id}">${selected.includes(g.id)?'今回✓':'今回＋'}</button>`:''}</article>`;}).join('')||`<div class="libraryEmpty">条件に合うギアがありません</div>`}</div>${filtered.length>shown.length?`<button class="libraryLoadMore" data-library-more>さらに${Math.min(30,filtered.length-shown.length)}件表示</button>`:''}</div>`;
  }
  function gearKitsMarkup(plan){
    const module=plan?prepModuleDefinitions(plan)[1]:null,selected=plan&&module?prepModuleState(plan,module).gearIds:[];
    return `<div class="gearViewBody"><div class="gearSectionLead"><div><small>REUSABLE SETS</small><b>一式を、ワンタップで。</b><p>ペア使いや専用品を、持出し単位としてまとめます。</p></div><button data-library-add="kit">＋セット</button></div><div class="gearKitGrid">${gearKits.map(k=>{const members=k.gearIds.map(gearById).filter(Boolean),allSelected=members.length&&members.every(g=>selected.includes(g.id));return `<article class="gearKitCard ${k.favorite?'favorite':''}"><button class="gearKitMain" data-library-edit="kit" data-library-id="${k.id}"><div class="gearKitMark">${I.link}</div><div><small>${escapeHtml(k.kind)} ・ ${members.length}点</small><b>${escapeHtml(k.name)}</b><p>${escapeHtml(k.memo||'組み合わせメモなし')}</p><div class="gearKitMembers">${members.slice(0,3).map(g=>`<span title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</span>`).join('')}${members.length>3?`<em>＋${members.length-3}</em>`:''}</div></div><strong>›</strong></button>${plan?`<button class="gearKitPlan ${allSelected?'active':''}" data-library-kit-plan="${k.id}">${allSelected?'今回から外す':'今回へ一式追加'}</button>`:''}</article>`;}).join('')||`<div class="libraryEmpty">セットはまだありません</div>`}</div></div>`;
  }
  function customGearPickerMarkup(){
    const baseId=libraryEditorDraft?.baseGearId||'',rows=gearLibrary.filter(g=>g.id!==baseId&&!isStockRole(g)).slice(0,60);
    const selected=libraryEditorCustomPartIds.map(gearById).filter(Boolean);
    return `<section class="customPicker"><div class="kitPickerHead"><span><b>装着・構成パーツ</b><small>${selected.length}点を選択中</small></span></div>${selected.length?`<div class="kitSelectedChips">${selected.map(g=>`<span>${escapeHtml(g.name)}<button type="button" data-custom-part-toggle="${g.id}">×</button></span>`).join('')}</div>`:''}<div class="kitGearRows">${rows.map(g=>`<button type="button" class="${libraryEditorCustomPartIds.includes(g.id)?'selected':''}" data-custom-part-toggle="${g.id}"><i>${gearGlyph(g.category)}</i><span><small>${escapeHtml(gearRoleFor(g))} ・ ${escapeHtml(g.storage||'未設定')}</small><b>${escapeHtml(g.name)}</b></span><em>${libraryEditorCustomPartIds.includes(g.id)?'✓':'＋'}</em></button>`).join('')}</div></section>`;
  }
  function gearCustomsMarkup(){
    return `<div class="gearViewBody"><div class="gearSectionLead customLead"><div><small>CUSTOM CONFIGURATIONS</small><b>今の仕様を、ひと目で。</b><p>本体と装着パーツを構成として保存。純正戻しや別仕様も残せます。</p></div><button data-library-add="custom">＋構成</button></div><div class="customConfigGrid">${gearCustoms.map(c=>{const base=gearById(c.baseGearId),parts=(c.partGearIds||[]).map(gearById).filter(Boolean);return `<article class="customConfigCard ${c.status==='現在の仕様'?'current':''}"><button data-library-edit="custom" data-library-id="${c.id}"><div class="customBase"><i>${gearGlyph(base?.category||'その他')}</i><span><small>${escapeHtml(c.status)} ・ ${parts.length}パーツ</small><b>${escapeHtml(c.name)}</b><em>${escapeHtml(base?.name||'本体未設定')}</em></span></div><div class="customPartFlow">${parts.length?parts.map(p=>`<span><i>${gearGlyph(p.category)}</i><b>${escapeHtml(p.name)}</b><small>${escapeHtml(gearRoleFor(p))}</small></span>`).join(''):`<p>構成パーツ未登録</p>`}</div><div class="customMemo">${escapeHtml(c.memo||'構成メモなし')}<strong>›</strong></div></button></article>`;}).join('')||`<div class="libraryEmpty customEmpty"><b>カスタム構成はまだありません</b><span>ランタン＋シェード、フラットバーナー＋五徳などを「現在の仕様」として登録できます。</span></div>`}</div><div class="customGuide"><b>カスタム品の持ち方</b><p>シェードや五徳は単品ギアとして登録し、ここで本体へ組み込みます。外した純正品も「交換部品」として残せます。</p></div></div>`;
  }

  function assetTargetName(e){if(e.targetType==='gear')return gearById(e.targetId)?.name||'削除済みギア';if(e.targetType==='mobility')return mobilityLibrary.find(x=>x.id===e.targetId)?.name||'削除済み車両';return petLibrary.find(x=>x.id===e.targetId)?.name||'削除済みペット';}
  function gearLifecycleMarkup(){
    const types=['すべて','購入','カスタム','使用','補充','交換','点検','修理','売却','廃棄','通院','ワクチン'];
    const rows=assetEvents.filter(e=>libraryEventFilter==='すべて'||e.eventType===libraryEventFilter).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.createdAt-a.createdAt);
    const upcoming=assetEvents.filter(e=>e.nextDate&&e.nextDate>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,3);
    return `<div class="gearViewBody"><div class="gearSectionLead lifecycleLead"><div><small>ASSET LIFECYCLE</small><b>買ってから、使い終えるまで。</b><p>購入・装着変更・交換・修理・売却まで、資産ごとの履歴を残します。</p></div><button data-library-add="event">＋履歴</button></div>${upcoming.length?`<div class="lifecycleUpcoming"><small>NEXT CARE</small>${upcoming.map(e=>`<div><b>${escapeHtml(e.nextDate)}</b><span>${escapeHtml(assetTargetName(e))}</span><em>${escapeHtml(e.title)}</em></div>`).join('')}</div>`:''}<div class="relationFilterChips lifecycleFilters">${types.map(t=>`<button class="${libraryEventFilter===t?'active':''}" data-event-filter="${t}">${t}</button>`).join('')}</div><div class="lifecycleTimeline">${rows.map(e=>`<article><div class="lifecycleDate"><b>${escapeHtml(e.date.slice(5).replace('-','/'))}</b><span>${escapeHtml(e.date.slice(0,4))}</span></div><button data-library-edit="event" data-library-id="${e.id}"><small>${escapeHtml(e.eventType)} ・ ${escapeHtml(assetTargetName(e))}</small><b>${escapeHtml(e.title)}</b><p>${escapeHtml(e.detail||'詳細メモなし')}</p>${e.nextDate?`<em>次回 ${escapeHtml(e.nextDate)}</em>`:''}${e.cost!==''?`<strong>¥${Number(e.cost||0).toLocaleString()}</strong>`:''}</button></article>`).join('')||`<div class="libraryEmpty"><b>履歴はまだありません</b><span>ギア・車・ペットの購入、使用、交換、修理などを残せます。</span></div>`}</div></div>`;
  }
  function gearStockMarkup(){
    const rows=gearLibrary.filter(isStockRole).filter(g=>libraryStockFilter==='すべて'||gearRoleFor(g)===libraryStockFilter).sort((a,b)=>{const sa=stockState(a).id,sb=stockState(b).id,rank={empty:0,low:1,ok:2};return rank[sa]-rank[sb]||stockNumber(a)-stockNumber(b);});
    const low=rows.filter(g=>stockState(g).id!=='ok').length;
    return `<div class="gearViewBody"><div class="gearSectionLead stockLead"><div><small>CONSUMABLE & FUEL</small><b>替芯・マントル・燃料。</b><p>残量と補充ラインを持ち、本体との対応関係まで確認します。</p></div><button data-library-add="gear">＋在庫品</button></div><div class="stockSummary"><div><b>${rows.length}</b><span>在庫品</span></div><div class="${low?'alert':''}"><b>${low}</b><span>補充対象</span></div><div><b>${rows.filter(g=>gearRoleFor(g)==='燃料').length}</b><span>燃料</span></div></div><div class="relationFilterChips stockFilters">${['すべて','消耗品','燃料'].map(x=>`<button class="${libraryStockFilter===x?'active':''}" data-stock-filter="${x}">${x}<b>${x==='すべて'?gearLibrary.filter(isStockRole).length:gearLibrary.filter(g=>gearRoleFor(g)===x).length}</b></button>`).join('')}</div><div class="stockCardGrid">${rows.map(g=>{const state=stockState(g),targets=gearRelationsFor(g.id).filter(r=>['consumableFor','fuelFor'].includes(r.type));return `<article class="stockCard ${state.id}"><button class="stockCardMain" data-library-edit="gear" data-library-id="${g.id}"><div class="stockIcon">${gearGlyph(g.category)}</div><div><small>${escapeHtml(gearRoleFor(g))} ・ ${escapeHtml(state.label)}</small><b>${escapeHtml(g.name)}</b><span>${targets.length?`使用先：${escapeHtml(targets.slice(0,2).map(r=>r.gear.name).join('・'))}`:'使用先未設定'}</span>${g.expiryDate?`<em>期限 ${escapeHtml(g.expiryDate)}</em>`:''}</div><strong>${escapeHtml(stockDisplay(g))}</strong></button><div class="stockMeter"><i style="--stock:${Math.min(100,Math.max(4,stockNumber(g)/Math.max(stockNumber(g),Number(g.reorderPoint)||1)*55))}%"></i></div><div class="stockActions"><button data-stock-adjust="-${escapeHtml(String(g.stockStep||1))}" data-stock-id="${g.id}">− 使用</button><span>補充目安 ${g.reorderPoint===''?'未設定':escapeHtml(String(g.reorderPoint))+' '+escapeHtml(g.stockUnit||'個')}</span><button data-stock-adjust="${escapeHtml(String(g.stockStep||1))}" data-stock-id="${g.id}">＋ 補充</button></div></article>`;}).join('')||`<div class="libraryEmpty stockEmpty"><b>消耗品・燃料はまだありません</b><span>役割を「消耗品」または「燃料」にして登録すると、ここで残量管理できます。</span></div>`}</div></div>`;
  }
  function gearRelationsMarkup(){
    const edges=gearRelationEdges().filter(e=>libraryRelationFilter==='すべて'||e.type===libraryRelationFilter);
    const filters=[['すべて','すべて'],...Object.entries(gearRelationTypes).map(([id,v])=>[id,v.label])];
    return `<div class="gearViewBody"><div class="gearSectionLead relationLead"><div><small>CONNECTION MAP</small><b>何と使うかを忘れない。</b><p>保管場所とは別に、使い方と収納の関係を記録します。</p></div><button data-library-add="gear">＋関係</button></div><div class="relationFilterChips">${filters.map(([id,label])=>`<button class="${libraryRelationFilter===id?'active':''}" data-relation-filter="${id}">${escapeHtml(label)}<b>${id==='すべて'?gearRelationCount():gearRelationEdges().filter(e=>e.type===id).length}</b></button>`).join('')}</div><div class="gearRelationRows">${edges.map(e=>`<button class="gearRelationCard ${relationTone(e.type)}" data-library-edit="gear" data-library-id="${e.source.id}"><div class="relationNode"><i>${gearGlyph(e.source.category)}</i><span><small>${escapeHtml(e.source.category)}</small><b>${escapeHtml(e.source.name)}</b></span></div><div class="relationArrow"><small>${escapeHtml(relationLabel(e.type))}</small><span>→</span></div><div class="relationNode target"><i>${gearGlyph(e.target.category)}</i><span><small>${escapeHtml(e.target.category)}</small><b>${escapeHtml(e.target.name)}</b></span></div></button>`).join('')||`<div class="libraryEmpty">この種類のつながりはありません</div>`}</div><div class="relationGuide"><b>対応する関係</b><p>ペア使い／専用品／装着中／対応品／純正部品／消耗先／燃料先／収納／代替</p><small>例：シェード → ランタン（装着中）、替芯 → ランタン（消耗先）、オイル → ランタン（燃料先）。</small></div></div>`;
  }
  function gearLibraryPanel(plan){
    const body=libraryGearView==='dashboard'?gearDashboardMarkup(plan):libraryGearView==='kits'?gearKitsMarkup(plan):libraryGearView==='customs'?gearCustomsMarkup():libraryGearView==='stock'?gearStockMarkup():libraryGearView==='lifecycle'?gearLifecycleMarkup():libraryGearView==='relations'?gearRelationsMarkup():gearItemsMarkup(plan);
    return `<section class="libraryPanel gearLibraryPanel">${libraryGearView==='dashboard'?'':gearSystemHero()}${body}</section>`;
  }
  function mobilityLibraryPanel(){
    return `<section class="libraryPanel entityLibraryPanel detailEntityPanel"><div class="entityCompactHead"><div><small>MOBILITY</small><b>車・自転車</b><span>車検・保険・整備・装着品を確認</span></div><button data-library-add="mobility">＋登録</button></div><div class="libraryCardRows">${mobilityLibrary.map(m=>{const attached=gearLibrary.filter(g=>(g.relations||[]).some(r=>(r.targetType||'gear')==='mobility'&&r.targetId===m.id));return `<article class="entityDetailCard"><button class="entityDetailMain" data-library-edit="mobility" data-library-id="${m.id}"><i>${m.type==='自転車'?I.bike:I.car}</i><span><small>${escapeHtml(m.type)}${m.primary?'・メイン':''}</small><b>${escapeHtml(m.name)}</b><em>${escapeHtml([m.maker,m.model,m.color].filter(Boolean).join(' / ')||'基本情報未登録')}</em></span><strong>›</strong></button><div class="entityStatusStrip"><span>${escapeHtml(mobilityAlertSummary(m))}</span><span>装着・関連 ${attached.length}点</span></div>${attached.length?`<div class="entityMiniList">${attached.slice(0,4).map(g=>`<button data-library-edit="gear" data-library-id="${g.id}">${escapeHtml(g.name)}</button>`).join('')}</div>`:''}</article>`;}).join('')||`<div class="libraryEmpty">車・自転車はまだありません</div>`}</div></section>`;
  }
  function petLibraryPanel(){
    return `<section class="libraryPanel entityLibraryPanel detailEntityPanel"><div class="entityCompactHead"><div><small>FAMILY</small><b>ペット</b><span>誕生日・予防・通院・注意事項を確認</span></div><button data-library-add="pet">＋登録</button></div><div class="petDetailGrid">${petLibrary.map(p=>{const events=assetEvents.filter(e=>e.targetType==='pet'&&e.targetId===p.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));return `<article class="petDetailCard"><button class="entityDetailMain" data-library-edit="pet" data-library-id="${p.id}"><i>${I.paw}</i><span><small>${escapeHtml(p.species||'種類未登録')}・${escapeHtml(p.breed||'品種未登録')}</small><b>${escapeHtml(p.name)}</b><em>${p.birthday?`誕生日 ${escapeHtml(p.birthday)}`:escapeHtml(p.age?`${p.age}歳`:'誕生日未登録')}</em></span><strong>›</strong></button><div class="entityStatusStrip pet"><span>${escapeHtml(petAlertSummary(p))}</span><span>履歴 ${events.length}件</span></div>${p.medicalNote?`<p class="entityNote">${escapeHtml(p.medicalNote)}</p>`:''}<div class="entityMiniActions"><button data-library-add="event" data-event-target="pet:${p.id}">＋通院・予防</button>${events[0]?`<button data-library-edit="event" data-library-id="${events[0].id}">最新 ${escapeHtml(events[0].date)}</button>`:''}</div></article>`;}).join('')||`<div class="libraryEmpty">ペットはまだ登録されていません</div>`}</div></section>`;
  }
  function storageLibraryPanel(){
    return `<section class="libraryPanel entityLibraryPanel detailEntityPanel"><div class="entityCompactHead"><div><small>STORAGE</small><b>保管場所</b><span>場所を開くと登録品をその場で確認</span></div><button data-library-add="storage">＋追加</button></div><div class="storageDetailGrid">${storageLibrary.map(x=>{const items=libraryStorageItems(x.name);return `<article class="storageDetailCard"><button class="storageDetailHead" data-library-storage-toggle="${x.id}"><i>${I.folder}</i><span><small>${escapeHtml(x.type||'保管場所')}</small><b>${escapeHtml(x.name)}</b><em>${escapeHtml(x.memo||'メモなし')}</em></span><strong>${items.length}件⌄</strong></button><div class="storageContents" data-storage-content="${x.id}" hidden>${items.length?items.map(item=>`<button data-library-edit="${item.type}" data-library-id="${item.id}"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.sub)}</small></span><em>›</em></button>`).join(''):`<p>この場所に登録された品はありません</p>`}<button class="storageEditButton" data-library-edit="storage" data-library-id="${x.id}">保管場所を編集</button></div></article>`;}).join('')||`<div class="libraryEmpty">保管場所はまだありません</div>`}</div></section>`;
  }
  function transferLibraryPanel(){
    return `<section class="libraryPanel transferLibraryPanel transfer10"><div class="transferCompactHead"><small>IMPORT / BACKUP</small><b>取込・出力</b><p>目的を選んで進みます。長い説明は開いた先で確認できます。</p></div><div class="transferMenuGrid"><button data-transfer-section="bulk"><i>${I.plus}</i><span><b>まとめて登録</b><small>テキストを1行1品で追加</small></span></button><button data-library-placeholder="Excel取込"><i>${I.database}</i><span><b>Excel取込</b><small>表から候補を整理</small></span></button><button data-library-placeholder="PDF・写真取込"><i>${I.camera}</i><span><b>PDF・写真</b><small>画像から候補を抽出</small></span></button><button data-transfer-section="backup"><i>${I.folder}</i><span><b>バックアップ</b><small>JSON保存・復元</small></span></button></div><article class="transferSectionCard" data-transfer-panel="bulk"><div class="transferSectionTitle"><b>まとめて登録</b><small>1行に1つ入力</small></div><textarea id="libraryBulkText" placeholder="ランドロックM
ソフトクーラー38
たねほおずき"></textarea><div class="transferInlineForm"><select id="libraryBulkCategory"><option>その他</option><option>テント</option><option>タープ</option><option>寝具</option><option>テーブル</option><option>キッチン</option><option>照明</option><option>電源</option><option>収納</option><option>ペット</option></select><input id="libraryBulkBrand" placeholder="ブランド（任意）"><button data-library-bulk-add>追加</button></div></article><article class="transferSectionCard" data-transfer-panel="backup"><div class="transferSectionTitle"><b>バックアップ</b><small>資産台帳を一括保存・復元</small></div><div class="transferActions"><button data-library-export>JSONを書き出す</button><button data-library-import-open>JSONを読み込む</button><input id="libraryImportFile" type="file" accept="application/json,.json" hidden></div></article></section>`;
  }
  function libraryField(label,content){return `<label class="libraryField"><span>${label}</span>${content}</label>`;}
  function gearRelationEditorMarkup(){
    const currentId=libraryEditorId||'';
    const options=['alwaysWith','conditionalWith','mountsOn','compatibleWith','fuelFor','storedIn'].map(id=>`<option value="${id}">${escapeHtml(gearRelationTypes[id].label)}</option>`).join('');
    const groups=[['gear','ギア',gearLibrary.filter(g=>g.id!==currentId)],['mobility','車・自転車',mobilityLibrary],['storage','保管場所',storageLibrary]];
    const targetOptions=groups.map(([type,label,rows])=>`<optgroup label="${label}">${rows.map(g=>`<option value="${type}:${g.id}">${escapeHtml(g.name)}</option>`).join('')}</optgroup>`).join('');
    const conditionOptions=['','常時','インナーテント使用時','寒い時','厳寒時','雨天時','電源なし','施設設備なし','薪ストーブ使用時'];
    return `<section class="relationEditorSection simpleRelations"><div class="relationEditorTitle"><div>${I.link}</div><span><b>組み合わせ</b><small>「必ず」「条件付き」「装着」の3つを中心に選べます</small></span></div><div class="relationComposer compact"><select id="lib-relation-type">${options}</select><select id="lib-relation-target"><option value="">相手を選択</option>${targetOptions}</select><select id="lib-relation-condition">${conditionOptions.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x||'条件なし')}</option>`).join('')}</select><button type="button" data-library-relation-add>追加</button></div><div class="relationHelp">例：専用フライは「必ず一緒」／グラウンドシートは「条件で一緒・インナーテント使用時」／車載品は「取付・装着」</div><div class="relationDraftList">${libraryEditorRelationsDraft.map((r,index)=>{const target=assetRef(r.targetType||'gear',r.targetId);return target?`<div class="relationDraftRow ${relationTone(r.type)}"><span><small>${escapeHtml(relationLabel(r.type))}${r.condition?`・${escapeHtml(r.condition)}`:''}</small><b>${escapeHtml(target.name)}</b></span><button type="button" data-library-relation-remove="${index}">×</button></div>`:'';}).join('')||`<p>まだ組み合わせはありません</p>`}</div></section>`;
  }
  function kitGearPickerMarkup(){
    const q=libraryKitQuery.trim().toLowerCase(),rows=gearLibrary.filter(g=>!q||[g.name,g.category,g.brand,g.storage].join(' ').toLowerCase().includes(q)).slice(0,50);
    const selectedNames=libraryEditorKitGearIds.map(gearById).filter(Boolean);
    return `<section class="kitPicker"><div class="kitPickerHead"><span><b>セット内容</b><small>${selectedNames.length}点を選択中・同じギアは複数セットに登録できます</small></span><label>${I.search}<input id="lib-kit-search" value="${escapeHtml(libraryKitQuery)}" placeholder="ギアを検索"></label></div>${selectedNames.length?`<div class="kitSelectedList">${selectedNames.map(g=>`<div><span><b>${escapeHtml(g.name)}</b><small>${gearKitMemberships(g.id).length}セットで使用</small></span><button type="button" class="${libraryEditorKitRequiredIds.includes(g.id)?'required':''}" data-kit-required-toggle="${g.id}">${libraryEditorKitRequiredIds.includes(g.id)?'必須':'任意'}</button><button type="button" data-kit-gear-toggle="${g.id}">×</button></div>`).join('')}</div>`:''}<div class="kitGearRows">${rows.map(g=>`<button type="button" class="${libraryEditorKitGearIds.includes(g.id)?'selected':''}" data-kit-gear-toggle="${g.id}"><i>${gearGlyph(g.category)}</i><span><small>${escapeHtml(g.category)} ・ ${escapeHtml(g.storage||'未設定')}</small><b>${escapeHtml(g.name)}</b></span><em>${libraryEditorKitGearIds.includes(g.id)?'✓':'＋'}</em></button>`).join('')}</div></section>`;
  }
  function libraryEditorMarkup(){
    if(!libraryEditorType)return '';
    const isNew=!libraryEditorId;
    let row={};
    if(libraryEditorType==='gear')row=libraryEditorDraft||gearById(libraryEditorId)||{name:'',category:'その他',role:'本体',brand:'',model:'',quantity:1,storage:'',condition:'使用可',purchaseDate:'',purchasePrice:'',tags:[],memo:'',favorite:false,relations:[],stockAmount:'',stockUnit:'個',reorderPoint:'',stockStep:'1',openedDate:'',expiryDate:''};
    if(libraryEditorType==='event')row=libraryEditorDraft||assetEvents.find(x=>x.id===libraryEditorId)||{targetType:'gear',targetId:'',eventType:'使用',date:new Date().toISOString().slice(0,10),title:'',detail:'',cost:'',nextDate:''};
    if(libraryEditorType==='kit')row=libraryEditorDraft||gearKits.find(x=>x.id===libraryEditorId)||{name:'',kind:'セット',gearIds:[],requiredGearIds:[],conditionTags:[],memo:'',favorite:false};
    if(libraryEditorType==='custom')row=libraryEditorDraft||customById(libraryEditorId)||{name:'',baseGearId:'',partGearIds:[],status:'現在の仕様',memo:''};
    if(libraryEditorType==='mobility')row=mobilityLibrary.find(x=>x.id===libraryEditorId)||{type:'車',name:'',maker:'',model:'',color:'',plate:'',storage:'',condition:'使用可',primary:false,memo:''};
    if(libraryEditorType==='pet')row=petLibrary.find(x=>x.id===libraryEditorId)||{name:'',species:'犬',breed:'',sex:'',age:'',size:'',collarColor:'',personality:'',medicalNote:''};
    if(libraryEditorType==='storage')row=storageLibrary.find(x=>x.id===libraryEditorId)||{name:'',type:'収納',memo:''};
    const storageOptions=`<option value="">未設定</option>${storageLibrary.map(x=>`<option value="${escapeHtml(x.name)}" ${row.storage===x.name?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}`;
    let fields='';
    if(libraryEditorType==='event'){const targets=[...gearLibrary.map(x=>({id:x.id,type:'gear',name:x.name,group:'ギア'})),...mobilityLibrary.map(x=>({id:x.id,type:'mobility',name:x.name,group:'車・自転車'})),...petLibrary.map(x=>({id:x.id,type:'pet',name:x.name,group:'ペット'}))];fields=`${libraryField('対象',`<select id="lib-event-target"><option value="">選択してください</option>${targets.map(x=>`<option value="${x.type}:${x.id}" ${(row.targetType+':'+row.targetId)===(x.type+':'+x.id)?'selected':''}>${escapeHtml(x.group)}｜${escapeHtml(x.name)}</option>`).join('')}</select>`)}<div class="libraryFieldGrid">${libraryField('種類',`<select id="lib-event-type">${['購入','カスタム','使用','補充','交換','点検','修理','売却','廃棄','通院','ワクチン'].map(x=>`<option ${row.eventType===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('日付',`<input id="lib-event-date" type="date" value="${escapeHtml(row.date||'')}">`)}</div>${libraryField('内容',`<input id="lib-name" value="${escapeHtml(row.title||'')}" placeholder="例：替芯を交換">`)}${libraryField('詳細',`<textarea id="lib-memo">${escapeHtml(row.detail||'')}</textarea>`)}<div class="libraryFieldGrid">${libraryField('費用',`<input id="lib-event-cost" type="number" min="0" value="${escapeHtml(row.cost??'')}">`)}${libraryField('次回予定日',`<input id="lib-event-next" type="date" value="${escapeHtml(row.nextDate||'')}">`)}</div>`;}
    if(libraryEditorType==='gear'){
      const stockSection=isStockRole(row)?`<section class="stockEditorSection"><div class="relationEditorTitle"><div>${I.database}</div><span><b>在庫・残量</b><small>替芯・マントル・燃料などの残量を管理</small></span></div><div class="libraryFieldGrid three">${libraryField('現在量',`<input id="lib-stock-amount" type="number" min="0" step="any" value="${escapeHtml(row.stockAmount??'')}">`)}${libraryField('単位',`<select id="lib-stock-unit">${['個','本','枚','セット','箱','缶','ボトル','ml','L','g','kg','m'].map(x=>`<option ${row.stockUnit===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('増減単位',`<input id="lib-stock-step" type="number" min="0.01" step="any" value="${escapeHtml(row.stockStep||'1')}">`)}</div><div class="libraryFieldGrid three">${libraryField('補充ライン',`<input id="lib-reorder-point" type="number" min="0" step="any" value="${escapeHtml(row.reorderPoint??'')}">`)}${libraryField('開封日',`<input id="lib-opened-date" type="date" value="${escapeHtml(row.openedDate||'')}">`)}${libraryField('使用期限',`<input id="lib-expiry-date" type="date" value="${escapeHtml(row.expiryDate||'')}">`)}</div></section>`:`<input id="lib-stock-amount" type="hidden" value="${escapeHtml(row.stockAmount??'')}"><input id="lib-stock-unit" type="hidden" value="${escapeHtml(row.stockUnit||'個')}"><input id="lib-reorder-point" type="hidden" value="${escapeHtml(row.reorderPoint??'')}"><input id="lib-stock-step" type="hidden" value="${escapeHtml(row.stockStep||'1')}"><input id="lib-opened-date" type="hidden" value="${escapeHtml(row.openedDate||'')}"><input id="lib-expiry-date" type="hidden" value="${escapeHtml(row.expiryDate||'')}">`;
      fields=`${libraryField('名称',`<input id="lib-name" value="${escapeHtml(row.name)}" required>`)}<div class="libraryFieldGrid three">${libraryField('カテゴリ',`<select id="lib-category">${['テント','タープ','寝具','チェア','テーブル','キッチン','照明','電源','冷蔵','空調','暖房','収納','ペット','その他'].map(x=>`<option ${row.category===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('役割',`<select id="lib-role">${['本体','アクセサリー','専用品','取付部品','収納ケース','カスタムパーツ','交換部品','消耗品','燃料','その他'].map(x=>`<option ${gearRoleFor(row)===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('数量',`<input id="lib-quantity" type="number" min="1" value="${Number(row.quantity)||1}">`)}</div><div class="libraryFieldGrid">${libraryField('ブランド',`<input id="lib-brand" value="${escapeHtml(row.brand||'')}">`)}${libraryField('型番・モデル',`<input id="lib-model" value="${escapeHtml(row.model||'')}">`)}</div><div class="libraryFieldGrid">${libraryField('保管場所',`<select id="lib-storage">${storageOptions}</select>`)}${libraryField('状態',`<select id="lib-condition">${['使用可','点検','修理','買替','手放した'].map(x=>`<option ${row.condition===x?'selected':''}>${x}</option>`).join('')}</select>`)}</div>${stockSection}${gearRelationEditorMarkup()}<div class="libraryFieldGrid">${libraryField('購入日',`<input id="lib-date" type="date" value="${escapeHtml(row.purchaseDate||'')}">`)}${libraryField('購入金額',`<input id="lib-price" type="number" min="0" value="${escapeHtml(row.purchasePrice||'')}">`)}</div>${libraryField('タグ',`<div class="tagSelector"><input id="lib-tags" value="${escapeHtml((row.tags||[]).join('、'))}" placeholder="自由入力もできます"><div>${['春','夏','秋','冬','デュオ','常備','雨天','電源あり','電源なし','犬連れ','寒冷地'].map(t=>`<button type="button" class="${(row.tags||[]).includes(t)?'active':''}" data-tag-toggle="${t}">${t}</button>`).join('')}</div></div>`)}<div class="priceSummary" data-price-summary>小計 ¥${((Number(row.purchasePrice)||0)*(Number(row.quantity)||1)).toLocaleString('ja-JP')}</div>${libraryField('メモ',`<textarea id="lib-memo">${escapeHtml(row.memo||'')}</textarea>`)}<label class="libraryCheck"><input id="lib-favorite" type="checkbox" ${row.favorite?'checked':''}>お気に入り</label>`;
    }
    if(libraryEditorType==='custom')fields=`${libraryField('構成名',`<input id="lib-name" value="${escapeHtml(row.name||'')}" placeholder="例：ランタン 現在仕様">`)}<div class="libraryFieldGrid">${libraryField('本体',`<select id="lib-custom-base"><option value="">本体を選択</option>${gearLibrary.filter(g=>!isStockRole(g)).map(g=>`<option value="${g.id}" ${row.baseGearId===g.id?'selected':''}>${escapeHtml(g.name)}</option>`).join('')}</select>`)}${libraryField('状態',`<select id="lib-custom-status">${['現在の仕様','保存構成','過去構成'].map(x=>`<option ${row.status===x?'selected':''}>${x}</option>`).join('')}</select>`)}</div>${libraryField('メモ',`<textarea id="lib-memo">${escapeHtml(row.memo||'')}</textarea>`)}${customGearPickerMarkup()}`;
    if(libraryEditorType==='kit')fields=`${libraryField('セット名',`<input id="lib-name" value="${escapeHtml(row.name)}" placeholder="例：厳寒キャンプ暖房セット">`)}<div class="libraryFieldGrid">${libraryField('用途',`<select id="lib-kind">${['セット','組み合わせ','持出しセット','積載グループ','収納単位'].map(x=>`<option ${row.kind===x?'selected':''}>${x}</option>`).join('')}</select>`)}<label class="libraryCheck"><input id="lib-favorite" type="checkbox" ${row.favorite?'checked':''}>よく使う</label></div>${libraryField('使用条件',`<input id="lib-kit-conditions" value="${escapeHtml((row.conditionTags||[]).join('、'))}" placeholder="冬、5℃以下、電源なし、雨天など">`)}${kitGearPickerMarkup()}${libraryField('メモ',`<textarea id="lib-memo">${escapeHtml(row.memo||'')}</textarea>`)}`;
    if(libraryEditorType==='mobility')fields=`<div class="libraryFieldGrid">${libraryField('種類',`<select id="lib-type">${['車','自転車','バイク','その他'].map(x=>`<option ${row.type===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('状態',`<select id="lib-condition">${['使用可','点検','修理','手放した'].map(x=>`<option ${row.condition===x?'selected':''}>${x}</option>`).join('')}</select>`)}</div>${libraryField('登録名',`<input id="lib-name" value="${escapeHtml(row.name)}" placeholder="アルファード、ロードバイクなど">`)}<div class="libraryFieldGrid">${libraryField('メーカー',`<input id="lib-maker" value="${escapeHtml(row.maker||'')}">`)}${libraryField('型式・年式',`<input id="lib-model" value="${escapeHtml(row.model||'')}">`)}</div><div class="libraryFieldGrid">${libraryField('色',`<input id="lib-color" value="${escapeHtml(row.color||'')}">`)}${libraryField('保管場所',`<select id="lib-storage">${storageOptions}</select>`)}</div>${libraryField('ナンバー（任意）',`<input id="lib-plate" value="${escapeHtml(row.plate||'')}" placeholder="未入力でも利用できます">`)}<div class="libraryFieldGrid three">${libraryField('車検期限',`<input id="lib-inspection" type="date" value="${escapeHtml(row.inspectionDate||'')}">`)}${libraryField('保険期限',`<input id="lib-insurance" type="date" value="${escapeHtml(row.insuranceDate||'')}">`)}${libraryField('次回整備',`<input id="lib-maintenance-next" type="date" value="${escapeHtml(row.maintenanceNext||'')}">`)}</div>${libraryField('走行距離',`<input id="lib-odometer" inputmode="numeric" value="${escapeHtml(row.odometer||'')}" placeholder="km">`)}${libraryField('メモ',`<textarea id="lib-memo">${escapeHtml(row.memo||'')}</textarea>`)}<label class="libraryCheck"><input id="lib-primary" type="checkbox" ${row.primary?'checked':''}>メインの移動手段</label>`;
    if(libraryEditorType==='pet')fields=`${libraryField('名前',`<input id="lib-name" value="${escapeHtml(row.name)}">`)}<div class="libraryFieldGrid">${libraryField('種類',`<select id="lib-species">${['犬','猫','その他'].map(x=>`<option ${row.species===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('品種',`<input id="lib-breed" value="${escapeHtml(row.breed||'')}">`)}</div><div class="libraryFieldGrid three">${libraryField('性別',`<select id="lib-sex"><option value="">未登録</option>${['オス','メス'].map(x=>`<option ${row.sex===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('年齢',`<input id="lib-age" inputmode="decimal" value="${escapeHtml(row.age||'')}">`)}${libraryField('大きさ',`<input id="lib-size" value="${escapeHtml(row.size||'')}">`)}</div>${libraryField('誕生日',`<input id="lib-birthday" type="date" value="${escapeHtml(row.birthday||'')}">`)}<div class="libraryFieldGrid three">${libraryField('狂犬病 次回',`<input id="lib-rabies-next" type="date" value="${escapeHtml(row.rabiesNext||'')}">`)}${libraryField('混合ワクチン 次回',`<input id="lib-vaccine-next" type="date" value="${escapeHtml(row.vaccineNext||'')}">`)}${libraryField('健康診断 次回',`<input id="lib-health-next" type="date" value="${escapeHtml(row.healthCheckNext||'')}">`)}</div>${libraryField('病院・登録番号',`<input id="lib-vet" value="${escapeHtml(row.vet||'')}" placeholder="かかりつけ・鑑札番号など">`)}${libraryField('首輪・目印',`<input id="lib-collar" value="${escapeHtml(row.collarColor||'')}">`)}${libraryField('性格・特徴',`<textarea id="lib-personality">${escapeHtml(row.personality||'')}</textarea>`)}${libraryField('体調・注意事項',`<textarea id="lib-medical">${escapeHtml(row.medicalNote||'')}</textarea>`)}`;
    if(libraryEditorType==='storage')fields=`${libraryField('保管場所名',`<input id="lib-name" value="${escapeHtml(row.name)}" placeholder="物置、車内、棚Aなど">`)}${libraryField('種類',`<select id="lib-type">${['住居','収納','車両','倉庫','その他'].map(x=>`<option ${row.type===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('メモ',`<textarea id="lib-memo">${escapeHtml(row.memo||'')}</textarea>`)}`;
    const title={gear:'ギア',kit:'セット',custom:'カスタム構成',event:'履歴',mobility:'車・自転車',pet:'ペット',storage:'保管場所'}[libraryEditorType];
    return `<div class="libraryEditorBackdrop"><section class="libraryEditor"><div class="libraryEditorHead"><div><small>${isNew?'NEW ENTRY':'EDIT ENTRY'}</small><h3>${title}${isNew?'を追加':'を編集'}</h3></div><button data-library-editor-close>×</button></div><div class="libraryEditorBody">${fields}</div><div class="libraryEditorActions">${!isNew?`<button class="danger" data-library-delete>削除</button>`:'<span></span>'}<button data-library-editor-close>キャンセル</button><button class="primary" data-library-save>保存</button></div></section></div>`;
  }
  function libraryScrollKey(){return `${libraryTab}:${libraryTab==='gear'?libraryGearView:'main'}`;}
  function rememberLibraryScroll(){const el=document.querySelector('.libraryPageScroll');if(el)libraryScrollPositions[libraryScrollKey()]=el.scrollTop;}
  function restoreLibraryScroll(){const el=document.querySelector('.libraryPageScroll');if(el)el.scrollTop=Number(libraryScrollPositions[libraryScrollKey()]||0);}
  function gearManagerMarkup(plan){
    const c=libraryCounts(),panel=libraryTab==='gear'?gearLibraryPanel(plan):libraryTab==='mobility'?mobilityLibraryPanel():libraryTab==='pets'?petLibraryPanel():libraryTab==='storage'?storageLibraryPanel():transferLibraryPanel();
    return `<div class="libraryPageBackdrop" data-prep-backdrop><section class="libraryPage library02 library03 library04 library05 library06 library07 library08 library09 library10" data-prep-sheet-panel><header class="libraryPageHeader"><div><small>OUTBASE ASSETS</small><h2>資産</h2><p>${c.gearRows}種類・${c.gear}点　補充${c.lowStock}　資産額 ¥${libraryTotalValue().toLocaleString('ja-JP')}</p></div><button class="libraryPageClose" data-close-prep-sheet aria-label="資産を閉じる">×</button></header><div class="libraryPageSticky">${libraryTabsMarkup()}${libraryTab==='gear'?gearModeMarkup():''}</div><div class="libraryPageScroll">${panel}<div class="libraryPageBottomSpace"></div></div>${libraryEditorMarkup()}</section></div>`;
  }
  function prepCommonSheetMarkup(module){
    const state=prepCommonState(module.id),plan=activePlan(),items=state.items;
    return `<div class="recordSheetBackdrop prepSheetBackdrop" data-prep-backdrop><section class="recordSheet prepDetailSheet prepCommonSheet" data-prep-sheet-panel><div class="prepSheetDragZone" data-prep-drag-zone><div class="sheetHandle"></div><small>PREPARATION NOTE</small><h2>${escapeHtml(module.title)}ノート</h2><p>予定を決める前の検討を保存${plan?` ・ ${escapeHtml(plan.title)}へ追加可能`:''}</p></div><div class="commonIdeaList">${items.length?items.map((item,index)=>`<div class="commonIdeaRow"><span>${escapeHtml(item)}</span><div>${plan?`<button data-common-use="${index}">今回に追加</button>`:''}<button data-common-remove="${index}">削除</button></div></div>`).join(''):`<div class="commonIdeaEmpty"><b>まだ保存はありません</b><span>${escapeHtml(module.placeholder||'検討内容を追加してください')}</span></div>`}</div><div class="prepAddRow commonAddRow"><input id="prepCommonNewItem" placeholder="${escapeHtml(module.placeholder||'検討内容を追加')}"><button data-common-add>保存</button></div><label class="prepNoteField"><span>まとめメモ</span><textarea id="prepCommonNote" placeholder="比較したことや判断理由を残す">${escapeHtml(state.note)}</textarea></label><div class="sheetActions"><button data-close-prep-sheet>閉じる</button><button class="sheetPrimary" data-close-prep-sheet>保存して戻る</button></div></section></div>`;
  }
  function prepSheetMarkup(){
    if(!prepSheet)return '';
    const plan=activePlan();
    if(prepSheet==='gear-manager')return gearManagerMarkup(plan);
    if(prepSheet==='common-module'){
      const module=prepCommonModuleDefinitions().find(x=>x.id===prepModuleId);return module?prepCommonSheetMarkup(module):'';
    }
    const module=plan?prepModuleDefinitions(plan).find(x=>x.id===prepModuleId):null;if(!plan||!module)return '';
    const state=prepModuleState(plan,module),items=prepModuleItems(plan,module),done=items.filter((_,i)=>state.checked.includes(i)).length,allDone=items.length&&done===items.length;
    const selectedGear=module.id==='gear'?state.gearIds.map(id=>gearLibrary.find(g=>g.id===id)).filter(Boolean):[];
    const commonCount=module.id==='gear'?0:prepCommonState(module.id).items.length;
    const primaryAction=module.id==='route'?`<button class="prepExternalAction" data-prep-external="route">${I.route}<span><b>Google Mapsで場所と駐車場を確認</b><small>${escapeHtml(plan.location||'目的地は予定詳細で設定')}</small></span><em>›</em></button>`:module.id==='weather'?`<button class="prepExternalAction" data-prep-external="weather">${I.sun}<span><b>最新の天気を確認</b><small>${escapeHtml(plan.location||plan.title)}</small></span><em>›</em></button>`:module.id==='shopping'?`<button class="prepExternalAction" data-prep-copy>${I.cart}<span><b>未完了項目をコピー</b><small>LINEやメモへ貼り付け</small></span><em>›</em></button>`:module.id==='gear'?`<button class="prepExternalAction" data-open-gear-manager>${I.bag}<span><b>共通台帳を開く</b><small>${selectedGear.length?`今回 ${selectedGear.length}点：${selectedGear.slice(0,2).map(g=>g.name).join('・')}${selectedGear.length>2?'ほか':''}`:'所有ギアから今回の持出しを選ぶ'}</small></span><em>›</em></button>`:'';
    const noteAction=module.id!=='gear'?`<button class="prepExternalAction prepNoteAction" data-open-common-module="${module.id}">${module.icon}<span><b>${escapeHtml(module.title)}ノートを開く</b><small>予定前から保存した案 ${commonCount}件</small></span><em>›</em></button>`:'';
    return `<div class="recordSheetBackdrop prepSheetBackdrop" data-prep-backdrop><section class="recordSheet prepDetailSheet" data-prep-sheet-panel><div class="prepSheetDragZone" data-prep-drag-zone><div class="sheetHandle"></div><small>PREPARATION</small><h2>${escapeHtml(module.title)}</h2><p>${escapeHtml(module.sub)} ・ ${done}/${items.length}完了</p></div><div class="prepChecklist">${items.map((item,index)=>`<div class="prepCheckRow ${state.checked.includes(index)?'checked':''}"><button data-prep-check="${index}"><i>${state.checked.includes(index)?'✓':''}</i><span>${escapeHtml(item)}</span></button>${index>=module.tasks.length?`<button class="prepRemoveItem" data-prep-remove="${index}">×</button>`:''}</div>`).join('')}</div><div class="prepAddRow"><input id="prepNewItem" placeholder="この予定だけの項目を追加"><button data-prep-add>追加</button></div>${primaryAction}${noteAction}<label class="prepNoteField"><span>メモ</span><textarea id="prepModuleNote" placeholder="確認したことや当日の注意点">${escapeHtml(state.note||'')}</textarea></label><div class="sheetActions"><button data-close-prep-sheet>閉じる</button><button class="sheetPrimary" data-prep-mark-all>${allDone?'未完了に戻す':'この項目を完了'}</button></div></section></div>`;
  }

  function recordPage(){
    const quick=[
      [I.mic,'話す','長押しで文字起こし','talk'],
      [I.camera,'撮る','位置つき写真','photo'],
      [I.movie,'動画','位置つき動画','video'],
      [I.memo,'メモ','位置つきメモ','memo']
    ];
    const sessionLabel=recordSessionState==='idle'?'散歩開始':recordSessionState==='paused'?'再開':'一時停止';
    const stateText=recordSessionState==='idle'?'開始前':recordSessionState==='paused'?'一時停止中':'記録中';
    const distance=sessionDistanceKm().toFixed(2);
    const elapsed=formatElapsed(elapsedNow());
    const speechPreview=previewMode==='speech';
    const screenState=recordSessionState==='active'?'画面ON':'画面通常';
    const canRecover=recordSessionState==='idle'&&recoverableSession;
    const idleMode=recordSessionState==='idle';
    return `<section class="page ${active==='record'?'active':''} ${canRecover?'hasRecoverable':''}" id="page-record">
      <section class="recordHero">
        <div class="recordHeroTitle"><small>RECORD</small><h1>記録</h1></div>
        <div class="recordState"><i class="statusDot ${recordSessionState}"></i><span>${stateText}</span></div>
        <div class="recordHeroSide"><span>同伴 コタ</span></div>
      </section>
      ${canRecover?`<section class="resumeSessionBar"><div><small>直前の散歩を終了しました</small><b>${formatElapsed(Number(recoverableSession.elapsedMs||0))}・${Number(recoverableSession.distanceKm||0).toFixed(2)} km</b></div><button data-resume-session>散歩を再開</button></section>`:''}
      <section class="recordMapCard ${idleMode?'idleMode':''}">
        <div class="mapHead">
          <div><h2>散歩MAP</h2><p><i class="statusDot"></i><span id="gpsStatusText">${gpsStatus}</span>&nbsp; / &nbsp;端末保存&nbsp; / &nbsp;${screenState}</p></div>
          <div class="mapHeadActions">${recordSessionState!=='idle'?'<button class="endButton" data-open-sheet="end">終了</button>':''}<button data-record-action="map-mode">${mapMode===0?'記録を隠す':'記録を表示'}</button></div>
        </div>
        <div class="mapStage">
          <div id="recordLiveMap" class="recordLiveMap" role="application" aria-label="現在地に追従する散歩地図">
            <div class="mapTilePane"></div>
            <svg class="mapTrackSvg" aria-hidden="true"></svg>
            <div class="mapMarkerPane"></div>
            <div class="mapZoom"><button data-map-zoom="in" aria-label="拡大">＋</button><button data-map-zoom="out" aria-label="縮小">−</button></div>
            <div class="mapAttribution">© OpenStreetMap</div>
          </div>
          <div class="mapModeBadge">${mapMode===0?'現在地＋軌跡＋場所記録':'現在地のみ'}</div>
          ${activeParking()?`<button class="mapParkingChip" data-open-parking-recall>${I.car}<span><small>駐車位置</small><b>${escapeHtml(parkingSummary(activeParking()))}</b></span></button>`:''}
          <div id="speechLive" class="speechLive ${speechPreview?'show':''}">
            <div class="speechPulse"><i></i></div><div><small>リアルタイム文字起こし</small><p id="speechLiveText">${speechPreview?'立体駐車場3階、青エリア、Cの28番に停めた':''}</p></div>
          </div>
          <div class="mapControl">
            <div class="stats statsTwo">
              <div><span>距離</span><b id="distanceValue">${distance}<small>km</small></b></div>
              <div><span>経過時間</span><b id="elapsedValue">${elapsed}</b></div>
            </div>
            <div class="mapButtons">
              <button class="gold sessionButton" data-record-action="session">${sessionLabel}</button>
              <button data-record-action="current">現在地</button>
              <button data-record-action="pin">${idleMode?'駐車位置を記録':'場所を記録'}</button>
              <button data-record-action="google-map">Google<br>Map</button>
            </div>
          </div>
        </div>
        ${idleMode?`<div class="quickIdleNotice"><div>${I.record}</div><span><b>散歩を開始するとクイック記録が使えます</b><small>駐車位置は開始前でも保存できます</small></span></div>`:`<div class="quickArea"><h3>クイック記録 <span>すべて日時・位置つきで保存</span></h3><div>${quick.map(q=>`<button data-record-action="${q[3]}" class="quick-${q[3]}">${q[0]}<b>${q[1]}</b><small>${q[2]}</small></button>`).join('')}</div></div>`}
      </section>
    </section>`;
  }

  function memoryFeature(icon,title,sub,body){return `<article class="memoryFeature"><div class="memoryTop"><div>${icon}</div><span><h3>${title}</h3><p>${sub}</p></span><b>›</b></div><p class="memoryBody">${body}</p></article>`;}


  function memoryPage(){
    const rows=[...savedRecords]
      .filter(record=>record&&record.createdAt)
      .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));

    const groups=[];
    const byKey=new Map();

    rows.forEach(record=>{
      const date=new Date(Number(record.createdAt||Date.now()));
      const day=date.toISOString().slice(0,10);
      const sessionKey=record.sessionId||`${record.target||'未確認'}:${day}`;
      if(!byKey.has(sessionKey)){
        const group={
          id:sessionKey,
          title:record.target||'未確認の記録',
          date:day,
          sessionId:record.sessionId||'',
          records:[],
          kinds:{photo:0,video:0,speech:0,memo:0,pin:0}
        };
        byKey.set(sessionKey,group);
        groups.push(group);
      }
      const group=byKey.get(sessionKey);
      group.records.push(record);
      if(Object.prototype.hasOwnProperty.call(group.kinds,record.kind)){
        group.kinds[record.kind]+=1;
      }
    });

    const total=rows.length;
    const photoCount=rows.filter(x=>x.kind==='photo').length;
    const speechCount=rows.filter(x=>x.kind==='speech').length;
    const memoCount=rows.filter(x=>x.kind==='memo').length;
    const pinCount=rows.filter(x=>x.kind==='pin').length;

    const recent=groups.slice(0,20);

    return `<section class="page ${active==='memory'?'active':''}" id="page-memory">
      <section class="memoryPanel">
        <img class="memoryArt" src="assets/memory_hero_art.png" alt="">
        <div class="memoryIntro">
          <small>MEMORIES</small>
          <h1>思い出</h1>
          <p>帰宅後の整理・レビュー・次回改善。</p>
        </div>
        <div class="memoryGrid">
          ${memoryFeature(I.photo,'記録一覧',`${total}件を保存`,`写真${photoCount}・音声${speechCount}・メモ${memoCount}をまとめて確認できます。`)}
          ${memoryFeature(I.cart,'次回改善','買い足し・反省','持ち物の見直しや反省点を整理して次に活かします。')}
          ${memoryFeature(I.pin,'場所メモ',`${pinCount}件を保存`,'駐車場・トイレ・日陰など、役立った場所を確認できます。')}
          ${memoryFeature(I.link,'関連付け',`${groups.length}件の思い出`,'同じ散歩や予定の記録をひとつにまとめて表示します。')}
        </div>
      </section>
      <section class="memoryList">
        <div class="memoryListHead">
          <h2>保存された思い出</h2>
          <span>${groups.length}件</span>
        </div>
        ${recent.length?recent.map(group=>{
          const dateLabel=group.date.replaceAll('-','.');
          const summary=[
            group.kinds.photo?`写真 ${group.kinds.photo}`:'',
            group.kinds.video?`動画 ${group.kinds.video}`:'',
            group.kinds.speech?`音声 ${group.kinds.speech}`:'',
            group.kinds.memo?`メモ ${group.kinds.memo}`:'',
            group.kinds.pin?`場所 ${group.kinds.pin}`:''
          ].filter(Boolean).join('・')||`記録 ${group.records.length}件`;
          const imageRecord=group.records.find(x=>x.kind==='photo'&&x.previewUrl);
          return `<article class="memoryRow memoryDataRow" data-memory-session="${escapeHtml(group.id)}">
            ${imageRecord?`<img src="${escapeHtml(imageRecord.previewUrl)}" alt="">`:`<div class="memoryFallback">${I.photo}</div>`}
            <i></i>
            <div>
              <b>${escapeHtml(group.title)}</b>
              <p>${escapeHtml(dateLabel)} <span>${escapeHtml(summary)}</span></p>
            </div>
            <em>${group.records.length}件</em>
            <strong>›</strong>
          </article>`;
        }).join(''):`<div class="memoryEmpty">
          <b>まだ思い出はありません</b>
          <span>記録を保存すると、ここへ自動でまとまります。</span>
        </div>`}
      </section>
    </section>`;
  }

  function sheetMarkup(){
    if(!recordSheet) return '';
    if(recordSheet==='memo') return `<div class="recordSheetBackdrop"><section class="recordSheet memoSheet"><div class="sheetHandle"></div><small>クイック記録</small><h2>${editingRecordId?'文字起こしを修正':'メモを残す'}</h2><p>保存時の日時と現在位置を、${recordTarget}へ一緒に保存します。</p><textarea id="recordMemo" placeholder="今の気づきや、あとで確認したいこと">${escapeHtml(memoDraft)}</textarea><div class="locationSaveNotice">${I.pin}<span>現在位置を自動で添付</span></div><div class="sheetActions"><button data-close-sheet>記録へ戻る</button><button class="sheetPrimary" data-save-memo>${editingRecordId?'更新':'保存'}</button></div></section></div>`;
    if(recordSheet==='pin'){
      const pin=savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1]||{};
      const categories=[['water','水飲み場'],['toilet','トイレ'],['parking','駐車場'],['vending','自販機'],['bench','ベンチ'],['shade','日陰・休憩'],['entrance','出入口'],['caution','注意場所'],['other','その他']];
      const category=pin.category||'unclassified';
      const parking=pin.parking||{};
      return `<div class="recordSheetBackdrop"><section class="recordSheet pinSheet"><div class="sheetHandle"></div><small>PLACE RECORD</small><h2>この場所を記録</h2><p>場所は保存済みです。必要なら種類や詳しい目印を追加します。</p><div class="pinCategoryGrid">${categories.map(c=>`<button class="${category===c[0]?'selected':''}" data-pin-category="${c[0]}">${c[1]}</button>`).join('')}</div><div id="parkingFields" class="parkingFields ${category==='parking'?'show':''}"><div class="parkingTitle">入力しなくてOK。音声か写真で残します</div><div class="parkingAssistButtons"><button data-parking-speech>${I.mic}<span><b>長押しで話す</b><small>階・色・柱・番号を自動整理</small></span></button><button data-parking-photo>${I.camera}<span><b>表示を撮る</b><small>案内板・柱・区画を保存</small></span></button></div><div class="parkingAutoCard"><small>自動整理した駐車情報</small><b id="parkingAutoSummary">${escapeHtml([parking.floor,parking.area,parking.number].filter(Boolean).join('・')||'まだ情報はありません')}</b>${parking.speechText?`<p>${escapeHtml(parking.speechText)}</p>`:''}${parking.photoName?`<p>写真：${escapeHtml(parking.photoName)}${parking.ocrState==='reading'?'（文字を読取中）':parking.ocrText?'（自動読取済み）':''}</p>`:''}${parking.ocrText?`<p>読取：${escapeHtml(parking.ocrText)}</p>`:''}</div><details class="parkingManual"><summary>必要なときだけ手入力で補足</summary><div class="parkingGrid"><label>階<input id="parkingFloor" value="${escapeHtml(parking.floor||'')}" placeholder="例：3階"></label><label>エリア・柱<input id="parkingArea" value="${escapeHtml(parking.area||'')}" placeholder="例：青・C柱"></label><label>番号<input id="parkingNumber" value="${escapeHtml(parking.number||'')}" placeholder="例：28番"></label></div></details></div><label class="pinNoteLabel">場所メモ<textarea id="pinNote" placeholder="入口、目印、利用時間、注意点など">${escapeHtml(pin.note||'')}</textarea></label><div class="pinSavedPosition">${I.pin}<span>${pin.lat!=null?`位置を自動保存済み${pin.accuracy?`　±${pin.accuracy}m`:''}`:'位置はOUTBASEが自動で紐付けます'}</span></div><div class="sheetActions"><button data-close-sheet>未分類のまま閉じる</button><button class="sheetPrimary" data-save-pin-detail>詳細を保存</button></div></section></div>`;
    }
    if(recordSheet==='parking-recall'){
      const pin=activeParking();if(!pin){recordSheet='';return '';}
      const p=pin.parking||{};
      return `<div class="recordSheetBackdrop"><section class="recordSheet parkingRecallSheet"><div class="sheetHandle"></div><small>PARKING POSITION</small><h2>駐車位置</h2><div class="parkingRecallHero">${I.car}<div><small>${new Date(pin.time||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} に保存</small><b>${escapeHtml(parkingSummary(pin))}</b><p>${escapeHtml(pin.note||'位置と時刻を保存しています')}</p></div></div><div class="parkingRecallEvidence"><div>${I.pin}<span><small>位置</small><b>${pin.lat!=null?`${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}`:'自動補完中'}</b></span></div><div>${I.mic}<span><small>音声</small><b>${p.speechText?'保存済み':'なし'}</b></span></div><div>${I.camera}<span><small>写真</small><b>${p.photoName?'保存済み':'なし'}</b></span></div></div><div class="parkingRecallActions"><button data-parking-action="map">${I.pin}<span>地図で確認</span></button><button class="primary" data-parking-action="route">${I.route}<span>ここへ戻る</span></button><button data-parking-action="photo">${I.camera}<span>写真を見る</span></button><button data-parking-action="note">${I.memo}<span>音声・メモ</span></button></div><button class="parkingArrived" data-parking-action="arrived">車に戻ったので表示を終了</button><div class="sheetActions single"><button data-close-sheet>閉じる</button></div></section></div>`;
    }
    if(recordSheet==='end') return `<div class="recordSheetBackdrop"><section class="recordSheet endSheet"><div class="sheetHandle"></div><small>SESSION SUMMARY</small><h2>散歩記録を終了しますか？</h2><div class="summaryName"><b>${recordTarget}</b><span>${currentPosition?'現在地を保存済み':'位置情報を確認中'}</span></div><div class="summaryGrid summaryGridTwo"><div><small>経過時間</small><b>${formatElapsed(elapsedNow())}</b></div><div><small>距離</small><b>${sessionDistanceKm().toFixed(2)} km</b></div></div><div class="syncSummary"><i></i>端末保存済み・同期待ち 0件</div><div class="endActionStack"><button class="sheetPrimary" data-finish-session>終了して保存</button><button data-close-sheet>散歩に戻る</button><button class="sheetDanger" data-discard-session-request>この散歩を破棄</button></div></section></div>`;
    if(recordSheet==='discard-confirm') return `<div class="recordSheetBackdrop"><section class="recordSheet discardSheet"><div class="sheetHandle"></div><small>DISCARD SESSION</small><h2>この散歩を破棄しますか？</h2><div class="discardWarning"><b>元に戻せません</b><p>${escapeHtml(destructiveSummary())}</p><small>駐車位置は車に戻るため残します。</small></div><div class="sheetActions"><button data-open-sheet="end">戻る</button><button class="sheetDangerPrimary" data-discard-session-confirm>破棄する</button></div></section></div>`;
    if(recordSheet==='target') return `<div class="recordSheetBackdrop"><section class="recordSheet targetSheet"><div class="sheetHandle"></div><small>RECORD TARGET</small><h2>記録先を変更</h2><p>表示中プランとは別に、保存先だけを変更します。</p><button class="targetOption selected" data-record-target="コタ通常散歩"><span><b>コタ通常散歩</b><small>散歩セッション</small></span><em>選択中</em></button><button class="targetOption" data-record-target="手賀沼ドライブ散歩 ＞ コタ場内散歩"><span><b>手賀沼ドライブ散歩</b><small>コタ場内散歩へ保存</small></span><em>選ぶ</em></button><button class="targetOption" data-record-target="未確認箱へ仮保存"><span><b>未確認箱へ仮保存</b><small>あとで関連付け</small></span><em>選ぶ</em></button><div class="sheetActions single"><button data-close-sheet>閉じる</button></div></section></div>`;
    return `<div class="recordSheetBackdrop"><section class="recordSheet detailSheet"><div class="sheetHandle"></div><small>RECORD DETAIL</small><h2>直近の記録</h2><div class="detailPreview">${I.camera}<span><b>写真</b><small>日時・位置つきで端末保存</small></span></div><dl><div><dt>記録先</dt><dd>${recordTarget}</dd></div><div><dt>GPS精度</dt><dd>${currentPosition?`± ${currentPosition.accuracy||'-'} m`:'位置は自動保存'}</dd></div><div><dt>同期状態</dt><dd>端末保存済み</dd></div><div><dt>公開範囲</dt><dd>非公開</dd></div></dl><div class="detailLinks"><button data-open-sheet="target">記録先を変更</button><button>テキスト修正</button><button>削除候補へ</button></div><div class="sheetActions single"><button data-close-sheet>閉じる</button></div></section></div>`;
  }

  function showRecordToast(message){
    let toast=document.getElementById('recordToast');
    if(!toast){toast=document.createElement('div');toast.id='recordToast';toast.className='recordToast';document.body.appendChild(toast);}
    toast.textContent=message;toast.classList.add('show');
    clearTimeout(showRecordToast.timer);showRecordToast.timer=setTimeout(()=>toast.classList.remove('show'),2100);
  }

  function persistRecordState(){
    localStorage.setItem('outbase_record_session_state',recordSessionState);
    localStorage.setItem('outbase_record_count',String(recordCount));
    localStorage.setItem('outbase_record_target',recordTarget);
    localStorage.setItem('outbase_record_map_mode',String(mapMode));
    localStorage.setItem('outbase_record_elapsed_ms',String(elapsedMs));
    localStorage.setItem('outbase_record_active_started_at',String(activeStartedAt||0));
    localStorage.setItem('outbase_record_track_points',JSON.stringify(trackPoints));
    localStorage.setItem('outbase_record_saved_pins',JSON.stringify(savedPins));
    localStorage.setItem('outbase_record_current_position',JSON.stringify(currentPosition));
    localStorage.setItem('outbase_record_map_zoom',String(mapZoom));
    localStorage.setItem('outbase_record_saved_records',JSON.stringify(savedRecords.slice(-500)));
    if(currentSessionId) localStorage.setItem('outbase_record_session_id',currentSessionId);else localStorage.removeItem('outbase_record_session_id');
    if(sessionStartedAt) localStorage.setItem('outbase_record_session_started_at',String(sessionStartedAt));else localStorage.removeItem('outbase_record_session_started_at');
    if(resumeBreakPending) localStorage.setItem('outbase_record_resume_break_pending','1');else localStorage.removeItem('outbase_record_resume_break_pending');
    if(recoverableSession) localStorage.setItem('outbase_record_recoverable_session',JSON.stringify(recoverableSession));else localStorage.removeItem('outbase_record_recoverable_session');
    if(activeParkingId) localStorage.setItem('outbase_active_parking_id',activeParkingId);else localStorage.removeItem('outbase_active_parking_id');
  }

  function elapsedNow(){if(recordSessionState==='idle') return 0;return elapsedMs+(recordSessionState==='active'&&activeStartedAt?Date.now()-activeStartedAt:0);}
  function formatElapsed(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const h=Math.floor(total/3600);
    const m=Math.floor((total%3600)/60);
    const s=total%60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function haversineKm(a,b){
    const R=6371,toRad=v=>v*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
    const q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(q));
  }
  function sessionDistanceKm(){if(recordSessionState==='idle') return 0;let d=0;for(let i=1;i<trackPoints.length;i++){if(trackPoints[i].breakBefore) continue;d+=haversineKm(trackPoints[i-1],trackPoints[i]);}return d;}
  function updateMetrics(){
    const distance=document.getElementById('distanceValue');if(distance) distance.innerHTML=`${sessionDistanceKm().toFixed(2)}<small>km</small>`;
    const elapsed=document.getElementById('elapsedValue');if(elapsed) elapsed.textContent=formatElapsed(elapsedNow());
    const status=document.getElementById('gpsStatusText');if(status) status.textContent=gpsStatus;
  }
  function startMetricTimer(){clearInterval(timerId);timerId=setInterval(updateMetrics,1000);updateMetrics();}

  async function keepScreenAwake(){
    try{if('wakeLock' in navigator&&recordSessionState==='active') wakeLock=await navigator.wakeLock.request('screen');}catch(_e){}
  }
  async function releaseScreenAwake(){
    try{if(wakeLock){await wakeLock.release();wakeLock=null;}}catch(_e){wakeLock=null;}
  }

  function openRecordDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(new Error('IndexedDB unavailable'));return;}
      const req=indexedDB.open('outbase_db',10);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('fieldRecords')) db.createObjectStore('fieldRecords',{keyPath:'id'});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  async function putRecordDB(record,blob){
    try{const db=await openRecordDB();await new Promise((resolve,reject)=>{const tx=db.transaction('fieldRecords','readwrite');tx.objectStore('fieldRecords').put({...record,blob:blob||null});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(_e){}
  }
  async function deleteRecordDB(id){
    try{const db=await openRecordDB();await new Promise((resolve,reject)=>{const tx=db.transaction('fieldRecords','readwrite');tx.objectStore('fieldRecords').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(_e){}
  }
  async function updateRecordLocationDB(id,location){
    try{
      const db=await openRecordDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('fieldRecords','readwrite'),store=tx.objectStore('fieldRecords'),req=store.get(id);
        req.onsuccess=()=>{const row=req.result;if(row) store.put({...row,location});};
        req.onerror=()=>reject(req.error);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
      db.close();
    }catch(_e){}
  }
  function saveRecord(kind,data={},location=locationSnapshot(),blob=null){
    const createdAt=Number(data.createdAt||Date.now());
    const resolvedLocation=location&&location.lat!=null?location:locationSnapshot(createdAt);
    const explicitSession=Object.prototype.hasOwnProperty.call(data,'sessionId')?data.sessionId:(recordSessionState==='idle'?null:currentSessionId);
    const record={...data,id:data.id||newId(kind),kind,createdAt,target:recordTarget,sessionState:recordSessionState,sessionId:explicitSession,location:resolvedLocation};
    const i=savedRecords.findIndex(x=>x.id===record.id);if(i>=0) savedRecords[i]=record;else savedRecords.push(record);
    recordCount+=i>=0?0:1;persistRecordState();putRecordDB(record,blob);return record;
  }
  function showSpeechReview(record){
    let box=document.getElementById('speechReview');if(box) box.remove();
    box=document.createElement('div');box.id='speechReview';box.className='speechReview';
    box.innerHTML=`<div><small>文字起こしを保存しました</small><p></p></div><button data-speech-edit>修正</button><button data-speech-cancel>取消</button>`;
    box.querySelector('p').textContent=record.text;document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add('show'));
    box.querySelector('[data-speech-edit]').addEventListener('click',()=>{editingRecordId=record.id;memoDraft=record.text;recordSheet='memo';box.remove();render();});
    box.querySelector('[data-speech-cancel]').addEventListener('click',()=>{savedRecords=savedRecords.filter(x=>x.id!==record.id);recordCount=Math.max(0,recordCount-1);persistRecordState();deleteRecordDB(record.id);box.remove();showRecordToast('文字起こしを取り消しました');});
    clearTimeout(showSpeechReview.timer);showSpeechReview.timer=setTimeout(()=>box.remove(),7000);
  }
  function openCapture(kind){
    const captureLocation=locationSnapshot();
    const input=document.createElement('input');input.type='file';input.accept=kind==='photo'?'image/*':'video/*';input.capture='environment';
    input.addEventListener('change',()=>{if(input.files&&input.files.length){const file=input.files[0];saveRecord(kind,{name:file.name,type:file.type,size:file.size},captureLocation,file);showRecordToast(`${kind==='photo'?'写真':'動画'}を位置つきで保存しました`);}},{once:true});input.click();
  }
  function speechOverlay(show,text='',status='長押し中はリアルタイム表示'){
    const box=document.getElementById('speechLive'),copy=document.getElementById('speechLiveText');if(!box||!copy) return;
    box.classList.toggle('show',show);box.querySelector('small').textContent=status;copy.textContent=text||'話してください…';
  }
  function beginSpeechHold(el){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){showRecordToast('このブラウザは音声文字起こしに対応していません');return;}
    speechActive=true;speechTranscript='';speechStartLocation=locationSnapshot();speechButton=el;el.classList.add('holding');el.querySelector('small').textContent='話している間だけ記録';speechOverlay(true,'話してください…');
    const rec=new Recognition();speechRecognition=rec;rec.lang='ja-JP';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
    rec.onresult=e=>{let finalText='',interim='';for(let i=0;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal) finalText+=t;else interim+=t;}speechTranscript=(finalText+interim).trim();speechOverlay(true,speechTranscript||'話してください…');};
    rec.onerror=e=>{if(e.error!=='aborted') showRecordToast(e.error==='not-allowed'?'マイクの使用を許可してください':'音声を確認できませんでした');};
    rec.onend=()=>{const text=speechTranscript.trim();speechActive=false;if(speechButton){speechButton.classList.remove('holding');const small=speechButton.querySelector('small');if(small) small.textContent='長押しで文字起こし';}speechButton=null;speechRecognition=null;speechOverlay(false);if(text){const record=saveRecord('speech',{text},speechStartLocation);showSpeechReview(record);}else showRecordToast('音声は保存されませんでした');};
    try{rec.start();}catch(_e){speechActive=false;el.classList.remove('holding');speechOverlay(false);}
  }
  function stopSpeechHold(){clearTimeout(speechHoldTimer);speechHoldTimer=null;if(speechActive&&speechRecognition){try{speechRecognition.stop();}catch(_e){}}}

  function currentPendingPin(){return savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1]||null;}
  function refreshParkingAssist(pin,text=''){
    if(!pin) return;pin.category='parking';pin.label='駐車場';pin.parking=pin.parking||{};
    if(text){const parsed=parseParkingText(text);pin.parking={...pin.parking,...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v)),speechText:text};pin.note=pin.note||text;}
    activeParkingId=pin.id;persistRecordState();
  }
  function beginParkingSpeechHold(el){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){showRecordToast('このブラウザは音声文字起こしに対応していません');return;}
    const pin=currentPendingPin();if(!pin) return;
    parkingSpeechActive=true;el.classList.add('holding');const rec=new Recognition();parkingSpeechRecognition=rec;rec.lang='ja-JP';rec.continuous=true;rec.interimResults=true;let text='';
    const small=el.querySelector('small');if(small) small.textContent='話している内容を整理中';
    rec.onresult=e=>{let finalText='',interim='';for(let i=0;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal) finalText+=t;else interim+=t;}text=(finalText+interim).trim();const summary=document.getElementById('parkingAutoSummary');if(summary) summary.textContent=text||'話してください…';};
    rec.onerror=e=>{if(e.error!=='aborted') showRecordToast(e.error==='not-allowed'?'マイクの使用を許可してください':'音声を確認できませんでした');};
    rec.onend=()=>{parkingSpeechActive=false;parkingSpeechRecognition=null;el.classList.remove('holding');if(text){refreshParkingAssist(pin,text);saveRecord('speech',{text,linkedPinId:pin.id,parkingAssist:true,keepWithParking:true,sessionId:null},locationSnapshot());render();setTimeout(()=>showRecordToast(`駐車情報を「${parkingSummary(pin)}」として整理しました`),0);}else{if(small) small.textContent='階・色・柱・番号を自動整理';showRecordToast('音声は保存されませんでした');}};
    try{rec.start();}catch(_e){parkingSpeechActive=false;el.classList.remove('holding');}
  }
  function stopParkingSpeechHold(){clearTimeout(parkingSpeechHoldTimer);parkingSpeechHoldTimer=null;if(parkingSpeechActive&&parkingSpeechRecognition){try{parkingSpeechRecognition.stop();}catch(_e){}}}
  async function extractParkingPhotoText(file){
    try{
      if('TextDetector' in window&&'createImageBitmap' in window){const bitmap=await createImageBitmap(file),rows=await new TextDetector().detect(bitmap);bitmap.close?.();const text=rows.map(x=>x.rawValue||'').join(' ').trim();if(text) return text;}
    }catch(_e){}
    try{
      if(window.Tesseract&&window.Tesseract.createWorker){const worker=await window.Tesseract.createWorker('jpn+eng');const result=await worker.recognize(file);await worker.terminate();return String(result?.data?.text||'').replace(/\s+/g,' ').trim();}
    }catch(_e){}
    return '';
  }
  function captureParkingPhoto(){
    const pin=currentPendingPin();if(!pin) return;const input=document.createElement('input');input.type='file';input.accept='image/*';input.capture='environment';
    input.addEventListener('change',async()=>{if(!(input.files&&input.files.length)) return;const file=input.files[0],loc=locationSnapshot();const rec=saveRecord('photo',{name:file.name,type:file.type,size:file.size,linkedPinId:pin.id,parkingAssist:true,keepWithParking:true,sessionId:null},loc,file);pin.parking=pin.parking||{};pin.parking.photoRecordId=rec.id;pin.parking.photoName=file.name;pin.parking.photoSavedAt=Date.now();pin.parking.ocrState='reading';refreshParkingAssist(pin);persistRecordState();render();setTimeout(()=>showRecordToast('写真を保存しました。表示の文字を自動で読んでいます'),0);const text=await extractParkingPhotoText(file);pin.parking.ocrState=text?'done':'unreadable';if(text){pin.parking.ocrText=text;const parsed=parseParkingText(text);pin.parking={...pin.parking,...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v))};pin.note=pin.note||text;}refreshParkingAssist(pin);persistRecordState();render();setTimeout(()=>showRecordToast(text?`写真から「${parkingSummary(pin)}」を自動補完しました`:'文字を読めませんでしたが、写真は保存済みです'),0);},{once:true});input.click();
  }
  async function showParkingPhoto(pin){
    const id=pin?.parking?.photoRecordId;if(!id){showRecordToast('駐車場の写真はまだありません');return;}
    try{const db=await openRecordDB();const row=await new Promise((resolve,reject)=>{const tx=db.transaction('fieldRecords','readonly'),r=tx.objectStore('fieldRecords').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();if(!row?.blob){showRecordToast('写真データを確認できません');return;}const url=URL.createObjectURL(row.blob),overlay=document.createElement('div');overlay.className='parkingPhotoOverlay';overlay.innerHTML=`<button aria-label="閉じる">×</button><img alt="駐車位置の写真">`;overlay.querySelector('img').src=url;overlay.querySelector('button').onclick=()=>{URL.revokeObjectURL(url);overlay.remove();};overlay.onclick=e=>{if(e.target===overlay){URL.revokeObjectURL(url);overlay.remove();}};document.body.appendChild(overlay);}catch(_e){showRecordToast('写真を開けませんでした');}
  }

  function projectPoint(lat,lng,zoom){
    const size=256*Math.pow(2,zoom),sin=Math.sin(lat*Math.PI/180);
    return {x:(lng+180)/360*size,y:(0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*size};
  }
  function unprojectPoint(x,y,zoom){
    const size=256*Math.pow(2,zoom),lng=x/size*360-180,n=Math.PI-2*Math.PI*y/size;
    return {lat:180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),lng};
  }
  function pointOnMap(pos,box){
    const c=projectPoint(mapCenter.lat,mapCenter.lng,mapZoom),p=projectPoint(pos.lat,pos.lng,mapZoom);
    return {x:box.width/2+(p.x-c.x),y:box.height/2+(p.y-c.y)};
  }
  function renderLiveMap(){
    const map=document.getElementById('recordLiveMap');if(!map) return;
    const tilePane=map.querySelector('.mapTilePane'),markerPane=map.querySelector('.mapMarkerPane'),svg=map.querySelector('.mapTrackSvg');
    const box={width:map.clientWidth||380,height:map.clientHeight||292},center=projectPoint(mapCenter.lat,mapCenter.lng,mapZoom),n=Math.pow(2,mapZoom);
    const left=center.x-box.width/2,top=center.y-box.height/2;
    const minX=Math.floor(left/256),maxX=Math.floor((left+box.width)/256),minY=Math.floor(top/256),maxY=Math.floor((top+box.height)/256);
    let tiles='';
    for(let ty=minY;ty<=maxY;ty++) for(let tx=minX;tx<=maxX;tx++){
      if(ty<0||ty>=n) continue;const wrapped=((tx%n)+n)%n;
      tiles+=`<img class="mapTile" src="https://tile.openstreetmap.org/${mapZoom}/${wrapped}/${ty}.png" alt="" style="left:${Math.round(tx*256-left)}px;top:${Math.round(ty*256-top)}px" onerror="this.style.opacity=0">`;
    }
    tilePane.innerHTML=tiles;
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    if(mapMode===0&&trackPoints.length>1){
      const segments=[];let segment=[];
      for(const p of trackPoints){if(p.breakBefore&&segment.length){segments.push(segment);segment=[];}segment.push(p);}
      if(segment.length) segments.push(segment);
      svg.innerHTML=segments.filter(seg=>seg.length>1).map(seg=>`<polyline points="${seg.map(p=>{const q=pointOnMap(p,box);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;}).join(' ')}"></polyline>`).join('');
    }else svg.innerHTML='';
    let marks='';
    if(mapMode===0) savedPins.forEach((p,i)=>{if(p.lat==null||p.lng==null) return;const q=pointOnMap(p,box);marks+=`<button class="livePin" data-live-pin="${i}" style="left:${q.x}px;top:${q.y}px" aria-label="保存したピン">${I.pin}</button>`;});
    if(currentPosition){const q=pointOnMap(currentPosition,box);marks+=`<div class="liveCurrent" style="left:${q.x}px;top:${q.y}px"><i></i></div>`;}
    markerPane.innerHTML=marks;
    markerPane.querySelectorAll('[data-live-pin]').forEach(el=>el.addEventListener('click',()=>{recordSheet='detail';render();}));
  }
  function bindMapGestures(){
    const map=document.getElementById('recordLiveMap');if(!map||map.dataset.bound) return;map.dataset.bound='1';
    let drag=null;
    map.addEventListener('pointerdown',e=>{if(e.target.closest('button')) return;map.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,c:projectPoint(mapCenter.lat,mapCenter.lng,mapZoom)};mapFollow=false;});
    map.addEventListener('pointermove',e=>{if(!drag) return;const p=unprojectPoint(drag.c.x-(e.clientX-drag.x),drag.c.y-(e.clientY-drag.y),mapZoom);mapCenter=p;renderLiveMap();});
    map.addEventListener('pointerup',()=>{drag=null;});map.addEventListener('pointercancel',()=>{drag=null;});
    map.querySelectorAll('[data-map-zoom]').forEach(btn=>btn.addEventListener('click',()=>{mapZoom=Math.max(13,Math.min(19,mapZoom+(btn.dataset.mapZoom==='in'?1:-1)));persistRecordState();renderLiveMap();}));
  }
  function centerMapOnCurrent(){
    mapFollow=true;
    if(currentPosition){mapCenter={lat:currentPosition.lat,lng:currentPosition.lng};renderLiveMap();showRecordToast('現在地を中央に表示しました');return;}
    requestOnePosition(true);
  }
  function autoAttachMissingLocations(){
    let changed=false;
    for(const pin of savedPins){
      if(pin.lat!=null&&pin.lng!=null) continue;
      const resolved=nearestTrackPosition(Number(pin.time||Date.now()));
      if(!resolved) continue;
      pin.lat=resolved.lat;pin.lng=resolved.lng;pin.accuracy=resolved.accuracy||null;pin.locationSource='auto';changed=true;
    }
    for(const record of savedRecords){
      if(record.location&&record.location.lat!=null) continue;
      const resolved=nearestTrackPosition(Number(record.createdAt||Date.now()));
      if(!resolved) continue;
      record.location={lat:resolved.lat,lng:resolved.lng,accuracy:resolved.accuracy||null,time:resolved.time||record.createdAt,pending:false,source:'auto'};
      updateRecordLocationDB(record.id,record.location);changed=true;
    }
    if(changed) persistRecordState();
  }
  function onPosition(position){
    const next={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:Math.round(position.coords.accuracy||0),time:position.timestamp||Date.now()};
    currentPosition=next;
    gpsStatus=recordSessionState==='active'
      ?`GPS記録中 ±${next.accuracy}m`
      :recordSessionState==='paused'
        ?`一時停止中・現在地取得済み ±${next.accuracy}m`
        :`現在地取得済み ±${next.accuracy}m`;
    if(recordSessionState==='active'){
      if(resumeBreakPending){
        trackPoints.push({...next,breakBefore:true});
        resumeBreakPending=false;
      }else{
        const last=trackPoints[trackPoints.length-1],jump=last?haversineKm(last,next):0;
        if(!last||(jump>=0.002&&jump<=1)) trackPoints.push(next);
      }
      if(trackPoints.length>5000) trackPoints=trackPoints.slice(-5000);
    }
    autoAttachMissingLocations();
    if(mapFollow) mapCenter={lat:next.lat,lng:next.lng};
    persistRecordState();updateMetrics();renderLiveMap();
  }
  function onPositionError(error){
    gpsStatus=error&&error.code===1
      ?'位置情報の許可が必要です'
      :recordSessionState==='active'?'GPSを再取得しています':recordSessionState==='paused'?'一時停止中':'現在地を再取得しています';
    updateMetrics();
  }
  function startGeoWatch(){
    if(geoWatchId!==null||recordSessionState!=='active'||!navigator.geolocation) return;
    gpsStatus='GPSを取得しています';updateMetrics();
    geoWatchId=navigator.geolocation.watchPosition(onPosition,onPositionError,{enableHighAccuracy:true,maximumAge:2000,timeout:15000});
  }
  function stopGeoWatch(){if(geoWatchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(geoWatchId);geoWatchId=null;}}
  function requestOnePosition(centerAfter=false){
    if(!navigator.geolocation){showRecordToast('この端末では現在地を取得できません');return;}
    gpsStatus='現在地を確認しています';lastOneShotRequestAt=Date.now();updateMetrics();
    navigator.geolocation.getCurrentPosition(p=>{onPosition(p);if(centerAfter){mapFollow=true;mapCenter={lat:currentPosition.lat,lng:currentPosition.lng};renderLiveMap();showRecordToast('現在地を中央に表示しました');}},e=>{onPositionError(e);showRecordToast('位置情報を許可してください');},{enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }
  function addCurrentPin(){
    const createdAt=Date.now(),loc=locationSnapshot(createdAt),parkingOnly=recordSessionState==='idle';
    const pin={id:newId('pin'),lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy,time:createdAt,category:parkingOnly?'parking':'unclassified',label:parkingOnly?'駐車場':'未分類の場所',note:'',parking:{},sessionId:parkingOnly?null:currentSessionId,locationSource:loc.lat!=null?'auto':'pending-auto'};
    savedPins.push(pin);pendingPinId=pin.id;if(parkingOnly) activeParkingId=pin.id;
    saveRecord('pin',{id:pin.id,category:pin.category,label:pin.label,note:'',parking:{},createdAt,sessionId:pin.sessionId,keepWithParking:parkingOnly},loc);
    persistRecordState();recordSheet='pin';render();
    setTimeout(()=>showRecordToast(parkingOnly?'駐車位置を保存しました':'場所を保存しました'),0);
    if(loc.lat==null&&navigator.geolocation){
      navigator.geolocation.getCurrentPosition(onPosition,()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:12000});
    }
  }

  function initializeRecordRuntime(){
    startMetricTimer();
    if(recordSessionState==='active'){
      startGeoWatch();
      keepScreenAwake();
    }else{
      stopGeoWatch();
      releaseScreenAwake();
    }
    if(active==='record'){
      renderLiveMap();bindMapGestures();
      const stale=!currentPosition||Date.now()-Number(currentPosition.time||0)>15000;
      if(recordSessionState!=='active'&&stale&&Date.now()-lastOneShotRequestAt>15000) requestOnePosition(false);
    }
  }

  function bindPlanActions(){
    document.querySelectorAll('[data-plan-date]').forEach(el=>{
      el.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(Date.now()<planCalendarSwipeSuppressUntil)return;
        const date=el.dataset.planDate;
        if(selectedPlanDate===date){openPlanEditor(null);planDraft.start=date;planDraft.end=date;render();return;}
        selectedPlanDate=date;planMonth=date.slice(0,7);persistPlans();render();
      });
    });
    document.querySelectorAll('[data-open-plan-switcher]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();recordSheet='';prepSheet='';prepModuleId='';planSheet='switcher';render();}));
    document.querySelectorAll('[data-switch-active-plan]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activePlanId=el.dataset.switchActivePlan||'none';persistPlans();blockUnderlyingNavigation(250);planSheet='';render();}));
    document.querySelectorAll('[data-tab-from-switcher]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();blockUnderlyingNavigation(250);planSheet='';active=el.dataset.tabFromSwitcher||'plan';history.replaceState(null,'',`?tab=${active}&v=clean-v6-library10a`);render();window.scrollTo({top:0,behavior:'instant'});}));
    document.querySelectorAll('[data-plan-id]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectedPlanId=el.dataset.planId;planDraft=null;planSheet='detail';render();}));
    document.querySelectorAll('[data-open-plan-add]').forEach(el=>el.addEventListener('click',()=>{openPlanEditor(null);render();}));
    document.querySelectorAll('[data-open-plan-list]').forEach(el=>el.addEventListener('click',()=>{planSheet='list';render();}));
    document.querySelectorAll('[data-close-plan-sheet]').forEach(el=>el.addEventListener('click',attemptClosePlanSheet));
    document.querySelectorAll('[data-plan-month]').forEach(el=>el.addEventListener('click',()=>{changePlanMonth(el.dataset.planMonth==='next'?1:-1);render();}));
    document.querySelectorAll('[data-plan-today]').forEach(el=>el.addEventListener('click',()=>{selectedPlanDate=new Date().toISOString().slice(0,10);planMonth=selectedPlanDate.slice(0,7);persistPlans();render();}));
    const calendar=document.querySelector('[data-plan-calendar-swipe]');
    if(calendar){
      calendar.addEventListener('pointerdown',e=>{if(e.target.closest('.monthBtns button'))return;planCalendarTouchStart={x:e.clientX,y:e.clientY,id:e.pointerId};},{passive:true});
      calendar.addEventListener('pointerup',e=>{if(!planCalendarTouchStart||planCalendarTouchStart.id!==e.pointerId)return;const dx=e.clientX-planCalendarTouchStart.x,dy=e.clientY-planCalendarTouchStart.y;planCalendarTouchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3){planCalendarSwipeSuppressUntil=Date.now()+450;changePlanMonth(dx<0?1:-1);render();}},{passive:true});
      calendar.addEventListener('pointercancel',()=>{planCalendarTouchStart=null;},{passive:true});
    }
    document.querySelectorAll('[data-plan-edit]').forEach(el=>el.addEventListener('click',()=>{const p=planForId(el.dataset.planEdit);if(!p)return;openPlanEditor(p);render();}));
    document.querySelectorAll('[data-plan-set-active]').forEach(el=>el.addEventListener('click',()=>{activePlanId=el.dataset.planSetActive;persistPlans();planSheet='';render();}));
    document.querySelectorAll('[data-plan-prepare]').forEach(el=>el.addEventListener('click',()=>{activePlanId=el.dataset.planPrepare;persistPlans();planSheet='';active='prep';history.replaceState(null,'',`?tab=prep&v=clean-v6-plan012`);render();window.scrollTo({top:0,behavior:'instant'});}));
    document.querySelectorAll('[data-plan-record]').forEach(el=>el.addEventListener('click',()=>{const p=planForId(el.dataset.planRecord);if(!p)return;activePlanId=p.id;recordTarget=p.title;localStorage.setItem('outbase_record_target',recordTarget);persistPlans();planSheet='';active='record';history.replaceState(null,'',`?tab=record&v=clean-v6-plan012`);render();window.scrollTo({top:0,behavior:'instant'});}));
    document.querySelectorAll('[data-plan-delete]').forEach(el=>el.addEventListener('click',()=>{const p=planForId(el.dataset.planDelete);if(!p)return;if(!confirm(`「${p.title}」を削除しますか？`))return;plans=plans.filter(x=>x.id!==p.id);if(activePlanId===p.id)activePlanId=plans[0]?.id||'';persistPlans();planSheet='';selectedPlanId='';render();}));

    const backdrop=document.querySelector('[data-plan-backdrop]');
    if(backdrop)backdrop.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();if(e.target===backdrop)attemptClosePlanSheet();});
    const panel=document.querySelector('[data-plan-sheet-panel]'),dragZone=document.querySelector('[data-plan-drag-zone]');
    if(panel&&dragZone){
      const finishDrag=e=>{
        if(!planSheetDrag||planSheetDrag.id!==e.pointerId)return;
        const dy=Math.max(0,e.clientY-planSheetDrag.y);panel.classList.remove('dragging');panel.style.transition='transform .2s ease';
        if(dy>72){panel.style.transform='translateY(110%)';setTimeout(()=>attemptClosePlanSheet(),150);}else{panel.style.transform='';setTimeout(()=>{panel.style.transition='';},210);}
        planSheetDrag=null;
      };
      dragZone.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;planSheetDrag={id:e.pointerId,y:e.clientY};try{dragZone.setPointerCapture(e.pointerId);}catch(_e){}panel.classList.add('dragging');panel.style.transition='none';e.preventDefault();});
      dragZone.addEventListener('pointermove',e=>{if(!planSheetDrag||planSheetDrag.id!==e.pointerId)return;const dy=Math.max(0,e.clientY-planSheetDrag.y);panel.style.transform=`translateY(${dy}px)`;e.preventDefault();});
      dragZone.addEventListener('pointerup',finishDrag);dragZone.addEventListener('pointercancel',finishDrag);
    }

    const draftInputs=document.querySelectorAll('.planEditSheet input,.planEditSheet textarea,.planEditSheet select');
    draftInputs.forEach(el=>{el.addEventListener('input',()=>{syncPlanDraftFromForm();planDraftDirty=true;});el.addEventListener('change',()=>{syncPlanDraftFromForm();planDraftDirty=true;});});
    const rerenderOnChange=['planAllDayInput','planRepeatMode','planRepeatCustomFrequency','planRepeatMonthlyMode','planRepeatEndMode'];
    rerenderOnChange.forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',()=>{syncPlanDraftFromForm();planDraftDirty=true;render();});});
    const startInput=document.getElementById('planStartInput');if(startInput)startInput.addEventListener('change',()=>{syncPlanDraftFromForm();const d=parseYmd(planDraft.start);if(planDraft.repeat.mode==='none'){planDraft.repeat.weekdays=[d.getDay()];planDraft.repeat.monthDay=d.getDate();}planDraftDirty=true;render();});
    document.querySelectorAll('[data-plan-type-choice]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;planDraft.type=el.dataset.planTypeChoice;planDraftDirty=true;document.querySelectorAll('[data-plan-type-choice]').forEach(x=>x.classList.toggle('selected',x===el));}));
    document.querySelectorAll('[data-companion-choice]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;const id=el.dataset.companionChoice,c=companions.find(x=>x.id===id);let ids=[...planDraft.companionIds];if(c?.solo){ids=ids.includes(id)?[]:[id];}else{ids=ids.filter(x=>companions.find(c2=>c2.id===x)?.solo!==true);ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];}planDraft.companionIds=ids;planDraftDirty=true;document.querySelectorAll('[data-companion-choice]').forEach(x=>x.classList.toggle('selected',ids.includes(x.dataset.companionChoice)));}));
    document.querySelectorAll('[data-repeat-weekday]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;const day=Number(el.dataset.repeatWeekday),days=[...planDraft.repeat.weekdays];planDraft.repeat.weekdays=days.includes(day)?days.filter(x=>x!==day):[...days,day].sort();if(!planDraft.repeat.weekdays.length)planDraft.repeat.weekdays=[parseYmd(planDraft.start).getDay()];planDraftDirty=true;render();}));
    document.querySelectorAll('[data-weekday-preset]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;planDraft.repeat.weekdays=el.dataset.weekdayPreset==='weekday'?[1,2,3,4,5]:[0,6];planDraftDirty=true;render();}));
    const addReminder=document.querySelector('[data-add-reminder]');if(addReminder)addReminder.addEventListener('click',()=>{syncPlanDraftFromForm();planDraft.reminders.push({id:newId('reminder'),value:1,unit:'day'});planDraftDirty=true;render();});
    document.querySelectorAll('[data-remove-reminder]').forEach(el=>el.addEventListener('click',()=>{syncPlanDraftFromForm();planDraft.reminders=planDraft.reminders.filter(r=>r.id!==el.dataset.removeReminder);planDraftDirty=true;render();}));

    document.querySelectorAll('[data-manage-types]').forEach(el=>el.addEventListener('click',()=>{syncPlanDraftFromForm();planSheet='type-manager';render();}));
    document.querySelectorAll('[data-manage-companions]').forEach(el=>el.addEventListener('click',()=>{syncPlanDraftFromForm();planSheet='companion-manager';render();}));
    document.querySelectorAll('[data-return-plan-editor]').forEach(el=>el.addEventListener('click',()=>{planSheet=planDraft?.editingId?'edit':'add';render();}));
    document.querySelectorAll('[data-type-name]').forEach(el=>el.addEventListener('change',()=>{const row=planTypes.find(t=>t.id===el.dataset.typeName),old=row?.name,name=el.value.trim();if(row&&name){row.name=name;if(planDraft?.type===old)planDraft.type=name;persistPlans();}}));
    document.querySelectorAll('[data-type-tone]').forEach(el=>el.addEventListener('change',()=>{const row=planTypes.find(t=>t.id===el.dataset.typeTone);if(row){row.tone=el.value;persistPlans();}}));
    document.querySelectorAll('[data-type-delete]').forEach(el=>el.addEventListener('click',()=>{const row=planTypes.find(t=>t.id===el.dataset.typeDelete);if(!row||!confirm(`種類「${row.name}」を削除しますか？
過去の予定に保存された種類名は残ります。`))return;planTypes=planTypes.filter(t=>t.id!==row.id);if(planDraft?.type===row.name)planDraft.type='';persistPlans();render();}));
    const addType=document.querySelector('[data-add-type]');if(addType)addType.addEventListener('click',()=>{const input=document.getElementById('newTypeName'),name=input?.value.trim();if(!name)return;if(planTypes.some(t=>t.name===name)){alert('同じ種類が既にあります');return;}planTypes.push({id:newId('type'),name,tone:'slate',hidden:false});persistPlans();render();});
    document.querySelectorAll('[data-companion-name]').forEach(el=>el.addEventListener('change',()=>{const row=companions.find(c=>c.id===el.dataset.companionName),old=row?.name,name=el.value.trim();if(row&&name){row.name=name;if(planDraft){const idx=planDraft.companionNames.indexOf(old);if(idx>=0)planDraft.companionNames[idx]=name;}persistPlans();}}));
    document.querySelectorAll('[data-companion-delete]').forEach(el=>el.addEventListener('click',()=>{const row=companions.find(c=>c.id===el.dataset.companionDelete);if(!row||row.solo||!confirm(`同行者「${row.name}」を削除しますか？
過去の予定に保存された名前は残ります。`))return;companions=companions.filter(c=>c.id!==row.id);if(planDraft)planDraft.companionIds=planDraft.companionIds.filter(id=>id!==row.id);persistPlans();render();}));
    const addCompanion=document.querySelector('[data-add-companion]');if(addCompanion)addCompanion.addEventListener('click',()=>{const input=document.getElementById('newCompanionName'),name=input?.value.trim();if(!name)return;if(companions.some(c=>c.name===name)){alert('同じ同行者が既にあります');return;}companions.push({id:newId('comp'),name,hidden:false});persistPlans();render();});

    const save=document.querySelector('[data-save-plan]');if(save)save.addEventListener('click',()=>{
      syncPlanDraftFromForm();if(!planDraft?.title.trim()){alert('名前を入力してください');return;}
      if(compareYmd(planDraft.end,planDraft.start)<0){alert('終了日は開始日以降にしてください');return;}
      if(!planDraft.allDay&&planDraft.start===planDraft.end&&planDraft.startTime&&planDraft.endTime&&planDraft.endTime<planDraft.startTime){alert('終了時間は開始時間以降にしてください');return;}
      const rows=rowsFromPlanDraft(planDraft);
      if(planDraft.editingId){const idx=plans.findIndex(p=>p.id===planDraft.editingId);if(idx>=0)plans[idx]={...plans[idx],...rows[0],id:planDraft.editingId};selectedPlanId=planDraft.editingId;}
      else{plans.push(...rows);selectedPlanId=rows[0].id;}
      selectedPlanDate=rows[0].start;planMonth=rows[0].start.slice(0,7);activePlanId=activePlanId||rows[0].id;persistPlans();if(rows[0].reminders.length)requestPlanNotificationPermission();planDraftDirty=false;planDraft=null;planSheet='detail';render();
    });
  }

  function closePrepSheet(){
    const plan=activePlan();
    if(prepSheet==='common-module'){
      const note=document.getElementById('prepCommonNote');if(note){prepCommonState(prepModuleId).note=note.value;persistPrepCommonStore();}
    }else{
      const note=document.getElementById('prepModuleNote'),module=plan?prepModuleDefinitions(plan).find(x=>x.id===prepModuleId):null;
      if(note&&plan&&module){prepModuleState(plan,module).note=note.value;syncPlanPrepStatus(plan);}
    }
    blockUnderlyingNavigation();prepSheet='';prepModuleId='';render();
  }
  function bindPrepActions(){
    document.querySelectorAll('[data-prep-module]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();prepModuleId=el.dataset.prepModule;prepSheet='module';render();}));
    document.querySelectorAll('[data-prep-common-module]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const id=el.dataset.prepCommonModule;if(id==='gear'){prepSheet='gear-manager';prepModuleId='';}else{prepSheet='common-module';prepModuleId=id;}render();}));
    document.querySelectorAll('[data-open-common-module]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();prepSheet='common-module';prepModuleId=el.dataset.openCommonModule;render();}));
    document.querySelectorAll('[data-open-gear-manager]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();prepSheet='gear-manager';render();}));
    const detail=document.querySelector('[data-prep-plan-detail]');if(detail)detail.addEventListener('click',()=>{const plan=activePlan();if(!plan)return;selectedPlanId=plan.id;planSheet='detail';prepSheet='';render();});
    document.querySelectorAll('[data-close-prep-sheet]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closePrepSheet();}));
    document.querySelectorAll('[data-prep-check]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),index=Number(el.dataset.prepCheck);state.checked=state.checked.includes(index)?state.checked.filter(x=>x!==index):[...state.checked,index].sort((a,b)=>a-b);syncPlanPrepStatus(plan);render();}));
    const add=document.querySelector('[data-prep-add]');if(add)add.addEventListener('click',()=>{const input=document.getElementById('prepNewItem'),text=input?.value.trim(),plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!text||!plan||!module)return;prepModuleState(plan,module).customItems.push(text);syncPlanPrepStatus(plan);render();});
    document.querySelectorAll('[data-prep-remove]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),index=Number(el.dataset.prepRemove),customIndex=index-module.tasks.length;if(customIndex<0)return;state.customItems.splice(customIndex,1);state.checked=state.checked.filter(x=>x!==index).map(x=>x>index?x-1:x);syncPlanPrepStatus(plan);render();}));
    const note=document.getElementById('prepModuleNote');if(note)note.addEventListener('input',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;prepModuleState(plan,module).note=note.value;persistPrepStore();});
    const all=document.querySelector('[data-prep-mark-all]');if(all)all.addEventListener('click',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),items=prepModuleItems(plan,module),complete=items.length&&items.every((_,i)=>state.checked.includes(i));state.checked=complete?[]:items.map((_,i)=>i);syncPlanPrepStatus(plan);render();});
    const copy=document.querySelector('[data-prep-copy]');if(copy)copy.addEventListener('click',async()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),text=[`${plan.title}｜${module.title}`,...prepModuleItems(plan,module).filter((_,i)=>!state.checked.includes(i)).map(x=>`□ ${x}`)].join('\n');try{await navigator.clipboard.writeText(text);showRecordToast('未完了項目をコピーしました');}catch(_e){showRecordToast('コピーできませんでした');}});
    document.querySelectorAll('[data-prep-external]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),kind=el.dataset.prepExternal;if(!plan)return;if(kind==='route'){const q=encodeURIComponent(plan.location||plan.title);window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,'_blank','noopener');}else if(kind==='weather'){const q=encodeURIComponent(`${plan.location||plan.title} 天気`);window.open(`https://www.google.com/search?q=${q}`,'_blank','noopener');}}));

    const commonAdd=document.querySelector('[data-common-add]');if(commonAdd)commonAdd.addEventListener('click',()=>{const input=document.getElementById('prepCommonNewItem'),text=input?.value.trim();if(!text||!prepModuleId)return;const state=prepCommonState(prepModuleId);state.items.push(text);persistPrepCommonStore();render();});
    document.querySelectorAll('[data-common-remove]').forEach(el=>el.addEventListener('click',()=>{const state=prepCommonState(prepModuleId),index=Number(el.dataset.commonRemove);if(index<0||index>=state.items.length)return;state.items.splice(index,1);persistPrepCommonStore();render();}));
    document.querySelectorAll('[data-common-use]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),commonModule=prepCommonModuleDefinitions().find(x=>x.id===prepModuleId),module=plan?prepModuleDefinitions(plan).find(x=>x.id===prepModuleId):null,state=prepCommonState(prepModuleId),item=state.items[Number(el.dataset.commonUse)];if(!plan||!module||!item)return;const target=prepModuleState(plan,module);if(!target.customItems.includes(item))target.customItems.push(item);syncPlanPrepStatus(plan);showRecordToast(`「${item}」を今回の${commonModule?.title||'準備'}へ追加しました`);render();}));
    const commonNote=document.getElementById('prepCommonNote');if(commonNote)commonNote.addEventListener('input',()=>{prepCommonState(prepModuleId).note=commonNote.value;persistPrepCommonStore();});

    document.querySelectorAll('[data-toggle-gear-plan]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan();if(!plan)return;const module=prepModuleDefinitions(plan)[1],state=prepModuleState(plan,module),id=el.dataset.toggleGearPlan;state.gearIds=state.gearIds.includes(id)?state.gearIds.filter(x=>x!==id):[...state.gearIds,id];persistPrepStore();render();}));
    document.querySelectorAll('[data-library-tab]').forEach(el=>el.addEventListener('click',()=>{libraryScrollPositions={};libraryTab=el.dataset.libraryTab;libraryCloseEditor();persistLibraryTab();render();}));
    document.querySelectorAll('[data-library-gear-view]').forEach(el=>el.addEventListener('click',()=>{libraryScrollPositions={};libraryGearView=el.dataset.libraryGearView;persistLibraryGearView();libraryCloseEditor();render();}));
    document.querySelectorAll('[data-dashboard-jump]').forEach(el=>el.addEventListener('click',()=>{rememberLibraryScroll();libraryGearView=el.dataset.dashboardJump||'dashboard';persistLibraryGearView();libraryCloseEditor();render();}));
    const overviewSearch=document.querySelector('[data-overview-search]');if(overviewSearch)overviewSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){libraryGearQuery=overviewSearch.value.trim();rememberLibraryScroll();libraryGearView='items';persistLibraryGearView();render();}});
    document.querySelectorAll('[data-library-add]').forEach(el=>el.addEventListener('click',()=>{libraryOpenEditor(el.dataset.libraryAdd,'');if(el.dataset.eventTarget&&libraryEditorDraft){const [targetType,targetId]=el.dataset.eventTarget.split(':');libraryEditorDraft.targetType=targetType;libraryEditorDraft.targetId=targetId;}render();}));
    document.querySelectorAll('[data-library-edit]').forEach(el=>el.addEventListener('click',()=>{libraryOpenEditor(el.dataset.libraryEdit,el.dataset.libraryId||'');render();}));
    document.querySelectorAll('[data-library-editor-close]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();libraryCloseEditor();render();}));
    const gearSearch=document.getElementById('libraryGearSearch');if(gearSearch){let searchTimer;gearSearch.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{libraryGearQuery=gearSearch.value;libraryGearLimit=30;render();setTimeout(()=>{const input=document.getElementById('libraryGearSearch');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}},0);},220);});}
    document.querySelectorAll('[data-gear-filter]').forEach(el=>el.addEventListener('click',()=>{libraryGearCategory=el.dataset.gearFilter;libraryGearLimit=30;render();}));
    document.querySelectorAll('[data-relation-filter]').forEach(el=>el.addEventListener('click',()=>{libraryRelationFilter=el.dataset.relationFilter;render();}));
    document.querySelectorAll('[data-event-filter]').forEach(el=>el.addEventListener('click',()=>{libraryEventFilter=el.dataset.eventFilter;render();}));
    document.querySelectorAll('[data-stock-filter]').forEach(el=>el.addEventListener('click',()=>{libraryStockFilter=el.dataset.stockFilter;render();}));
    const gearSort=document.getElementById('libraryGearSort');if(gearSort)gearSort.addEventListener('change',()=>{libraryGearSort=gearSort.value;libraryGearLimit=30;render();});
    const more=document.querySelector('[data-library-more]');if(more)more.addEventListener('click',()=>{libraryGearLimit+=30;render();});
    document.querySelectorAll('[data-library-kit-plan]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),kit=gearKits.find(k=>k.id===el.dataset.libraryKitPlan);if(!plan||!kit)return;const state=prepModuleState(plan,prepModuleDefinitions(plan)[1]),valid=kit.gearIds.filter(id=>gearById(id)),all=valid.length&&valid.every(id=>state.gearIds.includes(id));state.gearIds=all?state.gearIds.filter(id=>!valid.includes(id)):[...new Set([...state.gearIds,...valid])];persistPrepStore();render();setTimeout(()=>showRecordToast(all?'セットを今回から外しました':'セットを今回へ追加しました'),0);}));
    const relationAdd=document.querySelector('[data-library-relation-add]');if(relationAdd)relationAdd.addEventListener('click',()=>{syncLibraryEditorDraftFromForm();const type=document.getElementById('lib-relation-type')?.value||'alwaysWith',raw=document.getElementById('lib-relation-target')?.value||'',condition=document.getElementById('lib-relation-condition')?.value||'';if(!raw){showRecordToast('相手を選んでください');return;}const [targetType,targetId]=raw.split(':');if(libraryEditorRelationsDraft.some(r=>r.type===type&&(r.targetType||'gear')===targetType&&r.targetId===targetId&&String(r.condition||'')===condition)){showRecordToast('同じ組み合わせは登録済みです');return;}libraryEditorRelationsDraft.push({type,targetType,targetId,condition});render();});
    document.querySelectorAll('[data-library-relation-remove]').forEach(el=>el.addEventListener('click',()=>{syncLibraryEditorDraftFromForm();const index=Number(el.dataset.libraryRelationRemove);if(index>=0)libraryEditorRelationsDraft.splice(index,1);render();}));
    document.querySelectorAll('[data-kit-gear-toggle]').forEach(el=>el.addEventListener('click',()=>{syncLibraryEditorDraftFromForm();const id=el.dataset.kitGearToggle;if(libraryEditorKitGearIds.includes(id)){libraryEditorKitGearIds=libraryEditorKitGearIds.filter(x=>x!==id);libraryEditorKitRequiredIds=libraryEditorKitRequiredIds.filter(x=>x!==id);}else{libraryEditorKitGearIds=[...libraryEditorKitGearIds,id];libraryEditorKitRequiredIds=[...libraryEditorKitRequiredIds,id];}render();}));
    document.querySelectorAll('[data-kit-required-toggle]').forEach(el=>el.addEventListener('click',()=>{syncLibraryEditorDraftFromForm();const id=el.dataset.kitRequiredToggle;libraryEditorKitRequiredIds=libraryEditorKitRequiredIds.includes(id)?libraryEditorKitRequiredIds.filter(x=>x!==id):[...libraryEditorKitRequiredIds,id];render();}));
    document.querySelectorAll('[data-custom-part-toggle]').forEach(el=>el.addEventListener('click',()=>{syncLibraryEditorDraftFromForm();const id=el.dataset.customPartToggle;libraryEditorCustomPartIds=libraryEditorCustomPartIds.includes(id)?libraryEditorCustomPartIds.filter(x=>x!==id):[...libraryEditorCustomPartIds,id];render();}));
    document.querySelectorAll('[data-tag-toggle]').forEach(el=>el.addEventListener('click',()=>{const input=document.getElementById('lib-tags');if(!input)return;const tags=String(input.value||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean),t=el.dataset.tagToggle;input.value=(tags.includes(t)?tags.filter(x=>x!==t):[...tags,t]).join('、');syncLibraryEditorDraftFromForm();render();}));
    const autoName=document.getElementById('lib-name');if(autoName&&libraryEditorType==='gear')autoName.addEventListener('blur',()=>{const n=autoName.value.toLowerCase(),cat=document.getElementById('lib-category'),role=document.getElementById('lib-role'),tags=document.getElementById('lib-tags');if(cat&&cat.value==='その他'){if(/ランタン|ほおずき/.test(n))cat.value='照明';else if(/テント|ランドロック|シェル/.test(n))cat.value='テント';else if(/ストーブ|ヒーター/.test(n))cat.value='暖房';else if(/バーナー|コンロ|五徳/.test(n))cat.value='キッチン';else if(/delta|ecoflow|バッテリー|charger|パネル/.test(n))cat.value='電源';}if(role&&role.value==='本体'){if(/シェード|五徳|フライシート|グランドシート/.test(n))role.value='専用品';else if(/薪|オイル|ガス/.test(n))role.value='燃料';else if(/替芯|マントル/.test(n))role.value='消耗品';}if(tags&&!tags.value){const a=[];if(/冬|ストーブ|ヒーター|薪/.test(n))a.push('冬');if(/雨|フライ/.test(n))a.push('雨天');tags.value=a.join('、');}syncLibraryEditorDraftFromForm();render();});
    const updatePrice=()=>{const q=Number(document.getElementById('lib-quantity')?.value)||1,p=Number(document.getElementById('lib-price')?.value)||0,out=document.querySelector('[data-price-summary]');if(out)out.textContent=`小計 ¥${(q*p).toLocaleString('ja-JP')}`;};document.getElementById('lib-quantity')?.addEventListener('input',updatePrice);document.getElementById('lib-price')?.addEventListener('input',updatePrice);
    const roleSelect=document.getElementById('lib-role');if(roleSelect)roleSelect.addEventListener('change',()=>{syncLibraryEditorDraftFromForm();libraryEditorDraft.role=roleSelect.value;render();});
    const customBase=document.getElementById('lib-custom-base');if(customBase)customBase.addEventListener('change',()=>{syncLibraryEditorDraftFromForm();libraryEditorDraft.baseGearId=customBase.value;libraryEditorCustomPartIds=libraryEditorCustomPartIds.filter(id=>id!==customBase.value);render();});
    const kitSearch=document.getElementById('lib-kit-search');if(kitSearch){let kitTimer;kitSearch.addEventListener('input',()=>{clearTimeout(kitTimer);kitTimer=setTimeout(()=>{syncLibraryEditorDraftFromForm();libraryKitQuery=kitSearch.value;render();setTimeout(()=>{const input=document.getElementById('lib-kit-search');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}},0);},180);});}
    const saveLibrary=document.querySelector('[data-library-save]');if(saveLibrary)saveLibrary.addEventListener('click',()=>{
      const value=id=>document.getElementById(id)?.value.trim()||'',check=id=>Boolean(document.getElementById(id)?.checked),now=Date.now();
      if(libraryEditorType==='event'){const targets=[...gearLibrary.map(x=>({id:x.id,type:'gear',name:x.name,group:'ギア'})),...mobilityLibrary.map(x=>({id:x.id,type:'mobility',name:x.name,group:'車・自転車'})),...petLibrary.map(x=>({id:x.id,type:'pet',name:x.name,group:'ペット'}))];fields=`${libraryField('対象',`<select id="lib-event-target"><option value="">選択してください</option>${targets.map(x=>`<option value="${x.type}:${x.id}" ${(row.targetType+':'+row.targetId)===(x.type+':'+x.id)?'selected':''}>${escapeHtml(x.group)}｜${escapeHtml(x.name)}</option>`).join('')}</select>`)}<div class="libraryFieldGrid">${libraryField('種類',`<select id="lib-event-type">${['購入','カスタム','使用','補充','交換','点検','修理','売却','廃棄','通院','ワクチン'].map(x=>`<option ${row.eventType===x?'selected':''}>${x}</option>`).join('')}</select>`)}${libraryField('日付',`<input id="lib-event-date" type="date" value="${escapeHtml(row.date||'')}">`)}</div>${libraryField('内容',`<input id="lib-name" value="${escapeHtml(row.title||'')}" placeholder="例：替芯を交換">`)}${libraryField('詳細',`<textarea id="lib-memo">${escapeHtml(row.detail||'')}</textarea>`)}<div class="libraryFieldGrid">${libraryField('費用',`<input id="lib-event-cost" type="number" min="0" value="${escapeHtml(row.cost??'')}">`)}${libraryField('次回予定日',`<input id="lib-event-next" type="date" value="${escapeHtml(row.nextDate||'')}">`)}</div>`;}
    if(libraryEditorType==='gear'){
        const name=value('lib-name');if(!name){showRecordToast('ギア名を入力してください');return;}
        const row={id:libraryEditorId||newId('gear'),name,category:value('lib-category')||'その他',role:value('lib-role')||'本体',quantity:Math.max(1,Number(value('lib-quantity'))||1),brand:value('lib-brand'),model:value('lib-model'),storage:value('lib-storage'),condition:value('lib-condition')||'使用可',purchaseDate:value('lib-date'),purchasePrice:value('lib-price'),tags:value('lib-tags').split(/[、,]/).map(x=>x.trim()).filter(Boolean),memo:value('lib-memo'),favorite:check('lib-favorite'),relations:libraryEditorRelationsDraft.map(r=>({...r})),stockAmount:value('lib-stock-amount')===''?'':Math.max(0,Number(value('lib-stock-amount'))||0),stockUnit:value('lib-stock-unit')||'個',reorderPoint:value('lib-reorder-point')===''?'':Math.max(0,Number(value('lib-reorder-point'))||0),stockStep:value('lib-stock-step')||'1',openedDate:value('lib-opened-date'),expiryDate:value('lib-expiry-date'),updatedAt:now};
        const index=gearLibrary.findIndex(x=>x.id===row.id);if(index>=0)gearLibrary[index]={...gearLibrary[index],...row};else gearLibrary.unshift(row);persistGearLibrary();
      }
      if(libraryEditorType==='kit'){
        const name=value('lib-name');if(!name){showRecordToast('セット名を入力してください');return;}
        if(!libraryEditorKitGearIds.length){showRecordToast('セットへギアを1点以上追加してください');return;}
        const ids=[...new Set(libraryEditorKitGearIds)].filter(id=>gearById(id));
        const row={id:libraryEditorId||newId('kit'),name,kind:value('lib-kind')||'セット',gearIds:ids,requiredGearIds:libraryEditorKitRequiredIds.filter(id=>ids.includes(id)),conditionTags:value('lib-kit-conditions').split(/[、,]/).map(x=>x.trim()).filter(Boolean),memo:value('lib-memo'),favorite:check('lib-favorite'),updatedAt:now};
        const index=gearKits.findIndex(x=>x.id===row.id);if(index>=0)gearKits[index]={...gearKits[index],...row};else gearKits.unshift(row);persistGearKits();
      }
      if(libraryEditorType==='custom'){
        const name=value('lib-name'),baseGearId=value('lib-custom-base');if(!name){showRecordToast('構成名を入力してください');return;}if(!baseGearId){showRecordToast('本体を選択してください');return;}
        if(!libraryEditorCustomPartIds.length){showRecordToast('構成パーツを1点以上追加してください');return;}
        const status=value('lib-custom-status')||'保存構成';if(status==='現在の仕様')gearCustoms.forEach(c=>{if(c.baseGearId===baseGearId&&c.id!==libraryEditorId)c.status='保存構成';});
        const row={id:libraryEditorId||newId('custom'),name,baseGearId,partGearIds:[...new Set(libraryEditorCustomPartIds)].filter(id=>gearById(id)&&id!==baseGearId),status,memo:value('lib-memo'),updatedAt:now};const index=gearCustoms.findIndex(x=>x.id===row.id);if(index>=0)gearCustoms[index]={...gearCustoms[index],...row};else gearCustoms.unshift(row);persistGearCustoms();
      }
      if(libraryEditorType==='mobility'){
        const name=value('lib-name');if(!name){showRecordToast('登録名を入力してください');return;}
        const row={id:libraryEditorId||newId('mobility'),type:value('lib-type')||'車',name,maker:value('lib-maker'),model:value('lib-model'),color:value('lib-color'),plate:value('lib-plate'),storage:value('lib-storage'),condition:value('lib-condition')||'使用可',primary:check('lib-primary'),inspectionDate:value('lib-inspection'),insuranceDate:value('lib-insurance'),maintenanceNext:value('lib-maintenance-next'),odometer:value('lib-odometer'),memo:value('lib-memo')};
        if(row.primary)mobilityLibrary.forEach(x=>x.primary=false);const index=mobilityLibrary.findIndex(x=>x.id===row.id);if(index>=0)mobilityLibrary[index]={...mobilityLibrary[index],...row};else mobilityLibrary.push(row);persistMobilityLibrary();
      }
      if(libraryEditorType==='pet'){
        const name=value('lib-name');if(!name){showRecordToast('ペットの名前を入力してください');return;}
        const row={id:libraryEditorId||newId('pet'),name,species:value('lib-species')||'その他',breed:value('lib-breed'),sex:value('lib-sex'),age:value('lib-age'),size:value('lib-size'),collarColor:value('lib-collar'),personality:value('lib-personality'),birthday:value('lib-birthday'),rabiesNext:value('lib-rabies-next'),vaccineNext:value('lib-vaccine-next'),healthCheckNext:value('lib-health-next'),vet:value('lib-vet'),medicalNote:value('lib-medical'),photo:''};
        const index=petLibrary.findIndex(x=>x.id===row.id),oldName=index>=0?petLibrary[index].name:'';if(index>=0)petLibrary[index]={...petLibrary[index],...row};else petLibrary.push(row);if(oldName&&oldName!==name){const companion=companions.find(x=>x.name===oldName);if(companion)companion.name=name;}if(!companions.some(x=>x.name===name)){companions.push({id:newId('comp'),name,hidden:false});}localStorage.setItem('outbase_plan_companions_v2',JSON.stringify(companions));persistPetLibrary();
      }
      if(libraryEditorType==='storage'){
        const name=value('lib-name');if(!name){showRecordToast('保管場所名を入力してください');return;}
        const row={id:libraryEditorId||newId('storage'),name,type:value('lib-type')||'収納',memo:value('lib-memo')};const index=storageLibrary.findIndex(x=>x.id===row.id);if(index>=0){const old=storageLibrary[index].name;storageLibrary[index]=row;if(old!==name){gearLibrary.forEach(g=>{if(g.storage===old)g.storage=name;});mobilityLibrary.forEach(x=>{if(x.storage===old)x.storage=name;});persistGearLibrary();persistMobilityLibrary();}}else storageLibrary.push(row);persistStorageLibrary();
      }
      libraryCloseEditor();render();setTimeout(()=>showRecordToast('共通台帳へ保存しました'),0);
    });
    const deleteLibrary=document.querySelector('[data-library-delete]');if(deleteLibrary)deleteLibrary.addEventListener('click',()=>{
      const type=libraryEditorType,id=libraryEditorId;if(!id)return;const label={gear:'ギア',kit:'セット',custom:'カスタム構成',event:'履歴',mobility:'車・自転車',pet:'ペット',storage:'保管場所'}[type];if(!confirm(`${label}を削除しますか？`))return;
      if(type==='event'){assetEvents=assetEvents.filter(x=>x.id!==id);persistAssetEvents();}
      if(type==='gear'){gearLibrary=gearLibrary.filter(x=>x.id!==id);gearLibrary.forEach(g=>{g.relations=(g.relations||[]).filter(r=>r.targetId!==id);});gearKits.forEach(k=>{k.gearIds=(k.gearIds||[]).filter(x=>x!==id);});gearCustoms=gearCustoms.filter(c=>c.baseGearId!==id).map(c=>({...c,partGearIds:(c.partGearIds||[]).filter(x=>x!==id)}));Object.values(prepStore).forEach(bucket=>Object.values(bucket.modules||{}).forEach(state=>{if(Array.isArray(state.gearIds))state.gearIds=state.gearIds.filter(x=>x!==id);}));persistGearLibrary();persistGearKits();persistGearCustoms();persistPrepStore();}
      if(type==='kit'){gearKits=gearKits.filter(x=>x.id!==id);persistGearKits();}
      if(type==='custom'){gearCustoms=gearCustoms.filter(x=>x.id!==id);persistGearCustoms();}
      if(type==='mobility'){mobilityLibrary=mobilityLibrary.filter(x=>x.id!==id);assetEvents=assetEvents.filter(e=>!(e.targetType==='mobility'&&e.targetId===id));gearLibrary.forEach(g=>{g.relations=(g.relations||[]).filter(r=>r.targetId!==id);});persistMobilityLibrary();persistAssetEvents();persistGearLibrary();}
      if(type==='pet'){const deleted=petLibrary.find(x=>x.id===id);petLibrary=petLibrary.filter(x=>x.id!==id);assetEvents=assetEvents.filter(e=>!(e.targetType==='pet'&&e.targetId===id));if(deleted&&!petLibrary.some(x=>x.name===deleted.name)){companions=companions.filter(x=>x.name!==deleted.name);localStorage.setItem('outbase_plan_companions_v2',JSON.stringify(companions));}persistPetLibrary();persistAssetEvents();}
      if(type==='storage'){const row=storageLibrary.find(x=>x.id===id),related=gearLibrary.some(g=>(g.relations||[]).some(r=>r.targetId===id));if(row&&(libraryStorageCount(row.name)>0||related)){showRecordToast('使用中の保管場所は削除できません');return;}storageLibrary=storageLibrary.filter(x=>x.id!==id);persistStorageLibrary();}
      libraryCloseEditor();render();
    });
    document.querySelectorAll('[data-stock-adjust]').forEach(el=>el.addEventListener('click',()=>{const g=gearById(el.dataset.stockId);if(!g)return;const delta=Number(el.dataset.stockAdjust)||0;g.stockAmount=Math.max(0,stockNumber(g)+delta);g.updatedAt=Date.now();persistGearLibrary();render();setTimeout(()=>showRecordToast(`${g.name}：${stockDisplay(g)}`),0);}));
    const bulkAdd=document.querySelector('[data-library-bulk-add]');if(bulkAdd)bulkAdd.addEventListener('click',()=>{const names=(document.getElementById('libraryBulkText')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),category=document.getElementById('libraryBulkCategory')?.value||'その他',brand=document.getElementById('libraryBulkBrand')?.value.trim()||'';if(!names.length){showRecordToast('1行に1つ入力してください');return;}const existing=new Set(gearLibrary.map(x=>x.name.toLowerCase()));let added=0;names.forEach(name=>{if(existing.has(name.toLowerCase()))return;gearLibrary.push({id:newId('gear'),name,category,role:'本体',brand,model:'',quantity:1,storage:'',condition:'使用可',purchaseDate:'',purchasePrice:'',tags:[],memo:'',favorite:false,relations:[],stockAmount:'',stockUnit:'個',reorderPoint:'',stockStep:'1',openedDate:'',expiryDate:'',updatedAt:Date.now()});existing.add(name.toLowerCase());added++;});persistGearLibrary();libraryTab='gear';persistLibraryTab();render();setTimeout(()=>showRecordToast(`${added}件を追加しました`),0);});
    const exportBtn=document.querySelector('[data-library-export]');if(exportBtn)exportBtn.addEventListener('click',()=>{const data={version:'Library10A',schema:localStorage.getItem('outbase_library_schema')||'library-10a',exportedAt:new Date().toISOString(),gear:gearLibrary,kits:gearKits,customs:gearCustoms,events:assetEvents,mobility:mobilityLibrary,pets:petLibrary,storage:storageLibrary};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`OUTBASE_共通台帳_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    const importOpen=document.querySelector('[data-library-import-open]'),importFile=document.getElementById('libraryImportFile');if(importOpen&&importFile){importOpen.addEventListener('click',()=>importFile.click());importFile.addEventListener('change',()=>{const file=importFile.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!confirm('現在の共通台帳を、このバックアップで置き換えますか？'))return;gearLibrary=Array.isArray(data.gear)?data.gear:gearLibrary;gearKits=Array.isArray(data.kits)?data.kits:gearKits;gearCustoms=Array.isArray(data.customs)?data.customs:gearCustoms;assetEvents=Array.isArray(data.events)?data.events:assetEvents;mobilityLibrary=Array.isArray(data.mobility)?data.mobility:mobilityLibrary;petLibrary=Array.isArray(data.pets)?data.pets:petLibrary;storageLibrary=Array.isArray(data.storage)?data.storage:storageLibrary;normalizeLibraryData();persistGearLibrary();persistGearKits();persistGearCustoms();persistAssetEvents();persistMobilityLibrary();persistPetLibrary();persistStorageLibrary();render();setTimeout(()=>showRecordToast('バックアップを読み込みました'),0);}catch(_e){showRecordToast('JSONを読み込めませんでした');}};reader.readAsText(file);});}

    document.querySelectorAll('[data-library-storage-toggle]').forEach(el=>el.addEventListener('click',()=>{const panel=document.querySelector(`[data-storage-content="${el.dataset.libraryStorageToggle}"]`);if(panel)panel.hidden=!panel.hidden;}));
    document.querySelectorAll('[data-transfer-section]').forEach(el=>el.addEventListener('click',()=>{document.querySelector(`[data-transfer-panel="${el.dataset.transferSection}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});}));
    const editorBackdrop=document.querySelector('.libraryEditorBackdrop');
    if(editorBackdrop){editorBackdrop.addEventListener('click',e=>{if(e.target===editorBackdrop){libraryCloseEditor();render();}});let sy=0,dy=0;editorBackdrop.addEventListener('touchstart',e=>{sy=e.touches[0]?.clientY||0;dy=0},{passive:true});editorBackdrop.addEventListener('touchmove',e=>{dy=(e.touches[0]?.clientY||sy)-sy},{passive:true});editorBackdrop.addEventListener('touchend',()=>{if(dy>90){libraryCloseEditor();render();}});}
    document.querySelectorAll('[data-library-placeholder]').forEach(el=>el.addEventListener('click',()=>showRecordToast(`${el.dataset.libraryPlaceholder}は次工程でAI整理と接続します`)));

    const backdrop=document.querySelector('[data-prep-backdrop]');if(backdrop){backdrop.addEventListener('pointerdown',e=>{if(e.target===backdrop)blockUnderlyingNavigation();},{capture:true,passive:false});backdrop.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();if(e.target===backdrop)closePrepSheet();},{passive:false});}
    const panel=document.querySelector('[data-prep-sheet-panel]'),zone=document.querySelector('[data-prep-drag-zone]');
    if(panel&&zone){
      const finish=e=>{if(!prepSheetDrag||prepSheetDrag.id!==e.pointerId)return;const dy=Math.max(0,e.clientY-prepSheetDrag.y);panel.classList.remove('dragging');panel.style.transition='transform .2s ease';if(dy>72){panel.style.transform='translateY(110%)';blockUnderlyingNavigation();setTimeout(closePrepSheet,150);}else{panel.style.transform='';setTimeout(()=>{panel.style.transition='';},210);}prepSheetDrag=null;};
      zone.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;prepSheetDrag={id:e.pointerId,y:e.clientY};try{zone.setPointerCapture(e.pointerId);}catch(_e){}panel.classList.add('dragging');panel.style.transition='none';e.preventDefault();e.stopPropagation();});
      zone.addEventListener('pointermove',e=>{if(!prepSheetDrag||prepSheetDrag.id!==e.pointerId)return;panel.style.transform=`translateY(${Math.max(0,e.clientY-prepSheetDrag.y)}px)`;e.preventDefault();e.stopPropagation();});zone.addEventListener('pointerup',finish);zone.addEventListener('pointercancel',finish);
    }
  }

  function bindRecordActions(){
    document.querySelectorAll('[data-open-sheet]').forEach(el=>el.addEventListener('click',()=>{recordSheet=el.dataset.openSheet;render();}));
    document.querySelectorAll('[data-open-parking-recall]').forEach(el=>el.addEventListener('click',()=>{recordSheet='parking-recall';render();}));
    document.querySelectorAll('[data-resume-session]').forEach(el=>el.addEventListener('click',()=>{if(restoreRecoverableSession()){render();keepScreenAwake();setTimeout(()=>showRecordToast('直前の散歩を再開しました'),0);}}));
    document.querySelectorAll('[data-discard-session-request]').forEach(el=>el.addEventListener('click',()=>{recordSheet='discard-confirm';render();}));
    document.querySelectorAll('[data-discard-session-confirm]').forEach(el=>el.addEventListener('click',()=>{discardCurrentSession();render();setTimeout(()=>showRecordToast('この散歩を破棄しました'),0);}));
    document.querySelectorAll('[data-parking-speech]').forEach(el=>{el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_e){}clearTimeout(parkingSpeechHoldTimer);parkingSpeechHoldTimer=setTimeout(()=>beginParkingSpeechHold(el),280);});el.addEventListener('pointerup',e=>{e.preventDefault();stopParkingSpeechHold();if(!parkingSpeechActive&&!parkingSpeechRecognition) showRecordToast('駐車情報は長押しで話してください');});el.addEventListener('pointercancel',stopParkingSpeechHold);});
    document.querySelectorAll('[data-parking-photo]').forEach(el=>el.addEventListener('click',captureParkingPhoto));
    document.querySelectorAll('[data-parking-action]').forEach(el=>el.addEventListener('click',()=>{const pin=activeParking();if(!pin) return;const action=el.dataset.parkingAction;if(action==='map'){active='record';recordSheet='';mapFollow=false;mapCenter={lat:pin.lat??mapCenter.lat,lng:pin.lng??mapCenter.lng};render();setTimeout(()=>showRecordToast('駐車位置を地図中央に表示しました'),0);}else if(action==='route'){if(pin.lat==null){showRecordToast('駐車位置を自動補完中です');return;}window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=walking`,'_blank','noopener');}else if(action==='photo') showParkingPhoto(pin);else if(action==='note'){showRecordToast(pin.parking?.speechText||pin.note||'音声・メモはありません');}else if(action==='arrived'){pin.clearedAt=Date.now();activeParkingId='';persistRecordState();recordSheet='';render();setTimeout(()=>showRecordToast('駐車位置の常時表示を終了しました'),0);}}));
    document.querySelectorAll('[data-close-sheet]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();blockUnderlyingNavigation();recordSheet='';memoDraft='';editingRecordId=null;render();}));
    document.querySelectorAll('[data-record-target]').forEach(el=>el.addEventListener('click',()=>{recordTarget=el.dataset.recordTarget;recordSheet='';persistRecordState();render();setTimeout(()=>showRecordToast(`記録先を「${recordTarget}」に変更しました`),0);}));
    document.querySelectorAll('[data-record-detail]').forEach(el=>el.addEventListener('click',()=>{recordSheet='detail';render();}));
    document.querySelectorAll('[data-pin-category]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-pin-category]').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');const parking=document.getElementById('parkingFields');if(parking) parking.classList.toggle('show',el.dataset.pinCategory==='parking');}));
    document.querySelectorAll('[data-record-action]').forEach(el=>{
      const action=el.dataset.recordAction;
      if(action==='talk'){
        el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_e){}clearTimeout(speechHoldTimer);speechHoldTimer=setTimeout(()=>beginSpeechHold(el),280);});
        el.addEventListener('pointerup',e=>{e.preventDefault();stopSpeechHold();if(!speechActive&&!speechRecognition) showRecordToast('「話す」は長押ししてください');});
        el.addEventListener('pointercancel',stopSpeechHold);return;
      }
      el.addEventListener('click',()=>{
        if(action==='session'){
          let toast='';
          if(recordSessionState==='idle'){
            clearRecoverableSession();
            currentSessionId=newId('session');
            sessionStartedAt=Date.now();
            resumeBreakPending=false;
            const freshCurrent=currentPosition&&Date.now()-Number(currentPosition.time||0)<=15000;
            trackPoints=freshCurrent?[{...currentPosition,time:Date.now()}]:[];
            savedPins=savedPins.filter(pin=>pin.category==='parking'&&!pin.clearedAt);
            elapsedMs=0;
            activeStartedAt=Date.now();
            recordSessionState='active';
            mapFollow=true;
            gpsStatus=freshCurrent?`GPS記録中 ±${currentPosition.accuracy||'-'}m`:'GPSを取得しています';
            toast='散歩記録を開始しました';
          }else if(recordSessionState==='active'){
            elapsedMs=elapsedNow();
            activeStartedAt=0;
            recordSessionState='paused';
            stopGeoWatch();
            releaseScreenAwake();
            gpsStatus=currentPosition?`一時停止中・現在地取得済み ±${currentPosition.accuracy||'-'}m`:'一時停止中';
            toast='散歩記録を一時停止しました';
          }else{
            activeStartedAt=Date.now();
            recordSessionState='active';
            gpsStatus=currentPosition?`GPS記録中 ±${currentPosition.accuracy||'-'}m`:'GPSを取得しています';
            toast='散歩記録を再開しました';
          }
          persistRecordState();render();if(recordSessionState==='active') keepScreenAwake();setTimeout(()=>showRecordToast(toast),0);
        }else if(action==='map-mode'){mapMode=(mapMode+1)%2;persistRecordState();render();}
        else if(action==='current') centerMapOnCurrent();
        else if(action==='pin') addCurrentPin();
        else if(action==='photo'||action==='video') openCapture(action);
        else if(action==='memo'){memoDraft='';editingRecordId=null;recordSheet='memo';render();}
        else if(action==='google-map'){const p=currentPosition||mapCenter;window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`,'_blank','noopener');}
      });
    });
    const saveMemo=document.querySelector('[data-save-memo]');if(saveMemo) saveMemo.addEventListener('click',()=>{const text=document.getElementById('recordMemo').value.trim();if(!text){showRecordToast('メモを入力してください');return;}const loc=locationSnapshot();if(editingRecordId){const old=savedRecords.find(x=>x.id===editingRecordId);const record=saveRecord(old?.kind||'speech',{...(old||{}),id:editingRecordId,text},old?.location||loc);editingRecordId=null;memoDraft='';recordSheet='';render();setTimeout(()=>showRecordToast('文字起こしを更新しました'),0);}else{saveRecord('memo',{text},loc);memoDraft='';recordSheet='';render();setTimeout(()=>showRecordToast('メモを位置つきで保存しました'),0);}});
    const savePin=document.querySelector('[data-save-pin-detail]');if(savePin) savePin.addEventListener('click',()=>{const pin=savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1];if(!pin) return;const selected=document.querySelector('[data-pin-category].selected');pin.category=selected?selected.dataset.pinCategory:(pin.category||'unclassified');const names={water:'水飲み場',toilet:'トイレ',parking:'駐車場',vending:'自販機',bench:'ベンチ',shade:'日陰・休憩',entrance:'出入口',caution:'注意場所',other:'その他',unclassified:'未分類の場所'};pin.label=names[pin.category]||'未分類の場所';pin.note=(document.getElementById('pinNote')?.value||'').trim();pin.parking=pin.category==='parking'?{...(pin.parking||{}),floor:(document.getElementById('parkingFloor')?.value||pin.parking?.floor||'').trim(),area:(document.getElementById('parkingArea')?.value||pin.parking?.area||'').trim(),number:(document.getElementById('parkingNumber')?.value||pin.parking?.number||'').trim()}:{};if(pin.category==='parking'){activeParkingId=pin.id;pin.sessionId=null;}const loc={lat:pin.lat,lng:pin.lng,accuracy:pin.accuracy,time:pin.time,pending:pin.lat==null};saveRecord('pin',{id:pin.id,category:pin.category,label:pin.label,note:pin.note,parking:pin.parking,sessionId:pin.category==='parking'?null:pin.sessionId,keepWithParking:pin.category==='parking'},loc);persistRecordState();recordSheet='';render();setTimeout(()=>showRecordToast(`${pin.label}として保存しました`),0);});
    const finish=document.querySelector('[data-finish-session]');if(finish) finish.addEventListener('click',()=>{
      const finishedElapsed=elapsedNow();
      const finishedDistance=sessionDistanceKm();
      autoAttachMissingLocations();
      const hasAnyLocation=trackPoints.some(p=>p.lat!=null)||savedPins.some(p=>p.lat!=null)||savedRecords.some(r=>r.sessionId===currentSessionId&&r.location&&r.location.lat!=null);
      recoverableSession=snapshotCurrentSession(finishedElapsed,finishedDistance);
      localStorage.setItem('outbase_last_session_summary',JSON.stringify({finishedAt:recoverableSession.finishedAt,target:recordTarget,elapsedMs:finishedElapsed,distanceKm:finishedDistance,trackPoints:[...trackPoints]}));
      resetSessionToIdle();
      persistRecordState();render();setTimeout(()=>showRecordToast(hasAnyLocation?'散歩記録を保存しました。間違いなら再開できます':'散歩記録を保存しました。今回は位置情報を取得できませんでした'),0);
    });
  }

  function render(){
    const modalOpen=anySheetOpen()&&prepSheet!=='gear-manager';
    document.getElementById('app').innerHTML=`<div class="appShell ${modalOpen?'hasModal':''}">${header()}<main>${planPage()}${searchPage()}${prepPage()}${recordPage()}${memoryPage()}</main>${parkingRecallButton()}${nav()}${planSheetMarkup()}${prepSheetMarkup()}${sheetMarkup()}</div>`;
    document.querySelectorAll('.navBtn').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if((anySheetOpen()&&prepSheet!=='gear-manager')||Date.now()<modalTapBlockUntil)return;if(prepSheet==='gear-manager'){prepSheet='';libraryCloseEditor();}active=btn.dataset.tab;recordSheet='';planSheet='';prepSheet='';prepModuleId='';history.replaceState(null,'',`?tab=${active}&v=clean-v6-library10a`);render();window.scrollTo({top:0,behavior:'instant'});}));
    bindPlanActions();
    bindPrepActions();
    bindRecordActions();
    document.querySelectorAll('.recordSheetBackdrop,.planSheetBackdrop,.prepSheetBackdrop').forEach(backdrop=>{
      const panel=backdrop.querySelector('.recordSheet,.planSheet,[data-prep-sheet-panel]');let sy=0,dy=0;
      backdrop.addEventListener('click',e=>{if(e.target!==backdrop)return;if(backdrop.classList.contains('prepSheetBackdrop')){prepSheet='';prepModuleId='';}else if(backdrop.classList.contains('planSheetBackdrop'))planSheet='';else recordSheet='';render();});
      if(panel){panel.addEventListener('touchstart',e=>{sy=e.touches[0]?.clientY||0;dy=0},{passive:true});panel.addEventListener('touchmove',e=>{dy=(e.touches[0]?.clientY||sy)-sy},{passive:true});panel.addEventListener('touchend',()=>{if(dy>100){if(backdrop.classList.contains('prepSheetBackdrop')){prepSheet='';prepModuleId='';}else if(backdrop.classList.contains('planSheetBackdrop'))planSheet='';else recordSheet='';render();}});}
    });
    initializeRecordRuntime();
    if(prepSheet==='gear-manager')setTimeout(restoreLibraryScroll,0);
  }

  ['pointerdown','pointerup','click'].forEach(type=>document.addEventListener(type,e=>{
    if(((anySheetOpen()&&prepSheet!=='gear-manager')||Date.now()<modalTapBlockUntil)&&e.target.closest?.('.bottomNav')){e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true,passive:false}));

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(recordSessionState==='active'){keepScreenAwake();startGeoWatch();}checkPlanReminders();}});
  render();
  checkPlanReminders();
  planReminderTimer=setInterval(checkPlanReminders,30000);
})();

/* OUTBASE Library10A HOTFIX3 integrated */
(function(){
  'use strict';

  const EVENT_KEY='outbase_asset_events_v1';
  const GEAR_KEY='outbase_gear_library_v1';
  const KIT_KEY='outbase_gear_kits_v1';
  const EDITOR_TYPE_KEY='outbase_library_hotfix_editor_type';
  const EDITOR_ID_KEY='outbase_library_hotfix_editor_id';
  const SCROLL_PREFIX='outbase_library_scroll_fix3:';
  const HOTFIX_VERSION='Library10A-HOTFIX3';

  const readJson=(key,fallback)=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw==null)return fallback;
      const value=JSON.parse(raw);
      return value==null?fallback:value;
    }catch(_e){return fallback;}
  };
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const makeId=()=>`event-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const today=()=>new Date().toISOString().slice(0,10);

  function currentScrollKey(){
    const tab=localStorage.getItem('outbase_library_tab_v1')||'gear';
    const view=localStorage.getItem('outbase_library_gear_view_v1')||'items';
    return SCROLL_PREFIX+(tab==='gear'?`${tab}:${view}`:tab);
  }

  function saveScroll(){
    const scroller=document.querySelector('.libraryPageScroll');
    if(scroller)sessionStorage.setItem(currentScrollKey(),String(scroller.scrollTop||0));
  }

  function restoreScroll(){
    const scroller=document.querySelector('.libraryPageScroll');
    if(!scroller)return;
    const value=Math.max(0,Number(sessionStorage.getItem(currentScrollKey())||0));
    requestAnimationFrame(()=>requestAnimationFrame(()=>{scroller.scrollTop=value;}));
  }

  function fixTransferIcon(){
    const candidates=[
      '[data-transfer-section="bulk"]',
      '[data-transfer-section="register"]',
      '[data-library-transfer="bulk"]'
    ];
    const button=document.querySelector(candidates.join(','));
    if(!button)return;
    const icon=button.querySelector('i');
    if(icon&&(!icon.innerHTML.trim()||icon.textContent.trim()==='undefined')){
      icon.innerHTML='<span aria-hidden="true" style="font-size:24px;font-weight:700;line-height:1">＋</span>';
    }
    Array.from(button.childNodes).forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE&&node.textContent.includes('undefined')){
        node.textContent=node.textContent.replace(/undefined/g,'');
      }
    });
  }

  function bindScroller(){
    const scroller=document.querySelector('.libraryPageScroll');
    if(!scroller)return;
    if(scroller.dataset.hotfixScrollBound!==HOTFIX_VERSION){
      scroller.dataset.hotfixScrollBound=HOTFIX_VERSION;
      scroller.addEventListener('scroll',()=>{
        sessionStorage.setItem(currentScrollKey(),String(scroller.scrollTop||0));
      },{passive:true});
    }
    restoreScroll();
  }

  function normalizeKitReferences(){
    const gears=readJson(GEAR_KEY,[]);
    const kits=readJson(KIT_KEY,[]);
    if(!Array.isArray(gears)||!Array.isArray(kits))return;
    const ids=new Set(gears.map(x=>x&&x.id).filter(Boolean));
    let changed=false;
    const next=kits.map(kit=>{
      if(!kit||typeof kit!=='object')return kit;
      const originalGearIds=Array.isArray(kit.gearIds)?kit.gearIds:[];
      const originalRequiredIds=Array.isArray(kit.requiredGearIds)?kit.requiredGearIds:[];
      const gearIds=originalGearIds.filter(id=>ids.has(id));
      const requiredGearIds=originalRequiredIds.filter(id=>gearIds.includes(id));
      if(JSON.stringify(gearIds)!==JSON.stringify(originalGearIds)||JSON.stringify(requiredGearIds)!==JSON.stringify(originalRequiredIds))changed=true;
      return {...kit,gearIds,requiredGearIds};
    });
    if(changed)writeJson(KIT_KEY,next);
  }

  function closeEditor(){
    const close=document.querySelector('[data-library-editor-close]');
    if(close){close.click();return;}
    const backdrop=document.querySelector('.libraryEditorBackdrop');
    if(backdrop)backdrop.remove();
  }

  function showSavedFeedback(){
    const toast=document.createElement('div');
    toast.textContent='共通台帳へ保存しました';
    toast.setAttribute('role','status');
    Object.assign(toast.style,{
      position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',
      zIndex:'99999',background:'#0b2a20',color:'#fff',padding:'12px 18px',
      borderRadius:'999px',boxShadow:'0 8px 24px rgba(0,0,0,.24)',
      fontSize:'14px',fontWeight:'700',whiteSpace:'nowrap'
    });
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),1800);
  }

  function saveAssetEvent(){
    const targetRaw=document.getElementById('lib-event-target')?.value||'';
    const splitIndex=targetRaw.indexOf(':');
    const targetType=splitIndex>=0?targetRaw.slice(0,splitIndex):'';
    const targetId=splitIndex>=0?targetRaw.slice(splitIndex+1):'';
    const eventType=document.getElementById('lib-event-type')?.value||'使用';
    const date=document.getElementById('lib-event-date')?.value||today();
    const title=(document.getElementById('lib-name')?.value||'').trim();
    const detail=(document.getElementById('lib-memo')?.value||'').trim();
    const rawCost=document.getElementById('lib-event-cost')?.value??'';
    const nextDate=document.getElementById('lib-event-next')?.value||'';

    if(!targetId){alert('対象を選択してください');return false;}
    if(!title){alert('内容を入力してください');return false;}

    const stored=readJson(EVENT_KEY,[]);
    const rows=Array.isArray(stored)?stored.slice():[];
    const editingId=sessionStorage.getItem(EDITOR_ID_KEY)||'';
    const index=editingId?rows.findIndex(x=>x&&x.id===editingId):-1;
    const previous=index>=0?rows[index]:null;
    const row={
      id:previous?.id||makeId(),
      targetType:['gear','mobility','pet'].includes(targetType)?targetType:'gear',
      targetId,
      eventType,
      date,
      title,
      detail,
      cost:rawCost===''?'':Math.max(0,Number(rawCost)||0),
      nextDate,
      createdAt:Number(previous?.createdAt||Date.now()),
      updatedAt:Date.now()
    };

    if(index>=0)rows[index]={...previous,...row};else rows.unshift(row);
    writeJson(EVENT_KEY,rows);
    sessionStorage.removeItem(EDITOR_ID_KEY);
    sessionStorage.removeItem(EDITOR_TYPE_KEY);
    showSavedFeedback();
    closeEditor();
    setTimeout(()=>location.reload(),120);
    return true;
  }

  document.addEventListener('click',event=>{
    const edit=event.target.closest?.('[data-library-edit]');
    if(edit){
      sessionStorage.setItem(EDITOR_TYPE_KEY,edit.dataset.libraryEdit||'');
      sessionStorage.setItem(EDITOR_ID_KEY,edit.dataset.libraryId||'');
    }

    const add=event.target.closest?.('[data-library-add]');
    if(add){
      sessionStorage.setItem(EDITOR_TYPE_KEY,add.dataset.libraryAdd||'');
      sessionStorage.removeItem(EDITOR_ID_KEY);
    }

    const tab=event.target.closest?.('[data-library-tab],[data-library-gear-view],[data-dashboard-jump]');
    if(tab){
      saveScroll();
      setTimeout(()=>{bindScroller();fixTransferIcon();},70);
    }

    const button=event.target.closest?.('button');
    const save=event.target.closest?.('[data-library-save],[data-library-editor-save],[data-save-library]')
      ||(button&&document.querySelector('.libraryEditor')&&document.getElementById('lib-event-target')&&button.textContent.trim()==='保存'?button:null);
    if(save&&document.getElementById('lib-event-target')){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      saveAssetEvent();
      return;
    }

    const del=event.target.closest?.('[data-library-delete]');
    if(del&&sessionStorage.getItem(EDITOR_TYPE_KEY)==='gear'){
      setTimeout(normalizeKitReferences,120);
    }
  },true);

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')saveScroll();
  });
  window.addEventListener('pagehide',saveScroll);

  const observer=new MutationObserver(()=>{
    bindScroller();
    fixTransferIcon();
  });

  window.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.dataset.outbaseHotfix=HOTFIX_VERSION;
    observer.observe(document.body,{childList:true,subtree:true});
    bindScroller();
    fixTransferIcon();
    normalizeKitReferences();
  });
})();

/* OUTBASE FIELD03 Canonical4: asset import implementation */
(function(){
  'use strict';
  const GEAR_KEY='outbase_gear_library_v1';

  const readJson=(key,fallback)=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw==null)return fallback;
      const value=JSON.parse(raw);
      return value==null?fallback:value;
    }catch(_e){return fallback;}
  };
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const makeId=()=>`gear-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function notify(message){
    const old=document.getElementById('outbaseImportToast');
    if(old)old.remove();
    const toast=document.createElement('div');
    toast.id='outbaseImportToast';
    toast.textContent=message;
    Object.assign(toast.style,{
      position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',
      zIndex:'100000',background:'#0b2a20',color:'#fff',padding:'12px 18px',
      borderRadius:'999px',boxShadow:'0 8px 24px rgba(0,0,0,.24)',
      fontSize:'14px',fontWeight:'700',whiteSpace:'nowrap',maxWidth:'88vw',
      overflow:'hidden',textOverflow:'ellipsis'
    });
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),2600);
  }

  function normalizeText(value){
    return String(value??'').replace(/\s+/g,' ').trim();
  }

  function uniqueNames(names){
    const seen=new Set();
    return names.map(normalizeText).filter(name=>{
      const key=name.toLowerCase();
      if(!name||seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }

  function addGearNames(names,category='その他',brand=''){
    const list=readJson(GEAR_KEY,[]);
    const rows=Array.isArray(list)?list.slice():[];
    const existing=new Set(rows.map(x=>normalizeText(x?.name).toLowerCase()).filter(Boolean));
    let added=0;
    uniqueNames(names).forEach(name=>{
      const key=name.toLowerCase();
      if(existing.has(key))return;
      rows.push({
        id:makeId(),name,category,quantity:1,brand,storage:'自宅',model:'',
        role:'本体',relations:[],condition:'使用可',purchaseDate:'',
        purchasePrice:'',tags:['取込'],memo:'取込機能から追加',
        favorite:false,stockAmount:'',stockUnit:'個',reorderPoint:'',
        stockStep:'1',openedDate:'',expiryDate:'',updatedAt:Date.now()
      });
      existing.add(key);added++;
    });
    writeJson(GEAR_KEY,rows);
    return added;
  }

  function extractNamesFromRows(rows){
    const preferred=['名称','商品名','品名','ギア名','name','Name','NAME','item','Item'];
    const names=[];
    rows.forEach(row=>{
      if(Array.isArray(row)){
        const first=row.map(normalizeText).find(Boolean);
        if(first)names.push(first);
        return;
      }
      if(!row||typeof row!=='object')return;
      let value='';
      for(const key of preferred){
        if(row[key]!=null&&normalizeText(row[key])){value=normalizeText(row[key]);break;}
      }
      if(!value){
        value=Object.values(row).map(normalizeText).find(Boolean)||'';
      }
      if(value)names.push(value);
    });
    return names;
  }

  function ensureInput(id,accept){
    let input=document.getElementById(id);
    if(input)return input;
    input=document.createElement('input');
    input.id=id;input.type='file';input.accept=accept;input.hidden=true;
    document.body.appendChild(input);
    return input;
  }

  async function handleSpreadsheet(file){
    if(!window.XLSX){
      notify('Excel読込ライブラリを読み込めませんでした');
      return;
    }
    try{
      const data=await file.arrayBuffer();
      const book=window.XLSX.read(data,{type:'array'});
      const names=[];
      book.SheetNames.forEach(sheetName=>{
        const sheet=book.Sheets[sheetName];
        const rows=window.XLSX.utils.sheet_to_json(sheet,{defval:''});
        names.push(...extractNamesFromRows(rows));
      });
      const added=addGearNames(names);
      notify(added?`${added}件を共通台帳へ追加しました`:'追加できる新しい品名がありません');
      if(added)setTimeout(()=>location.reload(),600);
    }catch(error){
      console.error(error);
      notify('Excelを読み込めませんでした');
    }
  }


  async function handlePdf(file){
    if(!window.pdfjsLib){
      notify('PDF読込ライブラリを読み込めませんでした');
      return;
    }
    try{
      notify('PDFの文字を読み取っています');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
      const lines=[];
      const maxPages=Math.min(pdf.numPages,30);
      for(let pageNo=1;pageNo<=maxPages;pageNo++){
        const page=await pdf.getPage(pageNo);
        const content=await page.getTextContent();
        const pageText=content.items.map(item=>String(item.str||'')).join(' ');
        lines.push(...pageText.split(/\s{2,}|\r?\n/));
      }
      const candidates=lines
        .map(line=>normalizeText(line))
        .filter(line=>line.length>=2&&line.length<=100)
        .filter(line=>!(/^[\d\s.,¥￥$()\-/:]+$/.test(line)));
      const added=addGearNames(candidates);
      notify(added?`${added}件をPDFから候補登録しました`:'PDFから新しい品名候補を見つけられませんでした');
      if(added)setTimeout(()=>location.reload(),700);
    }catch(error){
      console.error(error);
      notify('PDFを読み取れませんでした');
    }
  }

  async function handleImage(file){
    if(!window.Tesseract){
      notify('写真文字読取を利用できません');
      return;
    }
    try{
      notify('写真の文字を読み取っています');
      const result=await window.Tesseract.recognize(file,'jpn+eng');
      const text=String(result?.data?.text||'');
      const candidates=text.split(/\r?\n/)
        .map(line=>normalizeText(line))
        .filter(line=>line.length>=2&&line.length<=80)
        .filter(line=>!(/^[\d\s.,¥￥$-]+$/.test(line)));
      const added=addGearNames(candidates);
      notify(added?`${added}件を候補として追加しました`:'品名候補を見つけられませんでした');
      if(added)setTimeout(()=>location.reload(),700);
    }catch(error){
      console.error(error);
      notify('写真の文字を読み取れませんでした');
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-library-placeholder]');
    if(!button)return;
    const label=button.dataset.libraryPlaceholder||'';

    if(label==='Excel取込'){
      event.preventDefault();
      event.stopImmediatePropagation();
      const input=ensureInput('outbaseSpreadsheetImport','.xlsx,.xls,.csv');
      input.value='';
      input.onchange=()=>{const file=input.files?.[0];if(file)handleSpreadsheet(file);};
      input.click();
      return;
    }

    if(label==='PDF・写真取込'){
      event.preventDefault();
      event.stopImmediatePropagation();
      const input=ensureInput('outbaseImageImport','application/pdf,image/*');
      input.value='';
      input.onchange=()=>{
        const file=input.files?.[0];
        if(!file)return;
        if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))handlePdf(file);
        else handleImage(file);
      };
      input.click();
    }
  },true);
})();

/* OUTBASE FIELD03 Integrated Complete Backup */
(function(){
  'use strict';
  const PREFIX='outbase_';
  const DB_NAME='outbase_db';

  function toast(message){
    const old=document.getElementById('outbaseBackupToast');
    if(old)old.remove();
    const el=document.createElement('div');
    el.id='outbaseBackupToast';
    el.textContent=message;
    Object.assign(el.style,{
      position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',
      zIndex:'100000',background:'#0b2a20',color:'#fff',padding:'12px 18px',
      borderRadius:'999px',fontSize:'14px',fontWeight:'700',maxWidth:'88vw'
    });
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }

  function collectLocalStorage(){
    const data={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key.startsWith(PREFIX))data[key]=localStorage.getItem(key);
    }
    return data;
  }

  const blobToDataUrl=blob=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(blob);
  });

  async function serializeValue(value){
    if(value instanceof Blob){
      return {
        __outbaseType:'Blob',
        type:value.type,
        dataUrl:await blobToDataUrl(value)
      };
    }
    if(Array.isArray(value)){
      return Promise.all(value.map(serializeValue));
    }
    if(value&&typeof value==='object'){
      const result={};
      for(const [key,item] of Object.entries(value)){
        result[key]=await serializeValue(item);
      }
      return result;
    }
    return value;
  }

  async function deserializeValue(value){
    if(value&&value.__outbaseType==='Blob'&&value.dataUrl){
      const response=await fetch(value.dataUrl);
      return response.blob();
    }
    if(Array.isArray(value)){
      return Promise.all(value.map(deserializeValue));
    }
    if(value&&typeof value==='object'){
      const result={};
      for(const [key,item] of Object.entries(value)){
        result[key]=await deserializeValue(item);
      }
      return result;
    }
    return value;
  }

  const openDb=()=>new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){resolve(null);return;}
    const req=indexedDB.open(DB_NAME);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onupgradeneeded=()=>resolve(req.result);
  });

  async function collectIndexedDb(){
    const db=await openDb();
    if(!db)return {};
    const output={};
    for(const storeName of Array.from(db.objectStoreNames)){
      const rows=await new Promise((resolve,reject)=>{
        const tx=db.transaction(storeName,'readonly');
        const req=tx.objectStore(storeName).getAll();
        req.onsuccess=()=>resolve(req.result||[]);
        req.onerror=()=>reject(req.error);
      });
      output[storeName]=await serializeValue(rows);
    }
    db.close();
    return output;
  }

  async function restoreIndexedDb(stores){
    if(!stores||typeof stores!=='object')return 0;
    const db=await openDb();
    if(!db)return 0;
    let count=0;
    for(const [storeName,serializedRows] of Object.entries(stores)){
      if(!db.objectStoreNames.contains(storeName))continue;
      const rows=await deserializeValue(serializedRows);
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(storeName,'readwrite');
        const store=tx.objectStore(storeName);
        store.clear();
        (Array.isArray(rows)?rows:[]).forEach(row=>store.put(row));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
      count+=(Array.isArray(rows)?rows.length:0);
    }
    db.close();
    return count;
  }

  async function exportBackup(){
    try{
      toast('全データをまとめています');
      const now=new Date();
      const stamp=now.toISOString().slice(0,16).replace(/[-:T]/g,'');
      const payload={
        format:'OUTBASE_COMPLETE_BACKUP',
        version:'OUTBASE_FIELD03_INTEGRATED_STABLE1',
        exportedAt:now.toISOString(),
        localStorage:collectLocalStorage(),
        indexedDB:await collectIndexedDb()
      };
      const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=`OUTBASE_COMPLETE_BACKUP_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('写真・音声を含む全体バックアップを書き出しました');
    }catch(error){
      console.error(error);
      alert('バックアップを作成できませんでした。');
    }
  }

  function ensureInput(){
    let input=document.getElementById('outbaseFullBackupImport');
    if(input)return input;
    input=document.createElement('input');
    input.id='outbaseFullBackupImport';
    input.type='file';
    input.accept='application/json,.json';
    input.hidden=true;
    document.body.appendChild(input);
    return input;
  }

  async function restoreBackup(file){
    try{
      toast('バックアップを確認しています');
      const payload=JSON.parse(await file.text());
      const valid=payload&&(
        payload.format==='OUTBASE_COMPLETE_BACKUP'||
        payload.format==='OUTBASE_BACKUP'
      )&&typeof payload.localStorage==='object';
      if(!valid)throw new Error('invalid backup');

      const keys=Object.keys(payload.localStorage).filter(key=>key.startsWith(PREFIX));
      if(!confirm(`${keys.length}件の設定・記録と保存メディアを復元します。
現在の同名データは上書きされます。`))return;

      keys.forEach(key=>{
        const value=payload.localStorage[key];
        if(value==null)localStorage.removeItem(key);
        else localStorage.setItem(key,String(value));
      });
      const mediaCount=await restoreIndexedDb(payload.indexedDB||{});
      toast(`${keys.length}件＋メディア${mediaCount}件を復元しました`);
      setTimeout(()=>location.reload(),900);
    }catch(error){
      console.error(error);
      alert('OUTBASEバックアップを読み込めませんでした。');
    }
  }

  document.addEventListener('click',event=>{
    const exportButton=event.target.closest?.('[data-library-export]');
    if(exportButton){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      exportBackup();
      return;
    }
    const importButton=event.target.closest?.('[data-library-import-open]');
    if(importButton){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const input=ensureInput();
      input.value='';
      input.onchange=()=>{
        const file=input.files?.[0];
        if(file)restoreBackup(file);
      };
      input.click();
    }
  },true);
})();

/* OUTBASE FIELD03 Canonical7: memory detail viewer */
(function(){
  'use strict';
  const RECORD_KEY='outbase_record_saved_records';

  const readRecords=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(RECORD_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(_e){return [];}
  };

  const escapeHtml=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const formatTime=value=>{
    const date=new Date(Number(value||0));
    if(Number.isNaN(date.getTime()))return '';
    return date.toLocaleString('ja-JP',{
      year:'numeric',month:'numeric',day:'numeric',
      hour:'2-digit',minute:'2-digit'
    });
  };

  const kindLabel=kind=>({
    photo:'写真',video:'動画',speech:'音声',memo:'メモ',pin:'場所'
  }[kind]||'記録');

  function matchingRecords(key){
    return readRecords()
      .filter(record=>{
        const date=new Date(Number(record.createdAt||Date.now())).toISOString().slice(0,10);
        const recordKey=record.sessionId||`${record.target||'未確認'}:${date}`;
        return recordKey===key;
      })
      .sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0));
  }

  function recordMarkup(record){
    const title=kindLabel(record.kind);
    const text=record.text||record.note||record.label||record.category||'';
    const location=record.location&&record.location.lat!=null
      ? `${Number(record.location.lat).toFixed(5)}, ${Number(record.location.lng).toFixed(5)}`
      : '';
    const media=record.previewUrl
      ? (record.kind==='video'
        ? `<video controls playsinline src="${escapeHtml(record.previewUrl)}"></video>`
        : `<img src="${escapeHtml(record.previewUrl)}" alt="">`)
      : '';

    return `<article class="memoryDetailItem">
      <div class="memoryDetailMeta">
        <b>${escapeHtml(title)}</b>
        <time>${escapeHtml(formatTime(record.createdAt))}</time>
      </div>
      ${media}
      ${text?`<p>${escapeHtml(text)}</p>`:''}
      ${location?`<small>位置：${escapeHtml(location)}</small>`:''}
    </article>`;
  }

  function closeViewer(){
    document.getElementById('outbaseMemoryDetail')?.remove();
    document.body.classList.remove('memoryDetailOpen');
  }

  function openViewer(key){
    const records=matchingRecords(key);
    if(!records.length)return;

    closeViewer();

    const title=records[0].target||'思い出';
    const overlay=document.createElement('div');
    overlay.id='outbaseMemoryDetail';
    overlay.className='memoryDetailBackdrop';
    overlay.innerHTML=`<section class="memoryDetailSheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header>
        <div>
          <small>MEMORY DETAIL</small>
          <h2>${escapeHtml(title)}</h2>
          <p>${records.length}件の記録</p>
        </div>
        <button type="button" data-memory-detail-close aria-label="閉じる">×</button>
      </header>
      <div class="memoryDetailBody">
        ${records.map(recordMarkup).join('')}
      </div>
    </section>`;

    document.body.appendChild(overlay);
    document.body.classList.add('memoryDetailOpen');

    overlay.addEventListener('click',event=>{
      if(event.target===overlay||event.target.closest?.('[data-memory-detail-close]')){
        closeViewer();
      }
    });
  }

  document.addEventListener('click',event=>{
    const row=event.target.closest?.('[data-memory-session]');
    if(!row)return;
    event.preventDefault();
    event.stopPropagation();
    openViewer(row.dataset.memorySession||'');
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')closeViewer();
  });
})();

/* OUTBASE FIELD03 Integrated Search/Review/Relations */
(function(){
  'use strict';

  const KEYS={
    records:'outbase_record_saved_records',
    gear:'outbase_gear_library_v1',
    plans:'outbase_plans_v1',
    reviews:'outbase_memory_reviews_v1'
  };

  const readJson=(key,fallback)=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw==null)return fallback;
      const value=JSON.parse(raw);
      return value==null?fallback:value;
    }catch(_e){return fallback;}
  };

  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const normalize=value=>String(value??'').toLowerCase().replace(/\s+/g,' ').trim();

  const unique=list=>{
    const seen=new Set();
    return list.filter(item=>{
      const key=normalize(item);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    });
  };

  function allRecords(){
    const rows=readJson(KEYS.records,[]);
    return Array.isArray(rows)?rows:[];
  }

  function allGear(){
    const rows=readJson(KEYS.gear,[]);
    return Array.isArray(rows)?rows:[];
  }

  function allPlans(){
    const candidates=[
      readJson(KEYS.plans,[]),
      readJson('outbase_plan_library_v1',[]),
      readJson('outbase_plan_list_v1',[])
    ];
    const merged=[];
    candidates.forEach(rows=>{
      if(Array.isArray(rows))merged.push(...rows);
    });
    return merged;
  }

  function memoryKey(record){
    const date=new Date(Number(record.createdAt||Date.now())).toISOString().slice(0,10);
    return record.sessionId||`${record.target||'未確認'}:${date}`;
  }

  function groupRecords(){
    const map=new Map();
    allRecords().forEach(record=>{
      const key=memoryKey(record);
      if(!map.has(key)){
        map.set(key,{
          key,
          title:record.target||'未確認の記録',
          createdAt:Number(record.createdAt||0),
          records:[]
        });
      }
      const group=map.get(key);
      group.records.push(record);
      group.createdAt=Math.max(group.createdAt,Number(record.createdAt||0));
    });
    return [...map.values()].sort((a,b)=>b.createdAt-a.createdAt);
  }

  function buildIndex(){
    const index=[];

    groupRecords().forEach(group=>{
      const body=group.records.map(record=>[
        record.text,record.note,record.label,record.category,record.kind,
        record.location?.lat,record.location?.lng
      ].filter(Boolean).join(' ')).join(' ');
      index.push({
        type:'memory',
        id:group.key,
        title:group.title,
        subtitle:`${group.records.length}件の記録`,
        text:`${group.title} ${body}`,
        date:group.createdAt
      });
    });

    allGear().forEach(item=>{
      index.push({
        type:'gear',
        id:item.id||item.name,
        title:item.name||'名称未設定',
        subtitle:[item.category,item.brand,item.model].filter(Boolean).join('・')||'資産',
        text:[
          item.name,item.category,item.brand,item.model,item.memo,
          ...(Array.isArray(item.tags)?item.tags:[])
        ].filter(Boolean).join(' '),
        date:Number(item.updatedAt||0)
      });
    });

    allPlans().forEach(plan=>{
      index.push({
        type:'plan',
        id:plan.id||plan.name||plan.title,
        title:plan.name||plan.title||'名称未設定プラン',
        subtitle:[plan.activityType||plan.type,plan.date||plan.startDate].filter(Boolean).join('・')||'プラン',
        text:[
          plan.name,plan.title,plan.activityType,plan.type,plan.location,
          plan.memo,plan.note,plan.date,plan.startDate,plan.endDate
        ].filter(Boolean).join(' '),
        date:Number(plan.updatedAt||plan.createdAt||0)
      });
    });

    return index;
  }

  function openSearch(){
    document.getElementById('outbaseGlobalSearch')?.remove();

    const overlay=document.createElement('div');
    overlay.id='outbaseGlobalSearch';
    overlay.className='outbaseSearchBackdrop';
    overlay.innerHTML=`<section class="outbaseSearchSheet" role="dialog" aria-modal="true">
      <header>
        <div>
          <small>OUTBASE SEARCH</small>
          <h2>すべてから探す</h2>
        </div>
        <button type="button" data-search-close aria-label="閉じる">×</button>
      </header>
      <div class="outbaseSearchControls">
        <input id="outbaseSearchInput" type="search" placeholder="場所・ギア・メモ・日付で検索">
        <div class="outbaseSearchFilters">
          <button class="active" data-search-filter="all">すべて</button>
          <button data-search-filter="memory">思い出</button>
          <button data-search-filter="gear">資産</button>
          <button data-search-filter="plan">プラン</button>
        </div>
      </div>
      <div id="outbaseSearchResults" class="outbaseSearchResults"></div>
    </section>`;

    document.body.appendChild(overlay);
    document.body.classList.add('outbaseSearchOpen');

    let filter='all';

    const render=()=>{
      const q=normalize(document.getElementById('outbaseSearchInput')?.value||'');
      const rows=buildIndex()
        .filter(item=>filter==='all'||item.type===filter)
        .filter(item=>!q||normalize(`${item.title} ${item.subtitle} ${item.text}`).includes(q))
        .slice(0,100);

      const root=document.getElementById('outbaseSearchResults');
      if(!root)return;

      root.innerHTML=rows.length?rows.map(item=>{
        const label={memory:'思い出',gear:'資産',plan:'プラン'}[item.type]||item.type;
        return `<button class="outbaseSearchResult" data-search-open="${esc(item.type)}" data-search-id="${esc(item.id)}">
          <span class="outbaseSearchType">${esc(label)}</span>
          <div>
            <b>${esc(item.title)}</b>
            <p>${esc(item.subtitle)}</p>
          </div>
          <strong>›</strong>
        </button>`;
      }).join(''):`<div class="outbaseSearchEmpty">一致するデータがありません。</div>`;
    };

    overlay.addEventListener('click',event=>{
      if(event.target===overlay||event.target.closest?.('[data-search-close]')){
        overlay.remove();
        document.body.classList.remove('outbaseSearchOpen');
        return;
      }

      const filterButton=event.target.closest?.('[data-search-filter]');
      if(filterButton){
        filter=filterButton.dataset.searchFilter||'all';
        overlay.querySelectorAll('[data-search-filter]').forEach(button=>button.classList.toggle('active',button===filterButton));
        render();
        return;
      }

      const result=event.target.closest?.('[data-search-open]');
      if(result){
        const type=result.dataset.searchOpen;
        const id=result.dataset.searchId||'';
        overlay.remove();
        document.body.classList.remove('outbaseSearchOpen');

        if(type==='memory'){
          const target=document.querySelector(`[data-memory-session="${CSS.escape(id)}"]`);
          if(target){
            target.scrollIntoView({behavior:'smooth',block:'center'});
            target.click();
          }else{
            localStorage.setItem('outbase_active_tab_v1','memory');
            location.hash='memory';
            setTimeout(()=>document.querySelector(`[data-memory-session="${CSS.escape(id)}"]`)?.click(),250);
          }
          return;
        }

        if(type==='gear'){
          localStorage.setItem('outbase_library_tab_v1','gear');
          const tab=document.querySelector('[data-main-tab="library"],[data-tab="library"]');
          tab?.click();
          setTimeout(()=>{
            const item=document.querySelector(`[data-library-id="${CSS.escape(id)}"]`);
            item?.scrollIntoView({behavior:'smooth',block:'center'});
            item?.classList.add('outbaseFlash');
            setTimeout(()=>item?.classList.remove('outbaseFlash'),1800);
          },250);
          return;
        }

        if(type==='plan'){
          localStorage.setItem('outbase_active_tab_v1','plan');
          location.hash='plan';
        }
      }
    });

    overlay.querySelector('#outbaseSearchInput')?.addEventListener('input',render);
    overlay.querySelector('#outbaseSearchInput')?.focus();
    render();
  }

  function sessionReview(records){
    const kinds=records.reduce((acc,record)=>{
      acc[record.kind]=(acc[record.kind]||0)+1;
      return acc;
    },{});

    const texts=records.map(record=>record.text||record.note||record.label||'').filter(Boolean);
    const joined=normalize(texts.join(' '));

    const good=[];
    const improve=[];
    const next=[];

    if(kinds.photo)good.push(`写真を${kinds.photo}件残せています`);
    if(kinds.speech)good.push(`音声を${kinds.speech}件残せています`);
    if(kinds.memo)good.push(`メモを${kinds.memo}件残せています`);
    if(kinds.pin)good.push(`場所を${kinds.pin}件記録できています`);
    if(!good.length)good.push('現地の記録を残せています');

    if(!kinds.photo)improve.push('次回は写真を1枚以上残す');
    if(!kinds.memo&&!kinds.speech)improve.push('気づきをメモまたは音声で残す');
    if(!kinds.pin)improve.push('役立った場所を1か所記録する');
    if(joined.includes('忘れ'))next.push('忘れ物対策を準備リストへ追加');
    if(joined.includes('寒'))next.push('防寒装備を見直す');
    if(joined.includes('雨'))next.push('雨対策用品を確認する');
    if(joined.includes('暑'))next.push('暑さ対策用品を確認する');

    if(!improve.length)improve.push('今回の流れを次回も再現する');
    if(!next.length)next.push('今回使ったギアを次回候補にする');

    return {good,improve,next};
  }

  function relatedGear(records){
    const haystack=normalize(records.map(record=>[
      record.target,record.text,record.note,record.label,record.category
    ].filter(Boolean).join(' ')).join(' '));

    return allGear().filter(item=>{
      const tokens=unique([
        item.name,item.brand,item.model,item.category,
        ...(Array.isArray(item.tags)?item.tags:[])
      ].map(normalize).filter(token=>token.length>=2));
      return tokens.some(token=>haystack.includes(token));
    }).slice(0,8);
  }

  function injectReviewIntoMemoryDetail(){
    const sheet=document.querySelector('#outbaseMemoryDetail .memoryDetailSheet');
    if(!sheet||sheet.dataset.reviewInjected==='1')return;

    const title=sheet.querySelector('h2')?.textContent||'';
    const groups=groupRecords();
    const group=groups.find(item=>item.title===title)||groups[0];
    if(!group)return;

    const review=sessionReview(group.records);
    const gear=relatedGear(group.records);

    const section=document.createElement('section');
    section.className='memoryReviewPanel';
    section.innerHTML=`<div class="memoryReviewHead">
      <small>OUTBASE REVIEW</small>
      <h3>今回のまとめ</h3>
    </div>
    <div class="memoryReviewGrid">
      <article>
        <b>良かった点</b>
        <ul>${review.good.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
      </article>
      <article>
        <b>改善点</b>
        <ul>${review.improve.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
      </article>
      <article>
        <b>次回へ</b>
        <ul>${review.next.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
      </article>
    </div>
    ${gear.length?`<div class="memoryRelatedGear">
      <b>関連する資産</b>
      <div>${gear.map(item=>`<span>${esc(item.name||'名称未設定')}</span>`).join('')}</div>
    </div>`:''}`;

    sheet.querySelector('.memoryDetailBody')?.prepend(section);
    sheet.dataset.reviewInjected='1';

    const reviews=readJson(KEYS.reviews,{});
    reviews[group.key]={...review,gearIds:gear.map(item=>item.id),updatedAt:Date.now()};
    writeJson(KEYS.reviews,reviews);
  }

  const observer=new MutationObserver(()=>{
    injectReviewIntoMemoryDetail();
  });

  window.addEventListener('DOMContentLoaded',()=>{
    observer.observe(document.body,{childList:true,subtree:true});

    const button=document.createElement('button');
    button.type='button';
    button.id='outbaseGlobalSearchButton';
    button.className='outbaseGlobalSearchButton';
    button.setAttribute('aria-label','すべてから探す');
    button.innerHTML='⌕';
    button.addEventListener('click',openSearch);
    document.body.appendChild(button);
  });

  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();
      openSearch();
    }
  });
})();


/* OUTBASE FIELD03 Integrated Stability */
(function(){
  'use strict';
  const read=(key,fallback)=>{
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(_e){return fallback;}
  };
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  function repairData(){
    const gears=read('outbase_gear_library_v1',[]);
    const gearIds=new Set((Array.isArray(gears)?gears:[]).map(item=>item?.id).filter(Boolean));
    let changed=false;

    const repairedGears=(Array.isArray(gears)?gears:[]).map(item=>{
      if(!item||typeof item!=='object')return item;
      const relations=(Array.isArray(item.relations)?item.relations:[])
        .filter(relation=>{
          if(!relation?.targetId)return false;
          if((relation.targetType||'gear')!=='gear')return true;
          return gearIds.has(relation.targetId);
        });
      if(JSON.stringify(relations)!==JSON.stringify(item.relations||[]))changed=true;
      return {...item,relations};
    });
    if(changed)write('outbase_gear_library_v1',repairedGears);

    const kits=read('outbase_gear_kits_v1',[]);
    if(Array.isArray(kits)){
      let kitChanged=false;
      const repaired=kits.map(kit=>{
        const ids=(Array.isArray(kit?.gearIds)?kit.gearIds:[]).filter(id=>gearIds.has(id));
        const required=(Array.isArray(kit?.requiredGearIds)?kit.requiredGearIds:[]).filter(id=>ids.includes(id));
        if(JSON.stringify(ids)!==JSON.stringify(kit?.gearIds||[])||JSON.stringify(required)!==JSON.stringify(kit?.requiredGearIds||[]))kitChanged=true;
        return {...kit,gearIds:ids,requiredGearIds:required};
      });
      if(kitChanged)write('outbase_gear_kits_v1',repaired);
    }

    const plans=read('outbase_plans_v1',[]);
    const activePlanId=localStorage.getItem('outbase_active_plan_id_v1');
    if(activePlanId&&Array.isArray(plans)&&!plans.some(plan=>plan?.id===activePlanId)){
      localStorage.removeItem('outbase_active_plan_id_v1');
    }

    localStorage.setItem('outbase_data_integrity_last',new Date().toISOString());
  }

  function closeTopOverlay(){
    const closeSelectors=[
      '[data-search-close]',
      '[data-memory-detail-close]',
      '[data-library-editor-close]',
      '[data-close-prep-sheet]',
      '[data-close-plan-sheet]',
      '[data-close-sheet]'
    ];
    for(const selector of closeSelectors){
      const button=document.querySelector(selector);
      if(button){button.click();return true;}
    }
    return false;
  }

  window.addEventListener('DOMContentLoaded',repairData);

  window.addEventListener('popstate',event=>{
    if(closeTopOverlay()){
      event.preventDefault();
      history.pushState({outbase:true},'',location.href);
    }
  });

  window.addEventListener('DOMContentLoaded',()=>{
    if(!history.state?.outbase)history.replaceState({outbase:true},'',location.href);
  });
})();

/* OUTBASE FIELD03 Integrated Production Cleanup */
(function(){
  'use strict';
  const CLEANUP_VERSION='OUTBASE_PRODUCTION_CLEANUP_1';
  const CLEANUP_KEY='outbase_production_cleanup_version';

  const read=(key,fallback)=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw==null)return fallback;
      const value=JSON.parse(raw);
      return value==null?fallback:value;
    }catch(_e){return fallback;}
  };
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  const demoPlanRules=[
    {id:'plan-walk-13',title:'近所の朝散歩'},
    {id:'plan-drive-13',title:'手賀沼ドライブ散歩'},
    {id:'plan-akagi',title:'スノーピーク赤城山CF'},
    {id:'plan-event-23',title:'地域イベント'}
  ];

  function isUntouchedDemoPlan(plan){
    if(!plan||typeof plan!=='object')return false;
    const rule=demoPlanRules.find(item=>item.id===plan.id&&item.title===plan.title);
    if(!rule)return false;
    const hasUserSignals=
      Number(plan.updatedAt||0)>Number(plan.createdAt||0)||
      Boolean(plan.userEdited)||
      Boolean(plan.completedAt)||
      (Array.isArray(plan.customItems)&&plan.customItems.length>0);
    return !hasUserSignals;
  }

  function cleanupDemoPlans(){
    const keys=['outbase_plans_v1','outbase_plan_library_v1','outbase_plan_list_v1'];
    let removed=0;
    keys.forEach(key=>{
      const rows=read(key,null);
      if(!Array.isArray(rows))return;
      const next=rows.filter(plan=>{
        const remove=isUntouchedDemoPlan(plan);
        if(remove)removed++;
        return !remove;
      });
      if(next.length!==rows.length)write(key,next);
    });

    const activeId=localStorage.getItem('outbase_active_plan_id_v1');
    if(activeId&&demoPlanRules.some(rule=>rule.id===activeId)){
      const remaining=read('outbase_plans_v1',[]);
      if(!Array.isArray(remaining)||!remaining.some(plan=>plan?.id===activeId)){
        localStorage.removeItem('outbase_active_plan_id_v1');
      }
    }
    return removed;
  }

  function cleanupEmptyBrokenValues(){
    const removeKeys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!key.startsWith('outbase_'))continue;
      const value=localStorage.getItem(key);
      if(value==='undefined'||value==='[object Object]')removeKeys.push(key);
    }
    removeKeys.forEach(key=>localStorage.removeItem(key));
    return removeKeys.length;
  }

  function runCleanup(){
    if(localStorage.getItem(CLEANUP_KEY)===CLEANUP_VERSION)return;
    const removedPlans=cleanupDemoPlans();
    const removedBroken=cleanupEmptyBrokenValues();
    localStorage.setItem(CLEANUP_KEY,CLEANUP_VERSION);
    localStorage.setItem('outbase_production_cleanup_result',JSON.stringify({
      removedPlans,removedBroken,ranAt:new Date().toISOString()
    }));
  }

  function showUpdateToast(registration){
    if(document.getElementById('outbaseUpdateToast'))return;
    const toast=document.createElement('div');
    toast.id='outbaseUpdateToast';
    toast.className='outbaseUpdateToast';
    toast.innerHTML=`<div>
      <b>OUTBASEの更新があります</b>
      <span>新しい正本へ切り替えます。</span>
    </div>
    <button type="button">更新</button>`;
    toast.querySelector('button')?.addEventListener('click',()=>{
      registration.waiting?.postMessage({type:'SKIP_WAITING'});
    });
    document.body.appendChild(toast);
  }

  function bindServiceWorkerUpdate(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.ready.then(registration=>{
      if(registration.waiting)showUpdateToast(registration);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller){
            showUpdateToast(registration);
          }
        });
      });
    }).catch(()=>{});

    let refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(refreshing)return;
      refreshing=true;
      location.reload();
    });
  }

  window.addEventListener('DOMContentLoaded',()=>{
    runCleanup();
    bindServiceWorkerUpdate();
  });
})();
