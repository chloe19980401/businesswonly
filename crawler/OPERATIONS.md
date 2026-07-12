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
