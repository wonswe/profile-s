-- Run this entire file once in the SQL Editor of the NEW Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.structured_guestbook_posts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  relationship text not null check (char_length(relationship) between 1 and 80),
  answer_one text not null check (char_length(answer_one) between 1 and 700),
  answer_two text not null check (char_length(answer_two) between 1 and 700),
  answer_three text not null check (char_length(answer_three) between 1 and 700),
  media_path text,
  created_at timestamptz not null default now()
);

alter table public.structured_guestbook_posts enable row level security;

grant select, insert on table public.structured_guestbook_posts to anon;

drop policy if exists "Anyone can read structured guestbook posts" on public.structured_guestbook_posts;
drop policy if exists "Anyone can add structured guestbook posts" on public.structured_guestbook_posts;

create policy "Anyone can read structured guestbook posts"
on public.structured_guestbook_posts for select to anon
using (true);

create policy "Anyone can add structured guestbook posts"
on public.structured_guestbook_posts for insert to anon
with check (
  char_length(name) between 1 and 40
  and char_length(relationship) between 1 and 80
  and char_length(answer_one) between 1 and 700
  and char_length(answer_two) between 1 and 700
  and char_length(answer_three) between 1 and 700
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'structured-moments',
  'structured-moments',
  true,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view structured moments" on storage.objects;
drop policy if exists "Anyone can upload structured moments" on storage.objects;

create policy "Anyone can view structured moments"
on storage.objects for select to anon
using (bucket_id = 'structured-moments');

create policy "Anyone can upload structured moments"
on storage.objects for insert to anon
with check (bucket_id = 'structured-moments');
