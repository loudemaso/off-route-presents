import {
  ContentValidationError,
  recordValidationFailure,
} from "../../validation.mjs";
import { authenticated, privateHeaders } from "../../auth.mjs";
import { api, sources, loadPage } from "../../notion.mjs";
import { writableStore } from "../../content-store.mjs";
import { publishRecord } from "../../published-content.mjs";
import { defaultProperties } from "../../publishing-defaults.mjs";

export function createPublisher({
  fetchPage = (id) => api("pages/" + id),
  openStore = writableStore,
  load = loadPage,
  updatePage = (id, properties) => api("pages/" + id, { properties }, "PATCH"),
} = {}) {
  return async function publishContent(request, context) {
    if (!authenticated(request))
      return new Response("Unauthorized", {
        status: 401,
        headers: privateHeaders,
      });
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", {
        status: 400,
        headers: privateHeaders,
      });
    }
    const id = payload.data?.id || payload.page_id;
    if (!/^[a-f0-9-]{32,36}$/i.test(id || ""))
      return new Response("Missing page ID", {
        status: 400,
        headers: privateHeaders,
      });
    let page = await fetchPage(id);
    const kind = Object.keys(sources).find(
      (key) => sources[key] === page.parent?.data_source_id,
    );
    if (!kind)
      return new Response("Page is outside Off Route tables", {
        status: 403,
        headers: privateHeaders,
      });
    const store = await openStore(context);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        let published =
          !page.archived &&
          !page.in_trash &&
          page.properties.Status?.status?.name === "Published";
        if (published) {
          const eventTime = payload.data?.last_edited_time;
          const publishedAt =
            eventTime &&
            Number.isFinite(Date.parse(eventTime)) &&
            eventTime <= page.last_edited_time
              ? eventTime
              : page.last_edited_time;
          const properties = await defaultProperties(
            store,
            page,
            kind,
            publishedAt,
          );
          if (Object.keys(properties).length) {
            await updatePage(id, properties);
            // Read current content and status after writeback; never publish a
            // stale pre-write copy or use a property write to toggle Status.
            page = await fetchPage(id);
            continue;
          }
        }
        const item = published ? await load(page, store) : null;
        const latest = await fetchPage(id);
        if (latest.last_edited_time !== page.last_edited_time) {
          page = latest;
          continue;
        }
        const applied = await publishRecord(store, {
          kind,
          id: page.id,
          revision: page.last_edited_time,
          item,
        });
        if (applied) await store.delete("publishing-errors/" + page.id);
        return Response.json(
          {
            applied,
            published: applied && Boolean(item),
            slug: item?.slug,
            page_id: page.id,
          },
          { headers: privateHeaders },
        );
      }
      throw Error("Notion record changed while publishing. Retry publishing.");
    } catch (error) {
      if (error instanceof ContentValidationError)
        return recordValidationFailure(store, page, kind, error);
      throw error;
    }
  };
}
export default createPublisher();
export const config = { path: "/publish", method: "POST" };
