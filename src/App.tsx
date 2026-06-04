import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import type { Slide as SlideType, TemplateType } from "./types";
import { TEMPLATE_LABELS } from "./types";
import { defaultSlides, createEmptySlide } from "./defaultSlides";
import Slide from "./Slide";

const STORAGE_KEY = "omnivore-architect-slides-v1";

function loadSlides(): SlideType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSlides;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return defaultSlides;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [slides, setSlides] = useState<SlideType[]>(() => loadSlides());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [tab, setTab] = useState<"slides" | "props">("slides");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
    } catch {
      // probably quota — happens with many big base64 backgrounds
    }
  }, [slides]);

  useEffect(() => {
    if (currentIdx >= slides.length) {
      setCurrentIdx(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentIdx]);

  const current = slides[currentIdx];

  const updateCurrent = (updater: (s: SlideType) => SlideType) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === currentIdx ? updater(s) : s))
    );
  };

  const updateField = (key: string, value: string) => {
    updateCurrent((s) => ({
      ...s,
      fields: { ...s.fields, [key]: { ...s.fields[key], value } },
    }));
  };

  const updateNotesItem = (idx: number, value: string) => {
    updateCurrent((s) => ({
      ...s,
      notesItems: s.notesItems?.map((it, i) =>
        i === idx ? { ...it, value } : it
      ),
    }));
  };

  const updateFieldSize = (key: string, size: number) => {
    if (key.startsWith("notes-")) {
      const idx = parseInt(key.slice(6), 10);
      updateCurrent((s) => ({
        ...s,
        notesItems: s.notesItems?.map((it, i) =>
          i === idx ? { ...it, size } : it
        ),
      }));
    } else {
      updateCurrent((s) => ({
        ...s,
        fields: { ...s.fields, [key]: { ...s.fields[key], size } },
      }));
    }
  };

  const onChangeBg = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    updateCurrent((s) => ({ ...s, bgImage: dataUrl }));
  };

  const onChangeExhibitionImage = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    updateCurrent((s) => ({
      ...s,
      fields: {
        ...s.fields,
        image: { ...s.fields.image, value: dataUrl },
      },
    }));
  };

  const onResetBg = () => {
    updateCurrent((s) => ({ ...s, bgImage: "" }));
  };

  const addSlide = (tpl: TemplateType) => {
    const newSlide = createEmptySlide(tpl);
    setSlides((prev) => {
      const next = [...prev];
      next.splice(currentIdx + 1, 0, newSlide);
      return next;
    });
    setCurrentIdx(currentIdx + 1);
    setShowTemplatePicker(false);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length === 1) {
      alert("최소 한 페이지는 남겨두세요!");
      return;
    }
    if (!confirm("이 페이지를 삭제할까요?")) return;
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    if (currentIdx >= idx && currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setCurrentIdx(target);
  };

  const resetAll = () => {
    if (!confirm("모든 슬라이드를 처음 상태로 되돌릴까요?")) return;
    setSlides(defaultSlides);
    setCurrentIdx(0);
  };

  const selectedFieldData = useMemo(() => {
    if (!current || !selectedField) return null;
    if (selectedField.startsWith("notes-")) {
      const idx = parseInt(selectedField.slice(6), 10);
      const item = current.notesItems?.[idx];
      return item ? { key: selectedField, field: item } : null;
    }
    const f = current.fields[selectedField];
    return f ? { key: selectedField, field: f } : null;
  }, [current, selectedField]);

  useEffect(() => {
    if (selectedField) setTab("props");
  }, [selectedField]);

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <h1>Omnivore Architect</h1>
          <p>번개 모임 카드 에디터</p>
        </header>

        <div className="sidebar-tabs">
          <button
            className={tab === "slides" ? "active" : ""}
            onClick={() => setTab("slides")}
          >
            슬라이드
          </button>
          <button
            className={tab === "props" ? "active" : ""}
            onClick={() => setTab("props")}
          >
            편집
          </button>
        </div>

        <div className="sidebar-body">
          {tab === "slides" && (
            <>
              <div className="slide-list">
                {slides.map((s, i) => (
                  <div
                    key={s.id}
                    className={`slide-thumb ${i === currentIdx ? "active" : ""}`}
                    onClick={() => setCurrentIdx(i)}
                    style={
                      s.bgImage
                        ? undefined
                        : { background: "var(--brand-blue)" }
                    }
                  >
                    {s.bgImage && (
                      <div
                        className="thumb-bg"
                        style={{ backgroundImage: `url(${s.bgImage})` }}
                      />
                    )}
                    <div className="thumb-num">{i + 1}</div>
                    <div className="thumb-label">
                      {TEMPLATE_LABELS[s.template]}
                    </div>
                    <button
                      className="thumb-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlide(i);
                      }}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {showTemplatePicker ? (
                <div className="template-picker">
                  {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((t) => (
                    <button key={t} onClick={() => addSlide(t)}>
                      {TEMPLATE_LABELS[t]}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowTemplatePicker(false)}
                    style={{ gridColumn: "1 / -1", color: "var(--muted)" }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  className="add-slide"
                  onClick={() => setShowTemplatePicker(true)}
                  style={{ marginTop: 12 }}
                >
                  + 페이지 추가
                </button>
              )}

              <p className="hint">
                썸네일 클릭으로 이동, 호버 시 ×로 삭제. 페이지 추가는 현재
                페이지 다음 위치에 들어갑니다.
              </p>
            </>
          )}

          {tab === "props" && current && (
            <div className="props">
              <p className="help-note">
                슬라이드의 텍스트를 직접 클릭해 수정할 수 있어요. 클릭한
                텍스트의 크기는 아래에서 조절할 수 있습니다.
              </p>

              <div className="section-title">현재 페이지</div>
              <div className="row">
                <label>템플릿</label>
                <input
                  type="text"
                  value={TEMPLATE_LABELS[current.template]}
                  disabled
                />
              </div>

              <div className="row">
                <label>배경 사진</label>
                <div className="bg-controls">
                  <button onClick={() => fileInputRef.current?.click()}>
                    이미지 업로드
                  </button>
                  <button onClick={onResetBg}>초기화</button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChangeBg(file);
                    e.target.value = "";
                  }}
                />
                {current.template === "exhibition" && (
                  <>
                    <label style={{ marginTop: 10 }}>전시 이미지</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onChangeExhibitionImage(file);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>

              {selectedFieldData ? (
                <>
                  <div className="section-title">선택된 텍스트</div>
                  <div className="row">
                    <label>내용</label>
                    <textarea
                      rows={3}
                      value={selectedFieldData.field.value}
                      onChange={(e) => {
                        if (selectedField?.startsWith("notes-")) {
                          updateNotesItem(
                            parseInt(selectedField.slice(6), 10),
                            e.target.value
                          );
                        } else if (selectedField) {
                          updateField(selectedField, e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div className="row">
                    <label>
                      글자 크기 ({selectedFieldData.field.size}px)
                    </label>
                    <div className="size-row">
                      <input
                        type="range"
                        min={10}
                        max={120}
                        value={selectedFieldData.field.size}
                        onChange={(e) =>
                          selectedField &&
                          updateFieldSize(
                            selectedField,
                            parseInt(e.target.value, 10)
                          )
                        }
                      />
                      <span className="size-val">
                        {selectedFieldData.field.size}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">
                  편집할 텍스트를 슬라이드에서 클릭하세요
                </div>
              )}

              {current.template === "calendar" && (
                <>
                  <div className="section-title">달력 표시</div>
                  <div className="row">
                    <label>표시할 날짜 (없으면 비워두기)</label>
                    <input
                      type="text"
                      value={current.calendar?.marker?.day ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        const day = v ? parseInt(v, 10) : null;
                        updateCurrent((s) => ({
                          ...s,
                          calendar: s.calendar
                            ? {
                                ...s.calendar,
                                marker:
                                  day !== null && !isNaN(day)
                                    ? {
                                        day,
                                        label:
                                          s.calendar.marker?.label ?? "",
                                      }
                                    : undefined,
                              }
                            : undefined,
                        }));
                      }}
                    />
                  </div>
                  <div className="row">
                    <label>날짜 라벨</label>
                    <input
                      type="text"
                      value={current.calendar?.marker?.label ?? ""}
                      onChange={(e) => {
                        updateCurrent((s) => ({
                          ...s,
                          calendar: s.calendar
                            ? {
                                ...s.calendar,
                                marker: s.calendar.marker
                                  ? {
                                      ...s.calendar.marker,
                                      label: e.target.value,
                                    }
                                  : { day: 1, label: e.target.value },
                              }
                            : undefined,
                        }));
                      }}
                    />
                  </div>
                  <div className="row">
                    <label>달력 숫자 (쉼표로 구분, 빈칸은 -)</label>
                    <textarea
                      rows={5}
                      value={current.calendar?.grid
                        .map((d) => (d === null ? "-" : d))
                        .join(",")}
                      onChange={(e) => {
                        const cells = e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .map((x) =>
                            x === "" || x === "-" ? null : parseInt(x, 10)
                          );
                        updateCurrent((s) => ({
                          ...s,
                          calendar: s.calendar
                            ? { ...s.calendar, grid: cells }
                            : undefined,
                        }));
                      }}
                    />
                  </div>
                </>
              )}

              {current.template === "notes" && (
                <>
                  <div className="section-title">안내사항 항목</div>
                  <div className="row">
                    <button
                      onClick={() =>
                        updateCurrent((s) => ({
                          ...s,
                          notesItems: [
                            ...(s.notesItems ?? []),
                            { value: "새 항목", size: 24 },
                          ],
                        }))
                      }
                      style={{
                        padding: 8,
                        background: "white",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      + 항목 추가
                    </button>
                    {current.notesItems &&
                      current.notesItems.length > 1 && (
                        <button
                          onClick={() =>
                            updateCurrent((s) => ({
                              ...s,
                              notesItems: s.notesItems?.slice(0, -1),
                            }))
                          }
                          style={{
                            padding: 8,
                            background: "white",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: 12,
                            marginTop: 4,
                            color: "var(--muted)",
                          }}
                        >
                          마지막 항목 삭제
                        </button>
                      )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="canvas-area">
        <div className="toolbar">
          <button onClick={() => moveSlide(currentIdx, -1)}>← 앞으로</button>
          <button onClick={() => moveSlide(currentIdx, 1)}>뒤로 →</button>
          <span className="page-info">
            {currentIdx + 1} / {slides.length}
          </span>
          <div className="spacer" />
          <button onClick={resetAll}>전체 초기화</button>
          <button
            className="primary"
            onClick={() => setShowTemplatePicker(true)}
          >
            + 페이지 추가
          </button>
        </div>

        <div className="canvas-stage">
          {current && (
            <Slide
              slide={current}
              selectedField={selectedField}
              onSelectField={setSelectedField}
              onUpdateField={updateField}
              onUpdateNotesItem={updateNotesItem}
            />
          )}
        </div>
      </main>
    </div>
  );
}
