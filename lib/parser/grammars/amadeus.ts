import type { LexedPnr, ParseResult, PassengerRecord, SourceLine } from "@/types/pnr";
import { field, flight, GrammarState, groundGap, passengersOnLine, type SegmentParts } from "../grammar";

// Amadeus element numbers use a space before flight elements, unlike numbered
// name elements (e.g. 1.DOE/JANE). Only open a segment after its full prefix.
const segmentStart = /^\s*(\d+)\s+(?:ARNK\b|[A-Z0-9]{2}\s+\d{1,4}\s+[A-Z]\s+\d{1,2}[A-Z]{3}\b)/i;
const flightBody = /^\s*([A-Z0-9]{2})\s+(\d{1,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+([1-7])\s+([A-Z]{3})([A-Z]{3})\s+([A-Z]{2}\d+)\s+(\d{4})\s+(\d{4})(?:\s+(\d{1,2}[A-Z]{3}))?/i;
const metadata = /^\s*(?:---\s*RLR\b|\d+\s+(?:AP|SSR|OSI|RM|RF|FA|FP|FV|FE|FO)\b|\d+\s+TK\s+(?:TL\d|TL\b|OK\b))/i;
const locatorHeader = /^RP\/\S+(?:\s+.*)?\s+([A-Z0-9]{6})\s*$/i;
const namePrefix = /(?:^|\s)(\d+)\.(?=[A-Z][A-Z '-]*\/)/gi;

function namesOnLine(line: SourceLine): PassengerRecord[] {
  const starts = [...line.raw.matchAll(namePrefix)];
  if (!starts.length) return passengersOnLine(line);
  return starts.map((start, index) => {
    const end = starts[index + 1]?.index ?? line.raw.length;
    const name = line.raw.slice(start.index + start[0].length, end)
      .replace(/\s+(?:MR|MRS|MS|MISS|MSTR|MASTER)\b\s*$/i, "")
      .replace("/", " ").replace(/\s+/g, " ").trim();
    return { kind: "passenger", sequence: Number(start[1]), name: field(name || null, line.span),
      type: field(null, line.span, "unverified", ["PASSENGER_TYPE_UNVERIFIED"]), source: line.span };
  });
}

export function parseAmadeus(input: LexedPnr): ParseResult {
  const state = new GrammarState(input, "amadeus");
  let pending: { number: string; lines: SourceLine[] } | null = null;
  let reference: string | null = null;
  let referenceLine: SourceLine | undefined;

  const flush = () => {
    if (!pending) return;
    const { number, lines } = pending;
    const first = lines[0], last = lines[lines.length - 1];
    const body = lines.map(line => line.raw).join(" ").replace(/^\s*\d+\s+/, "");
    if (/^ARNK\b/i.test(body)) {
      state.itinerary.push(groundGap(number, first, state.nextSequence()));
    } else {
      const match = body.match(flightBody);
      if (!match) {
        lines.forEach(line => state.unparsed(line, "UNRECOGNIZED_AMADEUS_SEGMENT"));
        state.diagnostics.push({ code: "UNRECOGNIZED_AMADEUS_SEGMENT", severity: "blocking", source: [first.span], message: "An Amadeus flight segment is incomplete or unsupported; review the original PNR." });
      } else {
        const parts: SegmentParts = {
          segmentNumber: number, airline: match[1].toUpperCase(), flightNumber: match[2], rbd: match[3].toUpperCase(),
          departureDate: match[4].toUpperCase(), origin: match[6].toUpperCase(), destination: match[7].toUpperCase(),
          status: match[8].toUpperCase(), departureTime: match[9], arrivalTime: match[10], arrivalMarker: match[11]?.toUpperCase() ?? null,
        };
        state.itinerary.push(flight(parts, first, last, state.nextSequence(), state.diagnostics));
      }
    }
    pending = null;
  };

  for (const line of input.lines) {
    const raw = line.raw.trim();
    if (!raw) continue;
    if (/^RP\//i.test(raw)) {
      flush();
      const header = raw.match(locatorHeader);
      if (header) { reference = header[1].toUpperCase(); referenceLine = line; }
      else state.diagnostics.push({ code: "LOCATOR_UNVERIFIED", severity: "review", source: [line.span], message: "Record locator is missing or unverified in the Amadeus header." });
      continue;
    }
    const people = namesOnLine(line);
    if (people.length) { flush(); state.passengers.push(...people); continue; }
    if (metadata.test(raw)) { flush(); continue; }
    const start = raw.match(segmentStart);
    if (start) { flush(); pending = { number: start[1], lines: [line] }; continue; }
    if (pending && /^\d{4}\s+(?:\d{1,2}[A-Z]{3}\b|(?:E|[A-Z]{2}\/))/i.test(raw)) {
      pending.lines.push(line);
      if (pending.lines.length > 4) {
        flush();
        state.diagnostics.push({ code: "SEGMENT_TOO_LONG", severity: "blocking", source: [line.span], message: "Amadeus flight segment exceeded four physical lines; review the source." });
      }
      continue;
    }
    flush();
    state.unparsed(line);
  }
  flush();
  return state.finish(reference, referenceLine?.span);
}
