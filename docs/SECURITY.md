# PNR Converter — Security

## Secret handling
- Supabase service key stored server-side only (env vars, never client)
- No API keys in frontend code
- AI parser API key (if used) server-side only

## Permission model
- **v1**: open read/write (no login) — demo mode for internal team
- **Lock-down**: per-user RLS — `auth.uid() = user_id` on all tables; each agent sees only their own conversions
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