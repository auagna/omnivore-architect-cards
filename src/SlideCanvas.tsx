import {
  forwardRef,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from "react";
import {
  cq,
  buildCalendar,
  hexToRgba,
  asset,
  type Slide,
  type Layer,
  type TextLayer,
  type ImageLayer,
  type ShapeLayer,
  type FilterLayer,
  type CalendarLayer,
  type Fill,
} from "./types";

const FONT_FAMILY: Record<string, string> = {
  suit: '"SUIT Variable", sans-serif',
  montserrat: '"Montserrat", sans-serif',
};

function fillToCss(fill: Fill): string {
  if (fill.type === "solid") return fill.color;
  const from = hexToRgba(fill.from, fill.fromA);
  const to = hexToRgba(fill.to, fill.toA);
  return `linear-gradient(${fill.angle}deg, ${from}, ${to})`;
}

// Resolve an image src robustly: keep data:/http as-is, otherwise resolve the
// bare filename against Vite's BASE_URL. This makes built-in example images
// survive base-path changes AND stale localStorage from earlier deploys.
function resolveSrc(src?: string): string | undefined {
  if (!src) return src;
  if (src.startsWith("data:") || src.startsWith("http")) return src;
  const name = src.split("?")[0].replace(/\\/g, "/").split("/").pop() ?? "";
  return asset(name);
}

type DragState = {
  mode: "move" | "resize";
  id: string;
  startX: number;
  startY: number;
  layerX: number;
  layerY: number;
  layerW: number;
  layerH: number;
  rectW: number;
  rectH: number;
};

type Props = {
  slide: Slide;
  selectedId: string | null;
  editingId: string | null;
  exporting?: boolean;
  onSelect: (id: string | null) => void;
  onStartEdit: (id: string) => void;
  onChangeLayer: (id: string, patch: Partial<Layer>) => void;
  onCommitText: (id: string, text: string) => void;
};

const SlideCanvas = forwardRef<HTMLDivElement, Props>(function SlideCanvas(
  {
    slide,
    selectedId,
    editingId,
    exporting,
    onSelect,
    onStartEdit,
    onChangeLayer,
    onCommitText,
  },
  ref
) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<DragState | null>(null);

  const setRefs = (el: HTMLDivElement | null) => {
    canvasRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const beginDrag = (
    e: RPointerEvent,
    layer: Layer,
    mode: "move" | "resize"
  ) => {
    if (layer.kind === "filter" || layer.locked) return;
    if (editingId === layer.id) return;
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pl = layer as Exclude<Layer, FilterLayer>;
    drag.current = {
      mode,
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      layerX: pl.x,
      layerY: pl.y,
      layerW: pl.w,
      layerH: pl.h,
      rectW: rect.width,
      rectH: rect.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(layer.id);
  };

  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.startX) / d.rectW) * 100;
    const dyPct = ((e.clientY - d.startY) / d.rectH) * 100;
    if (d.mode === "move") {
      onChangeLayer(d.id, {
        x: clamp(d.layerX + dxPct, -20, 100),
        y: clamp(d.layerY + dyPct, -20, 100),
      } as Partial<Layer>);
    } else {
      onChangeLayer(d.id, {
        w: clamp(d.layerW + dxPct, 4, 120),
        h: clamp(d.layerH + dyPct, 3, 120),
      } as Partial<Layer>);
    }
  };

  const endDrag = (e: RPointerEvent) => {
    if (drag.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    drag.current = null;
  };

  const bgStyle: CSSProperties =
    slide.background.type === "image" && slide.background.src
      ? {
          backgroundImage: `url(${resolveSrc(slide.background.src)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { background: slide.background.color };

  return (
    <div className="slide" ref={setRefs} onClick={() => onSelect(null)}>
      <div className="bg" style={bgStyle} />

      {slide.layers.map((layer) => {
        if (!layer.visible) return null;
        const selected = !exporting && layer.id === selectedId;

        if (layer.kind === "filter") {
          return (
            <div
              key={layer.id}
              className="layer-filter"
              style={{
                background: fillToCss(layer.fill),
                opacity: layer.opacity,
              }}
            />
          );
        }

        const pl = layer as Exclude<Layer, FilterLayer>;
        const wrapStyle: CSSProperties = {
          left: `${pl.x}%`,
          top: `${pl.y}%`,
          width: `${pl.w}%`,
          height: layer.kind === "text" ? "auto" : `${pl.h}%`,
          transform: pl.rotation ? `rotate(${pl.rotation}deg)` : undefined,
        };

        return (
          <div
            key={layer.id}
            className={`layer-wrap ${selected ? "selected" : ""}`}
            style={wrapStyle}
            onPointerDown={(e) => beginDrag(e, layer, "move")}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(layer.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (layer.kind === "text") onStartEdit(layer.id);
            }}
          >
            {layer.kind === "text" && (
              <TextView
                layer={layer}
                editing={editingId === layer.id}
                onCommit={(t) => onCommitText(layer.id, t)}
              />
            )}
            {layer.kind === "image" && <ImageView layer={layer} />}
            {layer.kind === "shape" && <ShapeView layer={layer} />}
            {layer.kind === "calendar" && <CalendarView layer={layer} />}

            {selected && !layer.locked && (
              <span
                className="resize-handle"
                onPointerDown={(e) => beginDrag(e, layer, "resize")}
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        );
      })}

      {slide.showWatermark && (
        <img
          className="wm-img"
          src={asset("oa-wordmark.png")}
          alt="Omnivore Architect"
          draggable={false}
        />
      )}
    </div>
  );
});

function TextView({
  layer,
  editing,
  onCommit,
}: {
  layer: TextLayer;
  editing: boolean;
  onCommit: (text: string) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (editing && elRef.current) {
      const el = elRef.current;
      el.focus();
      // place caret at end
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const style: CSSProperties = {
    fontSize: cq(layer.fontSize),
    color: layer.color,
    textAlign: layer.align,
    fontWeight: layer.weight,
    fontFamily: FONT_FAMILY[layer.font],
    lineHeight: layer.lineHeight,
    letterSpacing: `${layer.letterSpacing}em`,
  };
  return (
    <div
      ref={elRef}
      className={`layer-text ${editing ? "editing" : ""}`}
      style={style}
      contentEditable={editing}
      suppressContentEditableWarning
      onPointerDown={(e) => editing && e.stopPropagation()}
      onBlur={(e) => editing && onCommit(e.currentTarget.innerText)}
    >
      {layer.text}
    </div>
  );
}

function ImageView({ layer }: { layer: ImageLayer }) {
  return (
    <div
      className="layer-image"
      style={{
        backgroundImage: layer.src ? `url(${resolveSrc(layer.src)})` : undefined,
        backgroundColor: layer.src ? undefined : "#5dff5d",
        backgroundSize: layer.fit,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        borderRadius: cq(layer.radius),
      }}
    />
  );
}

function ShapeView({ layer }: { layer: ShapeLayer }) {
  return (
    <div
      className="layer-shape"
      style={{
        background: layer.fill,
        border: layer.border
          ? `${cq(layer.border)} solid ${layer.borderColor}`
          : "none",
        borderRadius: cq(layer.radius),
      }}
    />
  );
}

function CalendarView({ layer }: { layer: CalendarLayer }) {
  const cells = buildCalendar(layer.year, layer.month);
  const r = layer.range;
  const inRange = (day: number, inMonth: boolean) =>
    inMonth && !!r && day >= r.start && day <= r.end;
  return (
    <div
      className="cal-card"
      style={{
        background: layer.cardFill,
        border: `${cq(3)} solid ${layer.borderColor}`,
        borderRadius: cq(6),
        color: layer.color,
      }}
    >
      <div
        className="cal-grid"
        style={{
          letterSpacing: `${layer.letterSpacing}em`,
          rowGap: cq(layer.rowGap),
        }}
      >
        {layer.headers.map((h, i) => (
          <div
            key={`h${i}`}
            className="cal-head"
            style={{ fontSize: cq(layer.headerSize) }}
          >
            {h}
          </div>
        ))}
        {cells.map((c, i) => {
          const hot = inRange(c.day, c.inMonth);
          const showLabel = hot && r?.label && c.day === r.start;
          return (
            <div
              key={`d${i}`}
              className="cal-day"
              style={{
                fontSize: cq(layer.daySize),
                opacity: c.inMonth ? 1 : layer.showAdjacent ? 0.32 : 0,
              }}
            >
              {hot ? (
                <span
                  className="cal-marker"
                  style={{ background: layer.markerColor, color: "#fff" }}
                >
                  {c.day}
                </span>
              ) : (
                c.day
              )}
              {showLabel && (
                <span className="cal-marker-label">{r!.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default SlideCanvas;
