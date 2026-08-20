import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(_request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: "未配置 Gemini API Key（请在服务端环境变量设置 GEMINI_API_KEY）",
      });
    }

    // 真实调用 Gemini 的 models.list 端点验证密钥有效性
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey },
      cache: "no-store",
    });

    if (res.ok) {
      return NextResponse.json({ ok: true });
    }

    const text = await res.text();
    let detail = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      detail = parsed.error?.message ?? detail;
    } catch {
      // 非 JSON 错误体，保留 HTTP 状态码
    }

    return NextResponse.json({ ok: false, error: detail });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "无法连接 Gemini API",
    });
  }
}