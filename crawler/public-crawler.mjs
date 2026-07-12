#!/usr/bin/env node

/**
 * Public-source crawler for Acquire OS.
 * Safety defaults:
 * - only enabled, user-provided seeds
 * - robots.txt checked before every host
 * - same-origin only
 * - no authentication, CAPTCHA bypass, proxy rotation, or platform automation
 * - max pages and minimum delay per source
 * - every extracted field carries URL and capturedAt evidence
 */

import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

const root = process.cwd();
const configPath = path.join(root, "crawler", "sources.json");
const regionsPath = path.join(root, "crawler", "regions.json");
const outputDir = path.join(root, "crawler", "runs");
const userAgent = "AcquireOS-PublicResearch/0.1 (+public-source; contact-your-admin)";
const minDelayMs = 1800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  }
  const matching = groups.filter((group) => group.agents.includes("*") || group.agents.includes(userAgent.toLowerCase()));
  const selected = matching[0] ?? { disallow: [], allow: [], crawlDelay: 0 };
  return {
    disallow: selected.disallow,
    allow: selected.allow,
    delayMs: Math.max(minDelayMs, selected.crawlDelay || 0),
  };
}

function robotsAllows(url, robots) {
  const pathname = new URL(url).pathname;
  const denied = robots.disallow.filter((rule) => pathname.startsWith(rule));
  const allowed = robots.allow.filter((rule) => pathname.startsWith(rule));
  if (!denied.length) return true;
  return allowed.some((rule) => rule.length >= Math.max(...denied.map((item) => item.length)));
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html, expression) {
  const match = html.match(expression);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function extractEmails(html) {
  return [...new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
    .map((email) => email.toLowerCase().replace(/^u003e/, ""))
    .filter((email) => !/\.(png|jpg|jpeg|gif|svg|webp)@/i.test(email)))].slice(0, 20);
}

function extractPhones(text) {
  return [...new Set((text.match(/(?:\+|00)[0-9][0-9 ()-]{7,}[0-9]/g) || [])
    .map((phone) => phone.replace(/\s+/g, " ").trim()))].slice(0, 20);
}

function extractPublicPeople(text) {
  const rolePattern = /([A-Z][a-zÀ-ÿ'-]{1,30}(?:\s+[A-Z][a-zÀ-ÿ'-]{1,30}){1,3})\s*(?:,|-|–)\s*(?:Chief|Head|Director|Manager|VP|Vice President|Procurement|Purchasing|Sourcing|Supply Chain|Commercial|General Manager)/g;
  const roleMentions = [...text.matchAll(rolePattern)].map((match) => match[0].trim()).slice(0, 20);
  const roleSnippets = evidenceSnippets(text, [
    /procurement\s+(?:director|manager|head)/i,
    /purchasing\s+(?:director|manager|head)/i,
    /sourcing\s+(?:director|manager|head)/i,
    /supply\s+chain\s+(?:director|manager|head)/i,
    /采购(?:总监|经理|负责人)/,
  ]);
  return { roleMentions, roleSnippets };
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

function classifyPage(url, text) {
  const haystack = `${url} ${text}`.toLowerCase();
  const tags = [];
  if (/lock|door hardware|mortise|cylinder|handle|smart home|access control/.test(haystack)) tags.push("门锁/建筑五金");
  if (/oem|odm|private label|custom|manufacturer|factory/.test(haystack)) tags.push("OEM/ODM");
  if (/distributor|dealer|reseller|wholesale/.test(haystack)) tags.push("渠道/经销");
  if (/tender|procurement|bid|project|rfq/.test(haystack)) tags.push("采购/项目");
  if (/career|hiring|jobs|vacancy/.test(haystack)) tags.push("招聘信号");
  return tags;
}

function evidenceSnippets(text, patterns) {
  const snippets = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || !match.index) continue;
    const start = Math.max(0, match.index - 180);
    const end = Math.min(text.length, match.index + 320);
    snippets.push(text.slice(start, end).trim());
  }
  return [...new Set(snippets)].slice(0, 12);
}

function extractPublicBusinessEvidence(text, type) {
  const supplierSnippets = evidenceSnippets(text, [
    /approved\s+suppliers?/i,
    /preferred\s+suppliers?/i,
    /strategic\s+suppliers?/i,
    /key\s+vendors?/i,
    /manufacturer(?:s|ing)?/i,
    /供应商/,
    /制造商/,
  ]);
  const buyerSnippets = evidenceSnippets(text, [
    /annual\s+revenue/i,
    /procurement/i,
    /sourcing/i,
    /stores?/i,
    /employees?/i,
    /units?/i,
    /purchase(?:s|d|ing)?/i,
    /采购/,
    /招标/,
  ]);
  return {
    evidenceType: type,
    supplierMentions: supplierSnippets,
    buyerScaleSignals: buyerSnippets,
    supplierStatus: supplierSnippets.length ? "publicly_mentioned_needs_verification" : "not_found",
    buyerScaleStatus: buyerSnippets.length ? "public_signal_found" : "not_found",
  };
}

async function fetchText(url, robotsCache) {
  const origin = new URL(url).origin;
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    try {
      const response = await fetch(robotsUrl, { headers: { "user-agent": userAgent } });
      robotsCache.set(origin, parseRobots(response.ok ? await response.text() : ""));
    } catch {
      robotsCache.set(origin, { disallow: [], allow: [], delayMs: minDelayMs });
    }
  }
  const robots = robotsCache.get(origin);
  if (!robotsAllows(url, robots)) return { skipped: "robots_disallow", robots };
  await sleep(robots.delayMs);
  const response = await fetch(url, { headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return { skipped: `http_${response.status}`, robots };
  return { html: await response.text(), robots, status: response.status };
}

async function runSource(source) {
  const robotsCache = new Map();
  const queue = source.seeds.map((seed) => normaliseUrl(seed)).filter(Boolean);
  const visited = new Set();
  const pages = [];
  while (queue.length && pages.length < Math.max(1, source.maxPages || 20)) {
    const url = queue.shift();
    if (!url || visited.has(url) || !pathAllowed(url, source.allowedPaths)) continue;
    visited.add(url);
    try {
      const result = await fetchText(url, robotsCache);
      if (result.skipped) {
        pages.push({ url, capturedAt: new Date().toISOString(), status: "skipped", reason: result.skipped });
        continue;
      }
      const html = result.html;
      const text = stripHtml(html).slice(0, 12000);
      const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
      const description = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
      const emails = extractEmails(html);
      const phones = extractPhones(text);
      const publicPeople = extractPublicPeople(text);
      const tags = classifyPage(url, text);
      const businessEvidence = extractPublicBusinessEvidence(text, source.type);
      pages.push({ url, capturedAt: new Date().toISOString(), status: "ok", statusCode: result.status, title, description, emails, phones, publicPeople, tags, ...businessEvidence, textSample: text.slice(0, 800), evidence: { field: "page", url, capturedAt: new Date().toISOString() } });
      const origin = new URL(url).origin;
      for (const link of extractLinks(html, url)) {
        if (new URL(link).origin === origin && !visited.has(link) && pathAllowed(link, source.allowedPaths)) queue.push(link);
      }
    } catch (error) {
      pages.push({ url, capturedAt: new Date().toISOString(), status: "error", reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { sourceId: source.id, sourceName: source.name, type: source.type, startedAt: new Date().toISOString(), pageCount: pages.length, pages };
}

const sources = JSON.parse(await fs.readFile(configPath, "utf8"));
const regions = JSON.parse(await fs.readFile(regionsPath, "utf8"));
const enabled = sources.filter((source) => source.enabled && Array.isArray(source.seeds) && source.seeds.length);
if (!enabled.length) {
  console.log("No enabled sources with seeds. Edit crawler/sources.json before running.");
  process.exit(0);
}

await fs.mkdir(outputDir, { recursive: true });
const results = [];
for (const source of enabled) results.push(await runSource(source));
const outputPath = path.join(outputDir, `crawl-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await fs.writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), userAgent, marketConfig: regions, results }, null, 2), "utf8");
console.log(`Saved ${outputPath}`);
