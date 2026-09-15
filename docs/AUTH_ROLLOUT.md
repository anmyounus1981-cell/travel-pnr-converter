# Invite-only authentication rollout

This milestone adds a server-verified login gate to the Converter, History,
conversion API and PDF route. Database ownership is enforced only **after**
`supabase/migrations/0003_owner_rls.sql` is applied to the provisioned Supabase
project. Deploying only the app code does not secure Supabase's Data API.

## Supabase project settings

1. In Supabase Auth settings, disable **new user signups** at the project level.
   Removing the signup button from the app is not sufficient: the public Auth
   API would otherwise still allow creation of new accounts. Verify an
   uninvited signup request fails before inviting agents.
2. Set the production site URL to `https://travel-pnr-converter.vercel.app`.
   Add `https://travel-pnr-converter.vercel.app/auth/callback?next=/auth/update-password`
   to allowed Auth redirect URLs, along with the equivalent local development
   URL. Recovery also supports `/auth/confirm` when the token-hash email
   template described below is used.
3. Invite agents from the Supabase Auth Users dashboard or a trusted admin
   process. Never expose an admin/service-role key in browser code or an
   unauthenticated invite endpoint. In the Supabase **Invite user** email
   template, set the link target to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`.
   In the **Reset password** template use the same path with `type=recovery`.
   Confirm the templates and a disposable invited account before relying on
   the flow. Invitations and password resets require working email delivery.
4. The deployed app uses `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The SSR data client forwards the verified
   user's auth token; it does not use the service-role key.

## Data cutover

1. Review existing rows with `select id, pnr_code, user_id from public.conversions`.
   Existing NULL-owned demo rows will become invisible after the migration.
   Decide which demo rows to keep and identify their invited owner before
   assigning ownership; never guess an owner. Children must inherit the same
   owner ID. Delete or archive unwanted demo data deliberately.
2. Apply `0003_owner_rls.sql` to the live database before releasing the new
   app code to agents. It runs in a transaction and refuses unexpected policies.
   During the cutover, the existing demo app will stop accessing conversions;
   restore access only through the authenticated app. Do not rerun `0001_init.sql`.
3. After the migration, verify the project-level signup toggle, anonymous
   Data API reads/writes, and cross-owner reads/writes all deny access. Check
   conversion, passenger, flight, hotel and audit policies with `pg_policies`.
4. Deploy the authenticated commit from `main` via Vercel's Git integration.
   Test login, password reset, sign-out, expired sessions, direct PDF links,
   POST/DELETE calls, and two-agent separation. Confirm the live release is
   operational before using any actual client records.

## Known follow-up

`saveConversion()` replaces child rows in separate database calls, so edits
are not atomic yet. Audit rows have an `on delete cascade` reference to the
conversion; the append-only access policy alone does not preserve audits after
a deletion. Address both before a commercial release. The current History
endpoint loads only the latest 100 conversions; pagination is a separate task.
