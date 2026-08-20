-- 视频分析记忆表
-- 在 Supabase SQL Editor 中执行本脚本，或在项目部署前运行

CREATE TABLE IF NOT EXISTS public.video_analyses (
  id BIGSERIAL PRIMARY KEY,
  video_name TEXT NOT NULL,
  analysis_result TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_analyses_updated_at ON public.video_analyses;
CREATE TRIGGER trg_video_analyses_updated_at
  BEFORE UPDATE ON public.video_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 行级安全策略（RLS）
ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

-- 若使用 service_role key 访问，RLS 会自动绕过；此处保留 anon 可读策略便于前端直读
DROP POLICY IF EXISTS "Enable read access" ON public.video_analyses;
CREATE POLICY "Enable read access"
  ON public.video_analyses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert access" ON public.video_analyses;
CREATE POLICY "Enable insert access"
  ON public.video_analyses FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access" ON public.video_analyses;
CREATE POLICY "Enable delete access"
  ON public.video_analyses FOR DELETE
  USING (true);