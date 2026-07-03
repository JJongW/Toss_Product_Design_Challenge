import { NextResponse } from "next/server";
import { genCode, genId, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import type { CreateMeetingBody, Meeting, Participant } from "@/lib/types";

// POST /api/meetings — 회의 생성 → 초대코드 발급
export async function POST(req: Request) {
  let body: CreateMeetingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const title = (body.title || "").trim() || "새 회의";
  const rawParticipants = Array.isArray(body.participants)
    ? body.participants
    : [];

  const cleaned = rawParticipants
    .map((p) => ({
      name: (p?.name || "").trim(),
      required: Boolean(p?.required),
    }))
    .filter((p) => p.name.length > 0);

  // 핵심 규칙: 회의는 2명 이상이어야 성립한다 (인원 상한은 없음).
  if (cleaned.length < 2) {
    return NextResponse.json(
      { error: "회의에는 참여자가 2명 이상 필요해요." },
      { status: 400 }
    );
  }

  const participants: Participant[] = cleaned.map((p) => ({
    id: genId("p"),
    name: p.name,
    required: p.required,
    registered: false,
    soft: {},
    hardDays: [],
  }));

  const meeting: Meeting = {
    code: await genCode(),
    title,
    durationLabel: (body.durationLabel || "1시간").trim(),
    deadlineLabel: (body.deadlineLabel || "이번 주 금요일").trim(),
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
