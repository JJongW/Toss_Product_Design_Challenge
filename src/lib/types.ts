// 핏타임 도메인 타입 — 인원수에 종속되지 않음(2명 이상 N명 모두 지원)

/** 참여자의 선호(soft) 규칙. 켜져 있으면 해당 시간대를 "아쉬움"으로 본다. */
export interface SoftPrefs {
  postLunch?: boolean; // 점심 직후 13~14시
  earlyMorning?: boolean; // 이른 아침 9시대
  morningFocus?: boolean; // 오전 집중 10~13시
  afternoonSlump?: boolean; // 오후 나른 14~16시
  lateAfternoon?: boolean; // 늦은 오후 16시~
  friPM?: boolean; // 금요일 오후
}

export interface Participant {
  id: string;
  name: string;
  required: boolean;
  registered: boolean; // 본인 규칙을 등록했는가
  soft: SoftPrefs;
  hardDays: number[]; // 못 가는 요일 index (0=월 ~ 4=금)
}

export interface Meeting {
  code: string;
  title: string;
  durationLabel: string;
  deadlineLabel: string;
  participants: Participant[];
  decidedSlotId: string | null;
  createdAt: number;
}

/** 한 시간 슬롯 (요일 × 시각) */
export interface Slot {
  id: string;
  dayIdx: number; // 0=월 ~ 4=금
  hour: number; // 9 ~ 17
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
  deadlineLabel?: string;
  participants: Array<{ name: string; required: boolean }>;
}

export interface JoinBody {
  name: string;
}

export interface PreferencesBody {
  participantId: string;
  soft: SoftPrefs;
  hardDays: number[];
}

export interface DecideBody {
  slotId: string;
}
