import { currentStamp } from '../../notion.mjs';

// Compare only published record revisions and the Denver date. Several edits
// between ticks produce one build, and unpublishing changes the set of IDs.
export default async function syncNotion(_request, context) {
  const hook=process.env.NOTION_BUILD_HOOK;
  if(!hook) throw Error('NOTION_BUILD_HOOK is missing');
  const response=await fetch(new URL('/content-version.txt', context.site.url),{cache:'no-store'});
  if(!response.ok) throw Error('Cannot read current production content version: '+response.status);
  const deployed=(await response.text()).trim();
  if(!/^[a-f0-9]{64}$/.test(deployed)) throw Error('Invalid production content version');
  if(deployed===await currentStamp()) return;
  const refresh=await fetch(hook,{method:'POST'});
  if(!refresh.ok) throw Error('Netlify build hook returned '+refresh.status);
}
export const config={schedule:'*/15 * * * *'};
