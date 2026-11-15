"""Share/copy current preparation without writing or sending anything automatically."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(**p.devices['Pixel 7'],timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=plan-editor');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1100);form.locator('[name=title]').fill('共有テストキャンプ');form.locator('[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId')
 page.evaluate('''async id=>{for(const row of [{category:'shopping',title:'食材 <script>注入不可</script>',status:'pending'},{category:'pet',title:'コタの水',status:'completed',completed_at:new Date().toISOString()}])await OUTBASE_REPOSITORIES_V160.preparationItems.save({...row,activity_id:id});}''',aid)
 page.goto(base+'?shell=1&view=preparation-detail&activityId='+aid);area=page.locator('[data-ob22-prep-share]');area.wait_for();field=area.locator('textarea');content=field.input_value();assert '共有テストキャンプ' in content and '☐ 食材 <script>注入不可</script>' in content and '☑ コタの水' in content
 before=page.evaluate('async()=>JSON.stringify(await OUTBASE_REPOSITORIES_V160.preparationItems.all())')
 page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedText=text}}})")
 area.locator('[data-ob22-prep-share-action=copy]').click();assert page.evaluate('window.copiedText')==content
 page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:async data=>{window.sharedData=data}})");area.locator('[data-ob22-prep-share-action=share]').click();assert page.evaluate('window.sharedData.text')==content
 page.evaluate("()=>{navigator.share=async()=>{throw new DOMException('cancel','AbortError')}}");area.locator('[data-ob22-prep-share-action=share]').click();area.locator('[role=status]').filter(has_text='取り消しました').wait_for()
 c.set_offline(True);page.evaluate("()=>{navigator.clipboard.writeText=async()=>{throw Error('denied')}}");area.locator('[data-ob22-prep-share-action=copy]').click();area.locator('[role=status]').filter(has_text='長押し').wait_for();assert field.evaluate('(n)=>n.selectionEnd-n.selectionStart')==len(content)
 assert before==page.evaluate('async()=>JSON.stringify(await OUTBASE_REPOSITORIES_V160.preparationItems.all())');assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');print('Categorized status, escaped text, copy, share, cancel, offline fallback and unchanged records: PASS',flush=True);b.close()
