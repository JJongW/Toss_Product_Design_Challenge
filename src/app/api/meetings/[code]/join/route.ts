import { NextResponse } from "next/server";
import { getMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import type { JoinBody } from "@/lib/types";

// POST /api/meetings/:code/join — 초대코드로 자기 자리 찾기.
// 로스터-락: 조직자가 넣은 명단에 있는 이름만 입장할 수 있다.
// 명단에 없는 이름은 거절해 무단 입장·중복 신원(민수/김민수/…)을 막는다.
// 명단에 있으면 등록 여부와 무관하게 그 슬롯을 돌려줘, 링크로 다시 들어와
// 자기 시간을 수정하는 것도 허용한다.
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

  const slot = meeting.participants.find((p) => p.name === name);
  if (!slot) {
    return NextResponse.json(
      { error: "명단에 없는 이름이에요. 조직자에게 확인해 주세요." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    participantId: slot.id,
    meeting: meetingSummary(meeting),
  });
}
