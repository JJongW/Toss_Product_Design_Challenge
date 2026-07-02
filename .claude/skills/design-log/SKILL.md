---
name: design-log
description: Append the current design deliberation to docs/design-log.md in the Fact/Hypothesis/Evidence/Weakness/Next Research format. Use whenever a design-discussion exchange (problem decomposition, hypothesis, evidence, rebuttal, or a decision) has just occurred in this Toss PD scheduling project, and at the end of any turn that contained such deliberation. Also invocable manually as /design-log.
---

# Design Log 기록 스킬

이 프로젝트(Toss PD 과제, "6명 회의 일정 잡는 경험")의 설계 토의를 `docs/design-log.md`에 누적 기록한다.

## 언제 실행하나
- 직전 교환에 **설계 심의**가 있었을 때: 문제 분해 / 가설 수립·수정 / 근거(리서치) 확보 / 사용자 주장에 대한 반박 / 설계 결정.
- 단순 잡담, 설정 작업, 파일 편집만 있던 턴은 기록하지 않는다 (로그 오염 방지).

## 절차
1. `docs/design-log.md`를 읽어 마지막 `## Entry NNN` 번호를 확인한다.
2. 파일 맨 아래(`<!-- 새 항목은 이 줄 아래에 append -->` 주석 밑)에 다음 형식으로 **한 항목만 append** 한다. 기존 내용은 수정/삭제 금지.

```
## Entry {NNN, 3자리 zero-pad} — {한 줄 제목} ({YYYY-MM-DD})
- **Fact**: 이번에 확정된 사실.
- **Hypothesis**: 세운/수정한 가설. 없으면 "없음".
- **Evidence**: 근거. 논문/리서치/Reddit/기존 서비스면 출처 URL 필수. 없으면 "미수집" + 왜.
- **Weakness**: 현재 논리의 빈틈, 표본 편향, 맥락 불일치 등. 솔직하게.
- **Next Research**: 다음에 조사/검증할 질문.
```

3. 날짜는 환경의 현재 날짜(currentDate)를 쓴다. 임의로 지어내지 않는다.
4. 근거가 추측이면 반드시 "추측/미검증"이라고 명시한다. 없는 출처를 만들지 않는다.
5. 여러 주제가 한 턴에 다뤄졌으면 주제별로 별도 Entry로 나눈다.

## 원칙
- 이 로그의 목적은 "예쁜 요약"이 아니라 **의사결정 추적**이다. 반박당한 가설, 폐기된 방향도 지우지 말고 남겨 왜 버렸는지 기록한다.
- 로그를 갱신했으면 사용자에게 어느 Entry를 추가했는지 한 줄로 알린다.
