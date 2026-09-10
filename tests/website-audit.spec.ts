import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { auditArtifactDirectory, runWebsiteAudit } from "@/lib/audit/run-website-audit";

test("visits the submitted website and saves read-only evidence", async () => {
  const submittedUrl = process.env.AUDIT_TARGET_URL ?? "https://example.com";
  const result = await runWebsiteAudit(submittedUrl, {
    analysis: "skip",
    research: "skip",
    pageLimit: 1,
  });
  const artifactDirectory = auditArtifactDirectory(result.auditId);
  const homepage = result.pages[0];

  expect(result.status).toBe("completed");
  expect(homepage.observation.pageTitle.value.length).toBeGreaterThan(0);
  expect(Array.isArray(homepage.observation.navigationLinks.value)).toBe(true);
  expect(homepage.observation.primaryCta.classification).toBe("directly_observed");
  expect(result.schemaVersion).toBe("3.0");
  expect(result.pages).toHaveLength(1);
  expect(result.report.analysis.status).toBe("skipped");
  expect(result.competitiveResearch.research.status).toBe("skipped");
  expect(result.report.hypotheses).toEqual([]);
  expect(result.report.recommendations).toEqual([]);
  expect(homepage.observation.pageTitle.evidenceId).toBe("page-00.page_title");
  expect(result.persistence.local).toBe("saved");
  expect(result.guardrails.formsSubmitted).toBe(false);
  expect(result.guardrails.elementsClicked).toBe(false);

  await expect(
    access(path.join(artifactDirectory, homepage.observation.screenshot.value.fileName)),
  ).resolves.toBeUndefined();
  const savedResult = JSON.parse(
    await readFile(path.join(artifactDirectory, "result.json"), "utf8"),
  );
  expect(savedResult.auditId).toBe(result.auditId);
});
