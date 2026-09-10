import type { AuditPageCategory, ObservedLink } from "./types";

export type CrawlTarget = {
  url: string;
  category: Exclude<AuditPageCategory, "homepage">;
  score: number;
};

const BLOCKED_PATH =
  /\/(?:login|log-in|signin|sign-in|signup|sign-up|register|auth|checkout|cart|billing|account|app|dashboard|privacy|terms|legal|cookies?|careers?|jobs?|press|events?)(?:\/|$)/i;
const FILE_EXTENSION = /\.(?:pdf|zip|png|jpe?g|gif|webp|svg|mp4|mp3|docx?|xlsx?)(?:$|\?)/i;

const categoryPatterns: Array<{
  category: Exclude<AuditPageCategory, "homepage" | "other">;
  pattern: RegExp;
  score: number;
}> = [
  { category: "pricing", pattern: /\b(?:pricing|packages?)\b/i, score: 100 },
  { category: "product", pattern: /\b(?:product|platform|features?|capabilities|services?)\b/i, score: 90 },
  { category: "solutions", pattern: /\b(?:solutions?|use[ -]?cases?|industr(?:y|ies)|employers?|organizations?)\b/i, score: 82 },
  { category: "customers", pattern: /\b(?:customers?|case[ -]?stud(?:y|ies)|success[ -]?stories)\b/i, score: 76 },
  { category: "resources", pattern: /\b(?:resources?|blog|guides?|learn|insights?)\b/i, score: 64 },
  { category: "company", pattern: /\b(?:about|company|why[ -]?(?:us|\w+)|mission)\b/i, score: 54 },
];

function classify(text: string, pathname: string): CrawlTarget["category"] {
  if (/\/(?:pricing|packages?)(?:\/|$)/i.test(pathname)) return "pricing";
  if (/\/(?:products?|platform|features?|services?|[^/]*(?:clinic|care|medical-opinion)[^/]*)(?:\/|$)/i.test(pathname)) return "product";
  if (/\/(?:solutions?|use-cases?|industr(?:y|ies)|employers?|organizations?)(?:\/|$)/i.test(pathname)) return "solutions";
  if (/\/(?:customers?|case-stud(?:y|ies)|success-stories)(?:\/|$)/i.test(pathname)) return "customers";
  if (/\/(?:resources?|blog|guides?|learn|insights?)(?:\/|$)/i.test(pathname)) return "resources";
  if (/\/(?:about(?:-us)?|company|mission)(?:\/|$)/i.test(pathname)) return "company";
  const haystack = `${text} ${pathname.replace(/[-_/]+/g, " ")}`;
  return categoryPatterns.find(({ pattern }) => pattern.test(haystack))?.category ?? "other";
}

function categoryScore(category: CrawlTarget["category"]) {
  return categoryPatterns.find((item) => item.category === category)?.score ?? 20;
}

function normalizedCandidate(href: string, origin: string) {
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.origin !== origin) return null;
    if (parsed.username || parsed.password || FILE_EXTENSION.test(parsed.pathname)) return null;
    if (BLOCKED_PATH.test(parsed.pathname)) return null;
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    if (parsed.pathname === "/") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function selectCrawlTargets(
  links: ObservedLink[],
  homepageUrl: string,
  pageLimit: number,
): CrawlTarget[] {
  const origin = new URL(homepageUrl).origin;
  const byUrl = new Map<string, CrawlTarget>();

  for (const link of links) {
    if (!link.href) continue;
    const url = normalizedCandidate(link.href, origin);
    if (!url) continue;
    const pathname = new URL(url).pathname;
    const category = classify(link.text, pathname);
    const depth = pathname.split("/").filter(Boolean).length;
    if (category === "other" && depth > 1) continue;

    const score =
      categoryScore(category) +
      (link.placement === "navigation" ? 12 : 0) +
      (link.placement === "main" ? 5 : 0) -
      Math.max(0, depth - 1) * 8;
    const existing = byUrl.get(url);
    if (!existing || score > existing.score) byUrl.set(url, { url, category, score });
  }

  const ranked = Array.from(byUrl.values()).sort((a, b) => b.score - a.score);
  const selected: CrawlTarget[] = [];
  const seenCategories = new Set<CrawlTarget["category"]>();

  for (const target of ranked) {
    if (selected.length >= Math.max(0, pageLimit - 1)) break;
    if (target.category === "other" || seenCategories.has(target.category)) continue;
    selected.push(target);
    seenCategories.add(target.category);
  }

  for (const target of ranked) {
    if (selected.length >= Math.max(0, pageLimit - 1)) break;
    if (selected.some((item) => item.url === target.url)) continue;
    selected.push(target);
  }

  return selected;
}
