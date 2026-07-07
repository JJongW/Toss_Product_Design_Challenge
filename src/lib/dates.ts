// 실제 날짜 유틸 — 로컬 시간대 기준으로 YYYY-MM-DD를 다룬다(UTC 시프트 방지).
// 회의 범위(주간/월간)는 이 유틸로 "진짜 날짜 목록"을 만들어 슬롯의 근거로 쓴다.

const WD = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** ISO 날짜의 요일 한 글자 ("월".."금") */
export function weekdayKo(iso: string): string {
  return WD[parseISO(iso).getDay()];
}

/** "7/8" 처럼 월/일 */
export function shortDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "7월 8일 (화)" */
export function longDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 일 ~ 6 토
  const diff = day === 0 ? -6 : 1 - day; // 그 주의 월요일까지
  return addDays(d, diff);
}

/** base가 속한 주(weekOffset 주 뒤)의 날짜 ISO 목록.
 *  includeWeekend면 월~일(7일), 아니면 월~금(5일). */
export function daysOfWeek(
  base: Date,
  weekOffset: number,
  includeWeekend = false
): string[] {
  const mon = addDays(mondayOf(base), weekOffset * 7);
  const out: string[] = [];
  const n = includeWeekend ? 7 : 5;
  for (let i = 0; i < n; i++) out.push(toISO(addDays(mon, i)));
  return out;
}

/** 정렬된 날짜 목록을 "주(월요일 기준)" 단위로 묶는다. 월간 그리드 페이지네이션용. */
export function groupByWeek(dates: string[]): string[][] {
  const groups: string[][] = [];
  let curKey = "";
  for (const iso of dates) {
    const key = toISO(mondayOf(parseISO(iso)));
    if (key !== curKey) {
      groups.push([]);
      curKey = key;
    }
    groups[groups.length - 1].push(iso);
  }
  return groups;
}

/** base가 속한 달의 날짜 ISO 목록. includeWeekend면 전부, 아니면 평일(월~금)만. */
export function daysOfMonth(base: Date, includeWeekend = false): string[] {
  const y = base.getFullYear();
  const m = base.getMonth();
  const out: string[] = [];
  const d = new Date(y, m, 1);
  while (d.getMonth() === m) {
    const wd = d.getDay();
    if (includeWeekend || (wd >= 1 && wd <= 5)) out.push(toISO(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 오늘(포함) 이후의 날짜만 남긴다 — 지나간 날은 고를 필요가 없다. */
export function fromTodayOnward(isoList: string[], todayISO: string): string[] {
  return isoList.filter((iso) => iso >= todayISO);
}

export type Scope = "thisWeek" | "nextWeek" | "thisMonth";

export interface RangeSpec {
  scope: Scope;
  dates: string[];
  label: string; // "이번 주 (7/6~7/10)"
  deadlineLabel: string;
}

/** 스코프 → 실제 날짜 범위. today는 ISO 문자열(테스트/SSR 안전).
 *  includeWeekend=true면 토·일도 후보에 포함한다(기본은 평일만). */
export function buildRange(
  scope: Scope,
  todayISO: string,
  includeWeekend = false
): RangeSpec {
  const today = parseISO(todayISO);
  let dates: string[];
  let name: string;
  if (scope === "nextWeek") {
    dates = daysOfWeek(today, 1, includeWeekend);
    name = "다음 주";
  } else if (scope === "thisMonth") {
    dates = fromTodayOnward(daysOfMonth(today, includeWeekend), todayISO);
    name = "이번 달";
  } else {
    dates = fromTodayOnward(daysOfWeek(today, 0, includeWeekend), todayISO);
    name = "이번 주";
  }
  // 이번 주가 오늘 기준 하루 이하만 남으면 다음 주까지 이어 붙인다(빈 그리드 방지).
  if (scope === "thisWeek" && dates.length <= 1) {
    dates = dates.concat(daysOfWeek(today, 1, includeWeekend));
    name = "이번·다음 주";
  }
  const range =
    dates.length > 0
      ? `${shortDate(dates[0])}~${shortDate(dates[dates.length - 1])}`
      : "";
  const last = dates[dates.length - 1];
  return {
    scope,
    dates,
    label: `${name} (${range})`,
    deadlineLabel: last ? `${longDate(last)}까지` : "미정",
  };
}
