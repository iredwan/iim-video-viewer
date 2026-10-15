-- Supabase SQL Editor-এ একবার চালান
alter table public.videos
  add column if not exists title text;

alter table public.videos
  drop constraint if exists videos_title_len;

alter table public.videos
  add constraint videos_title_len
  check (title is null or char_length(title) between 1 and 200);
