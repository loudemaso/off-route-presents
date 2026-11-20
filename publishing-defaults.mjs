import { PUBLISHED_KEY } from "./published-content.mjs";
import { ContentValidationError, requiredFields } from "./validation.mjs";
import { plain } from "./notion.mjs";

const denverDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function slugFromName(name, id) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100)
      .replace(/-$/, "") || "item-" + id.replaceAll("-", "").slice(0, 12)
  );
}

// Reserve defaults in the same atomic catalog as published records. This keeps
// concurrent names unique and retries stable, even if Notion writeback fails.
// Reservations contain no public content and survive Draft/Archived transitions.
export async function defaultProperties(store, page, kind, publishedAt) {
  const issues = requiredFields(page, kind);
  if (issues.length) throw new ContentValidationError(issues.join("; "));
  const missingSlug = !plain(page.properties.Slug?.rich_text).trim();
  const missingDate =
    kind === "posts" && !page.properties["Publish Date"]?.date?.start;
  if (!missingSlug && !missingDate) return {};
  for (let attempt = 0; attempt < 8; attempt++) {
    const previous = await store.getWithMetadata(PUBLISHED_KEY, {
      type: "json",
    });
    if (!previous) throw Error("Published content is not initialized.");
    const snapshot = structuredClone(previous.data);
    snapshot.defaults ??= {};
    const saved = snapshot.defaults[page.id] ?? { id: page.id, kind };
    const existing = snapshot.records[page.id]?.item;
    if (missingSlug && !saved.slug) {
      const base =
        existing?.slug ||
        slugFromName(plain(page.properties.Name.title), page.id);
      const used = new Set([
        ...Object.values(snapshot.records)
          .filter((e) => e.id !== page.id && e.kind === kind)
          .map((e) => e.item?.slug),
        ...Object.values(snapshot.defaults)
          .filter((e) => e.id !== page.id && e.kind === kind)
          .map((e) => e.slug),
      ]);
      saved.slug = base;
      for (let n = 2; used.has(saved.slug); n++) saved.slug = base + "-" + n;
    }
    if (missingDate && !saved.date) {
      saved.date = existing?.date || denverDay.format(new Date(publishedAt));
    }
    snapshot.defaults[page.id] = saved;
    if (
      await store
        .setJSON(PUBLISHED_KEY, snapshot, { onlyIfMatch: previous.etag })
        .then((r) => r.modified)
    ) {
      return {
        ...(missingSlug && {
          Slug: { rich_text: [{ text: { content: saved.slug } }] },
        }),
        ...(missingDate && { "Publish Date": { date: { start: saved.date } } }),
      };
    }
  }
  throw Error("Concurrent publication changed defaults. Retry publishing.");
}
