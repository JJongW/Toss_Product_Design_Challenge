import { NextResponse } from "next/server";
import { getMeeting, saveMeeting } from "@/lib/store";
import { meetingSummary } from "@/lib/serialize";
import { meetingSlots, meetingStep } from "@/lib/engine";
import type { Meeting } from "@/lib/types";

// 데모용: 미등록 참여자 일부를 "그럴듯한 안 되는 시간"으로 채운다(시연 보조).
// 실제 서비스엔 없다. 각 페르소나는 회의의 실제 날짜 범위에서 시간대(정시 from~to)를
// 골라 30분 눈금 슬롯 id로 펼쳐 hard(불가)·soft(피하고 싶음)로 찍는다.

// day: 범위 안 며칠째, from~to: 시(정시, from 포함 ~ to 제외)
const PERSONAS: Array<{
  hard: Array<{ day: number; from: number; to: number }>;
  softH: number[]; // 매 날 이 시(정시 한 시간)를 되도록 피함
}> = [
  // 0~3 = 필수 참석자. 실제 날짜 앞쪽(월~화 오전)에 모두 되는 슬롯이 남도록 설계.
  { hard: [{ day: 0, from: 9, to: 11 }], softH: [13] }, // 월 오전 외근 + 점심직후 회피
  { hard: [{ day: 1, from: 14, to: 17 }], softH: [] }, // 화 오후 불가
  { hard: [], softH: [11] }, // 오전 11시 되도록 회피(소프트 충돌 유발)
  { hard: [{ day: 2, from: 11, to: 13 }], softH: [16, 17] }, // 수 점심 + 늦은 오후 회피
  // 4~5 = 선택 참석자. 4번은 이번 주 평일 대부분 외근이라 앞쪽 슬롯엔 못 옴(→ 선택 1/2).
  {
    hard: [
      { day: 0, from: 9, to: 18 },
      { day: 1, from: 9, to: 18 },
      { day: 2, from: 9, to: 18 },
    ],
    softH: [],
  },
  { hard: [{ day: 3, from: 9, to: 12 }], softH: [13] }, // 목 오전 불가 + 점심직후 회피
];

function paint(meeting: Meeting, persona: (typeof PERSONAS)[number]) {
  const dates = meeting.dates || [];
  const step = meetingStep(meeting);
  const inRange = new Set(meetingSlots(meeting).map((s) => s.id));
  const hard: string[] = [];
  const soft: string[] = [];
  const push = (arr: string[], date: string, from: number, to: number) => {
    for (let m = from * 60; m < to * 60; m += step) {
      const id = `${date}-${m}`;
      if (inRange.has(id)) arr.push(id);
    }
  };
  for (const b of persona.hard) {
    const date = dates[b.day];
    if (date) push(hard, date, b.from, b.to);
  }
  const hardSet = new Set(hard);
  for (const date of dates)
    for (const h of persona.softH) push(soft, date, h, h + 1);
  return { hard, soft: soft.filter((id) => !hardSet.has(id)) };
}

// POST /api/meetings/:code/seed — 미등록 참여자 최대 2명을 페르소나로 등록.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const meeting = await getMeeting(code);
  if (!meeting) {
    return NextResponse.json(
      { error: "그런 초대 코드를 찾지 못했어요." },
      { status: 404 },
    );
  }

  let n = 0;
  // 데모: 미등록 팀원 전원을 한 번에 채운다. 페르소나는 참여자 순번에 고정 매핑해
  // (필수 0~3 / 선택 4~5) 추천이 '필수 전원 가능 · 선택 일부 불가 · 소프트 충돌'처럼
  // 가중 판단이 드러나는 상태가 되게 한다. 솔로 평가자도 즉시 완전한 추천에 도달.
  meeting.participants.forEach((p, idx) => {
    if (p.registered) return;
    const persona = PERSONAS[idx % PERSONAS.length];
    const { hard, soft } = paint(meeting, persona);
    p.busyHard = hard;
    p.busySoft = soft;
    p.registered = true;
    n += 1;
  });

  if (n > 0) await saveMeeting(meeting);
  return NextResponse.json({ seeded: n, meeting: meetingSummary(meeting) });
}
