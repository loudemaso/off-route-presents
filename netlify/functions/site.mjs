import { seed, mergeRecords } from '../../content-store.mjs';
import { publishingRequest } from '../../remote-content.mjs';
import { renderPages } from '../../render.mjs';
export default async function site(request, context) {
  const initial = await seed();
  let content = initial.content;
  // A preview without production credentials is intentionally a seed-only preview.
  if (process.env.PUBLISH_SECRET) {
    try {
      const response = await publishingRequest('/snapshot');
      if (!response.ok) throw Error('Publishing service HTTP '+response.status);
      content = mergeRecords(content, await response.json());
    } catch (error) {
      console.error(error.message);
      return new Response('Content is temporarily unavailable. Please try again shortly.', {status:503, headers:{'Cache-Control':'no-store'}});
    }
  } else if (context?.deploy?.context === 'production') {
    return new Response('Publishing service is not configured', {status:503});
  }
  const path = new URL(request.url).pathname;
  const pages = renderPages(content, initial.cssVersion, new Date(), path.endsWith('/') ? path : path+'/');
  const html = pages[path.endsWith('/') ? path : path+'/'];
  return new Response(html || 'Page not found', {status:html ? 200 : 404, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'private, no-store'}});
}
export const config = {path:['/', '/events','/events/*','/artists','/artists/*','/posts','/posts/*','/contact','/contact/'], method:['GET','HEAD']};
