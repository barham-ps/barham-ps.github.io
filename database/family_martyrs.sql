-- Additive migration; review and apply before deploying the frontend.
begin;
create table public.family_martyrs (
 id uuid primary key default gen_random_uuid(),
 region text not null check(region in ('gaza','westbank')),
 full_name text not null check(char_length(trim(full_name)) between 1 and 200),
 date_label text not null default '' check(char_length(date_label)<=120),
 place text not null default '' check(char_length(place)<=250),
 age_label text not null default '' check(char_length(age_label)<=120),
 narrative text not null default '' check(char_length(narrative)<=5000),
 featured_caption text not null default '' check(char_length(featured_caption)<=160),
 sort_order integer not null default 100 check(sort_order between 0 and 100000),
 sources text not null default '' check(char_length(sources)<=3000),
 published boolean not null default false
);
create table public.family_martyr_photos (
 id uuid primary key default gen_random_uuid(),
 martyr_id uuid not null references public.family_martyrs(id) on delete restrict,
 position integer not null check(position between 1 and 30),
 object_path text not null unique check(object_path like martyr_id::text || '/%'),
 caption text not null default '' check(char_length(caption)<=250),
 published boolean not null default false,
 unique(martyr_id,position)
);
alter table public.family_martyrs enable row level security;
alter table public.family_martyr_photos enable row level security;
revoke all on public.family_martyrs,public.family_martyr_photos from public,anon,authenticated;
grant select on public.family_martyrs,public.family_martyr_photos to anon,authenticated;
grant insert,update,delete on public.family_martyrs,public.family_martyr_photos to authenticated;
create policy martyr_read on public.family_martyrs for select to anon,authenticated using(published);
create policy martyr_admin on public.family_martyrs for all to authenticated using((select public.family_is_admin())) with check((select public.family_is_admin()));
create policy martyr_photo_read on public.family_martyr_photos for select to anon,authenticated using(published and exists(select 1 from public.family_martyrs m where m.id=martyr_id and m.published));
create policy martyr_photo_admin on public.family_martyr_photos for all to authenticated using((select public.family_is_admin())) with check((select public.family_is_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('family-martyr-photos','family-martyr-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy martyr_photo_storage_read on storage.objects for select to anon,authenticated using(bucket_id='family-martyr-photos' and exists(select 1 from public.family_martyr_photos p join public.family_martyrs m on m.id=p.martyr_id where p.object_path=name and p.published and m.published));
create policy martyr_photo_storage_admin on storage.objects for all to authenticated using(bucket_id='family-martyr-photos' and (select public.family_is_admin())) with check(bucket_id='family-martyr-photos' and (select public.family_is_admin()));
insert into public.family_martyrs(region,full_name,date_label,place,age_label,narrative,featured_caption,sort_order,published) values
('gaza','الشهيد منير إبراهيم برهم','٣ يناير ٢٠٠٨','الزنة قرب بني سهيلا، خان يونس','٢٠ أو ٢٢ عامًا','استشهد عام ٢٠٠٨ أثناء تصديه للاحتلال الإسرائيلي، بحسب الرواية العائلية.','في صدارة سجل شهداء غزة',10,true),
('gaza','حسين سليم حسن برهم','١٠ مارس ٢٠١٢','عبسان الكبيرة، خان يونس','٥٢ عامًا','استشهد جراء قصف إسرائيلي شرق خان يونس.','',20,true),
('gaza','كرم إبراهيم عطية برهم','٢١ يوليو ٢٠١٤','بني سهيلا، خان يونس','٢٥ عامًا','استشهد في القصف الإسرائيلي خلال حرب ٢٠١٤. ورد الاسم الثالث أيضًا «عبد الرحمن»؛ يحتاج إلى تأكيد عائلي.','',30,true),
('gaza','سناء فتحي إبراهيم برهم','١٧ نوفمبر ٢٠٢٣','دير البلح (المحافظة المسجلة)','٤٩ عامًا','استشهدت إثر استهداف إسرائيلي وفق السجل؛ التفاصيل الفردية غير متاحة.','',40,true),
('gaza','سناء محمد موسى برهم','١٧ نوفمبر ٢٠٢٣','دير البلح (المحافظة المسجلة)','٧ أعوام','طفلة وردت في سجل الشهداء؛ ظروف الاستشهاد الفردية غير متحققة.','',50,true),
('gaza','عمر إياد عبد الرازق برهم','٢٢ يناير ٢٠٢٤','دير البلح (المحافظة المسجلة)','٢٤ عامًا','استشهد إثر استهداف إسرائيلي بحسب السجل.','',60,true),
('gaza','صديق إبراهيم عبد الرحمن برهم','٣١ مارس ٢٠٢٤','بني سهيلا، خان يونس','٣٣ عامًا','استشهد جراء قصف إسرائيلي؛ وردت دير البلح كمحافظة مسجلة.','',70,true),
('gaza','محمد موسى عبد الرحمن برهم','٦ يونيو ٢٠٢٤','دير البلح (المحافظة المسجلة)','٣٢ عامًا','استشهد إثر استهداف إسرائيلي بحسب السجل.','',80,true),
('gaza','ناصر حسين سليم برهم','٣ أغسطس ٢٠٢٥','خان يونس','٢٩ عامًا','استشهد إثر استهداف إسرائيلي وفق متن السجل؛ عنوان المصدر يذكر رفح بخلاف المتن.','',90,true),
('gaza','سعيد برهم','١٦–١٧ سبتمبر ٢٠٢٦','بني سهيلا، خان يونس','العمر غير متحقق','استشهد متأثرًا بجراح أصيب بها في قصف عام ٢٠٢٥؛ نشر الخبر في ١٧ سبتمبر، واليوم الدقيق والاسم الرباعي بحاجة إلى تأكيد.','',100,true),
('westbank','غانم تيسير أحمد برهم','٢٠ فبراير ٢٠٠٢','كفر قدوم، قلقيلية؛ نابلس مكان الوفاة','٢٦ عامًا (٢٧ بحسب الخبر)','استشهد خلال هجوم إسرائيلي على موقع للأمن الوطني قرب مخيم بلاطة.','',10,true),
('westbank','رامي عبد اللطيف برهم','١١ نوفمبر ٢٠٠٥ تقريبًا','كفر قدوم، قلقيلية','العمر غير متحقق','توفي بعد إصابته بالرصاص؛ هوية مطلق النار غير محسومة في التقرير الصحفي.','',20,true),
('westbank','عيسى سليمان برهم برهم','١٤ مايو ٢٠٢١','بيتا، جنوب نابلس','٤٠ عامًا بحسب السجل','استشهد بنيران القوات الإسرائيلية خلال احتجاجات بيتا على الاستيطان؛ كان وكيلًا للنيابة العامة.','',30,true);
commit;
