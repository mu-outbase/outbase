"""Video regression with synthetic files and disposable browser contexts.
Requires ffmpeg, Python Playwright, Chromium and a local OUTBASE server.
Run: OUTBASE_TEST_URL=http://127.0.0.1:8766/ python tests/execution-video-flow.py
"""
import os,base64,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
with tempfile.TemporaryDirectory(prefix='outbase-video-test-') as folder:
 files={}
 for ext,codec in [('webm','libvpx'),('mp4','libx264')]:
  path=Path(folder)/('test.'+ext)
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=green:s=64x48:d=1:r=10','-c:v',codec,'-pix_fmt','yuv420p','-threads','1','-an',str(path)],check=True)
  files[ext]={'name':path.name,'mimeType':'video/'+ext,'buffer':path.read_bytes()}
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852},timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
  page.goto(base+'?shell=1&view=plan-editor&returnShell=home');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1100);form.locator('[name=title]').fill('動画保存検証');form.locator('button[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId')
  record_url=base+'?shell=1&view=record&activityId='+aid;page.goto(record_url);page.locator('[data-ob19-control]').wait_for();page.wait_for_timeout(400)
  page.locator('[data-ob19-video-file]').set_input_files(files['webm']);page.locator('[data-ob19-video-cancel]').click();assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).length')==0;print('Cancel writes no record: PASS',flush=True)
  page.locator('[data-ob19-video-file]').set_input_files({'name':'broken.mp4','mimeType':'video/mp4','buffer':b'not a video'});page.locator('[data-ob19-video-save]').click();page.get_by_text('動画を保存できませんでした。選択した動画は残っています。再生できるファイルか確認して、もう一度お試しください。',exact=True).wait_for();assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.media.all()).length')==0;page.locator('[data-ob19-video-cancel]').click();print('Undecodable video rejected without writes: PASS',flush=True)
  page.locator('[data-ob19-video-file]').set_input_files(files['webm'])
  page.evaluate('()=>{window.videoOriginalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==="media")throw new DOMException("test quota","QuotaExceededError");return window.videoOriginalPut.apply(this,args)}}')
  page.locator('[data-ob19-video-save]').click();page.get_by_text('動画を保存できませんでした。選択した動画は残っています。再生できるファイルか確認して、もう一度お試しください。',exact=True).wait_for();counts=page.evaluate('async()=>[(await OUTBASE_REPOSITORIES_V160.records.all()).length,(await OUTBASE_REPOSITORIES_V160.media.all()).length]');assert counts==[0,0];print('Transaction failure rolls back both record and video: PASS',flush=True)
  page.evaluate('()=>{IDBObjectStore.prototype.put=window.videoOriginalPut}');c.set_offline(True)
  page.locator('[data-ob19-video-save]').evaluate('(button)=>{button.click();button.click()}');page.locator('[data-ob19-video-key]').wait_for();page.wait_for_function('document.querySelector("[data-ob19-video-key]")?.videoWidth===64');print('Offline save and WebM metadata load: PASS',flush=True)
  stored=page.evaluate('async()=>{const row=(await OUTBASE_REPOSITORIES_V160.media.all())[0];return {count:(await OUTBASE_REPOSITORIES_V160.records.all()).length,kind:row.media_type,activityId:row.activity_id,filename:row.filename,bytes:btoa(String.fromCharCode(...new Uint8Array(await row.blob.arrayBuffer())))}}');assert stored['count']==1 and stored['kind']=='video' and stored['activityId']==aid;assert stored['filename']=='test.webm' and stored['bytes']==base64.b64encode(files['webm']['buffer']).decode();print('Original WebM and activity relation preserved; no duplicates: PASS',flush=True)
  assert page.locator('[data-ob19-video-key]').evaluate('v=>v.paused');page.locator('[data-ob19-video-key]').evaluate('async v=>{await v.play()}');page.wait_for_function('document.querySelector("[data-ob19-video-key]").currentTime>0.05');print('Explicit playback works; no autoplay: PASS',flush=True)
  old_player=page.locator('[data-ob19-video-key]').element_handle();page.locator('[data-ob19-feature=memo]').click();page.wait_for_url('**view=memo**');assert old_player.evaluate('v=>v.paused&&!v.getAttribute("src")');print('Leaving execution stops playback and releases video: PASS',flush=True)
  page.locator('[data-ob22-memo-form]').get_by_role('button',name='キャンセル',exact=True).click();page.wait_for_url('**view=record**');c.set_offline(False)
  page.locator('[data-ob19-video-file]').set_input_files(files['mp4']);page.locator('[data-ob19-video-save]').click();page.wait_for_function('document.querySelectorAll("[data-ob19-video-key]").length===2');print('MP4 save: PASS',flush=True)
  backup=page.evaluate('async()=>{const result=await OUTBASE_STORAGE_EXPORT_V1.createArchive({includeCacheStorage:false,databaseNames:["outbase_story_db"]});const check=await OUTBASE_ISOLATED_ARCHIVE_VERIFIER_V1.verify(result.archive,{explicit:true});return {ok:check.ok,unchanged:!check.currentDatabasesModified,media:result.archive.indexedDB[0].stores.find(store=>store.name==="media").rows.map(row=>({name:row.value.filename,data:row.value.blob.data}))}}');assert backup['ok'] and backup['unchanged'];assert {row['name']:row['data'] for row in backup['media']}=={value['name']:base64.b64encode(value['buffer']).decode() for value in files.values()};print('Non-destructive backup and isolated verification preserve both original videos: PASS',flush=True)
  page.reload();page.wait_for_function('document.querySelectorAll("[data-ob19-video-key]").length===2');page.wait_for_function('[...document.querySelectorAll("[data-ob19-video-key]")].every(v=>v.videoWidth===64)');assert page.locator('[data-ob19-video-key]').evaluate_all('(vs)=>vs.every(v=>v.paused)');print('Both videos restored after reload without autoplay: PASS',flush=True)
  assert not errors,errors;print('JavaScript errors: NONE',flush=True);c.close();b.close()
