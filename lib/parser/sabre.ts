import type { LexedPnr, ParseResult, SourceLine } from "@/types/pnr";
import { flight, GrammarState, groundGap, passengersOnLine, type SegmentParts } from "./grammar";

const segmentStart = /^\s*(\d+)\s+(ARNK\b|[A-Z0-9]{2}(?:\s*\d{1,4}|$))/i;
const flightBody = /^\s*([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])\s+(\d{1,2}[A-Z]{3})\s+\d\s+([A-Z]{3})([A-Z]{3})\*?((?:HK|HS|HL|UC)\d+)\s+(\d{4})\s+(\d{4})(?:\s+(\d{1,2}[A-Z]{3}))?/i;
const footer = /^(?:TKT\/TIME LIMIT|PHONES|GENERAL FACTS|PRICE QUOTE RECORD|PASSENGER DETAIL|INVOICED|SECURITY INFO|FREQUENT TRAVELER|\d+\.T-|\d+\.SSR|\d+\.OSI)/i;

export function parseSabre(input: LexedPnr): ParseResult {
  const state = new GrammarState(input, "sabre");
  let pending: { number: string; lines: SourceLine[] } | null = null;
  let reference: string | null = null;
  let referenceLine: SourceLine | undefined;
  let inFooter = false;
  const flush = () => {
    if (!pending) return;
    const { number, lines } = pending;
    const first = lines[0], last = lines[lines.length - 1];
    const body = lines.map(line => line.raw).join(" ").replace(/^\s*\d+\s+/, "");
    if (/^ARNK\b/i.test(body)) state.itinerary.push(groundGap(number, first, state.nextSequence()));
    else {
      const match = body.match(flightBody);
      if (!match) lines.forEach(line => state.unparsed(line, "UNRECOGNIZED_SABRE_SEGMENT"));
      else {
        const parts: SegmentParts = {
          segmentNumber: number, airline: match[1].toUpperCase(), flightNumber: match[2], rbd: match[3].toUpperCase(),
          departureDate: match[4].toUpperCase(), origin: match[5].toUpperCase(), destination: match[6].toUpperCase(),
          status: match[7].toUpperCase(), departureTime: match[8], arrivalTime: match[9], arrivalMarker: match[10] ? match[10].toUpperCase() : null,
        };
        state.itinerary.push(flight(parts, first, last, state.nextSequence(), state.diagnostics));
      }
    }
    pending = null;
  };

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i], raw = line.raw.trim();
    if (!raw) continue;
    if (footer.test(raw)) { flush(); inFooter = true; continue; }
    if (inFooter) { state.unparsed(line, "UNMAPPED_METADATA_LINE"); continue; }
    const people = passengersOnLine(line, input.lines[i + 1]);
    if (people.length) { flush(); state.passengers.push(...people); continue; }
    const start = line.raw.match(segmentStart);
    if (start) { flush(); pending = { number: start[1], lines: [line] }; continue; }
    if (pending && /^\/DC[A-Z0-9]{2}\*/i.test(raw)) { pending.lines.push(line); continue; }
    if (!reference && /^[A-Z0-9]{6}$/.test(raw)) { reference = raw; referenceLine = line; continue; }
    if (pending) { flush(); state.unparsed(line); continue; }
    state.unparsed(line);
  }
  flush();
  return state.finish(reference, referenceLine?.span);
}
