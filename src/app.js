(function(){
  'use strict';
  const queue=[
    './outbase_library10a/src/app.js?v=outbase-clean-v6-library10a',
    './outbase_library10a/src/hotfix.js?v=outbase-clean-v6-library10a-fix3'
  ];
  const load=(i)=>{
    if(i>=queue.length)return;
    const s=document.createElement('script');
    s.src=queue[i];
    s.onload=()=>load(i+1);
    s.onerror=()=>{document.body.innerHTML='<p style="padding:24px">OUTBASEの読み込みに失敗しました。</p>';};
    document.head.appendChild(s);
  };
  load(0);
})();
