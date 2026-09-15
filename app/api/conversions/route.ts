import { NextResponse } from "next/server";
import { deleteConversion, getConversion, listConversions, saveConversion } from "@/lib/data/conversions";
import { formatQuote, parsePnr, type Conversion } from "@/lib/converter";
import { authenticatedAgent } from "@/lib/supabase/auth";
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
    const parsed = !body.passengers && !body.flights && !body.hotels ? parsePnr(body.raw_text) : {};
    const c: Conversion = { ...body, ...parsed, status: "completed", fare_amount: Number(body.fare_amount) || 0 };
    const visible = [c.pnr_code, c.fare_currency, c.baggage_info, c.cancellation_rule, c.reissue_rule,
      ...c.passengers.map(p => p.name), ...c.flights.flatMap(f => [f.airline, f.flight_number, f.origin, f.destination, f.cabin]),
      ...c.hotels.flatMap(h => [h.hotel_name, h.room_type])];
    if (visible.some(value => /[^\x00-\x7F]/.test(String(value || "")))) return NextResponse.json({ error: "Quote fields must use English text only." }, { status: 400 });
    c.whatsapp_output = formatQuote(c);
    return NextResponse.json(await saveConversion(c, agent.id));
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
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
