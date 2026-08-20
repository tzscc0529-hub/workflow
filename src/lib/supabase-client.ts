import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 前端 Supabase 客户端（用于直传 Storage，需在 Vercel 配置 NEXT_PUBLIC_ 环境变量）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// 未配置时使用占位值创建客户端，避免模块加载阶段因空 URL/Key 抛异常崩溃整页。
// 调用方必须先检查 isSupabaseConfigured，再决定是否发起真实请求。
function createSafeClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabaseClient: SupabaseClient = createSafeClient();