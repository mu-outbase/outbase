(() => {
  'use strict';

  const QUICK=Object.freeze([
    {id:'start',label:'活動を始める',hint:'散歩・キャンプ・ドライブ',action:'start',icon:'play'},
    {id:'memo',label:'メモを残す',hint:'気づきをすぐ記録',action:'memo',icon:'memo'},
    {id:'plan',label:'予定を追加',hint:'次の活動を決める',action:'plan-add',icon:'calendar'},
    {id:'calendar',label:'カレンダー',hint:'予定をまとめて見る',action:'calendar',icon:'grid'}
  ]);

  function todayLabel(now){return new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long'}).format(now);}

  async function build({now=new Date()}={}){
    const value=await globalThis.OUTBASE_HOME_DOMAIN_V164.build({now,nowLimit:3,nextLimit:5,recentLimit:5});
    return Object.freeze({...value,quick:QUICK,todayLabel:todayLabel(now),version:'v165.2-scroll-restore'});
  }

  globalThis.OUTBASE_HOME_SCREEN_MODEL_V164=Object.freeze({build,QUICK});
})();
