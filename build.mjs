import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const graffiti = '/Resources/Brand/off-route-white-wordmark.png';
const photo = name => '/Resources/Placeholders/' + name + '.webp';
const stage = photo('forest-dance-floor');
const booth = photo('inside-the-booth');
const portrait = photo('at-the-decks');
const email = 'brie@offroutepresents.com';
const navigation = ['Events', 'Artists', 'Posts', 'Contact'];
const pageURL = name => '/' + name.toLowerCase() + '/';
const story = '/posts/behind-the-booth/';
const logo = '<img class="logo" src="' + graffiti + '" alt="Off Route Presents">';
const button = (label, href) => `<a class="button" href="${href}">${label}</a>`;
const kicker = label => `<p class="kicker">${label}</p>`;
const nav = (current) => navigation.map(name => `<a href="${pageURL(name)}" ${current.startsWith(pageURL(name)) ? 'aria-current="page"' : ''}>${name}</a>`).join('');
const routeLines = `<svg class="contours" viewBox="0 0 500 620" preserveAspectRatio="none" aria-hidden="true">${Array.from({length:12},(_,i)=>`<path transform="translate(${i*11-100},${i*5-50})" d="M20 -40 C 280 60,-180 105,80 210 S 290 315,125 390 S 85 535,210 660"/>`).join('')}</svg>`;
const poster = `<figure class="poster"><div class="poster-top"><span>OFF ROUTE PRESENTS</span><span>CO.</span></div><div class="art"><img src="${photo('after-dark-poster')}" alt="Orange road winding through green foothills toward a setting sun"><strong>After<br>Dark</strong></div><figcaption>COLORADO &nbsp; / &nbsp; POSTER STUDY</figcaption></figure>`;
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
const eventsCopy = '<h3>Next show to be announced.</h3><p>Dates, venues and tickets will appear here when the next show is confirmed.</p>';
const pages = {
  '/': ['Home', `<section class="hero"><img class="crowd" src="${stage}" fetchpriority="high" alt="A crowd gathered under amber lights at an outdoor electronic show"><div class="wash"></div>${routeLines}
  <div class="wrap hero-inner"><div class="hero-copy">${kicker('Colorado / Independent electronic music')}<h1>Take the<br><em>long way.</em></h1><p>Underground shows and artist management.<br>For the ones who follow the sound.</p>${button('Explore events', '/events/')}</div><div class="pinned">${poster}</div></div></section>
  <section class="paper shows"><div class="wrap">${kicker('Event calendar')}<h2>Upcoming shows<span>.</span></h2><div class="listing"><div>${eventsCopy}</div><a class="rule-link" href="/events/">All events</a></div></div></section>
  <section class="artists"><div class="wrap duo"><div class="portrait"><img loading="lazy" src="${portrait}" alt="A DJ listening through headphones at the decks"></div><div>${kicker('Artist management')}<h2>Behind<br>the decks<span>.</span></h2><p>Discover the people selecting the records and shaping the night.</p>${button('Explore artists', '/artists/')}</div></div></section>
  <section class="paper block"><div class="wrap"><div class="section-head"><h2>Field notes<span>.</span></h2><a class="rule-link" href="/posts/">All posts</a></div>${storyCard}</div></section>
  <section class="contact-band"><div class="wrap section-head"><h2>Get in touch.</h2>${button('Contact Off Route','/contact/')}</div></section>`],
  '/events/': ['Events', `${heading('Event calendar','Upcoming shows.','Dates, rooms and routes to the next dance floor.')}<section class="paper block"><div class="wrap event-detail">${poster}<div>${kicker('Upcoming events')}${eventsCopy}<a class="rule-link" href="/posts/">Read field notes</a></div></div></section>`],
  '/artists/': ['Artists', `${heading('Artist management','The artists.','Independent electronic music and the people behind it.')}<section class="artists"><div class="wrap duo"><div class="portrait"><img src="${portrait}" alt="Amber-lit DJ listening for the next cue"></div><div>${kicker('Managed roster')}<h2>Artist roster<span>.</span></h2><p>Profiles and music links will be added as artists are announced. For management and booking inquiries, get in touch with Brie.</p>${button('Booking inquiries',contactLink('Artist booking inquiry'))}</div></div></section>`],
  '/posts/': ['Posts', `${heading('Posts','Field notes.','Stories from the booth, artist news and show announcements.')}<section class="paper block"><div class="wrap">${storyCard}</div></section>`],
  [story]: ['Behind the booth', `${heading('Field notes / Sample editorial','Behind the booth.','Headphones on, fader down. A closer look at the minute before two tracks meet.')}<article class="paper block"><div class="wrap article"><p class="meta">Field notes &nbsp;/&nbsp; ${storyDate}</p><img src="${booth}" alt="A hand on the record while the other adjusts the mixer"><p>From the floor, you hear one record. Lean into the booth and there are two. One is already moving the room. The other lives in the headphones, turning over the same few bars while the DJ waits.</p><p>A fingertip nudges the platter. A kick drum finds its twin. For a few seconds the records share a bass line, and it gets hard to say where one ends. Then the old track slips away and the room is somewhere else.</p><a class="rule-link" href="/posts/">Back to posts</a></div></article>`],
  '/contact/': ['About and contact', `${heading('About Off Route','Get in touch.','Off Route Presents brings people together through independent electronic shows and artist management in Colorado.')}<section class="paper block"><div class="wrap"><h2>Contact Brie<span>.</span></h2><p>For a set, a collaboration or a question about a show.</p><a class="email" href="mailto:${email}">${email}</a><div class="inquiries">${['Artist management','Artist booking','Events and partnerships','General inquiry'].map(label=>`<a class="rule-link" href="${contactLink(label)}">${label}</a>`).join('')}</div></div></section>`],
};
await rm('dist',{recursive:true,force:true});
for (const [path,[title,content]] of Object.entries(pages)) {
  const dest = join('dist',path,'index.html');
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,layout(path,title,content));
}
await cp('Resources','dist/Resources',{recursive:true});
await copyFile('styles.css','dist/styles.css');
