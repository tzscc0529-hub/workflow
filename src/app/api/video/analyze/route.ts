import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const VIDEO_CATEGORIES = ["解说向", "玩法向", "展示向", "剧情演绎", "前贴", "全贴"] as const;

// ============================================================================
// 本地成熟分析提示词（自 analyst.py 的 ANALYSIS_PROMPT 完整迁移，逐字保真）
// 仅在 JSON 输出结构中追加 category / tags 两个字段，用于自动打标签（6 类）。
// ============================================================================
const ANALYSIS_PROMPT = `你是一位资深的游戏买量广告创意总监与视频广告分析专家，擅长从专业影视语言角度拆解爆款视频的底层逻辑和结构。
请对这个视频进行**逐镜头级别**的精细化拆解，结合视频画面、音频字幕及画面文字，从以下维度分析每一个镜头：
- 镜号（按顺序编号）
- 时间段
- 视角/机位（如 第一人称、第三人称过肩、俯视、仰视、特写、远景）
- 运镜方式（如 推、拉、摇、移、跟、甩镜、固定、手持晃动）
- 拍摄角度（如 平视、俯拍、仰拍、荷兰角）
- 画面光线（如 逆光、顶光、柔光、高对比硬光、闪光切换）
- 色温（如 暖色调偏黄、冷色调偏蓝、中性色温，可给出大致数值范围）
- 美术风格（如 写实、卡通、赛博朋克、水墨、像素风）
- 画面内容描述
- 旁白/音效/音乐描述
- 创意意图（为什么这么设计）
- 骨架标签（如 黄金3秒/痛点铺垫/玩法展示/转化点/CTA）
请只输出一个JSON对象，不要输出任何JSON以外的文字、markdown代码块标记或说明。JSON结构如下：
{
  "core_highlight": "一句话说明这个视频为什么能吸引人",
  "attraction_breakdown": {
    "hook_mechanism": "开篇钩子具体手法",
    "curiosity_gap": "制造的悬念/信息差",
    "emotional_trigger": "触发的核心情绪",
    "pacing_rhythm": "剪辑节奏与信息密度分析",
    "sensory_stimulation": "画面/音效带来的感官刺激点"
  },
  "segments": [
    {
      "shot_number": "镜号，如 01",
      "time_range": "时间段，如 0:00-0:03",
      "pov": "视角/机位",
      "camera_movement": "运镜方式",
      "shot_angle": "拍摄角度",
      "lighting": "画面光线",
      "color_temperature": "色温",
      "art_style": "美术风格",
      "visual_description": "画面内容描述",
      "audio_or_sfx": "旁白/音效/音乐描述",
      "creative_intent": "创意意图",
      "skeleton_tag": "骨架标签"
    }
  ],
  "pain_point_analysis": "视频抓住了玩家的什么心理痛点",
  "improvement_suggestions": "如果基于这个视频迭代，会怎么修改",
  "suggested_folder_name": "根据视频核心内容生成一个简短英文/拼音短名，如 sniper-headshot-hook",
  "category": "从以下类别中判断最贴切的一个：解说向、玩法向、展示向、剧情演绎、前贴、全贴",
  "tags": ["提炼 3-6 个用于分类检索的关键词标签"]
}`;

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("、");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function inferMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    webm: "video/webm",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
  };
  return map[ext] ?? "video/mp4";
}

// 从完整 fileUri（https://.../v1beta/files/xxx）推导 Gemini 资源名（files/xxx）。
function geminiNameFromUri(uri: string): string {
  const match = uri.match(/\/files\/([^/?]+)/);
  return match ? `files/${match[1]}` : uri;
}

// 把 Gemini 返回的原始 JSON 结构规整为统一的分析结果，并确保 category/tags 就绪。
function normalizeAnalysis(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new Error("Gemini 返回内容不是有效 JSON 对象");
  }
  const data = raw as Record<string, unknown>;

  const required = [
    "core_highlight",
    "attraction_breakdown",
    "segments",
    "pain_point_analysis",
    "improvement_suggestions",
  ];
  const missing = required.filter((key) => !data[key]);
  if (missing.length > 0) {
    throw new Error(`Gemini 返回缺少字段：${missing.join(", ")}`);
  }
  if (!Array.isArray(data.segments) || data.segments.length === 0) {
    throw new Error("Gemini 返回的 segments 必须是非空数组");
  }

  let category = asText(data.category).trim();
  if (!VIDEO_CATEGORIES.includes(category as (typeof VIDEO_CATEGORIES)[number])) {
    category = VIDEO_CATEGORIES[0];
  }

  let tags: string[] = Array.isArray(data.tags)
    ? data.tags.map(asText).filter(Boolean).slice(0, 8)
    : [];
  if (tags.length === 0) tags = [category];

  return {
    ...data,
    category,
    tags,
    suggested_folder_name: asText(data.suggested_folder_name) || "video-analysis",
  };
}

// 生成与原 JSON 结构一致的 Markdown 报告（供用户预览与下载）。
function generateMarkdownReport(
  analysis: Record<string, unknown>,
  videoName: string
): string {
  const core = asText(analysis.core_highlight);
  const breakdown = (analysis.attraction_breakdown ?? {}) as Record<string, unknown>;
  const segments = Array.isArray(analysis.segments)
    ? (analysis.segments as Record<string, unknown>[])
    : [];
  const painPoint = asText(analysis.pain_point_analysis);
  const improvement = asText(analysis.improvement_suggestions);
  const folder = asText(analysis.suggested_folder_name);
  const category = asText(analysis.category);
  const tags = Array.isArray(analysis.tags)
    ? analysis.tags.map(asText).filter(Boolean)
    : [];

  const lines: string[] = [];
  lines.push(`# 视频骨架分析报告`);
  lines.push("");
  lines.push(`> 视频文件：${videoName}`);
  lines.push(`> 生成时间：${new Date().toLocaleString("zh-CN")}`);
  if (category) lines.push(`> 内容分类：${category}`);
  lines.push("");

  lines.push("## 核心亮点");
  lines.push(core || "（无）");
  lines.push("");

  lines.push("## 吸引力拆解");
  const breakdownRows: Array<[string, string]> = [
    ["钩子机制", asText(breakdown.hook_mechanism)],
    ["悬念/信息差", asText(breakdown.curiosity_gap)],
    ["核心情绪", asText(breakdown.emotional_trigger)],
    ["节奏与信息密度", asText(breakdown.pacing_rhythm)],
    ["感官刺激点", asText(breakdown.sensory_stimulation)],
  ];
  for (const [label, value] of breakdownRows) {
    if (value) lines.push(`- **${label}**：${value}`);
  }
  lines.push("");

  lines.push("## 逐镜头拆解");
  if (segments.length === 0) {
    lines.push("（无镜头数据）");
  } else {
    segments.forEach((seg, index) => {
      const shotNumber = asText(seg.shot_number) || String(index + 1).padStart(2, "0");
      const timeRange = asText(seg.time_range);
      lines.push("");
      lines.push(`### 镜头 ${shotNumber}${timeRange ? `（${timeRange}）` : ""}`);
      lines.push("");
      lines.push("| 维度 | 内容 |");
      lines.push("| --- | --- |");
      const rows: Array<[string, string]> = [
        ["视角/机位", asText(seg.pov)],
        ["运镜方式", asText(seg.camera_movement)],
        ["拍摄角度", asText(seg.shot_angle)],
        ["画面光线", asText(seg.lighting)],
        ["色温", asText(seg.color_temperature)],
        ["美术风格", asText(seg.art_style)],
        ["画面内容", asText(seg.visual_description)],
        ["旁白/音效/音乐", asText(seg.audio_or_sfx)],
        ["创意意图", asText(seg.creative_intent)],
        ["骨架标签", asText(seg.skeleton_tag)],
      ];
      for (const [label, value] of rows) {
        if (value) {
          lines.push(`| ${label} | ${value.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`);
        }
      }
    });
  }
  lines.push("");

  lines.push("## 痛点分析");
  lines.push(painPoint || "（无）");
  lines.push("");

  lines.push("## 迭代改进建议");
  lines.push(improvement || "（无）");
  lines.push("");

  lines.push("## 标签");
  if (category) lines.push(`- 分类：${category}`);
  if (tags.length > 0) lines.push(`- 标签：${tags.join("、")}`);
  lines.push("");

  lines.push("## 建议文件夹名");
  lines.push(`\`${folder}\``);
  lines.push("");

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 Gemini API Key（GEMINI_API_KEY / GOOGLE_API_KEY）" },
        { status: 500 }
      );
    }

    // 1. 接收前端直传后返回的 Gemini 文件标识（不再接收视频字节）。
    let body: {
      fileUri?: string;
      geminiName?: string;
      fileName?: string;
      mimeType?: string;
      model?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
    }

    const fileUri = typeof body.fileUri === "string" ? body.fileUri.trim() : "";
    if (!fileUri) {
      return NextResponse.json({ error: "缺少 Gemini 文件标识（fileUri）" }, { status: 400 });
    }

    const geminiName =
      typeof body.geminiName === "string" && body.geminiName.trim()
        ? body.geminiName.trim()
        : geminiNameFromUri(fileUri);

    const fileName =
      typeof body.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : "video.mp4";

    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim()
        : inferMimeType(fileName);

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : "gemini-2.5-flash";

    const ai = new GoogleGenAI({ apiKey });

    // 2. 等待 Gemini 处理完成（文件由前端已上传，此时状态应为 PROCESSING → ACTIVE）。
    let fileState = "PROCESSING";
    for (let i = 0; i < 30; i++) {
      const state = (await ai.files.get({ name: geminiName })) as { state?: string };
      fileState = state.state || "PROCESSING";
      if (fileState === "ACTIVE" || fileState === "FAILED") break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (fileState === "FAILED") {
      return NextResponse.json({ error: "视频在 Gemini 中处理失败" }, { status: 500 });
    }
    if (fileState !== "ACTIVE") {
      return NextResponse.json({ error: "视频处理超时" }, { status: 500 });
    }

    // 3. 调用 Gemini 分析（使用本地成熟提示词，fileData 附带 MIME 类型）。
    let responseText = "";
    try {
      const result = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: ANALYSIS_PROMPT }, { fileData: { fileUri, mimeType } }],
          },
        ],
      });
      responseText = result.text ?? "";
    } catch (error) {
      return NextResponse.json(
        { error: `Gemini 分析失败：${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }

    // 4. 解析并规整 JSON。
    let analysis: Record<string, unknown>;
    try {
      const cleaned = responseText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      analysis = normalizeAnalysis(JSON.parse(cleaned));
    } catch (error) {
      return NextResponse.json(
        { error: `解析分析结果失败：${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }

    // 5. 生成 Markdown 报告，直接在响应体中返回。
    const reportMarkdown = generateMarkdownReport(analysis, fileName);

    return NextResponse.json({ analysis, reportMarkdown });
  } catch (error) {
    console.error("视频分析失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "视频分析失败" },
      { status: 500 }
    );
  }
}