import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUBLISHED_KEY, publishRecord, snapshotContent } from '../published-content.mjs';

export class MemoryStore {
  values = new Map();
  counter = 0;
  calls = [];
  async getWithMetadata(key) {
    this.calls.push(['getWithMetadata', key]);
    return structuredClone(this.values.get(key) || null);
  }
  async get(key) { this.calls.push(['get', key]); return structuredClone(this.values.get(key)?.data ?? null); }
  async setJSON(key, data, options = {}) {
    const old = this.values.get(key);
    if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = String(++this.counter);
    this.values.set(key, {data: structuredClone(data), etag});
    return {modified: true, etag};
  }
  async delete(key) { this.values.delete(key); }
}
const entry = (id, revision = '002', slug = id) => ({kind:'events',id,revision,item:{id,slug}});
async function store() {
  const s = new MemoryStore();
  await s.setJSON(PUBLISHED_KEY, {version:1,records:{}});
  return s;
}
test('catalog retains concurrent changes to different records', async () => {
  const s = await store();
  await Promise.all(['a','b','c'].map(id => publishRecord(s,entry(id))));
  assert.equal(snapshotContent(await s.get(PUBLISHED_KEY)).events.length, 3);
});
test('catalog rejects duplicate slugs even when published concurrently', async () => {
  const s = await store();
  const results = await Promise.allSettled(['a','b'].map(id => publishRecord(s,entry(id,'002','same'))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length,1);
  assert.match(results.find(r => r.status === 'rejected').reason.message,/Slug already published/);
});
test('newer unpublish survives an out-of-order publication', async () => {
  const s = await store();
  await publishRecord(s,{...entry('a','003'),item:null});
  assert.equal(await publishRecord(s,entry('a','002')),false);
  assert.equal(snapshotContent(await s.get(PUBLISHED_KEY)).events.length,0);
});
test('catalog update, rename and republish use the same record identity', async () => {
  const s = await store();
  await publishRecord(s,entry('a'));
  await publishRecord(s,entry('a','003','renamed'));
  assert.deepEqual(snapshotContent(await s.get(PUBLISHED_KEY)).events,[{id:'a',slug:'renamed'}]);
  await publishRecord(s,{...entry('a','004'),item:null});
  await publishRecord(s,entry('a','005'));
  assert.equal(snapshotContent(await s.get(PUBLISHED_KEY)).events.length,1);
});
