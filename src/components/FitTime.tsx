"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRange,
  groupByWeek,
  shortDate,
  toISO,
  weekdayKo,
  type Scope,
} from "@/lib/dates";
import {
  checkHealth,
  createMeeting,
  updateMeeting,
  decideMeeting,
  getMeeting,
  getRecommend,
  joinMeeting,
  savePreferences,
  seedMeeting,
  type MeetingSummary,
  type RecommendView,
} from "@/lib/api";

type Screen =
  | "home"
  | "create"
  | "invite"
  | "computing"
  | "recommend"
  | "override"
  | "ask"
  | "stuck"
  | "notice"
  | "done"
  | "join"
  | "onboard"
  | "joined";

type Path = "org" | "part" | null;

type SlotView = RecommendView["ranked"][number];

interface Draft {
  name: string;
  required: boolean;
}

const DEFAULT_DRAFT: Draft[] = [
  { name: "이가영", required: true },
  { name: "윤지은", required: true },
  { name: "박은주", required: true },
  { name: "정지훈", required: true },
  { name: "최인영", required: false },
  { name: "준", required: false },
];

const MIN_PARTICIPANTS = 2;
const HOUR_START = 9;
const HOUR_END = 18;
const STEP_MIN = 30;
// 조직자가 고를 수 있는 '하루 중 시간대' 경계(정시 단위).
const HOUR_CHOICES = Array.from({ length: 19 }, (_, i) => i + 6); // 6시~24시
function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "자정";
  if (h === 12) return "정오";
  return h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`;
}

const DURATION_OPTS: Array<{ min: number; label: string }> = [
  { min: 30, label: "30분" },
  { min: 60, label: "1시간" },
  { min: 90, label: "1시간 반" },
  { min: 120, label: "2시간" },
];

const ORG_STEPS: Screen[] = ["create", "invite", "recommend", "done"];
const PART_STEPS: Screen[] = ["join", "onboard", "joined"];

const SCOPES: Array<{ key: Scope; label: string; sub: string }> = [
  { key: "thisWeek", label: "이번 주", sub: "이번 주 안에" },
  { key: "nextWeek", label: "다음 주", sub: "다음 주 안에" },
  { key: "thisMonth", label: "이번 달", sub: "이번 달 안에" },
];

function stepLabel(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${mm === 0 ? "00" : "30"}`;
}

function labelWithBreak(label: string) {
  // "7/8(화) 오후 2시" → 날짜 / 시각 두 줄
  const i = label.indexOf(") ");
  if (i !== -1)
    return (
      <>
        {label.slice(0, i + 1)}
        <br />
        {label.slice(i + 2)}
      </>
    );
  return label;
}

export default function FitTime() {
  const [screen, setScreen] = useState<Screen>("home");
  const [path, setPath] = useState<Path>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const animKey = useRef(0);

  // 그리드 드래그 페인팅 상태(리렌더와 무관하게 유지)
  const gridRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragModeRef = useRef<"add" | "remove">("add");
  const appliedRef = useRef<Set<string>>(new Set());

  // 조직자 상태
  const [draft, setDraft] = useState<Draft[]>(DEFAULT_DRAFT);
  const [meetingTitle] = useState("스프린트 킥오프");
  const [scope, setScope] = useState<Scope>("thisWeek");
  const [includeWeekend, setIncludeWeekend] = useState(false);
  const [dayStart, setDayStart] = useState(HOUR_START); // 하루 시작 시각(조직자 선택)
  const [dayEnd, setDayEnd] = useState(HOUR_END); // 하루 끝 시각
  const [durationMin, setDurationMin] = useState(60);
  const [code, setCode] = useState("");
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [rec, setRec] = useState<RecommendView | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState("");
  const [adjusted, setAdjusted] = useState(false);
  // 저장소 상태: kv=false면 인메모리 폴백(초대코드 유실 위험). null=확인 전.
  const [health, setHealth] = useState<{
    kv: boolean;
    serverless: boolean;
  } | null>(null);

  // 참여자 상태
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  // 코드로 불러온 회의 로스터(이름 선택용). notFound=코드 조회 실패.
  const [roster, setRoster] = useState<MeetingSummary | null>(null);
  const [rosterNotFound, setRosterNotFound] = useState(false);
  const [participantId, setParticipantId] = useState("");
  // slotId → 칠한 상태. 없으면 "가능".
  const [paint, setPaint] = useState<Record<string, "hard" | "soft">>({});
  const [paintLevel, setPaintLevel] = useState<"hard" | "soft">("hard");
  const [weekIdx, setWeekIdx] = useState(0); // 월간 그리드에서 보고 있는 주

  const todayISO = useMemo(() => toISO(new Date()), []);
  const range = useMemo(
    () => buildRange(scope, todayISO, includeWeekend),
    [scope, todayISO, includeWeekend],
  );

  function toast(m: string) {
    setToastMsg(m);
    window.setTimeout(() => setToastMsg(""), 1400);
  }

  function go(s: Screen) {
    animKey.current += 1;
    setScreen(s);
  }

  // ----- 저장소 상태 1회 확인(초대코드 유실 경고용) -----
  useEffect(() => {
    let alive = true;
    checkHealth()
      .then((h) => {
        if (alive) setHealth(h);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ----- 공유 링크 딥링크: ?join=CODE 로 들어오면 참여 화면에 코드 프리필 -----
  useEffect(() => {
    const c = new URLSearchParams(window.location.search)
      .get("join")
      ?.trim()
      .toUpperCase();
    if (c) {
      setPath("part");
      setJoinCode(c);
      go("join");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- 참여 화면: 코드 6자리면 로스터를 불러와 이름 칩을 보여준다 -----
  useEffect(() => {
    if (screen !== "join") return;
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 6) {
      setRoster(null);
      setRosterNotFound(false);
      return;
    }
    let alive = true;
    setRosterNotFound(false);
    getMeeting(c)
      .then((res) => {
        if (!alive) return;
        setRoster(res.meeting);
        // 다른 회의 명단이면 이전 선택은 무효화
        setJoinName((prev) =>
          res.meeting.participants.some((p) => p.name === prev) ? prev : "",
        );
      })
      .catch(() => {
        if (!alive) return;
        setRoster(null);
        setRosterNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [screen, joinCode]);

  // ----- computing → recommend 자동 진행 -----
  useEffect(() => {
    if (screen !== "computing") return;
    let alive = true;
    (async () => {
      try {
        const r = await getRecommend(code);
        if (!alive) return;
        setRec(r);
        setChosenId(null);
        setShowList(false);
      } catch (e) {
        toast((e as Error).message);
      }
      window.setTimeout(() => {
        if (alive) go("recommend");
      }, 1000);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ================= 액션 =================
  async function handleCreate() {
    const participants = draft
      .map((d) => ({ name: d.name.trim(), required: d.required }))
      .filter((d) => d.name.length > 0);
    if (participants.length < MIN_PARTICIPANTS) {
      toast(`참여자를 ${MIN_PARTICIPANTS}명 이상 넣어주세요`);
      return;
    }
    if (range.dates.length === 0) {
      toast("고를 수 있는 날짜가 없어요");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: meetingTitle,
        durationLabel:
          DURATION_OPTS.find((o) => o.min === durationMin)?.label ??
          `${durationMin}분`,
        durationMin,
        stepMin: STEP_MIN,
        deadlineLabel: range.deadlineLabel,
        scope,
        dates: range.dates,
        hourStart: dayStart,
        hourEnd: dayEnd,
        participants,
      };
      // 이미 이 세션에서 코드를 만들었으면 새로 만들지 않고 그 회의를 수정한다
      // (뒤로 가서 고칠 때 코드가 무한 발급되는 걸 막음).
      const res = code
        ? await updateMeeting(code, payload)
        : await createMeeting(payload);
      setCode(res.code);
      setSummary(res.meeting);
      setJoinCode(res.code); // 참여자 데모용 프리필
      go("invite");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshSummary() {
    if (!code) return;
    try {
      const res = await getMeeting(code);
      setSummary(res.meeting);
    } catch {
      /* noop */
    }
  }

  async function handleSeed() {
    setBusy(true);
    try {
      const res = await seedMeeting(code);
      setSummary(res.meeting);
      if (res.seeded === 0) toast("더 등록할 참여자가 없어요");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecide(slotId: string) {
    setBusy(true);
    try {
      await decideMeeting(code, slotId);
      go("done");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    const c = joinCode.trim().toUpperCase();
    const n = joinName.trim();
    if (c.length < 4) {
      toast("코드를 확인해주세요");
      return;
    }
    if (!n) {
      toast("이름을 알려주세요");
      return;
    }
    setBusy(true);
    try {
      const res = await joinMeeting(c, n);
      setCode(c);
      setParticipantId(res.participantId);
      setSummary(res.meeting);
      setPaint({});
      setWeekIdx(0);
      toast(c + " 회의에 참여!");
      go("onboard");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePrefs() {
    const busyHard: string[] = [];
    const busySoft: string[] = [];
    for (const [id, lvl] of Object.entries(paint)) {
      if (lvl === "hard") busyHard.push(id);
      else busySoft.push(id);
    }
    setBusy(true);
    try {
      await savePreferences(code, participantId, busyHard, busySoft);
      go("joined");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDraft(DEFAULT_DRAFT);
    setPath(null);
    setScope("thisWeek");
    setDayStart(HOUR_START);
    setDayEnd(HOUR_END);
    setDurationMin(60);
    setCode("");
    setSummary(null);
    setRec(null);
    setChosenId(null);
    setShowList(false);
    setOverrideTarget("");
    setAdjusted(false);
    setParticipantId("");
    setJoinCode("");
    setJoinName("");
    setRoster(null);
    setRosterNotFound(false);
    setIncludeWeekend(false);
    setPaint({});
    setPaintLevel("hard");
    setWeekIdx(0);
    go("home");
  }

  function goBack() {
    const bmap: Partial<Record<Screen, Screen>> = {
      override: "recommend",
      ask: "override",
      stuck: "ask",
      notice: "stuck",
    };
    const back = bmap[screen];
    if (back) {
      go(back);
      return;
    }
    const order =
      path === "org" ? ORG_STEPS : path === "part" ? PART_STEPS : [];
    const i = order.indexOf(screen);
    if (i > 0) go(order[i - 1]);
    else reset();
  }

  // ================= 렌더 헬퍼 =================
  function roleInfo(): { text: string; cls: string } | null {
    if (screen === "home") return null;
    if (["join", "onboard", "joined"].includes(screen))
      return { text: "참여자 · 나", cls: "role-user" };
    if (screen === "ask" || screen === "notice")
      return { text: "참여자 · " + overrideTarget, cls: "role-user" };
    if (screen === "done") return { text: "모두에게", cls: "role-org" };
    return { text: "주최자 · 나", cls: "role-org" };
  }

  function dots() {
    const order =
      path === "org" ? ORG_STEPS : path === "part" ? PART_STEPS : [];
    let idx = order.indexOf(screen);
    if (["computing", "override", "ask", "stuck", "notice"].includes(screen))
      idx = order.indexOf("recommend");
    return order.map((_, k) => <i key={k} className={k === idx ? "on" : ""} />);
  }

  const chosen: SlotView | null = (() => {
    if (!rec) return null;
    const all = [...rec.ranked, ...rec.blocked];
    if (chosenId) {
      const found = all.find((s) => s.id === chosenId);
      if (found) return found;
    }
    return rec.ranked[0] ?? all[0] ?? null;
  })();

  // ---- 참여자 그리드: 드래그로 여러 칸 칠하기(마우스·터치 공용) ----
  function applyCell(
    id: string,
    mode: "add" | "remove",
    level: "hard" | "soft",
  ) {
    setPaint((prev) => {
      const cur = prev[id];
      const next = { ...prev };
      if (mode === "remove") {
        if (cur === level) delete next[id]; // 같은 레벨만 지운다
      } else {
        next[id] = level;
      }
      return next;
    });
  }
  function cellIdFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest?.("[data-slot]");
    return cell ? cell.getAttribute("data-slot") : null;
  }
  function onGridDown(e: React.PointerEvent<HTMLDivElement>) {
    const id = cellIdFromPoint(e.clientX, e.clientY);
    if (!id) return; // 헤더·시간칸에서 시작하면 스크롤에 양보
    dragModeRef.current = paint[id] === paintLevel ? "remove" : "add";
    draggingRef.current = true;
    appliedRef.current = new Set([id]);
    applyCell(id, dragModeRef.current, paintLevel);
    try {
      gridRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }
  function onGridMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const id = cellIdFromPoint(e.clientX, e.clientY);
    if (!id || appliedRef.current.has(id)) return;
    appliedRef.current.add(id);
    applyCell(id, dragModeRef.current, paintLevel);
  }
  function onGridUp() {
    draggingRef.current = false;
  }
  function toggleDay(date: string, hours: number[]) {
    setPaint((prev) => {
      const ids = hours.map((h) => `${date}-${h}`);
      const allSet = ids.every((id) => prev[id] === paintLevel);
      const next = { ...prev };
      for (const id of ids) {
        if (allSet) delete next[id];
        else next[id] = paintLevel;
      }
      return next;
    });
  }

  // ================= 화면별 body / cta =================
  let body: React.ReactNode = null;
  let cta: React.ReactNode = null;
  let centerScreen = false;

  if (screen === "home") {
    centerScreen = true;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div
          className="wordmark"
          style={{ justifyContent: "center", display: "flex", fontSize: 28 }}
        >
          회의 시간 정하기
        </div>
        <div className="t-body" style={{ textAlign: "center", marginTop: 10 }}>
          6명의 조건을 모아, 정해도 되는 근거까지 보여줘요
        </div>
        <button
          className="choice accent"
          onClick={() => {
            setPath("org");
            go("create");
          }}
        >
          <div className="ct">회의 만들기</div>
          <div className="cs">필수 참석자와 범위를 정해요 · 주최자</div>
        </button>
        <button
          className="choice"
          onClick={() => {
            setPath("part");
            go("join");
          }}
        >
          <div className="ct">링크로 참여</div>
          <div className="cs">명단에서 나를 고르고 안 되는 시간만 칠해요</div>
        </button>
      </div>
    );
  } else if (screen === "create") {
    const validCount = draft.filter((d) => d.name.trim().length > 0).length;
    body = (
      <>
        <div className="t-title">회의 기준 만들기</div>
        <div className="t-body" style={{ marginTop: 8 }}>
          주최자가 판단해야 할 조건을 먼저 정해요. 필수와 선택을 나누면 추천의
          기준이 분명해져요.
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <span className="lab">제목</span>
            <span className="val">{meetingTitle}</span>
          </div>
        </div>
        <div className="section-label">얼마나 오래 하나요?</div>
        <div className="seg-wide">
          {DURATION_OPTS.map((o) => (
            <button
              key={o.min}
              className={durationMin === o.min ? "on" : ""}
              onClick={() => setDurationMin(o.min)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="section-label">언제 안에서 잡을까요?</div>
        <div className="seg-wide">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              className={scope === s.key ? "on" : ""}
              onClick={() => setScope(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="seg-wide" style={{ marginTop: 8 }}>
          <button
            className={!includeWeekend ? "on" : ""}
            onClick={() => setIncludeWeekend(false)}
          >
            평일만
          </button>
          <button
            className={includeWeekend ? "on" : ""}
            onClick={() => setIncludeWeekend(true)}
          >
            주말 포함
          </button>
        </div>
        <div className="section-label">하루 중 몇 시부터 몇 시까지?</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            className="textin"
            style={{ flex: 1, textAlign: "center" }}
            value={dayStart}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDayStart(v);
              if (dayEnd <= v) setDayEnd(Math.min(24, v + 1));
            }}
          >
            {HOUR_CHOICES.filter((h) => h <= 21).map((h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
          <span style={{ color: "var(--text-3)" }}>~</span>
          <select
            className="textin"
            style={{ flex: 1, textAlign: "center" }}
            value={dayEnd}
            onChange={(e) => setDayEnd(Number(e.target.value))}
          >
            {HOUR_CHOICES.filter((h) => h > dayStart).map((h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
        </div>
        <div className="range-note">
          {range.dates.length > 0 ? (
            <>
              <b>
                {DURATION_OPTS.find((o) => o.min === durationMin)?.label ??
                  `${durationMin}분`}
              </b>
              짜리를 <b>{range.label}</b> {range.dates.length}일 ·{" "}
              {hourLabel(dayStart)}~{hourLabel(dayEnd)}에서 찾아요
            </>
          ) : (
            "고를 수 있는 날짜가 없어요"
          )}
        </div>
        <div className="section-label">
          참석자와 중요도를 정해요 ({validCount}명)
        </div>
        <div className="card">
          {draft.map((p, i) => (
            <div className="row" key={i}>
              <button
                className="iconbtn"
                aria-label="참여자 삭제"
                disabled={draft.length <= MIN_PARTICIPANTS}
                onClick={() => setDraft((d) => d.filter((_, k) => k !== i))}
              >
                −
              </button>
              <div className="grow">
                <input
                  className="textin"
                  value={p.name}
                  placeholder={"참여자 " + (i + 1)}
                  onChange={(e) =>
                    setDraft((d) =>
                      d.map((x, k) =>
                        k === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
              <div className="seg">
                <button
                  className={p.required ? "on" : ""}
                  onClick={() =>
                    setDraft((d) =>
                      d.map((x, k) => (k === i ? { ...x, required: true } : x)),
                    )
                  }
                >
                  필수
                </button>
                <button
                  className={!p.required ? "on" : ""}
                  onClick={() =>
                    setDraft((d) =>
                      d.map((x, k) =>
                        k === i ? { ...x, required: false } : x,
                      ),
                    )
                  }
                >
                  선택
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          className="btn-link"
          style={{ marginTop: 8 }}
          onClick={() => setDraft((d) => [...d, { name: "", required: false }])}
        >
          ＋ 참여자 추가
        </button>
        <div className="hint">
          필수는 반드시 맞추고, 선택은 좋은 후보를 고르는 근거로 써요.
          {code && (
            <>
              <br />
              이미 코드 <b>{code}</b>를 만들었어요 — 새로 만들지 않고 이 회의를
              수정해요.
            </>
          )}
        </div>
      </>
    );
    cta = (
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={handleCreate}
      >
        {code ? "변경사항 저장하고 계속" : "공유 링크 만들기"}
      </button>
    );
  } else if (screen === "invite") {
    const total = summary?.participants.length ?? 0;
    const reg = summary?.participants.filter((p) => p.registered).length ?? 0;
    const pct = total ? Math.round((reg / total) * 100) : 0;
    body = (
      <>
        <div className="t-title">참여 링크를 공유하세요</div>
        <div className="t-body" style={{ marginTop: 8 }}>
          링크를 보내면 팀원은 본인 이름을 고르고, 안 되는 시간만 비공개로
          표시해요.
        </div>
        <div className="token">
          <div className="t-caption">참여 코드 · 보조 입력용</div>
          <div className="code">{code}</div>
        </div>
        {health && !health.kv && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 12,
              textAlign: "left",
              lineHeight: 1.5,
              border: health.serverless
                ? "1px solid var(--hard-fg)"
                : "1px solid var(--soft-fg)",
              background: health.serverless
                ? "var(--hard-bg)"
                : "var(--soft-bg)",
              color: health.serverless ? "var(--hard-fg)" : "var(--soft-fg)",
            }}
          >
            {health.serverless ? (
              <>
                <b>⚠️ 공유 저장소가 연결되지 않았어요</b>
                <div style={{ marginTop: 4 }}>
                  이 코드로 <b>다른 기기에서 접속하면</b> “그런 초대 코드를 찾지
                  못했어요” 오류가 날 수 있어요. 공유 전에 관리자가 Upstash
                  Redis를 연동하고 재배포해야 해요.
                </div>
              </>
            ) : (
              <>
                <b>ℹ️ 로컬 메모리 모드예요</b>
                <div style={{ marginTop: 4 }}>
                  서버를 재시작하면 이 코드가 사라져요. 배포 시엔 KV(Upstash)
                  연동이 필요해요.
                </div>
              </>
            )}
          </div>
        )}
        {summary && (
          <div className="range-note" style={{ marginTop: 12 }}>
            범위 · <b>{range.label}</b>
          </div>
        )}
        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          onClick={async () => {
            const url = `${window.location.origin}/?join=${code}`;
            const shareData = {
              title: "회의 참여",
              text: `‘${meetingTitle}’ 회의에 참여해요. 안 되는 시간만 칠하면 끝!`,
              url,
            };
            if (navigator.share) {
              try {
                await navigator.share(shareData);
                return;
              } catch {
                /* 취소하면 클립보드 폴백 */
              }
            }
            navigator.clipboard?.writeText(url).catch(() => {});
            toast("참여 링크 복사됨");
          }}
        >
          참여 링크 공유
        </button>
        <button
          className="btn btn-ghost"
          style={{ marginTop: 8 }}
          onClick={() => {
            navigator.clipboard?.writeText(code).catch(() => {});
            toast("코드 " + code + " 복사됨");
          }}
        >
          코드만 복사 ({code})
        </button>
        <div className="section-label">판단에 필요한 응답 현황</div>
        <div className="card-flat">
          <div className="status">
            <b>
              {reg} / {total}명 등록
            </b>
            <div className="bar">
              <i style={{ width: pct + "%" }} />
            </div>
          </div>
          <div className="participant-stack">
            {summary?.participants.map((p) => (
              <div
                key={p.id}
                className={"participant-row" + (p.registered ? " done" : "")}
              >
                <span>
                  {p.name}
                  <span
                    style={{
                      color: "var(--text-3)",
                      fontSize: 12,
                      marginLeft: 6,
                    }}
                  >
                    {p.required ? "필수" : "선택"}
                  </span>
                </span>
                <span className="participant-state">
                  {p.registered ? "등록함 ✓" : "대기 중"}
                </span>
              </div>
            ))}
          </div>
          <div className="hint" style={{ textAlign: "left", marginTop: 12 }}>
            등록 여부만 보여요 · 칠한 시간은 비공개예요. 혼자 둘러보는 중이라면
            아래 <b>‘데모’</b> 버튼으로 팀원 응답을 채운 뒤 추천을 보세요.
          </div>
        </div>
        {reg < total && (
          <button className="btn-demo" disabled={busy} onClick={handleSeed}>
            <span className="dtag">데모</span> 나머지 팀원 응답 한 번에 채우기
          </button>
        )}
        <button
          className="btn-link"
          onClick={refreshSummary}
          style={{ marginTop: 2 }}
        >
          현황 새로고침
        </button>
      </>
    );
    cta = (
      <button
        className="btn btn-primary"
        onClick={() => {
          setChosenId(null);
          setShowList(false);
          go("computing");
        }}
      >
        지금 추천 보기
      </button>
    );
  } else if (screen === "computing") {
    centerScreen = true;
    body = (
      <div className="computing">
        <div className="pulse">
          <i />
          <i />
          <i />
        </div>
        <div className="t-title">
          {summary?.participants.length ?? 0}명의 시간을
          <br />
          맞춰보고 있어요
        </div>
        <div className="t-body" style={{ marginTop: 8 }}>
          {range.label} 안에서 · 필수·선호·미응답까지 함께 계산 중
        </div>
      </div>
    );
  } else if (screen === "recommend") {
    if (!rec) {
      body = (
        <div className="t-body" style={{ margin: "auto 0" }}>
          불러오는 중…
        </div>
      );
    } else if (!rec.hasFloor) {
      body = (
        <>
          <div className="card hero" style={{ padding: 24 }}>
            <div className="t-title">지금 필수 전원 되는 시간이 없어요</div>
            <div className="t-body" style={{ marginTop: 8 }}>
              조정을 부탁하거나, 필수를 줄여보세요
            </div>
          </div>
          {rec.blocked.map((e) => {
            const who = e.hardRequiredNames.join(", ") || "필수 인원";
            return (
              <div className="card-flat" style={{ marginTop: 8 }} key={e.id}>
                <div className="t-strong">{e.label}</div>
                <div className="t-caption" style={{ margin: "4px 0 10px" }}>
                  {who} 조정되면 열려요
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: 10 }}
                  onClick={() => {
                    setAdjusted(true);
                    handleDecide(e.id);
                  }}
                >
                  {who}께 조정 부탁하고 이 시간으로
                </button>
              </div>
            );
          })}
        </>
      );
      cta = (
        <button className="btn btn-ghost" onClick={() => go("create")}>
          필수 인원 다시 정하기
        </button>
      );
    } else if (chosen) {
      const e = chosen;
      const hardReq = e.hardRequiredNames;
      const unk = e.unknownRequiredNames;
      const reqLine = hardReq.length ? (
        <>
          필수{" "}
          <b>
            {e.requiredOkCount}/{e.requiredTotal}
          </b>{" "}
          · {hardReq.join(",")} 조정 필요
        </>
      ) : e.reqUnknown === 0 ? (
        <>
          필수 <b>{e.requiredTotal}명 모두</b> 가능
        </>
      ) : (
        <>
          필수{" "}
          <b>
            {e.requiredOkCount}/{e.requiredTotal}
          </b>{" "}
          가능
        </>
      );
      body = (
        <>
          <div className="reg-note">
            {rec.meeting.rangeLabel} · {rec.meeting.participantCount}명 중{" "}
            {rec.meeting.registeredCount}명 응답 · 미응답돼도 추천은 나와요
          </div>
          <div className="card hero">
            <div className="tag">
              {hardReq.length ? "선택한 시간" : "추천 시간"}
            </div>
            <div className="when">{labelWithBreak(e.label)}</div>
            <div className="evidence-stack" aria-label="추천 근거">
              <div className="evidence-item primary">
                <span>필수 참석</span>
                <div className="evidence-value">{reqLine}</div>
              </div>
              <div className="evidence-item">
                <span>선택 참석</span>
                <div className="evidence-value">
                  {e.optionalTotal}명 중 {e.optionalOk}명 가능
                </div>
              </div>
              {e.softCount > 0 ? (
                <div className="evidence-item soft">
                  <span>선호 충돌</span>
                  <div className="evidence-value">
                    아쉬운 분 {e.softCount}명 · 익명 집계
                  </div>
                </div>
              ) : hardReq.length ? null : (
                <div className="evidence-item good">
                  <span>선호 충돌</span>
                  <div className="evidence-value">아쉬운 사람이 없어요</div>
                </div>
              )}
            </div>
            {e.softCount > 0 && (
              <div className="anon-cap">누구인지·이유는 비공개예요</div>
            )}
          </div>
          {unk.length > 0 && (
            <div className="hint" style={{ color: "var(--soft-fg)" }}>
              {unk.join(", ")} 응답 안 함 · 콕 물어볼까요?
            </div>
          )}
          {hardReq.length ? (
            <div className="card-flat" style={{ marginTop: 12 }}>
              <div className="t-body">
                {hardReq.join(",")}님이 이 시간에 안 돼요. 정하면 조정을 부탁할
                수 있어요.
              </div>
            </div>
          ) : (
            <div className="card-flat" style={{ marginTop: 12 }}>
              <div className="t-caption" style={{ marginBottom: 6 }}>
                정하는 근거
              </div>
              <div className="t-body">필수 전원이 가능한 시간 중에서</div>
              <div className="t-body" style={{ marginTop: 4 }}>
                {e.softCount > 0
                  ? "아쉬운 사람이 가장 적은 후보예요"
                  : "안 되는 사람이 없어요"}
              </div>
            </div>
          )}
          <button className="btn-link" onClick={() => setShowList((v) => !v)}>
            {showList ? "접기" : "다른 시간 보기"}
          </button>
          {showList && (
            <div>
              {rec.ranked.map((x, i) => {
                const meta = `필수 ${x.requiredOkCount}/${x.requiredTotal} · 선택 ${x.optionalOk}/${x.optionalTotal}${
                  x.softCount > 0 ? " · 아쉬운 분 " + x.softCount : ""
                }`;
                return (
                  <button
                    key={x.id}
                    className={"slot" + (x.id === e.id ? " sel" : "")}
                    onClick={() => setChosenId(x.id)}
                  >
                    <div className="rank">{i + 1}</div>
                    <div className="grow">
                      <div className="time">
                        <span
                          className="sdot"
                          style={{
                            background:
                              x.softCount > 0
                                ? "var(--soft-fg)"
                                : "var(--ok-fg)",
                          }}
                        />
                        {x.label}
                      </div>
                      <div className="meta">{meta}</div>
                    </div>
                  </button>
                );
              })}
              {rec.blocked.length > 0 && (
                <>
                  <div className="section-label">필수가 안 맞는 시간</div>
                  {rec.blocked.map((x) => (
                    <button
                      key={x.id}
                      className={"slot" + (x.id === e.id ? " sel" : "")}
                      onClick={() => setChosenId(x.id)}
                    >
                      <div className="rank" style={{ color: "var(--hard-fg)" }}>
                        !
                      </div>
                      <div className="grow">
                        <div className="time">
                          <span
                            className="sdot"
                            style={{ background: "var(--hard-fg)" }}
                          />
                          {x.label}
                        </div>
                        <div className="meta">
                          {x.hardRequiredNames.join(",")} 불가 · 조정 필요
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      );
      cta = (
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => {
            if (hardReq.length) {
              setOverrideTarget(hardReq[0]);
              go("override");
            } else {
              handleDecide(e.id);
            }
          }}
        >
          이 시간으로 제안하기
        </button>
      );
    }
  } else if (screen === "override") {
    const e = chosen;
    const t = overrideTarget;
    body = (
      <>
        <div className="t-title">{t}님만 시간이 안 맞아요</div>
        <div className="t-body" style={{ marginTop: 8 }}>
          이 시간이 팀에 가장 좋아요. {t}님께 조정을 부탁해볼까요?
        </div>
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-label" style={{ marginTop: 0 }}>
            지금 이 시간 · {e?.label}
          </div>
          <div className="row">
            <span className="badge badge-hard">
              <span className="dot dot-hard" />
              불가
            </span>
            <div className="grow">
              <div className="name">{t}</div>
              <div className="sub">
                그 시간에 안 된다고 칠했어요 — 조정 부탁 예정
              </div>
            </div>
          </div>
          {e && e.softCount > 0 && (
            <div className="row">
              <span className="badge badge-soft">
                <span className="dot dot-soft" />
                아쉬움
              </span>
              <div className="grow">
                <div className="name">아쉬운 분 {e.softCount}명</div>
                <div className="sub">누구인지·이유는 비공개</div>
              </div>
            </div>
          )}
        </div>
      </>
    );
    cta = (
      <>
        <button className="btn btn-primary" onClick={() => go("ask")}>
          {t}님께 조정 부탁하고 제안하기
        </button>
        <button
          className="btn-link"
          onClick={() => {
            setChosenId(null);
            go("recommend");
          }}
        >
          다른 시간 다시 보기
        </button>
      </>
    );
  } else if (screen === "ask") {
    centerScreen = true;
    const e = chosen;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div className="t-caption" style={{ textAlign: "center" }}>
          팀 회의 시간 조율
        </div>
        <div
          className="t-title"
          style={{ textAlign: "center", margin: "12px 0" }}
        >
          이 시간이 유력해요. 조정 가능하실까요?
        </div>
        <div className="card-flat" style={{ textAlign: "center" }}>
          <div className="t-strong">{e?.label}</div>
          <div className="t-caption" style={{ marginTop: 4 }}>
            지금은 안 된다고 칠해 두셨어요
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => go("stuck")}>
            어려워요
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setAdjusted(true);
              toast("조정 완료! 참석할 수 있어요");
              if (chosen) handleDecide(chosen.id);
            }}
          >
            조정할게요
          </button>
        </div>
        <div className="hint">어려우면 팀이 다른 시간을 다시 찾아요</div>
      </div>
    );
  } else if (screen === "stuck") {
    centerScreen = true;
    const t = overrideTarget;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div className="t-title">{t}님이 이번엔 조정이 어렵대요</div>
        <div className="t-body" style={{ marginTop: 8 }}>
          비난 없이, 두 가지 중에 고르면 돼요.
        </div>
        <div className="card" style={{ marginTop: 20 }}>
          <div className="t-strong">다른 시간을 다시 찾기</div>
          <div className="t-caption" style={{ margin: "4px 0 12px" }}>
            {t}님도 되는 시간으로. 팀이 다시 골라줄게요.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setChosenId(null);
              go("recommend");
            }}
          >
            다시 찾기
          </button>
        </div>
        <div className="card">
          <div className="t-strong">이번엔 {t}님 없이 진행</div>
          <div className="t-caption" style={{ margin: "4px 0 12px" }}>
            회의록을 꼭 공유하고, {t}님껜 정중히 안내돼요.
          </div>
          <button className="btn btn-ghost" onClick={() => go("notice")}>
            이렇게 정하기
          </button>
        </div>
      </div>
    );
  } else if (screen === "notice") {
    centerScreen = true;
    const e = chosen;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div className="t-title" style={{ textAlign: "center" }}>
          이번 회의는 {e?.label}예요
        </div>
        <div className="card-flat" style={{ marginTop: 16 }}>
          <div className="t-body">
            다른 일정과 겹쳐 이번엔 참석이 어려우실 것 같아,{" "}
            <b>회의록을 꼭 공유</b>
            드릴게요.
          </div>
        </div>
        <div className="t-body" style={{ textAlign: "center", marginTop: 16 }}>
          꼭 필요하면 <b>다시 조율</b>할 수 있어요.
        </div>
        <div className="hint">이번만 어긋난 거예요. 다음엔 먼저 배려할게요</div>
      </div>
    );
    cta = (
      <button
        className="btn btn-primary"
        onClick={() => {
          setAdjusted(true);
          if (chosen) handleDecide(chosen.id);
        }}
      >
        확인
      </button>
    );
  } else if (screen === "done") {
    centerScreen = true;
    const e = chosen;
    const soft = !!e && e.softCount > 0;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div className="succ" />
        <div className="t-title" style={{ textAlign: "center" }}>
          {e ? e.label : "조율한 시간"}로 정해졌어요
        </div>
        <div className="t-body" style={{ textAlign: "center", marginTop: 8 }}>
          모두에게 알렸어요.
          {adjusted ? " 조정 부탁도 함께 보냈어요." : ""}
        </div>
        {soft && (
          <div
            className="card-flat"
            style={{ marginTop: 20, textAlign: "center" }}
          >
            <div className="t-body">
              아쉬운 한 분껜 마음도 함께 전했어요.
              <br />
              다음엔 그분 먼저 배려할게요.
            </div>
          </div>
        )}
      </div>
    );
    cta = (
      <button className="btn btn-primary" onClick={reset}>
        처음으로
      </button>
    );
  } else if (screen === "join") {
    centerScreen = true;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div className="t-title" style={{ textAlign: "center" }}>
          회의에 참여하기
        </div>
        <div
          className="t-body"
          style={{ textAlign: "center", margin: "8px 0 20px" }}
        >
          참여 코드를 넣고, 명단에서 <b>본인 이름</b>을 골라주세요
        </div>
        <input
          className="codein"
          maxLength={6}
          value={joinCode}
          placeholder="K7P2QX"
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        />
        {roster ? (
          <>
            <div className="section-label" style={{ textAlign: "center" }}>
              ‘{roster.title}’ · 본인 이름 선택
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
              }}
            >
              {roster.participants.map((p) => {
                const on = joinName === p.name;
                return (
                  <button
                    key={p.id}
                    onClick={() => setJoinName(p.name)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: on
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--line)",
                      background: on ? "var(--accent-weak)" : "var(--surface)",
                      color: on ? "var(--accent-dark)" : "var(--text-2)",
                      fontWeight: on ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {p.name}
                    {p.registered ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
            <div className="hint">
              찾는 이름이 없으면 주최자에게 명단 추가를 요청하세요
              {roster.participants.some((p) => p.registered)
                ? " · ✓는 이미 제출한 사람(다시 골라 수정 가능)"
                : ""}
            </div>
          </>
        ) : (
          <div className="hint">
            {rosterNotFound
              ? "그런 초대 코드를 찾지 못했어요 · 코드를 확인해 주세요"
              : joinCode.length === 6
                ? "명단을 불러오는 중…"
                : code
                  ? "방금 만든 코드가 미리 입력돼 있어요"
                  : "코드는 6자리예요"}
          </div>
        )}
      </div>
    );
    cta = (
      <button
        className="btn btn-primary"
        disabled={busy || !roster || !joinName}
        onClick={handleJoin}
      >
        참여하기
      </button>
    );
  } else if (screen === "onboard") {
    const allDates = summary?.dates ?? range.dates;
    const hs = summary?.hourStart ?? HOUR_START;
    const he = summary?.hourEnd ?? HOUR_END;
    const step = summary?.stepMin ?? STEP_MIN;
    const marks: number[] = [];
    for (let m = hs * 60; m < he * 60; m += step) marks.push(m);
    const markedCount = Object.keys(paint).length;

    // 주 단위로 묶어 한 번에 한 주(≤5일)만 폭에 꽉 채워 보여준다(월간 폰 사용성).
    const weeks = groupByWeek(allDates);
    const wi = Math.min(weekIdx, Math.max(0, weeks.length - 1));
    const dates = weeks[wi] ?? allDates;
    const multiWeek = weeks.length > 1;
    // 이 주에 칠한 칸 수(맥락 표시용)
    const weekMarked = dates.reduce(
      (n, d) => n + marks.filter((m) => paint[`${d}-${m}`]).length,
      0,
    );
    body = (
      <>
        <div style={{ textAlign: "center", margin: "6px 0 14px" }}>
          <span className="privacy">칠한 시간은 아무에게도 안 보여요</span>
        </div>
        <div className="t-title">안 되는 시간을 칠해주세요</div>
        <div className="t-body" style={{ marginTop: 6 }}>
          {summary ? range.label : ""} 안에서, 겹치는 일정이 있는 칸을 탭하거나
          쓸어서 칠하세요. 날짜를 탭하면 하루 전체가 돼요.
        </div>
        <div className="seg-wide" style={{ marginTop: 14 }}>
          <button
            className={paintLevel === "hard" ? "on hard" : "hard"}
            onClick={() => setPaintLevel("hard")}
          >
            <span className="lvl-dot lvl-hard" /> 안 돼요
          </button>
          <button
            className={paintLevel === "soft" ? "on soft" : "soft"}
            onClick={() => setPaintLevel("soft")}
          >
            <span className="lvl-dot lvl-soft" /> 되도록 피해요
          </button>
        </div>
        {multiWeek && (
          <div className="weeknav">
            <button
              className="wknav-btn"
              disabled={wi === 0}
              onClick={() => setWeekIdx(wi - 1)}
              aria-label="이전 주"
            >
              ‹
            </button>
            <div className="wknav-mid">
              <b>
                {wi + 1}/{weeks.length}주차
              </b>
              <span>
                {shortDate(dates[0])}~{shortDate(dates[dates.length - 1])}
              </span>
            </div>
            <button
              className="wknav-btn"
              disabled={wi >= weeks.length - 1}
              onClick={() => setWeekIdx(wi + 1)}
              aria-label="다음 주"
            >
              ›
            </button>
          </div>
        )}
        <div className="grid-wrap">
          <div
            ref={gridRef}
            className="grid paged"
            style={{
              gridTemplateColumns: `44px repeat(${dates.length}, minmax(0, 1fr))`,
            }}
            onPointerDown={onGridDown}
            onPointerMove={onGridMove}
            onPointerUp={onGridUp}
            onPointerCancel={onGridUp}
          >
            <div className="gcorner" />
            {dates.map((d) => (
              <button
                key={d}
                className="ghead"
                onClick={() => toggleDay(d, marks)}
              >
                <span className="gwd">{weekdayKo(d)}</span>
                <span className="gdt">{shortDate(d)}</span>
              </button>
            ))}
            {marks.map((m) => {
              const isHour = m % 60 === 0;
              return (
                <div
                  className="grow-line"
                  key={m}
                  style={{ display: "contents" }}
                >
                  <div className={"gtime" + (isHour ? "" : " half")}>
                    {stepLabel(m)}
                  </div>
                  {dates.map((d) => {
                    const id = `${d}-${m}`;
                    const lvl = paint[id];
                    return (
                      <div
                        key={id}
                        data-slot={id}
                        role="button"
                        className={
                          "gcell" +
                          (isHour ? "" : " half") +
                          (lvl === "hard"
                            ? " hard"
                            : lvl === "soft"
                              ? " soft"
                              : "")
                        }
                        aria-label={`${shortDate(d)} ${stepLabel(m)}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="hint" style={{ marginTop: 12 }}>
          {multiWeek
            ? `이 주 ${weekMarked}칸 · 전체 ${markedCount}칸 표시함 · 다른 주는 ‹ ›로`
            : markedCount > 0
              ? `${markedCount}칸 표시함 · 안 되는 게 없으면 그냥 넘어가도 돼요`
              : "안 되는 시간이 없으면 그냥 넘어가도 돼요"}
        </div>
      </>
    );
    cta = (
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={handleSavePrefs}
      >
        다 됐어요
      </button>
    );
  } else if (screen === "joined") {
    centerScreen = true;
    body = (
      <div style={{ margin: "auto 0" }}>
        <div className="succ" />
        <div className="t-title" style={{ textAlign: "center" }}>
          참여 완료!
        </div>
        <div className="t-body" style={{ textAlign: "center", marginTop: 8 }}>
          팀이 시간을 정하면 알려드릴게요.
          <br />
          칠한 시간은 비공개로 반영돼요.
        </div>
      </div>
    );
    cta = (
      <button className="btn btn-primary" onClick={reset}>
        처음으로
      </button>
    );
  }

  const role = roleInfo();

  return (
    <div className="frame">
      <div className="roleband">
        <button
          className="back"
          style={{ visibility: screen === "home" ? "hidden" : "visible" }}
          onClick={goBack}
        >
          ‹
        </button>
        {role ? (
          <span className={"role " + role.cls}>{role.text}</span>
        ) : (
          <span />
        )}
        <span className="dots">{dots()}</span>
      </div>
      <div
        key={animKey.current}
        className={"screen anim" + (centerScreen ? " center" : "")}
      >
        {body}
      </div>
      <div className="cta-dock">{cta}</div>
      <div className={"toast" + (toastMsg ? " on" : "")}>{toastMsg}</div>
    </div>
  );
}
