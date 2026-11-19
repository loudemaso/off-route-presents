import { publishingRequest } from '../../remote-content.mjs';
export default async function image(request) {
  const name = new URL(request.url).pathname.split('/').pop();
  if (!/^[a-f0-9]{24}\.(webp|jpg|png|gif|avif)$/.test(name)) return new Response('Not found', {status:404});
  const result = await publishingRequest('/images/'+name);
  if (!result.ok) return new Response('Image unavailable', {status: result.status === 404 ? 404 : 503});
  return new Response(result.body, {headers:{'Content-Type':result.headers.get('Content-Type'), 'Cache-Control':'private, max-age=31536000, immutable'}});
}
export const config = {path:'/content-images/*', method:'GET'};
