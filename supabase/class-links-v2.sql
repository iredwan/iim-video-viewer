-- Supabase SQL Editor-এ চালান
-- ক্লাস লিংক v2: লিংক = সরাসরি ভিডিও (নিজস্ব পাসওয়ার্ড);
-- unlock প্রমাণ (class N + oid ক্লাসের পাসওয়ার্ড) থাকলে ১..N সব খোলা, নিজস্ব পাসওয়ার্ড লাগে না

-- ১) লিস্ট: unlock প্রমাণ যাচাই করে ক্লাস ১..N (নিজস্ব access_key মিল লাগে না)
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
    and p_class >= 1
    and exists (
      select 1 from public.videos vk
      where vk.class_no = p_class
        and vk.access_key = p_key
    );
$$;

-- ২) গ্রুপ লিংকে সরাসরি খোলা: ওই ভিডিওর নিজস্ব পাসওয়ার্ড মিল বাধ্যতামূলক
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
      select json_agg(json_build_object('image_id', im.id, 'image_url', im.url) order by vi.position)
      from public.video_images vi
      join public.images im on im.id = vi.image_id
      where vi.video_id = v.id
    ), '[]'::json)
  )
  from public.videos v
  where v.slug = p_slug
    and v.access_key = p_key;
$$;

-- ৩) আনলক-কনটেক্সটে যেকোনো পুরনো ভিডিও: (class, key) প্রমাণ হলে যথেষ্ট
create or replace function public.get_public_unlocked_video(p_class int, p_key text, p_slug text)
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
      select json_agg(json_build_object('image_id', im.id, 'image_url', im.url) order by vi.position)
      from public.video_images vi
      join public.images im on im.id = vi.image_id
      where vi.video_id = v.id
    ), '[]'::json)
  )
  from public.videos v
  where v.slug = p_slug
    and v.class_no <= p_class
    and exists (
      select 1 from public.videos vk
      where vk.class_no = p_class
        and vk.access_key = p_key
    );
$$;

grant execute on function public.get_public_videos(int, text) to anon, authenticated;
grant execute on function public.get_public_video(text, text) to anon, authenticated;
grant execute on function public.get_public_unlocked_video(int, text, text) to anon, authenticated;
