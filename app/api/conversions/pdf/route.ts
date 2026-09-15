import { getConversion } from "@/lib/data/conversions";
import { generatePdf } from "@/lib/pdf/generator";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing conversion ID.", { status: 400 });
  try {
    const pdf = generatePdf(await getConversion(id));
    return new Response(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="itinerary-${id}.pdf"` } });
  } catch (error) { return new Response(String(error), { status: 500 }); }
}
