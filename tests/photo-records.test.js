import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/data/photo-records.js',import.meta.url),'utf8');
const requestId='01J00000000000000000000001';
function fixture(options={}){
 const calls={transactions:0,decodes:0,legacy:0};
 const blob=new Blob(['original'],{type:'image/png'});
 const context=vm.createContext({Blob,File,
  OUTBASE_IDS:{isUlid:value=>/^[0-9A-Z]{26}$/.test(value)},
  OUTBASE_REPOSITORIES_V160:{activities:{get:async()=>options.activity===null?null:{id:'a'}}},
  OUTBASE_DB_V160:{transaction:()=>{calls.transactions++;throw Error('unexpected write');},get:async(_store,id)=>id==='present'?{media_type:'photo',blob}:id==='video'?{media_type:'video',blob:new Blob(['video'],{type:'video/webm'})}:id==='audio'?{media_type:'audio',blob:new Blob(['audio'],{type:'audio/webm'})}:undefined},
  OUTBASE_LEGACY_ADAPTER_V160:{getRecordBlob:async()=>{calls.legacy++;return blob;}},
  createImageBitmap:options.decode|| (async()=>{calls.decodes++;throw Error('invalid image');})
 });vm.runInContext(source,context);return {api:context.OUTBASE_PHOTO_RECORDS,video:context.OUTBASE_VIDEO_RECORDS,audio:context.OUTBASE_AUDIO_RECORDS,calls};
}
const photo=()=>new File(['image bytes'],'photo.png',{type:'image/png'});
const input=file=>({activityId:'a',displayActivityId:'a',requestId,file});
test('namespaces Story media keys while preserving legacy keys',()=>{
 const {api}=fixture();assert.equal(api.keyFor({local_ref:{database:'outbase_story_db',store:'media',key:'x'}}),'story-photo:x');
 assert.equal(api.keyFor({local_ref:{database:'outbase_db',store:'fieldRecords',key:'legacy'}}),'legacy');assert.equal(api.keyFor({}),'');
});
test('reads Story blobs without consulting or opening legacy storage',async()=>{
 const {api,calls}=fixture();assert.equal((await api.readBlob('story-photo:present')).size,8);assert.equal(await api.readBlob('story-photo:missing'),null);assert.equal(calls.legacy,0);
 await api.readBlob('legacy');assert.equal(calls.legacy,1);
});
test('mismatched destinations and invalid request IDs cannot start a write',async()=>{
 const {api,calls}=fixture();await assert.rejects(api.save({...input(photo()),displayActivityId:'other'}));
 await assert.rejects(api.save({...input(photo()),requestId:'bad'}));assert.equal(calls.transactions,0);assert.equal(calls.decodes,0);
});
test('unsupported, empty and oversized files reject before decoding or writing',async()=>{
 const {api,calls}=fixture();
 for(const file of [new File(['text'],'bad.txt',{type:'text/plain'}),new File([],'empty.png',{type:'image/png'}),new Blob([new Uint8Array(api.MAX_BYTES+1)],{type:'image/png'})])await assert.rejects(api.save(input(file)));
 assert.equal(calls.transactions,0);assert.equal(calls.decodes,0);
});
test('missing activities and undecodable images leave storage untouched',async()=>{
 const missing=fixture({activity:null});await assert.rejects(missing.api.save(input(photo())));assert.equal(missing.calls.decodes,0);assert.equal(missing.calls.transactions,0);
 const invalid=fixture();await assert.rejects(invalid.api.save(input(photo())));assert.equal(invalid.calls.decodes,1);assert.equal(invalid.calls.transactions,0);
});
test('in-flight request IDs cannot be reused for another activity or file',async()=>{
 let rejectDecode;const {api}=fixture({decode:()=>new Promise((_resolve,reject)=>{rejectDecode=reject;})});
 const file=photo();const first=api.save(input(file));const rejected=assert.rejects(first);
 await assert.rejects(api.save({...input(file),activityId:'b',displayActivityId:'b'}));
 await assert.rejects(api.save(input(photo())));rejectDecode(Error('cancel decoding'));await rejected;
});

test('video keys and reads remain separate from photo keys and legacy storage',async()=>{
 const {video,calls}=fixture();assert.equal(video.keyFor({media_type:'video',local_ref:{database:'outbase_story_db',store:'media',key:'x'}}),'story-video:x');
 assert.equal((await video.readBlob('story-video:video')).type,'video/webm');assert.equal(await video.readBlob('story-video:present'),null);assert.equal(calls.legacy,0);
});
test('video format, size and empty-file validation happen before a write',async()=>{
 const {video,calls}=fixture();class TooBig extends Blob{get size(){return 50*1024*1024+1;}}
 for(const file of [photo(),new File([],'empty.webm',{type:'video/webm'}),new TooBig([],{type:'video/mp4'})])await assert.rejects(video.save(input(file)));
 assert.equal(video.MAX_BYTES,50*1024*1024);assert.equal(calls.transactions,0);
});
test('video context, request ID and missing activity reject before decoding',async()=>{
 const file=new File(['video'],'test.webm',{type:'video/webm'});const {video,calls}=fixture();
 await assert.rejects(video.save({...input(file),displayActivityId:'b'}));await assert.rejects(video.save({...input(file),requestId:'bad'}));assert.equal(calls.transactions,0);
 const missing=fixture({activity:null});await assert.rejects(missing.video.save(input(file)));assert.equal(missing.calls.transactions,0);
});

test('audio keys and reads remain separate from video, photo and legacy keys',async()=>{
 const {audio,calls}=fixture();assert.equal(audio.keyFor({media_type:'audio',local_ref:{database:'outbase_story_db',store:'media',key:'x'}}),'story-audio:x');
 assert.equal((await audio.readBlob('story-audio:audio')).type,'audio/webm');assert.equal(await audio.readBlob('story-audio:present'),null);assert.equal(calls.legacy,0);
});
test('audio rejects unsupported, empty and oversized blobs before a write',async()=>{
 const {audio,calls}=fixture();class TooBig extends Blob{get size(){return 20*1024*1024+1;}}
 for(const file of [photo(),new File([],'empty.webm',{type:'audio/webm'}),new TooBig([],{type:'audio/webm;codecs=opus'})])await assert.rejects(audio.save(input(file)));
 assert.equal(audio.MAX_BYTES,20*1024*1024);assert.equal(calls.transactions,0);
});
test('audio destination and missing activity cannot produce an orphan record',async()=>{
 const file=new File(['audio'],'voice.webm',{type:'audio/webm;codecs=opus'});const {audio,calls}=fixture();
 await assert.rejects(audio.save({...input(file),displayActivityId:'b'}));assert.equal(calls.transactions,0);
 const missing=fixture({activity:null});await assert.rejects(missing.audio.save(input(file)));assert.equal(missing.calls.transactions,0);
});
