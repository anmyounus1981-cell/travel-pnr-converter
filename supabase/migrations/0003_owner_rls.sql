-- Apply this migration before the authenticated app is made available to users.
-- Existing rows with NULL user_id remain inaccessible until reviewed and
-- explicitly assigned to an invited account in a separate, audited operation.
begin;

do $$
declare table_name text;
begin
  foreach table_name in array array['conversions', 'passengers', 'flight_segments', 'hotel_segments', 'audit_logs'] loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name
      and policyname not in (table_name || '_v1_read', table_name || '_v1_write')
    ) then
      raise exception 'Unexpected policies on %. Inspect them before applying owner RLS.', table_name;
    end if;
  end loop;
end $$;

alter table public.conversions enable row level security;
alter table public.passengers enable row level security;
alter table public.flight_segments enable row level security;
alter table public.hotel_segments enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists conversions_v1_read on public.conversions;
drop policy if exists conversions_v1_write on public.conversions;
drop policy if exists passengers_v1_read on public.passengers;
drop policy if exists passengers_v1_write on public.passengers;
drop policy if exists flight_segments_v1_read on public.flight_segments;
drop policy if exists flight_segments_v1_write on public.flight_segments;
drop policy if exists hotel_segments_v1_read on public.hotel_segments;
drop policy if exists hotel_segments_v1_write on public.hotel_segments;
drop policy if exists audit_logs_v1_read on public.audit_logs;
drop policy if exists audit_logs_v1_write on public.audit_logs;

create policy conversions_owner_select on public.conversions for select to authenticated using ((select auth.uid()) = user_id);
create policy conversions_owner_insert on public.conversions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy conversions_owner_update on public.conversions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy conversions_owner_delete on public.conversions for delete to authenticated using ((select auth.uid()) = user_id);

create policy passengers_owner_select on public.passengers for select to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy passengers_owner_insert on public.passengers for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy passengers_owner_update on public.passengers for update to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy passengers_owner_delete on public.passengers for delete to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);

create policy flights_owner_select on public.flight_segments for select to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy flights_owner_insert on public.flight_segments for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy flights_owner_update on public.flight_segments for update to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy flights_owner_delete on public.flight_segments for delete to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);

create policy hotels_owner_select on public.hotel_segments for select to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy hotels_owner_insert on public.hotel_segments for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy hotels_owner_update on public.hotel_segments for update to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);
create policy hotels_owner_delete on public.hotel_segments for delete to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid()))
);

-- Audits are append-only; no owner policy permits UPDATE or DELETE.
create policy audit_owner_select on public.audit_logs for select to authenticated using (
  (select auth.uid()) = user_id and (conversion_id is null or exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid())))
);
create policy audit_owner_insert on public.audit_logs for insert to authenticated with check (
  (select auth.uid()) = user_id and (conversion_id is null or exists (select 1 from public.conversions c where c.id = conversion_id and c.user_id = (select auth.uid())))
);

create index if not exists conversions_user_id_idx on public.conversions(user_id);
create index if not exists passengers_user_id_idx on public.passengers(user_id);
create index if not exists flight_segments_user_id_idx on public.flight_segments(user_id);
create index if not exists hotel_segments_user_id_idx on public.hotel_segments(user_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
commit;
