import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadContent } from './notion.mjs';
await rm('dist', { recursive:true, force:true });
await rm('.runtime', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
await mkdir('.runtime/functions', { recursive:true });
const receiver = process.env.OFF_ROUTE_MODE === 'receiver';
const content = await loadContent(receiver ? '.runtime' : 'dist');
const cssVersion = createHash('sha256').update(await readFile('styles.css')).digest('hex').slice(0,12);
await writeFile('seed.json', JSON.stringify({content, cssVersion}));
const functions = receiver ? ['publish-content', 'content-snapshot', 'stored-image'] : ['site', 'content-image'];
for (const name of functions) await cp('netlify/functions/'+name+'.mjs', '.runtime/functions/'+name+'.mjs');
if (receiver) {
  await writeFile('dist/404.html', '<!doctype html><title>Not found</title><p>Not found</p>');
} else {
  await cp('Resources','dist/Resources',{recursive:true});
  await cp('styles.css','dist/styles.css');
  await cp('menu.js','dist/menu.js');
}
