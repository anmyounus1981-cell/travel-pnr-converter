export type Passenger = { name: string; type: string };
export type Flight = { airline: string; flight_number: string; origin: string; destination: string; departure_at: string; arrival_at: string; cabin: string };
export type Hotel = { hotel_name: string; check_in: string; check_out: string; nights: number; room_type: string };
export type Conversion = { id?: string; raw_text: string; pnr_code: string; gds_type: string; status: string; fare_amount: number; fare_currency: string; baggage_info: string; cancellation_rule: string; reissue_rule: string; whatsapp_output?: string; passengers: Passenger[]; flights: Flight[]; hotels: Hotel[]; created_at?: string };

const months: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
function date(code: string, reference: Date): string {
  const day = Number(code.slice(0, 2)), month = months[code.slice(2, 5).toUpperCase()];
  let year = code.length > 5 ? 2000 + Number(code.slice(5, 7)) : reference.getUTCFullYear();
  if (code.length === 5 && month < reference.getUTCMonth() + 1 - 6) year++;
  return month && day >= 1 && day <= 31 ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
}
function clock(value: string): string { return `${value.slice(0, 2)}:${value.slice(2)}`; }
// GDS paste supplies airport wall-clock times. The existing database column is
// timestamptz and interprets zone-less values as UTC; do not present that
// assumed offset as an airline-confirmed time zone in client documents.
export function displayPnrTime(value: string): string {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : "To be confirmed";
}
export function parsePnr(raw: string, reference = new Date()): Pick<Conversion, "pnr_code" | "gds_type" | "passengers" | "flights" | "hotels"> {
  const passengers: Passenger[] = [], flights: Flight[] = [], hotels: Hotel[] = [];
  const pnr_code = raw.match(/(?:PNR|RECORD LOCATOR|BOOKING REF)\s*[:#-]?\s*([A-Z0-9]{6})/i)?.[1] || "";
  const gds_type = /(?:RP\/|---\s*RLR)/i.test(raw) ? "amadeus" : /(?:\*A|\*R)/.test(raw) ? "sabre" : "unknown";
  for (const line of raw.split(/\r?\n/)) {
    for (const match of line.matchAll(/(?:^|\s)(?:\d+\.)?([A-Z][A-Z '\/-]+\/[A-Z][A-Z '\/-]+)(?=\s|$)/g)) {
      const name = match[1].replace(/\//g, " ").trim();
      if (!passengers.some(p => p.name === name)) passengers.push({ name, type: "adult" });
    }
    for (const match of line.matchAll(/(?:^|\s)\d+\.\s*([A-Z][A-Z .'-]+\s+[A-Z][A-Z .'-]+)(?=\s+\d+\.|$)/g)) {
      const name = match[1].trim();
      if (!passengers.some(p => p.name === name)) passengers.push({ name, type: "adult" });
    }
    const flight = line.match(/(?:^|\s)([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])?\s+(\d{2}[A-Z]{3}(?:\d{2})?)\s+([A-Z]{3})([A-Z]{3})\s+(\d{4})\s+(\d{4})/i)
      || line.match(/(?:^|\s)([A-Z0-9]{2})\s*(\d{1,4})\s+([A-Z])\s+(\d{2}[A-Z]{3}(?:\d{2})?)\s+([A-Z]{3})([A-Z]{3})\s+(\d{4})\s+(\d{4})/i);
    if (flight) {
      const day = date(flight[4], reference);
      if (day) flights.push({ airline: flight[1].toUpperCase(), flight_number: flight[2], origin: flight[5].toUpperCase(), destination: flight[6].toUpperCase(), departure_at: `${day}T${clock(flight[7])}:00`, arrival_at: `${day}T${clock(flight[8])}:00`, cabin: "economy" });
    }
    const hotel = line.match(/(?:HTL|HOTEL)\s+(.+?)\s+(\d{2}[A-Z]{3}(?:\d{2})?)-(\d{2}[A-Z]{3}(?:\d{2})?)(?:\s+(\d+)\s+NIGHTS?)?/i);
    if (hotel) {
      const check_in = date(hotel[2], reference), check_out = date(hotel[3], reference);
      hotels.push({ hotel_name: hotel[1].trim(), check_in, check_out, nights: Number(hotel[4]) || Math.max(0, Math.round((Date.parse(check_out) - Date.parse(check_in)) / 86400000)), room_type: "" });
    }
  }
  return { pnr_code, gds_type, passengers, flights, hotels };
}
export function formatQuote(c: Conversion): string {
  const lines = ["*TRAVEL QUOTE*", c.pnr_code ? `Booking reference: ${c.pnr_code}` : "", "", "*Passengers*",
    ...c.passengers.map(p => `• ${p.name} (${p.type})`), "", "*Flights*",
    ...c.flights.map(f => `• ${f.airline} ${f.flight_number}: ${f.origin} → ${f.destination} | ${displayPnrTime(f.departure_at)} – ${displayPnrTime(f.arrival_at)}`),
    ...(c.hotels.length ? ["", "*Hotels*", ...c.hotels.map(h => `• ${h.hotel_name}: ${h.check_in} to ${h.check_out} (${h.nights} nights)`)] : []),
    "", `*Fare:* ${c.fare_currency} ${Number(c.fare_amount).toLocaleString("en-US")}`,
    `*Baggage:* ${c.baggage_info || "To be confirmed"}`,
    `*Cancellation:* ${c.cancellation_rule || "To be confirmed"}`,
    `*Reissue:* ${c.reissue_rule || "To be confirmed"}`,
    "", "Flight times have no verified time zones. Confirm local times and date changes with the airline before ticketing.",
    "All fare, baggage and rules are subject to confirmation before ticketing."];
  return lines.filter((line, index) => line || lines[index - 1] !== "").join("\n").trim();
}
