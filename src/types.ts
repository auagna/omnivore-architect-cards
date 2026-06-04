export type TemplateType =
  | "cover"
  | "info"
  | "exhibition"
  | "calendar"
  | "notes";

export type TextField = {
  value: string;
  size: number; // px at 720 canvas
};

export type CalendarMarker = {
  day: number;
  label: string;
};

export type Slide = {
  id: string;
  template: TemplateType;
  bgImage?: string; // data URL or asset path
  fields: Record<string, TextField>;
  // calendar-only
  calendar?: {
    grid: (number | null)[]; // 35 cells, null for blanks
    headers: string[]; // 7 letters
    marker?: CalendarMarker;
  };
  // notes-only
  notesItems?: TextField[]; // numbered items
};

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  cover: "표지",
  info: "장소 안내",
  exhibition: "전시 소개",
  calendar: "월 일정",
  notes: "안내사항",
};
