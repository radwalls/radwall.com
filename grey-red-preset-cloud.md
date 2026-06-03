# Grey Red community preset cloud

The synth can save and load shared presets through Supabase.

1. Create a Supabase project.
2. Create this table in the SQL editor:

```sql
create table public.grey_red_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  params jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.grey_red_presets enable row level security;

create policy "Grey Red presets are public to read"
  on public.grey_red_presets for select
  using (true);

create policy "Grey Red presets are public to submit"
  on public.grey_red_presets for insert
  with check (true);
```

3. In `grey-red-synth.html`, fill in `communityPresetCloud.supabaseUrl` and `communityPresetCloud.supabaseAnonKey` with the public project URL and anon key.

The anon key is meant to be public in browser apps. Do not put service-role keys in the site.
