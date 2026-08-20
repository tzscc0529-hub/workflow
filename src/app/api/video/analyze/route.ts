import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300; // 视频分析最长 5 分钟

const VIDEO_CATEGORIES = ["解说向", "玩法向", "展示向", "剧情演绎", "前贴", "全贴"];

function buildAnalysisPrompt(): string {
  return `你是一名专业的视频内容分析师。请仔细观看并分析下面这段视频，然后严格按照 JSON 格式返回分析结果。

请分析以下维度：
1. summary（摘要）：用 2-3 句话概括视频的核心内容。
2. category（类别）：从以下类别中选出最贴切的一个：${VIDEO_CATEGORIES.join("、")}。
3. tags（标签）：提取 3-6 个关键词标签，用于分类检索。
4. scenes（关键场景）：列出视频中 3-5 个关键画面/镜头，每个场景用一句话描述画面内容及其作用。
5. style（风格）：判断视频的整体风格（如写实、卡通、影视、纪录片等）。
6. elements（元素）：识别画面中的主要视觉元素（人物、场景、道具、特效等）。
7. targetAudience（目标受众）：推测视频面向哪类观众。

只返回 JSON，不要包含 markdown 代码块标记，不要输出任何解释性文字。JSON 结构如下：
{
  "summary": "string",
  "category": "string",
  "tags": ["string"],
  "scenes": ["string"],
  "style": "string",
  "elements": ["string"],
  "targetAudience": "string"
}`;
}

function generateMarkdownReport(
  analysis: Record<string, unknown>,
  videoName: string,
): string {
  const summary = String(analysis.summary ?? "无");
  const category = String(analysis.category ?? "未分类");
  const style = String(analysis.style ?? "未知");
  const targetAudience = String(analysis.targetAudience ?? "未知");
  const tags = Array.isArray(analysis.tags)
    ? analysis.tags.map(String).join("、")
    : "无";
  const scenes = Array.isArray(analysis.scenes)
    ? analysis.scenes.map(String)
    : [];
  const elements = Array.isArray(analysis.elements)
    ? analysis.elements.map(String)
    : [];

  const lines: string[] = [];
  lines.push(`# 视频分析报告`);
  lines.push("");
  lines.push(`> 生成时间：${new Date().toLocaleString("zh-CN")}`);
  lines.push("");
  lines.push(`## 视频信息`);
  lines.push("");
  lines.push(`- **文件名**：${videoName}`);
  lines.push(`- **类别**：${category}`);
  lines.push(`- **风格**：${style}`);
  lines.push(`- **目标受众**：${targetAudience}`);
  lines.push("");
  lines.push(`## 内容摘要`);
  lines.push("");
  lines.push(summary);
  lines.push("");
  lines.push(`## 关键词标签`);
  lines.push("");
  lines.push(tags);
  lines.push("");
  if (scenes.length > 0) {
    lines.push(`## 关键场景`);
    lines.push("");
    scenes.forEach((scene, i) => {
      lines.push(`${i + 1}. ${scene}`);
    });
    lines.push("");
  }
  if (elements.length > 0) {
    lines.push(`## 视觉元素`);
    lines.push("");
    elements.forEach((el) => {
      lines.push(`- ${el}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

interface AnalysisBody {
  videoUrl: string;
  videoName?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalysisBody;
    const { videoUrl, videoName = "video.mp4", model = "gemini-2.5-flash" } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "缺少 videoUrl 参数" },
        { status: 400 },
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 GEMINI_API_KEY 环境变量" },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. 从 Supabase Storage 公共 URL 下载视频
    const videoResp = await fetch(videoUrl, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!videoResp.ok) {
      return NextResponse.json(
        { error: `下载视频失败：HTTP ${videoResp.status}` },
        { status: 500 },
      );
    }
    const videoBuffer = await videoResp.arrayBuffer();
    const mimeType =
      videoResp.headers.get("content-type") || "video/mp4";

    // 2. 上传到 Gemini Files API
    const fileName = `web_${Date.now()}_${videoName}`;
    const uploadResult = await ai.files.upload({
      file: new File([videoBuffer], fileName, { type: mimeType }),
      config: { mimeType },
    });

    const fileUri = uploadResult.uri || "";
    const fileRemoteName = uploadResult.name || "";

    if (!fileUri || !fileRemoteName) {
      return NextResponse.json(
        { error: "视频上传到 Gemini 失败" },
        { status: 500 },
      );
    }

    // 3. 等待视频处理完成
    let fileState = uploadResult.state ?? "PROCESSING";
    const started = Date.now();
    const timeoutMs = 300_000;
    while (fileState === "PROCESSING") {
      if (Date.now() - started > timeoutMs) {
        return NextResponse.json(
          { error: "视频处理超时（超过 5 分钟）" },
          { status: 500 },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const fileInfo = await ai.files.get({ name: fileRemoteName });
      fileState = fileInfo.state ?? "ACTIVE";
    }

    if (fileState === "FAILED") {
      return NextResponse.json(
        { error: "视频在 Gemini 服务端解析失败" },
        { status: 500 },
      );
    }

    // 4. 调用 Gemini 分析
    const result = await ai.models.generateContent({
      model,
      contents: [
        { fileData: { fileUri, mimeType } },
        { text: buildAnalysisPrompt() },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const responseText = result.text?.trim() || "";
    if (!responseText) {
      return NextResponse.json({ error: "Gemini 返回空内容" }, { status: 500 });
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      // 尝试从可能带代码块的响应中提取 JSON
      const cleaned = responseText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      try {
        analysis = JSON.parse(cleaned);
      } catch {
        return NextResponse.json(
          { error: `Gemini 返回无法解析的内容：${responseText.slice(0, 200)}` },
          { status: 500 },
        );
      }
    }

    // 5. 生成 Markdown 报告
    const reportMarkdown = generateMarkdownReport(analysis, videoName);

    // 6. 上传报告到 Supabase Storage（reports 桶）
    let reportUrl = "";
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const safeName = videoName.replace(/[^\w\u4e00-\u9fa5.-]/g, "_");
        const reportPath = `reports/${Date.now()}_${safeName}.md`;
        const { error: uploadErr } = await supabase.storage
          .from("reports")
          .upload(reportPath, reportMarkdown, {
            contentType: "text/markdown",
            upsert: true,
          });
        if (!uploadErr) {
          const { data: publicUrl } = supabase.storage
            .from("reports")
            .getPublicUrl(reportPath);
          reportUrl = publicUrl.publicUrl || "";
        }
      } catch (reportErr) {
        // 报告上传失败不阻塞分析结果返回
        console.error("报告上传失败:", reportErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      reportMarkdown,
      reportUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("视频分析失败:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}