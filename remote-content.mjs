export async function publishingRequest(path) {
  const base = process.env.PUBLISH_SERVICE_URL;
  const secret = process.env.PUBLISH_SECRET;
  if (!base || !secret) throw Error('Publishing service is not configured');
  const url = new URL(path, base);
  if (url.protocol !== 'https:') throw Error('Publishing service requires HTTPS');
  return fetch(url, { headers: {'x-publish-secret':secret}, signal:AbortSignal.timeout(15000) });
}
