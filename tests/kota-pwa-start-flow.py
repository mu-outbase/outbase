"""Kota walk from HOME to saved history, using Pixel 7 emulation and fake devices."""
import os,base64
from playwright.sync_api import sync_playwright
PNG='iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAP0lEQVR4nO3OMQHAIADAMEDFxCAH/xr27+nJjkRB5nP2+JN1O/AlVISKUBEqQkWoCBWhIlSEilARKkJFqAiVF1xtAPi2TVFIAAAAAElFTkSuQmCC'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']);c=b.new_context(**p.devices['Pixel 7'],permissions=['microphone'],timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 c.add_init_script("window.walkGeo={callback:null,cleared:[]};Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok){walkGeo.callback=ok;return 0},clearWatch(id){walkGeo.cleared.push(id);walkGeo.callback=null}}});")
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=home');page.locator('[data-ob36-quick=walk-kota]').tap();page.locator('[data-ob22-kota-start]').wait_for();page.wait_for_timeout(500)
 assert not page.locator('[data-kota-start-gps]').is_checked();page.locator('[data-kota-start-gps]').check()
 page.evaluate('''()=>{window.walkPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='calendar_entries')throw new DOMException('test','QuotaExceededError');return walkPut.apply(this,args)}}''');page.locator('[data-ob22-kota-start]').tap();page.get_by_text('散歩を開始できませんでした。空き容量を確認して、もう一度お試しください。',exact=True).wait_for();assert page.evaluate('async()=> [(await OUTBASE_REPOSITORIES_V160.activities.all()).length,(await OUTBASE_REPOSITORIES_V160.calendarEntries.all()).length]')==[0,0];page.evaluate('()=>{IDBObjectStore.prototype.put=walkPut}');print('Failed walk start rolls back activity and calendar together: PASS',flush=True)
 page.locator('[data-ob22-kota-start]').evaluate('(b)=>{b.click();b.click()}');page.locator('[data-kota-walk]').wait_for();page.get_by_role('button',name='一時停止',exact=True).wait_for();aid=page.evaluate('OUTBASE_ROUTER.current().activityId');original=page.evaluate('async id=>await OUTBASE_REPOSITORIES_V160.activities.get(id)',aid);assert original['state']=='active';assert original['type']=='walk';assert original['subtype']=='kota_walk';assert original['end_at'] is None
 reused=page.evaluate('async()=>OUTBASE_KOTA_WALK.start(OUTBASE_IDS.ulid())');assert reused['id']==aid;assert len(page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.activities.all()'))==1;print('HOME Kota action starts one active walk; repeated start returns the same walk: PASS',flush=True)

 page.wait_for_function('walkGeo.callback!==null');assert page.evaluate("localStorage.getItem('outbase-kota-start-gps')")=='yes'
 assert page.evaluate('OUTBASE_LOCATION_RECORDER.snapshot(OUTBASE_ROUTER.current().activityId).tracking')
 page.evaluate('walkGeo.callback({coords:{latitude:35,longitude:139,accuracy:3},timestamp:Date.now()})');page.wait_for_function('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).some(r=>r.type==="gps_point")')
 page.reload();page.locator('[data-kota-walk]').wait_for();assert page.evaluate('walkGeo.callback') is None
 page.get_by_role('button',name='ホーム',exact=True).tap();page.locator('[data-ob36-quick=walk-kota]').tap();assert page.locator('[data-kota-start-gps]').is_checked()
 page.evaluate("()=>{navigator.geolocation.watchPosition=(ok,fail)=>{window.permissionAttempts=(window.permissionAttempts||0)+1;fail({code:1});return 0}}")
 page.locator('[data-ob22-kota-start]').tap();page.locator('[data-kota-walk]').wait_for();page.get_by_text('位置情報が許可されていません。OUTBASE／Chromeのサイト設定で位置情報を許可してください。',exact=True).wait_for()
 assert page.evaluate('OUTBASE_ROUTER.current().activityId')==aid
 page.locator('[data-kota-event=water]').tap();page.wait_for_function('document.querySelector("[data-kota-event=water]").textContent.includes("1回")');page.wait_for_timeout(500);assert page.evaluate('permissionAttempts')==1
 page.get_by_role('button',name='ホーム',exact=True).tap();page.locator('[data-ob36-quick=walk-kota]').tap();page.locator('[data-kota-start-gps]').uncheck();page.locator('[data-ob22-kota-start]').tap();page.locator('[data-kota-walk]').wait_for();assert page.evaluate('permissionAttempts')==1
 assert page.evaluate("localStorage.getItem('outbase-kota-start-gps')")=='no';assert not errors,errors
 print('Remembered opt-in starts GPS with walk; reload stays stopped; denial is requested once; opt-out and walk events work: PASS',flush=True)
 c.close();b.close()
