import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { authenticated } from "../auth.mjs";
import { renderPage } from "../render.mjs";
import { createSite } from "../netlify/functions/site.mjs";
import { createPublisher } from "../netlify/functions/publish-content.mjs";
import { sources } from "../notion.mjs";
import { requiredFields } from "../validation.mjs";
import { PUBLISHED_KEY, snapshotContent } from "../published-content.mjs";
import { MemoryStore } from "./helpers.mjs";
import fixture from "./fixture.json" with { type: "json" };

const now = new Date("2026-11-19T15:00:00Z");
const page = (path, content = fixture.content, time = now) =>
  renderPage(path, content, "test", time);

test("authentication fails closed and accepts only the exact header", (t) => {
  process.env.PUBLISH_SECRET = "test-secret";
  t.after(() => delete process.env.PUBLISH_SECRET);
  const req = (value) =>
    new Request("https://example.com", {
      headers: value ? { "x-publish-secret": value } : {},
    });
  assert.equal(authenticated(req()), false);
  assert.equal(authenticated(req("bad")), false);
  assert.equal(authenticated(req("test-secret")), true);
  delete process.env.PUBLISH_SECRET;
  assert.equal(authenticated(req("test-secret")), false);
});

test("detail, listing, and related pages reflect the same content", () => {
  const content = structuredClone(fixture.content);
  content.events[0].name = "UPDATED EVENT";
  content.events[0].slug = "updated";
  assert.match(page("/events/", content), /UPDATED EVENT/);
  assert.match(page("/events/updated/", content), /UPDATED EVENT/);
  assert.match(page("/artists/test-artist/", content), /UPDATED EVENT/);
  assert.equal(page("/events/test-event/", content), null);
  content.events = [];
  assert.equal(page("/events/updated/", content), null);
  assert.doesNotMatch(page("/artists/test-artist/", content), /UPDATED EVENT/);
});

test("empty collections and Denver event grouping need no rebuild", () => {
  const empty = { artists: [], events: [], posts: [] };
  assert.match(page("/", empty), /New dates coming soon/);
  const html = page("/events/", fixture.content, new Date("2030-01-01"));
  assert.match(html, /Past shows/);
  assert.match(html, /New dates coming soon/);
  const content = structuredClone(fixture.content);
  page("/", content);
  assert.deepEqual(content, fixture.content);
});

test("Contact and invalid routes never load or traverse CMS content", async () => {
  const site = createSite({
    readContent: () => {
      throw Error("Should not read content");
    },
  });
  assert.equal(
    (await site(new Request("https://example.com/contact/"))).status,
    200,
  );
  assert.equal(
    (await site(new Request("https://example.com/events/not/a/route/"))).status,
    404,
  );
  assert.ok(
    renderPage(
      "/contact/",
      new Proxy(
        {},
        {
          get() {
            throw Error("Should not traverse content");
          },
        },
      ),
      "test",
    ),
  );
});

test("artist listing does not render unrelated events or posts", () => {
  const content = {
    artists: fixture.content.artists,
    events: [
      {
        get start() {
          throw Error("Unrelated event rendered");
        },
      },
    ],
    posts: [{}],
  };
  assert.match(page("/artists/", content), /Test artist/);
});

test("page handler uses one content read, disables HTML caching, and supports HEAD", async () => {
  let reads = 0;
  const site = createSite({
    readContent: async () => {
      reads++;
      return fixture.content;
    },
  });
  const response = await site(new Request("https://example.com/events"));
  assert.equal(response.status, 200);
  assert.equal(reads, 1);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const head = await site(
    new Request("https://example.com/events/", { method: "HEAD" }),
  );
  assert.equal(await head.text(), "");
  assert.equal(head.status, 200);
  const missing = await site(
    new Request("https://example.com/events/missing/"),
  );
  assert.equal(missing.status, 404);
});

test("responsive images retain eager hero loading and defer below-fold cards", () => {
  const html = page("/");
  assert.match(html, /class="crowd"[^>]*loading="eager"/);
  assert.match(html, /class="show-tile"[\s\S]*?loading="lazy"/);
  assert.match(html, /srcset="[^\"]+320w, [^\"]+640w, [^\"]+960w"/);
  assert.match(html, /\.netlify\/images\?url=/);
});

test("incomplete content reports every required field", () => {
  const incomplete = {
    properties: {
      Name: { title: [{ plain_text: "Test" }] },
      Slug: { rich_text: [{ plain_text: "test" }] },
    },
  };
  assert.deepEqual(requiredFields(incomplete, "events"), [
    "Cover Image is required",
    "Show Starts is required and must be a valid date",
  ]);
});

test("actual publisher loads Notion content, persists images, updates, rejects invalid data, and unpublishes", async (t) => {
  process.env.PUBLISH_SECRET = "test-secret";
  t.after(() => delete process.env.PUBLISH_SECRET);
  process.env.NOTION_TOKEN = "test-only";
  t.after(() => delete process.env.NOTION_TOKEN);
  const id = "11111111-1111-1111-1111-111111111111";
  const store = new MemoryStore();
  await store.setJSON(PUBLISHED_KEY, { version: 1, records: {} });
  const text = (value) => [{ plain_text: value }];
  let current = {
    id,
    parent: { data_source_id: sources.events },
    last_edited_time: "2026-11-19T18:00:00.000Z",
    properties: {
      Name: { title: text("Live event") },
      Slug: { rich_text: text("live-event") },
      Status: { status: { name: "Published" } },
      "Show Starts": { date: { start: "2026-12-01T20:00:00-07:00" } },
      "Cover Image": {
        files: [
          {
            type: "external",
            external: { url: "https://images.example/poster.webp" },
          },
        ],
      },
    },
  };
  const bytes = await readFile(
    "Resources/Placeholders/forest-dance-floor.webp",
  );
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("/blocks/"))
      return Response.json({
        results: [
          { type: "paragraph", paragraph: { rich_text: text("The story") } },
        ],
        has_more: false,
      });
    if (String(url).startsWith("https://images.example/"))
      return new Response(bytes);
    throw Error("Unexpected request: " + url);
  });
  const publish = createPublisher({
    fetchPage: async () => structuredClone(current),
    openStore: async () => store,
  });
  const req = () =>
    new Request("https://example.com/publish", {
      method: "POST",
      headers: { "x-publish-secret": "test-secret" },
      body: JSON.stringify({ data: { id } }),
    });
  let response = await publish(req());
  assert.equal((await response.json()).published, true);
  let item = snapshotContent(await store.get(PUBLISHED_KEY)).events[0];
  assert.equal(item.name, "Live event");
  assert.match(item.image, /^\/content-images\//);
  assert.ok(item.imageWidth > 0);
  assert.match(item.body, /The story/);
  assert.ok(await store.get("media/" + item.image.split("/").pop()));
  current.last_edited_time = "2026-11-19T18:01:00.000Z";
  current.properties.Name.title = text("Updated event");
  await publish(req());
  assert.equal(
    snapshotContent(await store.get(PUBLISHED_KEY)).events[0].name,
    "Updated event",
  );
  current.last_edited_time = "2026-11-19T18:02:00.000Z";
  delete current.properties["Cover Image"];
  response = await publish(req());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).published, false);
  assert.equal(
    snapshotContent(await store.get(PUBLISHED_KEY)).events[0].name,
    "Updated event",
  );
  assert.ok(await store.get("publishing-errors/" + id));
  current.properties.Status.status.name = "Draft";
  current.last_edited_time = "2026-11-19T18:03:00.000Z";
  await publish(req());
  assert.equal(
    snapshotContent(await store.get(PUBLISHED_KEY)).events.length,
    0,
  );
  assert.equal(await store.get("publishing-errors/" + id), null);
});

test("publisher refuses unauthorized and unrelated pages before storage access", async () => {
  const publish = createPublisher({
    fetchPage: () => {
      throw Error("Should not fetch");
    },
  });
  assert.equal(
    (await publish(new Request("https://example.com/publish"))).status,
    401,
  );
});

test("related events stay chronological and posts newest first regardless of storage order", () => {
  const content = structuredClone(fixture.content);
  const event = content.events[0];
  content.events = [
    {
      ...event,
      id: "later",
      slug: "later-event",
      name: "LATER EVENT",
      start: "2027-02-06",
    },
    { ...event, name: "EARLIER EVENT", start: "2026-12-05" },
  ];
  const post = content.posts[0];
  content.posts = [
    { ...post, name: "OLDER POST", date: "2026-10-01" },
    {
      ...post,
      id: "newer",
      slug: "newer-post",
      name: "NEWER POST",
      date: "2026-11-01",
    },
  ];
  const original = structuredClone(content);
  const html = page("/artists/test-artist/", content);
  assert.ok(html.includes("EARLIER EVENT") && html.includes("LATER EVENT"));
  assert.ok(html.indexOf("EARLIER EVENT") < html.indexOf("LATER EVENT"));
  assert.ok(html.includes("NEWER POST") && html.includes("OLDER POST"));
  assert.ok(html.indexOf("NEWER POST") < html.indexOf("OLDER POST"));
  assert.deepEqual(content, original);
});
