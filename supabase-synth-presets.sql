create table if not exists public.synth_presets (
  owner text not null default 'public',
  name text not null,
  params jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, name)
);

alter table public.synth_presets enable row level security;

drop policy if exists "Public synth presets are readable" on public.synth_presets;
create policy "Public synth presets are readable"
on public.synth_presets
for select
to anon
using (owner = 'public');

drop policy if exists "Public synth presets are writable" on public.synth_presets;
create policy "Public synth presets are writable"
on public.synth_presets
for insert
to anon
with check (owner = 'public');

drop policy if exists "Public synth presets are updatable" on public.synth_presets;
create policy "Public synth presets are updatable"
on public.synth_presets
for update
to anon
using (owner = 'public')
with check (owner = 'public');
