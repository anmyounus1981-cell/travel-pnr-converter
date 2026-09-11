# PNR Converter — Tasks & Sprints

## Sprint 1: Database + Parser Engine (v1 functional ✅)
**Goal**: Paste raw GDS text → get structured parsed segments back, saved to DB.
- [ ] Create Supabase tables (conversions, passengers, flight_segments, hotel_segments, audit_logs) + seed demo rows
- [ ] Build `lib/data/conversions.ts` — all CRUD for conversions + segments
- [ ] Build `lib/parser/rule-parser.ts` — regex parser for Sabre/Galileo/Amadeus formats
- [ ] Build Converter page UI: textarea input + fare/baggage/rule fields + Convert button
- [ ] Convert action: parse raw text → structured segments → save to DB → show in editable form
- [ ] Handle empty input, parse failure, partial parse states
- **DoD**: Paste a raw Amadeus PNR, click Convert, see passengers + flights + hotels parsed and saved, editable on screen.

## Sprint 2: WhatsApp + PDF Output
**Goal**: Generate Bengali WhatsApp quote and PDF itinerary from parsed data.
- [ ] Build `lib/whatsapp/formatter.ts` — Bengali WhatsApp template with flights, fare, baggage, rules
- [ ] Build `lib/pdf/generator.ts` — structured PDF itinerary with flight table, hotel, fare summary
- [ ] Add Generate WhatsApp button → renders formatted text + copy-to-clipboard
- [ ] Add Generate PDF button → downloads PDF
- [ ] Save generated outputs to conversion record
- **DoD**: From a parsed conversion, click Generate WhatsApp → copy clean Bengali quote; click Generate PDF → download itinerary PDF. Both saved to history.

## Sprint 3: History + Edit + Polish
**Goal**: Full history page, segment editing, all five UI states.
- [ ] Build History page — list past conversions, click to re-view/download
- [ ] Allow editing parsed segments (fix airline, times, names) before generating
- [ ] Handle loading/empty/error/partial/ready states on all screens
- [ ] Responsive sidebar nav (desktop) / hamburger (mobile)
- **DoD**: Open History, see 3+ seeded conversions, open one, re-generate WhatsApp + PDF, edit a segment and re-generate. Empty history shows a clear message.

## Sprint 4: AI Parser + Lock Down
**Goal**: AI-assisted parser for messy text + auth + per-user RLS.
- [ ] Build `lib/ai/ai-parser.ts` — LLM-based fallback for unmatched GDS text
- [ ] Wire AI parser as fallback when rule-parser confidence < 0.7
- [ ] Add per-field source/confidence/review_status tracking
- [ ] Add login/signup (Supabase Auth)
- [ ] Replace permissive RLS with owner-scoped policies (`auth.uid() = user_id`)
- [ ] Audit all actions logged
- **DoD**: Paste an irregular GDS block that rule-parser can't fully parse → AI parser fills gaps → fields show confidence < 1.0 and review_status='unreviewed'. Login required; each agent sees only their own conversions.

## Text Gantt
```
Sprint 1: DB + Parser + Converter UI  ████████████  (v1 functional)
Sprint 2: WhatsApp + PDF output        ████████████
Sprint 3: History + Edit + Polish      ████████████
Sprint 4: AI Parser + Lock Down        ████████████
```