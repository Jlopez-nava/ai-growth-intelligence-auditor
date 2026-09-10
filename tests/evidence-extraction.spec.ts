import { expect, test } from "@playwright/test";

import { extractPageEvidence } from "@/lib/audit/extract-page";

test("classifies pricing and signup links without treating every plans link as pricing", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>Acme | Workflow automation</title>
        <meta name="description" content="Automate work without the busywork.">
        <link rel="canonical" href="https://acme.example/">
      </head>
      <body>
        <header>
          <nav>
            <a href="https://acme.example/health-plans">Health Plans</a>
            <a href="https://acme.example/pricing">Pricing</a>
            <a href="https://acme.example/signup">Start free</a>
          </nav>
        </header>
        <main>
          <section>
            <h1>Automate work without the busywork</h1>
            <p>Built for operations teams that need reliable workflows.</p>
            <a href="https://acme.example/signup">Start free</a>
          </section>
        </main>
      </body>
    </html>
  `);

  const evidence = await extractPageEvidence(page);

  expect(evidence.pricingLink?.text).toBe("Pricing");
  expect(evidence.pricingLink?.href).toBe("https://acme.example/pricing");
  expect(evidence.signupOrFreeTrialLink?.text).toBe("Start free");
  expect(evidence.primaryCta?.text).toBe("Start free");
  expect(evidence.h1Headings).toEqual(["Automate work without the busywork"]);
  expect(evidence.metaDescription).toBe("Automate work without the busywork.");
  expect(evidence.discoveredLinks.map((link) => link.text)).toContain("Pricing");
  expect(evidence.robotsMeta).toBeNull();
});
