import { NextResponse } from "next/server";

export const runtime = "nodejs";

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 10) return `${key.slice(0, 2)}...${key.slice(-2)}`;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const configured = apiKey.length > 0;
  return NextResponse.json({
    configured,
    masked: configured ? maskKey(apiKey) : "",
  });
}