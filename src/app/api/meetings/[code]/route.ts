import { NextResponse } from "next/server";
import { getMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";

// GET /api/meetings/:code — 회의 개요 (참여 현황 조회 / 참여자 코드 확인)
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
  return NextResponse.json({ meeting: meetingSummary(meeting) });
}
