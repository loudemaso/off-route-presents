// Temporary schema enrichment and removal of superseded storage. This module
// runs through the existing authenticated publisher, then is removed from code.
import { imageSize } from "image-size";
import { PUBLISHED_KEY } from "./published-content.mjs";

export async function finalizeMigration(store) {
  if (!(await store.get("migration-complete"))) return;
  const dimensions = new Map();
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await store.getWithMetadata(PUBLISHED_KEY, {
      type: "json",
    });
    if (!current)
      throw Error("Migration requires a verified published catalog.");
    const snapshot = structuredClone(current.data);
    for (const { item } of Object.values(snapshot.records)) {
      if (!item || item.imageWidth) continue;
      const name = item.image.split("/").pop();
      if (!dimensions.has(name)) {
        const bytes = await store.get("media/" + name, { type: "arrayBuffer" });
        if (!bytes) throw Error("Migration image missing: " + name);
        dimensions.set(name, imageSize(new Uint8Array(bytes)));
      }
      const size = dimensions.get(name);
      item.imageWidth = size.width;
      item.imageHeight = size.height;
    }
    const result = await store.setJSON(PUBLISHED_KEY, snapshot, {
      onlyIfMatch: current.etag,
    });
    if (!result.modified) continue;
    const { blobs } = await store.list({ prefix: "records/" });
    for (const { key } of blobs) await store.delete(key);
    await store.delete("migration-complete");
    console.log(
      JSON.stringify({
        event: "catalog_migration_finished",
        removedLegacyRecords: blobs.length,
      }),
    );
    return;
  }
  throw Error("Catalog changed during migration. Retry publishing.");
}
