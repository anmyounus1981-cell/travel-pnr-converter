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
function addDays(day: string, count: number): string {
  const result = new Date(`${day}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}
function arrivalDay(departure: string, explicit: string | undefined, nextDay: boolean): string {
  if (explicit) {
    return date(explicit, new Date(`${departure}T00:00:00Z`));
  }
  return nextDay ? addDays(departure, 1) : departure;
}
// GDS paste supplies airport wall-clock times. The existing database column is
// timestamptz and interprets zone-less values as UTC; do not present that
// assumed offset as an airline-confirmed time zone in client documents.
export function displayPnrTime(value: string): string {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : "To be confirmed";
}
export function formatFare(c: Pick<Conversion, "fare_amount" | "fare_currency">): string {
  const amount = Number(c.fare_amount);
  return Number.isFinite(amount) && amount > 0 ? `${c.fare_currency} ${amount.toLocaleString("en-US")}` : "To be confirmed";
}
export function parsePnr(raw: string, reference = new Date()): Pick<Conversion, "pnr_code" | "gds_type" | "passengers" | "flights" | "hotels"> {
  const passengers: Passenger[] = [], flights: Flight[] = [], hotels: Hotel[] = [];
  const normalized = raw.replace(/\s+/g, " ").trim();
  // A Galileo vendor time limit can provide the year missing from flight lines.
  const datedTimeLimit = raw.match(/TTL FOR AUTO CANX FIXED FOR\s+(\d{2}[A-Z]{3}\d{2})/i)?.[1];
  const timeLimitDay = datedTimeLimit && date(datedTimeLimit, reference);
  const travelReference = timeLimitDay ? new Date(`${timeLimitDay}T00:00:00Z`) : reference;
  const pnr_code = raw.match(/(?:PNR|RECORD LOCATOR|BOOKING REF)\s*[:#-]?\s*([A-Z0-9]{6})/i)?.[1]
    || raw.match(/^\s*([A-Z0-9]{6})\/[A-Z]{2}\b/m)?.[1]
    || raw.match(/^\s*([A-Z0-9]{6})\s*$/m)?.[1] || "";
  const gds_type = /(?:RP\/|---\s*RLR)/i.test(raw) ? "amadeus"
    : /\/DC[A-Z0-9]{2}\*|TKT\/TIME LIMIT|PRICE QUOTE RECORD/i.test(raw) ? "sabre"
    : /FILED FARE DATA EXISTS|VENDOR LOCATOR DATA EXISTS|^\s*[A-Z0-9]{6}\/[A-Z]{2}\s+[A-Z]{3}/im.test(raw) ? "galileo" : "unknown";
  // Numbered GDS name entries may wrap, contain spaces, and end in a title.
  for (const match of normalized.matchAll(/(?:^|\s)\d+\.\d+\s*([A-Z][A-Z '-]*\/[A-Z][A-Z '-]*?)(?=\s+\d+\.\d+|\s+\d+\s*\.?\s*[A-Z0-9]{2}\s*\d|$)/g)) {
    const name = match[1].replace(/\s+(?:MR|MRS|MS|MISS|MSTR|MASTER)$/, "").replace(/\//g, " ").trim();
    if (!passengers.some(p => p.name === name)) passengers.push({ name, type: "adult" });
  }
  // The weekday and HK/HS status precede the clocks in Sabre; Galileo can
  // join the date to the airports and wrap its arrival clock onto another line.
  const segments = /(?:^|\s)\d+\s*\.?\s*([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])?\s+(\d{2}[A-Z]{3}(?:\d{2})?)\s*(?:[1-7]\s+)?([A-Z]{3})([A-Z]{3})\*?\s*(?:HK|HS|HL|NN|RR|TK)\d+\s+(\d{4})\s+(#?)(\d{4})(?:\s+(\d{2}[A-Z]{3})(?:\s+[1-7])?)?/gi;
  for (const match of normalized.matchAll(segments)) {
    const departure = date(match[4], travelReference);
    if (!departure || !/^(?:[01]\d|2[0-3])[0-5]\d$/.test(match[7]) || !/^(?:[01]\d|2[0-3])[0-5]\d$/.test(match[9])) continue;
    const arrival = arrivalDay(departure, match[10], match[8] === "#");
    flights.push({ airline: match[1].toUpperCase(), flight_number: match[2], origin: match[5].toUpperCase(), destination: match[6].toUpperCase(), departure_at: `${departure}T${clock(match[7])}:00`, arrival_at: `${arrival}T${clock(match[9])}:00`, cabin: "" });
  }
  for (const line of raw.split(/\r?\n/)) {
    for (const match of line.matchAll(/(?:^|\s)\d+\.\s*([A-Z][A-Z .'-]+\s+[A-Z][A-Z .'-]+)(?=\s+\d+\.|$)/g)) {
      const name = match[1].trim();
      if (!passengers.some(p => p.name === name)) passengers.push({ name, type: "adult" });
    }
    const flight = line.match(/(?:^|\s)([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])?\s+(\d{2}[A-Z]{3}(?:\d{2})?)\s+([A-Z]{3})([A-Z]{3})\s+(\d{4})\s+(\d{4})/i);
    if (flight) {
      const day = date(flight[4], travelReference);
      if (day && !flights.some(f => f.airline === flight[1].toUpperCase() && f.flight_number === flight[2] && f.departure_at === `${day}T${clock(flight[7])}:00`)) flights.push({ airline: flight[1].toUpperCase(), flight_number: flight[2], origin: flight[5].toUpperCase(), destination: flight[6].toUpperCase(), departure_at: `${day}T${clock(flight[7])}:00`, arrival_at: `${day}T${clock(flight[8])}:00`, cabin: "" });
    }
    const hotel = line.match(/(?:HTL|HOTEL)\s+(.+?)\s+(\d{2}[A-Z]{3}(?:\d{2})?)-(\d{2}[A-Z]{3}(?:\d{2})?)(?:\s+(\d+)\s+NIGHTS?)?/i);
    if (hotel) {
      const check_in = date(hotel[2], travelReference), check_out = date(hotel[3], travelReference);
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
    "", `*Fare:* ${formatFare(c)}`,
    `*Baggage:* ${c.baggage_info || "To be confirmed"}`,
    `*Cancellation:* ${c.cancellation_rule || "To be confirmed"}`,
    `*Reissue:* ${c.reissue_rule || "To be confirmed"}`,
    "", "Flight dates and time zones are unverified. Confirm local dates, times and year with the airline before ticketing.",
    "All fare, baggage and rules are subject to confirmation before ticketing."];
  return lines.filter((line, index) => line || lines[index - 1] !== "").join("\n").trim();
}
