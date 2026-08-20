import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabase-client';

// 知识库复用前端 Supabase 客户端（使用 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）
export function getKnowledgeSupabase(): SupabaseClient {
  return supabaseClient;
}

export { isSupabaseConfigured };