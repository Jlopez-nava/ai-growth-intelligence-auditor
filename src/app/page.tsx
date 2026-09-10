import { AuditForm } from "./components/audit-form";
import { BrandLogo } from "./components/brand-logo";

const futureDimensions = [
  "Acquisition",
  "Website / CRO",
  "SEO",
  "AEO / GEO",
  "Lifecycle",
  "Onboarding",
  "Positioning",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string | string[] }>;
}) {
  const query = await searchParams;
  const initialUrl = typeof query.url === "string" ? query.url : "";

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Growth Intelligence Demo home">
          <BrandLogo />
        </a>
        <nav className="header-nav" aria-label="Audit areas">
          <a href="#dimensions">Audit dimensions</a>
          <span className="phase-label">Growth Intelligence Platform</span>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">Marketing intelligence, grounded in evidence</span>
          <h1>
            Find the gaps between
            <br />
            <em>your story</em> and your site.
          </h1>
          <p>
            Crawl a representative set of public pages, compare the market, and turn sourced
            evidence into positioning, conversion, SEO, and competitive decisions.
          </p>
        </div>

        <div className="scope-panel" aria-label="Audit workflow">
          <div className="scope-label">Growth intelligence workflow</div>
          <ol>
            <li><span>01</span> Sample key pages</li>
            <li><span>02</span> Capture screenshots</li>
            <li><span>03</span> Research competitors</li>
            <li><span>04</span> Brief leadership</li>
          </ol>
        </div>
      </section>

      <AuditForm initialUrl={initialUrl} />

      <section className="future-scope" id="dimensions">
        <div>
          <span className="eyebrow">Built to expand</span>
          <h2>One evidence model. Seven dimensions.</h2>
        </div>
        <div className="dimension-list">
          {futureDimensions.map((dimension, index) => (
            <span key={dimension}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              {dimension}
            </span>
          ))}
        </div>
      </section>

      <footer>
        <BrandLogo inverse />
        <span>Less friction. More growth.</span>
        <span>Observed evidence ≠ hypothesis ≠ recommendation</span>
      </footer>
    </main>
  );
}
