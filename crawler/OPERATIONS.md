# Public procurement monitor

This folder contains the first live-monitoring slice of the B2B acquisition system.

## What is live-monitorable

- Public tender listings and notices
- Public pre-qualification and supplier-registration pages
- Public buyer announcements and project pages
- Public contact channels published by the buyer

## What is not automated

- Login, OTP, CAPTCHA or access-control bypass
- LinkedIn or other platform-account scraping
- Tender submission, bid purchase or supplier registration
- Guessing a named employee from a generic company address
- Importing an unverified notice into CRM

## Activation checklist

1. Review `target-sites.json` and remove any source that is not in scope.
2. Confirm the site terms and robots policy.
3. Set `enabled` to `true` for approved source entries in `sources.json`.
4. Run the crawler on a server with Node.js and a persistent `crawler/runs` directory.
5. Review records with `verificationStatus=unreviewed`.
6. Only then export verified records to the CRM.

The UI prototype uses illustrative records. Records produced by the monitor must carry `sourceUrl`, `capturedAt` and evidence from `live-monitor-schema.json`.

## Deep crawler (v0.2)

The crawler now renders JavaScript portals, drills into detail pages, follows
pagination and extracts structured tender fields. One-time setup installs the
headless browser it uses:

```bash
npm install                 # pulls in the playwright dependency
npm run crawl:setup         # downloads the Chromium browser (one time)
```

Run it:

```bash
npm run crawl               # crawl all enabled sources (renders JS when needed)
npm run crawl:static        # static fetch only, no browser (faster, shallower)
node crawler/public-crawler.mjs --source source-projects   # one source only
```

Output goes to `crawler/runs/crawl-<timestamp>.json`. Each source result now
carries `renderStats` (how many pages were static vs browser-rendered),
`tenders[]` (structured records) and `contacts` (public emails/phones).

### Per-source depth controls (in `sources.json`)

- `render`: `"auto"` (render only when static HTML looks empty), `"always"`
  (force browser — use for SPA portals), or `"never"` (static only).
- `maxDepth`: how many link hops from a seed to follow (listing → detail = 1).
- `followDetail`: follow tender/notice detail links (`true`/`false`).
- `paginate`: follow "next page" / numbered pagination (`true`/`false`).
- `useSitemap` + `sitemapLimit`: seed deep URLs from the site's `sitemap.xml`.
- `waitForSelector` / `renderTimeoutMs`: wait tuning for slow SPA portals.

### Structured tender fields extracted

`title`, `reference`, `publishDate`, `closingDate`, `estimatedValue`,
`buyerEntity`, `category` — recognised in English, Arabic and Russian, with
Arabic-Indic numerals normalised. Every record keeps `sourceUrl` + `capturedAt`
and starts at `verificationStatus: "unreviewed"` for human review before CRM
export. All v0.1 safety defaults (robots.txt, same-origin, delays, no
login/CAPTCHA bypass) are unchanged.
