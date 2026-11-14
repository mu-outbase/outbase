"""Kota walk from HOME to saved history, using Pixel 7 emulation and fake devices."""
import os,base64,urllib.request
from playwright.sync_api import sync_playwright
PNG='iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAP0lEQVR4nO3OMQHAIADAMEDFxCAH/xr27+nJjkRB5nP2+JN1O/AlVISKUBEqQkWoCBWhIlSEilARKkJFqAiVF1xtAPi2TVFIAAAAAElFTkSuQmCC'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']);c=b.new_context(**p.devices['Pixel 7'],permissions=['microphone'],timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 c.add_init_script("window.walkGeo={callback:null,cleared:[]};Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok){walkGeo.callback=ok;return 0},clearWatch(id){walkGeo.cleared.push(id);walkGeo.callback=null}}});")
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 c.route('https://tile.openstreetmap.org/**',lambda route: route.fulfill(status=200,content_type='image/png',body=urllib.request.urlopen(route.request.url,timeout=20).read()))
 page.goto(base+'?shell=1&view=home');page.locator('[data-ob36-quick=walk-kota]').tap();page.locator('[data-ob22-kota-start]').wait_for();page.wait_for_timeout(500)
 page.evaluate('''()=>{window.walkPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='calendar_entries')throw new DOMException('test','QuotaExceededError');return walkPut.apply(this,args)}}''');page.locator('[data-ob22-kota-start]').tap();page.get_by_text('散歩を開始できませんでした。空き容量を確認して、もう一度お試しください。',exact=True).wait_for();assert page.evaluate('async()=> [(await OUTBASE_REPOSITORIES_V160.activities.all()).length,(await OUTBASE_REPOSITORIES_V160.calendarEntries.all()).length]')==[0,0];page.evaluate('()=>{IDBObjectStore.prototype.put=walkPut}');print('Failed walk start rolls back activity and calendar together: PASS',flush=True)
 page.locator('[data-ob22-kota-start]').evaluate('(b)=>{b.click();b.click()}');page.locator('[data-kota-walk]').wait_for();page.get_by_role('button',name='一時停止',exact=True).wait_for();aid=page.evaluate('OUTBASE_ROUTER.current().activityId');original=page.evaluate('async id=>await OUTBASE_REPOSITORIES_V160.activities.get(id)',aid);assert original['state']=='active';assert original['type']=='walk';assert original['subtype']=='kota_walk';assert original['end_at'] is None
 reused=page.evaluate('async()=>OUTBASE_KOTA_WALK.start(OUTBASE_IDS.ulid())');assert reused['id']==aid;assert len(page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.activities.all()'))==1;print('HOME Kota action starts one active walk; repeated start returns the same walk: PASS',flush=True)
 page.locator('[data-walk-map]').wait_for();assert page.locator('[data-walk-position]').count()==0;assert page.locator('[data-walk-map-empty]').count()==1
 assert page.evaluate('document.querySelector(".ob19-map-card").compareDocumentPosition(document.querySelector("[data-kota-walk]")) & Node.DOCUMENT_POSITION_FOLLOWING')
 page.locator('[data-ob19-gps]').scroll_into_view_if_needed();assert page.locator('[data-ob19-gps]').bounding_box()['height']<100
 print('Map is visible before GPS permission and above Kota events; GPS button stays compact: PASS',flush=True)
 page.locator('[data-ob19-gps]').tap();page.wait_for_function('walkGeo.callback!==null');page.evaluate('walkGeo.callback({coords:{latitude:35,longitude:139,accuracy:3},timestamp:Date.now()})');page.wait_for_function('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).length===1');page.evaluate('walkGeo.callback({coords:{latitude:35.001,longitude:139,accuracy:3},timestamp:Date.now()+2000})');page.wait_for_function('document.querySelector(".ob19-metrics").textContent.includes("0.11")')

 page.locator('[data-walk-track]').first.wait_for(state='attached');assert page.locator('[data-walk-track]').count()==1
 assert len(page.locator('[data-walk-track]').get_attribute('points').split())==2
 page.locator('[data-walk-zoom="1"]').tap();page.locator('[data-walk-zoom="0"]').tap()
 page.locator('[data-ob19-control]').tap();page.get_by_role('button',name='再開',exact=True).wait_for();page.locator('[data-ob19-control]').tap();page.get_by_role('button',name='一時停止',exact=True).wait_for()
 page.locator('[data-ob19-gps]').tap();page.wait_for_function('walkGeo.callback!==null');page.evaluate('walkGeo.callback({coords:{latitude:35.002,longitude:139,accuracy:3},timestamp:Date.now()+4000})');page.wait_for_function('document.querySelectorAll("[data-walk-track]").length===2')
 assert page.locator('[data-walk-track]').nth(1).get_attribute('points').count(',')==1
 page.wait_for_function('Array.from(document.querySelectorAll("[data-walk-tile]")).every(t=>t.style.visibility!=="hidden")');page.wait_for_timeout(1000)
 page.screenshot(path='/tmp/kota-real-map.png',full_page=True)
 page.locator('[data-ob19-end]').tap();page.get_by_role('heading',name='コタ散歩のまとめ',exact=True).wait_for();page.wait_for_function('!!navigator.serviceWorker.controller');c.set_offline(True);page.reload();page.locator('[data-walk-track]').first.wait_for(state='attached');assert page.locator('[data-walk-track]').count()==2;assert page.locator('[data-walk-position]').count()==1
 assert not errors,errors
 print('Map: saved route, split sessions, zoom, ended/offline restoration and no page errors: PASS',flush=True)
 c.close();b.close()
