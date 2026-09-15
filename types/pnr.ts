/** Offsets and columns count UTF-16 code units (JavaScript string indexes).
 * Offsets are zero-based, end-exclusive; physical lines/columns are one-based,
 * with endColumn exclusive. Newline characters are excluded from line spans. */
export type SourceSpan = Readonly<{
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  startOffset: number;
  endOffset: number;
}>;

export type TokenKind = "word" | "number" | "symbol";
export type PnrToken = Readonly<{ kind: TokenKind; value: string; span: SourceSpan }>;
export type SourceLine = Readonly<{
  number: number;
  raw: string;
  newline: "\r\n" | "\n" | "\r" | "";
  span: SourceSpan;
  tokens: readonly PnrToken[];
}>;
export type LexedPnr = Readonly<{
  lines: readonly SourceLine[];
  tokens: readonly PnrToken[];
  rawLength: number;
}>;

export type GdsType = "sabre" | "galileo" | "amadeus" | "unknown";
export type PassengerType = "adult" | "child" | "infant";
export type CabinType = "first" | "business" | "premium_economy" | "economy";
export type FieldState = "extracted" | "inferred" | "unverified" | "missing" | "corrected";
export type IssueSeverity = "info" | "review" | "blocking";
/** A null field never receives a fabricated default. Inferred values require review. */
export type ParsedField<T> = Readonly<{
  value: T | null;
  state: FieldState;
  evidence: readonly SourceSpan[];
  issueCodes: readonly string[];
}>;
export type LocalFlightTime = Readonly<{
  date: ParsedField<string>;     // local YYYY-MM-DD; missing year may be inferred
  time: ParsedField<string>;     // local HH:mm as displayed by the GDS
  timeZone: ParsedField<string>; // null unless confirmed by an authoritative source
  arrivalDayMarker: ParsedField<string>;
}>;
export type PassengerRecord = Readonly<{
  kind: "passenger";
  sequence: number;
  name: ParsedField<string>;
  type: ParsedField<PassengerType>;
  source: SourceSpan;
}>;
export type FlightRecord = Readonly<{
  kind: "flight";
  sequence: number;
  gdsSegmentNumber: string | null;
  airline: ParsedField<string>;
  flightNumber: ParsedField<string>;
  origin: ParsedField<string>;
  destination: ParsedField<string>;
  status: ParsedField<string>; // e.g. HK2, HS1; retain the original code
  rbd: ParsedField<string>;    // reservation booking designator, not a cabin
  cabin: ParsedField<CabinType>;
  departure: LocalFlightTime;
  arrival: LocalFlightTime;
  source: SourceSpan;
}>;
export type GroundGapRecord = Readonly<{
  kind: "ground_gap";
  sequence: number;
  gdsSegmentNumber: string | null;
  origin: ParsedField<string>;
  destination: ParsedField<string>;
  source: SourceSpan;
}>;
export type HotelRecord = Readonly<{
  kind: "hotel";
  sequence: number;
  name: ParsedField<string>;
  checkIn: ParsedField<string>;
  checkOut: ParsedField<string>;
  nights: ParsedField<number>;
  roomType: ParsedField<string>;
  source: SourceSpan;
}>;
export type UnparsedRecord = Readonly<{
  kind: "unparsed";
  sequence: number;
  raw: string;
  source: SourceSpan;
  issueCode: string;
}>;
export type ItineraryRecord = FlightRecord | GroundGapRecord | HotelRecord | UnparsedRecord;
export type ParseDiagnostic = Readonly<{
  code: string;
  severity: IssueSeverity;
  source: readonly SourceSpan[];
  message: string; // English-only user-facing message
}>;
export type ParseResult = Readonly<{
  schemaVersion: 1;
  rawLength: number;
  gds: ParsedField<GdsType>;
  bookingReference: ParsedField<string>;
  passengers: readonly PassengerRecord[];
  itinerary: readonly ItineraryRecord[];
  diagnostics: readonly ParseDiagnostic[];
  sourceLines: readonly SourceLine[];
}>;

/** Golden source ranges are entered independently from the parser result. */
export type FixtureSource = Readonly<{
  startLine: number;
  endLine: number;
  excerpt: string;
}>;
export type PnrFixture = Readonly<{
  id: string;
  gds: Exclude<GdsType, "unknown">;
  raw: string;
  expected: Readonly<{
    passengerCount: number;
    flightCount: number;
    groundGapCount: number;
    passengers: readonly Readonly<{ name: string; source: FixtureSource }>[];
    flights: readonly Readonly<{
      segmentNumber: string;
      airline: string;
      flightNumber: string;
      origin: string;
      destination: string;
      status: string;
      rbd: string;
      source: FixtureSource;
    }>[];
    groundGaps: readonly Readonly<{ segmentNumber: string; source: FixtureSource }>[];
  }>;
}>;
