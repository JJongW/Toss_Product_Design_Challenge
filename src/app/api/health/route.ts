import { NextResponse } from "next/server";
import { usingKv } from "@/lib/store";

// GET /api/health — 저장소 상태 점검.
// kv=false 인데 serverless(=Vercel)면, 요청마다 인스턴스가 달라 초대코드가
// 유실될 수 있다. 클라이언트는 이 값으로 조직자에게 경고를 띄운다.
export async function GET() {
  return NextResponse.json({
    kv: usingKv(),
    serverless: Boolean(process.env.VERCEL),
  });
}
