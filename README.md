# 핏타임 (Toss Product Design 과제)

여럿이 모이는 회의 시간을 **눈치 없이** 정하는 서비스. "6명"에 종속되지 않고 **2명 이상 N명**을 지원한다.

- 문제/설계 근거: `docs/design-log.md` (단일 진실 소스)
- 제출 답변(Q1~Q3): `toss_product_designer_challenge.md`
- 초기 정적 프로토타입: `legacy/` (참고용 보관)

## 스택

- **Next.js 16 (App Router) + React 19 + TypeScript**
- 백엔드: Next.js API Routes (Node)
- 저장소: **Upstash Redis**(배포) / **인메모리 폴백**(로컬)

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

KV 환경변수가 없으면 자동으로 인메모리 저장소로 동작한다(설정 불필요).

## 크로스디바이스 동기화 (KV)

서버리스(Vercel)는 요청마다 인스턴스가 달라 인메모리로는 조직자↔참여자 기기 간
데이터 공유가 보장되지 않는다. 실제 동기화하려면 Upstash Redis를 연결한다.

1. Vercel 프로젝트 → **Storage → Upstash Redis(또는 KV)** 연동
2. `KV_REST_API_URL` / `KV_REST_API_TOKEN`(또는 `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN`)이 자동 주입됨 → 재배포
3. 저장 로직은 `src/lib/store.ts` 한 곳에만 있다. env가 감지되면 Redis로 전환된다.

로컬에서 KV로 테스트하려면 `.env.example`을 `.env.local`로 복사해 값을 채운다.

## 배포 (Vercel)

```bash
git push        # main에 push하면 Vercel이 자동 빌드·배포
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/meetings` | 회의 생성(참여자 2명 이상) → 초대코드 |
| GET | `/api/meetings/:code` | 회의 개요·참여 현황 |
| POST | `/api/meetings/:code/join` | 초대코드로 참여 |
| POST | `/api/meetings/:code/preferences` | 내 시간 규칙 비공개 등록 |
| GET | `/api/meetings/:code/recommend` | 추천 계산(선호는 익명 집계) |
| POST | `/api/meetings/:code/decide` | 최종 시간 확정 |
| POST | `/api/meetings/:code/seed` | (데모용) 미등록자 샘플 규칙 등록 |
