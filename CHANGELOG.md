# Product changelog

## 2026-09-27 — Current-product documentation snapshot

This is a consolidated record of the full SubGrowth Digital tool as inspected on this date, not a claim that every feature shipped today. The public GitHub repository contains the website-audit engine; protected lifecycle features described below are implemented in the full local application and are not included in the public source distribution.

### Website and competitive intelligence

- Expanded homepage inspection into bounded multi-page evidence collection: six pages by default, with an eight-page upper limit.
- Capture titles, navigation, primary CTAs, pricing and signup links, headings, proof points, forms, and SEO signals alongside page screenshots and structured JSON.
- Added evidence-linked AI findings, scores, hypotheses, and prioritized marketing recommendations.
- Added source-backed competitor research with profiles, a positioning matrix, strategic-whitespace hypotheses, leadership decisions, 90-day actions, and battlecard starters.
- Added optional server-side Supabase persistence and private screenshot storage in the full application.

### Lifecycle research and ingestion — full application

- Added protected company audits, trial-account identities, observation periods, and chronological email sequences.
- Connected a controlled research mailbox through read-only Gmail OAuth, with manual inbox checks and authenticated Pub/Sub notifications.
- Added unique research aliases, conservative sender-domain matching, ignored unrelated/ambiguous messages, and provider-message deduplication.
- Store sender, domain, subject, timestamp, text/HTML content, and extracted links/CTAs.
- Added per-email classification, analysis status, sequence reconstruction, and weighted lifecycle scores.

### Historical email uploads — full application

- Added screenshot extraction and grading without waiting for new emails to arrive.
- Batch upload up to eight emails, including grouped screenshots for long messages.
- Support PNG, JPEG, and WebP: five screenshots per email, 10 MB per image, 30 MB per email, and 60 MB per batch.
- Added thumbnails, editable received timestamps, optional sender/subject context, individual outcomes, duplicate handling, and retryable failures.
- Made the destination company explicit and locked company switching while a queue is active.
- Preserve failed drafts after partial success and link directly to graded emails in the timeline.
- Store images privately; extract visible evidence without opening links or following instructions in images.

### Analysis and executive reporting — full application

- Added CEO, CMO, and lifecycle marketing director decision briefs.
- Focused freemium/trial analysis on communicating paid benefits, activation, feature adoption, conversion, and upsell.
- Added a separate free-to-paid readiness score alongside the general lifecycle score.
- Added growth, conversion, upsell, and product/feature-adoption improvement opportunities, grounded in captured evidence.
- Added score confidence/context and missing-stage observations; incomplete samples must not be presented as a complete lifecycle strategy.
- Added safe email previews and private screenshot previews.
- Added a concise, branded executive PDF export.
- Maintain explicit observed evidence, hypothesis, and recommendation categories. No invented conversion rates, behavioral analytics, revenue, or financial impact.

### Brand and workspace redesign — full application

- Applied SubGrowth Digital identity, forest/sage/sand/terracotta colors, and Plus Jakarta Sans across the interface and report styling.
- Replaced the long, form-heavy lifecycle page with Overview, Emails, and Detailed analysis views.
- Added a compact company switcher, New audit, Upload emails, and Export PDF actions.
- Reduced initial setup to company name and website; moved research settings and monitoring controls behind disclosure panels.
- Surface the overall score and three priority recommendations first; keep deeper evidence and analysis available on demand.
- Added responsive layouts and improved queue state preservation and screenshot thumbnail handling.

### Documentation in this update

- Refreshed product documentation and captured four current interface images: website entry, lifecycle setup, batch-upload entry, and mobile setup.
- Images omit saved audit history and private reports; the upload destination is masked.
- Clarified the distinction between the public source distribution and the full local product.

### Still outside the implemented scope

- Automatic account registration, purchases, payment entry, CAPTCHA/anti-bot bypass, and automated phone verification are not enabled.
- Browser Use remains a separate optional companion, not part of the normal audit request path.
- Firecrawl, Trigger.dev orchestration, scheduled Gmail-watch renewal, and a complete seven-dimension scoring system remain future work.

See the [current-product guide](docs/product-guide.md) and [screenshot gallery](docs/screenshots/README.md).
