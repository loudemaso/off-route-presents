// Temporary migration bridge. Removed after the published catalog is verified.
import { readFile } from 'node:fs/promises';
import { readRecords } from './content-store.mjs';
import { PUBLISHED_KEY } from './published-content.mjs';

export async function migrateContent(store, initial) {
  if (await store.get(PUBLISHED_KEY, { type: 'json' })) return;
  const records = {};
  for (const [kind, items] of Object.entries(initial)) {
    for (const item of items) {
      records[item.id] = { kind, id: item.id, revision: item.revision || '', item };
    }
  }
  for (const entry of await readRecords(store)) if (entry) records[entry.id] = entry;
  const images = new Set();
  for (const entry of Object.values(records)) {
    if (!entry.item) continue;
    const item = entry.item;
    if (item.image.startsWith('/media/')) images.add(item.image.slice(7));
    for (const match of item.body.matchAll(/src="\/media\/([a-f0-9]{24}\.(?:webp|jpg|png|gif|avif))"/g)) images.add(match[1]);
    item.image = item.image.replace('/media/', '/content-images/');
    item.body = item.body.replaceAll('src="/media/', 'src="/content-images/');
  }
  for (const name of images) {
    await store.set('media/' + name, await readFile('dist/media/' + name), { onlyIfNew: true });
  }
  const result = await store.setJSON(PUBLISHED_KEY, { version: 1, records, updatedAt: new Date().toISOString() }, { onlyIfNew: true });
  console.log(JSON.stringify({ event: 'catalog_migration', initialized: result.modified, records: Object.keys(records).length, copiedImages: images.size }));
}
