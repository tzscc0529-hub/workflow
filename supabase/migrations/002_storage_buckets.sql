-- Supabase Storage 存储桶与权限配置
-- 视频直传桶（前端 anon key 直传）+ 报告桶（后端 service role 写入）

-- 1. 创建 videos 桶（视频文件，公开可读）
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- 2. 创建 reports 桶（分析报告，公开可读）
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

-- 3. videos 桶：允许匿名/已登录用户上传（前端直传）
create policy "允许公开上传视频"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'videos');

-- 4. videos 桶：允许公开读取
create policy "允许公开读取视频"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'videos');

-- 5. reports 桶：允许公开读取（后端用 service role 写入，绕过 RLS）
create policy "允许公开读取报告"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'reports');

-- 6. reports 桶：允许已登录用户删除（清理旧报告）
create policy "允许删除报告"
on storage.objects for delete
to authenticated
using (bucket_id = 'reports');