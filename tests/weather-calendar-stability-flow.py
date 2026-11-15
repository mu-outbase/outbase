"""Late weather completion and shell refresh must preserve a calendar draft; errors are terminal."""
import os,json
from datetime import datetime,timedelta
from playwright.sync_api import sync_playwright
now=datetime.now().replace(hour=0,minute=0,second=0,microsecond=0);dates=[(now+timedelta(days=i)).strftime('%Y-%m-%d') for i in range(16)];hours=[(now+timedelta(hours=i)).strftime('%Y-%m-%dT%H:00') for i in range(16*24)]
forecast={'timezone':'Asia/Tokyo','current':{'time':datetime.now().isoformat(),'temperature_2m':21.8,'weather_code':1,'wind_speed_10m':1.9},'daily':{'time':dates,'temperature_2m_max':[24]*16,'temperature_2m_min':[15]*16,'weather_code':[1]*16},'hourly':{'time':hours,'temperature_2m':[22]*len(hours),'weather_code':[1]*len(hours),'precipitation_probability':[10]*len(hours),'wind_speed_10m':[2]*len(hours)}}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(**p.devices['Pixel 7']);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));pending=[];fail=[False]
 def weather(route):
  if fail[0]:route.abort()
  else:pending.append(route)
 c.route('https://api.open-meteo.com/**',weather)
 seed=[{'id':'camp','title':'朝霧ジャンボ','start':dates[1]+'T09:00','end':dates[2]+'T10:00','place':'','calendarId':'camp','participants':[],'repeat':{'freq':'none'}}]
 c.add_init_script("if(!sessionStorage.getItem('weatherCalendarSeed')){localStorage.setItem('outbase_calendar_complete_v3_events',"+json.dumps(json.dumps(seed,ensure_ascii=False))+ ");sessionStorage.setItem('weatherCalendarSeed','yes')}")
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 def settle():
  for i in range(120):
   page.wait_for_timeout(50)
   while pending:pending.pop(0).fulfill(status=200,content_type='application/json',body=json.dumps(forecast))
   if not page.evaluate("document.body.classList.contains('ob36-weather-refreshing')"):return
  raise AssertionError('weather refresh did not finish')
 page.goto(base+'?shell=1&view=calendar');f=page.frame_locator('#outbaseIntegratedCalendar');f.locator('body[data-story-calendar-status=ready]').wait_for();f.locator('#addEventBtn').click();f.locator('#eventForm [name=title]').fill('入力を保持');f.locator('#eventForm [name=memo]').fill('天気更新で閉じない');page.evaluate('window.stableFrame=document.querySelector("#outbaseIntegratedCalendar")');f.locator('#eventForm').evaluate('e=>window.stableForm=e')
 settle();assert page.evaluate('stableFrame===document.querySelector("#outbaseIntegratedCalendar")');assert f.locator('#eventForm').evaluate('e=>e===window.stableForm');assert f.locator('[name=title]').input_value()=='入力を保持'
 page.evaluate("async()=>{await OUTBASE_SHELL_V166.render('data-change')}");assert page.evaluate('stableFrame===document.querySelector("#outbaseIntegratedCalendar")');assert f.locator('[name=memo]').input_value()=='天気更新で閉じない'
 page.evaluate("localStorage.setItem('outbase_weather_last_update_v1',String(Date.now()-31*60000));window.dispatchEvent(new Event('focus'))");page.wait_for_timeout(200);settle();assert f.locator('#eventForm').evaluate('e=>e===window.stableForm');print('Late app-open weather, generic rerender and focus refresh preserve calendar frame/form/draft: PASS',flush=True)
 f.locator('#eventForm [type=submit]').click();page.wait_for_function("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')).some(e=>e.title==='入力を保持')");page.get_by_role('button',name='ホーム',exact=True).click();page.locator('.ob36-intel').wait_for();assert '予定の場所を設定してください' in page.locator('.ob36-intel').inner_text();assert '未取得' in page.locator('.ob36-intel').inner_text();assert '自動取得中' not in page.locator('.ob36-plans').inner_text();print('Missing place shows actionable state and no fabricated last-update time: PASS',flush=True)
 page.evaluate('(start)=>localStorage.setItem("outbase_home_weather_plan_v36","calendar-v44:camp:"+new Date(start).toISOString())',seed[0]['start'])
 page.evaluate("()=>{const rows=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'));rows.find(e=>e.id==='camp').place='柏の葉公園';localStorage.setItem('outbase_calendar_complete_v3_events',JSON.stringify(rows));window.weatherJob=OUTBASE_HOME_V36_BRIDGE.performWeatherRefresh('manual',{silent:true});}");settle();page.wait_for_function('document.querySelector(".ob36-intel").classList.contains("is-ready")');assert page.evaluate('OUTBASE_WEATHER_SERVICE_V1.getToday().temperature')==21.8;assert page.evaluate('OUTBASE_WEATHER_SERVICE_V1.getPlan({id:"calendar-v44:camp:"+new Date('+json.dumps(seed[0]['start'])+').toISOString(),place:"柏の葉公園",startAt:'+json.dumps(seed[0]['start'])+',endAt:'+json.dumps(seed[0]['end'])+'}).status')=='ready';last=page.evaluate('OUTBASE_WEATHER_SERVICE_V1.getToday().fetchedAt')
 fail[0]=True;page.evaluate("()=>{window.weatherJob=OUTBASE_HOME_V36_BRIDGE.performWeatherRefresh('manual',{silent:true})}");page.wait_for_function("!document.body.classList.contains('ob36-weather-refreshing')");assert page.evaluate('OUTBASE_WEATHER_SERVICE_V1.getToday().fetchedAt')==last;assert page.evaluate('OUTBASE_WEATHER_SERVICE_V1.getToday().stale');assert '前回取得した予報' in page.locator('.ob36-weather-card').inner_text()
 page.evaluate("()=>{localStorage.removeItem(OUTBASE_WEATHER_SERVICE_V1.CACHE_KEY);window.weatherJob=OUTBASE_HOME_V36_BRIDGE.performWeatherRefresh('manual',{silent:true})}");page.wait_for_function("!document.body.classList.contains('ob36-weather-refreshing')");assert '天気を取得できません' in page.locator('.ob36-weather-card').inner_text();assert '天気を取得できません' in page.locator('.ob36-intel').inner_text();assert '未取得' in page.locator('.ob36-intel').inner_text();assert '予報を取得しています' not in page.locator('.ob36-intel').inner_text();assert not errors,errors
 print('Known-place forecast succeeds; failed update retains real cached time; empty-cache failure exits loading: PASS',flush=True);c.close();b.close()
