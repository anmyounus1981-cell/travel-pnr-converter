import type { LexedPnr, ParseResult } from "@/types/pnr";
import { lexPnr } from "./lexer";
import { detectGds } from "./detector";
import { parseGalileo } from "./galileo";
import { parseSabre } from "./sabre";
import { parseAmadeus } from "./grammars/amadeus";
import { field } from "./grammar";

export function parseStructuredPnr(raw: string): ParseResult {
  const input: LexedPnr = lexPnr(raw);
  const detection = detectGds(input);
  if (detection.gds !== "unknown") {
    const result = detection.gds === "sabre" ? parseSabre(input) : detection.gds === "galileo" ? parseGalileo(input) : parseAmadeus(input);
    return {
      ...result,
      gds: { value: detection.gds, state: detection.confidence === "low" ? "unverified" : "extracted", evidence: detection.evidence, issueCodes: detection.confidence === "low" ? ["GDS_LOW_CONFIDENCE"] : [] },
      diagnostics: detection.confidence === "low" ? [...result.diagnostics, { code: "GDS_LOW_CONFIDENCE", severity: "review", source: detection.evidence, message: "GDS identification has low confidence; confirm the source system." }] : result.diagnostics,
    };
  }
  const code = detection.ambiguous ? "GDS_AMBIGUOUS" : "GDS_UNKNOWN";
  return {
    schemaVersion: 1, rawLength: input.rawLength,
    gds: field(null, input.lines[0].span, "unverified", [code]),
    bookingReference: field(null, input.lines[0].span), passengers: [],
    itinerary: input.lines.filter(line => line.raw.trim()).map((line, index) => ({ kind: "unparsed" as const, sequence: index + 1, raw: line.raw, source: line.span, issueCode: code })),
    diagnostics: [{ code, severity: "blocking", source: detection.evidence, message: "PNR format is unknown or ambiguous; review the original PNR." }],
    sourceLines: input.lines,
  };
}
