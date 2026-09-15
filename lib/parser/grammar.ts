import type { FlightRecord, GdsType, GroundGapRecord, LexedPnr, ParsedField, ParseDiagnostic, ParseResult, PassengerRecord, SourceLine, SourceSpan, UnparsedRecord } from "@/types/pnr";

export function field<T>(value: T | null, span: SourceSpan, state: ParsedField<T>["state"] = value === null ? "missing" : "extracted", issueCodes: string[] = []): ParsedField<T> {
  return { value, state, evidence: value === null ? [] : [span], issueCodes };
}

export function range(first: SourceLine, last: SourceLine): SourceSpan {
  return { ...first.span, endLine: last.number, endColumn: last.span.endColumn, endOffset: last.span.endOffset };
}

const passengerStart = /(?:^|\s)(\d+)\.(\d+)(?=[A-Z])/g;
const honorific = /\s+(?:MR|MRS|MS|MISS|MSTR|MASTER|DR)\b\s*$/i;

/** Keep each numbered name entry separate even when two appear on one line. */
export function passengersOnLine(line: SourceLine, next?: SourceLine): PassengerRecord[] {
  passengerStart.lastIndex = 0;
  const matches = [...line.raw.matchAll(passengerStart)];
  if (!matches.length) return [];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : line.raw.length;
    let text = line.raw.slice(start, end).trim();
    let last = line;
    if (index === matches.length - 1 && next && /^(?:MR|MRS|MS|MISS|MSTR|MASTER)\b/i.test(next.raw.trim())) {
      text += ` ${next.raw.trim().split(/\s+(?=\d+\.\d+[A-Z])/)[0]}`;
      last = next;
    }
    text = text.replace(honorific, "").replace("/", " ").replace(/\s+/g, " ").trim();
    const span = range(line, last);
    return { kind: "passenger" as const, sequence: Number(match[1]), name: field(text || null, span), type: field(null, span, "unverified", ["PASSENGER_TYPE_UNVERIFIED"]), source: span };
  });
}

export type SegmentParts = Readonly<{
  segmentNumber: string;
  airline: string;
  flightNumber: string;
  rbd: string;
  departureDate: string;
  origin: string;
  destination: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
  arrivalMarker: string | null;
}>;

export function flight(parts: SegmentParts, first: SourceLine, last: SourceLine, sequence: number, diagnostics: ParseDiagnostic[]): FlightRecord {
  const span = range(first, last);
  diagnostics.push({ code: "YEAR_UNVERIFIED", severity: "review", source: [span], message: "Flight year is missing from the source; confirm dates before ticketing." });
  diagnostics.push({ code: "TIMEZONE_UNVERIFIED", severity: "review", source: [span], message: "Flight time zones are not verified; confirm local times before ticketing." });
  diagnostics.push({ code: "CABIN_UNVERIFIED", severity: "review", source: [span], message: "Booking class alone does not verify cabin; confirm with the airline." });
  const local = (date: string | null, time: string | null, marker: string | null) => ({
    date: field(date, span, date ? "unverified" : "missing", date ? ["YEAR_UNVERIFIED"] : []),
    time: field(time && /^\d{4}$/.test(time) ? `${time.slice(0, 2)}:${time.slice(2)}` : null, span),
    timeZone: field<string>(null, span, "unverified", ["TIMEZONE_UNVERIFIED"]),
    arrivalDayMarker: field(marker, span),
  });
  return {
    kind: "flight", sequence, gdsSegmentNumber: parts.segmentNumber,
    airline: field(parts.airline, span), flightNumber: field(parts.flightNumber, span),
    origin: field(parts.origin, span), destination: field(parts.destination, span),
    status: field(parts.status, span), rbd: field(parts.rbd, span),
    cabin: field(null, span, "unverified", ["CABIN_UNVERIFIED"]),
    departure: local(parts.departureDate, parts.departureTime, null),
    arrival: local(null, parts.arrivalTime, parts.arrivalMarker), source: span,
  };
}

export function groundGap(segmentNumber: string, line: SourceLine, sequence: number): GroundGapRecord {
  return { kind: "ground_gap", sequence, gdsSegmentNumber: segmentNumber, origin: field(null, line.span), destination: field(null, line.span), source: line.span };
}

export class GrammarState {
  readonly passengers: PassengerRecord[] = [];
  readonly itinerary: (FlightRecord | GroundGapRecord | UnparsedRecord)[] = [];
  readonly diagnostics: ParseDiagnostic[] = [];
  private ordinal = 0;
  constructor(readonly input: LexedPnr, readonly gds: GdsType) {}
  nextSequence(): number { return ++this.ordinal; }
  unparsed(line: SourceLine, code = "UNMAPPED_LINE"): void {
    this.itinerary.push({ kind: "unparsed", sequence: this.nextSequence(), raw: line.raw, source: line.span, issueCode: code });
    this.diagnostics.push({ code, severity: "review", source: [line.span], message: "An input line was not mapped to a supported itinerary record; review the source." });
  }
  finish(bookingReference: string | null = null, referenceSpan?: SourceSpan): ParseResult {
    if (!this.passengers.length) this.diagnostics.push({ code: "NO_PASSENGERS", severity: "blocking", source: [], message: "No passenger name was recognized; check the input." });
    if (!this.itinerary.some(record => record.kind === "flight")) this.diagnostics.push({ code: "NO_FLIGHTS", severity: "blocking", source: [], message: "No flight segment was recognized; check the input." });
    const span = referenceSpan ?? this.input.lines[0].span;
    return { schemaVersion: 1, rawLength: this.input.rawLength, gds: field(this.gds, span), bookingReference: field(bookingReference, span), passengers: this.passengers, itinerary: this.itinerary, diagnostics: this.diagnostics, sourceLines: this.input.lines };
  }
}
