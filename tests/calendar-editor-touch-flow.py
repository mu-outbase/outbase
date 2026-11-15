"""Calendar editor input gestures must not dismiss an unsaved event."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(**p.devices['Pixel 7']);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 c.add_init_script("if(!sessionStorage.getItem('calendarTouchFixture')){localStorage.setItem('outbase_calendar_complete_v3_events','[]');localStorage.setItem('outbase_calendar_complete_v3_todos','[]');sessionStorage.setItem('calendarTouchFixture','yes');}")
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=calendar');f=page.frame_locator('#outbaseIntegratedCalendar');f.locator('body[data-story-calendar-status=ready]').wait_for();f.locator('#addEventBtn').click();f.locator('#eventForm [name=title]').fill('閉じずに登録');f.locator('#eventForm [name=memo]').fill('入力中の内容を保持')
 # Reproduce a downward gesture that starts on an input at the sheet's top.
 f.locator('#modalSheet').evaluate("e=>{e.scrollTop=0}")
 f.locator('#eventForm [name=title]').evaluate("e=>{const touch=y=>new Touch({identifier:1,target:e,clientX:100,clientY:y});e.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(100)]}));e.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,touches:[touch(230)]}));e.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[]}));}")
 page.wait_for_timeout(300)
 closed=f.locator('#modal').evaluate("e=>e.classList.contains('hidden')");print('Form gesture dismissed editor:',closed,flush=True);assert not closed
 f.locator('.sheet-head').evaluate("e=>{const touch=y=>new Touch({identifier:2,target:e,clientX:100,clientY:y});e.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(100)]}));e.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,touches:[touch(230)]}));e.dispatchEvent(new TouchEvent('touchcancel',{bubbles:true,touches:[]}));e.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[]}));}")
 page.wait_for_timeout(250);assert not f.locator('#modal').evaluate("e=>e.classList.contains('hidden')")
 f.locator('#modal').evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true}))");assert not f.locator('#modal').evaluate("e=>e.classList.contains('hidden')")
 assert f.locator('#eventForm [name=title]').input_value()=='閉じずに登録';assert f.locator('#eventForm [name=memo]').input_value()=='入力中の内容を保持'
 f.locator('#eventForm button[type=submit]').click();page.wait_for_function("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]').some(e=>e.title==='閉じずに登録')")
 rows=page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))");assert len(rows)==1;assert rows[0]['memo']=='入力中の内容を保持';page.reload();f=page.frame_locator('#outbaseIntegratedCalendar');f.locator('[data-view=list]').click();f.get_by_text('閉じずに登録',exact=True).first.wait_for()
 f.locator('#addEventBtn').click();f.locator('#eventForm [name=title]').fill('取消用');f.locator('#closeModal').click();assert f.locator('#modal').evaluate("e=>e.classList.contains('hidden')");assert len(page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events'))"))==1;assert not errors,errors
 print('Input gesture preserves draft; save persists once across reload; explicit close cancels without extra rows: PASS',flush=True);c.close();b.close()
