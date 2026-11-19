import { authenticated, privateHeaders } from '../../auth.mjs';
import { contentStore, readRecords } from '../../content-store.mjs';
export default async function snapshot(request, context) {
  if (!authenticated(request)) return new Response('Unauthorized', {status:401, headers:privateHeaders});
  return Response.json(await readRecords(contentStore(context)), {headers:privateHeaders});
}
export const config = { path:'/snapshot', method:'GET' };
