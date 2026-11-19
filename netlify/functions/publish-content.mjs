import {
  ContentValidationError,
  recordValidationFailure,
} from "../../validation.mjs";
import { authenticated, privateHeaders } from "../../auth.mjs";
import { api, sources, loadPage } from "../../notion.mjs";
import { writableStore } from "../../content-store.mjs";
import { publishRecord } from "../../published-content.mjs";

export function createPublisher({
  fetchPage = (id) => api("pages/" + id),
  openStore = writableStore,
  load = loadPage,
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
    const page = await fetchPage(id);
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
      const published =
        !page.archived &&
        !page.in_trash &&
        page.properties.Status?.status?.name === "Published";
      const item = published ? await load(page, store) : null;
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
    } catch (error) {
      if (error instanceof ContentValidationError)
        return recordValidationFailure(store, page, kind, error);
      throw error;
    }
  };
}
export default createPublisher();
export const config = { path: "/publish", method: "POST" };
