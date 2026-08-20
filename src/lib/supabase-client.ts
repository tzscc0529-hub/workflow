import { createClient } from '@supabase/supabase-js';

// 前端 Supabase 客户端（用于直传 Storage，需在 Vercel 配置 NEXT_PUBLIC_ 环境变量）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);