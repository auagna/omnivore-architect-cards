import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./index.css";
import { nodeToPng } from "./exportPng";
import {
  BRAND,
  KIND_LABELS,
  TEMPLATE_LABELS,
  uid,
  type Align,
  type CalendarLayer,
  type FilterLayer,
  type ImageLayer,
  type Layer,
  type ShapeLayer,
  type Slide,
  type TemplateType,
  type TextLayer,
} from "./types";
import {
  defaultSlides,
  makeFilter,
  makeGradientFilter,
  makeImage,
  makeShape,
  makeSlide,
  makeText,
} from "./presets";
import SlideCanvas from "./SlideCanvas";

const STORAGE_KEY = "omnivore-architect-slides-v2";
const SWATCHES = [
  BRAND.blue, BRAND.blueDark, BRAND.red, "#ffffff", "#0b0b0b",
  "#222222", "#f5d76e", "#5dff5d", "#ff8a3d", "#7b61ff",
];

function loadSlides(): Slide[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return structuredClone(defaultSlides);
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// Wait ~2 frames for React to paint, but fall back to a timer: rAF callbacks
// are paused in background/offscreen tabs, so we can't depend on them alone.
const raf2 = () =>
  new Promise<void>((res) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      res();
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 150);
  });
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("시간 초과 (네트워크 확인)")), ms)
    ),
  ]);
}

// Fetch a binary asset and return it as a data: URL. Uses the native
// FileReader (async, off the main thread) — NOT a manual base64 loop, which
// would block the event loop on multi-MB fonts and stall everything.
async function fetchDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Self-embed the webfonts as data URLs (cached) so PNG export keeps the SUIT /
// Montserrat look without html-to-image's own font scan, which can hang on the
// large variable font. Failures fall back gracefully (system font in export).
let _fontCss: string | null = null;
async function getFontEmbedCSS(): Promise<string> {
  if (_fontCss !== null) return _fontCss;
  // Bound each fetch with a setTimeout race (AbortController alone is not
  // reliable in every environment). Fetch both fonts in parallel.
  const tryFetch = async (url: string, ms: number) => {
    try {
      return await withTimeout(fetchDataUrl(url), ms);
    } catch {
      return null;
    }
  };
  const [suit, mont] = await Promise.all([
    tryFetch(
      "https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.woff2",
      9000
    ),
    tryFetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5/files/montserrat-latin-900-normal.woff2",
      9000
    ),
  ]);
  const parts: string[] = [];
  if (suit)
    parts.push(
      `@font-face{font-family:'SUIT Variable';font-weight:100 900;font-style:normal;font-display:swap;src:url(${suit}) format('woff2');}`
    );
  if (mont)
    parts.push(
      `@font-face{font-family:'Montserrat';font-weight:900;font-style:normal;font-display:swap;src:url(${mont}) format('woff2');}`
    );
  _fontCss = parts.join("\n");
  return _fontCss;
}

export default function App() {
  const [slides, setSlides] = useState<Slide[]>(() => loadSlides());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [showAddPage, setShowAddPage] = useState(false);

  const slideRef = useRef<HTMLDivElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const addImgInputRef = useRef<HTMLInputElement | null>(null);
  const replaceImgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
    } catch {
      /* quota — large base64 images */
    }
  }, [slides]);

  useEffect(() => {
    if (currentIdx >= slides.length) setCurrentIdx(Math.max(0, slides.length - 1));
  }, [slides.length, currentIdx]);

  const current = slides[currentIdx];
  const selected = current?.layers.find((l) => l.id === selectedId) ?? null;

  // ── mutations ──
  const updateSlide = (fn: (s: Slide) => Slide) =>
    setSlides((prev) => prev.map((s, i) => (i === currentIdx ? fn(s) : s)));

  const patchLayer = (id: string, patch: Partial<Layer>) =>
    updateSlide((s) => ({
      ...s,
      layers: s.layers.map((l) =>
        l.id === id ? ({ ...l, ...patch } as Layer) : l
      ),
    }));

  const commitText = (id: string, text: string) => {
    patchLayer(id, { text } as Partial<Layer>);
    setEditingId(null);
  };

  const addLayer = (layer: Layer) => {
    updateSlide((s) => ({ ...s, layers: [...s.layers, layer] }));
    setSelectedId(layer.id);
  };

  const deleteLayer = (id: string) => {
    updateSlide((s) => ({ ...s, layers: s.layers.filter((l) => l.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateLayer = (id: string) => {
    const l = current.layers.find((x) => x.id === id);
    if (!l) return;
    const copy = { ...structuredClone(l), id: uid(), name: l.name + " 복사" };
    if ("x" in copy) {
      (copy as { x: number }).x = Math.min(95, (copy as { x: number }).x + 3);
      (copy as { y: number }).y = Math.min(95, (copy as { y: number }).y + 3);
    }
    addLayer(copy as Layer);
  };

  // move within stack: dir +1 = bring forward (toward top), -1 = send back
  const moveLayer = (id: string, dir: 1 | -1) => {
    updateSlide((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      const tgt = idx + dir;
      if (idx < 0 || tgt < 0 || tgt >= s.layers.length) return s;
      const layers = [...s.layers];
      [layers[idx], layers[tgt]] = [layers[tgt], layers[idx]];
      return { ...s, layers };
    });
  };

  // object alignment relative to canvas
  const alignTo = (id: string, where: string) => {
    const l = current.layers.find((x) => x.id === id);
    if (!l || l.kind === "filter") return;
    const p = l as Exclude<Layer, FilterLayer>;
    const patch: Partial<Layer> = {} as Partial<Layer>;
    if (where === "left") (patch as { x: number }).x = 2;
    if (where === "hcenter") (patch as { x: number }).x = (100 - p.w) / 2;
    if (where === "right") (patch as { x: number }).x = 98 - p.w;
    if (where === "top") (patch as { y: number }).y = 2;
    if (where === "vcenter") (patch as { y: number }).y = (100 - p.h) / 2;
    if (where === "bottom") (patch as { y: number }).y = 98 - p.h;
    patchLayer(id, patch);
  };

  // ── pages ──
  const addPage = (tpl: TemplateType) => {
    const ns = makeSlide(tpl);
    setSlides((prev) => {
      const next = [...prev];
      next.splice(currentIdx + 1, 0, ns);
      return next;
    });
    setCurrentIdx(currentIdx + 1);
    setSelectedId(null);
    setShowAddPage(false);
  };

  const deletePage = (idx: number) => {
    if (slides.length === 1) return alert("최소 한 페이지는 필요합니다.");
    if (!confirm("이 페이지를 삭제할까요?")) return;
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    if (currentIdx >= idx && currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const movePage = (dir: -1 | 1) => {
    const tgt = currentIdx + dir;
    if (tgt < 0 || tgt >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      [next[currentIdx], next[tgt]] = [next[tgt], next[currentIdx]];
      return next;
    });
    setCurrentIdx(tgt);
  };

  const resetAll = () => {
    if (!confirm("모든 페이지를 처음 상태로 되돌릴까요? (작업 내용 삭제)")) return;
    setSlides(structuredClone(defaultSlides));
    setCurrentIdx(0);
    setSelectedId(null);
  };

  // ── background / images ──
  const onBgFile = async (file: File) => {
    const src = await fileToDataUrl(file);
    updateSlide((s) => ({ ...s, background: { ...s.background, type: "image", src } }));
  };
  const onAddImageFile = async (file: File) => {
    const src = await fileToDataUrl(file);
    addLayer(makeImage({ src, x: 30, y: 30, w: 40, h: 30, name: "이미지" }));
  };
  const onReplaceImageFile = async (file: File) => {
    if (!selected || selected.kind !== "image") return;
    const src = await fileToDataUrl(file);
    patchLayer(selected.id, { src } as Partial<Layer>);
  };

  // ── export ──
  const capture = async () => {
    const node = slideRef.current!;
    const fontCss = await getFontEmbedCSS();
    return withTimeout(nodeToPng(node, 1080, fontCss), 40000);
  };
  const download = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };
  const exportCurrent = async () => {
    setSelectedId(null);
    setEditingId(null);
    setExporting(true);
    setExportMsg("폰트 준비 중…");
    await raf2();
    try {
      const url = await capture();
      download(url, `omnivore-${currentIdx + 1}.png`);
    } catch (e) {
      alert("내보내기 실패: " + (e as Error).message);
    } finally {
      setExporting(false);
      setExportMsg("");
    }
  };
  const exportAll = async () => {
    setSelectedId(null);
    setEditingId(null);
    setExporting(true);
    const origin = currentIdx;
    try {
      await getFontEmbedCSS(); // warm cache once
      for (let i = 0; i < slides.length; i++) {
        setExportMsg(`내보내는 중… ${i + 1}/${slides.length}`);
        setCurrentIdx(i);
        await raf2();
        await delay(150);
        try {
          const url = await capture();
          download(url, `omnivore-${i + 1}.png`);
          await delay(200);
        } catch {
          /* skip this page, keep going */
        }
      }
    } finally {
      setCurrentIdx(origin);
      setExporting(false);
      setExportMsg("");
    }
  };

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable;
      if (typing || editingId) return;
      if (!selectedId) return;
      const l = current?.layers.find((x) => x.id === selectedId);
      if (!l) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteLayer(selectedId);
        return;
      }
      if (l.kind === "filter") return;
      const p = l as Exclude<Layer, FilterLayer>;
      const step = e.shiftKey ? 2 : 0.5;
      if (e.key === "ArrowLeft") { e.preventDefault(); patchLayer(l.id, { x: p.x - step } as Partial<Layer>); }
      if (e.key === "ArrowRight") { e.preventDefault(); patchLayer(l.id, { x: p.x + step } as Partial<Layer>); }
      if (e.key === "ArrowUp") { e.preventDefault(); patchLayer(l.id, { y: p.y - step } as Partial<Layer>); }
      if (e.key === "ArrowDown") { e.preventDefault(); patchLayer(l.id, { y: p.y + step } as Partial<Layer>); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId, current]); // eslint-disable-line react-hooks/exhaustive-deps

  // layers shown top-first
  const layersTopFirst = useMemo(
    () => (current ? [...current.layers].reverse() : []),
    [current]
  );

  if (!current) return null;

  return (
    <div className="app">
      {/* ── LEFT: pages + layers ── */}
      <aside className="left">
        <header className="brand">
          <h1>Omnivore Architect</h1>
          <p>번개 카드 에디터</p>
        </header>

        <div className="panel-section">
          <div className="ps-head">
            <span>페이지</span>
            <button className="mini" onClick={() => setShowAddPage((v) => !v)}>
              + 추가
            </button>
          </div>
          {showAddPage && (
            <div className="template-picker">
              {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((t) => (
                <button key={t} onClick={() => addPage(t)}>
                  {TEMPLATE_LABELS[t]}
                </button>
              ))}
            </div>
          )}
          <div className="page-list">
            {slides.map((s, i) => (
              <button
                key={s.id}
                className={`page-item ${i === currentIdx ? "active" : ""}`}
                onClick={() => {
                  setCurrentIdx(i);
                  setSelectedId(null);
                }}
              >
                <span className="pi-num">{i + 1}</span>
                <span
                  className="pi-thumb"
                  style={
                    s.background.type === "image" && s.background.src
                      ? { backgroundImage: `url(${s.background.src})` }
                      : { background: s.background.color }
                  }
                />
                <span
                  className="pi-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(i);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section grow">
          <div className="ps-head">
            <span>레이어</span>
            <span className="ps-hint">위 = 앞</span>
          </div>
          <div className="layer-list">
            {layersTopFirst.map((l) => (
              <div
                key={l.id}
                className={`layer-row ${l.id === selectedId ? "active" : ""}`}
                onClick={() => setSelectedId(l.id)}
              >
                <span className={`lr-kind k-${l.kind}`}>
                  {KIND_LABELS[l.kind]}
                </span>
                <span className="lr-name">{l.name}</span>
                <button
                  className="lr-btn"
                  title={l.visible ? "숨기기" : "보이기"}
                  onClick={(e) => {
                    e.stopPropagation();
                    patchLayer(l.id, { visible: !l.visible } as Partial<Layer>);
                  }}
                >
                  {l.visible ? "👁" : "—"}
                </button>
                <button
                  className="lr-btn"
                  title="앞으로"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(l.id, 1);
                  }}
                >
                  ↑
                </button>
                <button
                  className="lr-btn"
                  title="뒤로"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(l.id, -1);
                  }}
                >
                  ↓
                </button>
                <button
                  className="lr-btn danger"
                  title="삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(l.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="add-layer-grid">
            <button onClick={() => addLayer(makeText({ text: "새 텍스트", x: 20, y: 45, w: 60, h: 10, fontSize: 36, weight: 800, color: BRAND.white }))}>
              + 텍스트
            </button>
            <button onClick={() => addLayer(makeShape({ x: 25, y: 35, w: 50, h: 30 }))}>
              + 도형
            </button>
            <button onClick={() => addImgInputRef.current?.click()}>
              + 이미지
            </button>
            <button onClick={() => addLayer(makeFilter())}>+ 단색필터</button>
            <button onClick={() => addLayer(makeGradientFilter())}>
              + 그라디언트
            </button>
          </div>
        </div>
      </aside>

      {/* ── CENTER: canvas ── */}
      <main className="center">
        <div className="toolbar">
          <button onClick={() => movePage(-1)}>← 페이지</button>
          <button onClick={() => movePage(1)}>페이지 →</button>
          <span className="pageinfo">
            {currentIdx + 1} / {slides.length}
          </span>
          <div className="spacer" />
          {exportMsg && <span className="exporting">{exportMsg}</span>}
          <button onClick={resetAll}>초기화</button>
          <button onClick={exportCurrent}>현재 PNG</button>
          <button className="primary" onClick={exportAll}>
            전체 PNG
          </button>
        </div>
        <div className="stage">
          <SlideCanvas
            ref={slideRef}
            slide={current}
            selectedId={selectedId}
            editingId={editingId}
            exporting={exporting}
            onSelect={(id) => {
              setSelectedId(id);
              if (id !== editingId) setEditingId(null);
            }}
            onStartEdit={(id) => {
              setSelectedId(id);
              setEditingId(id);
            }}
            onChangeLayer={patchLayer}
            onCommitText={commitText}
          />
        </div>
      </main>

      {/* ── RIGHT: properties ── */}
      <aside className="right">
        {selected ? (
          <Properties
            layer={selected}
            patch={(p) => patchLayer(selected.id, p)}
            onAlign={(w) => alignTo(selected.id, w)}
            onDuplicate={() => duplicateLayer(selected.id)}
            onDelete={() => deleteLayer(selected.id)}
            onReplaceImage={() => replaceImgInputRef.current?.click()}
            onEdit={() => setEditingId(selected.id)}
          />
        ) : (
          <SlideProps
            slide={current}
            patchBg={(bg) =>
              updateSlide((s) => ({ ...s, background: { ...s.background, ...bg } }))
            }
            onBgUpload={() => bgInputRef.current?.click()}
            toggleWm={() =>
              updateSlide((s) => ({ ...s, showWatermark: !s.showWatermark }))
            }
          />
        )}
      </aside>

      {/* hidden file inputs */}
      <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onBgFile(f); e.target.value = ""; }} />
      <input ref={addImgInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddImageFile(f); e.target.value = ""; }} />
      <input ref={replaceImgInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplaceImageFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ───────────────────────── helper UI ─────────────────────────
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="color-input">
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="swatches">
        {SWATCHES.map((c) => (
          <button
            key={c}
            className="sw"
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

function Slider({
  value, min, max, step = 1, onChange,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="slider-val">{value}</span>
    </div>
  );
}

const alignButtons: { k: string; label: string }[] = [
  { k: "left", label: "⬅" },
  { k: "hcenter", label: "↔" },
  { k: "right", label: "➡" },
  { k: "top", label: "⬆" },
  { k: "vcenter", label: "↕" },
  { k: "bottom", label: "⬇" },
];

function PositionControls({
  layer, patch, onAlign,
}: {
  layer: Exclude<Layer, FilterLayer>;
  patch: (p: Partial<Layer>) => void;
  onAlign: (w: string) => void;
}) {
  return (
    <>
      <div className="section">캔버스 정렬</div>
      <div className="align-grid">
        {alignButtons.map((b) => (
          <button key={b.k} onClick={() => onAlign(b.k)} title={b.k}>
            {b.label}
          </button>
        ))}
      </div>
      <div className="xy-grid">
        <Field label="X %">
          <input type="number" value={round(layer.x)} onChange={(e) => patch({ x: +e.target.value } as Partial<Layer>)} />
        </Field>
        <Field label="Y %">
          <input type="number" value={round(layer.y)} onChange={(e) => patch({ y: +e.target.value } as Partial<Layer>)} />
        </Field>
        <Field label="너비 %">
          <input type="number" value={round(layer.w)} onChange={(e) => patch({ w: +e.target.value } as Partial<Layer>)} />
        </Field>
        <Field label="높이 %">
          <input type="number" value={round(layer.h)} onChange={(e) => patch({ h: +e.target.value } as Partial<Layer>)} />
        </Field>
      </div>
      <Field label={`회전 ${layer.rotation}°`}>
        <Slider value={layer.rotation} min={-180} max={180} onChange={(v) => patch({ rotation: v } as Partial<Layer>)} />
      </Field>
    </>
  );
}

function Properties({
  layer, patch, onAlign, onDuplicate, onDelete, onReplaceImage, onEdit,
}: {
  layer: Layer;
  patch: (p: Partial<Layer>) => void;
  onAlign: (w: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReplaceImage: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="props">
      <div className="props-head">
        <span className={`lr-kind k-${layer.kind}`}>{KIND_LABELS[layer.kind]}</span>
        <input
          className="name-input"
          value={layer.name}
          onChange={(e) => patch({ name: e.target.value } as Partial<Layer>)}
        />
      </div>

      {layer.kind === "text" && (
        <TextProps layer={layer} patch={patch} onEdit={onEdit} />
      )}
      {layer.kind === "image" && (
        <ImageProps layer={layer} patch={patch} onReplace={onReplaceImage} />
      )}
      {layer.kind === "shape" && <ShapeProps layer={layer} patch={patch} />}
      {layer.kind === "filter" && <FilterProps layer={layer} patch={patch} />}
      {layer.kind === "calendar" && <CalendarProps layer={layer} patch={patch} />}

      {layer.kind !== "filter" && (
        <PositionControls
          layer={layer as Exclude<Layer, FilterLayer>}
          patch={patch}
          onAlign={onAlign}
        />
      )}

      <div className="props-actions">
        <button onClick={onDuplicate}>복제</button>
        <button className="danger" onClick={onDelete}>삭제</button>
      </div>
    </div>
  );
}

function TextProps({
  layer, patch, onEdit,
}: {
  layer: TextLayer;
  patch: (p: Partial<Layer>) => void;
  onEdit: () => void;
}) {
  return (
    <>
      <Field label="내용">
        <textarea
          rows={3}
          value={layer.text}
          onChange={(e) => patch({ text: e.target.value } as Partial<Layer>)}
        />
      </Field>
      <button className="full" onClick={onEdit}>슬라이드에서 직접 편집</button>
      <Field label={`글자 크기 ${layer.fontSize}`}>
        <Slider value={layer.fontSize} min={10} max={120} onChange={(v) => patch({ fontSize: v } as Partial<Layer>)} />
      </Field>
      <Field label="글자 색">
        <ColorInput value={layer.color} onChange={(c) => patch({ color: c } as Partial<Layer>)} />
      </Field>
      <Field label="정렬">
        <div className="seg">
          {(["left", "center", "right"] as Align[]).map((a) => (
            <button
              key={a}
              className={layer.align === a ? "on" : ""}
              onClick={() => patch({ align: a } as Partial<Layer>)}
            >
              {a === "left" ? "왼쪽" : a === "center" ? "가운데" : "오른쪽"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="두께">
        <select value={layer.weight} onChange={(e) => patch({ weight: +e.target.value } as Partial<Layer>)}>
          <option value={400}>Regular</option>
          <option value={500}>Medium</option>
          <option value={700}>Bold</option>
          <option value={800}>ExtraBold</option>
          <option value={900}>Heavy</option>
        </select>
      </Field>
      <Field label="글꼴">
        <select value={layer.font} onChange={(e) => patch({ font: e.target.value as "suit" | "montserrat" } as Partial<Layer>)}>
          <option value="suit">SUIT</option>
          <option value="montserrat">Montserrat</option>
        </select>
      </Field>
      <Field label={`줄 간격 ${layer.lineHeight}`}>
        <Slider value={layer.lineHeight} min={0.9} max={2.2} step={0.05} onChange={(v) => patch({ lineHeight: v } as Partial<Layer>)} />
      </Field>
      <Field label={`자간 ${layer.letterSpacing}em`}>
        <Slider value={layer.letterSpacing} min={-0.1} max={0.3} step={0.01} onChange={(v) => patch({ letterSpacing: v } as Partial<Layer>)} />
      </Field>
    </>
  );
}

function ImageProps({
  layer, patch, onReplace,
}: {
  layer: ImageLayer;
  patch: (p: Partial<Layer>) => void;
  onReplace: () => void;
}) {
  return (
    <>
      <button className="full" onClick={onReplace}>이미지 교체</button>
      <Field label="채우기">
        <div className="seg">
          <button className={layer.fit === "cover" ? "on" : ""} onClick={() => patch({ fit: "cover" } as Partial<Layer>)}>꽉 채우기</button>
          <button className={layer.fit === "contain" ? "on" : ""} onClick={() => patch({ fit: "contain" } as Partial<Layer>)}>전체 보기</button>
        </div>
      </Field>
      <Field label={`모서리 둥글기 ${layer.radius}`}>
        <Slider value={layer.radius} min={0} max={80} onChange={(v) => patch({ radius: v } as Partial<Layer>)} />
      </Field>
    </>
  );
}

function ShapeProps({
  layer, patch,
}: {
  layer: ShapeLayer;
  patch: (p: Partial<Layer>) => void;
}) {
  const transparent = layer.fill === "transparent";
  return (
    <>
      <Field label="채움 색">
        <label className="check">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => patch({ fill: e.target.checked ? "transparent" : BRAND.white } as Partial<Layer>)}
          />
          투명
        </label>
        {!transparent && (
          <ColorInput value={layer.fill} onChange={(c) => patch({ fill: c } as Partial<Layer>)} />
        )}
      </Field>
      <Field label={`테두리 두께 ${layer.border}`}>
        <Slider value={layer.border} min={0} max={20} onChange={(v) => patch({ border: v } as Partial<Layer>)} />
      </Field>
      <Field label="테두리 색">
        <ColorInput value={layer.borderColor} onChange={(c) => patch({ borderColor: c } as Partial<Layer>)} />
      </Field>
      <Field label={`모서리 둥글기 ${layer.radius}`}>
        <Slider value={layer.radius} min={0} max={120} onChange={(v) => patch({ radius: v } as Partial<Layer>)} />
      </Field>
    </>
  );
}

function FilterProps({
  layer, patch,
}: {
  layer: FilterLayer;
  patch: (p: Partial<Layer>) => void;
}) {
  const g = layer.fill;
  return (
    <>
      <Field label="종류">
        <div className="seg">
          <button
            className={g.type === "solid" ? "on" : ""}
            onClick={() => patch({ fill: { type: "solid", color: g.type === "solid" ? g.color : "#000000" } } as Partial<Layer>)}
          >
            단색
          </button>
          <button
            className={g.type === "gradient" ? "on" : ""}
            onClick={() => patch({ fill: { type: "gradient", from: "#1a2da1", to: "#000000", angle: 180 } } as Partial<Layer>)}
          >
            그라디언트
          </button>
        </div>
      </Field>
      {g.type === "solid" ? (
        <Field label="색">
          <ColorInput value={g.color} onChange={(c) => patch({ fill: { type: "solid", color: c } } as Partial<Layer>)} />
        </Field>
      ) : (
        <>
          <Field label="시작 색">
            <ColorInput value={g.from} onChange={(c) => patch({ fill: { ...g, from: c } } as Partial<Layer>)} />
          </Field>
          <Field label="끝 색">
            <ColorInput value={g.to} onChange={(c) => patch({ fill: { ...g, to: c } } as Partial<Layer>)} />
          </Field>
          <Field label={`각도 ${g.angle}°`}>
            <Slider value={g.angle} min={0} max={360} onChange={(v) => patch({ fill: { ...g, angle: v } } as Partial<Layer>)} />
          </Field>
        </>
      )}
      <Field label={`투명도 ${Math.round(layer.opacity * 100)}%`}>
        <Slider value={layer.opacity} min={0} max={1} step={0.05} onChange={(v) => patch({ opacity: v } as Partial<Layer>)} />
      </Field>
      <p className="hint">필터를 텍스트 아래로 내리려면 레이어 목록에서 ↓ 버튼으로 순서를 조정하세요.</p>
    </>
  );
}

function CalendarProps({
  layer, patch,
}: {
  layer: CalendarLayer;
  patch: (p: Partial<Layer>) => void;
}) {
  return (
    <>
      <Field label="글자 색">
        <ColorInput value={layer.color} onChange={(c) => patch({ color: c } as Partial<Layer>)} />
      </Field>
      <Field label="강조 색(원)">
        <ColorInput value={layer.markerColor} onChange={(c) => patch({ markerColor: c } as Partial<Layer>)} />
      </Field>
      <div className="xy-grid">
        <Field label="강조 날짜">
          <input
            type="number"
            value={layer.marker?.day ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              const day = v ? parseInt(v, 10) : NaN;
              patch({ marker: !isNaN(day) ? { day, label: layer.marker?.label ?? "" } : undefined } as Partial<Layer>);
            }}
          />
        </Field>
        <Field label="라벨">
          <input
            type="text"
            value={layer.marker?.label ?? ""}
            onChange={(e) => patch({ marker: { day: layer.marker?.day ?? 1, label: e.target.value } } as Partial<Layer>)}
          />
        </Field>
      </div>
      <Field label={`요일 글자 ${layer.headerSize}`}>
        <Slider value={layer.headerSize} min={14} max={48} onChange={(v) => patch({ headerSize: v } as Partial<Layer>)} />
      </Field>
      <Field label={`날짜 글자 ${layer.daySize}`}>
        <Slider value={layer.daySize} min={14} max={56} onChange={(v) => patch({ daySize: v } as Partial<Layer>)} />
      </Field>
      <Field label="날짜 (쉼표 구분, 빈칸은 -)">
        <textarea
          rows={5}
          value={layer.grid.map((d) => (d === null ? "-" : d)).join(",")}
          onChange={(e) => {
            const cells = e.target.value.split(",").map((x) => x.trim()).map((x) => (x === "" || x === "-" ? null : parseInt(x, 10)));
            patch({ grid: cells } as Partial<Layer>);
          }}
        />
      </Field>
    </>
  );
}

function SlideProps({
  slide, patchBg, onBgUpload, toggleWm,
}: {
  slide: Slide;
  patchBg: (bg: Partial<Slide["background"]>) => void;
  onBgUpload: () => void;
  toggleWm: () => void;
}) {
  return (
    <div className="props">
      <div className="props-head">
        <span className="lr-kind k-page">페이지</span>
        <span className="name-input static">배경 설정</span>
      </div>
      <Field label="배경 종류">
        <div className="seg">
          <button className={slide.background.type === "color" ? "on" : ""} onClick={() => patchBg({ type: "color" })}>단색</button>
          <button className={slide.background.type === "image" ? "on" : ""} onClick={() => patchBg({ type: "image" })}>이미지</button>
        </div>
      </Field>
      {slide.background.type === "color" ? (
        <Field label="배경 색">
          <ColorInput value={slide.background.color} onChange={(c) => patchBg({ color: c })} />
        </Field>
      ) : (
        <>
          <button className="full" onClick={onBgUpload}>배경 이미지 업로드</button>
          {slide.background.src && (
            <button className="full" onClick={() => patchBg({ src: "" })}>배경 이미지 제거</button>
          )}
        </>
      )}
      <Field label="워터마크">
        <label className="check">
          <input type="checkbox" checked={slide.showWatermark} onChange={toggleWm} />
          하단 Omnivore Architect 표시
        </label>
      </Field>
      <p className="hint">
        레이어를 선택하면 글자·색·정렬·크기를 편집할 수 있어요. 왼쪽 목록에서
        새 텍스트·도형·이미지·필터 레이어를 추가하세요.
      </p>
    </div>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;
