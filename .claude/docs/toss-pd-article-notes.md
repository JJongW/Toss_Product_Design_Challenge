# Toss Article Notes for Product Design Challenge

Date: 2026-07-10
Purpose: Summarize Toss articles that should inform the Toss Product Designer challenge response and prototype critique. This is not a style guide for copying Toss UI. It is a working lens for problem definition, solution intent, and UX completeness.

## Source Articles

- [AI로 바꾼 제품 설계의 순서](https://toss.tech/article/chatbot) — Toss Tech, 2026-06-17
- [토스가 디자인 직무를 2개로 줄인 이유](https://toss.tech/article/Designer) — Toss Tech, 2026-04-03
- [구매자와 판매자, 그 사이를 잇는 디자이너](https://toss.im/career/article/50879) — Toss Career, 2026-06-25
- [디자이너가 시안 대신 앱을 만든 이유](https://toss.tech/article/deadend) — Toss Tech, 2026-06-16

## Cross-Article Pattern

Across the four articles, Toss repeatedly frames Product Design as:

1. Finding the real problem behind the visible request.
2. Designing the experience before over-defining implementation.
3. Validating with working prototypes, not only static screens.
4. Turning repeated local fixes into reusable rules.
5. Considering multiple users and incentives in one connected flow.
6. Judging quality through actual user context, not the tool or screen format.

For this challenge, that means the work should not be judged as "a nice calendar UI." It should show a clear chain:

Problem in context -> explicit hypothesis -> core flow -> working prototype -> why the flow helps the host decide.

## Article 1: AI로 바꾼 제품 설계의 순서

### Confirmed Themes

- The starting problem was not "make the chatbot prettier"; the structure forced users to navigate categories they did not understand.
- Toss reframed the flow around what users know: their own problem expressed in natural language.
- They used actual consultation data rather than only policy documents because real data showed how customers ask, how staff narrow causes, and how solutions unfold.
- They prototyped early and used a scenario hub to test many condition combinations quickly.
- Repeated issues were not fixed one by one forever; they became design rules.
- The article argues for designing the target experience first, then working backward to the required data, APIs, and tools.

### Challenge Implications

- Do not start from "calendar service" or "poll UI." Start from what the meeting host actually knows and does not know.
- The host knows: meeting goal, next week, 1 hour, attendee list, who is required or optional.
- The host does not know: which conflicts are hard, which are preferences, whose missing response matters, and whether the chosen time is explainable.
- Prototype should cover multiple realistic states, not only the happy path:
  - all required people available
  - one person has a soft preference conflict
  - a required person is unavailable
  - some people have not responded
  - optional attendees affect ranking but not eligibility

### Design Rule to Borrow

> Make the desired experience first, then define the data needed to support it.

For FitTime: desired experience = "The host can confidently say why this 1-hour slot is the least unreasonable option."

Needed data:

- hard unavailable slots
- soft avoid slots
- required / optional status
- response status
- meeting duration and date range
- recommendation rationale

## Article 2: 토스가 디자인 직무를 2개로 줄인 이유

### Confirmed Themes

- Toss reduced role boundaries because the old categories were based on medium, tool, or screen type rather than the essence of judgment.
- Product Designer is framed as someone who thinks about the user's context, problem, and solution, regardless of mobile / PC boundary.
- As tools become easier to use, the important differentiator becomes the ability to judge what is a good experience.

### Challenge Implications

- The challenge explicitly says the screen format is free. The important thing is not whether this is mobile, PC, app, website, Figma, or video.
- The submission should show product judgment:
  - Why this problem definition?
  - Why these states?
  - Why single recommendation before list?
  - Why separate hard unavailability from soft preference?
  - Why protect soft preference privacy?
- Visual finish matters, but only after the core UX judgment is clear.

### Design Rule to Borrow

> Do not optimize for the artifact type. Optimize for the user's context and the decision the product helps them make.

For FitTime: this is not a calendar visualization problem. It is a host decision-support problem.

## Article 3: 구매자와 판매자, 그 사이를 잇는 디자이너

### Confirmed Themes

- The article describes Product Designer work as connecting different users' experiences into one natural flow.
- A key example: sellers repeatedly asked to reveal buyers' real phone numbers. Instead of building that literal feature, the designer investigated why the request kept happening.
- The real problem was not "always show real phone number"; it was "enable smooth work only when the seller truly needs contact information."
- The chosen design balanced buyer protection and seller operation by exposing the information only in limited, necessary cases.
- The article emphasizes that one user's convenience can create another user's burden, so the designer must evaluate both sides together.

### Challenge Implications

This is highly relevant to meeting scheduling because the host and attendees have different incentives.

- Host wants a meeting time decided quickly and explainably.
- Attendees want low input burden, privacy, and not being blamed for conflicts.
- Required attendees carry a different decision weight from optional attendees.
- Soft preferences should help the recommendation without exposing individuals unnecessarily.

The solution should avoid optimizing only for the host. If the host gets total visibility into everyone's preferences, it may make decision-making easier but can make attendees less honest. If attendees get full privacy with no signal, the host loses decision confidence. The right solution balances both:

- show registration status by name
- hide the content of soft preferences
- show hard conflicts only when needed for coordination
- aggregate soft cost as "아쉬운 분 n명"

### Design Rule to Borrow

> The requested feature is often not the real problem; study the repeated request and design the smallest safe access needed.

For FitTime: "show everyone's calendar" is not the real need. The host needs enough evidence to decide, while attendees need enough privacy to answer honestly.

## Article 4: 디자이너가 시안 대신 앱을 만든 이유

### Confirmed Themes

- Toss reframed "dead-end" completion screens as potential starts of the next experience.
- They explored familiar UI patterns and rejected them when they interrupted the user's current action.
- The underlay idea came from changing the spatial metaphor: instead of putting something on top of the screen, reveal something underneath it.
- The designer made a working prototype because the interaction itself was the design.
- Static screens were insufficient; the quality had to be judged on a real device through motion, timing, and feel.
- A working repo communicated intent better than a long interaction guide.
- The article concludes that the remaining design question is not "how do I make it?" but "what should I make?"

### Challenge Implications

- The challenge asks for a URL where the actual user flow is visible. A working web prototype is aligned with this article's design stance.
- The prototype should not only show final recommendation. It must let the evaluator experience:
  - host creates a meeting
  - host marks required / optional attendees
  - participant joins and marks unavailable / avoid slots
  - system computes a recommendation
  - host sees why the recommendation is acceptable
  - edge case: required conflict leads to adjustment request rather than forced scheduling
- Interaction quality matters because the product is about reducing uncertainty. The host's experience should feel like "the situation is becoming clearer," not "I am reading a complicated table."

### Design Rule to Borrow

> If the experience depends on interaction, build the interaction and judge the actual behavior.

For FitTime: recommendation, state changes, missing responses, and adjustment flow should be interactive, not explained only in slides.

## How These Articles Should Shape Our Challenge Submission

### Problem Definition

Do not define the problem as "It is hard to gather schedules."

Define it as:

> The host's hardest job is not collecting empty time slots, but interpreting mixed-weight constraints and gaining enough evidence to decide that one 1-hour slot is acceptable.

This definition matches the evaluation criterion for discovering the essential problem from context.

### Solution Design

The solution should visibly translate problem elements into UX elements:

| Problem Element | UX Response |
|---|---|
| Hard conflicts and soft preferences are mixed | Split into `안 돼요` and `되도록 피해요` |
| Required and optional people have different weights | Host sets `필수 / 선택` |
| Host needs decision evidence | Show one recommended slot plus reason |
| Attendees may not want soft preferences exposed | Aggregate soft preferences anonymously |
| Waiting for everyone blocks progress | Allow recommendation with current data and mark uncertainty |
| Perfect slot may not exist | Show adjustment request or optional-exclusion path |

### Visual / Interaction Completeness

The prototype should prove the core loop, not just a polished result screen.

Minimum visible flow:

1. Host opens a meeting for 6 people.
2. Host chooses next week, 1 hour, required / optional people.
3. Host shares link.
4. Participant selects their name from the roster.
5. Participant marks unavailable and avoid slots.
6. Host sees participation status.
7. Host sees a single best recommendation.
8. Host opens the reason and sees how required / optional / soft / missing data shaped the answer.
9. If a required person blocks a slot, the product asks for adjustment rather than forcing it.

### FitTime Positioning

FitTime should be described as:

> A meeting-time decision tool for hosts who need to understand mixed constraints and choose the least unreasonable 1-hour slot.

Avoid describing it as:

- a calendar app
- a polling app
- a Doodle clone
- an AI scheduler that decides everything automatically

## Practical Checklist Before Submission

- Does Q1 describe a real host problem, not a generic scheduling annoyance?
- Does Q2 map every key feature to the problem definition?
- Does Q3 explain tradeoffs against existing services?
- Does the prototype show the host flow and the participant flow?
- Does the recommendation screen explain why this slot is best?
- Are hard / soft / required / optional / unknown states visually distinct?
- Are soft preferences protected from unnecessary exposure?
- Is the result URL accessible without Google Drive?
- Is the artifact judged as a working flow, not a visual mood board?

