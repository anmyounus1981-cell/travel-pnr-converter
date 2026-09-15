import { getConversion } from "@/lib/data/conversions";
import { generatePdf } from "@/lib/pdf/generator";
import { authenticatedAgent } from "@/lib/supabase/auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const agent = await authenticatedAgent();
  if (!agent) return new Response("Unauthorized", { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing conversion ID.", { status: 400 });
  try {
    const pdf = generatePdf(await getConversion(id, agent.id));
    return new Response(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="itinerary-${id}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return new Response(String(error), { status: String(error).includes("Conversion not found") ? 404 : 500 }); }
}
