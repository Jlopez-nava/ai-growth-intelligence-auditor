export type EvidenceSource = "dom" | "browser";

export type ObservedEvidence<T> = {
  evidenceId: string;
  classification: "directly_observed";
  source: EvidenceSource;
  label: string;
  value: T;
};

export type ObservedLink = {
  text: string;
  href: string | null;
  element: "a" | "button";
  placement: "navigation" | "main" | "footer" | "other";
};

export type ObservedForm = {
  action: string | null;
  method: string;
  fieldTypes: string[];
  submitLabel: string | null;
};

export type AuditObservation = {
  pageTitle: ObservedEvidence<string>;
  metaDescription: ObservedEvidence<string | null>;
  robotsMeta: ObservedEvidence<string | null>;
  canonicalUrl: ObservedEvidence<string | null>;
  language: ObservedEvidence<string | null>;
  h1Headings: ObservedEvidence<string[]>;
  headings: ObservedEvidence<string[]>;
  heroCopy: ObservedEvidence<string[]>;
  primaryCta: ObservedEvidence<ObservedLink | null>;
  secondaryCtas: ObservedEvidence<ObservedLink[]>;
  navigationLinks: ObservedEvidence<ObservedLink[]>;
  pricingLink: ObservedEvidence<ObservedLink | null>;
  signupOrFreeTrialLink: ObservedEvidence<ObservedLink | null>;
  forms: ObservedEvidence<ObservedForm[]>;
  proofStatements: ObservedEvidence<string[]>;
  structuredDataTypes: ObservedEvidence<string[]>;
  linkCounts: ObservedEvidence<{ internal: number; external: number }>;
  screenshot: ObservedEvidence<{ fileName: string; endpoint: string }>;
};

export type AuditPageCategory =
  | "homepage"
  | "product"
  | "solutions"
  | "pricing"
  | "customers"
  | "resources"
  | "company"
  | "other";

export type AuditedPage = {
  pageId: string;
  category: AuditPageCategory;
  requestedUrl: string;
  finalUrl: string;
  capturedAt: string;
  observation: AuditObservation;
};

export type CrawlFailure = { url: string; message: string };
export type CrawlSummary = {
  pageLimit: number;
  discoveredInternalLinks: number;
  selectedUrls: string[];
  crawledPages: number;
  failures: CrawlFailure[];
};

export type AuditDimension = "positioning" | "website_cro" | "seo";
export type FindingPriority = "critical" | "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
export type Effort = "high" | "medium" | "low";

export type DimensionScore = { score: number; rationale: string; evidenceIds: string[] };
export type AuditScores = {
  positioning: DimensionScore;
  websiteCro: DimensionScore;
  seo: DimensionScore;
};

export type AuditHypothesis = {
  id: string;
  classification: "hypothesis";
  dimension: AuditDimension;
  title: string;
  statement: string;
  confidence: Confidence;
  evidenceIds: string[];
};

export type AuditRecommendation = {
  id: string;
  classification: "recommendation";
  dimension: AuditDimension;
  priority: FindingPriority;
  title: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  effort: Effort;
  evidenceIds: string[];
};

export type AnalysisStatus = "completed" | "not_configured" | "failed" | "skipped";
export type AuditReport = {
  analysis: {
    status: AnalysisStatus;
    model: string | null;
    generatedAt: string | null;
    message: string | null;
  };
  executiveSummary: string | null;
  scores: AuditScores | null;
  hypotheses: AuditHypothesis[];
  recommendations: AuditRecommendation[];
};

export type ResearchSource = { sourceId: string; title: string; url: string };
export type SourcedClaim = { text: string; sourceIds: string[] };

export type CompetitorProfile = {
  id: string;
  classification: "externally_researched";
  name: string;
  websiteUrl: string;
  relationship: "direct" | "adjacent" | "category_leader";
  threatLevel: "high" | "medium" | "low";
  whyRelevant: string;
  targetAudience: string;
  positioning: string;
  conversionMotion: string;
  notableStrengths: string[];
  possibleGaps: string[];
  sourceIds: string[];
};

export type PositioningMatrixRow = {
  companyName: string;
  audience: string;
  corePromise: string;
  differentiation: string;
  primaryConversionPath: string;
  sourceIds: string[];
};

export type StrategicWhitespace = {
  id: string;
  classification: "hypothesis";
  title: string;
  statement: string;
  whyItMatters: string;
  confidence: Confidence;
  sourceIds: string[];
};

export type StrategicMove = {
  id: string;
  classification: "recommendation";
  priority: FindingPriority;
  title: string;
  action: string;
  expectedImpact: string;
  sourceIds: string[];
};

export type Battlecard = {
  competitorName: string;
  whenTheyWin: string;
  whenYouWin: string;
  likelyObjection: string;
  responseDirection: string;
  proofNeeded: string;
  sourceIds: string[];
};

export type CompetitiveResearch = {
  research: {
    status: AnalysisStatus;
    model: string | null;
    generatedAt: string | null;
    message: string | null;
  };
  marketCategory: string | null;
  executiveBrief: string | null;
  differentiationClarity: { score: number; rationale: string; sourceIds: string[] } | null;
  competitors: CompetitorProfile[];
  positioningMatrix: PositioningMatrixRow[];
  strategicWhitespace: StrategicWhitespace[];
  founderBrief: {
    keyRisks: SourcedClaim[];
    decisionsToMake: SourcedClaim[];
    ninetyDayMoves: StrategicMove[];
  };
  battlecards: Battlecard[];
  sources: ResearchSource[];
};

export type PersistenceStatus = {
  local: "saved";
};

export type AuditResult = {
  schemaVersion: "3.0";
  auditId: string;
  status: "completed";
  requestedUrl: string;
  finalUrl: string;
  capturedAt: string;
  crawl: CrawlSummary;
  pages: AuditedPage[];
  report: AuditReport;
  competitiveResearch: CompetitiveResearch;
  persistence: PersistenceStatus;
  guardrails: {
    mode: "read_only";
    allowedMethods: ["GET", "HEAD", "OPTIONS"];
    formsSubmitted: false;
    elementsClicked: false;
    accountsCreated: false;
    purchasesMade: false;
  };
};

export type AuditSummary = {
  auditId: string;
  finalUrl: string;
  pageTitle: string;
  capturedAt: string;
  analysisStatus: AnalysisStatus;
  overallScore: number | null;
  screenshotEndpoint: string;
  pageCount: number;
  competitorCount: number;
};

export type ExtractedPage = {
  pageTitle: string;
  metaDescription: string | null;
  robotsMeta: string | null;
  canonicalUrl: string | null;
  language: string | null;
  h1Headings: string[];
  headings: string[];
  heroCopy: string[];
  primaryCta: ObservedLink | null;
  secondaryCtas: ObservedLink[];
  navigationLinks: ObservedLink[];
  discoveredLinks: ObservedLink[];
  pricingLink: ObservedLink | null;
  signupOrFreeTrialLink: ObservedLink | null;
  forms: ObservedForm[];
  proofStatements: string[];
  structuredDataTypes: string[];
  linkCounts: { internal: number; external: number };
};
