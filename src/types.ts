// Reference design width (matches original PDF canvas) — all px sizes are
// expressed in these units and rendered as cqw so they scale with the canvas.
export const REF = 720;

export type FontKey = "suit" | "montserrat";
export type Align = "left" | "center" | "right";

export type Fill =
  | { type: "solid"; color: string }
  | {
      type: "gradient";
      from: string;
      fromA: number; // 0..1 alpha for start color
      to: string;
      toA: number; // 0..1 alpha for end color
      angle: number;
    };

export interface BaseLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface PositionedLayer extends BaseLayer {
  x: number; // % from left
  y: number; // % from top
  w: number; // % width
  h: number; // % height (text uses it as a min / hint)
  rotation: number; // degrees
}

export interface TextLayer extends PositionedLayer {
  kind: "text";
  text: string;
  fontSize: number; // design px @REF
  color: string;
  align: Align;
  weight: number; // 400..900
  font: FontKey;
  lineHeight: number; // unitless
  letterSpacing: number; // em
}

export interface ImageLayer extends PositionedLayer {
  kind: "image";
  src: string;
  radius: number; // design px @REF
  fit: "cover" | "contain";
}

export interface ShapeLayer extends PositionedLayer {
  kind: "shape";
  fill: string; // color or "transparent"
  border: number; // design px @REF
  borderColor: string;
  radius: number; // design px @REF
}

export interface FilterLayer extends BaseLayer {
  kind: "filter";
  fill: Fill;
  opacity: number; // 0..1
}

export interface CalendarLayer extends PositionedLayer {
  kind: "calendar";
  year: number;
  month: number; // 1..12
  headers: string[];
  // highlighted range of current-month days (start..end inclusive)
  range?: { start: number; end: number; label: string };
  showAdjacent: boolean; // show prev/next month dates in empty cells
  color: string;
  markerColor: string;
  headerSize: number; // design px @REF
  daySize: number; // design px @REF
  letterSpacing: number; // em — 자간
  cardFill: string;
  borderColor: string;
}

// Compute calendar cells for a month. Returns full weeks (6×7 max).
export function buildCalendar(
  year: number,
  month: number
): { day: number; inMonth: boolean }[] {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevDays = new Date(year, month - 1, 0).getDate();
  const rows = Math.ceil((firstDay + daysInMonth) / 7);
  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < rows * 7; i++) {
    const off = i - firstDay;
    if (off < 0) cells.push({ day: prevDays + off + 1, inMonth: false });
    else if (off < daysInMonth) cells.push({ day: off + 1, inMonth: true });
    else cells.push({ day: off - daysInMonth + 1, inMonth: false });
  }
  return cells;
}

export type Layer =
  | TextLayer
  | ImageLayer
  | ShapeLayer
  | FilterLayer
  | CalendarLayer;

export type LayerKind = Layer["kind"];

export interface Background {
  type: "image" | "color";
  src?: string;
  color: string;
}

export interface Slide {
  id: string;
  background: Background;
  layers: Layer[]; // ordered bottom -> top
  showWatermark: boolean;
  watermarkText: string;
}

/** hex (#rrggbb) + alpha (0..1) → rgba() string */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type TemplateType =
  | "cover"
  | "info"
  | "exhibition"
  | "calendar"
  | "notes"
  | "blank";

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  cover: "표지",
  info: "장소 안내",
  exhibition: "전시 소개",
  calendar: "월 일정",
  notes: "안내사항",
  blank: "빈 페이지",
};

export const KIND_LABELS: Record<LayerKind, string> = {
  text: "텍스트",
  image: "이미지",
  shape: "도형",
  filter: "필터",
  calendar: "달력",
};

export const BRAND = {
  blue: "#1a2da1",
  blueDark: "#131f7a",
  red: "#e63946",
  white: "#ffffff",
  ink: "#0b0b0b",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Resolve a /public asset against Vite's base (so it works on GitHub Pages
 *  sub-paths, not just the domain root). */
export const asset = (path: string) =>
  import.meta.env.BASE_URL + path.replace(/^\//, "");

/** Convert a design px value (@REF) to a cqw string for proportional sizing */
export const cq = (px: number) => `${(px / REF) * 100}cqw`;
