// 핏타임 도메인 타입 — 인원수(N)에 독립적이고, "실제 날짜 범위" 위에서 동작한다.
// 핵심 프리미티브: 참여자는 범위 안에서 "안 되는 시간"을 직접 찍는다(busy).
//   - busyHard: 절대 불가 (예: 화요일 14시 병원)
//   - busySoft: 되도록 피하고 싶음 (익명 집계 → 공정 배분에만 사용)

export type Scope = "thisWeek" | "nextWeek" | "thisMonth";

export interface Participant {
  id: string;
  name: string;
  required: boolean;
  registered: boolean; // 본인 가용성을 등록했는가
  busyHard: string[]; // 불가로 찍은 슬롯 id 목록
  busySoft: string[]; // 되도록 피하고 싶은 슬롯 id 목록
}

export interface Meeting {
  code: string;
  title: string;
  durationLabel: string;
  durationMin: number; // 회의 길이(분): 30/60/90/120. 연속 블록으로 후보를 만든다.
  stepMin: number; // 눈금(분): 30
  deadlineLabel: string;
  scope: Scope;
  dates: string[]; // 회의 후보 날짜(ISO YYYY-MM-DD) 목록
  hourStart: number; // 근무시간대 시작(정시, 포함), 예: 9
  hourEnd: number; // 근무시간대 끝(정시, 제외), 예: 18
  participants: Participant[];
  decidedSlotId: string | null;
  createdAt: number;
}

/** 한 눈금 슬롯 (실제 날짜 × 시각). id = `${date}-${min}` (min = 자정부터 분) */
export interface Slot {
  id: string;
  date: string; // ISO YYYY-MM-DD
  min: number; // 자정부터 분. 예: 09:30 → 570
}

export type PersonStateValue = "가능" | "아쉬움" | "미응답" | "불가";

export interface PersonState {
  person: Participant;
  state: PersonStateValue;
}

export interface SlotEval {
  slot: Slot;
  states: PersonState[];
  floorPass: boolean;
  reqUnknown: number;
  softCount: number;
  optionalOk: number;
  requiredOkCount: number;
  requiredTotal: number;
  optionalTotal: number;
}

export interface Ranking {
  ranked: SlotEval[];
  blocked: SlotEval[];
}

// ---- API 요청/응답 페이로드 ----

export interface CreateMeetingBody {
  title: string;
  durationLabel?: string;
  durationMin?: number;
  stepMin?: number;
  deadlineLabel?: string;
  scope: Scope;
  dates: string[];
  hourStart?: number;
  hourEnd?: number;
  participants: Array<{ name: string; required: boolean }>;
}

export interface JoinBody {
  name: string;
}

export interface PreferencesBody {
  participantId: string;
  busyHard: string[];
  busySoft: string[];
}

export interface DecideBody {
  slotId: string;
}
