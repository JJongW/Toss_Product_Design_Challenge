// 핏타임 추천 엔진 — 실제 날짜 범위 위에서, 30분 눈금·가변 소요시간(연속 블록)으로 동작한다.
// 시간의 원자 단위는 "자정부터 분(min)". 참여자는 30분 칸에 "안 되는 시간"을 찍고
// (busyHard/busySoft), 엔진은 회의 길이만큼 연속한 블록을 후보로 만들어, 그 블록 전체를
// 보고 각자의 상태를 판정한다(블록 안 한 칸이라도 불가면 불가). 인원 수(N)에 독립적이다.

import { longDate, shortDate, weekdayKo } from "./dates";
import type {
  Meeting,
  Participant,
  PersonStateValue,
  Ranking,
  Slot,
  SlotEval,
} from "./types";

export const WEEKDAYS = ["월", "화", "수", "목", "금"] as const;
export const DEFAULT_STEP_MIN = 30;

export const STATE = {
  OK: "가능",
  SOFT: "아쉬움",
  UNKNOWN: "미응답",
  HARD: "불가",
} as const satisfies Record<string, PersonStateValue>;

export function slotId(date: string, min: number): string {
  return `${date}-${min}`;
}

/** 한 눈금(30분)에 대한 개인 상태 */
function stepState(p: Participant, date: string, min: number): PersonStateValue {
  const id = slotId(date, min);
  if (p.busyHard && p.busyHard.indexOf(id) !== -1) return STATE.HARD;
  if (p.busySoft && p.busySoft.indexOf(id) !== -1) return STATE.SOFT;
  return STATE.OK;
}

/** 회의 블록(시작 분 + 길이 분) 전체에 대한 개인 상태.
 *  블록 안 한 칸이라도 불가면 불가, 하나라도 아쉬움이면 아쉬움. 미등록은 미응답. */
export function personBlockState(
  p: Participant,
  date: string,
  startMin: number,
  durationMin: number,
  stepMin: number
): PersonStateValue {
  if (!p.registered) return STATE.UNKNOWN;
  let soft = false;
  for (let m = startMin; m < startMin + durationMin; m += stepMin) {
    const s = stepState(p, date, m);
    if (s === STATE.HARD) return STATE.HARD;
    if (s === STATE.SOFT) soft = true;
  }
  return soft ? STATE.SOFT : STATE.OK;
}

export function evaluateSlot(
  ppl: Participant[],
  slot: Slot,
  durationMin: number,
  stepMin: number
): SlotEval {
  const states = ppl.map((p) => ({
    person: p,
    state: personBlockState(p, slot.date, slot.min, durationMin, stepMin),
  }));
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

/** 슬롯 정렬 키: 이른 날짜 → 이른 시각 */
function slotOrder(s: Slot): string {
  return `${s.date}-${String(s.min).padStart(4, "0")}`;
}

export function rankSlots(
  ppl: Participant[],
  starts: Slot[],
  durationMin: number,
  stepMin: number
): Ranking {
  const ev = starts.map((s) => evaluateSlot(ppl, s, durationMin, stepMin));
  const fl = ev.filter((e) => e.floorPass);
  fl.sort(
    (a, b) =>
      a.softCount - b.softCount ||
      a.reqUnknown - b.reqUnknown ||
      b.optionalOk - a.optionalOk ||
      slotOrder(a.slot).localeCompare(slotOrder(b.slot))
  );
  return { ranked: fl, blocked: ev.filter((e) => !e.floorPass) };
}

/** 분(자정부터) → "오전 9시" / "오전 9시 30분" / "낮 12시" */
export function clock(min: number): string {
  const h = Math.floor(min / 60);
  const mm = min % 60;
  const base =
    h === 12 ? "낮 12시" : h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`;
  return mm === 0 ? base : `${base} ${mm}분`;
}

function dateHead(date: string): string {
  return `${date.slice(5).replace("-", "/")}(${weekdayKo(date)})`;
}

/** "07/13(월) 오전 9시 30분" (30분) / "07/13(월) 오전 9시~오전 10시" (블록) */
export function slotLabel(slot: Slot, durationMin: number, stepMin: number): string {
  const head = dateHead(slot.date);
  const start = clock(slot.min);
  if (durationMin <= stepMin) return `${head} ${start}`;
  return `${head} ${start}~${clock(slot.min + durationMin)}`;
}

/** "7월 8일 (화) 오후 2시~4시" 확정 안내용 긴 라벨 */
export function slotLabelLong(slot: Slot, durationMin: number, stepMin: number): string {
  const start = clock(slot.min);
  if (durationMin <= stepMin) return `${longDate(slot.date)} ${start}`;
  return `${longDate(slot.date)} ${start}~${clock(slot.min + durationMin)}`;
}

export { shortDate, weekdayKo };

/** 범위 안의 모든 눈금(30분) 슬롯 — 참여자 입력(칠하기) 검증·렌더용. */
export function makeSlots(
  dates: string[],
  hourStart: number,
  hourEnd: number,
  stepMin: number
): Slot[] {
  const a: Slot[] = [];
  const startMin = hourStart * 60;
  const endMin = hourEnd * 60;
  for (const date of dates)
    for (let m = startMin; m < endMin; m += stepMin)
      a.push({ id: slotId(date, m), date, min: m });
  return a;
}

/** 회의가 딱 들어가는 "시작 눈금" 후보들 — 랭킹용. */
export function candidateStarts(
  dates: string[],
  hourStart: number,
  hourEnd: number,
  stepMin: number,
  durationMin: number
): Slot[] {
  const a: Slot[] = [];
  const startMin = hourStart * 60;
  const endMin = hourEnd * 60;
  for (const date of dates)
    for (let m = startMin; m + durationMin <= endMin; m += stepMin)
      a.push({ id: slotId(date, m), date, min: m });
  return a;
}

function stepOf(m: Meeting): number {
  return m.stepMin && m.stepMin > 0 ? m.stepMin : DEFAULT_STEP_MIN;
}
function durOf(m: Meeting): number {
  const step = stepOf(m);
  return m.durationMin && m.durationMin >= step ? m.durationMin : step;
}

export function meetingSlots(m: Meeting): Slot[] {
  const dates = m.dates && m.dates.length ? m.dates : [];
  return makeSlots(dates, m.hourStart ?? 9, m.hourEnd ?? 18, stepOf(m));
}

export function meetingDuration(m: Meeting): number {
  return durOf(m);
}
export function meetingStep(m: Meeting): number {
  return stepOf(m);
}

export function compute(m: Meeting): Ranking {
  const dates = m.dates && m.dates.length ? m.dates : [];
  const step = stepOf(m);
  const dur = durOf(m);
  const starts = candidateStarts(dates, m.hourStart ?? 9, m.hourEnd ?? 18, step, dur);
  return rankSlots(m.participants, starts, dur, step);
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
