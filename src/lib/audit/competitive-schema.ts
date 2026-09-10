import { z } from "zod";

const sourceIds = z.array(z.string().regex(/^source-\d{2,3}$/)).min(1).max(12);
const sourcedClaim = z.object({
  text: z.string().min(1).max(500),
  sourceIds,
});

export const competitiveResearchOutputSchema = z.object({
  marketCategory: z.string().min(1).max(180),
  executiveBrief: z.string().min(1).max(1_500),
  differentiationClarity: z.object({
    score: z.number().int().min(0).max(100),
    rationale: z.string().min(1).max(700),
    sourceIds,
  }),
  competitors: z.array(z.object({
    id: z.string().regex(/^competitor-[a-z0-9-]+$/),
    classification: z.literal("externally_researched"),
    name: z.string().min(1).max(120),
    websiteUrl: z.string().min(1).max(500),
    relationship: z.enum(["direct", "adjacent", "category_leader"]),
    threatLevel: z.enum(["high", "medium", "low"]),
    whyRelevant: z.string().min(1).max(600),
    targetAudience: z.string().min(1).max(300),
    positioning: z.string().min(1).max(500),
    conversionMotion: z.string().min(1).max(300),
    notableStrengths: z.array(z.string().min(1).max(240)).min(1).max(4),
    possibleGaps: z.array(z.string().min(1).max(240)).max(4),
    sourceIds,
  })).min(2).max(5),
  positioningMatrix: z.array(z.object({
    companyName: z.string().min(1).max(120),
    audience: z.string().min(1).max(240),
    corePromise: z.string().min(1).max(300),
    differentiation: z.string().min(1).max(300),
    primaryConversionPath: z.string().min(1).max(180),
    sourceIds,
  })).min(3).max(6),
  strategicWhitespace: z.array(z.object({
    id: z.string().regex(/^whitespace-[a-z0-9-]+$/),
    classification: z.literal("hypothesis"),
    title: z.string().min(1).max(140),
    statement: z.string().min(1).max(500),
    whyItMatters: z.string().min(1).max(500),
    confidence: z.enum(["high", "medium", "low"]),
    sourceIds,
  })).min(1).max(4),
  founderBrief: z.object({
    keyRisks: z.array(sourcedClaim).min(1).max(4),
    decisionsToMake: z.array(sourcedClaim).min(1).max(4),
    ninetyDayMoves: z.array(z.object({
      id: z.string().regex(/^move-[a-z0-9-]+$/),
      classification: z.literal("recommendation"),
      priority: z.enum(["critical", "high", "medium", "low"]),
      title: z.string().min(1).max(140),
      action: z.string().min(1).max(600),
      expectedImpact: z.string().min(1).max(350),
      sourceIds,
    })).min(1).max(5),
  }),
  battlecards: z.array(z.object({
    competitorName: z.string().min(1).max(120),
    whenTheyWin: z.string().min(1).max(350),
    whenYouWin: z.string().min(1).max(350),
    likelyObjection: z.string().min(1).max(350),
    responseDirection: z.string().min(1).max(450),
    proofNeeded: z.string().min(1).max(350),
    sourceIds,
  })).min(1).max(5),
});

export type CompetitiveResearchOutput = z.infer<typeof competitiveResearchOutputSchema>;
