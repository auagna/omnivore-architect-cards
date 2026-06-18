import {
  BRAND,
  uid,
  asset,
  type Slide,
  type TemplateType,
  type TextLayer,
  type ShapeLayer,
  type ImageLayer,
  type CalendarLayer,
  type FilterLayer,
  type Layer,
} from "./types";

// ── Layer factories ───────────────────────────────────────────────
type TextOpts = Partial<Omit<TextLayer, "kind" | "id">> &
  Pick<TextLayer, "text" | "x" | "y" | "w">;

export function makeText(o: TextOpts): TextLayer {
  return {
    id: uid(),
    kind: "text",
    name: o.name ?? (o.text.slice(0, 10) || "텍스트"),
    visible: true,
    locked: false,
    rotation: 0,
    h: o.h ?? 10,
    fontSize: o.fontSize ?? 24,
    color: o.color ?? BRAND.white,
    align: o.align ?? "left",
    weight: o.weight ?? 500,
    font: o.font ?? "suit",
    lineHeight: o.lineHeight ?? 1.25,
    letterSpacing: o.letterSpacing ?? -0.02,
    ...o,
  };
}

type ShapeOpts = Partial<Omit<ShapeLayer, "kind" | "id">> &
  Pick<ShapeLayer, "x" | "y" | "w" | "h">;

export function makeShape(o: ShapeOpts): ShapeLayer {
  return {
    id: uid(),
    kind: "shape",
    name: o.name ?? "도형",
    visible: true,
    locked: false,
    rotation: 0,
    fill: o.fill ?? BRAND.white,
    border: o.border ?? 0,
    borderColor: o.borderColor ?? BRAND.ink,
    radius: o.radius ?? 6,
    ...o,
  };
}

type ImageOpts = Partial<Omit<ImageLayer, "kind" | "id">> &
  Pick<ImageLayer, "src" | "x" | "y" | "w" | "h">;

export function makeImage(o: ImageOpts): ImageLayer {
  return {
    id: uid(),
    kind: "image",
    name: o.name ?? "이미지",
    visible: true,
    locked: false,
    rotation: 0,
    radius: o.radius ?? 4,
    fit: o.fit ?? "cover",
    ...o,
  };
}

export function makeFilter(): FilterLayer {
  return {
    id: uid(),
    kind: "filter",
    name: "필터",
    visible: true,
    locked: false,
    fill: { type: "solid", color: "#000000" },
    opacity: 0.3,
  };
}

export function makeGradientFilter(): FilterLayer {
  return {
    id: uid(),
    kind: "filter",
    name: "그라디언트 필터",
    visible: true,
    locked: false,
    fill: {
      type: "gradient",
      from: "#1a2da1",
      fromA: 0.85,
      to: "#000000",
      toA: 0,
      angle: 180,
    },
    opacity: 1,
  };
}

// ── Default slides (rebuilt from the original PDF as layer stacks) ──
function coverSlide(): Slide {
  return {
    id: uid(),
    background: { type: "image", src: asset("default-cover.jpg"), color: BRAND.blue },
    showWatermark: true,
    watermarkText: "Omnivore Architect",
    layers: [
      // OMNIVORE ARCHITECT 카드 로고 — 원본 레이아웃 좌표/회전 그대로
      makeImage({
        name: "카드 로고",
        src: asset("oa-card-logo.png"),
        x: 18.33, y: 20.62, w: 41.79, h: 26.42,
        rotation: -19.16,
        fit: "contain",
        radius: 0,
      }),
      makeText({
        name: "분기",
        text: "2026 3분기 잡식건축가 번개",
        x: 6, y: 46, w: 88, h: 6,
        fontSize: 24, weight: 500, color: BRAND.white,
      }),
      makeText({
        name: "월",
        text: "6월",
        x: 6, y: 50, w: 88, h: 12,
        fontSize: 59, weight: 900, color: BRAND.white,
      }),
      makeText({
        name: "제목",
        text: "퐁피두센터 한화 모임안내",
        x: 6, y: 60, w: 90, h: 12,
        fontSize: 59, weight: 900, color: BRAND.white,
      }),
    ],
  };
}

function infoSlide(): Slide {
  return {
    id: uid(),
    background: {
      type: "image",
      src: asset("default-location.png"),
      color: BRAND.blue,
    },
    showWatermark: true,
    watermarkText: "Omnivore Architect",
    layers: [
      makeShape({
        name: "카드",
        x: 6, y: 58, w: 88, h: 30,
        fill: BRAND.white, border: 3, borderColor: BRAND.ink, radius: 6,
      }),
      makeText({
        name: "장소",
        text: "퐁피두센터 한화 / 여의도",
        x: 10, y: 61, w: 80, h: 6,
        fontSize: 32, weight: 900, color: BRAND.ink,
      }),
      makeText({
        name: "일시",
        text: "6/13 (토) 12:00 – 15:00 BY 득우님",
        x: 10, y: 69, w: 80, h: 6,
        fontSize: 24, weight: 800, color: BRAND.ink,
      }),
      makeText({
        name: "소개",
        text: "정곤님이 공간 디자인하신 퐁피두센터 한화 함께가요",
        x: 10, y: 76, w: 80, h: 8,
        fontSize: 24, weight: 500, color: "#222222",
      }),
    ],
  };
}

function exhibitionSlide(): Slide {
  return {
    id: uid(),
    background: { type: "color", color: BRAND.blue },
    showWatermark: true,
    watermarkText: "Omnivore Architect",
    layers: [
      makeImage({
        name: "전시 포스터",
        src: asset("default-exhibition.png"),
        x: 6, y: 15, w: 42, h: 58, fit: "cover", radius: 2,
      }),
      makeText({
        name: "라벨",
        text: "현재 진행중인 전시",
        x: 52, y: 15, w: 44, h: 5,
        fontSize: 18, weight: 800, color: BRAND.white,
      }),
      makeText({
        name: "전시명",
        text: "큐비스트: 시각의 혁신가들",
        x: 52, y: 20, w: 44, h: 8,
        fontSize: 24, weight: 900, color: BRAND.white,
      }),
      makeText({
        name: "설명",
        text: "한화문화재단과 프랑스 퐁피두센터의 파트너십 아래 큐비즘이 탄생한 도시 파리를 중심으로, 1907년부터 1927년까지 약 20년에 걸친 흐름을 폭넓게 조망합니다.",
        x: 52, y: 28, w: 44, h: 30,
        fontSize: 14, weight: 500, color: BRAND.white, lineHeight: 1.5,
      }),
      makeText({
        name: "관람료 라벨",
        text: "관람료",
        x: 52, y: 70, w: 44, h: 4,
        fontSize: 14, weight: 500, color: "rgba(255,255,255,0.75)",
      }),
      makeText({
        name: "관람료",
        text: "성인 28,000원",
        x: 52, y: 74, w: 44, h: 4,
        fontSize: 14, weight: 800, color: BRAND.white,
      }),
      makeText({
        name: "일정 라벨",
        text: "예정관람일정",
        x: 52, y: 80, w: 44, h: 4,
        fontSize: 14, weight: 500, color: "rgba(255,255,255,0.75)",
      }),
      makeText({
        name: "일정",
        text: "6/13 12:00 타임",
        x: 52, y: 84, w: 44, h: 4,
        fontSize: 14, weight: 800, color: BRAND.white,
      }),
    ],
  };
}

function calendarLayer(): CalendarLayer {
  return {
    id: uid(),
    kind: "calendar",
    name: "달력",
    visible: true,
    locked: false,
    rotation: 0,
    x: 8, y: 18, w: 84, h: 64,
    year: 2026,
    month: 6,
    headers: ["S", "M", "T", "W", "T", "F", "S"],
    range: { start: 13, end: 13, label: "퐁피두센터" },
    showAdjacent: true,
    color: BRAND.ink,
    markerColor: BRAND.red,
    headerSize: 30,
    daySize: 34,
    letterSpacing: 0,
    rowGap: 4,
    cardFill: BRAND.white,
    borderColor: BRAND.ink,
  };
}

function calendarSlide(): Slide {
  return {
    id: uid(),
    background: { type: "color", color: BRAND.blue },
    showWatermark: true,
    watermarkText: "Omnivore Architect",
    layers: [
      makeText({
        name: "제목",
        text: "6월 일정 안내",
        x: 0, y: 6, w: 100, h: 8,
        fontSize: 40, weight: 900, color: BRAND.white, align: "center",
      }),
      calendarLayer(),
      makeText({
        name: "안내",
        text: "소규모 번개 매칭에 참여하실 수 있습니다.\n지정 날짜 외에 원하시는 분이 계시다면 번개 개최 환영합니다.",
        x: 6, y: 85, w: 88, h: 8,
        fontSize: 16, weight: 500, color: BRAND.white, align: "center",
        lineHeight: 1.5,
      }),
    ],
  };
}

function notesSlide(): Slide {
  return {
    id: uid(),
    background: { type: "color", color: BRAND.blue },
    showWatermark: true,
    watermarkText: "Omnivore Architect",
    layers: [
      makeShape({
        name: "카드",
        x: 6, y: 10, w: 88, h: 79,
        fill: BRAND.white, border: 3, borderColor: BRAND.ink, radius: 6,
      }),
      makeText({
        name: "제목",
        text: "안내사항",
        x: 6, y: 15, w: 88, h: 8,
        fontSize: 40, weight: 900, color: BRAND.ink, align: "center",
      }),
      makeText({
        name: "항목 1",
        text: "1.   티켓팅은 직접 해주시고 오셔야합니다!",
        x: 12, y: 31, w: 76, h: 6,
        fontSize: 24, weight: 500, color: BRAND.ink, lineHeight: 1.4,
      }),
      makeText({
        name: "항목 2",
        text: "2.   전시 관람 후 식사 예정입니다. 불참의사가 있는 분들은 사전에 알려주세요~",
        x: 12, y: 40, w: 76, h: 10,
        fontSize: 24, weight: 500, color: BRAND.ink, lineHeight: 1.4,
      }),
      makeText({
        name: "항목 3",
        text: "3.   정기 번개모임 외에도 언제든 카톡방에서 자유롭게 번개 모임을 추진해주세요.",
        x: 12, y: 53, w: 76, h: 10,
        fontSize: 24, weight: 500, color: BRAND.ink, lineHeight: 1.4,
      }),
      makeText({
        name: "마무리",
        text: "자주 만나고,\n이야기 나눠요!",
        x: 6, y: 76, w: 88, h: 10,
        fontSize: 28, weight: 900, color: BRAND.ink, align: "center",
        lineHeight: 1.3,
      }),
    ],
  };
}

export function makeSlide(template: TemplateType): Slide {
  switch (template) {
    case "cover":
      return coverSlide();
    case "info":
      return infoSlide();
    case "exhibition":
      return exhibitionSlide();
    case "calendar":
      return calendarSlide();
    case "notes":
      return notesSlide();
    case "blank":
      return {
        id: uid(),
        background: { type: "color", color: BRAND.blue },
        showWatermark: true,
    watermarkText: "Omnivore Architect",
        layers: [
          makeText({
            name: "제목",
            text: "제목을 입력하세요",
            x: 8, y: 12, w: 84, h: 10,
            fontSize: 48, weight: 900, color: BRAND.white,
          }),
        ] as Layer[],
      };
  }
}

export const defaultSlides: Slide[] = [
  coverSlide(),
  infoSlide(),
  exhibitionSlide(),
  calendarSlide(),
  notesSlide(),
];
