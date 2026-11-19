import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

import { loadContent } from './notion.mjs';
await rm('dist',{recursive:true,force:true});
const {artists,events,posts}=await loadContent('dist');

const cssVersion = createHash('sha256').update(await readFile('styles.css')).digest('hex').slice(0,12);
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
const contactLink = topic => 'mailto:' + email + '?subject=' + encodeURIComponent(topic);
const socialIcons = [
  ['Instagram', 'https://www.instagram.com/', '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.9" r="1.1"/>'],
  ['SoundCloud', 'https://soundcloud.com/', '<path d="M11 16.8V8a5.2 5.2 0 0 1 9.5 2.9 3 3 0 1 1 .1 6H11Z"/><path d="M2 14v1m2.5-3.5v5M7 10v6.5m2-9v9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'],
  ['YouTube', 'https://www.youtube.com/', '<path fill-rule="evenodd" d="M4 5.4c2.9-.7 13.1-.7 16 0 2.1.5 2.5 2.8 2.5 6.6s-.4 6.1-2.5 6.6c-2.9.7-13.1.7-16 0C1.9 18.1 1.5 15.8 1.5 12S1.9 5.9 4 5.4Zm6 3.3v6.6l5.7-3.3Z"/>'],
];
const socialNav = '<nav class="social-nav" aria-label="Example social links">' + socialIcons.map(([name,url,icon]) =>
  `<a href="${url}" aria-label="${name} (example link to platform homepage)" title="${name} · example link"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">${icon}</svg></a>`
).join('') + '</nav>';
function layout(path, title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex"><meta name="theme-color" content="#10241c"><meta name="description" content="Independent electronic music events and artist management in Colorado. Explore Off Route shows, artists and field notes.">
  <title>${title === 'Home' ? 'Off Route Presents' : title + ' | Off Route Presents'}</title><link rel="preload" href="/Resources/Type/shrikhand.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/styles.css?v=${cssVersion}"></head>
  <body><a class="skip" href="#main">Skip to content</a><header class="masthead"><div class="wrap bar">
    <a class="brand sleeve" href="/" aria-label="Off Route Presents home"><span class="vinyl" aria-hidden="true"></span><span class="sleeve-face">${logo}</span></a>
    <button class="menu-toggle" type="button" aria-label="Navigation menu" aria-expanded="false" aria-controls="header-links"><span aria-hidden="true"></span></button>
    <div class="header-links" id="header-links"><nav class="ticket-nav" aria-label="Main">${nav(path)}</nav>${socialNav}</div>
  </div></header><script src="/menu.js" defer></script>
  <main id="main">${content}</main><footer><div class="wrap foot"><a class="brand" href="/">${logo}</a><p>Independent electronic music<br>Colorado</p><nav aria-label="Footer">${nav(path)}</nav></div></footer></body></html>`;
}
const heading = (label, title, summary) => `<section class="intro"><div class="wrap">${kicker(label)}<h1>${title}</h1><p>${summary}</p></div>${routeLines}</section>`;
const detail=(kind,item)=>'/'+kind+'/'+item.slug+'/';
const dateFormat=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',dateStyle:'full'});
const timeFormat=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',timeStyle:'short'});
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'});
const asDate=value=>new Date(value.length===10?value+'T12:00:00-07:00':value);
const today=dayFormat.format(new Date());
const dateTag=value=>value?'<time datetime="'+asDate(value).toISOString()+'">'+dateFormat.format(asDate(value))+'</time>':'';
const photoTag=item=>'<img src="'+item.image+'" alt="'+item.alt+'" decoding="async">';
const location=show=>[show.venue,show.area,show.city,show.state].filter(Boolean).join(' · ');
const linkItem=(kind,item)=>'<a href="'+detail(kind,item)+'">'+item.name+'</a>';
const roster=new Map(artists.map(a=>[a.id,a]));
const lineup=show=>show.lineup.map(id=>roster.get(id)).filter(Boolean).map(a=>linkItem('artists',a)).join(' · ');
const badge=item=>item.sample?'Example · ':'';
events.sort((a,b)=>asDate(a.start)-asDate(b.start));
posts.sort((a,b)=>asDate(b.date)-asDate(a.date)||a.slug.localeCompare(b.slug));
artists.sort((a,b)=>a.name.localeCompare(b.name));
const upcoming=events.filter(e=>dayFormat.format(asDate(e.start))>=today);
const past=events.filter(e=>dayFormat.format(asDate(e.start))<today).reverse();
const featured=upcoming.find(e=>e.featured)??upcoming[0];
const featuredPoster=featured?'<a class="pinned poster" href="'+detail('events',featured)+'">'+photoTag(featured)+'</a>':'';
function showCard(show) {
  return '<article class="show-tile"><a class="flyer-link" href="'+detail('events',show)+'">'+photoTag(show)+'</a><p class="meta">'+badge(show)+dateTag(show.start)+'</p><h3>'+linkItem('events',show)+'</h3><p>'+location(show)+'</p><p class="bill">'+lineup(show)+'</p></article>';
}
function artistCard(a) {
  return '<article class="person"><a href="'+detail('artists',a)+'">'+photoTag(a)+'</a><p class="meta">'+badge(a)+a.genre+'</p><h3>'+linkItem('artists',a)+'</h3><p>'+a.summary+'</p></article>';
}
function postCard(p) {
  return '<article class="story-card"><a class="frame" href="'+detail('posts',p)+'">'+photoTag(p)+'</a><div>'+kicker(badge(p)+p.category)+dateTag(p.date)+'<h3>'+linkItem('posts',p)+'</h3><p>'+p.summary+'</p><a class="rule-link" href="'+detail('posts',p)+'">Read the story</a></div></article>';
}

const pages = {
  '/': ['Home', `<section class="hero"><img class="crowd" src="${stage}" fetchpriority="high" alt="A crowd gathered under amber lights at an outdoor electronic show"><div class="wash"></div>${routeLines}
  <div class="wrap hero-inner"><div class="hero-copy">${kicker('Colorado / Independent electronic music')}<h1>Take the<br><em>long way.</em></h1><p>Underground shows and artist management.<br>For the ones who follow the sound.</p>${button('Explore events', '/events/')}</div>${featuredPoster}</div></section>
  <section class="paper shows"><div class="wrap">${kicker('Shows / Colorado')}<div class="section-head"><h2>Upcoming shows<span>.</span></h2><a class="rule-link" href="/events/">All events</a></div><div class="show-grid">${upcoming.slice(0,3).map(showCard).join('') || '<p>New dates coming soon.</p>'}</div></div></section>
  <section class="artists"><div class="wrap">${kicker('Artist management')}<div class="section-head"><h2>Behind the decks<span>.</span></h2><a class="rule-link" href="/artists/">All artists</a></div><div class="people-grid">${artists.slice(0,3).map(artistCard).join('')}</div></div></section>
  <section class="paper block"><div class="wrap"><div class="section-head"><h2>Field notes<span>.</span></h2><a class="rule-link" href="/posts/">All posts</a></div>${posts[0] ? postCard(posts[0]) : ''}</div></section>
  <section class="contact-band"><div class="wrap section-head"><h2>Get in touch.</h2>${button('Contact Off Route','/contact/')}</div></section>`],
  '/events/': ['Events', `${heading('Shows / Colorado','Upcoming shows.','Explore the posters, lineups and rooms.')}<section class="paper block"><div class="wrap show-grid">${upcoming.map(showCard).join('') || '<p>New dates coming soon.</p>'}</div></section>${past.length ? '<section class="paper block"><div class="wrap"><h2>Past shows</h2><div class="show-grid">'+past.map(showCard).join('')+'</div></div></section>' : ''}`],
  '/artists/': ['Artists', `${heading('Artist management','The artists.','Meet the artists behind the decks.')}<section class="artists"><div class="wrap people-grid">${artists.map(artistCard).join('')}</div></section>`],
  '/posts/': ['Posts', `${heading('Off Route journal','Field notes.','Announcements, studio notes and stories from Off Route.')}<section class="paper block"><div class="wrap stories">${posts.map(postCard).join('')}</div></section>`],
  '/contact/': ['About and contact', `${heading('About Off Route','Get in touch.','Off Route Presents brings people together through independent electronic shows and artist management in Colorado.')}<section class="paper block"><div class="wrap"><h2>Contact Brie<span>.</span></h2><p>For a set, a collaboration or a question about a show.</p><a class="email" href="mailto:${email}">${email}</a><div class="inquiries">${['Artist management','Artist booking','Events and partnerships','General inquiry'].map(label=>`<a class="rule-link" href="${contactLink(label)}">${label}</a>`).join('')}</div></div></section>`],
};
const related=(label,html)=>html?'<section class="paper block"><div class="wrap"><h2>'+label+'</h2>'+html+'</div></section>':'';
for(const show of events){
  const facts=[['Venue',location(show)],['Doors',show.doors && timeFormat.format(asDate(show.doors))],['Music',show.start.length>10 && timeFormat.format(asDate(show.start))+' Mountain Time'],['Age',show.age],['Price',show.price],['Lineup',lineup(show)]];
  const tickets=show.sample?'Example event and venue. No tickets are on sale.':(show.ticket && show.ticketStatus!=='Sold out'?button(show.ticketStatus==='Free'?'Event information':'Tickets',show.ticket):show.ticketStatus);
  pages[detail('events',show)]=[show.name,heading(badge(show)+'Event',show.name,location(show))+'<section class="paper block"><div class="wrap event-layout"><div class="full-flyer">'+photoTag(show)+'</div><div>'+kicker('Show details')+'<h2>'+dateTag(show.start)+'</h2><dl class="facts">'+facts.filter(([,v])=>v).map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl>'+show.body+'<p>'+tickets+'</p></div></div></section>'+related('Field notes',posts.filter(p=>p.events.includes(show.id)).map(postCard).join(''))];
}
for(const a of artists){
  pages[detail('artists',a)]=[a.name,heading(badge(a)+'Artist profile',a.name,[a.genre,a.home].filter(Boolean).join(' · '))+'<section class="artists"><div class="wrap duo"><div class="portrait">'+photoTag(a)+'</div><div>'+kicker('Biography')+a.body+'<p>'+a.links.map(([k,url])=>button(k,url)).join(' ')+'</p></div></div></section>'+related('On the bill',events.filter(e=>e.lineup.includes(a.id)).map(showCard).join(''))+related('Field notes',posts.filter(p=>p.artists.includes(a.id)).map(postCard).join(''))];
}
for(const p of posts){
  const links=[...events.filter(e=>p.events.includes(e.id)).map(e=>linkItem('events',e)),...artists.filter(a=>p.artists.includes(a.id)).map(a=>linkItem('artists',a))];
  pages[detail('posts',p)]=[p.name,heading(badge(p)+p.category,p.name,p.summary)+'<article class="paper block"><div class="wrap article"><p class="meta">'+dateTag(p.date)+(p.byline?' · '+p.byline:'')+'</p>'+photoTag(p)+p.body+'<p>'+links.join(' · ')+'</p><a class="rule-link" href="/posts/">Back to posts</a></div></article>'];
}

for (const [path,[title,content]] of Object.entries(pages)) {
  const dest = join('dist',path,'index.html');
  await mkdir(dirname(dest),{recursive:true});
  const prefix = '../'.repeat(path.split('/').filter(Boolean).length) || './';
  const html = layout(path,title,content).replace(/(href|src)="\//g, (_, attribute) => attribute + '="' + prefix);
  await writeFile(dest,html);

}
await cp('Resources','dist/Resources',{recursive:true});
await copyFile('styles.css','dist/styles.css');
await copyFile('menu.js','dist/menu.js');
