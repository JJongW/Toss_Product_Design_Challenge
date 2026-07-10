---
name: fittime-patterns
description: 핏타임(Toss PD 과제) 저장소의 실제 작업 관행 — design-log 우선 규율, 커밋/딜리버러블 동기화, Next.js lib/route 아키텍처. git 이력에서 추출.
version: 1.0.0
source: local-git-analysis
analyzed_commits: 8
---

# 핏타임 저장소 작업 패턴

> git 이력(8커밋) + 폴더 구조에서 추출. 이 repo에서 코드를 짜거나 커밋하기 전에 따를 관행.

## 1. Design-log 우선 규율 (이 repo의 핵심 관행)
- **8커밋 중 6커밋이 `docs/design-log.md`를 함께 변경**했다. 설계 결정 → design-log에 `## Entry NNN`(Fact/Hypothesis/Evidence/Weakness/Next Research) append → 구현 → 커밋 순서.
- 기존 Entry는 **절대 수정·삭제 안 함**, 맨 아래 append만.
- 제출 답변(`toss_product_designer_challenge.md`, 각 700자)은 문제정의/해결/근거가 바뀌면 **같은 커밋에서 버전·변경이력 동기화**(3커밋에서 동반 변경).
- 새 작업 시작 전 design-log를 먼저 읽어 맥락을 잇는다.

## 2. 커밋 컨벤션 (conventional commits 아님)
관찰된 형식: **`스코프/영역: 무엇을 바꿨나 + 세부`** (한국어, 명사구).
- 예: `참여 현황: 누가 등록했는지 이름별 표시 + 추천 진입점 문구 명확화`
- 예: `회의 생성 개선: 세션당 코드 1개(수정) + 근무시간대 선택`
- `feat:`/`fix:`/`chore:` 접두사 **쓰지 않음**. 대신 사용자·기능 관점 요약.
- 커밋은 design-log Entry와 1:1로 대응하는 경향(커밋 = Entry의 구현).

## 3. 아키텍처 (Next.js 16 App Router)
```
src/
├── app/
│   ├── page.tsx, layout.tsx        # 단일 진입 (클라이언트 셸)
│   └── api/
│       ├── health/route.ts
│       └── meetings/
│           ├── route.ts            # POST 생성 · PUT 수정
│           └── [code]/
│               ├── route.ts        # GET 개요
│               ├── join/route.ts
│               ├── preferences/route.ts
│               ├── recommend/route.ts
│               ├── decide/route.ts
│               └── seed/route.ts   # 데모용
├── components/
│   └── FitTime.tsx                 # 단일 대형 클라이언트 컴포넌트 (가장 자주 변경, 5회)
└── lib/                            # 도메인 로직 (가장 밀집, 7파일)
    ├── engine.ts                   # 추천/랭킹 계산
    ├── dates.ts, serialize.ts, types.ts
    ├── meetingInput.ts             # 생성·수정 공용 검증 (드리프트 방지)
    └── store.ts                    # KV(Upstash Redis)/인메모리 폴백 단일 지점
```
규칙:
- **REST 라우트는 액션별로 분리**(join·preferences·recommend·decide) — 한 파일에 뭉치지 않는다.
- **도메인 로직은 `src/lib/`에**, 라우트는 얇게(파싱→lib 호출→응답).
- **생성·수정 검증은 `meetingInput.ts` 한 곳**으로 공용 추출해 두 경로 규칙 드리프트를 막는다.
- **저장소 접근은 `store.ts` 한 곳**. env(`KV_REST_API_*`/`UPSTASH_*`) 있으면 Redis, 없으면 인메모리 자동 폴백 — 다른 파일은 저장 구현을 몰라야 한다.
- 초기 정적 프로토타입은 `legacy/`에 보관(삭제 안 함).

## 4. 검증 방식 (테스트 스위트 없음)
- 자동화 테스트 파일 **없음**. design-log의 Evidence 섹션이 검증 기록.
- 표준 검증 루프: **`tsc` 타입체크 통과 + 로컬 dev 서버(tmux 권장)를 띄워 API를 curl로 실제 호출**해 응답 확인.
- 클라이언트 상호작용(셀렉트·플로우)은 브라우저 시각검증이 로컬 제약으로 종종 미실행 — 그럴 땐 Evidence에 **명시적으로 "미검증"이라 기록**(허위 완료 주장 금지).

## 5. 커밋 전 체크 (CLAUDE.md 게이트)
어떤 작업이든 제출 전 3기준을 확인: **문제 정의 → 솔루션 설계 → 시각적 완성도**가 한 줄로 이어지는가.
- 새 기능: "이게 주최자의 판단 근거를 더 선명하게 만드는가? 참석자 입력부담·프라이버시를 해치지 않는가?"
- 상태 색은 `불가/아쉬움/미응답/가능`, `필수/선택`, `추천 이유`를 빠르게 읽게 돕는가.

## 안티패턴 (이 repo에서 피할 것)
- design-log Entry 없이 설계 결정을 커밋에 묻어버리기.
- 딜리버러블(`toss_product_designer_challenge.md`)을 근거 변경과 따로 두어 버전 드리프트.
- 라우트 핸들러에 도메인 계산을 직접 작성(→ `src/lib`로).
- 저장 로직을 `store.ts` 밖에서 직접 호출.
- 검증 안 하고 "완료"라 보고(→ tsc+curl, 미검증은 미검증이라 명시).
