# FitTime Strategy Brief for Claude

Date: 2026-07-10
Project: Toss Product Designer Challenge — "6명이 회의 일정을 잡는 경험"

## Why This File Exists

The project already has `toss_product_designer_challenge.md`, which is the living draft for the final 700-character answers. This file is a companion brief for future Claude/Codex sessions. It captures the current strategic direction, problem definition alternatives discussed in chat, and the decision logic that should guide future edits.

Do not treat this file as the final submission copy. Treat it as context for writing and reviewing the final submission answers.

## Must-Read Local Files

- `toss_product_designer_challenge.md` — final submission answer draft; each Q must fit within 700 Korean characters.
- `docs/design-log.md` — chronological source of design decisions and research.
- `.claude/docs/toss-pd-article-notes.md` — Toss article synthesis and challenge evaluation lens.
- `docs/portfolio.html` — portfolio / walkthrough artifact intended to show the user flow.
- `src/components/FitTime.tsx` and `src/lib/engine.ts` — current working prototype and recommendation logic.

## External Challenge Constraints

Submission requires:

- Three written answers:
  1. 사용자의 어떤 문제를 발견했나요? 그것이 왜 문제라고 생각했나요?
  2. 그 문제를 어떻게 해결했나요?
  3. 왜 이 방식으로 설계했나요?
- A URL where the user flow can be seen. Google Drive links are not allowed.
- The task is fictional and should not be tied to the Toss app.
- Screen form is free: mobile, PC, tablet, web, app, etc.
- AI tools may be used.
- The artifact must show actual usage flow, not only final screens.
- Core flow matters more than full branding or broad product completeness.
- Copying an existing service or only improving visual style is not enough.

Evaluation criteria from Toss challenge page:

- Problem definition: did the designer discover and define the essential user problem from the given context?
- Solution design: does the solution reflect the defined problem, and can users easily understand and achieve their goal?
- Visual completeness: not just usability but semantic and formative completeness; familiar UI patterns should be adapted to context, and visual detail should raise screen completeness.

Mandatory working gate:

Before changing copy, UX flow, UI, prototype code, or submission materials, check these three questions:

1. **Problem definition** — Does this keep the essential host problem clear, rather than drifting into generic scheduling annoyance?
2. **Solution design** — Does this make the host's decision easier to understand and justify, while keeping attendee input and privacy reasonable?
3. **Visual completeness** — Does this make the state, hierarchy, and next action easier to read in this specific meeting-scheduling context?

Before finalizing any work, answer: does the result preserve a clear chain from problem definition -> solution design -> visual completeness?

## Current Recommended Problem Definition

The safest current interpretation is that the primary user is the **host / organizer**. This is supported by the prompt wording ("사용자가 동료들의 상황을 파악하고") and Toss challenge imagery showing a participant list with one person marked `주최자`.

Recommended definition:

> 회의 주최자가 겪는 진짜 어려움은 6명의 빈 시간을 모으는 것이 아니라, 서로 다른 무게의 조건을 해석해 "이 시간으로 정해도 괜찮다"고 판단할 근거를 얻는 것이다.

Sharper submission version:

> 기존 일정 조율은 가능한 시간을 모으는 데 집중하지만, 실제 주최자가 필요한 것은 여러 후보 중 "왜 이 시간이 모두에게 가장 덜 무리한지" 판단할 수 있는 기준이다. 6명의 조건은 외근 같은 절대 불가, 점심 직후 회피 같은 소프트 선호, 필수/선택 참석 여부처럼 서로 다른 무게를 갖지만, 기존 도구는 이를 같은 가능 여부로 뭉개 보여준다. 그 결과 주최자는 다시 사람들에게 묻거나 감으로 결정해야 하고, 회의 시간 확정이 늦어지거나 누군가의 불편이 보이지 않게 된다.

One-line version:

> 6명의 회의 일정을 잡을 때 주최자가 가장 어려운 일은 빈 시간을 찾는 것이 아니라, 불가·선호·필수 여부가 섞인 정보를 해석해 모두에게 납득 가능한 1시간을 결정하는 것이다.

## Why This Definition Is Strong

- It directly uses the prompt's context: next week, 1 hour, 6 coworkers, lunch-after avoidance, field work on specific days, required and optional attendees.
- It avoids the shallow definition "scheduling is annoying."
- It focuses on the host's decision burden, which matches the prompt and imagery.
- It creates a clear mapping to UX states:
  - hard unavailability
  - soft preference
  - required attendee
  - optional attendee
  - unanswered / uncertain
  - recommended slot and rationale
- It differentiates FitTime from Doodle/When2meet by going beyond collection into decision support.

## Earlier Problem Definition Alternatives Considered

These were discussed but are not the recommended main frame unless the strategy changes.

### Alternative 1: Responsibility Shift

> 여러 사람의 일정을 잡기 어려운 이유는 시간이 부족해서가 아니라, 결정에 필요한 책임과 판단이 조직자 한 명에게 몰리기 때문이다.

Strength: highlights organizer burden.
Weakness: less directly tied to hard/soft constraints unless expanded.

### Alternative 2: Goodness Beyond Availability

> 회의 시간 조율의 핵심 문제는 가능한 시간을 찾는 것이 아니라, 가능한 시간들 사이의 "괜찮음의 정도"를 구분하지 못하는 것이다.

Strength: strong link to hard/soft preference.
Weakness: needs required/optional attendee layer to feel complete.

### Alternative 3: Perfect Slot Trap

> 6명의 회의 조율에서 진짜 병목은 완벽한 시간을 못 찾는 것이 아니라, 완벽하지 않아도 납득 가능한 시간을 고르는 기준이 없다는 점이다.

Strength: supports satisficing and "least unreasonable" framing.
Weakness: may sound like accepting a mediocre time unless written carefully.

### Alternative 4: Hidden Human Context

> 기존 조율 도구는 시간의 빈칸은 보여주지만, 그 빈칸을 선택해도 되는 이유까지 보여주지 못한다.

Strength: good for legibility and recommendation rationale.
Weakness: may sound like a pure visualization issue.

### Alternative 5: Social Pressure / Privacy

> 회의 조율에서 참여자는 불편한 선호를 공개적으로 말하기 어렵고, 조직자는 말해지지 않은 불편까지 감으로 해석해야 한다.

Strength: justifies anonymous soft preference.
Weakness: too narrow if used as the sole problem; should be supporting rationale.

### Alternative 6: Explainable Decision

> 회의 시간 조율의 문제는 데이터가 없다는 것이 아니라, 모인 데이터를 납득 가능한 결정으로 바꿔주는 설명이 없다는 것이다.

Strength: very aligned with recommendation and "why this time."
Weakness: needs concrete examples to avoid abstraction.

## Current Solution Direction

FitTime should be framed as:

> A meeting-time decision tool that helps the host understand mixed constraints and choose the least unreasonable 1-hour slot.

Not:

- calendar app
- scheduling poll
- Doodle clone
- fully automatic AI scheduler
- Toss app feature

Core UX:

1. Host opens a meeting.
2. Host sets date range, duration, attendee roster, required / optional status.
3. Host shares a link.
4. Participant selects their name from the roster.
5. Participant marks `안 돼요` and `되도록 피해요` on actual date/time grid.
6. Host sees who has registered, without seeing private soft preference details.
7. System recommends one best slot first.
8. Recommendation explains required availability, optional attendance, soft burden, missing data.
9. If required availability fails, product suggests an adjustment request rather than a forced decision.

## Feature-to-Problem Mapping

| Problem | Product Decision |
|---|---|
| Host cannot tell hard conflict from mild preference | Separate `안 돼요` and `되도록 피해요` |
| Required and optional attendees have different weights | Host marks `필수 / 선택` |
| Host needs a decision, not just a heatmap | Show one recommended time first |
| Host needs confidence | Explain why this time is recommended |
| Soft preferences can be socially sensitive | Aggregate soft preference anonymously |
| Waiting for everyone can stall scheduling | Allow recommendation with current data and mark uncertainty |
| Attendee input burden causes drop-off | Ask participants to mark unavailable / avoid slots, not all possible times |
| Perfect slot may not exist | Show adjustment request or optional-exclusion path |
| Roster integrity matters | Shared link + roster-locked identity selection |

## Key Research Evidence To Use

Use this evidence as support, not as a heavy academic dump.

- Calendar.help, CHI 2017: meeting scheduling is a complex workflow involving communication, coordination, negotiation, and exceptions. Existing tools can be too rigid for varied needs.
- Grudin, Groupware and Social Dynamics: automatic meeting scheduling has a work-benefit mismatch; the organizer benefits, but everyone must maintain accurate calendars for it to work.
- Rhythm of Work: meeting preferences are not only busy/free; they include cyclical preferences and relational preferences. This supports soft preference design.
- Togedule, CSCW 2025: static scheduling tools show the same options regardless of attendee input and preference status; adaptive representation can reduce attendee cognitive load and improve organizer decision speed/quality.
- OutWithFriendz: group event scheduling is influenced by host preference, individual preference, and voting process.
- Existing services:
  - Doodle / When2meet collect availability but leave interpretation and final judgment to the host.
  - Google Calendar / Outlook can find shared free time but depend on accurate and shared calendar data.
  - Calendly / appointment scheduling is strongest for 1:1 or host-availability booking, not multi-person tradeoff decisions.

## Toss Article Lens

From `.claude/docs/toss-pd-article-notes.md`, keep these in mind:

- Requested feature and real problem differ.
- Design the target experience first, then define needed data.
- Product Designer judgment matters more than artifact format.
- Connect different users' incentives into one flow.
- Use a working prototype to validate the actual experience.

Applied to FitTime:

- "Show everyone's calendar" is not the right answer. The host needs enough evidence, and attendees need enough privacy.
- The final artifact should make the host's uncertainty visibly shrink.
- The UX should help the host explain the decision, not simply choose a color on a grid.

## Submission Writing Guidance

### Q1 Should Say

- The host's hard part is deciding with confidence, not merely collecting times.
- Six people's constraints have different weights.
- Existing tools flatten hard unavailability, soft preference, required / optional status, and missing responses.
- Because of that, the host must ask again, wait, or decide by gut.

### Q2 Should Say

- Participants mark unavailable / avoid slots on a real date grid.
- Host marks required / optional attendees.
- System ranks only continuous 1-hour candidate slots.
- The first recommendation shows why it is least unreasonable.
- Soft preferences are anonymous; hard facts are used for coordination.
- Missing responses do not block progress but are shown as uncertainty.

### Q3 Should Say

- Doodle/When2meet collect data but do not remove host interpretation burden.
- Calendar auto-lookup depends on everyone maintaining and sharing calendars.
- A single recommendation is used because the user's goal is to decide, not inspect every slot.
- Anonymous soft preference is used because honest preference input can be socially sensitive.
- Manual final confirmation remains because scheduling affects other people's time and should be reversible / accountable.

## Current Risk / Watchouts

- Do not overclaim "fairness" if the prototype only ranks by soft count and optional attendance. Use "least unreasonable" or "explainable" more than "perfectly fair."
- Do not make the host sound authoritarian. Use "host / organizer / meeting opener" as the person responsible for coordination, not a unilateral decider.
- Do not over-index on Korean workplace hierarchy unless it supports privacy; the challenge is not explicitly about hierarchy.
- Do not make the solution look like merely another heatmap. The recommendation and rationale must be central.
- Do not let visual identity overpower the core flow. The challenge says branding is not the main evaluation axis.

## Recommended Strategic Sentence

> FitTime is not trying to find a perfect shared blank. It helps the host understand which constraints matter most and choose the 1-hour slot that is explainably least unreasonable for the group.
