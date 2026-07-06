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

  const dates = Array.isArray(body.dates)
    ? body.dates.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "회의 후보 날짜(범위)가 필요해요." },
      { status: 400 }
    );
  }
  const scope = ["thisWeek", "nextWeek", "thisMonth"].includes(body.scope)
    ? body.scope
    : "thisWeek";
  const hourStart = Number.isFinite(body.hourStart) ? Number(body.hourStart) : 9;
  const hourEnd = Number.isFinite(body.hourEnd) ? Number(body.hourEnd) : 18;
  // 눈금 30분 고정(현재). 회의 길이: step의 배수, step~범위 전체 분으로 clamp.
  const stepMin = Number(body.stepMin) === 60 ? 60 : 30;
  const windowMin = Math.max(stepMin, (hourEnd - hourStart) * 60);
  const rawDur = Math.round((Number(body.durationMin) || 60) / stepMin) * stepMin;
  const durationMin = Math.min(windowMin, Math.max(stepMin, rawDur));
  const durLabel =
    durationMin % 60 === 0
      ? `${durationMin / 60}시간`
      : durationMin < 60
        ? `${durationMin}분`
        : `${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분`;

  const participants: Participant[] = cleaned.map((p) => ({
    id: genId("p"),
    name: p.name,
    required: p.required,
    registered: false,
    busyHard: [],
    busySoft: [],
  }));

  const meeting: Meeting = {
    code: await genCode(),
    title,
    durationLabel: (body.durationLabel || durLabel).trim(),
    durationMin,
    stepMin,
    deadlineLabel: (body.deadlineLabel || "미정").trim(),
    scope,
    dates,
    hourStart,
    hourEnd,
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
