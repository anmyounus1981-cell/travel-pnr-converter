import type { Conversion } from "@/lib/converter";
import type { ParseDiagnostic, ParseResult } from "@/types/pnr";

type ConversionFields = Pick<Conversion, "pnr_code" | "gds_type" | "passengers" | "flights" | "hotels">;
export type ConversionPreview = Readonly<{
  fields: ConversionFields;
  diagnostics: readonly ParseDiagnostic[];
  /** False until local flight date/year and storage semantics are verified. */
  persistable: boolean;
  passengerCount: number;
  flightCount: number;
}>;
export type ParserReview = Readonly<{
  mode: "structured" | "legacy_fallback";
  diagnostics: readonly ParseDiagnostic[];
  source: ParseResult;
  passengerCount: number;
  flightCount: number;
}>;
export function unresolvedBlockers(review: ParserReview): readonly ParseDiagnostic[] {
  return review.diagnostics.filter(diagnostic => diagnostic.severity === "blocking" &&
    !(review.mode === "legacy_fallback" && (diagnostic.code === "LOCAL_DATE_STORAGE_PENDING" || diagnostic.code === "GDS_UNKNOWN")));
}

/** Preview only. An empty time must never be sent to a timestamptz column. */
export function adaptParseResult(result: ParseResult): ConversionPreview {
  const diagnostics: ParseDiagnostic[] = [...result.diagnostics];
  const flights = result.itinerary.filter(record => record.kind === "flight");
  const missing = result.passengers.filter(passenger => !passenger.name.value);
  for (const passenger of missing) diagnostics.push({ code: "PASSENGER_NAME_MISSING", severity: "blocking", source: [passenger.source], message: "Passenger name is incomplete; review the original line." });
  for (const flight of flights) {
    const fields = [flight.airline, flight.flightNumber, flight.origin, flight.destination, flight.departure.time, flight.arrival.time];
    if (fields.some(field => !field.value)) diagnostics.push({ code: "FLIGHT_FIELD_MISSING", severity: "blocking", source: [flight.source], message: "Required flight field is missing; review the original segment." });
    if (flight.status.value && !/^HK\d+$/.test(flight.status.value)) diagnostics.push({ code: "UNCONFIRMED_FLIGHT_STATUS", severity: "blocking", source: [flight.source], message: "A flight has an unconfirmed status; confirm it before quoting." });
  }
  if (flights.length) diagnostics.push({ code: "LOCAL_DATE_STORAGE_PENDING", severity: "blocking", source: flights.map(flight => flight.source), message: "Flight year, arrival date and local time storage must be confirmed before structured records can be saved." });
  const fields: ConversionFields = {
    pnr_code: result.bookingReference.value ?? "", gds_type: result.gds.value ?? "unknown",
    passengers: result.passengers.map(passenger => ({ name: passenger.name.value ?? "", type: passenger.type.value ?? "" })),
    flights: flights.map(flight => ({ airline: flight.airline.value ?? "", flight_number: flight.flightNumber.value ?? "",
      origin: flight.origin.value ?? "", destination: flight.destination.value ?? "", departure_at: "", arrival_at: "", cabin: "" })),
    hotels: result.itinerary.filter(record => record.kind === "hotel").map(hotel => ({ hotel_name: hotel.name.value ?? "",
      check_in: hotel.checkIn.value ?? "", check_out: hotel.checkOut.value ?? "", nights: hotel.nights.value ?? 0, room_type: hotel.roomType.value ?? "" })),
  };
  return { fields, diagnostics, persistable: !diagnostics.some(d => d.severity === "blocking"), passengerCount: result.passengers.length, flightCount: flights.length };
}
