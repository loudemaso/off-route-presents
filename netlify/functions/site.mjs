import { readPublished } from "../../content-store.mjs";
import { parseRoute, renderPage } from "../../render.mjs";
import { assetVersion } from "../../generated/assets.mjs";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
};

export function createSite({
  readContent = readPublished,
  render = renderPage,
} = {}) {
  return async function site(request, context) {
    const route = parseRoute(new URL(request.url).pathname);
    if (!route) return new Response("Page not found", { status: 404, headers });
    try {
      const content =
        route.path === "/contact/" ? null : await readContent(context);
      const html = render(route.path, content, assetVersion);
      return new Response(
        request.method === "HEAD" ? null : html || "Page not found",
        {
          status: html ? 200 : 404,
          headers,
        },
      );
    } catch (error) {
      console.error(error.message);
      return new Response(
        request.method === "HEAD"
          ? null
          : "Content is temporarily unavailable. Please try again shortly.",
        { status: 503, headers },
      );
    }
  };
}
export default createSite();
export const config = {
  path: [
    "/",
    "/events",
    "/events/*",
    "/artists",
    "/artists/*",
    "/posts",
    "/posts/*",
    "/contact",
    "/contact/",
  ],
  method: ["GET", "HEAD"],
};
