import { timingSafeEqual } from "node:crypto";
export function authenticated(request) {
  const secret = process.env.PUBLISH_SECRET;
  const value = request.headers.get("x-publish-secret") || "";
  return Boolean(
    secret &&
    Buffer.byteLength(value) === Buffer.byteLength(secret) &&
    timingSafeEqual(Buffer.from(value), Buffer.from(secret)),
  );
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
