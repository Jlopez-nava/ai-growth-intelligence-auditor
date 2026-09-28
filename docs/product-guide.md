# SubGrowth Digital: current product guide

Updated 2026-09-27. This guide describes the full local application. The public GitHub source distribution contains the website and competitor-audit engine, not the protected lifecycle integration. Screenshots of the latter document real local UI, not a feature available by cloning the public repository.

## Two ways to audit

**Website intelligence:** enter a public company URL to collect a bounded page sample, inspect messaging and conversion paths, collect screenshots, and generate evidence-backed recommendations and competitor research. Download the result as structured JSON. AI analysis requires a configured server-side OpenAI key; basic evidence collection can run without it.

**Lifecycle intelligence:** create or select a company audit, then either upload historical email screenshots or capture new messages through the configured Gmail research mailbox. Review the overall score, open the email timeline, inspect detailed recommendations, and export a concise executive PDF. This subsystem requires server-side storage and authentication configuration; AI extraction and grading require the analysis provider.

## Upload and review emails

1. Choose the correct **Company audit**, or select **New audit** and enter its company name and website. Storage infrastructure is not the audited company: an upload belongs to the company selected here.
2. Select **Upload emails**. Drop several images to create separate email cards. For a long email, use **Long email? Add multiple screenshots** to keep its images together.
3. Confirm the actual received date/time for each email. Add subject or sender context if useful. The app cannot recover invisible content or reliable historical timing from a cropped screenshot alone.
4. Select **Scan and grade emails**. Successful items are saved; items that need attention remain available to correct and retry. The app reports duplicates separately.
5. Use the graded-email link or **Emails** tab to find results. Expand **View email & findings** to inspect the evidence and individual analysis.
6. Review **Overview** for the score and top priorities, **Detailed analysis** for the supporting rationale, and **Export PDF** for the executive handoff.

Limits: eight emails per batch; five images per email; PNG, JPEG, or WebP; 10 MB per image, 30 MB per email, 60 MB per batch. Screenshots are stored privately and sent to the configured AI model for visible-evidence extraction. Do not upload content you lack permission to process.

## What the analysis tells leadership

- **CEO:** the commercial implications and decisions worth investigating—not a forecast of revenue impact.
- **CMO:** positioning, paid-value communication, and tests that could improve trial conversion and upsell.
- **Lifecycle director:** activation, sequencing, CTA clarity, personalization, adoption, friction, and recovery opportunities.

The analysis includes individual email purpose, stage, CTA, intended action, value proposition, personalization, behavioral relevance, strengths, weaknesses, friction, recommended improvements, and score.

| Lifecycle dimension | Weight |
|---|---:|
| Activation | 25% |
| Personalization | 15% |
| Sequence strategy | 20% |
| Value communication | 15% |
| Conversion | 15% |
| Retention foundation | 10% |

A separate commercial score weights paid-value communication (25%), activation-to-value (20%), product/feature adoption (20%), conversion/upsell (25%), and behavioral targeting (10%). Both scores are weighted assessments of available evidence, not measured business performance.

Observed evidence describes what was captured. Hypotheses describe possible explanations. Recommendations describe changes to test. Missing stages mean **not observed in this sample**, not proof that the company never sends them. Screenshot-only sequences do not establish actual behavioral targeting, deliverability, conversion rates, or financial impact.

## Monitoring and controls

The research session tracks the company, observation period, email count, last message, and analysis status. Optional inbox-monitoring controls expose manual sync, watch renewal, and analysis refresh. Unique aliases and conservative matching help separate companies; ambiguous messages are ignored. Gmail watches require renewal; durable scheduling is not yet integrated.

No account signup happens when an audit is created. Registration is manual and must respect the provider's terms. The tool does not automatically purchase, enter payment details, bypass CAPTCHAs or anti-bot protections, or complete phone verification.

## Current versus planned

Website/CRO, positioning, SEO evidence, competitor research, and the full application's email-based lifecycle assessment are implemented. The seven dimensions shown on the homepage describe the broader direction, not seven fully implemented standalone scores. Deep AEO/GEO evaluation, broader acquisition intelligence, automated in-product onboarding inspection, Firecrawl, and Trigger.dev are not presented as completed integrations.

See [product changes](../CHANGELOG.md) and [current screenshots](screenshots/README.md).
