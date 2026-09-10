import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  chromium,
  type BrowserContext,
  type Page,
  type Route,
  type WebSocketRoute,
} from "playwright";

import { extractPageEvidence } from "./extract-page";
import { selectCrawlTargets, type CrawlTarget } from "./select-crawl-targets";
import type {
  AuditedPage,
  AuditObservation,
  AuditPageCategory,
  AuditReport,
  AuditResult,
  CompetitiveResearch,
  EvidenceSource,
  ExtractedPage,
  ObservedEvidence,
} from "./types";
import { assertPublicUrl, normalizeUrlInput, UnsafeUrlError } from "./url-safety";

const NAVIGATION_TIMEOUT_MS = 30_000;
const SETTLE_TIMEOUT_MS = 5_000;
const DEFAULT_PAGE_LIMIT = 6;
const MAX_PAGE_LIMIT = 8;
const ALLOWED_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type RunWebsiteAuditOptions = {
  analysis?: "run" | "skip";
  research?: "run" | "skip";
  pageLimit?: number;
};

const observed = <T>(
  evidenceId: string,
  label: string,
  source: EvidenceSource,
  value: T,
): ObservedEvidence<T> => ({
  evidenceId,
  classification: "directly_observed",
  source,
  label,
  value,
});

function createRequestGuard() {
  const publicHostChecks = new Map<string, Promise<void>>();
  return async function guardRequest(route: Route) {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (!ALLOWED_HTTP_METHODS.has(method)) {
      await route.abort("blockedbyclient");
      return;
    }

    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url());
    } catch {
      await route.abort("blockedbyclient");
      return;
    }

    if (requestUrl.protocol === "data:" || requestUrl.protocol === "blob:") {
      await route.continue();
      return;
    }

    try {
      const hostname = requestUrl.hostname.toLowerCase();
      let publicHostCheck = publicHostChecks.get(hostname);
      if (!publicHostCheck) {
        publicHostCheck = assertPublicUrl(requestUrl).then(() => undefined);
        publicHostChecks.set(hostname, publicHostCheck);
      }
      await publicHostCheck;
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  };
}

async function installReadOnlyNetworkGuard(context: BrowserContext) {
  await context.route("**/*", createRequestGuard());
  await context.routeWebSocket("**/*", (webSocket: WebSocketRoute) => webSocket.close());
}

function skippedReport(): AuditReport {
  return {
    analysis: {
      status: "skipped",
      model: null,
      generatedAt: null,
      message: "AI analysis was skipped for this run.",
    },
    executiveSummary: null,
    scores: null,
    hypotheses: [],
    recommendations: [],
  };
}

function pageLimitFrom(options: RunWebsiteAuditOptions) {
  if (options.pageLimit === undefined) return DEFAULT_PAGE_LIMIT;
  return Math.max(1, Math.min(MAX_PAGE_LIMIT, Math.floor(options.pageLimit)));
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function createObservation(
  auditId: string,
  pageId: string,
  screenshotFileName: string,
  extracted: ExtractedPage,
): AuditObservation {
  const evidenceId = (key: string) => `${pageId}.${key}`;
  return {
    pageTitle: observed(evidenceId("page_title"), "HTML page title", "dom", extracted.pageTitle),
    metaDescription: observed(evidenceId("meta_description"), "Meta description", "dom", extracted.metaDescription),
    robotsMeta: observed(evidenceId("robots_meta"), "Robots meta directive", "dom", extracted.robotsMeta),
    canonicalUrl: observed(evidenceId("canonical_url"), "Canonical URL", "dom", extracted.canonicalUrl),
    language: observed(evidenceId("language"), "Document language", "dom", extracted.language),
    h1Headings: observed(evidenceId("h1_headings"), "Visible H1 headings", "dom", extracted.h1Headings),
    headings: observed(evidenceId("headings"), "Visible H1-H3 headings", "dom", extracted.headings),
    heroCopy: observed(evidenceId("hero_copy"), "Lead page copy", "dom", extracted.heroCopy),
    primaryCta: observed(evidenceId("primary_cta"), "Likely primary CTA", "dom", extracted.primaryCta),
    secondaryCtas: observed(evidenceId("secondary_ctas"), "Other visible conversion CTAs", "dom", extracted.secondaryCtas),
    navigationLinks: observed(evidenceId("navigation_links"), "Visible navigation links", "dom", extracted.navigationLinks),
    pricingLink: observed(evidenceId("pricing_link"), "Pricing link", "dom", extracted.pricingLink),
    signupOrFreeTrialLink: observed(evidenceId("signup_or_trial_link"), "Signup or free-trial link", "dom", extracted.signupOrFreeTrialLink),
    forms: observed(evidenceId("forms"), "Visible forms (not submitted)", "dom", extracted.forms),
    proofStatements: observed(evidenceId("proof_statements"), "Visible proof statements", "dom", extracted.proofStatements),
    structuredDataTypes: observed(evidenceId("structured_data_types"), "JSON-LD types", "dom", extracted.structuredDataTypes),
    linkCounts: observed(evidenceId("link_counts"), "Visible link counts", "dom", extracted.linkCounts),
    screenshot: observed(evidenceId("screenshot"), "Full-page screenshot", "browser", {
      fileName: screenshotFileName,
      endpoint: `/api/audits/${auditId}/screenshots/${encodeURIComponent(screenshotFileName)}`,
    }),
  };
}

async function capturePage(
  context: BrowserContext,
  auditId: string,
  artifactDirectory: string,
  target: { url: string; category: AuditPageCategory },
  index: number,
  allowedOrigin?: string,
): Promise<{ auditedPage: AuditedPage; extracted: ExtractedPage; screenshotPath: string }> {
  await assertPublicUrl(target.url);
  const page: Page = await context.newPage();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  page.setDefaultTimeout(10_000);
  const pageId = `page-${String(index).padStart(2, "0")}`;
  const screenshotFileName = `${pageId}-${safeSlug(target.category)}.png`;
  const screenshotPath = path.join(artifactDirectory, screenshotFileName);

  try {
    const response = await page.goto(target.url, { waitUntil: "domcontentloaded" });
    if (!response) throw new Error("The website did not return a document response.");
    if (response.status() >= 400) throw new Error(`The website returned HTTP ${response.status()}.`);

    const finalUrl = new URL(page.url());
    await assertPublicUrl(finalUrl);
    if (allowedOrigin && finalUrl.origin !== allowedOrigin) {
      throw new Error("The page redirected outside the submitted website.");
    }

    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {
      // Marketing sites often keep analytics connections alive; this wait is only a rendering aid.
    });
    const extracted = await extractPageEvidence(page);
    await page.screenshot({ fullPage: true, path: screenshotPath });
    const capturedAt = new Date().toISOString();
    return {
      extracted,
      screenshotPath,
      auditedPage: {
        pageId,
        category: target.category,
        requestedUrl: target.url,
        finalUrl: finalUrl.href,
        capturedAt,
        observation: createObservation(auditId, pageId, screenshotFileName, extracted),
      },
    };
  } finally {
    await page.close();
  }
}

async function createAnalysis(
  pages: AuditedPage[],
  context: { requestedUrl: string; finalUrl: string },
  mode: "run" | "skip",
): Promise<AuditReport> {
  if (mode === "skip") return skippedReport();
  try {
    const { analyzeSite } = await import("@/lib/openai/analyze-site");
    return await analyzeSite(pages, context);
  } catch (error) {
    console.error("OpenAI site analysis failed", error);
    return {
      analysis: {
        status: "failed",
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        generatedAt: null,
        message: "AI analysis failed, but the directly observed evidence was saved.",
      },
      executiveSummary: null,
      scores: null,
      hypotheses: [],
      recommendations: [],
    };
  }
}

async function createCompetitiveResearch(
  pages: AuditedPage[],
  context: { requestedUrl: string; finalUrl: string },
  mode: "run" | "skip",
): Promise<CompetitiveResearch> {
  if (mode === "skip") {
    return {
      research: {
        status: "skipped",
        model: null,
        generatedAt: null,
        message: "Competitor research was skipped for this run.",
      },
      marketCategory: null,
      executiveBrief: null,
      differentiationClarity: null,
      competitors: [],
      positioningMatrix: [],
      strategicWhitespace: [],
      founderBrief: { keyRisks: [], decisionsToMake: [], ninetyDayMoves: [] },
      battlecards: [],
      sources: [],
    };
  }
  const researchModule = await import("@/lib/openai/research-competitors");
  return researchModule.researchCompetitors(pages, context);
}

function discoveredInternalLinkCount(links: ExtractedPage["discoveredLinks"], origin: string) {
  return new Set(links.flatMap((link) => {
    if (!link.href) return [];
    try {
      const url = new URL(link.href);
      if (url.origin !== origin) return [];
      url.hash = "";
      return [url.href];
    } catch {
      return [];
    }
  })).size;
}

export function auditArtifactDirectory(auditId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(auditId)) throw new UnsafeUrlError("Invalid audit identifier.");
  return path.join(process.cwd(), "artifacts", auditId);
}

export async function runWebsiteAudit(
  input: string,
  options: RunWebsiteAuditOptions = {},
): Promise<AuditResult> {
  const requestedUrl = normalizeUrlInput(input);
  await assertPublicUrl(requestedUrl);
  const auditId = randomUUID();
  const artifactDirectory = auditArtifactDirectory(auditId);
  const resultPath = path.join(artifactDirectory, "result.json");
  const pageLimit = pageLimitFrom(options);
  await mkdir(artifactDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      acceptDownloads: false,
      bypassCSP: false,
      ignoreHTTPSErrors: false,
      javaScriptEnabled: true,
      permissions: [],
      serviceWorkers: "block",
      viewport: { width: 1440, height: 1000 },
    });
    await installReadOnlyNetworkGuard(context);

    const homepage = await capturePage(
      context,
      auditId,
      artifactDirectory,
      { url: requestedUrl.href, category: "homepage" },
      0,
    );
    const finalUrl = homepage.auditedPage.finalUrl;
    const origin = new URL(finalUrl).origin;
    const targets: CrawlTarget[] = selectCrawlTargets(
      homepage.extracted.discoveredLinks,
      finalUrl,
      pageLimit,
    );
    const pages = [homepage.auditedPage];
    const screenshotPaths = [homepage.screenshotPath];
    const failures: Array<{ url: string; message: string }> = [];

    for (const [targetIndex, target] of targets.entries()) {
      try {
        const captured = await capturePage(
          context,
          auditId,
          artifactDirectory,
          target,
          targetIndex + 1,
          origin,
        );
        pages.push(captured.auditedPage);
        screenshotPaths.push(captured.screenshotPath);
      } catch (error) {
        failures.push({
          url: target.url,
          message: error instanceof Error ? error.message : "Page capture failed.",
        });
      }
    }

    await context.close();
    const analysisMode = options.analysis ?? "run";
    const researchMode = options.research ?? (analysisMode === "skip" ? "skip" : "run");
    const analysisContext = { requestedUrl: requestedUrl.href, finalUrl };
    const [report, competitiveResearch] = await Promise.all([
      createAnalysis(pages, analysisContext, analysisMode),
      createCompetitiveResearch(pages, analysisContext, researchMode),
    ]);

    const result: AuditResult = {
      schemaVersion: "3.0",
      auditId,
      status: "completed",
      requestedUrl: requestedUrl.href,
      finalUrl,
      capturedAt: homepage.auditedPage.capturedAt,
      crawl: {
        pageLimit,
        discoveredInternalLinks: discoveredInternalLinkCount(homepage.extracted.discoveredLinks, origin),
        selectedUrls: targets.map((target) => target.url),
        crawledPages: pages.length,
        failures,
      },
      pages,
      report,
      competitiveResearch,
      persistence: {
        local: "saved",
      },
      guardrails: {
        mode: "read_only",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        formsSubmitted: false,
        elementsClicked: false,
        accountsCreated: false,
        purchasesMade: false,
      },
    };

    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser.close();
  }
}
