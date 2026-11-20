import { ContentValidationError, requiredFields } from "./validation.mjs";
import { createHash } from "node:crypto";
import { imageSize } from "image-size";
import { imageTag } from "./images.mjs";

export const sources = {
  artists: "41d27987-1128-808d-ad88-000bf5cc8e34",
  events: "41d27987-1128-80e9-abab-000b80711202",
  posts: "41d27987-1128-8044-8361-000b549a7527",
};
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const safeLink = (url) => (/^https?:\/\//i.test(url ?? "") ? escape(url) : "");
export const plain = (parts) =>
  (parts ?? []).map((p) => p.plain_text ?? p.text?.content ?? "").join("");
export async function api(path, payload, method = payload ? "POST" : "GET") {
  const token = process.env.NOTION_TOKEN;
  if (!token)
    throw Error("NOTION_TOKEN is required by the publishing function.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://api.notion.com/v1/" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.ok) return res.json();
    if ((res.status !== 429 && res.status < 500) || attempt === 4)
      throw Error("Notion " + res.status + " at " + path.split("?")[0]);
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        1000 * (Number(res.headers.get("retry-after")) || 2 ** attempt),
      ),
    );
  }
}
async function all(path, payload) {
  const results = [];
  let cursor;
  do {
    const data = payload
      ? await api(path, { ...payload, ...(cursor && { start_cursor: cursor }) })
      : await api(
          path + (cursor ? "?start_cursor=" + encodeURIComponent(cursor) : ""),
        );
    results.push(...data.results);
    cursor = data.has_more && data.next_cursor;
  } while (cursor);
  return results;
}
function rich(parts) {
  return (parts ?? [])
    .map((p) => {
      let html = escape(p.plain_text).replaceAll("\n", "<br>");
      for (const [flag, tag] of Object.entries({
        bold: "strong",
        italic: "em",
        strikethrough: "s",
        underline: "u",
        code: "code",
      })) {
        if (p.annotations?.[flag])
          html = "<" + tag + ">" + html + "</" + tag + ">";
      }
      return safeLink(p.href)
        ? '<a href="' + safeLink(p.href) + '">' + html + "</a>"
        : html;
    })
    .join("");
}
const assetURL = (file) => file?.[file.type]?.url;
async function media(file, store) {
  const raw = assetURL(file);
  if (!raw) throw new ContentValidationError("Cover Image is required");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ContentValidationError("Image URL is invalid");
  }
  if (url.protocol !== "https:")
    throw new ContentValidationError("Image requires HTTPS");
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    if ([400, 404, 410].includes(res.status))
      throw new ContentValidationError(
        "Image download failed: HTTP " + res.status,
      );
    throw Error("Image download failed: HTTP " + res.status);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  let dimensions;
  try {
    dimensions = imageSize(bytes);
  } catch {
    throw new ContentValidationError("Image could not be read");
  }
  const ext = dimensions.type === "jpeg" ? "jpg" : dimensions.type;
  if (!["webp", "jpg", "png", "gif", "avif"].includes(ext))
    throw new ContentValidationError(
      "Use a WebP, JPEG, PNG, GIF, or AVIF image",
    );
  const name =
    createHash("sha256").update(bytes).digest("hex").slice(0, 24) + "." + ext;
  await store.set("media/" + name, bytes, { onlyIfNew: true });
  return {
    image: "/content-images/" + name,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
  };
}
async function body(id, store) {
  let html = "";
  for (const block of await all("blocks/" + id + "/children")) {
    const type = block.type,
      val = block[type];
    const tags = {
      paragraph: "p",
      heading_1: "h2",
      heading_2: "h2",
      heading_3: "h3",
      quote: "blockquote",
      bulleted_list_item: "ul",
      numbered_list_item: "ol",
    };
    if (type === "image")
      html +=
        "<figure>" +
        imageTag(
          { ...(await media(val, store)), alt: escape(plain(val.caption)) },
          { sizes: "(max-width:740px) 89vw, 740px" },
        ) +
        "<figcaption>" +
        rich(val.caption) +
        "</figcaption></figure>";
    else if (type === "divider") html += "<hr>";
    else if (tags[type]) {
      const tag = tags[type],
        content = rich(val.rich_text);
      html +=
        "<" +
        tag +
        ">" +
        (["ul", "ol"].includes(tag) ? "<li>" + content + "</li>" : content) +
        "</" +
        tag +
        ">";
    } else
      throw new ContentValidationError(
        "Unsupported public page block " + type + " on " + id,
      );
    if (block.has_children) html += await body(block.id, store);
  }
  return html;
}
export async function loadPage(row, store) {
  const kind = Object.keys(sources).find(
    (kind) => sources[kind] === row.parent?.data_source_id,
  );
  if (!kind)
    throw new ContentValidationError("Page is outside Off Route tables");
  const issues = requiredFields(row, kind);
  if (issues.length) throw new ContentValidationError(issues.join("; "));
  const p = row.properties;
  const get = (k) => escape(plain(p[k]?.rich_text));
  const date = (k) => p[k]?.date?.start;
  const rel = async (k) => {
    if (!p[k]?.has_more) return (p[k]?.relation ?? []).map((r) => r.id);
    return (await all("pages/" + row.id + "/properties/" + p[k].id)).map(
      (r) => r.relation.id,
    );
  };
  const slug = plain(p.Slug?.rich_text).trim(),
    name = escape(plain(p.Name?.title));
  const item = {
    id: row.id,
    slug,
    name,
    summary: get("Summary"),
    alt: get("Image Alt"),
    sample: p["Sample Content"]?.checkbox,
    body: await body(row.id, store),
    ...((p["Cover Image"]?.files?.[0] ?? row.cover)
      ? await media(p["Cover Image"]?.files?.[0] ?? row.cover, store)
      : {}),
  };
  if (kind === "artists")
    Object.assign(item, {
      genre: (p.Genres?.multi_select ?? [])
        .map((g) => escape(g.name))
        .join(" / "),
      home: get("Home Base"),
      links: ["Instagram", "SoundCloud", "Website"]
        .map((k) => [k, safeLink(p[k]?.url)])
        .filter(([, url]) => url),
    });
  if (kind === "events")
    Object.assign(item, {
      start: date("Show Starts"),
      doors: date("Doors"),
      venue: get("Venue"),
      area: get("Neighborhood"),
      city: get("City"),
      state: get("State"),
      age: get("Age Policy"),
      price: get("Price Display"),
      ticket: safeLink(p["Ticket URL"]?.url),
      ticketStatus: escape(p["Ticket Status"]?.select?.name),
      featured: p["Feature on Home"]?.checkbox,
      lineup: await rel("Lineup"),
    });
  if (kind === "posts")
    Object.assign(item, {
      date: date("Publish Date"),
      category: escape(p.Category?.select?.name),
      byline: get("Byline"),
      events: await rel("Related Events"),
      artists: await rel("Related Artists"),
    });
  return item;
}
