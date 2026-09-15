import type { Conversion } from "../converter";
const plain = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?").replace(/[\\()]/g, "\\$&");
export function generatePdf(c: Conversion): Uint8Array {
  const rows = ["TRAVEL ITINERARY", c.pnr_code ? `Booking reference: ${c.pnr_code}` : "Booking reference: Pending",
    "PASSENGERS", ...c.passengers.map(p => `${p.name} (${p.type})`),
    "FLIGHTS", ...c.flights.flatMap(f => [`${f.airline} ${f.flight_number} | ${f.origin} to ${f.destination} | ${f.cabin}`, `Departure: ${f.departure_at.replace("T", " ")} | Arrival: ${f.arrival_at.replace("T", " ")}`]),
    "HOTELS", ...c.hotels.map(h => `${h.hotel_name} | ${h.check_in} to ${h.check_out} | ${h.nights} nights`),
    "FARE AND CONDITIONS", `Fare: ${c.fare_currency} ${Number(c.fare_amount).toLocaleString("en-US")}`,
    `Baggage: ${c.baggage_info || "To be confirmed"}`, `Cancellation: ${c.cancellation_rule || "To be confirmed"}`,
    `Reissue: ${c.reissue_rule || "To be confirmed"}`, "Subject to confirmation before ticketing."];
  const pages: string[][] = [];
  for (let i = 0; i < rows.length; i += 38) pages.push(rows.slice(i, i + 38));
  const objects: string[] = [];
  const add = (content: string) => { objects.push(content); return objects.length; };
  const catalog = add(""), pageTree = add(""), font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const references: number[] = [];
  for (const page of pages) {
    const content = page.map((row, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 48 ${790 - i * 19} Td (${plain(row).slice(0, 105)}) Tj ET`).join("\n");
    const stream = add(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`);
    references.push(add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pageTree} 0 R >>`;
  objects[pageTree - 1] = `<< /Type /Pages /Kids [${references.map(n => `${n} 0 R`).join(" ")}] /Count ${references.length} >>`;
  let pdf = "%PDF-1.4\n", offsets = [0];
  objects.forEach((obj, i) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
