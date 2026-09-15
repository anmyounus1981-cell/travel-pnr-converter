import type { LexedPnr, ParseResult, SourceLine } from "@/types/pnr";
import { field, flight, GrammarState, groundGap, passengersOnLine, type SegmentParts } from "./grammar";

const segmentStart = /^\s*(\d+)\s*\.\s*(.*)$/;
const flightBody = /^\s*([A-Z0-9]{2})\s+(\d{1,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s*([A-Z]{3})([A-Z]{3})\s+((?:HK|HS|HL|UC)\d+)\s+(\d{4})(?:\s+|$)(#?\d{4})?/i;
const footer = /^(?:\*\s*FILED FARE|\*\s*VENDOR|VENDOR\s|VRMK-|\d+\.\s*VI\/|\*\s*SERVICE|\*\s*TINS|\*\s*ELECTRONIC)/i;

export function parseGalileo(input: LexedPnr): ParseResult {
  const state = new GrammarState(input, "galileo");
  let pending: { number: string; lines: SourceLine[] } | null = null;
  let reference: string | null = null;
  let referenceLine: SourceLine | undefined;
  let inFooter = false;
  const flush = () => {
    if (!pending) return;
    const { number, lines } = pending;
    const first = lines[0];
    const last = lines[lines.length - 1];
    const body = lines.map(line => line.raw).join(" ").replace(/^\s*\d+\s*\.\s*/, "");
    if (/^\s*ARNK\b/i.test(body)) {
      state.itinerary.push(groundGap(number, first, state.nextSequence()));
    } else {
      const match = body.match(flightBody);
      if (!match) {
        lines.forEach(line => state.unparsed(line, "UNRECOGNIZED_GALILEO_SEGMENT"));
      } else {
        const parts: SegmentParts = {
          segmentNumber: number, airline: match[1].toUpperCase(), flightNumber: match[2], rbd: match[3].toUpperCase(),
          departureDate: match[4].toUpperCase(), origin: match[5].toUpperCase(), destination: match[6].toUpperCase(),
          status: match[7].toUpperCase(), departureTime: match[8], arrivalTime: match[9]?.replace("#", "") ?? "",
          arrivalMarker: match[9]?.startsWith("#") ? "next_day" : null,
        };
        state.itinerary.push(flight(parts, first, last, state.nextSequence(), state.diagnostics));
        if (!match[9]) state.diagnostics.push({ code: "ARRIVAL_TIME_MISSING", severity: "blocking", source: [last.span], message: "Arrival time is missing; check the original segment." });
      }
    }
    pending = null;
  };

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const raw = line.raw.trim();
    if (!raw) continue;
    if (footer.test(raw)) { flush(); inFooter = true; continue; }
    if (inFooter) { state.unparsed(line, "UNMAPPED_METADATA_LINE"); continue; }
    const people = passengersOnLine(line, input.lines[i + 1]);
    if (people.length) { flush(); state.passengers.push(...people); continue; }
    if (/^(?:MR|MRS|MS|MISS|MSTR|MASTER)\b/i.test(raw)) continue;
    if (!reference && /^[A-Z0-9]{6}\/\w{2}\s+[A-Z]{3}/i.test(raw)) {
      reference = raw.slice(0, 6); referenceLine = line; continue;
    }
    const start = line.raw.match(segmentStart);
    if (start && (/^(?:ARNK\b|[A-Z0-9]{2}(?:\s|$))/i.test(start[2].trim()))) {
      flush(); pending = { number: start[1], lines: [line] }; continue;
    }
    if (pending) {
      pending.lines.push(line);
      if (pending.lines.length > 4) { flush(); state.diagnostics.push({ code: "SEGMENT_TOO_LONG", severity: "review", source: [line.span], message: "Wrapped segment exceeded four lines; review the source." }); }
      continue;
    }
    state.unparsed(line);
  }
  flush();
  return state.finish(reference, referenceLine?.span);
}
