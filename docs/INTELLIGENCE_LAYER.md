# PNR Converter — Intelligence Layer

## Messy inputs
Raw GDS text varies by system (Sabre, Galileo, Amadeus), agent formatting, line wrapping, and mixed language snippets. Common messiness:
- Inconsistent date/time formats (DDMMMYY, DD/MM/YYYY, etc.)
- Airline codes vs full names (BG vs Biman Bangladesh)
- Missing or extra fields, header/footer noise
- Bengali + English mixed text

## Auto-structure schema
```json
{
  "pnr_code": "ABC123",
  "gds_type": "amadeus",
  "passengers": [{"name": "MOHAMMAD RAHIM", "type": "adult"}],
  "flights": [{
    "airline": "BG",
    "flight_number": "341",
    "origin": "DAC",
    "destination": "DXB",
    "departure_at": "2025-01-15T08:30:00Z",
    "arrival_at": "2025-01-15T11:30:00Z",
    "cabin": "economy"
  }],
  "hotels": [{"name": "Marriott Downtown", "check_in": "2025-01-15", "check_out": "2025-01-20", "nights": 5}]
}
```

## Events to track
- `parse_attempt` — conversion_id, gds_type, field_count, duration_ms
- `parse_correction` — which fields agent manually edited
- `generate_whatsapp` — conversion_id, success
- `generate_pdf` — conversion_id, success

## Scoring rules (rule-based, v1)
- Parse confidence per field = 1.0 if regex matched cleanly, 0.5 if fuzzy, 0.0 if not found
- Overall conversion confidence = avg of field confidences
- Conversions < 0.7 confidence flagged for manual review

## What gets ranked
History list sorted by `created_at` desc. Future: rank by parse confidence to surface low-quality conversions for review.

## v1 vs later
- **v1**: rule-based regex parser + AI parser as fallback for unmatched text; per-field confidence + review_status
- **Later**: learn from corrections to improve regex patterns; auto-suggest baggage/cancellation rules based on route+airline; bulk conversion