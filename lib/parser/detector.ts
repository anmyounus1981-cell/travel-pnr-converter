import type { DetectionResult, GdsType, LexedPnr, SourceLine, SourceSpan } from "@/types/pnr";

type KnownGds = Exclude<GdsType, "unknown">;
const kinds: readonly KnownGds[] = ["sabre", "galileo", "amadeus"];

/** Score independent structural markers, not generic airline codes or passenger names. */
function signals(line: SourceLine): readonly { gds: KnownGds; weight: number }[] {
  const text = line.raw.trim();
  const found: { gds: KnownGds; weight: number }[] = [];
  if (/\/DC[A-Z0-9]{2}\*|\bTKT\/TIME LIMIT\b|PRICE QUOTE RECORD/i.test(text)) found.push({ gds: "sabre", weight: 5 });
  if (/^\d+\s+[A-Z0-9]{2}\s*\d{1,4}[A-Z]\s+\d{1,2}[A-Z]{3}\s+\d\s+[A-Z]{3}[A-Z]{3}\*?(?:HK|HS|HL|UC)\d/i.test(text)) found.push({ gds: "sabre", weight: 3 });
  if (/FILED FARE DATA EXISTS|VENDOR LOCATOR DATA EXISTS|VENDOR REMARKS/i.test(text)) found.push({ gds: "galileo", weight: 5 });
  if (/^[A-Z0-9]{6}\/\w{2}\s+[A-Z]{3}/i.test(text)) found.push({ gds: "galileo", weight: 5 });
  if (/^\d+\s*\.\s+[A-Z0-9]{2}\s+\d{1,4}\s+[A-Z]\s+\d{1,2}[A-Z]{3}/i.test(text)) found.push({ gds: "galileo", weight: 2 });
  if (/^RP\/[A-Z0-9/]+|^---\s*RLR\b/i.test(text)) found.push({ gds: "amadeus", weight: 6 });
  return found;
}

export function detectGds(input: LexedPnr): DetectionResult {
  const scores = new Map<KnownGds, number>(kinds.map(kind => [kind, 0]));
  const evidence = new Map<KnownGds, SourceSpan[]>(kinds.map(kind => [kind, []]));
  for (const line of input.lines) {
    for (const signal of signals(line)) {
      scores.set(signal.gds, (scores.get(signal.gds) ?? 0) + signal.weight);
      evidence.get(signal.gds)?.push(line.span);
    }
  }
  const candidates = kinds.map(gds => ({ gds, score: scores.get(gds) ?? 0, evidence: evidence.get(gds) ?? [] })).sort((a, b) => b.score - a.score);
  const [best, second] = candidates;
  const ambiguous = second.score > 0 && best.score - second.score < 3;
  const gds: GdsType = best.score === 0 || ambiguous ? "unknown" : best.gds;
  const confidence = gds === "unknown" ? "none" : best.score >= 8 && best.score - second.score >= 5 ? "high" : best.score >= 5 ? "medium" : "low";
  return { gds, confidence, evidence: gds === "unknown" ? candidates.filter(c => c.score > 0).flatMap(c => c.evidence) : best.evidence, candidates, ambiguous };
}
