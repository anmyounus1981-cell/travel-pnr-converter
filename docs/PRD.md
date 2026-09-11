# PNR Converter — PRD

## Problem
Travel agents paste raw Sabre/Galileo/Amadeus PNR text and manually reformat it into client quotes — 10–15 minutes per quote, 15+ hours/week wasted per agent.

## Target user
Travel agency sales managers, reservation agents, and B2B corporate travel account officers (internal team, not multi-tenant SaaS).

## Core objects
- **PNR Record** — raw GDS text + parsed PNR code, passenger list, booking status.
- **Flight Segment** — airline, flight number, origin, destination, departure, arrival, layover duration.
- **Hotel Segment** — hotel name, check-in, check-out, nights, room type.
- **Quote** — fare amount + currency, baggage allowance, cancellation rule, reissue rule, WhatsApp text output, PDF output.
- **Conversion** — one run: raw text in, formatted WhatsApp + PDF out.

## MVP (v1) checklist
- [ ] Paste raw GDS PNR text into a textarea
- [ ] Enter fare, baggage choice, cancellation/reissue rules alongside
- [ ] Auto-parse passengers, flights, hotels from raw text
- [ ] Generate Bengali WhatsApp-formatted quote (copyable)
- [ ] Generate downloadable PDF itinerary
- [ ] Save conversions to history, re-view and re-download
- [ ] Edit parsed segments before generating output

## Non-goals (v1)
- Direct GDS API integration (Sabre/Galileo/Amadeus live connections)
- Multi-user auth / per-agent login
- Payment processing or invoicing
- Client portal or customer-facing site
- Multi-language beyond Bengali + English

## Success criteria
A sales agent pastes a raw Amadeus PNR block, enters fare (BDT 85,000) + 30kg baggage + standard cancellation rules, clicks Convert, and within seconds copies a clean Bengali WhatsApp quote and downloads a structured PDF itinerary — zero manual editing. Repeats 20× per day without formatting errors.