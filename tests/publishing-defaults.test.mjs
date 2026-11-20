import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublisher } from "../netlify/functions/publish-content.mjs";
import { defaultProperties, slugFromName } from "../publishing-defaults.mjs";
import { sources } from "../notion.mjs";
import { PUBLISHED_KEY, snapshotContent } from "../published-content.mjs";
import { renderPage } from "../render.mjs";
import { MemoryStore } from "./helpers.mjs";

const text = (content) => [{ text: { content }, plain_text: content }];
const row = (
  kind,
  id = "11111111-1111-1111-1111-111111111111",
  name = "Café & Sound",
) => ({
  id,
  parent: { data_source_id: sources[kind] },
  last_edited_time: "2026-11-20T02:00:00.000Z",
  properties: {
    Name: { title: text(name) },
    Status: { status: { name: "Published" } },
  },
});
const req = (id) =>
  new Request("https://example.com/publish", {
    method: "POST",
    headers: { "x-publish-secret": "test-secret" },
    body: JSON.stringify({ data: { id } }),
  });
async function store() {
  const s = new MemoryStore();
  await s.setJSON(PUBLISHED_KEY, { version: 1, records: {} });
  return s;
}
function setup(t) {
  process.env.PUBLISH_SECRET = "test-secret";
  process.env.NOTION_TOKEN = "test-only";
  t.after(() => {
    delete process.env.PUBLISH_SECRET;
    delete process.env.NOTION_TOKEN;
  });
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(String(url), /api.notion.com\/v1\/blocks\//);
    return Response.json({ results: [], has_more: false });
  });
}

test("Name-only records publish for all types, write defaults to Notion, and survive rename/republish", async (t) => {
  setup(t);
  const s = await store();
  for (const [index, kind] of Object.keys(sources).entries()) {
    let current = row(kind, `${index + 1}1111111-1111-1111-1111-111111111111`);
    const patches = [];
    let minute = 0;
    const tick = () =>
      (current.last_edited_time = `2026-11-20T02:${String(++minute).padStart(2, "0")}:00.000Z`);
    const publish = createPublisher({
      openStore: async () => s,
      fetchPage: async () => structuredClone(current),
      updatePage: async (id, properties) => {
        patches.push(structuredClone(properties));
        Object.assign(current.properties, properties);
        tick();
      },
    });
    assert.equal(
      (await (await publish(req(current.id))).json()).published,
      true,
    );
    assert.equal(patches.length, 1);
    assert.equal(
      current.properties.Slug.rich_text[0].text.content,
      "cafe-sound",
    );
    if (kind === "posts")
      assert.equal(current.properties["Publish Date"].date.start, "2026-11-19");
    let item = snapshotContent(await s.get(PUBLISHED_KEY))[kind][0];
    assert.equal(item.image, undefined);
    if (kind === "events") assert.equal(item.start, undefined);
    const content = snapshotContent(await s.get(PUBLISHED_KEY));
    for (const path of ["/", `/${kind}/`, `/${kind}/${item.slug}/`]) {
      const html = renderPage(path, content, "test");
      assert.ok(html.includes(item.name));
      assert.doesNotMatch(html, /url=undefined|Invalid Date|<time datetime=""/);
    }
    current.properties.Status.status.name = "Draft";
    tick();
    await publish(req(current.id));
    assert.equal(snapshotContent(await s.get(PUBLISHED_KEY))[kind].length, 0);
    current.properties.Name.title = text("Renamed");
    current.properties.Status.status.name = "Published";
    tick();
    await publish(req(current.id));
    await publish(req(current.id)); // duplicate delivery
    assert.equal(patches.length, 1);
    item = snapshotContent(await s.get(PUBLISHED_KEY))[kind][0];
    assert.equal(item.name, "Renamed");
    assert.equal(item.slug, "cafe-sound");
    if (kind === "posts") assert.equal(item.date, "2026-11-19");
  }
});

test("concurrent equal names reserve distinct slugs, retries preserve date, and supplied values are untouched", async () => {
  const s = await store();
  const a = row("posts", "a");
  const b = row("posts", "b");
  const [pa, pb] = await Promise.all(
    [a, b].map((p) => defaultProperties(s, p, "posts", p.last_edited_time)),
  );
  assert.deepEqual(
    new Set([
      pa.Slug.rich_text[0].text.content,
      pb.Slug.rich_text[0].text.content,
    ]),
    new Set(["cafe-sound", "cafe-sound-2"]),
  );
  assert.deepEqual(
    await defaultProperties(s, a, "posts", "2026-12-01T23:00:00Z"),
    pa,
  );
  Object.assign(a.properties, {
    Slug: { rich_text: text("custom") },
    "Publish Date": { date: { start: "2020-01-02" } },
  });
  assert.deepEqual(
    await defaultProperties(s, a, "posts", a.last_edited_time),
    {},
  );
  assert.match(
    slugFromName("🎵 日本語", "12345678-aaaa"),
    /^item-12345678aaaa$/,
  );
});

test("writeback failure leaves live content unchanged; a subsequent retry recovers", async (t) => {
  setup(t);
  const s = await store();
  const current = row("posts");
  let fail = true;
  const publish = createPublisher({
    openStore: async () => s,
    fetchPage: async () => structuredClone(current),
    updatePage: async (id, properties) => {
      if (fail) throw Error("Notion write unavailable");
      Object.assign(current.properties, properties);
    },
  });
  await assert.rejects(publish(req(current.id)), /Notion write unavailable/);
  assert.equal(snapshotContent(await s.get(PUBLISHED_KEY)).posts.length, 0);
  fail = false;
  assert.equal((await (await publish(req(current.id))).json()).published, true);
});

test("a status change during default writeback cannot publish a Draft", async (t) => {
  setup(t);
  const s = await store();
  const current = row("artists");
  const publish = createPublisher({
    openStore: async () => s,
    fetchPage: async () => structuredClone(current),
    updatePage: async (id, properties) => {
      Object.assign(current.properties, properties);
      current.properties.Status.status.name = "Draft";
      current.last_edited_time = "2026-11-20T03:00:00Z";
    },
  });
  assert.equal(
    (await (await publish(req(current.id))).json()).published,
    false,
  );
  assert.equal(snapshotContent(await s.get(PUBLISHED_KEY)).artists.length, 0);
});

test("undated events follow dated upcoming events, stay out of past, and leave dates blank", () => {
  const event = (slug, start) => ({
    id: slug,
    slug,
    name: slug,
    start,
    lineup: [],
    body: "",
  });
  const content = {
    artists: [],
    posts: [],
    events: [
      event("undated"),
      event("past", "2020-01-01"),
      event("future", "2030-01-01"),
    ],
  };
  const html = renderPage("/events/", content, "test", new Date("2026-11-20"));
  assert.ok(html.indexOf("/events/future/") < html.indexOf("/events/undated/"));
  assert.ok(html.indexOf("/events/undated/") < html.indexOf("Past shows"));
  const detail = renderPage("/events/undated/", content, "test");
  assert.doesNotMatch(detail, /<time|<dt>Music|full-flyer|url=undefined/);
  assert.match(detail, /event-layout no-cover/);
});
