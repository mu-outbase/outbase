"""Runtime module failure/retry regression, isolated browser and simulated network errors."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(service_workers='block');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 mode='once';attempts=0
 def module_request(route):
  global attempts
  attempts+=1
  if mode=='always' or (mode=='once' and attempts==1):route.abort('failed')
  else:route.continue_()
 c.route('**/src/storage/non-destructive-export.js?*',module_request)
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=home');page.wait_for_function('!!window.OUTBASE_APP && document.documentElement.classList.contains("outbaseShellReady")');assert attempts==2;assert not errors,errors
 saved=page.evaluate('''async()=>{
  const activity=await OUTBASE_REPOSITORIES_V160.activities.save({title:'ランタイム既存活動',type:'walk',state:'planned',visibility:'private'});
  const record=await OUTBASE_REPOSITORIES_V160.records.save({activity_id:activity.id,type:'note',payload:{text:'保持する記録'},visibility:'private'});return {activity,record};
 }''');print('Runtime module retries one failed request and boots without exceptions: PASS',flush=True)
 mode='always';attempts=0;page.reload();page.get_by_role('button',name='もう一度開く',exact=True).wait_for();result=page.evaluate('async()=>await OUTBASE_APP.ready');assert result['status']=='failed';assert attempts==2;assert page.evaluate('typeof OUTBASE_REPOSITORIES_V160')=='undefined';assert not errors,errors
 print('Repeated runtime failure returns failed status and stops consumers without unhandled rejection: PASS',flush=True)
 mode='ok';page.get_by_role('button',name='もう一度開く',exact=True).click();page.wait_for_function('!!window.OUTBASE_REPOSITORIES_V160 && document.documentElement.classList.contains("outbaseShellReady")');restored=page.evaluate('async saved=>({activity:await OUTBASE_REPOSITORIES_V160.activities.get(saved.activity.id),record:await OUTBASE_REPOSITORIES_V160.records.get(saved.record.id)})',saved);assert restored==saved;assert not errors,errors
 print('Reload recovers and preserves existing activity and note: PASS',flush=True)
 fixture_attempts=0
 def fixture_request(route):
  global fixture_attempts
  fixture_attempts+=1
  if fixture_attempts==1:route.abort('failed')
  else:route.fulfill(status=200,content_type='application/javascript',body='window.fixtureExecutions=(window.fixtureExecutions||0)+1;')
 c.route('**/runtime-retry-fixture.js',fixture_request)
 page.evaluate('async()=>{await Promise.all([OUTBASE_SCRIPT_LOADER.load("runtime-retry-fixture.js"),OUTBASE_SCRIPT_LOADER.load("runtime-retry-fixture.js")]);await OUTBASE_SCRIPT_LOADER.load("runtime-retry-fixture.js")}');assert fixture_attempts==2;assert page.evaluate('fixtureExecutions')==1;assert not errors,errors
 print('Concurrent callers share retry; successfully loaded module executes once: PASS',flush=True)
 c.close();b.close()
