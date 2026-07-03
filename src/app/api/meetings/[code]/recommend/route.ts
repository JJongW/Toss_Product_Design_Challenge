import { NextResponse } from "next/server";
import { getMeeting } from "@/lib/store";
import { buildRecommend } from "@/lib/serialize";

// GET /api/meetings/:code/recommend — 서버가 추천을 계산해 프라이버시 안전한 뷰로 반환.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  const meeting = await getMeeting(code);
  if (!meeting) {
    return NextResponse.json(
      { error: "그런 초대 코드를 찾지 못했어요." },
      { status: 404 }
    );
  }
  return NextResponse.json(buildRecommend(meeting));
}
