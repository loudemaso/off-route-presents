import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { artists, events, posts } from './season.mjs';

const graffiti = '/Resources/Brand/off-route-white-wordmark.png';
const photo = name => '/Resources/Placeholders/' + name + '.webp';
const stage = photo('forest-dance-floor');
const booth = photo('inside-the-booth');

const email = 'brie@offroutepresents.com';
const navigation = ['Events', 'Artists', 'Posts', 'Contact'];
const pageURL = name => '/' + name.toLowerCase() + '/';
const story = '/posts/behind-the-booth/';
const logo = '<img class="logo" src="' + graffiti + '" alt="Off Route Presents">';
const button = (label, href) => `<a class="button" href="${href}">${label}</a>`;
const kicker = label => `<p class="kicker">${label}</p>`;
const nav = (current) => navigation.map(name => `<a href="${pageURL(name)}" ${current.startsWith(pageURL(name)) ? 'aria-current="page"' : ''}>${name}</a>`).join('');
const routeLines = `<svg class="contours" viewBox="0 0 500 620" preserveAspectRatio="none" aria-hidden="true">${Array.from({length:12},(_,i)=>`<path transform="translate(${i*11-100},${i*5-50})" d="M20 -40 C 280 60,-180 105,80 210 S 290 315,125 390 S 85 535,210 660"/>`).join('')}</svg>`;
const storyDate = '<time datetime="2026-11-18">Nov 18, 2026</time>';
const storyCard = `<article class="story-card"><a class="frame" href="${story}" aria-label="Read Behind the booth"><img loading="lazy" src="${booth}" alt="A DJ cues a vinyl record in amber light"></a><div>${kicker('Field notes · Sample editorial')}<small>${storyDate}</small><h3><a href="${story}">Behind the booth</a></h3><p>Headphones on, fader down. A closer look at the minute before two tracks meet.</p><a class="rule-link" href="${story}">Read the story</a></div></article>`;
const contactLink = topic => 'mailto:' + email + '?subject=' + encodeURIComponent(topic);
function layout(path, title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex"><meta name="theme-color" content="#10241c"><meta name="description" content="Independent electronic music events and artist management in Colorado. Explore Off Route shows, artists and field notes.">
  <title>${title === 'Home' ? 'Off Route Presents' : title + ' | Off Route Presents'}</title><link rel="preload" href="/Resources/Type/shrikhand.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/styles.css"></head>
  <body><a class="skip" href="#main">Skip to content</a><header><div class="wrap bar"><a class="brand" href="/">${logo}</a><nav aria-label="Main">${nav(path)}</nav></div></header>
  <main id="main">${content}</main><footer><div class="wrap foot"><a class="brand" href="/">${logo}</a><p>Independent electronic music<br>Colorado</p><nav aria-label="Footer">${nav(path)}</nav></div></footer></body></html>`;
}
const heading = (label, title, summary) => `<section class="intro"><div class="wrap">${kicker(label)}<h1>${title}</h1><p>${summary}</p></div>${routeLines}</section>`;
const bySlug = list => Object.fromEntries(list.map(item => [item.slug, item]));
const artist = bySlug(artists);
const event = bySlug(events);
const imagePath = slug => photo('season/' + slug);
const dateLabel = iso => new Intl.DateTimeFormat('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(iso + 'T12:00:00Z'));
const dateTag = iso => `<time datetime="${iso}">${dateLabel(iso)}</time>`;
const detail = (type, item) => '/' + type + '/' + item.slug + '/';
const artistLinks = show => show.lineup.map(slug => `<a href="${detail('artists',artist[slug])}">${artist[slug].name}</a>`).join(' &nbsp;·&nbsp; ');
const seasonImage = (slug, alt, lazy=true) => `<img src="${imagePath(slug)}" alt="${alt}" loading="${lazy?'lazy':'eager'}" decoding="async">`;
function showCard(show) {
  const url = detail('events',show);
  return `<article class="show-tile"><a class="flyer-link" href="${url}" aria-label="See ${show.name} details">${seasonImage(show.slug,show.name+' lineup poster')}</a><p class="meta">${dateTag(show.date)}</p><h3><a href="${url}">${show.name}</a></h3><p>${show.venue} · Denver, CO</p><p class="bill">${artistLinks(show)}</p></article>`;
}
function artistCard(person) {
  const url = detail('artists',person);
  return `<article class="person"><a href="${url}" aria-label="Meet ${person.name}">${seasonImage(person.slug,person.alt)}</a><p class="meta">${person.genre}</p><h3><a href="${url}">${person.name}</a></h3><p>${person.bio.split('. ')[0]}.</p></article>`;
}
function postCard(post) {
  const url = detail('posts',post);
  return `<article class="story-card"><a class="frame" href="${url}" aria-label="Read ${post.title}">${seasonImage(post.image,artist[post.image]?.alt ?? event[post.image].name+' poster')}</a><div>${kicker(post.category)}${dateTag(post.date)}<h3><a href="${url}">${post.title}</a></h3><p>${post.excerpt}</p><a class="rule-link" href="${url}">Read the story</a></div></article>`;
}
const pages = {
  '/': ['Home', `<section class="hero"><img class="crowd" src="${stage}" fetchpriority="high" alt="A crowd gathered under amber lights at an outdoor electronic show"><div class="wash"></div>${routeLines}
  <div class="wrap hero-inner"><div class="hero-copy">${kicker('Colorado / Independent electronic music')}<h1>Take the<br><em>long way.</em></h1><p>Underground shows and artist management.<br>For the ones who follow the sound.</p>${button('Explore events', '/events/')}</div><a class="pinned poster" href="${detail('events',events[0])}" aria-label="Explore Switchback Social, a sample Denver show">${seasonImage(events[0].slug,'Switchback Social lineup poster',false)}</a></div></section>
  <section class="paper shows"><div class="wrap">${kicker('Denver / Example season')}<div class="section-head"><h2>Upcoming shows<span>.</span></h2><a class="rule-link" href="/events/">All events</a></div><div class="show-grid">${events.slice(0,3).map(showCard).join('')}</div></div></section>
  <section class="artists"><div class="wrap">${kicker('Artist management / Sample roster')}<div class="section-head"><h2>Behind the decks<span>.</span></h2><a class="rule-link" href="/artists/">All artists</a></div><div class="people-grid">${artists.slice(0,3).map(artistCard).join('')}</div></div></section>
  <section class="paper block"><div class="wrap"><div class="section-head"><h2>Field notes<span>.</span></h2><a class="rule-link" href="/posts/">All posts</a></div>${postCard(posts[0])}</div></section>
  <section class="contact-band"><div class="wrap section-head"><h2>Get in touch.</h2>${button('Contact Off Route','/contact/')}</div></section>`],
  '/events/': ['Events', `${heading('Denver / Example season','Upcoming shows.','Five fictional bills for a Denver winter. Explore the posters, lineups and rooms.')}<section class="paper block"><div class="wrap show-grid">${events.map(showCard).join('')}</div></section>`],
  '/artists/': ['Artists', `${heading('Artist management / Sample roster','The artists.','Five fictional Denver acts, from modular electro to live vocal house.')}<section class="artists"><div class="wrap people-grid">${artists.map(artistCard).join('')}</div></section>`],
  '/posts/': ['Posts', `${heading('Sample editorial','Field notes.','Announcements, studio notes and stories from our example Denver season.')}<section class="paper block"><div class="wrap stories">${postCard(posts[0])}${storyCard}${posts.slice(1).map(postCard).join('')}</div></section>`],
  [story]: ['Behind the booth', `${heading('Field notes / Sample editorial','Behind the booth.','Headphones on, fader down. A closer look at the minute before two tracks meet.')}<article class="paper block"><div class="wrap article"><p class="meta">Field notes &nbsp;/&nbsp; ${storyDate}</p><img src="${booth}" alt="A hand on the record while the other adjusts the mixer"><p>From the floor, you hear one record. Lean into the booth and there are two. One is already moving the room. The other lives in the headphones, turning over the same few bars while the DJ waits.</p><p>A fingertip nudges the platter. A kick drum finds its twin. For a few seconds the records share a bass line, and it gets hard to say where one ends. Then the old track slips away and the room is somewhere else.</p><a class="rule-link" href="/posts/">Back to posts</a></div></article>`],
  '/contact/': ['About and contact', `${heading('About Off Route','Get in touch.','Off Route Presents brings people together through independent electronic shows and artist management in Colorado.')}<section class="paper block"><div class="wrap"><h2>Contact Brie<span>.</span></h2><p>For a set, a collaboration or a question about a show.</p><a class="email" href="mailto:${email}">${email}</a><div class="inquiries">${['Artist management','Artist booking','Events and partnerships','General inquiry'].map(label=>`<a class="rule-link" href="${contactLink(label)}">${label}</a>`).join('')}</div></div></section>`],
};
for (const show of events) {
  const performers = show.lineup.map(slug=>artist[slug]);
  const related = posts.find(post=>post.event===show.slug);
  pages[detail('events',show)] = [show.name, `${heading('Denver / Fictional event',show.name,show.venue+' · '+show.area+' · Denver, CO')}<section class="paper block"><div class="wrap event-layout"><div class="full-flyer">${seasonImage(show.slug,show.name+' lineup poster featuring '+performers.map(a=>a.name).join(' and '),false)}</div><div>${kicker('Show details')}<h2 class="detail-title">${dateTag(show.date)}</h2><dl class="facts"><dt>Venue</dt><dd>${show.venue} · ${show.area}, Denver</dd><dt>Doors / music</dt><dd>${show.doors} / ${show.start} Mountain Time</dd><dt>Age</dt><dd>${show.age}</dd><dt>Sample price</dt><dd>${show.price}</dd><dt>Lineup</dt><dd>${artistLinks(show)}</dd></dl><p>${show.about}</p><p class="preview-note">Example event and venue. No tickets are on sale.</p><a class="rule-link" href="${detail('posts',related)}">${related.title}</a></div></div></section>`];
}
for (const person of artists) {
  const shows = events.filter(show=>show.lineup.includes(person.slug));
  pages[detail('artists',person)] = [person.name,`${heading('Artist profile / Fictional roster',person.name,person.genre)}<section class="artists"><div class="wrap duo"><div class="portrait">${seasonImage(person.slug,person.alt,false)}</div><div>${kicker('Biography')}<p>${person.bio}</p></div></div></section><section class="paper block"><div class="wrap"><h2>On the bill<span>.</span></h2><div class="show-grid">${shows.map(showCard).join('')}</div></div></section>`];
}
for (const post of posts) {
  const show = event[post.event];
  pages[detail('posts',post)] = [post.title,`${heading(post.category+' / Sample editorial',post.title,post.excerpt)}<article class="paper block"><div class="wrap article"><p class="meta">${dateTag(post.date)}</p>${seasonImage(post.image,artist[post.image]?.alt ?? show.name+' lineup poster',false)}${post.body.map(paragraph=>'<p>'+paragraph+'</p>').join('')}<a class="rule-link" href="${detail('events',show)}">Explore ${show.name}</a></div></article>`];
}

await rm('dist',{recursive:true,force:true});
for (const [path,[title,content]] of Object.entries(pages)) {
  const dest = join('dist',path,'index.html');
  await mkdir(dirname(dest),{recursive:true});
  const prefix = '../'.repeat(path.split('/').filter(Boolean).length) || './';
  const html = layout(path,title,content).replace(/(href|src)="\//g, (_, attribute) => attribute + '="' + prefix);
  await writeFile(dest,html);
  // GitHub Pages serves the committed project root while Netlify serves dist.
  const pagesFile = join(path.slice(1), "index.html");
  await mkdir(dirname(pagesFile), { recursive: true });
  await writeFile(pagesFile, html);
}
await cp('Resources','dist/Resources',{recursive:true});
await copyFile('styles.css','dist/styles.css');
