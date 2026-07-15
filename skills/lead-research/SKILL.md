---
name: lead-research
description: >
  Deep B2B customer-lead research for any country or region. Given target countries and a
  product/industry, finds REAL companies (importers, distributors, dealers, system
  integrators, developers, contractors, end-buyers) from public business directories and
  company websites, enriches their public emails/phones, and compiles a sourced Excel
  workbook (one sheet per country + summary). Use whenever the user wants to find, research,
  "scrape", or build a list of B2B customer leads / distributors / importers / buyers for a
  market — e.g. "抓取XX国家客户线索", "find distributors in Africa", "build a leads list for
  door locks in the Gulf". Emphasises verifiable, non-fabricated data with a source link on
  every row.
---

# Lead Research — deep customer-lead search

Turn "find real customers for <product> in <countries>" into a **verifiable, source-linked
Excel of real companies with public contact info**. Nothing is invented.

## The one rule that matters

**Never fabricate.** Every company must be a real business found on a page that was actually
fetched, and every row carries a `sourceUrl`. If a public email or phone is not visible on a
fetched page, leave it blank — do NOT guess, construct, or pattern-match an address. A short
list of real leads beats a long list padded with plausible fakes. When a small market genuinely
has fewer than the target count, deliver fewer and say so.

## Inputs to confirm first

- **Product / industry** (e.g. door locks & building hardware). Shapes which company types and
  which directory search terms to use.
- **Target countries** (list). If the user says a region ("Africa", "中东"), pick the biggest /
  most relevant markets for the product and state the list; let them adjust.
- **Target per country** (default ~40 for large markets, fewer for small ones).

Ask these once if missing, then proceed. Don't block on questions in an unattended run.

## Company types to collect (adapt to the product)

For physical products sold into construction/interiors (locks, hardware, materials, fixtures):
`importer_distributor` (importers/wholesalers/dealers), `hardware_retail` (retail chains /
builders' merchants), `security_integrator` (access-control / systems integrators),
`developer` (real-estate developers), `contractor` (construction / fit-out / door & window
fabricators), `hotel_group` (hospitality operators). Swap this taxonomy for whatever fits the
product, but keep the categories consistent across countries so the sheet filters cleanly.

## Workflow

1. **Plan** the country list and per-country target. Create a working dir, one `<CODE>.json`
   per country (ISO-2 codes).
2. **Research in waves of ~3 countries at a time.** Spawn one subagent per country (Agent tool,
   `general-purpose`). More than ~3–4 concurrent web-research agents saturate the shared fetch
   proxy and start returning HTTP 429 — pace it in waves. Each agent uses the prompt in
   `references/research-prompt.md` (fill in country + product + local directories).
3. **Save** each agent's JSON array to `<CODE>.json` verbatim (only keep the schema fields).
4. **Enrich contacts** for rows that have a website but no email/phone: a second wave of
   subagents (≤3 at a time) fetch each company's `/contact` page for the public email + phone.
   Prompt in `references/enrich-prompt.md`. Merge results, never overwriting a value that
   already exists.
5. **Compile** with `scripts/build_leads_xlsx.py` (see below).
6. **Deliver** the xlsx (SendUserFile) and, on a connected device, write it into the project's
   `outputs/` folder. Optionally feed the same rows into a frontend leads page.

Waves matter: the fetch proxy is rate-limited per session. If agents report persistent 429 /
"session limit", pause, then resume the remaining countries in a later wave rather than
retrying in a tight loop.

## Row schema (every agent returns a JSON array of these)

```json
{
  "company": "", "country": "<ISO2>", "city": "",
  "category": "importer_distributor|hardware_retail|security_integrator|developer|contractor|hotel_group",
  "productFocus": "", "website": "", "email": "", "phone": "",
  "sourceUrl": "", "confidence": "high|medium", "notes": ""
}
```

`confidence`: `high` = confirmed on the company's own site / first-party page; `medium` = from a
reputable directory, worth a second check. `sourceUrl` is mandatory on every row.

## Good public sources by region (starting points, not exhaustive)

- Gulf / MENA: yellowpages-uae, atninfo, qataronlinedirectory, omanproductfinder, dcciinfo,
  yellowpages.com.eg, company sites; search Arabic terms too (مقابض/أقفال الأبواب).
- Africa: BusinessList.<cc>, finelib (NG), BusinessGhana, Brabys/Yellosa (ZA), tanzapages (TZ),
  AddisBiz/2merkato (ET), telecontact.ma / PagesMaghreb / Kompass (MA/DZ); search French for
  Francophone markets (serrures, quincaillerie, contrôle d'accès).
- Central Asia / CIS: 2gis, goods/ss/my.ge directories, company sites; search Russian
  (дверные замки оптом, СКУД, строительные материалы).

Prefer local business directories to find companies, then the company's own site for contacts.

## Build the Excel

```bash
python3 scripts/build_leads_xlsx.py <leads_dir> <countries.json> <output.xlsx> "<Title>"
```

- `<leads_dir>`: folder containing `<CODE>.json` files (and optional `enrich/<CODE>.json`).
- `<countries.json>`: `{ "<CODE>": {"name": "中文名", "region": "地区"}, ... }` — controls sheet
  order, Chinese labels, and region grouping.
- Produces: `汇总` (summary with COUNTIF formulas), `全部线索` (all rows), one sheet per country,
  and `说明` (notes). Emails/phones/websites/sources render as clickable links.

After building, always run the xlsx recalc check so the summary formulas evaluate:
`python3 /path/to/xlsx/scripts/recalc.py <output.xlsx>` — status must be `success`, 0 errors.

## Delivering into the acquisition system frontend (optional)

If the target project has a leads-library frontend (reads `crawler/leads.json`), transform the
merged rows into that file's shape (add `countryName`, `region`, `categoryName`, keep
`sourceUrl`/`contactSource`) and append; add any new countries to the frontend country
dictionary so labels render as "中文名（CODE）· 地区".

## Reference files

- `references/research-prompt.md` — the per-country research subagent prompt template.
- `references/enrich-prompt.md` — the contact-enrichment subagent prompt template.
- `scripts/build_leads_xlsx.py` — the workbook builder.
