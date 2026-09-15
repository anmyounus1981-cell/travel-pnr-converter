import type { ParserReview } from "@/lib/parser/adapter";

export default function ParserDiagnostics({ review }: { review: ParserReview | null }) {
  if (!review) return null;
  const flights = review.source.itinerary.filter(record => record.kind === "flight");
  return <section aria-label="Parser review" className="space-y-3 rounded border border-amber-300 bg-amber-50 p-4">
    <h2 className="text-lg font-semibold">PNR source review</h2>
    <p>Detected: {review.source.gds.value ?? "Unknown"} · {review.mode === "legacy_fallback" ? "Legacy conversion preview" : "Structured preview"} · {review.passengerCount} passengers · {review.flightCount} flights</p>
    {review.mode === "legacy_fallback" && <p>Displayed flight dates came from the older parser. Verify every year, local time and arrival date against the original PNR.</p>}
    <ul className="space-y-1">{review.diagnostics.map((diagnostic, index) => <li key={`${diagnostic.code}-${index}`} className={diagnostic.severity === "blocking" ? "text-red-800" : "text-amber-900"}>
      <strong>{diagnostic.severity.toUpperCase()} · {diagnostic.code}</strong>: {diagnostic.message}
      {diagnostic.source.length > 0 && <span> (lines {diagnostic.source.map(span => span.startLine === span.endLine ? `${span.startLine}` : `${span.startLine}–${span.endLine}`).join(", ")})</span>}
    </li>)}</ul>
    {review.source.passengers.some(passenger => passenger.type.value === null) && <p>Passenger type: Unknown until verified against the original PNR.</p>}
    <div className="space-y-1">{flights.map((flight, index) => <p key={index} className="rounded bg-white p-2 text-sm">
      Line {flight.source.startLine}{flight.source.endLine !== flight.source.startLine ? `–${flight.source.endLine}` : ""}: {flight.airline.value ?? "Unknown airline"} {flight.flightNumber.value ?? "?"} · status {flight.status.value ?? "Unknown"} · RBD {flight.rbd.value ?? "Unknown"} · cabin {flight.cabin.value ?? "Unknown (unverified)"}
    </p>)}</div>
  </section>;
}
