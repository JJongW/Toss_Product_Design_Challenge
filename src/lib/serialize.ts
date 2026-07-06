// 추천 결과를 클라이언트로 내보낼 때, 프라이버시를 서버에서 강제한다.
// - 필수 인원 중 "불가/미응답"인 사람의 이름은 조정 요청을 위해 노출.
// - "아쉬움(soft)"은 누구인지·이유를 절대 내보내지 않고 개수만 노출.

import { compute, meetingDuration, meetingStep, slotLabel, STATE } from "./engine";
import type { Meeting, Scope, SlotEval } from "./types";

export interface SlotView {
  id: string;
  label: string;
  requiredOkCount: number;
  requiredTotal: number;
  optionalOk: number;
  optionalTotal: number;
  softCount: number;
  reqUnknown: number;
  hardRequiredNames: string[];
  unknownRequiredNames: string[];
}

export interface RecommendView {
  meeting: {
    code: string;
    title: string;
    durationLabel: string;
    deadlineLabel: string;
    scope: Scope;
    rangeLabel: string;
    decidedSlotId: string | null;
    participantCount: number;
    registeredCount: number;
    requiredTotal: number;
    optionalTotal: number;
  };
  hasFloor: boolean;
  ranked: SlotView[];
  blocked: SlotView[];
}

function toView(e: SlotEval, durationMin: number, stepMin: number): SlotView {
  const hardRequiredNames = e.states
    .filter((x) => x.person.required && x.state === STATE.HARD)
    .map((x) => x.person.name);
  const unknownRequiredNames = e.states
    .filter((x) => x.person.required && x.state === STATE.UNKNOWN)
    .map((x) => x.person.name);
  return {
    id: e.slot.id,
    label: slotLabel(e.slot, durationMin, stepMin),
    requiredOkCount: e.requiredOkCount,
    requiredTotal: e.requiredTotal,
    optionalOk: e.optionalOk,
    optionalTotal: e.optionalTotal,
    softCount: e.softCount, // 개수만 — 신원/사유는 비공개
    reqUnknown: e.reqUnknown,
    hardRequiredNames,
    unknownRequiredNames,
  };
}

function rangeLabel(meeting: Meeting): string {
  const d = meeting.dates || [];
  if (!d.length) return "";
  const first = d[0].slice(5).replace("-", "/");
  const last = d[d.length - 1].slice(5).replace("-", "/");
  return d.length === 1 ? first : `${first}~${last}`;
}

export function buildRecommend(meeting: Meeting): RecommendView {
  const r = compute(meeting);
  const durMin = meetingDuration(meeting);
  const stepMin = meetingStep(meeting);
  const registeredCount = meeting.participants.filter((p) => p.registered).length;
  const requiredTotal = meeting.participants.filter((p) => p.required).length;
  return {
    meeting: {
      code: meeting.code,
      title: meeting.title,
      durationLabel: meeting.durationLabel,
      deadlineLabel: meeting.deadlineLabel,
      scope: meeting.scope,
      rangeLabel: rangeLabel(meeting),
      decidedSlotId: meeting.decidedSlotId,
      participantCount: meeting.participants.length,
      registeredCount,
      requiredTotal,
      optionalTotal: meeting.participants.length - requiredTotal,
    },
    hasFloor: r.ranked.length > 0,
    ranked: r.ranked.slice(0, 5).map((e) => toView(e, durMin, stepMin)),
    blocked: r.blocked.slice(0, 2).map((e) => toView(e, durMin, stepMin)),
  };
}

/** 참여자/조직자 화면용 회의 개요(선호 데이터는 제외). */
export function meetingSummary(meeting: Meeting) {
  return {
    code: meeting.code,
    title: meeting.title,
    durationLabel: meeting.durationLabel,
    durationMin: meeting.durationMin,
    stepMin: meeting.stepMin,
    deadlineLabel: meeting.deadlineLabel,
    scope: meeting.scope,
    dates: meeting.dates,
    hourStart: meeting.hourStart,
    hourEnd: meeting.hourEnd,
    participants: meeting.participants.map((p) => ({
      id: p.id,
      name: p.name,
      required: p.required,
      registered: p.registered,
    })),
  };
}
