import { imageTag } from "./images.mjs";

const graffiti = "/Resources/Brand/off-route-white-wordmark.png";
const photo = (name) => "/Resources/Placeholders/" + name + ".webp";
const stage = photo("forest-dance-floor");

const email = "brie@offroutepresents.com";
const navigation = ["Events", "Artists", "Posts", "Contact"];
const pageURL = (name) => "/" + name.toLowerCase() + "/";
const logo = (eager = false) =>
  imageTag(
    { image: graffiti, alt: "Off Route Presents" },
    {
      className: "logo",
      widths: [96, 192],
      sizes: "96px",
      width: 76,
      height: 64,
      eager,
    },
  );
const button = (label, href) => `<a class="button" href="${href}">${label}</a>`;
const kicker = (label) => `<p class="kicker">${label}</p>`;
const nav = (current) =>
  navigation
    .map(
      (name) =>
        `<a href="${pageURL(name)}" ${current.startsWith(pageURL(name)) ? 'aria-current="page"' : ""}>${name}</a>`,
    )
    .join("");
const routeLines = `<svg class="contours" viewBox="0 0 500 620" preserveAspectRatio="none" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<path transform="translate(${i * 11 - 100},${i * 5 - 50})" d="M20 -40 C 280 60,-180 105,80 210 S 290 315,125 390 S 85 535,210 660"/>`).join("")}</svg>`;
const contactLink = (topic) =>
  "mailto:" + email + "?subject=" + encodeURIComponent(topic);
const socialIcons = [
  [
    "Instagram",
    "https://www.instagram.com/",
    '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.9" r="1.1"/>',
  ],
  [
    "SoundCloud",
    "https://soundcloud.com/",
    '<path d="M11 16.8V8a5.2 5.2 0 0 1 9.5 2.9 3 3 0 1 1 .1 6H11Z"/><path d="M2 14v1m2.5-3.5v5M7 10v6.5m2-9v9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  ],
  [
    "YouTube",
    "https://www.youtube.com/",
    '<path fill-rule="evenodd" d="M4 5.4c2.9-.7 13.1-.7 16 0 2.1.5 2.5 2.8 2.5 6.6s-.4 6.1-2.5 6.6c-2.9.7-13.1.7-16 0C1.9 18.1 1.5 15.8 1.5 12S1.9 5.9 4 5.4Zm6 3.3v6.6l5.7-3.3Z"/>',
  ],
];
const socialNav =
  '<nav class="social-nav" aria-label="Example social links">' +
  socialIcons
    .map(
      ([name, url, icon]) =>
        `<a href="${url}" aria-label="${name} (example link to platform homepage)" title="${name} · example link"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">${icon}</svg></a>`,
    )
    .join("") +
  "</nav>";
function layout(path, title, content, cssVersion) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex"><meta name="theme-color" content="#10241c"><meta name="description" content="Independent electronic music events and artist management in Colorado. Explore Off Route shows, artists and posts.">
  <title>${title === "Home" ? "Off Route Presents" : title + " | Off Route Presents"}</title><link rel="preload" href="/Resources/Type/shrikhand.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/styles.css?v=${cssVersion}"></head>
  <body><a class="skip" href="#main">Skip to content</a><header class="masthead"><div class="wrap bar">
    <a class="brand sleeve" href="/" aria-label="Off Route Presents home"><span class="vinyl" aria-hidden="true"></span><span class="sleeve-face">${logo(true)}</span></a>
    <button class="menu-toggle" type="button" aria-label="Navigation menu" aria-expanded="false" aria-controls="header-links"><span aria-hidden="true"></span></button>
    <div class="header-links" id="header-links"><nav class="ticket-nav" aria-label="Main">${nav(path)}</nav>${socialNav}</div>
  </div></header><script src="/menu.js" defer></script>
  <main id="main">${content}</main><footer><div class="wrap foot"><a class="brand" href="/">${logo()}</a><p>Independent electronic music<br>Colorado</p><nav aria-label="Footer">${nav(path)}</nav></div></footer></body></html>`;
}
const heading = (label, title, summary) =>
  `<section class="intro"><div class="wrap">${kicker(label)}<h1>${title}</h1><p>${summary}</p></div>${routeLines}</section>`;
const detail = (kind, item) => "/" + kind + "/" + item.slug + "/";
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  dateStyle: "full",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  timeStyle: "short",
});
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const asDate = (value) =>
  new Date(value.length === 10 ? value + "T12:00:00-07:00" : value);

const dateTag = (value) =>
  value
    ? '<time datetime="' +
      asDate(value).toISOString() +
      '">' +
      dateFormat.format(asDate(value)) +
      "</time>"
    : "";
const photoTag = imageTag;
const location = (show) =>
  [show.venue, show.area, show.city, show.state].filter(Boolean).join(" · ");
const linkItem = (kind, item) =>
  '<a href="' + detail(kind, item) + '">' + item.name + "</a>";
const badge = (item) => (item.sample ? "Example · " : "");
const postCategory = (post) =>
  post.category?.toLowerCase() === "field notes" ? "Posts" : post.category;
const related = (label, html) =>
  html
    ? '<section class="paper block"><div class="wrap"><h2>' +
      label +
      "</h2>" +
      html +
      "</div></section>"
    : "";
const contactPage = () => [
  "About and contact",
  `${heading("About Off Route", "Get in touch.", "Off Route Presents brings people together through independent electronic shows and artist management in Colorado.")}<section class="paper block"><div class="wrap"><h2>Contact Brie<span>.</span></h2><p>For a set, a collaboration or a question about a show.</p><a class="email" href="mailto:${email}">${email}</a><div class="inquiries">${["Artist management", "Artist booking", "Events and partnerships", "General inquiry"].map((label) => `<a class="rule-link" href="${contactLink(label)}">${label}</a>`).join("")}</div></div></section>`,
];

export function parseRoute(path) {
  const normalized = path.endsWith("/") ? path : path + "/";
  if (["/", "/contact/"].includes(normalized)) return { path: normalized };
  const match =
    /^\/(events|artists|posts)(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?\/$/.exec(
      normalized,
    );
  return match ? { path: normalized, kind: match[1], slug: match[2] } : null;
}

export function renderPage(path, content, cssVersion, now = new Date()) {
  const route = parseRoute(path);
  if (!route) return null;
  path = route.path;
  if (path === "/contact/") return layout(path, ...contactPage(), cssVersion);
  const { artists, events, posts } = content;
  const item = route.slug
    ? content[route.kind].find((item) => item.slug === route.slug)
    : null;
  if (route.slug && !item) return null;
  const today = dayFormat.format(now);
  const eventOrder = (a, b) =>
    (a.start ? 0 : 1) - (b.start ? 0 : 1) ||
    (a.start && b.start ? asDate(a.start) - asDate(b.start) : 0) ||
    a.name.localeCompare(b.name);
  const postOrder = (a, b) =>
    asDate(b.date) - asDate(a.date) || a.slug.localeCompare(b.slug);
  const upcoming = () =>
    events
      .filter((e) => !e.start || dayFormat.format(asDate(e.start)) >= today)
      .sort(eventOrder);
  const past = () =>
    events
      .filter((e) => e.start && dayFormat.format(asDate(e.start)) < today)
      .sort(eventOrder)
      .reverse();
  const lineup = (show) =>
    show.lineup
      .map((id) => artists.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => linkItem("artists", a))
      .join(" · ");
  const featuredPoster = () => {
    const shows = upcoming().filter((e) => e.image);
    const featured = shows.find((e) => e.featured) ?? shows[0];
    return featured
      ? '<a class="pinned poster" href="' +
          detail("events", featured) +
          '">' +
          photoTag(featured, {
            eager: true,
            widths: [200, 400, 600],
            sizes: "(max-width:700px) 27vw, 270px",
          }) +
          "</a>"
      : "";
  };
  function showCard(show) {
    return (
      `<article class="show-tile${show.image ? "" : " no-cover"}">` +
      (show.image
        ? '<a class="flyer-link" href="' +
          detail("events", show) +
          '">' +
          photoTag(show) +
          "</a>"
        : "") +
      '<p class="meta">' +
      badge(show) +
      dateTag(show.start) +
      "</p><h3>" +
      linkItem("events", show) +
      "</h3><p>" +
      location(show) +
      '</p><p class="bill">' +
      lineup(show) +
      "</p></article>"
    );
  }
  function artistCard(a) {
    return (
      `<article class="person${a.image ? "" : " no-cover"}">` +
      (a.image
        ? '<a href="' + detail("artists", a) + '">' + photoTag(a) + "</a>"
        : "") +
      '<p class="meta">' +
      badge(a) +
      a.genre +
      "</p><h3>" +
      linkItem("artists", a) +
      "</h3><p>" +
      a.summary +
      "</p></article>"
    );
  }
  function postCard(p) {
    return (
      `<article class="story-card${p.image ? "" : " no-cover"}">` +
      (p.image
        ? '<a class="frame" href="' +
          detail("posts", p) +
          '">' +
          photoTag(p) +
          "</a>"
        : "") +
      "<div>" +
      kicker(badge(p) + postCategory(p)) +
      dateTag(p.date) +
      "<h3>" +
      linkItem("posts", p) +
      "</h3><p>" +
      p.summary +
      '</p><a class="rule-link" href="' +
      detail("posts", p) +
      '">Read the story</a></div></article>'
    );
  }

  const pages = {
    "/": () => [
      "Home",
      `<section class="hero">${photoTag({ image: stage, alt: "A crowd gathered under amber lights at an outdoor electronic show" }, { className: "crowd", eager: true, widths: [768, 1280, 1920], sizes: "100vw" })}<div class="wash"></div>${routeLines}
  <div class="wrap hero-inner"><div class="hero-copy">${kicker("Colorado / Independent electronic music")}<h1>Take the<br><em>long way.</em></h1><p>Underground shows and artist management.<br>For the ones who follow the sound.</p>${button("Explore events", "/events/")}</div>${featuredPoster()}</div></section>
  <section class="paper shows"><div class="wrap">${kicker("Shows / Colorado")}<div class="section-head"><h2>Upcoming shows<span>.</span></h2><a class="rule-link" href="/events/">All events</a></div><div class="show-grid">${upcoming().slice(0, 3).map(showCard).join("") || "<p>New dates coming soon.</p>"}</div></div></section>
  <section class="artists"><div class="wrap">${kicker("Artist management")}<div class="section-head"><h2>Behind the decks<span>.</span></h2><a class="rule-link" href="/artists/">All artists</a></div><div class="people-grid">${artists
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .slice(0, 3)
    .map(artistCard)
    .join("")}</div></div></section>
  <section class="paper block"><div class="wrap"><div class="section-head"><h2>Recent posts<span>.</span></h2><a class="rule-link" href="/posts/">All posts</a></div>${posts.length ? postCard(posts.toSorted(postOrder)[0]) : ""}</div></section>
  <section class="contact-band"><div class="wrap section-head"><h2>Get in touch.</h2>${button("Contact Off Route", "/contact/")}</div></section>`,
    ],
    "/events/": () => [
      "Events",
      `${heading("Shows / Colorado", "Upcoming shows.", "Explore the posters, lineups and rooms.")}<section class="paper block"><div class="wrap show-grid">${upcoming().map(showCard).join("") || "<p>New dates coming soon.</p>"}</div></section>${past().length ? '<section class="paper block"><div class="wrap"><h2>Past shows</h2><div class="show-grid">' + past().map(showCard).join("") + "</div></div></section>" : ""}`,
    ],
    "/artists/": () => [
      "Artists",
      `${heading("Artist management", "The artists.", "Meet the artists behind the decks.")}<section class="artists"><div class="wrap people-grid">${artists
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map(artistCard)
        .join("")}</div></section>`,
    ],
    "/posts/": () => [
      "Posts",
      `${heading("Off Route journal", "Posts.", "Announcements, studio notes and stories from Off Route.")}<section class="paper block"><div class="wrap stories">${posts.toSorted(postOrder).map(postCard).join("")}</div></section>`,
    ],
  };
  if (pages[path]) return layout(path, ...pages[path](), cssVersion);
  let title, body;
  if (route.kind === "events") {
    const show = item;
    const facts = [
      ["Venue", location(show)],
      ["Doors", show.doors && timeFormat.format(asDate(show.doors))],
      [
        "Music",
        show.start?.length > 10 &&
          timeFormat.format(asDate(show.start)) + " Mountain Time",
      ],
      ["Age", show.age],
      ["Price", show.price],
      ["Lineup", lineup(show)],
    ];
    const tickets = show.sample
      ? "Example event and venue. No tickets are on sale."
      : show.ticket && show.ticketStatus !== "Sold out"
        ? button(
            show.ticketStatus === "Free" ? "Event information" : "Tickets",
            show.ticket,
          )
        : show.ticketStatus;
    [title, body] = [
      show.name,
      heading(badge(show) + "Event", show.name, location(show)) +
        `<section class="paper block"><div class="wrap event-layout${show.image ? "" : " no-cover"}">` +
        (show.image
          ? '<div class="full-flyer">' +
            photoTag(show, {
              eager: true,
              sizes: "(max-width:700px) 85vw, 600px",
            }) +
            "</div>"
          : "") +
        "<div>" +
        kicker("Show details") +
        (show.start ? "<h2>" + dateTag(show.start) + "</h2>" : "") +
        '<dl class="facts">' +
        facts
          .filter(([, v]) => v)
          .map(([k, v]) => "<dt>" + k + "</dt><dd>" + v + "</dd>")
          .join("") +
        "</dl>" +
        show.body +
        "<p>" +
        tickets +
        "</p></div></div></section>" +
        related(
          "Related posts",
          posts
            .filter((p) => p.events.includes(show.id))
            .sort(postOrder)
            .map(postCard)
            .join(""),
        ),
    ];
  }
  if (route.kind === "artists") {
    const a = item;
    [title, body] = [
      a.name,
      heading(
        badge(a) + "Artist profile",
        a.name,
        [a.genre, a.home].filter(Boolean).join(" · "),
      ) +
        `<section class="artists"><div class="wrap duo${a.image ? "" : " no-cover"}">` +
        (a.image
          ? '<div class="portrait">' +
            photoTag(a, {
              eager: true,
              sizes: "(max-width:700px) 89vw, 640px",
            }) +
            "</div>"
          : "") +
        "<div>" +
        kicker("Biography") +
        a.body +
        "<p>" +
        a.links.map(([k, url]) => button(k, url)).join(" ") +
        "</p></div></div></section>" +
        related(
          "Related events",
          events
            .filter((e) => e.lineup.includes(a.id))
            .sort(eventOrder)
            .map(showCard)
            .join(""),
        ) +
        related(
          "Related posts",
          posts
            .filter((p) => p.artists.includes(a.id))
            .sort(postOrder)
            .map(postCard)
            .join(""),
        ),
    ];
  }
  if (route.kind === "posts") {
    const p = item;
    const relatedEvents = events
      .filter((e) => p.events.includes(e.id))
      .sort(eventOrder)
      .map((e) => linkItem("events", e))
      .join(" · ");
    const relatedArtists = artists
      .filter((a) => p.artists.includes(a.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => linkItem("artists", a))
      .join(" · ");
    [title, body] = [
      p.name,
      heading(badge(p) + postCategory(p), p.name, p.summary) +
        '<article class="paper block"><div class="wrap article"><p class="meta">' +
        dateTag(p.date) +
        (p.byline ? " · " + p.byline : "") +
        "</p>" +
        photoTag(p, { eager: true, sizes: "(max-width:740px) 89vw, 740px" }) +
        p.body +
        '<a class="rule-link" href="/posts/">Back to posts</a></div></article>' +
        related("Related events", relatedEvents) +
        related("Related artists", relatedArtists),
    ];
  }

  return layout(path, title, body, cssVersion);
}
