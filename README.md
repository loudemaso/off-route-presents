# Off Route Presents

Notion edits content. GitHub owns code and brand assets. One Netlify project serves the website and receives authenticated publishing webhooks.

## Current architecture

- `published-content` in the production Netlify Blobs store is the only published dataset. It contains current records and revision-bearing unpublish markers. There is no build seed or per-record override layer.
- `/publish` validates one changed Notion record, copies its images to persistent storage, and atomically updates the dataset. Conditional writes retry concurrent changes; older revisions cannot replace newer ones.
- The page function reads the dataset once and renders only the requested page. Contact and invalid route shapes require no content reads.
- HTML uses `private, no-store`. After a webhook completes, the next page request sees the update. An already open page needs a refresh.
- CMS images use content-addressed `/content-images/` originals. Netlify Image CDN supplies responsive WebP derivatives, with lazy loading below the fold. Brand originals stay in `Resources/Brand/` unchanged.
- Functions deploy directly from `netlify/functions`. Each bundle contains only its imported code and dependencies. Build output contains only the design assets the site uses.

## Editing and publishing

The editor-facing instructions are in the [Publishing Guide](https://www.notion.so/41d27987112881249b59c922918684a7).

Each Artists, Events, and Posts table has a **Status is edited → Send webhook** automation to `https://off-route-presents.netlify.app/publish`, with the `x-publish-secret` header. Include Status in the payload. Do not use a build hook or workspace-wide integration webhook.

1. Create a Draft with Name. All other content fields are optional. A blank Slug is generated from Name and saved back to Notion, with a numeric suffix for duplicate names within the same table. Existing slugs stay stable on rename. Blank post Publish Dates are set on first publication using the Denver calendar date and saved to Notion; subsequent publication preserves them, as well as any date you entered yourself. A Notion page cover remains the fallback for Cover Image. With neither image, cards and details use a layout without an image. Events without Show Starts appear after dated upcoming events and display no date or show time.
2. Check **Website check**, then set Status to Published. The webhook runs asynchronously; check the website after it completes.
3. To update a record, set Draft, edit, and set Published again. Draft temporarily removes it. Property edits alone do not publish, even when Status is Published.
4. Set Draft or Archived before moving a record to Trash. There is no scheduled deletion scan.

Changing a Slug changes the URL; the old URL has no redirect. Keep live slugs stable. Website check validates Name and the format of an optional supplied Slug, not delivery or slug uniqueness. The Notion integration needs Update content capability for generated properties. Default values are reserved atomically in the catalog before writing them to Notion, so retries and concurrent equal names are safe; failed writeback leaves public content unchanged. Reservations persist when records are unpublished. Only Status edits trigger publication; generated property writes never change Status.

Supported body blocks: paragraphs, headings, lists, quotes, dividers, and images. Image formats: WebP, JPEG, PNG, GIF, and AVIF. Published images are copied, so the site does not depend on expiring Notion file links.

Invalid content preserves the last valid publication, returns `published: false`, logs `publication_rejected`, and saves a report at `publishing-errors/<page-id>`. Fix the indicated issue and change Status again. Infrastructure failures remain errors; if Notion pauses an automation, resolve the failure and resume it in that table.

## Code changes and development

`npm ci && npm test` builds the static assets and runs the tests without credentials or network access. `npm run build` only prepares code assets; it never reads Notion or writes published content. Push code to `main` to deploy through the connected Netlify project.

Use `netlify dev` against a linked project for integrated function work. Production uses `off-route-content-production`. A preview initially reads production content; its first publication copies the dataset into its own deploy-ID store and all subsequent writes remain there. Preview image reads can fall back to production originals. Local development uses a local store that needs an explicitly initialized dataset. A missing dataset fails visibly; there is no hidden seed fallback.

`NOTION_TOKEN` is used only by the publishing function. `PUBLISH_SECRET` authenticates `/publish`. Keep both in Netlify, never in source or browser code. The production website must remain public for Notion webhook delivery; the publisher itself requires its secret.

Content updates do not trigger builds. Requests, function execution, image transformations, bandwidth, and storage still consume hosting resources. HTML caching remains off; immutable content images remain cached.

The old GitHub Pages HTML, demo data, build staging, and migration code have been retired. There are no old-address redirects. Git history retains earlier versions. Indexing remains disabled and example social links remain unchanged pending launch decisions.
