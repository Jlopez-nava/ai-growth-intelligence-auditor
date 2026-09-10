"use client";

import { type FormEvent, useEffect, useState } from "react";

import type {
  AuditDimension,
  AuditResult,
  AuditSummary,
  ObservedLink,
  ResearchSource,
} from "@/lib/audit/types";

const dimensionLabel: Record<AuditDimension, string> = {
  positioning: "Positioning",
  website_cro: "Website / CRO",
  seo: "SEO",
};

function LinkValue({ link }: { link: ObservedLink | null }) {
  if (!link) return <span className="empty-value">Not observed on this homepage</span>;

  return (
    <span className="link-value">
      <span>{link.text}</span>
      {link.href ? <small>{link.href}</small> : <small>Control without a destination URL</small>}
    </span>
  );
}

function EvidenceIds({ ids }: { ids: string[] }) {
  return (
    <span className="evidence-ids" aria-label="Supporting evidence">
      {ids.map((id) => <code key={id}>{id}</code>)}
    </span>
  );
}

function SourceLinks({ ids, sources }: { ids: string[]; sources: ResearchSource[] }) {
  const sourceMap = new Map(sources.map((source) => [source.sourceId, source]));
  return (
    <span className="source-links" aria-label="Research sources">
      {ids.map((id) => {
        const source = sourceMap.get(id);
        return source ? (
          <a href={source.url} target="_blank" rel="noreferrer" key={id}>{id}</a>
        ) : <code key={id}>{id}</code>;
      })}
    </span>
  );
}

export function AuditForm({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<AuditSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function refreshHistory() {
    try {
      const response = await fetch("/api/audits", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { audits: AuditSummary[] };
      setHistory(payload.audits);
    } catch {
      // Audit history is supplemental and should never block a new audit.
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audits", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { audits: [] })
      .then((payload: { audits: AuditSummary[] }) => {
        if (!cancelled) setHistory(payload.audits);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as AuditResult | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Audit failed.");
      }
      setResult(payload as AuditResult);
      void refreshHistory();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Audit failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([`${JSON.stringify(result, null, 2)}\n`], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `marketing-audit-${result.auditId}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  const homepage = result?.pages[0];
  const observation = homepage?.observation;
  const report = result?.report;
  const competitive = result?.competitiveResearch;

  return (
    <div className="audit-workspace">
      <form className="audit-form" onSubmit={submitAudit}>
        <label htmlFor="company-url">Company website</label>
        <div className="url-row">
          <div className="url-field">
            <span aria-hidden="true">https://</span>
            <input
              id="company-url"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="acme.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Auditing…" : "Run full website audit"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className="form-note">
          Read-only inspection. No clicks, form submissions, account creation, or purchases.
        </p>
      </form>

      {isLoading ? (
        <section className="status-card" aria-live="polite">
          <span className="status-pulse" />
          <div>
            <strong>Crawling pages, capturing evidence, and researching competitors</strong>
            <p>This bounded read-only run can take a few minutes. Every AI claim is tied to site evidence or a clickable web source.</p>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="error-card" role="alert">
          <strong>Audit could not run</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {result && homepage && observation && report && competitive ? (
        <section className="results" aria-live="polite">
          <div className="results-heading">
            <div>
              <span className="eyebrow">Growth intelligence website + market audit</span>
              <h2>{observation.pageTitle.value || "Untitled homepage"}</h2>
              <a href={result.finalUrl} target="_blank" rel="noreferrer">{result.finalUrl}</a>
            </div>
            <div className="results-actions">
              <span className="completed-badge">Evidence saved</span>
              <button type="button" className="secondary-button" onClick={downloadJson}>Download JSON</button>
            </div>
          </div>

          {report.analysis.status !== "completed" ? (
            <div className="analysis-notice">
              <strong>Evidence collection completed; AI analysis is {report.analysis.status.replace("_", " ")}.</strong>
              <p>{report.analysis.message}</p>
            </div>
          ) : null}

          {report.scores ? (
            <section className="report-section">
              <div className="section-heading">
                <div><span className="eyebrow">AI analysis</span><h3>Three website scores</h3></div>
                <small>{report.analysis.model}</small>
              </div>
              {report.executiveSummary ? <p className="executive-summary">{report.executiveSummary}</p> : null}
              <div className="score-grid">
                {([
                  ["Positioning", report.scores.positioning],
                  ["Website / CRO", report.scores.websiteCro],
                  ["SEO", report.scores.seo],
                ] as const).map(([label, score]) => (
                  <article className="score-card" key={label}>
                    <div><span>{label}</span><strong>{score.score}</strong><small>/100</small></div>
                    <p>{score.rationale}</p>
                    <EvidenceIds ids={score.evidenceIds} />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="report-section">
            <div className="section-heading">
              <div><span className="eyebrow">Directly observed</span><h3>Pages included in the sample</h3></div>
              <small>{result.pages.length} of {result.crawl.pageLimit} page slots · {result.crawl.discoveredInternalLinks} links found</small>
            </div>
            <div className="page-grid">
              {result.pages.map((auditedPage) => (
                <article key={auditedPage.pageId}>
                  <span>{auditedPage.category} · {auditedPage.pageId}</span>
                  <h4>{auditedPage.observation.pageTitle.value || "Untitled page"}</h4>
                  <a href={auditedPage.finalUrl} target="_blank" rel="noreferrer">{auditedPage.finalUrl}</a>
                  <a className="evidence-link" href={auditedPage.observation.screenshot.value.endpoint} target="_blank" rel="noreferrer">View screenshot ↗</a>
                </article>
              ))}
            </div>
            {result.crawl.failures.length ? (
              <details className="crawl-failures">
                <summary>{result.crawl.failures.length} selected page(s) could not be captured</summary>
                <ul>{result.crawl.failures.map((failure) => <li key={failure.url}><strong>{failure.url}</strong><span>{failure.message}</span></li>)}</ul>
              </details>
            ) : null}
          </section>

          <section className="report-section competitive-section">
            <div className="section-heading">
              <div><span className="eyebrow">Externally researched</span><h3>Founder / CMO competitive brief</h3></div>
              <small>{competitive.research.status === "completed" ? `${competitive.competitors.length} competitors · ${competitive.sources.length} sources` : competitive.research.status.replace("_", " ")}</small>
            </div>
            {competitive.research.status !== "completed" ? (
              <div className="analysis-notice"><strong>Competitive research is {competitive.research.status.replace("_", " ")}.</strong><p>{competitive.research.message}</p></div>
            ) : (
              <>
                <div className="competitive-summary">
                  <div><span>Market category</span><h4>{competitive.marketCategory}</h4><p>{competitive.executiveBrief}</p></div>
                  {competitive.differentiationClarity ? (
                    <div className="clarity-score"><span>Differentiation clarity</span><strong>{competitive.differentiationClarity.score}</strong><small>/100</small><p>{competitive.differentiationClarity.rationale}</p><SourceLinks ids={competitive.differentiationClarity.sourceIds} sources={competitive.sources} /></div>
                  ) : null}
                </div>

                <div className="competitor-grid">
                  {competitive.competitors.map((competitor) => (
                    <article key={competitor.id}>
                      <div className="competitor-heading"><div><span>{competitor.relationship.replace("_", " ")}</span><h4>{competitor.name}</h4></div><span className={`threat threat-${competitor.threatLevel}`}>{competitor.threatLevel} threat</span></div>
                      <p>{competitor.whyRelevant}</p>
                      <dl>
                        <div><dt>Audience</dt><dd>{competitor.targetAudience}</dd></div>
                        <div><dt>Positioning</dt><dd>{competitor.positioning}</dd></div>
                        <div><dt>Conversion motion</dt><dd>{competitor.conversionMotion}</dd></div>
                      </dl>
                      <div className="strength-gap"><div><strong>Notable strengths</strong><ul>{competitor.notableStrengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Possible gaps</strong><ul>{competitor.possibleGaps.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
                      <div className="card-footer"><a href={competitor.websiteUrl} target="_blank" rel="noreferrer">Website ↗</a><SourceLinks ids={competitor.sourceIds} sources={competitive.sources} /></div>
                    </article>
                  ))}
                </div>

                <div className="matrix-wrap">
                  <h4>Positioning comparison</h4>
                  <table><thead><tr><th>Company</th><th>Audience</th><th>Core promise</th><th>Differentiation</th><th>Conversion path</th><th>Sources</th></tr></thead><tbody>
                    {competitive.positioningMatrix.map((row) => <tr key={row.companyName}><th>{row.companyName}</th><td>{row.audience}</td><td>{row.corePromise}</td><td>{row.differentiation}</td><td>{row.primaryConversionPath}</td><td><SourceLinks ids={row.sourceIds} sources={competitive.sources} /></td></tr>)}
                  </tbody></table>
                </div>

                <div className="leadership-grid">
                  <article><span>Hypotheses</span><h4>Strategic whitespace</h4>{competitive.strategicWhitespace.map((item) => <div className="leadership-item" key={item.id}><strong>{item.title}</strong><p>{item.statement}</p><small>{item.confidence} confidence · {item.whyItMatters}</small><SourceLinks ids={item.sourceIds} sources={competitive.sources} /></div>)}</article>
                  <article><span>Leadership watchlist</span><h4>Key risks</h4>{competitive.founderBrief.keyRisks.map((item) => <div className="leadership-item" key={item.text}><p>{item.text}</p><SourceLinks ids={item.sourceIds} sources={competitive.sources} /></div>)}</article>
                  <article><span>Leadership agenda</span><h4>Decisions to make</h4>{competitive.founderBrief.decisionsToMake.map((item) => <div className="leadership-item" key={item.text}><p>{item.text}</p><SourceLinks ids={item.sourceIds} sources={competitive.sources} /></div>)}</article>
                  <article><span>Recommendations</span><h4>90-day moves</h4>{competitive.founderBrief.ninetyDayMoves.map((item) => <div className="leadership-item" key={item.id}><strong>{item.title}</strong><p>{item.action}</p><small>{item.priority} priority · {item.expectedImpact}</small><SourceLinks ids={item.sourceIds} sources={competitive.sources} /></div>)}</article>
                </div>

                <div className="battlecard-list">
                  <h4>Sales battlecard starters</h4>
                  {competitive.battlecards.map((card) => <details key={card.competitorName}><summary>{card.competitorName}</summary><div className="battlecard-grid"><p><strong>When they win</strong>{card.whenTheyWin}</p><p><strong>When you win</strong>{card.whenYouWin}</p><p><strong>Likely objection</strong>{card.likelyObjection}</p><p><strong>Response direction</strong>{card.responseDirection}</p><p><strong>Proof still needed</strong>{card.proofNeeded}</p></div><SourceLinks ids={card.sourceIds} sources={competitive.sources} /></details>)}
                </div>

                <details className="research-sources"><summary>All consulted research sources ({competitive.sources.length})</summary><ol>{competitive.sources.map((source) => <li key={source.sourceId}><code>{source.sourceId}</code><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ol></details>
              </>
            )}
          </section>

          {report.recommendations.length ? (
            <section className="report-section">
              <div className="section-heading">
                <div><span className="eyebrow">Recommendations</span><h3>Prioritized next moves</h3></div>
                <small>{report.recommendations.length} actions</small>
              </div>
              <div className="finding-list">
                {report.recommendations.map((recommendation, index) => (
                  <article className="finding-card" key={recommendation.id}>
                    <div className="finding-rank">{String(index + 1).padStart(2, "0")}</div>
                    <div>
                      <div className="finding-meta">
                        <span className={`priority priority-${recommendation.priority}`}>{recommendation.priority}</span>
                        <span>{dimensionLabel[recommendation.dimension]}</span>
                        <span>{recommendation.effort} effort</span>
                      </div>
                      <h4>{recommendation.title}</h4>
                      <p>{recommendation.action}</p>
                      <small>{recommendation.rationale}</small>
                      <EvidenceIds ids={recommendation.evidenceIds} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {report.hypotheses.length ? (
            <section className="report-section hypothesis-section">
              <div className="section-heading">
                <div><span className="eyebrow">Hypotheses</span><h3>What should be tested</h3></div>
                <small>Not directly observed</small>
              </div>
              <div className="hypothesis-grid">
                {report.hypotheses.map((hypothesis) => (
                  <article key={hypothesis.id}>
                    <span>{dimensionLabel[hypothesis.dimension]} · {hypothesis.confidence} confidence</span>
                    <h4>{hypothesis.title}</h4>
                    <p>{hypothesis.statement}</p>
                    <EvidenceIds ids={hypothesis.evidenceIds} />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="report-section">
            <div className="section-heading">
              <div><span className="eyebrow">Directly observed evidence</span><h3>What the homepage actually showed</h3></div>
              <small>Playwright · read only</small>
            </div>

            <div className="evidence-grid">
              <article className="evidence-card"><span>Primary CTA · {observation.primaryCta.evidenceId}</span><LinkValue link={observation.primaryCta.value} /></article>
              <article className="evidence-card"><span>Pricing · {observation.pricingLink.evidenceId}</span><LinkValue link={observation.pricingLink.value} /></article>
              <article className="evidence-card"><span>Signup / free trial · {observation.signupOrFreeTrialLink.evidenceId}</span><LinkValue link={observation.signupOrFreeTrialLink.value} /></article>
            </div>

            <div className="observed-copy-grid">
              <article>
                <span>Hero copy · {observation.heroCopy.evidenceId}</span>
                {observation.heroCopy.value.length ? <ul>{observation.heroCopy.value.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="empty-value">No hero copy observed.</p>}
              </article>
              <article>
                <span>SEO signals</span>
                <dl>
                  <div><dt>Meta description</dt><dd>{observation.metaDescription.value || "Not observed"}</dd></div>
                  <div><dt>Canonical</dt><dd>{observation.canonicalUrl.value || "Not observed"}</dd></div>
                  <div><dt>Visible H1s</dt><dd>{observation.h1Headings.value.join(" · ") || "None observed"}</dd></div>
                  <div><dt>JSON-LD</dt><dd>{observation.structuredDataTypes.value.join(" · ") || "None observed"}</dd></div>
                </dl>
              </article>
            </div>

            <div className="evidence-layout">
              <article className="navigation-card">
                <div className="card-heading"><span>Navigation links</span><small>{observation.navigationLinks.value.length} observed</small></div>
                {observation.navigationLinks.value.length ? (
                  <ul>{observation.navigationLinks.value.map((link, index) => <li key={`${link.href}-${index}`}><span>{link.text}</span><small>{link.href}</small></li>)}</ul>
                ) : <p className="empty-value">No visible links inside a navigation or header landmark.</p>}
              </article>
              <article className="screenshot-card">
                <div className="card-heading"><span>Screenshot evidence</span><a href={observation.screenshot.value.endpoint} target="_blank" rel="noreferrer">Open full size</a></div>
                {/* Runtime-generated evidence is not a static Next.js image asset. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={observation.screenshot.value.endpoint} alt={`Homepage screenshot of ${result.finalUrl}`} />
              </article>
            </div>
          </section>

          <details className="json-result"><summary>Structured JSON</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>
        </section>
      ) : null}

      {history.length ? (
        <section className="history-section">
          <div className="section-heading"><div><span className="eyebrow">Recent audits</span><h3>Saved evidence</h3></div><small>{history.length} recent</small></div>
          <div className="history-list">
            {history.map((audit) => (
              <a href={audit.screenshotEndpoint} target="_blank" rel="noreferrer" key={audit.auditId}>
                <span><strong>{audit.pageTitle || new URL(audit.finalUrl).hostname}</strong><small>{new Date(audit.capturedAt).toLocaleString()} · {audit.pageCount} pages · {audit.competitorCount} competitors</small></span>
                <span>{audit.overallScore ?? "—"}<small>{audit.analysisStatus === "completed" ? "avg score" : audit.analysisStatus}</small></span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
