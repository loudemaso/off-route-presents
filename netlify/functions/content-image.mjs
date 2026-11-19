import {
  contentStore,
  isPreview,
  productionStore,
} from "../../content-store.mjs";

export default async function image(request, context) {
  const name = new URL(request.url).pathname.split("/").pop();
  if (!/^[a-f0-9]{24}\.(webp|jpg|png|gif|avif)$/.test(name))
    return new Response("Not found", { status: 404 });
  let bytes = await contentStore(context).get("media/" + name, {
    type: "arrayBuffer",
  });
  if (!bytes && isPreview(context))
    bytes = await productionStore().get("media/" + name, {
      type: "arrayBuffer",
    });
  if (!bytes)
    return new Response("Image unavailable", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const type = name.endsWith(".jpg") ? "jpeg" : name.split(".").pop();
  return new Response(request.method === "HEAD" ? null : bytes, {
    headers: {
      "Content-Type": "image/" + type,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
export const config = { path: "/content-images/*", method: ["GET", "HEAD"] };
