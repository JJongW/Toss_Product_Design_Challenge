import { NextResponse } from "next/server";
import { genId, getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import { normalizeMeetingInput } from "@/lib/meetingInput";
import type { CreateMeetingBody, Participant } from "@/lib/types";

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

// PUT /api/meetings/:code — 이미 만든 회의를 같은 코드로 수정(공유 전 편집).
// 조직자가 초대 화면에서 뒤로 가 설정을 고치면 새 코드를 또 만들지 않고
// 이 회의를 갱신한다(고아 코드 방지). 이미 응답한 참여자의 가용성은
// 이름 매칭으로 승계한다.
export async function PUT(
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

  // 같은 이름은 기존 참여자(가용성·등록 상태)를 유지, 새 이름은 새로 추가, 빠진 이름은 제외.
  const prevByName = new Map(meeting.participants.map((p) => [p.name, p]));
  const participants: Participant[] = c.participants.map((np) => {
    const prev = prevByName.get(np.name);
    return prev
      ? { ...prev, required: np.required }
      : {
          id: genId("p"),
          name: np.name,
          required: np.required,
          registered: false,
          busyHard: [],
          busySoft: [],
        };
  });

  meeting.title = c.title;
  meeting.durationLabel = c.durationLabel;
  meeting.durationMin = c.durationMin;
  meeting.stepMin = c.stepMin;
  meeting.deadlineLabel = c.deadlineLabel;
  meeting.scope = c.scope;
  meeting.dates = c.dates;
  meeting.hourStart = c.hourStart;
  meeting.hourEnd = c.hourEnd;
  meeting.participants = participants;
  // 후보 범위가 바뀌었으니 이전에 확정한 슬롯은 무효화한다.
  meeting.decidedSlotId = null;

  await saveMeeting(meeting);
  return NextResponse.json({ code: meeting.code, meeting: meetingSummary(meeting) });
}
