# PNR Converter — Architecture

## Stack
Next.js (App Router) + Supabase (Postgres + Storage) + Vercel. PDF generation via server route (pdf-lib or react-pdf). WhatsApp output is formatted text copied to clipboard.

## Key user action flow
1. Agent opens Converter page (no login)
2. Pastes raw GDS text into textarea
3. Fills fare, currency, baggage, cancellation rule, reissue rule fields
4. Clicks **Convert** → server action parses raw text into structured segments
5. Parsed passengers/flights/hotels shown in editable form
6. Agent clicks **Generate WhatsApp Quote** → English text rendered, copy button
7. Agent clicks **Generate PDF** → PDF itinerary downloaded
8. Conversion saved to history with all parsed data

## Responsive nav shell
Two pages: **Converter** (main) and **History**. Left sidebar on desktop, hamburger on mobile. Current section highlighted.

## Build layers
1. **Data layer** — Supabase tables for conversions, segments, passengers, quotes. All DB access via `lib/data/` only.
2. **App logic** — Parser engine (`lib/parser/`), PDF generation (`lib/pdf/`), WhatsApp formatter (`lib/whatsapp/`). Server actions for convert/save.
3. **Smart layer** — AI-assisted parsing (`lib/ai/`) for messy/ambiguous GDS text. Runs on top of rule-based parser; core works without it.

## Why core runs without AI
Rule-based regex parser handles standard Sabre/Galileo/Amadeus PNR formats. AI parser improves accuracy on messy/irregular text but is optional — the rule-based parser + manual edit form is the fallback.

## Repo structure
```
app/
  converter/page.tsx
  history/page.tsx
components/
  PnrInputForm.tsx
  ParsedSegmentsEditor.tsx
  WhatsAppOutput.tsx
  PdfPreview.tsx
  HistoryList.tsx
  Sidebar.tsx
lib/
  data/conversions.ts      # all DB reads/writes
  parser/rule-parser.ts     # regex-based GDS parser
  ai/ai-parser.ts           # AI-assisted parser
  whatsapp/formatter.ts     # English WhatsApp template
  pdf/generator.ts          # PDF itinerary builder
  types.ts
__tests__/
  parser.test.ts
  formatter.test.ts
```

## Module map
| Module | Responsibility | Owns | Build order |
|---|---|---|---|
| data | All DB access | conversions, segments, passengers, quotes | 1st |
| parser | Parse raw GDS text → structured segments | PNR code, flights, hotels, passengers | 2nd |
| whatsapp | Format segments → English WhatsApp text | quote text output | 3rd |
| pdf | Format segments → PDF itinerary | PDF buffer | 3rd |
| converter UI | Input form + parsed editor + outputs | user interaction | 4th |
| history UI | List/review past conversions | saved conversion rows | 5th |