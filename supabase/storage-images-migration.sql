-- Supabase SQL Editor-এ একবার চালান
-- ImgBB থেকে Supabase Storage-এ ছবি: কেন্দ্রীয় লাইব্রেরি (এক ছবি, একাধিক ভিডিওতে)

-- ১) Storage বাকেট (পাবলিক রিড; লেখা শুধু লগইন অ্যাডমিন)
insert into storage.buckets (id, name, public)
values ('class-images', 'class-images', true)
on conflict (id) do nothing;

drop policy if exists "public read class-images" on storage.objects;
create policy "public read class-images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'class-images');

drop policy if exists "admin upload class-images" on storage.objects;
create policy "admin upload class-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'class-images');

drop policy if exists "admin update class-images" on storage.objects;
create policy "admin update class-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'class-images');

drop policy if exists "admin delete class-images" on storage.objects;
create policy "admin delete class-images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'class-images');

-- ২) ছবির লাইব্রেরি টেবিল — এক ফাইল = এক রো; যত ভিডিওতে চাই তত লিংক
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  path text,
  byte_size int,
  created_at timestamptz not null default now()
);

alter table public.images enable row level security;

drop policy if exists "public read images" on public.images;
create policy "public read images" on public.images
  for select to anon, authenticated using (true);

drop policy if exists "admin insert images" on public.images;
create policy "admin insert images" on public.images
  for insert to authenticated with check (true);

drop policy if exists "admin delete images" on public.images;
create policy "admin delete images" on public.images
  for delete to authenticated using (true);

-- ৩) video_images টেবিলে লিংক-কলাম যোগ (url-নির্ভর থেকে লাইব্রেরি-নির্ভর)
alter table public.video_images
  add column if not exists image_id uuid references public.images(id) on delete cascade;

-- পুরনো ImgBB url-গুলোর জন্য লাইব্রেরি রো তৈরি করে লিংক বসানো (পুরনো ভিডিওর ছবি নষ্ট হবে না)
insert into public.images (url)
select distinct vi.url
from public.video_images vi
where vi.image_id is null
  and not exists (select 1 from public.images i where i.url = vi.url);

update public.video_images vi
set image_id = i.id
from public.images i
where i.url = vi.url
  and vi.image_id is null;

alter table public.video_images
  alter column image_id set not null;

alter table public.video_images
  drop column if exists url;

create index if not exists video_images_video_pos_idx
  on public.video_images (video_id, position);

create index if not exists video_images_image_idx
  on public.video_images (image_id);
