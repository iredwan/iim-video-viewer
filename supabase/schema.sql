-- Supabase SQL Editor-এ চালান

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.batch_images (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists batch_images_batch_pos_idx
  on public.batch_images (batch_id, position);

alter table public.batches enable row level security;
alter table public.batch_images enable row level security;

-- সবাই দেখতে পারবে
create policy "public read batches" on public.batches
  for select to anon, authenticated using (true);
create policy "public read images" on public.batch_images
  for select to anon, authenticated using (true);

-- শুধু লগইন করা ইউজার লিখতে পারবে
-- (Supabase Dashboard > Authentication > Sign In / Providers থেকে "Allow new users to sign up" বন্ধ রাখুন,
--  তাহলে আপনার একমাত্র ইউজারই authenticated থাকবে)
create policy "admin insert batches" on public.batches
  for insert to authenticated with check (true);
create policy "admin update batches" on public.batches
  for update to authenticated using (true) with check (true);
create policy "admin delete batches" on public.batches
  for delete to authenticated using (true);

create policy "admin insert images" on public.batch_images
  for insert to authenticated with check (true);
create policy "admin update images" on public.batch_images
  for update to authenticated using (true) with check (true);
create policy "admin delete images" on public.batch_images
  for delete to authenticated using (true);
