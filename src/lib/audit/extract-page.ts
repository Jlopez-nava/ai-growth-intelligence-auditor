import type { Page } from "playwright";

import type { ExtractedPage } from "./types";

export async function extractPageEvidence(page: Page): Promise<ExtractedPage> {
  return page.evaluate(() => {
    type LinkEvidence = {
      text: string;
      href: string | null;
      element: "a" | "button";
      placement: "navigation" | "main" | "footer" | "other";
    };
    type Candidate = LinkEvidence & { visible: boolean; aboveFold: boolean };

    const clean = (value: string | null | undefined) =>
      (value ?? "").replace(/\s+/g, " ").trim();
    const uniqueStrings = (values: string[], limit: number) =>
      Array.from(new Set(values.map(clean).filter(Boolean))).slice(0, limit);
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        Number(style.opacity || 1) > 0 &&
        !element.closest("[hidden], [aria-hidden='true']")
      );
    };
    const placementFor = (element: Element): LinkEvidence["placement"] => {
      if (element.closest("nav, header")) return "navigation";
      if (element.closest("main, [role='main']")) return "main";
      if (element.closest("footer")) return "footer";
      return "other";
    };
    const resolvedHref = (anchor: HTMLAnchorElement) => {
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("javascript:")) return null;
      try {
        return new URL(rawHref, document.baseURI).href;
      } catch {
        return null;
      }
    };

    const candidates: Candidate[] = Array.from(
      document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a, button"),
    )
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const anchor = element.tagName.toLowerCase() === "a" ? (element as HTMLAnchorElement) : null;
        const text = clean(
          element.getAttribute("aria-label") || element.textContent || element.getAttribute("title"),
        );

        return {
          text,
          href: anchor ? resolvedHref(anchor) : null,
          element: anchor ? ("a" as const) : ("button" as const),
          placement: placementFor(element),
          visible: isVisible(element),
          aboveFold: rect.top >= 0 && rect.top < window.innerHeight,
        };
      })
      .filter((candidate) => candidate.text.length > 0 && candidate.text.length <= 160);

    const asLink = ({ text, href, element, placement }: Candidate): LinkEvidence => ({
      text,
      href,
      element,
      placement,
    });
    const uniqueLinks = (links: Candidate[]) => {
      const seen = new Set<string>();
      return links.filter((link) => {
        const key = `${link.text.toLowerCase()}|${link.href ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const ctaText =
      /\b(get started|start(?: for)? free|try(?: it)? free|free trial|sign up|signup|create (?:an )?account|book (?:a )?demo|request (?:a )?demo|schedule (?:a )?demo|contact sales|talk to sales|see (?:it )?in action)\b/i;
    const ctaPath = /\/(?:sign-?up|register|trial|demo|contact-sales|get-started|start-free)(?:[/?#]|$)/i;

    const rankedCtas = candidates
      .filter((candidate) => candidate.visible && candidate.placement !== "footer")
      .map((candidate) => ({
        candidate,
        score:
          (ctaText.test(candidate.text) ? 45 : 0) +
          (candidate.href && ctaPath.test(new URL(candidate.href).pathname) ? 30 : 0) +
          (candidate.placement === "main" ? 15 : 0) +
          (candidate.placement === "navigation" ? 8 : 0) +
          (candidate.element === "button" ? 8 : 0) +
          (candidate.aboveFold ? 6 : 0),
      }))
      .filter(({ score }) => score >= 30)
      .sort((a, b) => b.score - a.score);
    const primaryCta = rankedCtas[0]?.candidate;

    const visibleAnchors = uniqueLinks(
      candidates.filter((candidate) => candidate.visible && candidate.element === "a"),
    );
    const hasPathSegment = (candidate: Candidate, segments: string[]) => {
      if (!candidate.href) return false;
      try {
        const pathname = new URL(candidate.href).pathname.toLowerCase();
        return segments.some((segment) =>
          new RegExp(`/(?:${segment})(?:/|$)`, "i").test(pathname),
        );
      } catch {
        return false;
      }
    };
    const pricingText = /^(?:view |see )?pricing(?:\s*(?:&|and)\s*plans)?$/i;
    const signupText =
      /^(?:sign[ -]?up|register|free trial|try(?: it)? free|start(?: for)? free|create (?:an )?account|get started)$/i;
    const pricingLink = visibleAnchors.find(
      (candidate) => pricingText.test(candidate.text) || hasPathSegment(candidate, ["pricing"]),
    );
    const signupOrFreeTrialLink = visibleAnchors.find(
      (candidate) =>
        signupText.test(candidate.text) ||
        hasPathSegment(candidate, ["sign-?up", "register", "free-trial", "trial", "start-free"]),
    );

    const heroRoot = document.querySelector("main h1, [role='main'] h1")?.closest("section, article, div") ??
      document.querySelector("main, [role='main']") ??
      document.body;
    const heroCopy = uniqueStrings(
      Array.from(heroRoot.querySelectorAll("h1, h2, p"))
        .filter(isVisible)
        .map((element) => clean(element.textContent))
        .filter(
          (text) =>
            text.length >= 8 &&
            text.length <= 500 &&
            !/\b(cookie|tracking technolog(?:y|ies)|privacy choices|consent preferences)\b/i.test(text),
        ),
      12,
    );

    const forms = Array.from(document.querySelectorAll<HTMLFormElement>("form"))
      .filter(isVisible)
      .slice(0, 10)
      .map((form) => {
        const submit = form.querySelector<HTMLButtonElement | HTMLInputElement>(
          "button[type='submit'], input[type='submit'], button:not([type])",
        );
        const action = form.getAttribute("action");
        let resolvedAction: string | null = null;
        if (action) {
          try {
            resolvedAction = new URL(action, document.baseURI).href;
          } catch {
            resolvedAction = null;
          }
        }

        return {
          action: resolvedAction,
          method: (form.getAttribute("method") || "get").toUpperCase(),
          fieldTypes: uniqueStrings(
            Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
              "input, select, textarea",
            )).map((field) =>
              field instanceof HTMLInputElement ? field.type || "text" : field.tagName.toLowerCase(),
            ),
            20,
          ),
          submitLabel: submit
            ? clean(submit.getAttribute("aria-label") || submit.getAttribute("value") || submit.textContent) || null
            : null,
        };
      });

    const proofPattern =
      /\b(trusted by|customers? (?:include|love|trust)|used by|join (?:over )?[\d,]+|rated [\d.]+|g2|capterra|gartner|forrester|case stud(?:y|ies)|customer stor(?:y|ies))\b/i;
    const proofStatements = uniqueStrings(
      Array.from(document.querySelectorAll("main p, main h2, main h3, [role='main'] p, [role='main'] h2, [role='main'] h3"))
        .filter(isVisible)
        .map((element) => clean(element.textContent))
        .filter((text) => text.length <= 300 && proofPattern.test(text)),
      12,
    );

    const structuredDataTypes = uniqueStrings(
      Array.from(document.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']"))
        .flatMap((script) => {
          try {
            const parsed = JSON.parse(script.textContent || "null") as unknown;
            const values = Array.isArray(parsed) ? parsed : [parsed];
            return values.flatMap((value) => {
              if (!value || typeof value !== "object") return [];
              const type = (value as Record<string, unknown>)["@type"];
              return Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
            });
          } catch {
            return [];
          }
        }),
      20,
    );

    const sameOrigin = (href: string | null) => {
      if (!href) return null;
      try {
        return new URL(href).origin === window.location.origin;
      } catch {
        return null;
      }
    };
    const internal = visibleAnchors.filter((link) => sameOrigin(link.href) === true).length;
    const external = visibleAnchors.filter((link) => sameOrigin(link.href) === false).length;
    const canonical = document.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href || null;

    return {
      pageTitle: clean(document.title),
      metaDescription:
        clean(document.querySelector<HTMLMetaElement>("meta[name='description']")?.content) || null,
      robotsMeta:
        clean(document.querySelector<HTMLMetaElement>("meta[name='robots']")?.content) || null,
      canonicalUrl: canonical,
      language: clean(document.documentElement.lang) || null,
      h1Headings: uniqueStrings(
        Array.from(document.querySelectorAll("h1")).filter(isVisible).map((element) => clean(element.textContent)),
        10,
      ),
      headings: uniqueStrings(
        Array.from(document.querySelectorAll("h1, h2, h3"))
          .filter(isVisible)
          .map((element) => clean(element.textContent))
          .filter((text) => text.length <= 300),
        60,
      ),
      heroCopy,
      primaryCta: primaryCta ? asLink(primaryCta) : null,
      secondaryCtas: rankedCtas.slice(1, 7).map(({ candidate }) => asLink(candidate)),
      navigationLinks: visibleAnchors
        .filter((candidate) => candidate.placement === "navigation")
        .slice(0, 40)
        .map(asLink),
      discoveredLinks: visibleAnchors.slice(0, 160).map(asLink),
      pricingLink: pricingLink ? asLink(pricingLink) : null,
      signupOrFreeTrialLink: signupOrFreeTrialLink ? asLink(signupOrFreeTrialLink) : null,
      forms,
      proofStatements,
      structuredDataTypes,
      linkCounts: { internal, external },
    };
  });
}
