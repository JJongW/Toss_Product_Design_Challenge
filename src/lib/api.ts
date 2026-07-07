// 클라이언트 → 서버 API 호출 헬퍼. 실패 시 서버가 준 한국어 메시지를 던진다.

import type { RecommendView } from "./serialize";
import type { Scope } from "./types";

export interface MeetingSummary {
  code: string;
  title: string;
  durationLabel: string;
  durationMin: number;
  stepMin: number;
  deadlineLabel: string;
  scope: Scope;
  dates: string[];
  hourStart: number;
  hourEnd: number;
  participants: Array<{
    id: string;
    name: string;
    required: boolean;
    registered: boolean;
  }>;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "문제가 생겼어요.");
  }
  return data as T;
}

export function createMeeting(body: {
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
}) {
  return req<{ code: string; meeting: MeetingSummary }>("/api/meetings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMeeting(
  code: string,
  body: {
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
) {
  return req<{ code: string; meeting: MeetingSummary }>(
    `/api/meetings/${encodeURIComponent(code)}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
}

export function getMeeting(code: string) {
  return req<{ meeting: MeetingSummary }>(
    `/api/meetings/${encodeURIComponent(code)}`
  );
}

export function joinMeeting(code: string, name: string) {
  return req<{ participantId: string; meeting: MeetingSummary }>(
    `/api/meetings/${encodeURIComponent(code)}/join`,
    { method: "POST", body: JSON.stringify({ name }) }
  );
}

export function savePreferences(
  code: string,
  participantId: string,
  busyHard: string[],
  busySoft: string[]
) {
  return req<{ ok: true; meeting: MeetingSummary }>(
    `/api/meetings/${encodeURIComponent(code)}/preferences`,
    {
      method: "POST",
      body: JSON.stringify({ participantId, busyHard, busySoft }),
    }
  );
}

export function getRecommend(code: string) {
  return req<RecommendView>(
    `/api/meetings/${encodeURIComponent(code)}/recommend`
  );
}

export function decideMeeting(code: string, slotId: string) {
  return req<{ ok: true; meeting: MeetingSummary }>(
    `/api/meetings/${encodeURIComponent(code)}/decide`,
    { method: "POST", body: JSON.stringify({ slotId }) }
  );
}

export function checkHealth() {
  return req<{ kv: boolean; serverless: boolean }>("/api/health");
}

export function seedMeeting(code: string) {
  return req<{ seeded: number; meeting: MeetingSummary }>(
    `/api/meetings/${encodeURIComponent(code)}/seed`,
    { method: "POST" }
  );
}

export type { RecommendView, Scope };
