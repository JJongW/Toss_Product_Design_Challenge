import { NextResponse } from "next/server";
import { getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import type { PreferencesBody, SoftPrefs } from "@/lib/types";

const SOFT_KEYS: (keyof SoftPrefs)[] = [
  "postLunch",
  "earlyMorning",
  "morningFocus",
  "afternoonSlump",
  "lateAfternoon",
  "friPM",
];

// POST /api/meetings/:code/preferences — 참여자가 자기 시간 규칙을 비공개로 등록.
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

  let body: PreferencesBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const soft: SoftPrefs = {};
  for (const k of SOFT_KEYS) if (body.soft?.[k]) soft[k] = true;

  const hardDays = Array.isArray(body.hardDays)
    ? Array.from(new Set(body.hardDays.filter((d) => d >= 0 && d <= 4)))
    : [];

  const participant = meeting.participants.find(
    (p) => p.id === body.participantId
  );
  if (!participant) {
    return NextResponse.json(
      { error: "참여자를 찾지 못했어요." },
      { status: 404 }
    );
  }
  participant.soft = soft;
  participant.hardDays = hardDays;
  participant.registered = true;
  await saveMeeting(meeting);

  return NextResponse.json({ ok: true, meeting: meetingSummary(meeting) });
}
