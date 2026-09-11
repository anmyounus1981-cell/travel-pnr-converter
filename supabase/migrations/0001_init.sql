-- PNR Converter — domain schema (demo-first, no auth wall in v1)

create table if not exists conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  raw_text text not null,
  pnr_code text,
  gds_type text default 'unknown',
  status text default 'draft',
  fare_amount numeric,
  fare_currency text default 'BDT',
  baggage_info text,
  cancellation_rule text,
  reissue_rule text,
  whatsapp_output text,
  created_at timestamptz not null default now()
);
alter table conversions enable row level security;
drop policy if exists "conversions_v1_read" on conversions;
create policy "conversions_v1_read" on conversions for select using (true);
drop policy if exists "conversions_v1_write" on conversions;
create policy "conversions_v1_write" on conversions for all using (true) with check (true);

create table if not exists passengers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  conversion_id uuid references conversions(id) on delete cascade,
  name text not null,
  type text default 'adult',
  created_at timestamptz not null default now()
);
alter table passengers enable row level security;
drop policy if exists "passengers_v1_read" on passengers;
create policy "passengers_v1_read" on passengers for select using (true);
drop policy if exists "passengers_v1_write" on passengers;
create policy "passengers_v1_write" on passengers for all using (true) with check (true);

create table if not exists flight_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  conversion_id uuid references conversions(id) on delete cascade,
  airline text,
  airline_source text,
  airline_confidence numeric,
  flight_number text,
  flight_number_source text,
  flight_number_confidence numeric,
  origin text,
  destination text,
  departure_at timestamptz,
  departure_at_source text,
  departure_at_confidence numeric,
  arrival_at timestamptz,
  arrival_at_source text,
  arrival_at_confidence numeric,
  layover_minutes int,
  cabin text default 'economy',
  review_status text default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table flight_segments enable row level security;
drop policy if exists "flight_segments_v1_read" on flight_segments;
create policy "flight_segments_v1_read" on flight_segments for select using (true);
drop policy if exists "flight_segments_v1_write" on flight_segments;
create policy "flight_segments_v1_write" on flight_segments for all using (true) with check (true);

create table if not exists hotel_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  conversion_id uuid references conversions(id) on delete cascade,
  hotel_name text,
  hotel_name_source text,
  hotel_name_confidence numeric,
  check_in date,
  check_out date,
  nights int,
  room_type text,
  review_status text default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table hotel_segments enable row level security;
drop policy if exists "hotel_segments_v1_read" on hotel_segments;
create policy "hotel_segments_v1_read" on hotel_segments for select using (true);
drop policy if exists "hotel_segments_v1_write" on hotel_segments;
create policy "hotel_segments_v1_write" on hotel_segments for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  conversion_id uuid references conversions(id) on delete cascade,
  action text not null,
  actor text default 'system',
  detail text,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

-- Seed demo data

insert into conversions (id, raw_text, pnr_code, gds_type, status, fare_amount, fare_currency, baggage_info, cancellation_rule, reissue_rule, whatsapp_output, created_at)
select 'a1111111-1111-1111-1111-111111111111', '1.MOHAMMAD RAHIM 2.FATIMA RAHIM
BG 341 J DACDXB 15JAN 0830 1130
EK 003 M DXBLHR 15JAN 1400 1820
HTL MARRIOTT DOWNTOWN 15JAN-20JAN 5 NIGHTS', 'ABC123', 'amadeus', 'completed', 85000, 'BDT', '30kg checked + 7kg cabin', 'Non-refundable', 'Reissue fee BDT 5,000', '*✈️ ফ্লাইট রুট*\nBG341: ঢাকা→দুবাই ১৫ জানুয়ারি ০৮:৩০-১১:৩০\nEK003: দুবাই→লন্ডন ১৫ জানুয়ারি ১৪:০০-১৮:২০\n\n🧳 ব্যাগ: ৩০কেজি চেকড + ৭কেজি কেবিন\n❌ ক্যানসেল: নন-রিফান্ডেবল\n🔄 রিইস্যু: ৫,০০০ টাকা\n💰 ভাড়া: ৮৫,০০০ টাকা', now() - interval '2 days'
where not exists (select 1 from conversions where id = 'a1111111-1111-1111-1111-111111111111');

insert into passengers (id, conversion_id, name, type)
select gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'MOHAMMAD RAHIM', 'adult'
where not exists (select 1 from passengers where conversion_id = 'a1111111-1111-1111-1111-111111111111' and name = 'MOHAMMAD RAHIM');

insert into passengers (id, conversion_id, name, type)
select gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'FATIMA RAHIM', 'adult'
where not exists (select 1 from passengers where conversion_id = 'a1111111-1111-1111-1111-111111111111' and name = 'FATIMA RAHIM');

insert into flight_segments (id, conversion_id, airline, airline_source, airline_confidence, flight_number, flight_number_source, flight_number_confidence, origin, destination, departure_at, departure_at_source, departure_at_confidence, arrival_at, arrival_at_source, arrival_at_confidence, cabin, review_status)
select gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'BG', 'regex', 1.0, '341', 'regex', 1.0, 'DAC', 'DXB', '2025-01-15T08:30:00+06:00', 'regex', 1.0, '2025-01-15T11:30:00+04:00', 'regex', 1.0, 'economy', 'reviewed'
where not exists (select 1 from flight_segments where conversion_id = 'a1111111-1111-1111-1111-111111111111' and flight_number = '341');

insert into flight_segments (id, conversion_id, airline, airline_source, airline_confidence, flight_number, flight_number_source, flight_number_confidence, origin, destination, departure_at, departure_at_source, departure_at_confidence, arrival_at, arrival_at_source, arrival_at_confidence, cabin, review_status)
select gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'EK', 'regex', 1.0, '003', 'regex', 1.0, 'DXB', 'LHR', '2025-01-15T14:00:00+04:00', 'regex', 1.0, '2025-01-15T18:20:00+00:00', 'regex', 1.0, 'economy', 'reviewed'
where not exists (select 1 from flight_segments where conversion_id = 'a1111111-1111-1111-1111-111111111111' and flight_number = '003');

insert into hotel_segments (id, conversion_id, hotel_name, hotel_name_source, hotel_name_confidence, check_in, check_out, nights, room_type, review_status)
select gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'Marriott Downtown', 'regex', 1.0, '2025-01-15', '2025-01-20', 5, 'Deluxe', 'reviewed'
where not exists (select 1 from hotel_segments where conversion_id = 'a1111111-1111-1111-1111-111111111111' and hotel_name = 'Marriott Downtown');

-- Second demo conversion

insert into conversions (id, raw_text, pnr_code, gds_type, status, fare_amount, fare_currency, baggage_info, cancellation_rule, reissue_rule, created_at)
select 'b2222222-2222-2222-2222-222222222222', '1.SALEH AHMED
TK 712 Y DACIST 20FEB 0600 1045
TK 1234 ISTJFK 20FEB 1320 1730', 'XYZ789', 'galileo', 'completed', 120000, 'BDT', '40kg checked + 10kg cabin', 'Refundable with 20% fee', 'Reissue fee BDT 8,000', now() - interval '1 day'
where not exists (select 1 from conversions where id = 'b2222222-2222-2222-2222-222222222222');

insert into passengers (id, conversion_id, name, type)
select gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'SALEH AHMED', 'adult'
where not exists (select 1 from passengers where conversion_id = 'b2222222-2222-2222-2222-222222222222');

insert into flight_segments (id, conversion_id, airline, airline_source, airline_confidence, flight_number, flight_number_source, flight_number_confidence, origin, destination, departure_at, departure_at_source, departure_at_confidence, arrival_at, arrival_at_source, arrival_at_confidence, cabin, review_status)
select gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'TK', 'regex', 1.0, '712', 'regex', 1.0, 'DAC', 'IST', '2025-02-20T06:00:00+06:00', 'regex', 1.0, '2025-02-20T10:45:00+03:00', 'regex', 1.0, 'economy', 'reviewed'
where not exists (select 1 from flight_segments where conversion_id = 'b2222222-2222-2222-2222-222222222222' and flight_number = '712');

insert into flight_segments (id, conversion_id, airline, airline_source, airline_confidence, flight_number, flight_number_source, flight_number_confidence, origin, destination, departure_at, departure_at_source, departure_at_confidence, arrival_at, arrival_at_source, arrival_at_confidence, cabin, review_status)
select gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'TK', 'regex', 1.0, '1234', 'regex', 1.0, 'IST', 'JFK', '2025-02-20T13:20:00+03:00', 'regex', 1.0, '2025-02-20T17:30:00-05:00', 'regex', 1.0, 'economy', 'reviewed'
where not exists (select 1 from flight_segments where conversion_id = 'b2222222-2222-2222-2222-222222222222' and flight_number = '1234');

-- Third demo conversion

insert into conversions (id, raw_text, pnr_code, gds_type, status, fare_amount, fare_currency, baggage_info, cancellation_rule, reissue_rule, created_at)
select 'c3333333-3333-3333-3333-333333333333', '1.NUSRAT JAHAN 2.TAHMID JAHAN 3.ALIYA JAHAN
QR 639 Y DACDOH 10MAR 0400 0630
QR 701 Y DOHJFK 10MAR 0815 1450
QR 702 Y JFKDOH 17MAR 2200 1730+1
QR 638 Y DOHDAC 18MAR 0200 1000', 'DEF456', 'sabre', 'draft', 95000, 'BDT', '30kg checked + 7kg cabin', 'Non-refundable', 'Reissue fee BDT 6,000', now() - interval '3 hours'
where not exists (select 1 from conversions where id = 'c3333333-3333-3333-3333-333333333333');

insert into passengers (id, conversion_id, name, type)
select gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'NUSRAT JAHAN', 'adult'
where not exists (select 1 from passengers where conversion_id = 'c3333333-3333-3333-3333-333333333333' and name = 'NUSRAT JAHAN');

insert into passengers (id, conversion_id, name, type)
select gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'TAHMID JAHAN', 'child'
where not exists (select 1 from passengers where conversion_id = 'c3333333-3333-3333-3333-333333333333' and name = 'TAHMID JAHAN');

insert into passengers (id, conversion_id, name, type)
select gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'ALIYA JAHAN', 'infant'
where not exists (select 1 from passengers where conversion_id = 'c3333333-3333-3333-3333-333333333333' and name = 'ALIYA JAHAN');

insert into flight_segments (id, conversion_id, airline, airline_source, airline_confidence, flight_number, flight_number_source, flight_number_confidence, origin, destination, departure_at, departure_at_source, departure_at_confidence, arrival_at, arrival_at_source, arrival_at_confidence, cabin, review_status)
select gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'QR', 'regex', 1.0, '639', 'regex', 1.0, 'DAC', 'DOH', '2025-03-10T04:00:00+06:00', 'regex', 1.0, '2025-03-10T06:30:00+03:00', 'regex', 1.0, 'economy', 'unreviewed'
where not exists (select 1 from flight_segments where conversion_id = 'c3333333-3333-3333-3333-333333333333' and flight_number = '639');

insert into flight_segments (id, conversion_id, airline, airline_source, airline_confidence, flight_number, flight_number_source, flight_number_confidence, origin, destination, departure_at, departure_at_source, departure_at_confidence, arrival_at, arrival_at_source, arrival_at_confidence, cabin, review_status)
select gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'QR', 'regex', 1.0, '701', 'regex', 1.0, 'DOH', 'JFK', '2025-03-10T08:15:00+03:00', 'regex', 1.0, '2025-03-10T14:50:00-05:00', 'regex', 1.0, 'economy', 'unreviewed'
where not exists (select 1 from flight_segments where conversion_id = 'c3333333-3333-3333-3333-333333333333' and flight_number = '701');