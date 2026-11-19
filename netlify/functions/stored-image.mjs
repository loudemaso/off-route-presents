import { authenticated, privateHeaders } from '../../auth.mjs';
import { contentStore } from '../../content-store.mjs';
export default async function storedImage(request, context) {
  if (!authenticated(request)) return new Response('Unauthorized', {status:401, headers:privateHeaders});
  const name = new URL(request.url).pathname.split('/').pop();
  if (!/^[a-f0-9]{24}\.(webp|jpg|png|gif|avif)$/.test(name)) return new Response('Not found', { status: 404 });
  const image = await contentStore(context).get('media/' + name, { type: 'arrayBuffer' });
  if (!image) return new Response('Not found', { status: 404 });
  const type = name.endsWith('.jpg') ? 'jpeg' : name.split('.').pop();
  return new Response(image, { headers: { 'Content-Type': 'image/' + type, ...privateHeaders } });
}
export const config = { path: '/images/*', method:'GET' };
