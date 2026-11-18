import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const output = 'dist';
const assets = {
  logo: 'Resources/Brand/off-route-white-wordmark.png',
  hero: 'Resources/Placeholders/forest-dance-floor.webp',
  poster: 'Resources/Placeholders/after-dark-poster.webp',
  booth: 'Resources/Placeholders/inside-the-booth.webp',
};

const navigation = [
  ['Events', '/events/'], ['Artists', '/artists/'], ['Posts', '/posts/'], ['Contact', '/contact/'],
];
const post = {
  title: 'Behind the booth',
  path: '/posts/behind-the-booth/',
  category: 'From the booth',
  excerpt: 'A preview of the stories, recordings, and people that can live here.',
};

function image(asset, alt, attributes = '') {
  return `<img src="/${asset}" alt="${alt}" ${attributes}>`;
}

function link(label, href, theme = '') {
  return `<a class="button ${theme}" href="${href}">${label}</a>`;
}

function layout(title, path, body) {
  const nav = navigation.map(([label, href]) => {
    const current = path.startsWith(href) ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${label}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta name="description" content="Off Route Presents brings people together through electronic music events and artist management.">
  <meta name="theme-color" content="#121c18">
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header"><div class="shell header-inner">
    <a class="brand" href="/" aria-label="Off Route Presents home">${image(assets.logo, '', 'width="60" height="50"')}</a>
    <nav aria-label="Main navigation">${nav}</nav>
  </div></header>
  <main id="main">${body}</main>
  <footer class="footer"><div class="shell footer-inner">
    <a class="brand" href="/" aria-label="Off Route Presents home">${image(assets.logo, '', 'width="74" height="62" loading="lazy"')}</a>
    <nav aria-label="Footer navigation">${nav}</nav>
    <span class="micro">Website prototype</span>
  </div></footer>
</body>
</html>`;
}

const showArt = image(assets.poster, 'Screen-printed illustration of a winding orange road beneath a pale sun', 'width="850" height="1062"');
const boothArt = image(assets.booth, 'Amber light across a turntable and a DJ’s hands', 'width="1200" height="800" loading="lazy"');

function headline(label, title, summary) {
  return `<section class="page-heading"><div class="shell"><p class="eyebrow">${label}</p><h1>${title}</h1><p>${summary}</p></div></section>`;
}

const pages = {
  '/': layout('Off Route Presents', '/', `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-photo">${image(assets.hero, '', 'fetchpriority="high" width="1600" height="800"')}</div>
      <div class="hero-wash"></div><div class="contours" aria-hidden="true"></div>
      <div class="shell hero-inner">
        <div class="hero-copy"><p class="eyebrow">Independent electronic music</p>
          <h1 id="hero-title">Take the<br><em>long way.</em></h1>
          <p>Electronic music events and artist management. Follow the sound and see where it takes you.</p>
          ${link('Explore events', '/events/', 'button-bright')}
        </div>
        <a class="hero-poster" href="/events/" aria-label="Explore events">${showArt}</a>
      </div>
    </section>
    <section class="paper next" aria-labelledby="events-title"><div class="shell">
      <p class="eyebrow">Events</p><h2 id="events-title">See you on<br>the dance floor.</h2>
      <div class="show-row"><div><h3>Upcoming shows</h3><p>Check back for the next announcement.</p></div>${link('All events', '/events/')}</div>
    </div></section>
    <section class="artists-band" aria-labelledby="artists-title"><div class="shell split">
      <div><p class="eyebrow">Artist management</p><h2 id="artists-title">Meet the artists.</h2><p>Discover the sounds and people behind Off Route.</p>${link('Explore artists', '/artists/')}</div>
      <div class="records" aria-hidden="true"></div>
    </div></section>
    <section class="paper editorial" aria-labelledby="posts-title"><div class="shell split">
      <a class="media-card" href="${post.path}" aria-label="Read ${post.title}">${boothArt}</a>
      <div><p class="eyebrow">Posts</p><h2 id="posts-title">${post.title}</h2><p>${post.excerpt}</p>${link('Explore posts', '/posts/')}</div>
    </div></section>`),
  '/events/': layout('Events | Off Route Presents', '/events/', `
    ${headline('Off Route Presents', 'Events', 'Electronic music for the people who take the long way.')}
    <section class="paper detail"><div class="shell split"><figure class="poster-detail">${showArt}<figcaption>Prototype artwork</figcaption></figure><div><h2>Upcoming shows</h2><p>Check back for the next announcement.</p>${link('Read announcements', '/posts/')}</div></div></section>`),
  '/artists/': layout('Artists | Off Route Presents', '/artists/', `
    ${headline('Artist management', 'Artists', 'Discover the people behind the sound.')}
    <section class="paper detail"><div class="shell split"><div><h2>Artist roster</h2><p>Artist profiles will appear here as they’re announced.</p>${link('Get in touch', '/contact/')}</div><div class="media-card">${boothArt}</div></div></section>`),
  '/posts/': layout('Posts | Off Route Presents', '/posts/', `
    ${headline('Off Route Presents', 'Posts', 'Event announcements, stories, and updates from the Off Route community.')}
    <section class="paper detail" aria-label="Latest posts"><div class="shell"><article class="split"><a class="media-card" href="${post.path}" aria-label="Read ${post.title}">${boothArt}</a><div><p class="eyebrow">${post.category} · Sample post</p><h2>${post.title}</h2><p>${post.excerpt}</p>${link('Read post', post.path)}</div></article></div></section>`),
  [post.path]: layout(`${post.title} | Off Route Presents`, post.path, `
    ${headline(`${post.category} · Sample post`, post.title, post.excerpt)}
    <article class="paper detail"><div class="shell article"><div class="media-card">${boothArt}</div><p>What happens before the first track? The Posts page is where Off Route can share conversations with artists, stories from the dance floor, and a closer look at the people who make a night happen.</p>${link('Back to posts', '/posts/')}</div></article>`),
  '/contact/': layout('Contact | Off Route Presents', '/contact/', `
    ${headline('Off Route Presents', 'Get in touch', 'For artist management, booking, event partnerships, and general inquiries.')}
    <section class="paper detail"><div class="shell"><h2>Contact Off Route</h2>${link('Email Off Route', 'mailto:brie@offroutepresents.com')}</div></section>`),
};

await rm(output, { recursive: true, force: true });

for (const [path, html] of Object.entries(pages)) {
  const file = join(output, path.slice(1), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

for (const source of ['styles.css', ...Object.values(assets)]) {
  const target = join(output, source);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}
