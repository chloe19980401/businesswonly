# Contact-enrichment subagent prompt (template)

For rows that have a website but no email/phone. Write the worklist to
`work/enrich_{CODE}.json` as `[{"company","website","city","sourceUrl"}, ...]`, then spawn one
subagent per country (≤3 concurrent).

---

Read the file {ABS_PATH}/work/enrich_{CODE}.json — a JSON array of real {COUNTRY_NAME} companies
with company/website/city/sourceUrl missing an email or phone. For EACH company with a website,
find its public email and phone by fetching its site.

Method:
- WebFetch the website root, then if needed /contact, /contact-us, /contacts, /about (and local
  variants: /kontakty, /aloqa, /contactez-nous, /ar/contact).
- Extract the public business email and phone shown on the page.
- If website is empty, do ONE WebSearch for the official site then fetch it. Never guess.
- On HTTP 429, wait a few seconds and retry up to 2 times; pace fetches.

STRICT RULES:
- Only record email/phone that ACTUALLY APPEAR on a fetched page. NEVER invent or guess. Blank
  if not found. Keep the company name EXACTLY as given.

Return ONLY a JSON array (no prose), one element per company with any new contact found:
{"company":"<exact name>","email":"","phone":"","contactSourceUrl":""}

Your final message must be the JSON array only.
