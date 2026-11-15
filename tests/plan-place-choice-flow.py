"""Resolve a plan name, explicitly choose among homonyms, and retain the chosen coordinates."""
import os,json
from datetime import datetime,timedelta
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
tomorrow=(datetime.now()+timedelta(days=1)).strftime('%Y-%m-%d');dates=[(datetime.now()+timedelta(days=i)).strftime('%Y-%m-%d') for i in range(16)]
features=[{'geometry':{'coordinates':[138.6,35.4]},'properties':{'name':'朝霧ジャンボリーキャンプ場','state':'静岡県','city':'富士宮市','country':'日本','countrycode':'JP','osm_key':'tourism','osm_value':'camp_site'}},{'geometry':{'coordinates':[138.1,36.6]},'properties':{'name':'朝霧ジャンボリーキャンプ場','state':'長野県','city':'長野市','country':'日本','countrycode':'JP','osm_key':'tourism','osm_value':'camp_site'}}]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context(hold=None):
  c=b.new_context(**p.devices['Pixel 7']);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));forecasts=[]
  def poi(route):
   q=parse_qs(urlsplit(route.request.url).query).get('q',[''])[0]
   if '通信失敗' in q:route.abort();return
   route.fulfill(status=200,content_type='application/json',body=json.dumps({'features':[] if '知らない' in q else features}))
  def weather(route):
   if hold is not None and hold.get('active'):
    hold.setdefault('pending',[]).append(route);return
   lat=float(parse_qs(urlsplit(route.request.url).query)['latitude'][0]);forecasts.append(lat);high=19 if lat==36.6 else 24
   data={'current':{'temperature_2m':high-3,'weather_code':1},'daily':{'time':dates,'temperature_2m_max':[high]*16,'temperature_2m_min':[12]*16,'weather_code':[1]*16},'hourly':{'time':[]}}
   route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
  c.route('https://photon.komoot.io/**',poi);c.route('https://api.open-meteo.com/**',weather)
  if hold is not None:
   def release():
    hold['active']=False
    for route in hold.pop('pending',[]):weather(route)
   hold['release']=release
  return c,page,errors,forecasts
 hold={'active':True};c,page,errors,forecasts=context(hold)
 seed=[{'id':'camp','title':'朝霧ジャンボ','place':'','start':tomorrow+'T09:00','end':tomorrow+'T18:00','calendarId':'camp','memo':'メモ維持','participants':['コタ'],'color':'#aa00ff','repeat':{'freq':'none'}},{'id':'other','title':'他の予定','place':'柏の葉公園','start':dates[5]+'T09:00','end':dates[5]+'T10:00','calendarId':'work'}]
 c.add_init_script("if(!sessionStorage.getItem('placeFixture')){localStorage.setItem('outbase_calendar_complete_v3_events',"+json.dumps(json.dumps(seed,ensure_ascii=False))+");sessionStorage.setItem('placeFixture','yes')}")
 page.goto(base+'?shell=1&view=home');rows=page.locator('[data-plan-place-results] button');rows.nth(1).wait_for();assert '静岡県' in rows.nth(0).inner_text();assert '長野県' in rows.nth(1).inner_text();assert page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))[0].place")=='';print('Plan name automatically finds multiple candidates with distinguishing addresses; no automatic write: PASS',flush=True)
 page.evaluate("()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='outbase_calendar_complete_v3_events')throw new DOMException('test','QuotaExceededError');return realSet.call(this,k,v)}}");rows.nth(1).click();page.get_by_text('場所を保存できませんでした。空き容量や通信状態を確認してください。',exact=True).wait_for();assert page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))[0].place")=='';page.evaluate('()=>{Storage.prototype.setItem=realSet}')
 rows.nth(1).click();page.wait_for_function("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))[0].weatherLocation?.latitude===36.6");hold['release']();page.wait_for_function('document.querySelector(".ob36-intel").classList.contains("is-ready")');assert 36.6 in forecasts
 saved=page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))");assert len(saved)==2;assert saved[1]==seed[1];assert saved[0]['weatherLocation']['latitude']==36.6;assert saved[0]['memo']==seed[0]['memo'];assert saved[0]['color']==seed[0]['color'];assert saved[0]['repeat']==seed[0]['repeat'];assert saved[0]['participants']==seed[0]['participants'];assert page.evaluate('async()=> (await OUTBASE_HOME_SCREEN_MODEL_V164.build()).weatherIntel.high')==19
 page.reload();page.locator('.ob36-intel.is-ready').wait_for();assert page.evaluate('async()=> (await OUTBASE_HOME_SCREEN_MODEL_V164.build()).selectedPlan.latitude')==36.6
 page.locator('[data-plan-place-picker] summary').click();page.locator('[data-plan-place-query]').fill('知らないキャンプ');page.locator('[data-plan-place-search]').click();page.get_by_text('候補が見つかりませんでした。正式名称や市区町村を加えて検索してください。',exact=True).wait_for()
 page.locator('[data-plan-place-query]').fill('通信失敗');page.locator('[data-plan-place-search]').click();page.get_by_text('候補を取得できませんでした。通信状態を確認し、もう一度検索してください。',exact=True).wait_for();assert page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))")==saved;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('Quota failure writes nothing; choosing second candidate changes forecast coordinates; reload preserves choice, details and other events; no-result/failure do not overwrite: PASS',flush=True);c.close()
 c,page,errors,forecasts=context();page.goto(base+'?shell=1&view=plan-editor');form=page.locator('[data-ob22-plan-form]');form.wait_for();form.locator('[name=title]').fill('朝霧ジャンボ');form.locator('[name=type]').select_option('camp');form.locator('[name=startDate]').fill(tomorrow);form.locator('[name=endDate]').fill(tomorrow);form.locator('[name=note]').fill('活動メモを維持');form.locator('[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId');before=page.evaluate('async id=>({row:await OUTBASE_REPOSITORIES_V160.activities.get(id),calendar:await OUTBASE_REPOSITORIES_V160.calendarEntries.all()})',aid)
 page.get_by_role('button',name='ホーム',exact=True).click();page.locator('[data-plan-place-results] button').first.wait_for();page.locator('[data-plan-place-results] button').first.click();page.wait_for_function('document.querySelector(".ob36-intel").classList.contains("is-ready")');after=page.evaluate('async id=>({row:await OUTBASE_REPOSITORIES_V160.activities.get(id),calendar:await OUTBASE_REPOSITORIES_V160.calendarEntries.all()})',aid)
 assert after['calendar']==before['calendar'];assert after['row']['state']==before['row']['state'];assert after['row']['metadata']['note']==before['row']['metadata']['note'];assert after['row']['metadata']['weather_location']['latitude']==35.4;assert page.evaluate('async()=> (await OUTBASE_HOME_SCREEN_MODEL_V164.build()).selectedPlan.latitude')==35.4;assert not errors,errors
 print('Story activity choice preserves calendar association, state and notes and exposes saved coordinates: PASS',flush=True);c.close();b.close()
