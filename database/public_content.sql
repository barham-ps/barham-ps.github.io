create table public.family_public_content (
id uuid primary key default gen_random_uuid(), section text not null check(section in ('history','tree','archive')), title text not null check(char_length(title) between 1 and 200), body text not null default '' check(char_length(body)<=30000), image_path text unique, published boolean not null default false, created_at timestamptz not null default now());
alter table public.family_public_content enable row level security;
revoke all on public.family_public_content from anon, authenticated;
grant select on public.family_public_content to anon, authenticated;
grant insert, update, delete on public.family_public_content to authenticated;
create policy public_read on public.family_public_content for select to anon, authenticated using (published);
create policy admin_manage on public.family_public_content for all to authenticated using ((select public.family_is_admin())) with check ((select public.family_is_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('family-public-content','family-public-content',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy family_public_image_read on storage.objects for select to anon, authenticated using (bucket_id='family-public-content' and exists(select 1 from public.family_public_content c where c.image_path=name and c.published));
create policy family_public_image_admin on storage.objects for all to authenticated using(bucket_id='family-public-content' and (select public.family_is_admin())) with check(bucket_id='family-public-content' and (select public.family_is_admin()));