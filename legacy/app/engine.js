/*
 * engine.js — 회의 시간 추천 랭킹 엔진
 * design-log.md Entry 008(기준점) / Entry 010(4상태)의 "실행되는 명세".
 * 순수 로직만. UI 의존 없음. file://에서도 돌도록 classic script(window.Engine).
 *
 * 기준점 v1:
 *   Floor: 필수 참석자 전원이 '불가' 아님(하드 블록 없음).
 *   랭킹:  ① 소프트 위반 총량 최소
 *          ② 회의 내 minimax(양보 몰림 방지)  ※ v1 근사: 아래 주석 참고
 *          ③ 선택 참석자 가능 수 최대
 *          ④ 마감까지 최단(빠른 슬롯 우선)
 */
(function (global) {
  'use strict';

  var WEEKDAYS = ['월', '화', '수', '목', '금'];

  // 개인 × 슬롯 상태 (Entry 010)
  var STATE = { OK: '가능', SOFT: '아쉬움', UNKNOWN: '미응답', HARD: '불가' };

  // person: {
  //   id, name, required(bool), registered(bool),
  //   hardDays: [0..4],        // 반복 외근 요일
  //   hardDates: ['2026-07-09'],// 일회성 거부(치과 등) — 기본 하드 처리(Entry 018)
  //   soft: { postLunch, earlyMorning, friPM }
  // }
  // slot: { id, dayIdx(0..4), date, hour(9..17) }  // 1시간 회의

  function personState(p, slot) {
    if (!p.registered) return STATE.UNKNOWN; // 규칙 미등록 = 모름(non-blocking)
    if (p.hardDays && p.hardDays.indexOf(slot.dayIdx) !== -1) return STATE.HARD;
    if (p.hardDates && p.hardDates.indexOf(slot.date) !== -1) return STATE.HARD;
    var s = p.soft || {};
    if (s.postLunch && slot.hour >= 13 && slot.hour < 14) return STATE.SOFT;   // 점심 직후(13시)
    if (s.earlyMorning && slot.hour < 10) return STATE.SOFT;                    // 이른 아침(9시대)
    if (s.morningFocus && slot.hour >= 10 && slot.hour < 13) return STATE.SOFT; // 오전 집중시간(10~12시)
    if (s.afternoonSlump && slot.hour >= 14 && slot.hour < 16) return STATE.SOFT; // 오후 나른(14~15시)
    if (s.lateAfternoon && slot.hour >= 16) return STATE.SOFT;                  // 늦은 오후(16~17시)
    if (s.friPM && slot.dayIdx === 4 && slot.hour >= 13) return STATE.SOFT;     // 금요일 오후
    return STATE.OK;
  }

  function evaluateSlot(people, slot) {
    var states = people.map(function (p) {
      return { person: p, state: personState(p, slot) };
    });
    var required = states.filter(function (x) { return x.person.required; });
    var optional = states.filter(function (x) { return !x.person.required; });

    var reqHard = required.filter(function (x) { return x.state === STATE.HARD; }).length;
    var reqUnknown = required.filter(function (x) { return x.state === STATE.UNKNOWN; }).length;
    var softViolators = states.filter(function (x) { return x.state === STATE.SOFT; });
    var optionalOk = optional.filter(function (x) {
      return x.state === STATE.OK || x.state === STATE.SOFT;
    }).length;

    return {
      slot: slot,
      states: states,
      floorPass: reqHard === 0,          // 필수 전원 불가 아님
      reqHard: reqHard,
      reqUnknown: reqUnknown,            // 필수 미응답 = 신뢰도 경고(외과적 알림 대상)
      softCount: softViolators.length,   // 소프트 위반 총량
      softViolators: softViolators,
      optionalOk: optionalOk,
      requiredOkCount: required.length - reqHard,
      requiredTotal: required.length,
      optionalTotal: optional.length
    };
  }

  function slotOrder(s) { return s.dayIdx * 100 + s.hour; }

  function rankSlots(people, slots) {
    var evals = slots.map(function (s) { return evaluateSlot(people, s); });
    var floor = evals.filter(function (e) { return e.floorPass; });

    // 랭킹 정렬 (기준점 v1)
    floor.sort(function (a, b) {
      return (a.softCount - b.softCount)         // ① 소프트 위반 최소
        || (a.reqUnknown - b.reqUnknown)         // (신뢰도) 확실한 것 우선
        || (b.optionalOk - a.optionalOk)         // ③ 선택 최대
        || (slotOrder(a.slot) - slotOrder(b.slot)); // ④ 최단
      // ② minimax 주석: v1은 한 슬롯에서 사람당 소프트 위반이 최대 1이라
      //    슬롯 단위 minimax는 softCount로 근사된다. "특정인에게 회의가
      //    반복적으로 몰림" 방지(회의 간 공정)는 v2(이력 필요) — Entry 008/016.
    });

    var blocked = evals.filter(function (e) { return !e.floorPass; }); // Floor-empty 조정 후보
    // 조정 후보는 "필수 불가자가 가장 적은" 순으로
    blocked.sort(function (a, b) {
      return (a.reqHard - b.reqHard) || (slotOrder(a.slot) - slotOrder(b.slot));
    });

    return { ranked: floor, blocked: blocked, floorEmpty: floor.length === 0 };
  }

  // 슬롯 라벨 (UI 편의)
  function slotLabel(slot) {
    if (slot.hour === 12) return WEEKDAYS[slot.dayIdx] + '요일 낮 12시';
    var ampm = slot.hour < 12 ? '오전' : '오후';
    var h12 = slot.hour <= 12 ? slot.hour : slot.hour - 12;
    return WEEKDAYS[slot.dayIdx] + '요일 ' + ampm + ' ' + h12 + '시';
  }

  // 근무주(월~금 × 9~17시 시작) 슬롯 생성
  function makeWeekSlots(mondayDate) {
    var slots = [];
    for (var d = 0; d < 5; d++) {
      for (var h = 9; h <= 17; h++) {
        slots.push({ id: d + '-' + h, dayIdx: d, date: addDays(mondayDate, d), hour: h });
      }
    }
    return slots;
  }
  function addDays(iso, n) {
    // iso 'YYYY-MM-DD' → +n일 (UTC 기준, 데모용 단순 계산)
    var parts = iso.split('-').map(Number);
    var t = Date.UTC(parts[0], parts[1] - 1, parts[2]) + n * 86400000;
    var dt = new Date(t);
    var mm = ('0' + (dt.getUTCMonth() + 1)).slice(-2);
    var dd = ('0' + dt.getUTCDate()).slice(-2);
    return dt.getUTCFullYear() + '-' + mm + '-' + dd;
  }

  global.Engine = {
    WEEKDAYS: WEEKDAYS,
    STATE: STATE,
    personState: personState,
    evaluateSlot: evaluateSlot,
    rankSlots: rankSlots,
    slotLabel: slotLabel,
    makeWeekSlots: makeWeekSlots
  };
})(typeof window !== 'undefined' ? window : this);
