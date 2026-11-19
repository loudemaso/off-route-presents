import { publishingRequest } from './remote-content.mjs';
// Temporary migration bridge. Removed after cutover verification.
export async function migratePublisher(store, context) {
  if (context?.deploy?.context !== 'production' || !process.env.PUBLISH_SERVICE_URL) return;
  if (await store.get('migration-complete')) return;
  const response = await publishingRequest('/snapshot');
  if (!response.ok) throw Error('Migration snapshot HTTP '+response.status);
  const records = await response.json();
  const images = new Set();
  for (const record of records) {
    for (const match of JSON.stringify(record.item).matchAll(/\/content-images\/([a-f0-9]{24}\.(?:webp|jpg|png|gif|avif))/g)) images.add(match[1]);
  }
  for (const name of images) {
    const response = await publishingRequest('/images/'+name);
    if (!response.ok) throw Error('Migration image HTTP '+response.status);
    await store.set('media/'+name, await response.arrayBuffer());
  }
  for (const record of records) await store.setJSON('records/'+record.id, record, {onlyIfNew:true});
  await store.setJSON('migration-complete', {records:records.length,images:images.size});
  console.log('Publisher migration complete', records.length, images.size);
}
