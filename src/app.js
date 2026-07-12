(function(){
  'use strict';
  const scripts = [
    './outbase_library10a/src/app.js?v=outbase-clean-v6-library10a',
    './outbase_library10a/src/hotfix.js?v=outbase-clean-v6-library10a-fix3'
  ];
  function load(index){
    if(index>=scripts.length)return;
    const script=document.createElement('script');
    script.src=scripts[index];
    script.onload=()=>load(index+1);
    script.onerror=()=>console.error('OUTBASE load failed:',scripts[index]);
    document.head.appendChild(script);
  }
  load(0);
})();
