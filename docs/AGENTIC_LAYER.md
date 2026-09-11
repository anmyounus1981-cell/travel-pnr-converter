# PNR Converter — Agentic Layer

## Draftable actions (auto, risk: low)
- Parse raw GDS text into structured segments — agent can auto-run, agent reviews result
- Draft WhatsApp quote text from parsed data + fare/baggage input
- Draft PDF itinerary from parsed data
- Tag conversion with parse confidence score

## Executable-after-approval actions (risk: medium)
- Save completed conversion to history — user clicks Save
- Re-generate WhatsApp/PDF after edit — user clicks Generate

## Human-only actions (risk: critical)
- Delete a conversion from history — always human
- Edit fare amount or cancellation rules after save — always human
- Delete all history — always human

## Named tools
| Tool | What it does | Risk |
|---|---|---|
| `parse_pnr_text` | Parse raw GDS text → structured JSON | low (auto) |
| `generate_whatsapp_quote` | Format parsed data → Bengali WhatsApp text | low (auto) |
| `generate_pdf_itinerary` | Format parsed data → PDF buffer | low (auto) |
| `save_conversion` | Persist conversion + segments to DB | medium (user action) |
| `delete_conversion` | Remove conversion from history | critical (human-only) |

## Audit-log fields
Every agentic action logged: `action`, `conversion_id`, `actor` (system/user), `detail` (what changed), `created_at`.

## v1 vs later
- **v1**: parse + generate + save (with user click). No outbound messaging.
- **Later**: auto-send WhatsApp quote via WhatsApp Business API (risk: high — always approval before send).