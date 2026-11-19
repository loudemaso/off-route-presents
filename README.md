# Off Route Presents

Notion is the content editor. GitHub owns templates and styling. Netlify serves pages dynamically and stores published record snapshots and image bytes in Blobs.

## Projects

- `off-route-presents`: website, protected by Netlify team login until launch.
- `off-route-publishing`: authenticated CMS API. Build with `OFF_ROUTE_MODE=receiver`. The deployed folder contains only a 404 page; no website or content assets are exposed here. `/publish`, `/snapshot`, and `/images/*` require `x-publish-secret`.

Both deploy from this repository. Code changes require deployments. Notion publishing does not. There are no scheduled functions or content build hooks in the code.

## Editing and publishing

Each Off Route Artists, Events, and Posts table has its own Notion automation: **Status is edited → Send webhook** to `https://off-route-publishing.netlify.app/publish` with `x-publish-secret` set to the shared environment secret. Select Status in the webhook payload. Do not use a workspace-wide integration webhook.

1. Create a Draft, add Name, unique lowercase hyphenated Slug, Cover Image, Image Alt, Summary, and body text. Events require Show Starts; posts require Publish Date.
2. Set Status to Published. The publishing function validates the table and fields, downloads images, and saves this record. The next website request reads the updated snapshot. List pages, related links, and the detail page use the same data.
3. To update a live record, set Draft, edit, and set Published again. Draft/Archived removes it from the website; use one of those before moving a page to Trash. Changes to other properties alone do not publish. There is no scheduled deletion scan.
4. Renaming Slug removes the old route and creates a new route; there is no automatic redirect. Keep live slugs stable.

Check the **Website check** formula for missing required fields before publishing. This is a readiness check, not delivery confirmation. Doors does not replace Show Starts.

Notion webhooks are asynchronous. Incomplete or invalid content is acknowledged with HTTP 200 and `published: false`, logged as `publication_rejected`, and saved under `publishing-errors/<page-id>` in Blobs. It does not replace the last valid snapshot or pause other records. Fix the indicated fields and change Status again. Infrastructure failures still return errors so Notion can retry; if Notion pauses the automation, resolve the outage and resume it manually. Missing cover images, unsupported blocks, and invalid/duplicate slugs are rejected. Page body supports paragraphs, headings, lists, quotes, dividers, and images.

Images are copied to persistent storage when published so expiring Notion file links are not embedded in the website. The website proxies these images through its own access protection. Seed content is bundled on code deployments. Per-record overrides and unpublish tombstones persist across deployments. Code deployments refresh seed content from valid Published Notion records and log skipped invalid records; avoid deploying unfinished edits to Published records.

## Environment

Website: `NOTION_TOKEN` (build), `PUBLISH_SERVICE_URL`, `PUBLISH_SECRET` (functions).
Publisher: `OFF_ROUTE_MODE=receiver`, `NOTION_TOKEN`, `PUBLISH_SECRET` (builds/functions).
Store secrets in Netlify, never GitHub. Production secrets can be limited to production; deploy previews without PUBLISH_SECRET render their build seed only. Publisher preview stores are isolated by deploy ID. The production store name remains stable across deployments.

The publisher's platform visibility must allow webhook requests, but its endpoints enforce the shared secret and return no content without it. Keep the website's platform protection enabled until launch. Neither the Notion token nor the publishing secret is delivered to browsers.

## Development

`npm ci && npm test` runs deterministic tests without credentials.
`NOTION_TOKEN=... npm run build` prepares the website and seed.
`OFF_ROUTE_MODE=receiver NOTION_TOKEN=... npm run build` packages the publisher only.

Run `netlify dev` against the relevant linked project for function testing. Do not point destructive preview tests at the production publisher.

There is no build/deploy charge per content update; function compute, requests, bandwidth, and storage usage still apply. The website currently avoids HTML caching so unpublishing takes effect on subsequent requests. Static design assets remain CDN-served. Review usage in Netlify before enabling public access.
