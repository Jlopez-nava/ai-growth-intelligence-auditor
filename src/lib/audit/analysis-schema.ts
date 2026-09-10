import { z } from "zod";

const evidenceIds = z.array(z.string().min(1)).min(1).max(12);

const scoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1).max(600),
  evidenceIds,
});

export const auditAnalysisSchema = z.object({
  executiveSummary: z.string().min(1).max(1_200),
  scores: z.object({
    positioning: scoreSchema,
    websiteCro: scoreSchema,
    seo: scoreSchema,
  }),
  hypotheses: z
    .array(
      z.object({
        id: z.string().regex(/^hyp-[a-z0-9-]+$/),
        classification: z.literal("hypothesis"),
        dimension: z.enum(["positioning", "website_cro", "seo"]),
        title: z.string().min(1).max(140),
        statement: z.string().min(1).max(600),
        confidence: z.enum(["high", "medium", "low"]),
        evidenceIds,
      }),
    )
    .max(8),
  recommendations: z
    .array(
      z.object({
        id: z.string().regex(/^rec-[a-z0-9-]+$/),
        classification: z.literal("recommendation"),
        dimension: z.enum(["positioning", "website_cro", "seo"]),
        priority: z.enum(["critical", "high", "medium", "low"]),
        title: z.string().min(1).max(140),
        action: z.string().min(1).max(700),
        rationale: z.string().min(1).max(600),
        expectedImpact: z.string().min(1).max(400),
        effort: z.enum(["high", "medium", "low"]),
        evidenceIds,
      }),
    )
    .min(1)
    .max(10),
});

export type AuditAnalysisOutput = z.infer<typeof auditAnalysisSchema>;
