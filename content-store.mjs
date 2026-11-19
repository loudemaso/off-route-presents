import { getStore } from "@netlify/blobs";
import { PUBLISHED_KEY, snapshotContent } from "./published-content.mjs";

export const productionStore = () =>
  getStore({ name: "off-route-content-production", consistency: "strong" });
export const isProduction = (context) =>
  context?.deploy?.context === "production";
export const isPreview = (context) =>
  Boolean(context?.deploy?.id && !isProduction(context));

export function contentStore(context) {
  const suffix = isProduction(context)
    ? "production"
    : context?.deploy?.id || "local";
  return getStore({
    name: "off-route-content-" + suffix,
    consistency: "strong",
  });
}

export async function readPublished(context) {
  const snapshot = await contentStore(context).get(PUBLISHED_KEY, {
    type: "json",
  });
  // An untouched preview can view published content, but never writes production.
  if (!snapshot && isPreview(context)) {
    return snapshotContent(
      await productionStore().get(PUBLISHED_KEY, { type: "json" }),
    );
  }
  return snapshotContent(snapshot);
}

export async function writableStore(context) {
  const store = contentStore(context);
  if (
    isPreview(context) &&
    !(await store.get(PUBLISHED_KEY, { type: "json" }))
  ) {
    const snapshot = await productionStore().get(PUBLISHED_KEY, {
      type: "json",
    });
    if (!snapshot) throw Error("Published content is not initialized.");
    await store.setJSON(PUBLISHED_KEY, snapshot, { onlyIfNew: true });
  }
  return store;
}
