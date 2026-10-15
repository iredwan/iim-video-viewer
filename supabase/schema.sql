-- Supabase SQL Editor-এ চালান

-- videos টেবিল তৈরি
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text check (title is null or char_length(title) between 1 and 200),
  slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists videos_batch_id_idx
  on public.videos (batch_id);

-- video_images টেবিল তৈরি
create table if not exists public.video_images (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists video_images_video_pos_idx
  on public.video_images (video_id, position);

alter table public.videos enable row level security;
alter table public.video_images enable row level security;

-- সবাই দেখতে পারবে
create policy "public read videos" on public.videos
  for select to anon, authenticated using (true);

create policy "public read video images" on public.video_images
  for select to anon, authenticated using (true);

-- শুধু লগইন করা ইউজার লিখতে পারবে
-- (Supabase Dashboard > Authentication > Sign In / Providers থেকে "Allow new users to sign up" বন্ধ রাখুন,
--  তাহলে আপনার একমাত্র ইউজারই authenticated থাকবে)
create policy "admin insert videos" on public.videos
  for insert to authenticated with check (true);

create policy "admin update videos" on public.videos
  for update to authenticated using (true) with check (true);

create policy "admin delete videos" on public.videos
  for delete to authenticated using (true);

create policy "admin insert video images" on public.video_images
  for insert to authenticated with check (true);

create policy "admin update video images" on public.video_images
  for update to authenticated using (true) with check (true);

create policy "admin delete video images" on public.video_images
  for delete to authenticated using (true);
