"""PWA foreground GPS status, explicit restart and saved route continuity with fake GPS."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(**p.devices['Pixel 7']);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 c.add_init_script("window.gpsFixture={callback:null,requests:0};window.testHidden=false;Object.defineProperty(document,'hidden',{get(){return testHidden}});Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok){gpsFixture.requests++;gpsFixture.callback=ok;return 0},clearWatch(){gpsFixture.callback=null}}});")
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=start');page.locator('[data-ob22-kota-start]').click();page.locator('[data-kota-gps-status]').wait_for();assert 'GPS未開始' in page.locator('[data-kota-gps-status]').inner_text()
 page.locator('[data-kota-gps-resume]').tap();page.wait_for_function('gpsFixture.callback!==null');page.wait_for_function('document.querySelector("[data-kota-gps-status]").textContent.includes("GPS記録中")');aid=page.evaluate('OUTBASE_ROUTER.current().activityId')
 page.evaluate('gpsFixture.callback({coords:{latitude:35,longitude:139,accuracy:3},timestamp:Date.now()-2000})');page.wait_for_function('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).length===1')
 page.evaluate('gpsFixture.callback({coords:{latitude:35.001,longitude:139,accuracy:3},timestamp:Date.now()})');page.wait_for_function('document.querySelector(".ob19-metrics").textContent.includes("0.11")')
 page.evaluate("window.oldGpsCallback=gpsFixture.callback;window.sessionNode=document.querySelector('.ob19-session');testHidden=true;document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function('document.querySelector("[data-kota-gps-status]").textContent.includes("GPS停止中")');assert page.locator('[data-kota-gps-resume]').inner_text()=='GPS記録を再開'
 page.evaluate("testHidden=false;document.dispatchEvent(new Event('visibilitychange'));oldGpsCallback({coords:{latitude:35.02,longitude:139,accuracy:3},timestamp:Date.now()})")
 page.wait_for_timeout(250);assert page.evaluate('gpsFixture.requests')==1;assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).length')==2
 assert page.evaluate("sessionNode===document.querySelector('.ob19-session')");assert '時間の記録は続いています' in page.locator('[data-kota-gps-status]').inner_text()
 page.locator('[data-kota-gps-resume]').tap();page.wait_for_function('gpsFixture.requests===2');page.evaluate('gpsFixture.callback({coords:{latitude:35.01,longitude:139,accuracy:3},timestamp:Date.now()})');page.wait_for_function('document.querySelectorAll("[data-walk-track]").length===2')
 assert '0.11' in page.locator('.ob19-metrics').inner_text();page.reload();page.locator('[data-kota-gps-resume]').wait_for();assert 'GPS停止中' in page.locator('[data-kota-gps-status]').inner_text();assert page.evaluate('gpsFixture.requests')==0
 page.locator('[data-kota-gps-resume]').tap();page.wait_for_function('gpsFixture.requests===1');page.locator('[data-ob19-control]').tap();page.get_by_role('button',name='再開',exact=True).wait_for();assert page.locator('[data-kota-gps-resume]').count()==0
 page.locator('[data-ob19-control]').tap();page.get_by_role('button',name='一時停止',exact=True).wait_for();assert page.locator('[data-kota-gps-resume]').count()==1;assert page.evaluate('gpsFixture.requests')==1
 page.locator('[data-ob19-end]').tap();page.get_by_role('heading',name='コタ散歩のまとめ',exact=True).wait_for();assert 'GPS記録終了' in page.locator('[data-kota-gps-status]').inner_text();assert page.locator('[data-kota-gps-resume]').count()==0;assert not errors,errors
 print('Foreground GPS status, no automatic restart, one-tap restart, no gap bridging, reload/pause/end and unchanged session DOM: PASS',flush=True)
 c.close();b.close()
