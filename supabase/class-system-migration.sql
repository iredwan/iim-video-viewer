-- Supabase SQL Editor-এ একবার চালান
-- ব্যাচ সিস্টেম বাদ → ক্লাস-নাম্বার + পাসওয়ার্ড-গেট সিস্টেম

-- ১) videos টেবিল: ক্লাস নাম্বার + পাসওয়ার্ড
alter table public.videos
  add column if not exists class_no int;
alter table public.videos
  add column if not exists access_key text;

-- পুরনো ভিডিওগুলোকে গ্লোবাল ক্রমে ১..N নম্বর
with ranked as (
  select id, row_number() over (order by batch_id, created_at) as rn
  from public.videos
  where class_no is null
)
update public.videos v
set class_no = ranked.rn
from ranked
where v.id = ranked.id;

alter table public.videos
  alter column class_no set not null;

-- পুরনো ভিডিওগুলোর ডিফল্ট পাসওয়ার্ড — অ্যাডমিন প্যানেল থেকে অবশ্যই বদলাবেন
update public.videos
set access_key = 'changeme'
where access_key is null;

alter table public.videos
  alter column access_key set not null;

alter table public.videos
  add constraint videos_class_no_unique unique (class_no);

-- ২) ব্যাচ থেকে বিচ্ছিন্ন + টেবিল বাদ
alter table public.videos
  drop constraint if exists videos_batch_id_fkey;

alter table public.videos
  drop column if exists batch_id;

drop table if exists public.batch_images cascade;
drop table if exists public.batches cascade;

-- ৩) anon-এর সরাসরি পড়া বন্ধ — পুরনো সব read পলিসি সরিয়ে ফেলা
do $$
declare r record;
begin
  for r in (
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('videos', 'video_images', 'images')
  ) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- পুনরায় পলিসি: সব অ্যাক্সেস শুধু লগইন (অ্যাডমিন) হাত দিয়ে, anon ঑নলি RPC-তে
create policy "admin select videos" on public.videos
  for select to authenticated using (true);
create policy "admin insert videos" on public.videos
  for insert to authenticated with check (true);
create policy "admin update videos" on public.videos
  for update to authenticated using (true) with check (true);
create policy "admin delete videos" on public.videos
  for delete to authenticated using (true);

create policy "admin select video_images" on public.video_images
  for select to authenticated using (true);
create policy "admin insert video_images" on public.video_images
  for insert to authenticated with check (true);
create policy "admin update video_images" on public.video_images
  for update to authenticated using (true) with check (true);
create policy "admin delete video_images" on public.video_images
  for delete to authenticated using (true);

create policy "admin select images" on public.images
  for select to authenticated using (true);
create policy "admin insert images" on public.images
  for insert to authenticated with check (true);
create policy "admin delete images" on public.images
  for delete to authenticated using (true);

-- ৪) পাবলিক RPC — পাসওয়ার্ড মিললে সর্বোচ্চ ঐ ক্লাস পর্যন্ত (security definer তাই RLS এর ভেতর থেকে)
create or replace function public.get_public_videos(p_class int, p_key text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(json_build_object(
    'id', v.id,
    'slug', v.slug,
    'youtube_id', v.youtube_id,
    'title', v.title,
    'class_no', v.class_no
  ) order by v.class_no), '[]'::json)
  from public.videos v
  where v.class_no <= p_class
    and v.access_key = p_key;
$$;

create or replace function public.get_public_video(p_slug text, p_key text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', v.id,
    'slug', v.slug,
    'youtube_id', v.youtube_id,
    'title', v.title,
    'class_no', v.class_no,
    'images', coalesce((
      select json_agg(json_build_object(
        'image_id', im.id,
        'image_url', im.url
      ) order by vi.position)
      from public.video_images vi
      join public.images im on im.id = vi.image_id
      where vi.video_id = v.id
    ), '[]'::json)
  )
  from public.videos v
  where v.slug = p_slug
    and v.access_key = p_key;
$$;

create or replace function public.get_public_og(p_slug text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'title', v.title,
    'class_no', v.class_no,
    'youtube_id', v.youtube_id
  )
  from public.videos v
  where v.slug = p_slug;
$$;

grant execute on function public.get_public_videos(int, text) to anon, authenticated;
grant execute on function public.get_public_video(text, text) to anon, authenticated;
grant execute on function public.get_public_og(text) to anon, authenticated;
