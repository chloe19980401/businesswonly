# Per-country research subagent prompt (template)

Fill in {COUNTRY_NAME}, {CODE}, {PRODUCT}, and {LOCAL_DIRECTORIES}. Spawn one subagent per
country (Agent tool, general-purpose), at most ~3 concurrently.

---

Research REAL B2B customer leads in {COUNTRY_NAME} (code {CODE}) for a {PRODUCT} exporter.
Target company types: importers/wholesalers/distributors; hardware/retail chains; security &
access-control integrators; real-estate developers; construction/fit-out contractors; hotel
groups — i.e. real buyers or channels for {PRODUCT}.

Use WebSearch and WebFetch. Good sources: {LOCAL_DIRECTORIES}, company websites (fetch the
/contact page for public email & phone), trade portals. Search in the local language(s) too.

STRICT RULES (compliance-sensitive):
- Only include companies that ACTUALLY EXIST and were found on a page you actually fetched.
- NEVER invent company names, emails, phone numbers, or websites.
- Public contact info only. If a public email or phone is not found, leave it blank — do NOT guess.
- Every row MUST include a sourceUrl (the page where you found/verified the company).
- Aim for up to 40 real companies; return fewer if you can't find that many — do NOT pad.
- On HTTP 429, wait a few seconds and retry up to 2 times; pace fetches (one at a time).

Return ONLY a JSON array (no prose), each element exactly:
{"company":"","country":"{CODE}","city":"","category":"importer_distributor|hardware_retail|security_integrator|developer|contractor|hotel_group","productFocus":"","website":"","email":"","phone":"","sourceUrl":"","confidence":"high|medium","notes":""}

Your final message must be the JSON array only.
