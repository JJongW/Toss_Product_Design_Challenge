import { NextResponse } from "next/server";
import { getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import type { SoftPrefs } from "@/lib/types";

// 데모용 샘플 선호. 실제 서비스엔 없다 — 한 사람이 여러 기기를 열지 않고도
// 추천이 어떻게 나오는지 보여주기 위한 시연 보조 엔드포인트다.
const SAMPLE: Array<{ soft: SoftPrefs; hardDays: number[] }> = [
  { soft: { morningFocus: true, earlyMorning: true }, hardDays: [] },
  { soft: { postLunch: true }, hardDays: [] },
  { soft: { lateAfternoon: true }, hardDays: [1, 3] },
  { soft: { earlyMorning: true }, hardDays: [] },
  { soft: { afternoonSlump: true }, hardDays: [] },
  { soft: { friPM: true }, hardDays: [] },
];

// POST /api/meetings/:code/seed — 미등록 참여자 일부를 샘플 규칙으로 등록(시연용).
export async function POST(
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

  let n = 0;
  let si = 0;
  for (const p of meeting.participants) {
    if (p.registered) continue;
    if (n >= 2) break; // 한 번에 2명씩
    const s = SAMPLE[si % SAMPLE.length];
    si += 1;
    p.soft = { ...s.soft };
    p.hardDays = [...s.hardDays];
    p.registered = true;
    n += 1;
  }

  if (n > 0) await saveMeeting(meeting);
  return NextResponse.json({ seeded: n, meeting: meetingSummary(meeting) });
}
