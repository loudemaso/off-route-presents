import { getStore } from '@netlify/blobs';
import { readFile } from 'node:fs/promises';

export function contentStore(context) {
  const suffix = context?.deploy?.context === 'production' ? 'production' : context?.deploy?.id || 'local';
  return getStore({ name: 'off-route-content-' + suffix, consistency: 'strong' });
}
export async function seed() {
  return JSON.parse(await readFile('seed.json', 'utf8'));
}
export async function readContent(store, initial) {
  const entries = await readRecords(store);
  return mergeRecords(initial, entries);
}
export async function readRecords(store) {
  const { blobs } = await store.list({ prefix:'records/' });
  return Promise.all(blobs.map(blob => store.get(blob.key, {type:'json'})));
}
export function mergeRecords(initial, entries) {
  const content = structuredClone(initial);
  for (const entry of entries) {
    if (!entry) continue;
    content[entry.kind] = content[entry.kind].filter(item => item.id !== entry.id);
    if (entry.item) content[entry.kind].push(entry.item);
  }
  return content;
}
export async function saveRecord(store, entry) {
  const key = 'records/' + entry.id;
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = await store.getWithMetadata(key, { type: 'json' });
    if (previous && previous.data.revision > entry.revision) return false;
    const options = previous ? { onlyIfMatch: previous.etag } : { onlyIfNew: true };
    const result = await store.setJSON(key, entry, options);
    if (result.modified) return true;
  }
  throw Error('Concurrent publication changed this record. Retry publishing.');
}
