create index if not exists family_public_content_published_section_date_idx on public.family_public_content (section, created_at desc, id desc) where published = true;
create index if not exists family_news_published_date_idx on public.family_news (created_at desc, id desc) where published = true;
