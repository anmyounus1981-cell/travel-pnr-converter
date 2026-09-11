# PNR Converter — Test Plan

## v1 success scenario (manual)
1. Open app — Converter page loads with no login wall
2. Paste raw Amadeus PNR text (multi-segment DAC→DXB→LHR with 2 passengers + 1 hotel)
3. Enter fare: BDT 85,000, baggage: 30kg checked + 7kg cabin, cancellation: non-refundable, reissue: BDT 5,000
4. Click **Convert**
5. Verify: passengers (2), flight segments (2), hotel segment (1) shown in editable form
6. Click **Generate WhatsApp Quote**
7. Verify: Bengali text renders with airline, route, times, fare, baggage, rules — copy button works
8. Click **Generate PDF**
9. Verify: PDF downloads with flight table + fare summary
10. Go to History — verify conversion appears, can re-open and re-download

## Empty state
1. Open Converter with no text → Convert button disabled or shows error: "Paste PNR text first"
2. Open History with no conversions → shows: "No conversions yet. Create your first quote above."

## Error states
1. Paste garbage text (no PNR pattern) → Convert shows: "Could not detect GDS format. Try the AI parser or paste a cleaner block." Parsed form shows empty segments.
2. Parse finds flights but no passengers → shows partial result with warning: "No passengers detected — add manually."
3. DB write fails → error toast: "Save failed. Please retry." Data not lost from form.

## Partial state
1. Paste text with flights but no hotels → hotel section shows: "No hotels in this PNR." with option to add manually.

## Edit state
1. After parse, edit airline code BG → Biman Bangladesh Airlines, fix departure time
2. Click Generate WhatsApp → reflects edited values

## Test data
Use seed conversions from migration for History page verification.