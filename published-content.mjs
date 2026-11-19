import { ContentValidationError } from './validation.mjs';

export const PUBLISHED_KEY = 'published-content';
export const emptyContent = () => ({ artists: [], events: [], posts: [] });

export function snapshotContent(snapshot) {
  if (snapshot?.version !== 1 || !snapshot.records) throw Error('Published content is not initialized.');
  const content = emptyContent();
  for (const entry of Object.values(snapshot.records)) {
    if (entry.item) content[entry.kind].push(entry.item);
  }
  return content;
}

// The whole published catalog is replaced atomically. A conflicting webhook must
// re-read the latest catalog before retrying; it must never overwrite it blindly.
export async function publishRecord(store, entry) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const previous = await store.getWithMetadata(PUBLISHED_KEY, { type: 'json' });
    if (!previous) throw Error('Published content is not initialized.');
    const snapshot = structuredClone(previous.data);
    const current = snapshot.records[entry.id];
    if (current && current.revision > entry.revision) return false;
    if (entry.item && Object.values(snapshot.records).some(other =>
      other.id !== entry.id && other.kind === entry.kind && other.item?.slug === entry.item.slug
    )) throw new ContentValidationError('Slug already published: ' + entry.item.slug);
    snapshot.records[entry.id] = entry;
    snapshot.updatedAt = new Date().toISOString();
    const result = await store.setJSON(PUBLISHED_KEY, snapshot, { onlyIfMatch: previous.etag });
    if (result.modified) return true;
  }
  throw Error('Concurrent publication changed the catalog. Retry publishing.');
}
