// 회의 데이터 저장소.
//
// 배포(Vercel/서버리스): Upstash Redis(REST) — 요청마다 인스턴스가 달라도
//   조직자·참여자가 초대코드로 같은 데이터를 실시간 공유(동기화)한다.
// 로컬 개발: KV env가 없으면 인메모리 Map으로 자동 폴백한다(설정 없이 바로 실행).
//
// 라우트는 getMeeting(code)로 읽고 → 객체를 수정한 뒤 → saveMeeting(m)로 저장한다.
// 이 단순한 read-modify-write 모델이 두 백엔드에서 동일하게 동작한다.

import { Redis } from "@upstash/redis";
import type { Meeting } from "./types";

const TTL_SECONDS = 60 * 60 * 24 * 7; // 회의 데이터 7일 보관
const key = (code: string) => `meeting:${code.toUpperCase()}`;

// ---- 백엔드 선택: Upstash가 설정돼 있으면 Redis, 아니면 인메모리 ----
function makeRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new Redis({ url, token });
  return null;
}

const g = globalThis as unknown as {
  __meetingSchedulerMem?: Map<string, Meeting>;
  __meetingSchedulerRedis?: Redis | null;
};

const redis: Redis | null =
  g.__meetingSchedulerRedis !== undefined
    ? g.__meetingSchedulerRedis
    : (g.__meetingSchedulerRedis = makeRedis());

// HMR로 모듈이 리로드돼도 로컬 데이터가 날아가지 않게 globalThis에 붙인다.
const mem: Map<string, Meeting> =
  g.__meetingSchedulerMem ?? (g.__meetingSchedulerMem = new Map());

export function usingKv(): boolean {
  return redis !== null;
}

// ---- 공개 API ----
export async function getMeeting(code: string): Promise<Meeting | null> {
  if (!code) return null;
  if (redis) {
    const m = await redis.get<Meeting>(key(code));
    return m ?? null;
  }
  return mem.get(code.toUpperCase()) ?? null;
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  if (redis) {
    await redis.set(key(meeting.code), meeting, { ex: TTL_SECONDS });
    return;
  }
  mem.set(meeting.code.toUpperCase(), meeting);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function genCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    let t = "";
    for (let i = 0; i < 6; i++)
      t += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    const exists = await getMeeting(t);
    if (!exists) return t;
  }
  // 극히 드문 연속 충돌 — 접미사로 회피
  return "M" + Date.now().toString(36).slice(-5).toUpperCase();
}

let seq = 0;
export function genId(prefix: string): string {
  seq += 1;
  return prefix + "_" + Date.now().toString(36) + "_" + seq.toString(36);
}
