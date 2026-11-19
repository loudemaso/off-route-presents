import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { finalizeMigration } from '../finalize-migration.mjs';
import { MemoryStore } from './helpers.mjs';

test('migration enriches the catalog before deleting only legacy records and marker', async () => {
  const store = new MemoryStore();
  store.list = async ({prefix}) => ({blobs: [...store.values.keys()].filter(k => k.startsWith(prefix)).map(key => ({key}))});
  await store.set('migration-complete', 'old');
  await store.set('records/old', {item: null});
  await store.set('media/test.webp', await readFile('Resources/Placeholders/forest-dance-floor.webp'));
  await store.setJSON('published-content', {version: 1, records: {a:{kind:'events', item:{image:'/content-images/test.webp'}}, b:{kind:'posts',item:null}}});
  await finalizeMigration(store);
  const catalog = await store.get('published-content');
  assert.ok(catalog.records.a.item.imageWidth > 0);
  assert.equal(catalog.records.b.item, null);
  assert.equal(await store.get('records/old'), null);
  assert.equal(await store.get('migration-complete'), null);
  assert.ok(await store.get('media/test.webp'));
  await finalizeMigration(store);
});
