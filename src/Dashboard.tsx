import { useMemo, useState } from "react";
import { buildCalendar, type BungaeProject } from "./types";
import { sortByDate } from "./store";

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

type Props = {
  list: BungaeProject[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
};

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return { y, m, d };
}

export default function Dashboard({ list, onOpen, onDelete, onNew }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1..12

  const cells = useMemo(() => buildCalendar(year, month), [year, month]);

  // map day-of-month -> events (current month only)
  const eventsByDay = useMemo(() => {
    const map = new Map<number, BungaeProject[]>();
    for (const p of list) {
      const { y, m, d } = parseYmd(p.eventDate);
      if (y === year && m === month) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(p);
      }
    }
    return map;
  }, [list, year, month]);

  const sorted = useMemo(() => sortByDate(list), [list]);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const shift = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="dash">
      <div className="dash-main">
        <div className="dash-head">
          <div className="dash-title">
            <h2>번개 일정</h2>
            <span className="dash-sub">저장한 번개가 달력에 표시됩니다</span>
          </div>
          <div className="dash-nav">
            <button onClick={() => shift(-1)}>‹</button>
            <span className="dash-month">
              {year}. {MONTH_NAMES[month - 1]}
            </span>
            <button onClick={() => shift(1)}>›</button>
            <button
              className="dash-today"
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth() + 1);
              }}
            >
              오늘
            </button>
          </div>
        </div>

        <div className="dash-cal">
          {DOW.map((d, i) => (
            <div key={`h${i}`} className={`dash-dow ${i === 0 ? "sun" : ""}`}>
              {d}
            </div>
          ))}
          {cells.map((c, i) => {
            const evs = c.inMonth ? eventsByDay.get(c.day) : undefined;
            const isToday =
              c.inMonth &&
              `${year}-${String(month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}` === todayStr;
            return (
              <div
                key={i}
                className={`dash-cell ${c.inMonth ? "" : "out"} ${isToday ? "today" : ""}`}
              >
                <span className="dash-daynum">{c.day}</span>
                {evs?.map((e) => (
                  <button
                    key={e.id}
                    className="dash-event"
                    title={`${e.name} — 열기`}
                    onClick={() => onOpen(e.id)}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="dash-side">
        <div className="dash-side-head">
          <span>번개 리스트 ({list.length})</span>
          <button className="dash-new" onClick={onNew}>+ 새 번개</button>
        </div>
        {sorted.length === 0 ? (
          <p className="dash-empty">
            아직 저장된 번개가 없습니다.<br />
            생성 페이지에서 <b>번개로 저장</b>을 누르면 여기에 쌓입니다.
          </p>
        ) : (
          <div className="dash-list">
            {sorted.map((p) => (
              <div key={p.id} className="dash-item">
                <button className="dash-item-main" onClick={() => onOpen(p.id)}>
                  <span className="dash-item-date">{p.eventDate}</span>
                  <span className="dash-item-name">{p.name}</span>
                  <span className="dash-item-meta">
                    {p.slides.length}장 · 열기
                  </span>
                </button>
                <button
                  className="dash-item-del"
                  title="삭제"
                  onClick={() => onDelete(p.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
