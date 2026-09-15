import { NextResponse } from "next/server";
import { deleteConversion, getConversion, listConversions, saveConversion } from "@/lib/data/conversions";
import { formatQuote, parsePnr, type Conversion } from "@/lib/converter";
import { authenticatedAgent } from "@/lib/supabase/auth";
import { unresolvedBlockers } from "@/lib/parser/adapter";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const agent = await authenticatedAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    return NextResponse.json(id ? await getConversion(id, agent.id) : await listConversions(agent.id));
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: String(error).includes("Conversion not found") ? 404 : 500 }); }
}
export async function POST(request: Request) {
  const agent = await authenticatedAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.raw_text || typeof body.raw_text !== "string" || body.raw_text.length > 100000) return NextResponse.json({ error: "Paste valid PNR text first." }, { status: 400 });
    if (body.reviewed_source !== true) return NextResponse.json({ error: "Review and confirm the original PNR before saving." }, { status: 400 });
    const { parserReview, ...parsed } = parsePnr(body.raw_text);
    if (unresolvedBlockers(parserReview).length) return NextResponse.json({ error: "Parser found blocking source discrepancies. Check the original PNR." }, { status: 400 });
    const c: Conversion = {
      id: typeof body.id === "string" ? body.id : undefined, raw_text: body.raw_text,
      pnr_code: typeof body.pnr_code === "string" ? body.pnr_code : parsed.pnr_code,
      gds_type: parserReview.source.gds.value ?? parsed.gds_type, status: "completed",
      fare_amount: Number(body.fare_amount) || 0, fare_currency: typeof body.fare_currency === "string" ? body.fare_currency : "BDT",
      baggage_info: typeof body.baggage_info === "string" ? body.baggage_info : "",
      cancellation_rule: typeof body.cancellation_rule === "string" ? body.cancellation_rule : "",
      reissue_rule: typeof body.reissue_rule === "string" ? body.reissue_rule : "",
      passengers: body.passengers ?? parsed.passengers, flights: body.flights ?? parsed.flights, hotels: body.hotels ?? parsed.hotels,
    };
    if (!Array.isArray(c.passengers) || !Array.isArray(c.flights) || !Array.isArray(c.hotels) || !c.flights.length) return NextResponse.json({ error: "At least one verified flight and valid passenger/flight lists are required." }, { status: 400 });
    if (parserReview.source.gds.value && parserReview.source.gds.value !== "unknown" &&
      (c.passengers.length !== parserReview.passengerCount || c.flights.length !== parserReview.flightCount))
      return NextResponse.json({ error: "Saved passenger or flight counts differ from the source PNR." }, { status: 400 });
    if (parserReview.source.gds.value && parserReview.source.gds.value !== "unknown") {
      const sourceFlights = parserReview.source.itinerary.filter(record => record.kind === "flight");
      if (parserReview.source.passengers.some((passenger, index) => passenger.name.value !== c.passengers[index]?.name) ||
        sourceFlights.some((flight, index) => [flight.airline.value, flight.flightNumber.value, flight.origin.value, flight.destination.value].some((value, field) => value !== [c.flights[index]?.airline, c.flights[index]?.flight_number, c.flights[index]?.origin, c.flights[index]?.destination][field])))
        return NextResponse.json({ error: "Saved names or flight routes differ from the original parser evidence." }, { status: 400 });
    }
    if (c.flights.some(flight => !flight.airline || !flight.flight_number || !flight.origin || !flight.destination ||
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(flight.departure_at) ||
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(flight.arrival_at) ||
      !Number.isFinite(Date.parse(flight.departure_at)) || !Number.isFinite(Date.parse(flight.arrival_at))))
      return NextResponse.json({ error: "Confirm valid local flight dates, times and arrival dates before saving." }, { status: 400 });
    const visible = [c.pnr_code, c.fare_currency, c.baggage_info, c.cancellation_rule, c.reissue_rule,
      ...c.passengers.map(p => p.name), ...c.flights.flatMap(f => [f.airline, f.flight_number, f.origin, f.destination, f.cabin]),
      ...c.hotels.flatMap(h => [h.hotel_name, h.room_type])];
    if (visible.some(value => /[^\x00-\x7F]/.test(String(value || "")))) return NextResponse.json({ error: "Quote fields must use English text only." }, { status: 400 });
    c.whatsapp_output = formatQuote(c);
    return NextResponse.json(await saveConversion(c, agent.id));
  } catch { return NextResponse.json({ error: "Unable to save conversion." }, { status: 500 }); }
}
export async function DELETE(request: Request) {
  const agent = await authenticatedAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing conversion ID." }, { status: 400 });
    await getConversion(id, agent.id);
    await deleteConversion(id, agent.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: String(error).includes("Conversion not found") ? 404 : 500 }); }
}
