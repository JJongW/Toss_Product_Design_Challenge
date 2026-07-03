// 핏타임 추천 엔진 — legacy 프로토타입의 rankSlots 로직을 타입 안전하게 이식.
// 참여자 수(N)에 독립적이다. 2명이든 60명이든 동일하게 동작한다.

import type {
  Participant,
  PersonStateValue,
  Ranking,
  Slot,
  SlotEval,
} from "./types";

export const WEEKDAYS = ["월", "화", "수", "목", "금"] as const;

export const STATE = {
  OK: "가능",
  SOFT: "아쉬움",
  UNKNOWN: "미응답",
  HARD: "불가",
} as const satisfies Record<string, PersonStateValue>;

export function personState(p: Participant, slot: Slot): PersonStateValue {
  if (!p.registered) return STATE.UNKNOWN;
  if (p.hardDays && p.hardDays.indexOf(slot.dayIdx) !== -1) return STATE.HARD;
  const s = p.soft || {};
  if (s.postLunch && slot.hour >= 13 && slot.hour < 14) return STATE.SOFT;
  if (s.earlyMorning && slot.hour < 10) return STATE.SOFT;
  if (s.morningFocus && slot.hour >= 10 && slot.hour < 13) return STATE.SOFT;
  if (s.afternoonSlump && slot.hour >= 14 && slot.hour < 16) return STATE.SOFT;
  if (s.lateAfternoon && slot.hour >= 16) return STATE.SOFT;
  if (s.friPM && slot.dayIdx === 4 && slot.hour >= 13) return STATE.SOFT;
  return STATE.OK;
}

export function evaluateSlot(ppl: Participant[], slot: Slot): SlotEval {
  const states = ppl.map((p) => ({ person: p, state: personState(p, slot) }));
  const req = states.filter((x) => x.person.required);
  const opt = states.filter((x) => !x.person.required);
  const reqHard = req.filter((x) => x.state === STATE.HARD).length;
  return {
    slot,
    states,
    floorPass: reqHard === 0,
    reqUnknown: req.filter((x) => x.state === STATE.UNKNOWN).length,
    softCount: states.filter((x) => x.state === STATE.SOFT).length,
    optionalOk: opt.filter((x) => x.state === STATE.OK || x.state === STATE.SOFT)
      .length,
    requiredOkCount: req.length - reqHard,
    requiredTotal: req.length,
    optionalTotal: opt.length,
  };
}

export function rankSlots(ppl: Participant[], slots: Slot[]): Ranking {
  const ev = slots.map((s) => evaluateSlot(ppl, s));
  const fl = ev.filter((e) => e.floorPass);
  fl.sort(
    (a, b) =>
      a.softCount - b.softCount ||
      a.reqUnknown - b.reqUnknown ||
      b.optionalOk - a.optionalOk ||
      (a.slot.dayIdx * 100 + a.slot.hour) - (b.slot.dayIdx * 100 + b.slot.hour)
  );
  return { ranked: fl, blocked: ev.filter((e) => !e.floorPass) };
}

export function slotLabel(slot: Slot): string {
  if (slot.hour === 12) return WEEKDAYS[slot.dayIdx] + "요일 낮 12시";
  const ap = slot.hour < 12 ? "오전" : "오후";
  const h = slot.hour <= 12 ? slot.hour : slot.hour - 12;
  return WEEKDAYS[slot.dayIdx] + "요일 " + ap + " " + h + "시";
}

export function makeSlots(): Slot[] {
  const a: Slot[] = [];
  for (let d = 0; d < 5; d++)
    for (let h = 9; h <= 17; h++) a.push({ id: d + "-" + h, dayIdx: d, hour: h });
  return a;
}

export function compute(ppl: Participant[]): Ranking {
  return rankSlots(ppl, makeSlots());
}

export function findEval(r: Ranking, id: string | null): SlotEval | null {
  if (!id) return r.ranked[0] ?? null;
  for (const e of r.ranked) if (e.slot.id === id) return e;
  return r.ranked[0] ?? null;
}

export function findAny(r: Ranking, id: string | null): SlotEval | null {
  const all = r.ranked.concat(r.blocked);
  if (id) for (const e of all) if (e.slot.id === id) return e;
  return r.ranked[0] ?? all[0] ?? null;
}
