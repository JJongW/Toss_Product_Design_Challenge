import { NextResponse } from "next/server";
import { genId, getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import type { JoinBody, Participant } from "@/lib/types";

// POST /api/meetings/:code/join — 초대코드로 참여자 추가.
// 로스터에 같은 이름의 미등록 슬롯이 있으면 그 슬롯을 돌려주고(자기 자리 찾기),
// 없으면 새 참여자로 합류시킨다.
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

  let body: JoinBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "이름을 알려주세요." }, { status: 400 });
  }

  const existing = meeting.participants.find(
    (p) => p.name === name && !p.registered
  );
  if (existing) {
    return NextResponse.json({
      participantId: existing.id,
      meeting: meetingSummary(meeting),
    });
  }

  const participant: Participant = {
    id: genId("p"),
    name,
    required: false, // 로스터 밖에서 합류한 사람은 기본 선택 인원
    registered: false,
    soft: {},
    hardDays: [],
  };
  meeting.participants.push(participant);
  await saveMeeting(meeting);
  return NextResponse.json(
    { participantId: participant.id, meeting: meetingSummary(meeting) },
    { status: 201 }
  );
}
