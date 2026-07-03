import { NextResponse } from "next/server";
import { getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import type { DecideBody } from "@/lib/types";

// POST /api/meetings/:code/decide — 조직자가 최종 시간을 확정.
export async function POST(
  req: Request,
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

  let body: DecideBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  if (!body.slotId) {
    return NextResponse.json({ error: "시간을 골라주세요." }, { status: 400 });
  }

  meeting.decidedSlotId = body.slotId;
  await saveMeeting(meeting);
  return NextResponse.json({ ok: true, meeting: meetingSummary(meeting) });
}
