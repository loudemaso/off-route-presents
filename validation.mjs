export class ContentValidationError extends Error {}
export function requiredFields(page, kind) {
  const p=page.properties;
  const text=parts=>(parts||[]).map(x=>x.plain_text??x.text?.content??'').join('');
  const issues=[];
  if(!text(p.Name?.title).trim()) issues.push('Name is required');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(p.Slug?.rich_text))) issues.push('Slug must contain lowercase words separated by hyphens');
  if(!p['Cover Image']?.files?.[0] && !page.cover) issues.push('Cover Image is required');
  const date=kind==='events'?'Show Starts':kind==='posts'?'Publish Date':null;
  if(date && (!p[date]?.date?.start || !Number.isFinite(Date.parse(p[date].date.start)))) issues.push(date+' is required and must be a valid date');
  return issues;
}
export async function recordValidationFailure(store,page,kind,error) {
  const report={page_id:page.id,kind,checked_at:new Date().toISOString(),error:error.message};
  await store.setJSON('publishing-errors/'+page.id,report);
  console.warn(JSON.stringify({event:'publication_rejected',...report}));
  // Delivery succeeded, but content was rejected. A 4xx/5xx response would pause
  // Notion's entire table automation. Preserve the last good record and report
  // the validation failure separately; genuine infrastructure errors still fail.
  return Response.json({accepted:true,published:false,...report},{headers:{'Cache-Control':'private, no-store'}});
}
