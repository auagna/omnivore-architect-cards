// Reference design width (matches original PDF canvas) — all px sizes are
// expressed in these units and rendered as cqw so they scale with the canvas.
export const REF = 720;

export type FontKey = "suit" | "montserrat";
export type Align = "left" | "center" | "right";

export type Fill =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle: number };

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
  headers: string[];
  grid: (number | null)[];
  marker?: { day: number; label: string };
  color: string;
  markerColor: string;
  headerSize: number; // design px @REF
  daySize: number; // design px @REF
  cardFill: string;
  borderColor: string;
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

/** Convert a design px value (@REF) to a cqw string for proportional sizing */
export const cq = (px: number) => `${(px / REF) * 100}cqw`;
