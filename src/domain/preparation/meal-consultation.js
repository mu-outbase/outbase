(() => {
  'use strict';
  const SOURCE='meal-consultation-v1';
  const TOOLS=Object.freeze({stove:'ガスコンロ・バーナー',pan:'フライパン',pot:'鍋',knife:'包丁',board:'まな板',plate:'皿・ボウル',hotsand:'ホットサンドメーカー',firepit:'焚火台',charcoalgrill:'炭火グリル',grillpan:'グリルパン',seppouen:'雪峰苑',dutchoven:'ダッチオーブン',skillet:'スキレット',fieldoven:'フィールドオーブン',yaennabe:'野宴鍋',grillnet:'焼き網',firestand:'焚火用五徳・調理スタンド',tongs:'調理用トング（耐熱・金属製）',firetongs:'焚火用の火ばさみ・長い金属トング',heatglove:'耐熱手袋'});
  const HEAT_SOURCES=Object.freeze({gas:'ガス',charcoal:'炭火',campfire:'焚火',none:'火を使わない'});
  const PLACES=Object.freeze({outdoors:'屋根のない屋外',tarp:'タープ下',tent:'テント内'});
  const FOCUS_TOOLS=Object.freeze({any:'指定しない',firepit:'焚火台',charcoalgrill:'炭火グリル',grillpan:'グリルパン',seppouen:'雪峰苑',dutchoven:'ダッチオーブン',skillet:'スキレット',fieldoven:'フィールドオーブン',yaennabe:'野宴鍋'});
  const PROPOSAL_MODES=Object.freeze({balanced:'バランスよく',gear:'使いたいギアから',ingredients:'使いたい食材から',quick:'調理時間を短く',few_items:'買い足し品目を抑える',no_fire:'火を使わない料理から'});
  const FUEL=Object.freeze({gas:'ガス缶（器具の指定燃料・残量を確認）',charcoal:'炭（必要量を確認）',campfire:'薪（必要量を確認）'});

  const SLOTS=Object.freeze({breakfast:'朝食',lunch:'昼食',dinner:'夕食',side:'追加の一品'});
  const recipes=[
    {id:'caprese',name:'トマトとチーズのカプレーゼ',minutes:10,fire:false,tools:['knife','board','plate'],ingredients:[['トマト',1,'個'],['モッツァレラチーズ',50,'g'],['オリーブオイル',5,'ml'],['塩',.5,'g']],steps:['トマトとチーズを切って皿に並べる。','オリーブオイルと塩をかける。']},
    {id:'cucumber',name:'たたききゅうり',minutes:10,fire:false,tools:['knife','board','plate'],ingredients:[['きゅうり',1,'本'],['ごま油',5,'ml'],['塩',.5,'g']],steps:['きゅうりをたたいて食べやすく切る。','ごま油と塩で和える。']},
    {id:'tuna-salad',name:'ツナと豆のサラダ',minutes:5,fire:false,tools:['plate'],ingredients:[['ツナ缶',.5,'缶'],['ミックスビーンズ',50,'g'],['ドレッシング',15,'ml']],steps:['ツナ缶の汁を切る。','豆とツナを皿で混ぜ、ドレッシングで和える。']},
    {id:'hotsand',name:'ハムチーズのホットサンド',minutes:15,fire:true,tools:['stove','hotsand'],ingredients:[['食パン',2,'枚'],['ハム',2,'枚'],['スライスチーズ',1,'枚'],['バター',5,'g']],steps:['パンにハムとチーズを挟み、外側にバターを塗る。','ホットサンドメーカーで両面を焼き、焼き具合を確認する。']},
    {id:'pasta',name:'ワンポット・トマトパスタ',minutes:25,fire:true,tools:['stove','pot'],ingredients:[['パスタ',100,'g'],['カットトマト缶',100,'g'],['水',250,'ml'],['コンソメ',3,'g'],['オリーブオイル',5,'ml']],steps:['鍋で水とトマト・コンソメを沸かす。','パスタを加え、袋のゆで時間を目安に混ぜながら加熱する。','水分や塩味を確認し、オリーブオイルで仕上げる。']},
    {id:'soup',name:'ソーセージとキャベツのスープ',minutes:20,fire:true,tools:['stove','pot','knife','board'],ingredients:[['ソーセージ',2,'本'],['キャベツ',100,'g'],['水',250,'ml'],['コンソメ',3,'g']],steps:['具材を食べやすく切る。','水とコンソメ、具材を鍋に入れ、火が通るまで煮る。']},
    {id:'friedrice',name:'ツナとコーンのチャーハン',minutes:15,fire:true,tools:['stove','pan'],ingredients:[['ご飯',200,'g'],['ツナ缶',.5,'缶'],['コーン缶',50,'g'],['しょうゆ',10,'ml'],['油',5,'ml']],steps:['フライパンに油を熱し、ツナとコーンを炒める。','ご飯を加えてほぐしながら炒め、しょうゆで味を調える。']}
,
    {id:'charcoal-vegetables',name:'炭火で焼く彩り野菜',minutes:25,fire:true,tools:['knife','board','plate','tongs','heatglove','charcoalgrill','grillnet'],heatSources:['charcoal'],ingredients:[['パプリカ',.5,'個'],['ズッキーニ',.5,'本'],['しいたけ',2,'枚'],['オリーブオイル',5,'ml'],['塩',.5,'g']],steps:['野菜を切って油と塩をまぶす。','調理に対応した炭火グリルを屋外に安定して設置し、指定の焼き網で焼く。','トングで返しながら、食べられる状態まで加熱する。炭の準備時間は別に確保する。']},
    {id:'campfire-potato',name:'焚火のじゃがバター包み',minutes:40,fire:true,tools:['firepit','firetongs','heatglove','knife','board'],heatSources:['campfire'],ingredients:[['じゃがいも',1,'個'],['バター',10,'g'],['塩',.5,'g']],supplies:['調理用アルミホイル','調理用ペーパー'],steps:['洗ったじゃがいもを、濡らした調理用ペーパーとアルミホイルで包む。','調理対応の焚火台を屋外に安定して設置し、炎が落ち着いた熾火で、トングを使い向きを変えながら加熱する。','中心まで火が通ったら耐熱手袋とトングで取り出し、蒸気に注意して開きバターと塩を添える。焚火の準備時間は別に確保する。']},
    {id:'campfire-bread',name:'焚火で焼くガーリックバゲット',minutes:15,fire:true,tools:['firepit','grillnet','firetongs','heatglove'],heatSources:['campfire'],ingredients:[['カットバゲット',3,'枚'],['オリーブオイル',5,'ml'],['ガーリックパウダー',1,'g']],steps:['バゲットに油とガーリックパウダーを塗る。','調理対応の焚火台と指定の焼き網を屋外に安定して設置し、炎が落ち着いた熾火でトングを使い両面を焼く。','焦げ方を確認しながら火からの距離を調整する。焚火の準備時間は別に確保する。']},
    {id:'seppouen-grill',name:'雪峰苑できのことソーセージ',minutes:20,fire:true,tools:['seppouen','tongs','knife','board','plate'],heatSources:['gas'],ingredients:[['ソーセージ',3,'本'],['しいたけ',2,'枚'],['玉ねぎ',.5,'個'],['油',5,'ml']],steps:['食材を食べやすく切る。','雪峰苑を屋根のない屋外に設置し、メーカー指定の方法で本体と付属・指定プレートを準備する。','指定プレートで食材を焼き、トングで返しながら火の通りを確認する。他の鍋を上に載せる提案ではありません。']},
    {id:'grillpan-vegetables',name:'グリルパンで焼き野菜',minutes:20,fire:true,tools:['grillpan','knife','board','tongs','plate'],special:true,heatSources:['gas','charcoal','campfire'],ingredients:[['パプリカ',.5,'個'],['ズッキーニ',.5,'本'],['しいたけ',2,'枚'],['オリーブオイル',5,'ml'],['塩',.5,'g']],steps:['野菜を切って油と塩をまぶす。','選んだ熱源で使用できることを確認したグリルパンを、メーカー指定の方法で安定して設置する。','野菜を並べて返しながら焼く。塗装やコーティングの耐熱範囲を超えないよう取扱説明書に従う。']},
    {id:'dutchoven-roots',name:'ダッチオーブンで根菜のロースト',minutes:30,fire:true,tools:['dutchoven','knife','board','tongs','heatglove'],special:true,heatSources:['gas','charcoal','campfire'],ingredients:[['じゃがいも',1,'個'],['にんじん',.5,'本'],['玉ねぎ',.5,'個'],['オリーブオイル',5,'ml'],['塩',.5,'g']],steps:['根菜を火が通りやすい大きさに切り、油と塩をまぶす。','機種が選んだ熱源・調理方法に対応していることを取扱説明書で確認する。','メーカー指定の調理面・容器で根菜を加熱し、途中で返して中心まで火を通す。ダッチオーブンの蓋や上火は機種に適合する場合のみ使用する。']},
    {id:'dutchoven-stew',name:'ダッチオーブンで豆とソーセージのトマト煮',minutes:30,fire:true,tools:['dutchoven','knife','board','heatglove'],special:true,heatSources:['gas','charcoal','campfire'],ingredients:[['ソーセージ',3,'本'],['ミックスビーンズ',80,'g'],['カットトマト缶',150,'g'],['玉ねぎ',.5,'個'],['水',100,'ml'],['コンソメ',3,'g']],supplies:['リッドリフター（蓋を扱う道具）'],steps:['玉ねぎとソーセージを切る。','機種と選んだ熱源の対応を確認したダッチオーブンに材料を入れ、屋根のない屋外で安定して加熱する。','蓋を使って煮込み、途中で混ぜ、食材に火が通ったことを確認する。熱い蓋は対応する道具と耐熱手袋で扱う。']},
    {id:'skillet-mushrooms',name:'スキレットできのこのバターしょうゆ焼き',minutes:15,fire:true,tools:['skillet','tongs','plate','heatglove'],special:true,heatSources:['gas','charcoal','campfire'],ingredients:[['しめじ',100,'g'],['バター',10,'g'],['しょうゆ',5,'ml']],steps:['しめじを食べやすく分ける。','選んだ熱源に対応するスキレットをメーカー指定の方法で安定して設置し、バターを溶かしてきのこを焼く。','火が通ったらしょうゆを加える。持ち手も高温になるため耐熱手袋を使う。']},
    {id:'skillet-beans',name:'スキレットでソーセージと豆の温サラダ',minutes:20,fire:true,tools:['skillet','tongs','plate','heatglove'],special:true,heatSources:['gas','charcoal','campfire'],ingredients:[['ソーセージ',3,'本'],['ミックスビーンズ',80,'g'],['オリーブオイル',5,'ml'],['塩',.5,'g']],steps:['対応熱源を確認したスキレットを屋外で安定して加熱し、油を入れる。','ソーセージと豆を加えて返しながら火を通し、塩で味を調える。','熱い持ち手は耐熱手袋で扱い、食器へ移して食べる。']},
    {id:'fieldoven-pizza',name:'フィールドオーブンでコーンときのこのピザ',minutes:25,fire:true,tools:['fieldoven','heatglove','firetongs','plate'],special:true,heatSources:['charcoal'],ingredients:[['ピザ生地',1,'枚'],['ピザソース',30,'g'],['ピザ用チーズ',50,'g'],['コーン缶',30,'g'],['カットしめじ',30,'g']],supplies:['フィールドオーブンの機種指定設置台・加熱台','機種に適合するトレー・耐熱皿','オーブン用温度計（本体付属を含む）'],steps:['炭火調理に対応する機種と、その指定設置台・加熱台・トレーを取扱説明書で確認し、屋根のない屋外に安定して準備する。','生地にソース・具・チーズを載せる。機種指定の方法で予熱し、生地の表示と機種の温度範囲に従って焼く。','生地と具に火が通りチーズが色づいたことを確認する。トレーは耐熱手袋と対応する道具で扱う。炭火の準備・予熱時間は別に確保する。']},
    {id:'fieldoven-gratin',name:'フィールドオーブンでじゃがいもとツナのグラタン',minutes:30,fire:true,tools:['fieldoven','heatglove','firetongs','plate'],special:true,heatSources:['charcoal'],ingredients:[['下茹で済みじゃがいも',100,'g'],['ツナ缶',.5,'缶'],['ホワイトソース',100,'g'],['ピザ用チーズ',30,'g']],supplies:['フィールドオーブンの機種指定設置台・加熱台','機種に適合するトレー・耐熱皿','オーブン用温度計（本体付属を含む）'],steps:['炭火対応を確認した本体と指定の台・耐熱皿を屋根のない屋外に安定して設置し、取扱説明書に従って予熱する。','下茹で済みのじゃがいも・汁を切ったツナ・ソースを耐熱皿に合わせ、チーズを載せる。','食材の表示と機種の温度範囲に従い、中まで温まり表面に焼き色がつくまで加熱する。熱い皿は対応する道具と耐熱手袋で扱う。予熱時間は別に確保する。']},
    {id:'fieldoven-apple',name:'フィールドオーブンで焼きりんご',minutes:30,fire:true,tools:['fieldoven','knife','board','heatglove','firetongs','plate'],special:true,heatSources:['charcoal'],ingredients:[['りんご',.5,'個'],['バター',10,'g'],['砂糖',5,'g'],['シナモン',.5,'g']],supplies:['フィールドオーブンの機種指定設置台・加熱台','機種に適合するトレー・耐熱皿','オーブン用温度計（本体付属を含む）'],steps:['炭火対応を確認した本体・指定の台・耐熱皿を屋根のない屋外に安定して準備し、取扱説明書に従って予熱する。','りんごの芯を除き耐熱皿へ入れ、バター・砂糖・シナモンを加える。','機種の対応温度内でりんごがやわらかくなるまで焼く。皿と果汁は高温になるため、対応する道具と耐熱手袋で扱う。予熱時間は別に確保する。']},
    {id:'yaennabe-hotpot',name:'野宴鍋で豆腐ときのこの鍋',minutes:25,fire:true,tools:['yaennabe','stove','knife','board'],special:true,heatSources:['gas'],ingredients:[['豆腐',150,'g'],['白菜',100,'g'],['しめじ',50,'g'],['水',250,'ml'],['鍋つゆ',30,'ml']],steps:['食材を食べやすく切る。','野宴鍋とガスコンロの組み合わせが取扱説明書の対応範囲内であることを確認し、屋根のない屋外に安定して設置する。','水と鍋つゆを入れて温め、食材を加えて火を通す。焚火・炭火での使用を認める提案ではありません。']}
  ].map(r=>Object.freeze({...r,heatSources:Object.freeze(r.heatSources||(r.fire?['gas']:['none'])),supplies:Object.freeze(r.supplies||[]),tools:Object.freeze(r.tools),ingredients:Object.freeze(r.ingredients.map(([name,quantity,unit])=>Object.freeze({name,quantity,unit}))),steps:Object.freeze(r.steps)}));
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const canonicalTool=k=>k==='dutchgrill'?'dutchoven':k;
  const canonicalRecipe=k=>k==='dutchgrill-roots'?'dutchoven-roots':k;
  const displayText=v=>String(v??'').replaceAll('ダッチグリル','ダッチオーブン');
  const toolLabel=k=>TOOLS[canonicalTool(k)]||displayText(k);
  const clean=v=>String(v??'').normalize('NFKC').trim();
  const tokens=v=>clean(v).split(/[\n、,]+/).map(clean).filter(Boolean);
  const match=(a,b)=>clean(a).toLowerCase().includes(clean(b).toLowerCase());
  const foodKey=v=>clean(v).toLowerCase().replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60)).replace(/\s+/g,'');
  function ingredientMatch(name,value){const n=foodKey(name),v=foodKey(value).replace(/\d+(?:\.\d+)?(?:kg|g|ml|l|個|本|枚|缶|袋|玉|株)$/i,'');if(!v)return false;if(v==='きのこ')return /きのこ|しめじ|しいたけ|まいたけ|えのき|まっしゅるーむ/.test(n);if(['ごはん','白ごはん','白米飯'].includes(v))return /ご飯|ごはん|白ごはん|白米飯/.test(n);return n.includes(v);}
  const dateKey=v=>{if(!v||!Number.isFinite(Date.parse(v)))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));};
  function normalize(input={}){
    const people=Number(input.people),minutes=Number(input.minutes);
    if(!Number.isInteger(people)||people<1||people>20||!Number.isFinite(minutes)||minutes<5||minutes>180||String(input.stock||'').length>2000||String(input.exclude||'').length>1000||String(input.mustUse||'').length>1000)throw Error('meal_conditions_invalid');
    const heatSource=input.heatSource||(input.noFire?'none':'gas'),place=input.place||'outdoors',focusTool=canonicalTool(input.focusTool||'any'),proposalMode=input.proposalMode||'balanced';
    if(String(input.focusAssetId||'').length>128)throw Error('meal_conditions_invalid');
    if(!Object.hasOwn(PROPOSAL_MODES,proposalMode))throw Error('meal_conditions_invalid');
    if(proposalMode==='gear'&&!input.focusAssetId&&focusTool==='any')throw Error('meal_gear_basis_missing');
    if(proposalMode==='ingredients'&&!tokens(input.stock).length&&!tokens(input.mustUse).length)throw Error('meal_food_basis_missing');
    if(!Object.hasOwn(HEAT_SOURCES,heatSource)||!Object.hasOwn(PLACES,place)||!Object.hasOwn(FOCUS_TOOLS,focusTool))throw Error('meal_conditions_invalid');
    return {people,minutes,noFire:!!input.noFire||heatSource==='none'||proposalMode==='no_fire',tools:[...new Set((input.tools||[]).map(canonicalTool).filter(k=>Object.hasOwn(TOOLS,k)))].sort(),stock:clean(input.stock),exclude:clean(input.exclude),heatSource,place,focusTool,heatCompatible:input.heatCompatible===true,focusAssetId:String(input.focusAssetId||''),proposalMode,mustUse:clean(input.mustUse)};
  }
  function suggest(input,assets=[]){
    const c=normalize(input),stock=tokens(c.stock),required=tokens(c.mustUse),exclude=tokens(c.exclude),focused=c.focusAssetId?gearBindings(assets).find(a=>a.id===c.focusAssetId):null;
    if(c.focusAssetId&&!focused)return [];
    const rows=recipes.map(r=>{
      let tools=[...r.tools];
      if(r.special&&r.heatSources.length>1)tools.push(...(c.heatSource==='gas'?['stove']:c.heatSource==='charcoal'?['charcoalgrill','heatglove']:['firepit','firestand','heatglove']));
      return {...r,tools:[...new Set(tools)],heatSource:r.fire?c.heatSource:'none',place:c.place};
    }).filter(r=>(!focused||focused.roles.some(k=>r.tools.includes(k)))&&(!focused||!r.fire||!focused.heatSources.length||focused.heatSources.includes(c.heatSource))&&r.minutes<=c.minutes&&(!r.fire||(!c.noFire&&c.place==='outdoors'&&r.heatSources.includes(c.heatSource)&&(!r.special||c.heatCompatible)))&&r.tools.every(k=>c.tools.includes(k))&&(c.noFire||c.place!=='outdoors'||c.focusTool==='any'||r.tools.includes(c.focusTool))&&!r.ingredients.some(i=>exclude.some(x=>ingredientMatch(i.name,x)))&&required.every(x=>r.ingredients.some(i=>ingredientMatch(i.name,x)))).map(r=>{
      const ingredients=r.ingredients.map(i=>({...i,quantity:Math.round(i.quantity*c.people*10)/10,stockMatch:stock.some(x=>ingredientMatch(i.name,x))}));const matchedFoods=[...new Set([...stock,...required].filter(x=>ingredients.some(i=>ingredientMatch(i.name,x))))],stockMatches=ingredients.filter(i=>i.stockMatch).length,missingItemCount=ingredients.length-stockMatches;
      const reasons=[];if(focused)reasons.push(`${focused.name}を使う`);else if(c.focusTool!=='any'&&r.tools.includes(c.focusTool))reasons.push(`${toolLabel(c.focusTool)}を使う`);if(matchedFoods.length)reasons.push(`使う食材：${matchedFoods.join('・')}`);if(c.proposalMode==='quick')reasons.push(`調理の目安${r.minutes}分`);if(c.proposalMode==='few_items')reasons.push(`手持ち食材名と未一致${missingItemCount}品目（量は確認）`);if(!r.fire)reasons.push('火を使わずに作れる');if(!reasons.length)reasons.push('選んだ器具・熱源・調理時間に合う');
      return {...r,people:c.people,ingredients,stockMatches,missingItemCount,matchedFoods,reasons};
    }).filter(r=>c.proposalMode!=='ingredients'||r.matchedFoods.length>0);
    return rows.sort((a,b)=>{if(c.proposalMode==='quick')return a.minutes-b.minutes||b.stockMatches-a.stockMatches;if(c.proposalMode==='few_items')return a.missingItemCount-b.missingItemCount||b.stockMatches-a.stockMatches||a.minutes-b.minutes;return b.stockMatches-a.stockMatches||Number(b.fire)-Number(a.fire)||a.minutes-b.minutes;});
  }
  function rolesFor(asset){
    const role=canonicalTool(asset.payload?.cooking?.role||'auto');if(role==='none')return [];if(role!=='auto')return Object.hasOwn(TOOLS,role)?[role]:[];
    const name=String(asset.name||'');const patterns={stove:/ガス.*コンロ|ガス.*バーナー|カセットコンロ|フラットバーナー|シングルバーナー|ツーバーナー|^コンロ$|^バーナー$/,pan:/フライパン/,pot:/鍋|クッカー/,knife:/包丁|ナイフ/,board:/まな板|カッティングボード/,plate:/皿|ボウル|シェラカップ/,hotsand:/ホットサンド/,firepit:/焚(?:き)?火台/,charcoalgrill:/炭火|炭.*グリル|焼武者/,grillpan:/グリルパン/,seppouen:/雪峰苑/,dutchoven:/ダッチオーブン|ダッチグリル|Dutch.?Oven/i,skillet:/スキレット|skillet/i,fieldoven:/フィールドオーブン|field.?oven/i,yaennabe:/野宴鍋/,grillnet:/焼[き]?網/,firestand:/五徳|焚火用.*スタンド/,tongs:/トング/,firetongs:/火ばさみ|焚火.*トング|ファイヤープレーストング/,heatglove:/耐熱.*手袋|耐熱.*グローブ/};
    const accessory=/ケース|収納袋|収納バッグ|カバー|専用蓋|用蓋|鍋蓋|リッド|ハンドル|取っ手|取扱説明書|(?:用|専用).*(?:トング|手袋|グローブ|五徳|スタンド)/.test(name);
    return Object.keys(TOOLS).filter(k=>!(accessory&&['stove','pan','pot','hotsand','firepit','charcoalgrill','grillpan','seppouen','dutchoven','skillet','fieldoven','yaennabe'].includes(k))&&patterns[k].test(name)&&!(k==='stove'&&/雪峰苑/.test(name))&&!(k==='pot'&&/野宴鍋|ダッチオーブン|ダッチグリル|フィールドオーブン|Dutch.?Oven|field.?oven/i.test(name))&&!(k==='pan'&&/グリルパン|ダッチオーブン|ダッチグリル|スキレット|skillet/i.test(name))&&!(k==='hotsand'&&/電気|電動|IH専用/.test(name)));
  }
  function gearBindings(assets=[]){return assets.filter(a=>!a.deleted_at&&Number(a.payload?.quantity??a.quantity??1)>0).map(a=>{const roles=rolesFor(a),heats=a.payload?.cooking?.heat_sources;return {id:a.id,name:String(a.name||''),roles,heatSources:roles.some(k=>['stove','pan','pot','hotsand','firepit','charcoalgrill','grillpan','seppouen','dutchoven','skillet','fieldoven','yaennabe'].includes(k))&&Array.isArray(heats)?heats.filter(k=>['gas','charcoal','campfire'].includes(k)):[]};}).filter(a=>a.roles.length);}
  function inferredTools(assets){const found=new Set(gearBindings(assets).flatMap(a=>a.roles));return Object.keys(TOOLS).filter(k=>found.has(k));}
  async function load({activityId,nativeEventId=null}){
    const parent=nativeEventId?await globalThis.OUTBASE_CAMP_EXPLORATION.loadCalendar(nativeEventId):null;
    let activity=parent?.activity||await repo().activities.get(activityId);
    if(nativeEventId){const events=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]');const event=Array.isArray(events)?events.find(e=>e.id===nativeEventId&&!e.deleted_at&&e.calendarId==='camp'):null;if(event)activity={...activity,title:event.title,start_at:event.start,end_at:event.end};}
    if(!activity||activity.deleted_at||activity.type!=='camp')throw Error('meal_camp_missing');
    const isReal=globalThis.OUTBASE_IDS.isUlid(activity.id);
    const [meals,assets,preparation]=await Promise.all([isReal?repo().meals.byIndex('activity_id',activity.id):[],repo().assets.all(),isReal?repo().preparationItems.byIndex('activity_id',activity.id):[]]);
    return {status:'ready',activity,nativeEventId,nativeMonth:parent?.nativeMonth||'',meals:meals.filter(m=>!m.deleted_at&&m.source===SOURCE).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.slot).localeCompare(String(b.slot))),assets:assets.filter(a=>!a.deleted_at),preparation:preparation.filter(r=>!r.deleted_at),tools:inferredTools(assets),bindings:gearBindings(assets),startDate:dateKey(activity.start_at),endDate:dateKey(activity.end_at)};
  }
  async function approve({activityId,displayActivityId,nativeEventId=null,requestId,recipeId,date,slot,conditions,ingredients,guard=()=>true}){
    if(activityId!==displayActivityId||!globalThis.OUTBASE_IDS.isUlid(requestId)||!Object.hasOwn(SLOTS,slot)||!/^20\d{2}-\d{2}-\d{2}$/.test(date)||dateKey(date+'T12:00:00+09:00')!==date)throw Error('meal_invalid');
    recipeId=canonicalRecipe(recipeId);const normalized=normalize(conditions),candidate=suggest({...normalized,focusAssetId:'',proposalMode:normalized.proposalMode==='gear'?'balanced':normalized.proposalMode}).find(r=>r.id===recipeId);
    if(!candidate||!Array.isArray(ingredients)||ingredients.length!==candidate.ingredients.length)throw Error('meal_candidate_changed');
    const items=ingredients.map((row,index)=>{const expected=candidate.ingredients[index];if(row.name!==expected.name||row.unit!==expected.unit||!Number.isFinite(row.quantity)||row.quantity<=0||row.quantity>100000||typeof row.buy!=='boolean')throw Error('meal_ingredient_invalid');return {name:row.name,unit:row.unit,quantity:row.quantity,buy:row.buy};});
    const signature=JSON.stringify({recipeId,date,slot,conditions:normalized,ingredients:items});
    const stores=['activities','meals','meal_items','shopping_lists','shopping_items','preparation_items','assets','activity_assets'];let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(stores,'readwrite',tx=>{
      const fail=error=>{failure=error;tx.abort();};
      const a=tx.objectStore('activities');const req=nativeEventId?a.getAll():a.get(activityId);
      req.onsuccess=()=>{try{
        if(!guard())throw Error('meal_cancelled');
        let activity,sourceEvent=null;
        if(nativeEventId){
          const events=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]');const event=Array.isArray(events)?events.find(e=>e.id===nativeEventId&&!e.deleted_at&&e.calendarId==='camp'):null;if(!event)throw Error('meal_calendar_missing');sourceEvent=event;
          activity=req.result.find(r=>!r.deleted_at&&r.source==='camp-exploration-context-v1'&&r.metadata?.calendar_event_id===nativeEventId);
          if(!activity)activity=repo().activities.normalize({type:'camp',title:event.title,state:'planned',start_at:event.start,end_at:event.end,visibility:'private',source:'camp-exploration-context-v1',metadata:{location:event.place||event.title,calendar_event_id:nativeEventId,calendar_month:String(event.start||'').slice(0,7)}});
        }else activity=req.result;
        if(!activity||activity.deleted_at||activity.type!=='camp')throw Error('meal_camp_missing');
        const min=dateKey(sourceEvent?.start||activity.start_at),max=dateKey(sourceEvent?.end||activity.end_at);if((min&&date<min)||(max&&date>max))throw Error('meal_date_outside');
        const reads=[tx.objectStore('meals').get(requestId),tx.objectStore('shopping_lists').index('activity_id').getAll(activity.id),tx.objectStore('preparation_items').index('activity_id').getAll(activity.id),tx.objectStore('assets').get(normalized.focusAssetId||'__none__'),tx.objectStore('activity_assets').index('activity_id').getAll(activity.id)];let loaded=0;
        for(const r of reads)r.onsuccess=()=>{if(++loaded!==5)return;try{
          if(!guard())throw Error('meal_cancelled');const [previous,lists,prep,focusAsset,assetLinks]=reads.map(r=>r.result);
          if(previous){if(previous.deleted_at||previous.activity_id!==activity.id||(previous.payload?.signature!==signature&&JSON.stringify({recipeId:canonicalRecipe(previous.payload?.recipe_id),date:previous.date,slot:previous.slot,conditions:normalize(previous.payload?.conditions),ingredients:previous.payload?.ingredients})!==signature))throw Error('meal_request_conflict');result=previous;return;}
          const binding=normalized.focusAssetId?gearBindings(focusAsset?[focusAsset]:[])[0]:null;
          const verifiedCandidate=normalized.focusAssetId?suggest(normalized,focusAsset?[focusAsset]:[]).find(r=>r.id===recipeId):candidate;
          if(!verifiedCandidate)throw Error('meal_gear_changed');
          const put=(store,row)=>{globalThis.OUTBASE_VALIDATION.assertEntity(store,row);tx.objectStore(store).put(row);};
          const title=`${date} ${SLOTS[slot]}：${candidate.name}`;
          const meal=repo().meals.normalize({id:requestId,activity_id:activity.id,title,name:candidate.name,date,slot,people:normalized.people,status:'planned',source:SOURCE,payload:{recipe_id:recipeId,signature,conditions:normalized,ingredients:items,steps:candidate.steps,tools:candidate.tools,heatSource:candidate.heatSource,place:normalized.place,proposal_mode:normalized.proposalMode,reasons:verifiedCandidate.reasons,asset_ids:binding?[binding.id]:[],gear_names:binding?[binding.name]:[],supplies:[...candidate.supplies,...(candidate.fire?[FUEL[candidate.heatSource]]:[])]}});
          const makePrep=(category,title,payload={})=>repo().preparationItems.normalize({activity_id:activity.id,category,title,status:'pending',origin:'meal',sort_order:999,source:SOURCE,payload:{meal_id:meal.id,...payload}});
          const list=lists.find(l=>!l.deleted_at&&l.source===SOURCE)||repo().shoppingLists.normalize({activity_id:activity.id,title:'キャンプ料理の買い物',source:SOURCE});
          put('activities',activity);put('meals',meal);if(items.some(i=>i.buy))put('shopping_lists',list);
          put('preparation_items',makePrep('meal',title));
          for(const item of items){
            put('meal_items',repo().mealItems.normalize({meal_id:meal.id,...item,source:SOURCE}));
            const amount=`${item.name} ${item.quantity}${item.unit}`;
            if(item.buy){const shopping=repo().shoppingItems.normalize({activity_id:activity.id,shopping_list_id:list.id,name:item.name,quantity:item.quantity,unit:item.unit,status:'pending',source:SOURCE,payload:{meal_id:meal.id,date,slot}});put('shopping_items',shopping);put('preparation_items',makePrep('shopping',`${amount}（${date} ${SLOTS[slot]}）`,{shopping_item_id:shopping.id}));}
            else put('preparation_items',makePrep('gear',`持参：${amount}（${date} ${SLOTS[slot]}）`));
          }
          const preparedAssets=new Set();for(const tool of candidate.tools){const selected=binding?.roles.includes(tool),name=selected?binding.name:TOOLS[tool];if(selected&&preparedAssets.has(binding.id))continue;if(selected)preparedAssets.add(binding.id);if(!prep.some(p=>!p.deleted_at&&p.category==='gear'&&(selected?p.payload?.asset_id===binding.id:(canonicalTool(p.payload?.tool)===tool||p.title===name))))put('preparation_items',makePrep('gear',name,{tool,...(selected?{asset_id:binding.id,tools:binding.roles}:{})}));}
          if(binding&&!assetLinks.some(link=>!link.deleted_at&&link.asset_id===binding.id))put('activity_assets',repo().activityAssets.normalize({activity_id:activity.id,asset_id:binding.id,source:SOURCE}));
          for(const name of [...candidate.supplies,...(candidate.fire?[FUEL[candidate.heatSource]]:[])])if(name&&!prep.some(p=>!p.deleted_at&&p.category==='gear'&&p.title===name))put('preparation_items',makePrep('gear',name,{cooking_supply:true}));
          result=meal;
        }catch(error){fail(error);}};
      }catch(error){fail(error);}};
    });}catch(error){throw failure||error;}return result;
  }
  async function toggleShopping(preparationId,displayActivityId){
    let failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['preparation_items','shopping_items'],'readwrite',tx=>{
      const req=tx.objectStore('preparation_items').get(preparationId);req.onsuccess=()=>{try{const prep=req.result;if(!prep||prep.deleted_at||prep.source!==SOURCE||prep.activity_id!==displayActivityId||!prep.payload?.shopping_item_id)throw Error('meal_shopping_missing');
        const check=tx.objectStore('shopping_items').get(prep.payload.shopping_item_id);check.onsuccess=()=>{try{const item=check.result;if(!item||item.deleted_at||item.source!==SOURCE||item.activity_id!==prep.activity_id||item.payload?.meal_id!==prep.payload.meal_id)throw Error('meal_shopping_mismatch');const done=prep.status!=='completed';const updated=repo().preparationItems.normalize({...prep,updated_at:globalThis.OUTBASE_IDS.nowIso(),status:done?'completed':'pending',completed_at:done?globalThis.OUTBASE_IDS.nowIso():null}),shopping=repo().shoppingItems.normalize({...item,updated_at:globalThis.OUTBASE_IDS.nowIso(),status:done?'purchased':'pending'});globalThis.OUTBASE_VALIDATION.assertEntity('preparation_items',updated);globalThis.OUTBASE_VALIDATION.assertEntity('shopping_items',shopping);tx.objectStore('preparation_items').put(updated);tx.objectStore('shopping_items').put(shopping);}catch(error){failure=error;tx.abort();}};
      }catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}
  }
  globalThis.OUTBASE_MEAL_CONSULTATION=Object.freeze({TOOLS,SLOTS,HEAT_SOURCES,PLACES,FOCUS_TOOLS,PROPOSAL_MODES,FUEL,ingredientMatch,canonicalTool,toolLabel,displayText,rolesFor,gearBindings,normalize,suggest,inferredTools,load,approve,toggleShopping});
})();
