# Off Route Presents

Notion is the content editor. GitHub owns templates and styling. Netlify serves pages dynamically and stores published record snapshots and image bytes in Blobs.

## Project

`off-route-presents` is the public website and authenticated CMS receiver. It stores published record snapshots and image bytes in its own Netlify Blobs store. Website functions read that store directly; there is no separate publishing service or cross-project fetch.

Code changes require a deployment. Notion publishing does not. There are no scheduled functions or content build hooks in the code. Production data persists across deployments; preview stores are isolated by deploy ID.

## Editing and publishing

Each Off Route Artists, Events, and Posts table has its own Notion automation: **Status is edited → Send webhook** to `https://off-route-presents.netlify.app/publish` with `x-publish-secret` set to the shared environment secret. Select Status in the webhook payload. Do not use a workspace-wide integration webhook.

1. Create a Draft, add Name, unique lowercase hyphenated Slug, Cover Image, Image Alt, Summary, and body text. Events require Show Starts; posts require Publish Date.
2. Set Status to Published. The publishing function validates the table and fields, downloads images, and saves this record. The next website request reads the updated snapshot. List pages, related links, and the detail page use the same data.
3. To update a live record, set Draft, edit, and set Published again. Draft/Archived removes it from the website; use one of those before moving a page to Trash. Changes to other properties alone do not publish. There is no scheduled deletion scan.
4. Renaming Slug removes the old route and creates a new route; there is no automatic redirect. Keep live slugs stable.

Check the **Website check** formula for missing required fields before publishing. This is a readiness check, not delivery confirmation. Doors does not replace Show Starts.

Notion webhooks are asynchronous. Incomplete or invalid content is acknowledged with HTTP 200 and `published: false`, logged as `publication_rejected`, and saved under `publishing-errors/<page-id>` in Blobs. It does not replace the last valid snapshot or pause other records. Fix the indicated fields and change Status again. Infrastructure failures still return errors so Notion can retry; if Notion pauses the automation, resolve the outage and resume it manually. Missing cover images, unsupported blocks, and invalid/duplicate slugs are rejected. Page body supports paragraphs, headings, lists, quotes, dividers, and images.

Images are copied to persistent storage when published so expiring Notion file links are not embedded in the website. The website serves these images directly from its own storage. Seed content is bundled on code deployments. Per-record overrides and unpublish tombstones persist across deployments. Code deployments refresh seed content from valid Published Notion records and log skipped invalid records; avoid deploying unfinished edits to Published records.

## Environment and access

`NOTION_TOKEN` is required for builds and publishing functions. `PUBLISH_SECRET` is required for the authenticated `/publish` endpoint. Store both in Netlify, never GitHub. The Notion webhook header `x-publish-secret` must match the production secret. Neither credential is delivered to browsers.

The production website must remain publicly reachable so Notion can deliver webhooks. `/publish` rejects requests without the secret, checks that the page belongs to the Off Route tables, and enforces publishing validation. Public pages and `/content-images/*` serve published material. Preview deploys use isolated stores and do not change production content.

## Development

`npm ci && npm test` runs deterministic tests without credentials.
`NOTION_TOKEN=... npm run build` prepares the website and seed.

Run `netlify dev` against the relevant linked project for function testing. Do not point destructive preview tests at the production publisher.

There is no build/deploy charge per content update; function compute, requests, bandwidth, and storage usage still apply. The website currently avoids HTML caching so unpublishing takes effect on subsequent requests. Static design assets remain CDN-served. Monitor the shared team credit usage in Netlify.
