import { expect, test } from "@playwright/test";

import { selectCrawlTargets } from "@/lib/audit/select-crawl-targets";
import type { ObservedLink } from "@/lib/audit/types";

const link = (text: string, href: string, placement: ObservedLink["placement"] = "navigation"): ObservedLink => ({
  text,
  href,
  element: "a",
  placement,
});

test("selects a representative same-origin crawl without consequential paths", () => {
  const targets = selectCrawlTargets([
    link("Product", "https://acme.example/product"),
    link("Solutions", "https://acme.example/solutions"),
    link("Pricing", "https://acme.example/pricing?campaign=nav"),
    link("Customers", "https://acme.example/customers"),
    link("Resources", "https://acme.example/resources"),
    link("About", "https://acme.example/about"),
    link("Start free", "https://acme.example/signup"),
    link("Dashboard", "https://app.acme.example/dashboard"),
    link("Health Plans", "https://acme.example/health-plans"),
    link("PDF", "https://acme.example/report.pdf"),
  ], "https://acme.example/", 6);

  expect(targets).toHaveLength(5);
  expect(targets.map((target) => target.category)).toEqual([
    "pricing",
    "product",
    "solutions",
    "customers",
    "resources",
  ]);
  expect(targets.map((target) => target.url)).not.toContain("https://acme.example/signup");
  expect(targets[0].url).toBe("https://acme.example/pricing");
});
