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
  OUTBASE_DB_V160:{transaction:()=>{calls.transactions++;throw Error('unexpected write');},get:async(_store,id)=>id==='present'?{media_type:'photo',blob}:undefined},
  OUTBASE_LEGACY_ADAPTER_V160:{getRecordBlob:async()=>{calls.legacy++;return blob;}},
  createImageBitmap:options.decode|| (async()=>{calls.decodes++;throw Error('invalid image');})
 });vm.runInContext(source,context);return {api:context.OUTBASE_PHOTO_RECORDS,calls};
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
