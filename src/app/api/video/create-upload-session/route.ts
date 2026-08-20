import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

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

// 仅负责携带 GEMINI_API_KEY 向 Google Files API 发起 Resumable Upload 的
// start 初始握手，取得 uploadUrl（带 upload_id 的会话地址）后返回给浏览器。
// 真正的视频二进制流由前端直接 PUT 到 Google，从而完全绕过 Vercel 4.5MB 限制。
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 Gemini API Key（GEMINI_API_KEY / GOOGLE_API_KEY）" },
        { status: 500 }
      );
    }

    let body: { fileName?: string; fileSize?: number; mimeType?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
    }

    const fileName =
      typeof body.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim().replace(/[^\w\u4e00-\u9fa5.-]/g, "_")
        : "video.mp4";

    const fileSize =
      typeof body.fileSize === "number" && Number.isFinite(body.fileSize) && body.fileSize > 0
        ? body.fileSize
        : 0;

    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim()
        : inferMimeType(fileName);

    if (fileSize <= 0) {
      return NextResponse.json({ error: "缺少有效的 fileSize" }, { status: 400 });
    }

    // Resumable Upload 初始握手（start 命令），必须预先声明文件大小与 MIME。
    let startRes: Response;
    try {
      startRes = await fetch(
        "https://generativelanguage.googleapis.com/upload/v1beta/files",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(fileSize),
            "X-Goog-Upload-Header-Content-Type": mimeType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: fileName } }),
        }
      );
    } catch (error) {
      console.error("连接 Gemini API 失败:", error);
      return NextResponse.json(
        {
          error: `无法连接 Gemini API（网络不可达）：${
            error instanceof Error ? error.message : String(error)
          }`,
        },
        { status: 502 }
      );
    }

    if (!startRes.ok) {
      const errText = await startRes.text();
      return NextResponse.json(
        { error: `创建上传会话失败（${startRes.status}）：${errText}` },
        { status: startRes.status }
      );
    }

    // 响应头中的 x-goog-upload-url 即后续直接 PUT 视频字节的会话地址。
    const uploadUrl = startRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Google 未返回上传会话地址（x-goog-upload-url）" },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error("创建上传会话失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建上传会话失败" },
      { status: 500 }
    );
  }
}