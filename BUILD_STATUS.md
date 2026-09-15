# Build status

The repository started from a Next.js starter with schema and seed data; there was no previous BUILD_STATUS.md.
The converter now has an editable parser form, conversion persistence, English WhatsApp quote generation, PDF download, and history with edit/delete.
English-only output is enforced by the quote formatter and PDF generator. Existing non-English seed output is replaced by migration 0002_english_seed.sql, which must be applied to the provisioned database.
Live Supabase verification requires the Vercel environment variables locally; this workspace has no linked Vercel CLI or .env.local.
GDS clock values are displayed without an assumed UTC offset. The application does not yet resolve airport time zones or overnight arrival dates; agents must verify these before ticketing.
The rule parser now recognizes the tested wrapped Galileo and Sabre itinerary shapes, including ARNK, HK/HS statuses and explicit arrival-day markers. Those samples omit flight years; inferred years and unmarked overnight arrivals still require agent review.
Galileo segment numbers with a space before the dot are recognized, and an explicit dated vendor time limit anchors otherwise yearless flight dates. The UI prevents saving a flight quote with zero parsed or manually added flights.
Unentered or zero fare is printed as "To be confirmed" rather than BDT 0. Booking class is not interpreted as a verified cabin; newly parsed flights leave cabin unset, and PDF omits the cabin field. PDF omits the HOTELS heading for flight-only PNRs.
