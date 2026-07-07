// 회의 생성/수정 입력의 공용 검증·정규화. POST(create)·PUT(update)가 함께 쓴다.
// 한 곳에서 검증하므로 두 경로의 규칙이 어긋나지 않는다.

import type { CreateMeetingBody, Scope } from "./types";

export interface NormalizedConfig {
  title: string;
  durationLabel: string;
  durationMin: number;
  stepMin: number;
  deadlineLabel: string;
  scope: Scope;
  dates: string[];
  hourStart: number;
  hourEnd: number;
  participants: Array<{ name: string; required: boolean }>;
}

export type NormalizeResult =
  | { ok: true; config: NormalizedConfig }
  | { ok: false; error: string; status: number };

export function normalizeMeetingInput(body: CreateMeetingBody): NormalizeResult {
  const title = (body.title || "").trim() || "새 회의";

  const rawParticipants = Array.isArray(body.participants)
    ? body.participants
    : [];
  const participants = rawParticipants
    .map((p) => ({ name: (p?.name || "").trim(), required: Boolean(p?.required) }))
    .filter((p) => p.name.length > 0);
  // 핵심 규칙: 회의는 2명 이상이어야 성립한다 (인원 상한은 없음).
  if (participants.length < 2) {
    return { ok: false, error: "회의에는 참여자가 2명 이상 필요해요.", status: 400 };
  }

  const dates = Array.isArray(body.dates)
    ? body.dates.filter(
        (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
      )
    : [];
  if (dates.length === 0) {
    return { ok: false, error: "회의 후보 날짜(범위)가 필요해요.", status: 400 };
  }

  const scope: Scope = ["thisWeek", "nextWeek", "thisMonth"].includes(body.scope)
    ? body.scope
    : "thisWeek";

  const hourStart = Number.isFinite(body.hourStart) ? Number(body.hourStart) : 9;
  const hourEnd = Number.isFinite(body.hourEnd) ? Number(body.hourEnd) : 18;
  if (!(hourEnd > hourStart)) {
    return {
      ok: false,
      error: "시간대 끝은 시작보다 늦어야 해요.",
      status: 400,
    };
  }

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

  return {
    ok: true,
    config: {
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
    },
  };
}
