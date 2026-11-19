import { ContentValidationError, recordValidationFailure } from '../../validation.mjs';
import { authenticated, privateHeaders } from '../../auth.mjs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { api, sources, loadContent } from '../../notion.mjs';
import { contentStore, readContent, saveRecord, seed } from '../../content-store.mjs';
import { renderPages } from '../../render.mjs';
import { migrateContent } from '../../migrate-content.mjs';
import { publishRecord } from '../../published-content.mjs';

export default async function publishContent(request, context) {
  if (!authenticated(request)) return new Response('Unauthorized', {status:401, headers:privateHeaders});
  let payload;
  try { payload = await request.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }
  const id = payload.data?.id || payload.page_id;
  if (!/^[a-f0-9-]{32,36}$/i.test(id || '')) return new Response('Missing page ID', { status: 400 });
  const page = await api('pages/' + id);
  const kind = Object.keys(sources).find(key => sources[key] === page.parent?.data_source_id);
  if (!kind) return new Response('Page is outside Off Route tables', { status: 403 });
  const store = contentStore(context);
  const initial = await seed();
  await migrateContent(store, initial.content);
  const dir = await mkdtemp(join(tmpdir(), 'off-route-'));
  try {
    let item = null;
    if (!page.archived && !page.in_trash && page.properties.Status?.status?.name === 'Published') {
      const content = await loadContent(dir, page);
      item = content[kind][0];
      item.image = item.image.replace('/media/', '/content-images/');
      item.body = item.body.replaceAll('src="/media/', 'src="/content-images/');
      const current = await readContent(store, initial.content);
      if (current[kind].some(other => other.id !== page.id && other.slug === item.slug)) {
        throw new ContentValidationError('Slug already published: '+item.slug);
      }
      current[kind] = current[kind].filter(other => other.id !== page.id).concat(item);
      renderPages(current, initial.cssVersion);
      for (const file of await readdir(join(dir, 'media'))) {
        await store.set('media/' + file, await readFile(join(dir, 'media', file)));
      }
    }
    await saveRecord(store, { kind, id: page.id, revision: page.last_edited_time, item });
    await publishRecord(store, { kind, id: page.id, revision: page.last_edited_time, item });
    await store.delete('publishing-errors/'+page.id);
    return Response.json({ published: Boolean(item), slug: item?.slug, page_id: page.id }, {headers:privateHeaders});
  } catch(error) {
    if(error instanceof ContentValidationError) return recordValidationFailure(store,page,kind,error);
    throw error;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
export const config = { path: '/publish', method: 'POST' };
