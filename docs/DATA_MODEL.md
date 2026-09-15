# PNR Converter — Data Model

## conversions
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | nullable (for lock-down) |
| raw_text | text | raw GDS PNR paste |
| pnr_code | text | extracted PNR locator |
| gds_type | text | 'sabre' / 'galileo' / 'amadeus' / 'unknown' |
| status | text | 'draft' / 'completed' |
| fare_amount | numeric | |
| fare_currency | text | default 'BDT' |
| baggage_info | text | e.g. '30kg checked + 7kg cabin' |
| cancellation_rule | text | |
| reissue_rule | text | |
| whatsapp_output | text | generated English quote text |
| created_at | timestamptz | |

RLS: permissive read/write in v1; owner-scoped at lock-down.

## passengers
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversion_id | uuid | FK→conversions |
| name | text | full name as parsed |
| type | text | 'adult' / 'child' / 'infant' |
| created_at | timestamptz | |

## flight_segments
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversion_id | uuid | FK→conversions |
| airline | text | AI-parsed: value + source + confidence + review_status |
| flight_number | text | AI-parsed: value + source + confidence + review_status |
| origin | text | IATA airport code |
| destination | text | IATA airport code |
| departure_at | timestamptz | AI-parsed: value + source + confidence + review_status |
| arrival_at | timestamptz | AI-parsed: value + source + confidence + review_status |
| layover_minutes | int | transit wait |
| cabin | text | 'economy' / 'business' / 'first' |
| created_at | timestamptz | |

AI fields on flight_segments: airline, flight_number, departure_at, arrival_at — each stored with companion `_<field>_source` (text), `_<field>_confidence` (numeric), and `review_status` (text default 'unreviewed').

## hotel_segments
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversion_id | uuid | FK→conversions |
| hotel_name | text | AI-parsed |
| check_in | date | |
| check_out | date | |
| nights | int | |
| room_type | text | |
| created_at | timestamptz | |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversion_id | uuid | nullable FK |
| action | text | 'parse' / 'generate_whatsapp' / 'generate_pdf' / 'save' |
| actor | text | 'system' / 'user' |
| detail | text | |
| created_at | timestamptz | |