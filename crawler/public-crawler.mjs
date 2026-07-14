#!/usr/bin/env node

/**
 * Deep public-source crawler for Acquire OS (v0.2).
 *
 * What's new vs v0.1:
 * - Renders JS/SPA portals with a headless browser (Playwright) and falls back
 *   to static fetch for plain HTML — automatic escalation when a page looks empty.
 * - Depth-first drilling: follows tender/notice listing pages into detail pages.
 * - Pagination: follows "next page" / numbered pagination on listing portals.
 * - sitemap.xml discovery to seed deep URLs the nav doesn't link.
 * - Structured tender extraction (title, reference, published/closing dates,
 *   value/budget, buyer entity, category, contacts) in EN / AR / RU.
 *
 * Safety defaults (unchanged):
 * - only enabled, user-provided seeds
 * - robots.txt checked before every host
 * - same-origin only
 * - no authentication, CAPTCHA bypass, proxy rotation, or platform automation
 * - max pages / depth and minimum delay per source
 * - every extracted field carries URL + capturedAt evidence
 *
 * Usage:
 *   node crawler/public-crawler.mjs               # crawl all enabled sources
 *   node crawler/public-crawler.mjs --no-render   # force static-only (no browser)
 *   node crawler/public-crawler.mjs --source source-projects   # one source id
 */

import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

const root = process.cwd();
const configPath = path.join(root, "crawler", "sources.json");
const regionsPath = path.join(root, "crawler", "regions.json");
const outputDir = path.join(root, "crawler", "runs");
const userAgent = "AcquireOS-PublicResearch/0.2 (+public-source; contact-your-admin)";
const minDelayMs = 1800;

const argv = process.argv.slice(2);
const flagNoRender = argv.includes("--no-render");
const onlySourceId = (() => {
  const i = argv.indexOf("--source");
  return i >= 0 ? argv[i + 1] : null;
})();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * Country dictionary + inference (keeps the frontend country labels clear)
 * ------------------------------------------------------------------ */

const COUNTRY = {
  AE: { name: "阿联酋", region: "中东" },
  SA: { name: "沙特阿拉伯", region: "中东" },
  QA: { name: "卡塔尔", region: "中东" },
  KW: { name: "科威特", region: "中东" },
  OM: { name: "阿曼", region: "中东" },
  BH: { name: "巴林", region: "中东" },
  KZ: { name: "哈萨克斯坦", region: "中亚" },
  UZ: { name: "乌兹别克斯坦", region: "中亚" },
  KG: { name: "吉尔吉斯斯坦", region: "中亚" },
  TJ: { name: "塔吉克斯坦", region: "中亚" },
  AZ: { name: "阿塞拜疆", region: "高加索/中亚" },
  GE: { name: "格鲁吉亚", region: "高加索/中亚" },
};

const CCTLD = { ae: "AE", sa: "SA", qa: "QA", kw: "KW", om: "OM", bh: "BH", kz: "KZ", uz: "UZ", kg: "KG", tj: "TJ", az: "AZ", ge: "GE" };

// host -> country, built from phase-1-buyers.json so .com company sites resolve too
let HOST_COUNTRY = {};

function countryFromUrl(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return "XX"; }
  if (HOST_COUNTRY[host]) return HOST_COUNTRY[host];
  const base = Object.keys(HOST_COUNTRY).find((h) => host === h || host.endsWith(`.${h}`));
  if (base) return HOST_COUNTRY[base];
  const tld = host.split(".").pop();
  return CCTLD[tld] || "XX";
}

/* ------------------------------------------------------------------ *
 * URL / robots helpers
 * ------------------------------------------------------------------ */

function normaliseUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function pathAllowed(url, allowedPaths) {
  if (!allowedPaths?.length) return true;
  const pathname = new URL(url).pathname.toLowerCase();
  return allowedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix.replace(/\/$/, "")}/`));
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  const sitemaps = [];
  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/#.*/, "").trim();
    if (!clean) continue;
    const [rawKey, ...rawValue] = clean.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join(":").trim();
    if (key === "user-agent") {
      current = { agents: [value.toLowerCase()], disallow: [], allow: [], crawlDelay: 0 };
      groups.push(current);
    } else if (current && key === "disallow" && value) current.disallow.push(value);
    else if (current && key === "allow" && value) current.allow.push(value);
    else if (current && key === "crawl-delay" && Number.isFinite(Number(value))) current.crawlDelay = Number(value) * 1000;
    else if (key === "sitemap" && value) sitemaps.push(value);
  }
  const matching = groups.filter((group) => group.agents.includes("*") || group.agents.includes(userAgent.toLowerCase()));
  const selected = matching[0] ?? { disallow: [], allow: [], crawlDelay: 0 };
  return {
    disallow: selected.disallow,
    allow: selected.allow,
    delayMs: Math.max(minDelayMs, selected.crawlDelay || 0),
    sitemaps,
  };
}

function robotsAllows(url, robots) {
  const pathname = new URL(url).pathname;
  const denied = robots.disallow.filter((rule) => pathname.startsWith(rule));
  const allowed = robots.allow.filter((rule) => pathname.startsWith(rule));
  if (!denied.length) return true;
  return allowed.some((rule) => rule.length >= Math.max(...denied.map((item) => item.length)));
}

/* ------------------------------------------------------------------ *
 * HTML / text helpers
 * ------------------------------------------------------------------ */

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

// Normalise Arabic-Indic and Eastern-Arabic digits to ASCII so date/amount
// regexes work across EN / AR / FA numerals.
function normaliseDigits(text) {
  return text.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

function firstMatch(html, expression) {
  const match = html.match(expression);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const next = normaliseUrl(match[1], baseUrl);
    if (next) links.push(next);
  }
  return [...new Set(links)];
}

/* ------------------------------------------------------------------ *
 * Signal extraction (contacts, people, classification)
 * ------------------------------------------------------------------ */

function extractEmails(html) {
  return [...new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
    .map((email) => email.toLowerCase().replace(/^u003e/, ""))
    .filter((email) => !/\.(png|jpg|jpeg|gif|svg|webp)@/i.test(email)))].slice(0, 20);
}

function extractPhones(text) {
  return [...new Set((text.match(/(?:\+|00)[0-9][0-9 ()-]{7,}[0-9]/g) || [])
    .map((phone) => phone.replace(/\s+/g, " ").trim()))].slice(0, 20);
}

function evidenceSnippets(text, patterns) {
  const snippets = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || match.index == null) continue;
    const start = Math.max(0, match.index - 180);
    const end = Math.min(text.length, match.index + 320);
    snippets.push(text.slice(start, end).trim());
  }
  return [...new Set(snippets)].slice(0, 12);
}

function extractPublicPeople(text) {
  const rolePattern = /([A-Z][a-zÀ-ÿ'-]{1,30}(?:\s+[A-Z][a-zÀ-ÿ'-]{1,30}){1,3})\s*(?:,|-|–)\s*(?:Chief|Head|Director|Manager|VP|Vice President|Procurement|Purchasing|Sourcing|Supply Chain|Commercial|General Manager)/g;
  const roleMentions = [...text.matchAll(rolePattern)].map((match) => match[0].trim()).slice(0, 20);
  const roleSnippets = evidenceSnippets(text, [
    /procurement\s+(?:director|manager|head|officer)/i,
    /purchasing\s+(?:director|manager|head)/i,
    /sourcing\s+(?:director|manager|head)/i,
    /supply\s+chain\s+(?:director|manager|head)/i,
    /采购(?:总监|经理|负责人)/,
  ]);
  return { roleMentions, roleSnippets };
}

function classifyPage(url, text) {
  const haystack = `${url} ${text}`.toLowerCase();
  const tags = [];
  if (/lock|door hardware|mortise|cylinder|handle|smart home|access control/.test(haystack)) tags.push("门锁/建筑五金");
  if (/oem|odm|private label|custom|manufacturer|factory/.test(haystack)) tags.push("OEM/ODM");
  if (/distributor|dealer|reseller|wholesale/.test(haystack)) tags.push("渠道/经销");
  if (/tender|procurement|bid|project|rfq|مناقصة|تعميم|закупк|тендер/.test(haystack)) tags.push("采购/项目");
  if (/career|hiring|jobs|vacancy/.test(haystack)) tags.push("招聘信号");
  return tags;
}

function extractPublicBusinessEvidence(text, type) {
  const supplierSnippets = evidenceSnippets(text, [
    /approved\s+suppliers?/i, /preferred\s+suppliers?/i, /strategic\s+suppliers?/i,
    /key\s+vendors?/i, /manufacturer(?:s|ing)?/i, /供应商/, /制造商/,
  ]);
  const buyerSnippets = evidenceSnippets(text, [
    /annual\s+revenue/i, /procurement/i, /sourcing/i, /stores?/i, /employees?/i,
    /units?/i, /purchase(?:s|d|ing)?/i, /采购/, /招标/,
  ]);
  return {
    evidenceType: type,
    supplierMentions: supplierSnippets,
    buyerScaleSignals: buyerSnippets,
    supplierStatus: supplierSnippets.length ? "publicly_mentioned_needs_verification" : "not_found",
    buyerScaleStatus: buyerSnippets.length ? "public_signal_found" : "not_found",
  };
}

/* ------------------------------------------------------------------ *
 * Structured tender extraction (EN / AR / RU)
 * ------------------------------------------------------------------ */

const DATE_VALUE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\.?\s+\d{2,4})/i;

const MONEY_VALUE = /((?:AED|SAR|QAR|OMR|BHD|KWD|USD|EUR|GEL|AZN|KZT|UZS|RUB)\s?[\d.,]{2,}(?:\s?(?:million|billion|mln|bn))?|[\d.,]{4,}\s?(?:AED|SAR|QAR|OMR|BHD|KWD|USD|EUR|million|billion|مليون|млн|тенге))/i;

// keyword lists per field, in multiple languages
const FIELD_KEYWORDS = {
  reference: [/tender\s*(?:no\.?|number|ref\.?|reference)/i, /\bref(?:erence)?\s*(?:no\.?|number)/i, /bid\s*(?:no\.?|number)/i, /رقم\s*المناقصة/, /الرقم\s*المرجعي/, /номер\s*закупк/i, /№\s*закупк/i, /рег\.?\s*номер/i],
  closingDate: [/clos(?:ing|e)\s*date/i, /submission\s*deadline/i, /deadline/i, /last\s*date/i, /bid\s*clos/i, /تاريخ\s*الإغلاق/, /آخر\s*موعد/, /окончани[ея]\s*(?:прием|подач)/i, /срок\s*подачи/i, /дата\s*окончания/i],
  publishDate: [/publish(?:ed|ing)?\s*date/i, /issue\s*date/i, /date\s*published/i, /posted\s*on/i, /تاريخ\s*النشر/, /дата\s*публикации/i, /дата\s*размещения/i],
  value: [/estimated\s*(?:value|cost|budget)/i, /contract\s*value/i, /budget/i, /\bvalue\b/i, /القيمة/, /الميزانية/, /(?:начальн\w*|максимальн\w*)\s*цена/i, /стоимость/i, /сумма/i],
  buyer: [/procuring\s*entity/i, /buyer/i, /purchaser/i, /contracting\s*authority/i, /organization/i, /الجهة/, /заказчик/i, /организатор/i],
  category: [/category/i, /sector/i, /classification/i, /التصنيف/, /категори[яи]/i],
};

// Union of all field labels — used to stop a free-text value before it runs
// into the next labelled field (e.g. "... Ministry of Finance Category: ...").
const STOP_LABELS = new RegExp(
  Object.values(FIELD_KEYWORDS).flat().map((re) => re.source).join("|"),
  "i",
);

function grabNear(text, keywords, valueRe, window = 90) {
  for (const kw of keywords) {
    const m = text.match(kw);
    if (!m || m.index == null) continue;
    const slice = text.slice(m.index, Math.min(text.length, m.index + m[0].length + window));
    if (valueRe) {
      const v = slice.slice(m[0].length).match(valueRe);
      if (v) return (v[1] ? v[1] : v[0]).trim();
    } else {
      // capture short free-text value after the label, stopping at the next label
      let after = slice.slice(m[0].length).replace(/^\s*[:：\-–]?\s*/, "");
      const stop = after.match(STOP_LABELS);
      if (stop && stop.index != null && stop.index > 0) after = after.slice(0, stop.index);
      const v = after.match(/^([^.;|]{2,80}?)(?=\s{2,}|$|[.;|])/);
      if (v && v[1].trim().length > 1) return v[1].trim();
    }
  }
  return "";
}

// Does this page look like an individual tender / procurement notice?
function isTenderLike(url, text) {
  const u = url.toLowerCase();
  if (/tender|bid|rfq|rfp|notice|procure|zakup|goszakup|etimad|monaqasat|etender|davlat_xarid/.test(u)) return true;
  const t = text.slice(0, 4000);
  const hits = [/tender/i, /مناقصة/, /закупк/i, /тендер/i, /deadline/i, /closing\s*date/i, /prequalif/i, /supplier\s*registration/i]
    .filter((re) => re.test(t)).length;
  return hits >= 2;
}

function extractTender(url, text, title) {
  const norm = normaliseDigits(text);
  const reference = grabNear(norm, FIELD_KEYWORDS.reference, /([A-Z0-9][A-Z0-9\/\-]{3,30})/);
  const closingDate = grabNear(norm, FIELD_KEYWORDS.closingDate, DATE_VALUE);
  const publishDate = grabNear(norm, FIELD_KEYWORDS.publishDate, DATE_VALUE);
  const value = grabNear(norm, FIELD_KEYWORDS.value, MONEY_VALUE);
  const buyer = grabNear(norm, FIELD_KEYWORDS.buyer, null);
  const category = grabNear(norm, FIELD_KEYWORDS.category, null);
  const found = [reference, closingDate, publishDate, value, buyer, category].filter(Boolean).length;
  if (!found) return null;
  return {
    title: (title || "").slice(0, 200) || null,
    reference: reference || null,
    publishDate: publishDate || null,
    closingDate: closingDate || null,
    estimatedValue: value || null,
    buyerEntity: buyer || null,
    category: category || null,
    fieldsFound: found,
    sourceUrl: url,
    capturedAt: new Date().toISOString(),
    verificationStatus: "unreviewed",
  };
}

/* ------------------------------------------------------------------ *
 * Pagination + detail-link discovery
 * ------------------------------------------------------------------ */

const NEXT_TEXT = /(?:next|older|more|下一页|下一頁|следующ|التالي|الصفحة\s*التالية|›|»|&gt;)/i;

function findPaginationLinks(html, baseUrl) {
  const out = new Set();
  // rel="next"
  const relNext = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<a[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
  if (relNext) { const u = normaliseUrl(relNext[1], baseUrl); if (u) out.add(u); }
  // anchors whose visible text looks like "next"
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,40}?)<\/a>/gi)) {
    const label = stripHtml(m[2]);
    if (NEXT_TEXT.test(label) || NEXT_TEXT.test(m[1])) {
      const u = normaliseUrl(m[1], baseUrl);
      if (u) out.add(u);
    }
  }
  // ?page=/?pageNo=/&p= style numeric pagination
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']*(?:page|pageno|pageindex|pg|p|offset|start)=\d+[^"']*)["']/gi)) {
    const u = normaliseUrl(m[1], baseUrl);
    if (u) out.add(u);
  }
  return [...out];
}

const DETAIL_HINT = /(?:tender|notice|bid|rfq|rfp|detail|view|show|announce|opportunit|project|award|contract|zakup|lot)[^a-z]/i;

function looksLikeDetail(url) {
  const u = url.toLowerCase();
  if (/[?&](id|tenderid|noticeid|bidid|announceid|lotid|itemid|refno|code)=/.test(u)) return true;
  if (DETAIL_HINT.test(u + " ")) return true;
  if (/\/\d{3,}(?:[\/?#]|$)/.test(u)) return true; // numeric id in path
  return false;
}

/* ------------------------------------------------------------------ *
 * Fetching: static first, headless-browser escalation
 * ------------------------------------------------------------------ */

let browser = null;
let playwrightLoadFailed = false;

async function getBrowser() {
  if (flagNoRender || playwrightLoadFailed) return null;
  if (browser) return browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    return browser;
  } catch (error) {
    playwrightLoadFailed = true;
    console.warn(`[render] Playwright unavailable, falling back to static fetch only: ${error.message}`);
    console.warn(`[render] Install it with:  npm i -D playwright  &&  npx playwright install chromium`);
    return null;
  }
}

async function ensureRobots(origin, robotsCache) {
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    try {
      const response = await fetch(robotsUrl, { headers: { "user-agent": userAgent } });
      robotsCache.set(origin, parseRobots(response.ok ? await response.text() : ""));
    } catch {
      robotsCache.set(origin, { disallow: [], allow: [], delayMs: minDelayMs, sitemaps: [] });
    }
  }
  return robotsCache.get(origin);
}

async function staticFetch(url) {
  const response = await fetch(url, { headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) return { skipped: `http_${response.status}` };
  if (!contentType.includes("text/html") && !contentType.includes("xml")) return { skipped: `content_type_${contentType.split(";")[0] || "unknown"}` };
  return { html: await response.text(), status: response.status };
}

// Heuristic: does the static HTML look like an empty SPA shell?
function looksEmptyShell(html) {
  const text = stripHtml(html);
  if (text.length > 600) return false;
  return /<div[^>]+id=["'](?:root|app|__next|__nuxt)["']/i.test(html)
    || /window\.__(?:NUXT|NEXT|INITIAL_STATE)__/i.test(html)
    || text.length < 200;
}

async function renderFetch(url, source) {
  const b = await getBrowser();
  if (!b) return null;
  const context = await b.newContext({ userAgent });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: (source.renderTimeoutMs || 25000) });
    try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch { /* best effort */ }
    if (source.waitForSelector) {
      try { await page.waitForSelector(source.waitForSelector, { timeout: 8000 }); } catch { /* best effort */ }
    }
    const html = await page.content();
    return { html, status: 200, rendered: true };
  } finally {
    await page.close();
    await context.close();
  }
}

async function fetchPage(url, source, robotsCache) {
  const origin = new URL(url).origin;
  const robots = await ensureRobots(origin, robotsCache);
  if (!robotsAllows(url, robots)) return { skipped: "robots_disallow", robots };
  await sleep(robots.delayMs);

  const mode = source.render || "auto"; // "auto" | "always" | "never"
  let result = null;
  let renderedWith = "static";

  if (mode !== "always") {
    result = await staticFetch(url).catch((e) => ({ skipped: `fetch_error_${e.message}` }));
  }

  const shouldRender = mode === "always"
    || (mode !== "never" && (!result || result.skipped || looksEmptyShell(result.html || "")));

  if (shouldRender && !flagNoRender) {
    const rendered = await renderFetch(url, source).catch((e) => {
      console.warn(`[render] ${url} -> ${e.message}`);
      return null;
    });
    if (rendered?.html) { result = rendered; renderedWith = "browser"; }
  }

  if (!result || result.skipped) return { skipped: result?.skipped || "no_content", robots };
  return { html: result.html, status: result.status, robots, renderedWith };
}

/* ------------------------------------------------------------------ *
 * sitemap discovery
 * ------------------------------------------------------------------ */

async function discoverSitemapUrls(origin, robots, allowedPaths, limit = 40) {
  const candidates = [...(robots.sitemaps || []), `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const found = new Set();
  for (const sm of [...new Set(candidates)]) {
    if (found.size >= limit) break;
    try {
      const res = await fetch(sm, { headers: { "user-agent": userAgent } });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
        const u = normaliseUrl(m[1]);
        if (!u) continue;
        if (new URL(u).origin !== origin) continue;
        if (u.endsWith(".xml")) {
          // nested sitemap; fetch one level deep
          try {
            const r2 = await fetch(u, { headers: { "user-agent": userAgent } });
            if (r2.ok) {
              const xml2 = await r2.text();
              for (const mm of xml2.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
                const uu = normaliseUrl(mm[1]);
                if (uu && new URL(uu).origin === origin && pathAllowed(uu, allowedPaths)) found.add(uu);
                if (found.size >= limit) break;
              }
            }
          } catch { /* ignore nested errors */ }
        } else if (pathAllowed(u, allowedPaths)) {
          found.add(u);
        }
        if (found.size >= limit) break;
      }
    } catch { /* ignore */ }
  }
  return [...found];
}

/* ------------------------------------------------------------------ *
 * Per-source crawl (depth-aware)
 * ------------------------------------------------------------------ */

async function runSource(source) {
  const robotsCache = new Map();
  const maxPages = Math.max(1, source.maxPages || 40);
  const maxDepth = Number.isFinite(source.maxDepth) ? source.maxDepth : 2;
  const followDetail = source.followDetail !== false;
  const paginate = source.paginate !== false;

  const seeds = source.seeds.map((seed) => normaliseUrl(seed)).filter(Boolean);
  const queue = seeds.map((url) => ({ url, depth: 0 }));
  const visited = new Set();
  const pages = [];
  const tenders = [];
  const contacts = { emails: new Set(), phones: new Set() };
  const renderStats = { static: 0, browser: 0, skipped: 0 };

  // sitemap seeding (once per distinct origin among seeds)
  if (source.useSitemap) {
    const origins = [...new Set(seeds.map((u) => new URL(u).origin))];
    for (const origin of origins) {
      const robots = await ensureRobots(origin, robotsCache);
      const smUrls = await discoverSitemapUrls(origin, robots, source.allowedPaths, source.sitemapLimit || 40);
      for (const u of smUrls) queue.push({ url: u, depth: 1 });
      if (smUrls.length) console.log(`[sitemap] ${origin} -> +${smUrls.length} urls`);
    }
  }

  while (queue.length && pages.length < maxPages) {
    const { url, depth } = queue.shift();
    if (!url || visited.has(url) || !pathAllowed(url, source.allowedPaths)) continue;
    visited.add(url);

    try {
      const result = await fetchPage(url, source, robotsCache);
      if (result.skipped) {
        renderStats.skipped++;
        pages.push({ url, depth, capturedAt: new Date().toISOString(), status: "skipped", reason: result.skipped });
        continue;
      }
      const html = result.html;
      renderStats[result.renderedWith === "browser" ? "browser" : "static"]++;

      const text = stripHtml(html).slice(0, 16000);
      const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
        || firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const description = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
      const emails = extractEmails(html);
      const phones = extractPhones(text);
      emails.forEach((e) => contacts.emails.add(e));
      phones.forEach((p) => contacts.phones.add(p));
      const publicPeople = extractPublicPeople(text);
      const tags = classifyPage(url, text);
      const businessEvidence = extractPublicBusinessEvidence(text, source.type);

      const tenderLike = isTenderLike(url, text);
      let tender = null;
      if (tenderLike) {
        tender = extractTender(url, text, title);
        if (tender) tenders.push(tender);
      }

      pages.push({
        url, depth, capturedAt: new Date().toISOString(), status: "ok", statusCode: result.status,
        renderedWith: result.renderedWith, title, description, tenderLike,
        emails, phones, publicPeople, tags, ...businessEvidence,
        tender: tender || undefined,
        textSample: text.slice(0, 800),
        evidence: { field: "page", url, capturedAt: new Date().toISOString(), renderedWith: result.renderedWith },
      });

      const origin = new URL(url).origin;

      // 1) pagination: enqueue next pages at the SAME depth (listing keeps flowing)
      if (paginate && depth <= maxDepth) {
        for (const link of findPaginationLinks(html, url)) {
          if (new URL(link).origin === origin && !visited.has(link) && pathAllowed(link, source.allowedPaths)) {
            queue.push({ url: link, depth });
          }
        }
      }

      // 2) drill into detail pages (depth + 1)
      if (followDetail && depth < maxDepth) {
        const links = extractLinks(html, url);
        for (const link of links) {
          if (new URL(link).origin !== origin || visited.has(link) || !pathAllowed(link, source.allowedPaths)) continue;
          const isDetail = looksLikeDetail(link);
          // At shallow depth follow structural + detail links; deeper, prefer detail-looking links only.
          if (depth === 0 || isDetail) queue.push({ url: link, depth: depth + 1 });
        }
      }
    } catch (error) {
      pages.push({ url, depth, capturedAt: new Date().toISOString(), status: "error", reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    type: source.type,
    startedAt: new Date().toISOString(),
    config: { maxPages, maxDepth, followDetail, paginate, render: source.render || "auto", useSitemap: !!source.useSitemap },
    pageCount: pages.length,
    renderStats,
    tenderCount: tenders.length,
    tenders,
    contacts: { emails: [...contacts.emails].slice(0, 50), phones: [...contacts.phones].slice(0, 50) },
    pages,
  };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const sources = JSON.parse(await fs.readFile(configPath, "utf8"));
const regions = JSON.parse(await fs.readFile(regionsPath, "utf8"));

// Build host -> country from the verified target pool (so .com company sites map correctly).
try {
  const buyersData = JSON.parse(await fs.readFile(path.join(root, "crawler", "phase-1-buyers.json"), "utf8"));
  for (const t of buyersData.targets || []) {
    if (!t.officialUrl || !t.country) continue;
    try { HOST_COUNTRY[new URL(t.officialUrl).hostname.toLowerCase()] = t.country; } catch { /* skip */ }
  }
} catch { /* phase-1-buyers.json optional */ }

let enabled = sources.filter((source) => source.enabled && Array.isArray(source.seeds) && source.seeds.length);
if (onlySourceId) enabled = enabled.filter((s) => s.id === onlySourceId);

if (!enabled.length) {
  console.log("No enabled sources with seeds. Edit crawler/sources.json before running.");
  process.exit(0);
}

console.log(`Deep crawl starting: ${enabled.length} source(s), render=${flagNoRender ? "off" : "auto/on"}`);
await fs.mkdir(outputDir, { recursive: true });
const results = [];
for (const source of enabled) {
  console.log(`\n-> ${source.id} (${source.name})`);
  const res = await runSource(source);
  console.log(`   pages=${res.pageCount} rendered=${res.renderStats.browser} tenders=${res.tenderCount}`);
  results.push(res);
}

if (browser) await browser.close();

const totalTenders = results.reduce((n, r) => n + r.tenderCount, 0);
const totalPages = results.reduce((n, r) => n + r.pageCount, 0);
const outputPath = path.join(outputDir, `crawl-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await fs.writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  crawlerVersion: "0.2",
  userAgent,
  renderEnabled: !flagNoRender && !playwrightLoadFailed,
  summary: { sources: results.length, pages: totalPages, tenders: totalTenders },
  marketConfig: regions,
  results,
}, null, 2), "utf8");
console.log(`\nSaved ${outputPath}`);
console.log(`Totals: pages=${totalPages} tenders=${totalTenders}`);

/* ------------------------------------------------------------------ *
 * Stable frontend feed: crawler/live-tenders.json
 * The website reads THIS file (a fixed path), not the timestamped run.
 * ------------------------------------------------------------------ */

const liveTenders = [];
const liveContacts = [];
const countryAgg = {};

const bump = (code, key) => {
  const c = countryAgg[code] || (countryAgg[code] = { code, name: COUNTRY[code]?.name || code, region: COUNTRY[code]?.region || "待归类", tenders: 0, pages: 0, contacts: 0 });
  c[key] += 1;
};

for (const r of results) {
  for (const p of r.pages) {
    if (p.status === "ok") bump(countryFromUrl(p.url), "pages");
  }
  for (const t of r.tenders) {
    const code = countryFromUrl(t.sourceUrl);
    bump(code, "tenders");
    liveTenders.push({
      ...t,
      country: code,
      countryName: COUNTRY[code]?.name || code,
      region: COUNTRY[code]?.region || "待归类",
      sourceName: r.sourceName,
      sourceType: r.type,
    });
  }
  for (const email of r.contacts.emails) {
    const host = email.split("@")[1] || "";
    const code = countryFromUrl(`http://${host}`);
    bump(code, "contacts");
    liveContacts.push({ value: email, kind: "email", country: code, countryName: COUNTRY[code]?.name || code, sourceName: r.sourceName });
  }
  for (const phone of r.contacts.phones) {
    liveContacts.push({ value: phone, kind: "phone", country: "XX", countryName: "待核验", sourceName: r.sourceName });
  }
}

// sort tenders: most complete first, then by presence of a closing date
liveTenders.sort((a, b) => (b.fieldsFound - a.fieldsFound) || ((b.closingDate ? 1 : 0) - (a.closingDate ? 1 : 0)));

const countryStats = Object.values(countryAgg).sort((a, b) => b.tenders - a.tenders || b.pages - a.pages);

const livePath = path.join(root, "crawler", "live-tenders.json");
await fs.writeFile(livePath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  crawlerVersion: "0.2",
  renderEnabled: !flagNoRender && !playwrightLoadFailed,
  summary: {
    countries: countryStats.length,
    tenders: liveTenders.length,
    pages: totalPages,
    contacts: liveContacts.length,
  },
  countryStats,
  tenders: liveTenders,
  contacts: liveContacts,
}, null, 2), "utf8");
console.log(`Saved ${livePath} (frontend feed): ${liveTenders.length} tenders across ${countryStats.length} countries`);
