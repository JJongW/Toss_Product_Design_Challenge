import { NextResponse } from "next/server";
import { genCode, genId, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import { normalizeMeetingInput } from "@/lib/meetingInput";
import type { CreateMeetingBody, Meeting, Participant } from "@/lib/types";

// POST /api/meetings — 회의 생성 → 초대코드 발급
export async function POST(req: Request) {
  let body: CreateMeetingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const r = normalizeMeetingInput(body);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const c = r.config;

  const participants: Participant[] = c.participants.map((p) => ({
    id: genId("p"),
    name: p.name,
    required: p.required,
    registered: false,
    busyHard: [],
    busySoft: [],
  }));

  const meeting: Meeting = {
    code: await genCode(),
    title: c.title,
    durationLabel: c.durationLabel,
    durationMin: c.durationMin,
    stepMin: c.stepMin,
    deadlineLabel: c.deadlineLabel,
    scope: c.scope,
    dates: c.dates,
    hourStart: c.hourStart,
    hourEnd: c.hourEnd,
    participants,
    decidedSlotId: null,
    createdAt: Date.now(),
  };

  await saveMeeting(meeting);
  return NextResponse.json(
    { code: meeting.code, meeting: meetingSummary(meeting) },
    { status: 201 }
  );
}
