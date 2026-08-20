import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase(useServiceRole = false) {
  const url = process.env.SUPABASE_URL;
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase 配置缺失");
  }
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase(true);
    const { data, error } = await supabase
      .from("video_analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("获取记忆失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase(true);
    const body = await request.json();

    const { data, error } = await supabase
      .from("video_analyses")
      .insert({
        video_name: body.videoName,
        video_url: body.videoUrl,
        analysis_result: body.analysisResult,
        report_markdown: body.reportMarkdown,
        report_url: body.reportUrl,
        tags: body.tags,
        category: body.category,
        status: body.status || "completed",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("保存记忆失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase(true);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少记录 ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("video_analyses")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除记忆失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}