import { seed, mergeRecords, contentStore, readRecords } from '../../content-store.mjs';
import { migratePublisher } from '../../migrate-publisher.mjs';
import { renderPages } from '../../render.mjs';
export default async function site(request, context) {
  const initial = await seed();
  let content = initial.content;
  try {
    const store = contentStore(context);
    await migratePublisher(store, context);
    content = mergeRecords(content, await readRecords(store));
  } catch (error) {
    console.error(error.message);
    return new Response('Content is temporarily unavailable. Please try again shortly.', {status:503, headers:{'Cache-Control':'no-store'}});
  }
  const path = new URL(request.url).pathname;
  const pages = renderPages(content, initial.cssVersion, new Date(), path.endsWith('/') ? path : path+'/');
  const html = pages[path.endsWith('/') ? path : path+'/'];
  return new Response(html || 'Page not found', {status:html ? 200 : 404, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'private, no-store'}});
}
export const config = {path:['/', '/events','/events/*','/artists','/artists/*','/posts','/posts/*','/contact','/contact/'], method:['GET','HEAD']};
