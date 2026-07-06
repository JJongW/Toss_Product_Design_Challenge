import { NextResponse } from "next/server";
import { getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import { meetingSlots } from "@/lib/engine";
import type { PreferencesBody } from "@/lib/types";

// POST /api/meetings/:code/preferences — 참여자가 "안 되는 시간"을 비공개로 등록.
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

  // 등록된 슬롯 id만 허용(범위 밖 id는 버린다).
  const valid = new Set(meetingSlots(meeting).map((s) => s.id));
  const clean = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.filter((x): x is string => typeof x === "string" && valid.has(x))))
      : [];
  const busyHard = clean(body.busyHard);
  const hardSet = new Set(busyHard);
  // 같은 슬롯이 hard·soft 둘 다면 hard가 우선.
  const busySoft = clean(body.busySoft).filter((id) => !hardSet.has(id));

  const participant = meeting.participants.find(
    (p) => p.id === body.participantId
  );
  if (!participant) {
    return NextResponse.json(
      { error: "참여자를 찾지 못했어요." },
      { status: 404 }
    );
  }
  participant.busyHard = busyHard;
  participant.busySoft = busySoft;
  participant.registered = true;
  await saveMeeting(meeting);

  return NextResponse.json({ ok: true, meeting: meetingSummary(meeting) });
}
