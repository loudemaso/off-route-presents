import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const sources = {
  artists: '41d27987-1128-808d-ad88-000bf5cc8e34',
  events: '41d27987-1128-80e9-abab-000b80711202',
  posts: '41d27987-1128-8044-8361-000b549a7527'
};
export const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const safeLink = url => /^https?:\/\//i.test(url ?? '') ? escape(url) : '';
const plain = parts => (parts ?? []).map(p => p.plain_text).join('');
async function api(path, payload) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw Error('Set NOTION_TOKEN for the production build.');
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch('https://api.notion.com/v1/'+path, {
      method: payload ? 'POST' : 'GET',
      headers: {Authorization:'Bearer '+token,'Notion-Version':'2025-09-03','Content-Type':'application/json'},
      body: payload ? JSON.stringify(payload) : undefined
    });
    if (res.ok) return res.json();
    if ((res.status !== 429 && res.status < 500) || attempt === 4) throw Error('Notion '+res.status+' at '+path.split('?')[0]);
    await new Promise(resolve => setTimeout(resolve, 1000 * (Number(res.headers.get('retry-after')) || 2 ** attempt)));
  }
}
async function all(path, payload) {
  const results = [];
  let cursor;
  do {
    const data = payload ? await api(path,{...payload,...(cursor && {start_cursor:cursor})}) : await api(path+(cursor?'?start_cursor='+encodeURIComponent(cursor):''));
    results.push(...data.results);
    cursor = data.has_more && data.next_cursor;
  } while(cursor);
  return results;
}
function rich(parts) {
  return (parts ?? []).map(p => {
    let html = escape(p.plain_text).replaceAll('\n','<br>');
    for (const [flag,tag] of Object.entries({bold:'strong',italic:'em',strikethrough:'s',underline:'u',code:'code'})) {
      if(p.annotations?.[flag]) html = '<'+tag+'>'+html+'</'+tag+'>';
    }
    return safeLink(p.href) ? '<a href="'+safeLink(p.href)+'">'+html+'</a>' : html;
  }).join('');
}
const assetURL = file => file?.[file.type]?.url;
async function media(file, dir) {
  const raw = assetURL(file);
  if (!raw) throw Error('Missing image URL');
  const url = new URL(raw);
  const repoPath = /^\/loudemaso\/off-route-presents\/[a-f0-9]{40}\/(Resources\/Placeholders\/(?:season\/)?[a-z0-9-]+\.webp)$/.exec(url.pathname);
  let bytes;
  if(url.hostname==='raw.githubusercontent.com' && repoPath) bytes=await readFile(repoPath[1]);
  else {
    if(url.protocol!=='https:') throw Error('Image requires HTTPS');
    const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!res.ok) throw Error('Image download failed: HTTP '+res.status);
    bytes=Buffer.from(await res.arrayBuffer());
  }
  const ext = bytes.toString('ascii',8,12)==='WEBP'?'webp':bytes[0]===255 && bytes[1]===216?'jpg':bytes.toString('hex',0,8)==='89504e470d0a1a0a'?'png':bytes.toString('ascii',0,3)==='GIF'?'gif':bytes.toString('ascii',4,12).startsWith('ftypavif')?'avif':null;
  if(!ext) throw Error('Use a WebP, JPEG, PNG, GIF, or AVIF image');
  const name=createHash('sha256').update(bytes).digest('hex').slice(0,24)+'.'+ext;
  await mkdir(dir+'/media',{recursive:true});
  await writeFile(dir+'/media/'+name,bytes);
  return '/media/'+name;
}
async function body(id, dir) {
  let html='';
  for(const block of await all('blocks/'+id+'/children')){
    const type=block.type, val=block[type];
    const tags={paragraph:'p',heading_1:'h2',heading_2:'h2',heading_3:'h3',quote:'blockquote',bulleted_list_item:'ul',numbered_list_item:'ol'};
    if(type==='image') html+='<figure><img src="'+await media(val,dir)+'" alt="'+escape(plain(val.caption))+'"><figcaption>'+rich(val.caption)+'</figcaption></figure>';
    else if(type==='divider') html+='<hr>';
    else if(tags[type]) {
      const tag=tags[type], content=rich(val.rich_text);
      html+='<'+tag+'>'+(['ul','ol'].includes(tag)?'<li>'+content+'</li>':content)+'</'+tag+'>';
    } else throw Error('Unsupported public page block '+type+' on '+id);
    if(block.has_children) html+=await body(block.id,dir);
  }
  return html;
}
const publishedRows=id=>all('data_sources/'+id+'/query',{filter:{property:'Status',status:{equals:'Published'}}});
function stamp(rows,day){
  const versions=rows.map(r=>r.id+':'+r.last_edited_time).sort();
  return createHash('sha256').update(JSON.stringify([day,versions])).digest('hex');
}
export const denverDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',dateStyle:'short'}).format(new Date());
export async function currentStamp(){
  const rows=[];
  for(const id of Object.values(sources)) rows.push(...await publishedRows(id));
  return stamp(rows,denverDay());
}
export async function loadContent(dir) {
  const loadedRows=[];
  const day=denverDay();
  const out={};
  for(const [kind,id] of Object.entries(sources)){
    const rows=await publishedRows(id);
    loadedRows.push(...rows);
    const seen=new Set();
    out[kind]=[];
    for(const row of rows){
      const p=row.properties;
      const get=k=>escape(plain(p[k]?.rich_text));
      const date=k=>p[k]?.date?.start;
      const rel=async k=>{
        if(!p[k]?.has_more) return (p[k]?.relation??[]).map(r=>r.id);
        return (await all('pages/'+row.id+'/properties/'+p[k].id)).map(r=>r.relation.id);
      };
      const slug=plain(p.Slug?.rich_text), name=escape(plain(p.Name?.title));
      if(!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || seen.has(slug)) throw Error('Invalid name or duplicate/invalid slug: '+kind+'/'+slug);
      seen.add(slug);
      try {
        const item={id:row.id,slug,name,summary:get('Summary'),alt:get('Image Alt'),sample:p['Sample Content']?.checkbox,body:await body(row.id,dir),image:await media(p['Cover Image']?.files?.[0]??row.cover,dir)};
        if(kind==='artists') Object.assign(item,{genre:(p.Genres?.multi_select??[]).map(g=>escape(g.name)).join(' / '),home:get('Home Base'),links:['Instagram','SoundCloud','Website'].map(k=>[k,safeLink(p[k]?.url)]).filter(([,url])=>url)});
        if(kind==='events') Object.assign(item,{start:date('Show Starts'),doors:date('Doors'),venue:get('Venue'),area:get('Neighborhood'),city:get('City'),state:get('State'),age:get('Age Policy'),price:get('Price Display'),ticket:safeLink(p['Ticket URL']?.url),ticketStatus:escape(p['Ticket Status']?.select?.name),featured:p['Feature on Home']?.checkbox,lineup:await rel('Lineup')});
        if(kind==='posts') Object.assign(item,{date:date('Publish Date'),category:escape(p.Category?.select?.name),byline:get('Byline'),events:await rel('Related Events'),artists:await rel('Related Artists')});
        if((kind==='events'&&!item.start)||(kind==='posts'&&!item.date)) throw Error('Missing date');
        out[kind].push(item);
      } catch(e){throw Error(kind+'/'+slug+': '+e.message);}
    }
  }
  await mkdir(dir,{recursive:true});
  await writeFile(dir+'/content-version.txt',stamp(loadedRows,day));
  return out;
}
