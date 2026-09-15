# PNR Converter — Security

## Secret handling
- Supabase service key stored server-side only (env vars, never client)
- No API keys in frontend code
- AI parser API key (if used) server-side only

## Permission model
- **Before migration 0003**: open read/write RLS is still active in the live database, even if login code has been deployed.
- **After migration 0003**: authenticated, per-user RLS on conversions and child tables; child rows must belong to a conversion with the same authenticated owner. See `AUTH_ROLLOUT.md` for cutover requirements.
- Agent (AI parser) inherits user's permissions — cannot access data the user couldn't

## Approved-tools rule
- Only named server actions (`parse_pnr_text`, `generate_whatsapp_quote`, `generate_pdf_itinerary`, `save_conversion`, `delete_conversion`) may touch the database
- No raw `run_any` or arbitrary SQL execution from the client
- No arbitrary file system access

## Audit principle
- Every conversion, parse, generation, and save logged to `audit_logs`
- Deletions logged with full detail before row removed
- Logs are append-only — no update/delete on audit rows

## Data safety
- Raw PNR text may contain passenger PII — treat as sensitive
- Lock-down sprint enforces RLS before any real client data enters the system
- No PII in logs beyond what's in the conversion itself
