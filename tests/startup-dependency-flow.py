"""Simulated startup request failures in an isolated profile; no real user data."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(service_workers='block',viewport={'width':393,'height':852});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 mode='once';attempts=0
 def router_request(route):
  global attempts
  attempts+=1
  if mode=='always' or (mode=='once' and attempts==1):route.abort('failed')
  elif mode=='missing':route.fulfill(status=200,content_type='application/javascript',body='/* export intentionally absent */')
  else:route.continue_()
 c.route('**/src/router.js?*',router_request)
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=home');page.wait_for_function('!!window.OUTBASE_APP && document.documentElement.classList.contains("outbaseShellReady")');page.evaluate('async()=>await OUTBASE_STARTUP_READY');assert attempts==2;assert not errors,errors;assert page.evaluate('async()=> (await indexedDB.databases()).length')==0
 print('One failed router request retries once and boots without page errors or new DB: PASS',flush=True)
 saved=page.evaluate('''async()=>{
  const activity=await OUTBASE_REPOSITORIES_V160.activities.save({title:'起動テストの既存活動',type:'walk',state:'planned',visibility:'private'});
  const record=await OUTBASE_REPOSITORIES_V160.records.save({activity_id:activity.id,type:'note',payload:{text:'消してはいけない記録'},visibility:'private'});
  localStorage.setItem('startup-sentinel','保持');return {activity,record};
 }''')
 mode='always';attempts=0;page.reload();page.get_by_role('button',name='もう一度開く',exact=True).wait_for();assert attempts==2;assert page.evaluate('typeof OUTBASE_APP')=='undefined';assert page.evaluate('typeof OUTBASE_THEME_V166')=='undefined';assert page.evaluate('localStorage.getItem("startup-sentinel")')=='保持';assert not errors,errors
 print('Persistent router failure stops dependents and shows retry without exceptions: PASS',flush=True)
 mode='ok';page.get_by_role('button',name='もう一度開く',exact=True).click();page.wait_for_function('!!window.OUTBASE_APP && document.documentElement.classList.contains("outbaseShellReady")')
 restored=page.evaluate('async saved=>({activity:await OUTBASE_REPOSITORIES_V160.activities.get(saved.activity.id),record:await OUTBASE_REPOSITORIES_V160.records.get(saved.record.id)})',saved);assert restored==saved;assert page.evaluate('localStorage.getItem("startup-sentinel")')=='保持';assert not errors,errors
 print('Retry button recovers while preserving activity, note and localStorage: PASS',flush=True)
 mode='missing';attempts=0;page.reload();page.get_by_role('button',name='もう一度開く',exact=True).wait_for();assert attempts==1;assert page.evaluate('typeof OUTBASE_THEME_V166')=='undefined';assert not errors,errors
 print('Missing router export stops consumers without reexecuting scripts: PASS',flush=True)
 c.close();b.close()
