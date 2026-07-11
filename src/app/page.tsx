import FitTime from "@/components/FitTime";

export default function Page() {
  return (
    <>
      <div className="head">
        <div className="wordmark">회의 시간 정하기</div>
        <div className="sub">6명의 조건을 한 번에 읽고 결정하기</div>
      </div>
      <FitTime />
    </>
  );
}
