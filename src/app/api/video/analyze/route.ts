import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const FILE_PROCESS_TIMEOUT_SECONDS = 1800;
const POLL_INTERVAL_SECONDS = 5;

function stateName(fileObj: Record<string, unknown>): string {
  const state = fileObj.state as Record<string, string> | undefined;
  return state?.name ?? String(fileObj.state ?? "");
}

async function waitForProcessing(
  ai: GoogleGenAI,
  fileName: string
): Promise<Record<string, unknown>> {
  const started = Date.now();

  while (true) {
    const fileObj = (await ai.files.get({ name: fileName })) as unknown as Record<string, unknown>;
    const currentState = stateName(fileObj);

    if (currentState === "ACTIVE" || currentState === "") {
      return fileObj;
    }

    if (currentState === "FAILED") {
      const error = fileObj.error as Record<string, string> | undefined;
      throw new Error(`视频处理失败: ${error?.message ?? "未知错误"}`);
    }

    if (currentState !== "PROCESSING") {
      throw new Error(`视频状态异常: ${currentState}`);
    }

    const elapsed = (Date.now() - started) / 1000;
    if (elapsed >= FILE_PROCESS_TIMEOUT_SECONDS) {
      throw new Error(`视频处理超时 (${FILE_PROCESS_TIMEOUT_SECONDS}秒)`);
    }

    await new Promise((r) =>
      setTimeout(r, Math.min(POLL_INTERVAL_SECONDS * 1000, Math.max(0, (FILE_PROCESS_TIMEOUT_SECONDS - elapsed) * 1000)))
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const model = (formData.get("model") as string) || "gemini-2.5-flash";
    const apiKeyOverride = (formData.get("apiKey") as string) || "";

    if (!videoFile) {
      return NextResponse.json({ error: "请上传视频文件" }, { status: 400 });
    }

    const key = (
      apiKeyOverride ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    if (!key) {
      return NextResponse.json({ error: "未配置 Gemini API Key" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // Step 1: Upload video directly to Gemini Files API
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    const uploadResult = (await ai.files.upload({
      file: new Blob([videoBuffer], { type: videoFile.type || "video/mp4" }),
      config: {
        displayName: videoFile.name,
      },
    })) as unknown as Record<string, unknown>;

    const fileUri = uploadResult.uri as string;
    const fileName = uploadResult.name as string;

    if (!fileUri || !fileName) {
      return NextResponse.json({ error: "上传到 Gemini 失败" }, { status: 500 });
    }

    // Step 2: Wait for video processing
    const processedFile = await waitForProcessing(ai, fileName);

    // Step 3: Analyze with Gemini
    const systemPrompt = `你是一个专业的视频内容分析师。请仔细分析视频，输出 JSON 格式结果：

{
  "summary": "视频概要，一段话概括主要内容",
  "key_scenes": ["关键场景1", "关键场景2", "关键场景3"],
  "elements": ["视觉元素1", "视觉元素2"],
  "style": "视频节奏与风格描述",
  "tags": ["标签1", "标签2"]
}

标签从以下选择 1-2 个：解说向、玩法向、展示向、剧情演绎、前贴、全贴
- 解说向：以旁白/语音解说为主，信息密度高
- 玩法向：展示游戏操作流程、技巧或机制
- 展示向：以视觉画面展示为核心，强调观赏性
- 剧情演绎：有明确故事线、角色表演和剧情推进
- 前贴：适合作为片头/开场引导，时长较短
- 全贴：完整独立内容，结构完整`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              fileData: {
                fileUri: (processedFile.uri as string) || fileUri,
                mimeType: videoFile.type || "video/mp4",
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
      },
    });

    const rawContent = response.text || "";

    let analysisResult: Record<string, unknown> = {};
    try {
      analysisResult = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisResult = JSON.parse(jsonMatch[0]);
        } catch {
          analysisResult = { raw: rawContent };
        }
      } else {
        analysisResult = { raw: rawContent };
      }
    }

    const tags = (analysisResult.tags as string[]) || [];
    const primaryCategory = tags.length > 0 ? tags[0] : "未分类";

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      tags,
      category: primaryCategory,
      videoName: videoFile.name,
    });
  } catch (error) {
    console.error("视频分析失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 }
    );
  }
}