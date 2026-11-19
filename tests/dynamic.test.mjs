import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRecords, saveRecord, readContent } from '../content-store.mjs';
import { authenticated } from '../auth.mjs';
import { renderPages } from '../render.mjs';
import fixture from './fixture.json' with {type:'json'};
class MemoryStore {
  values=new Map(); counter=0;
  async getWithMetadata(key) { return this.values.get(key) || null; }
  async get(key) { return this.values.get(key)?.data || null; }
  async list() { return {blobs:[...this.values.keys()].map(key=>({key}))}; }
  async setJSON(key,data,options={}) {
    const old=this.values.get(key);
    if(options.onlyIfNew && old || options.onlyIfMatch && old?.etag!==options.onlyIfMatch) return {modified:false};
    const etag=String(++this.counter); this.values.set(key,{data:structuredClone(data),etag}); return {modified:true,etag};
  }
}
const initial={artists:[],events:[],posts:[]};
test('authentication fails closed and accepts only the exact header',()=>{
  process.env.PUBLISH_SECRET='test-secret';
  const req=value=>new Request('https://example.com',{headers:value?{'x-publish-secret':value}:{}});
  assert.equal(authenticated(req()),false);
  assert.equal(authenticated(req('bad')),false);
  assert.equal(authenticated(req('test-secret')),true);
  delete process.env.PUBLISH_SECRET;
  assert.equal(authenticated(req('test-secret')),false);
});
test('create, update, unpublish, republish, and rename replace the record by ID',async()=>{
  const store=new MemoryStore();
  const item={id:'a',slug:'first',name:'First'};
  await saveRecord(store,{kind:'artists',id:'a',revision:'001',item});
  assert.equal((await readContent(store,initial)).artists[0].slug,'first');
  await saveRecord(store,{kind:'artists',id:'a',revision:'002',item:{...item,slug:'second'}});
  assert.deepEqual((await readContent(store,initial)).artists.map(x=>x.slug),['second']);
  await saveRecord(store,{kind:'artists',id:'a',revision:'003',item:null});
  assert.deepEqual((await readContent(store,{...initial,artists:[item]})).artists,[]);
  await saveRecord(store,{kind:'artists',id:'a',revision:'004',item});
  assert.equal((await readContent(store,initial)).artists.length,1);
});
test('out-of-order delivery cannot overwrite newer content',async()=>{
  const store=new MemoryStore();
  await saveRecord(store,{kind:'events',id:'a',revision:'002',item:null});
  assert.equal(await saveRecord(store,{kind:'events',id:'a',revision:'001',item:{id:'a'}}),false);
  assert.equal((await store.get('records/a')).item,null);
});
test('simultaneous records are preserved, including same-record retries',async()=>{
  const store=new MemoryStore();
  await Promise.all(['a','b','c'].map(id=>saveRecord(store,{kind:'posts',id,revision:'001',item:{id}})));
  assert.equal((await readContent(store,initial)).posts.length,3);
  await Promise.all(['002','003','004'].map(revision=>saveRecord(store,{kind:'posts',id:'a',revision,item:null})));
  assert.equal((await store.get('records/a')).revision,'004');
});
test('rendering connects updates to lists and related pages, then removes routes',async()=>{
  const {content,cssVersion}=structuredClone(fixture);
  const event=content.events[0];
  const updated={...event,name:'DYNAMIC TEST',slug:'dynamic-test',image:'/content-images/0123456789abcdef01234567.webp'};
  const state=mergeRecords(content,[{kind:'events',id:event.id,item:updated}]);
  const pages=renderPages(state,cssVersion,new Date('2026-11-19T15:00:00Z'));
  assert.match(pages['/events/'],/DYNAMIC TEST/);
  assert.match(pages['/events/dynamic-test/'],/content-images/);
  assert.equal(pages['/events/'+event.slug+'/'],undefined);
  const artist=content.artists.find(x=>event.lineup.includes(x.id));
  assert.match(pages['/artists/'+artist.slug+'/'],/DYNAMIC TEST/);
  const removed=renderPages(mergeRecords(state,[{kind:'events',id:event.id,item:null}]),cssVersion);
  assert.equal(removed['/events/dynamic-test/'],undefined);
  assert.doesNotMatch(removed['/events/'],/DYNAMIC TEST/);
  assert.equal(content.events[0].name,event.name);
});
test('empty collections render and Denver past-event grouping works without a build',async()=>{
  assert.match(renderPages(initial,'test')['/'],/New dates coming soon/);
  const {content,cssVersion}=structuredClone(fixture);
  const html=renderPages(content,cssVersion,new Date('2030-01-01T00:00:00Z'))['/events/'];
  assert.match(html,/Past shows/);
  assert.match(html,/New dates coming soon/);
});
test('publication and snapshot endpoints reject unauthenticated requests before accessing data',async()=>{
  const publish=(await import('../netlify/functions/publish-content.mjs')).default;
  const snapshot=(await import('../netlify/functions/content-snapshot.mjs')).default;
  const image=(await import('../netlify/functions/stored-image.mjs')).default;
  for(const handler of [publish,snapshot,image]) assert.equal((await handler(new Request('https://example.com/'))).status,401);
});
test('requested-page rendering returns only that route',()=>{
  const pages=renderPages(fixture.content,'test',new Date(),'/events/test-event/');
  assert.deepEqual(Object.keys(pages),['/events/test-event/']);
});
