import type { Slide, TemplateType } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

export const defaultSlides: Slide[] = [
  {
    id: uid(),
    template: "cover",
    bgImage: "/default-cover.jpg",
    fields: {
      quarter: { value: "2026 3분기 잡식건축가 번개", size: 24 },
      month: { value: "6월", size: 59 },
      title: { value: "퐁피두센터 한화 모임안내", size: 59 },
    },
  },
  {
    id: uid(),
    template: "info",
    bgImage: "/default-location.jpg",
    fields: {
      place: { value: "퐁피두센터 한화 / 여의도", size: 32 },
      when: { value: "6/13 (토) 12:00 – 15:00 BY 득우님", size: 24 },
      desc: { value: "정곤님이 공간 디자인하신 퐁피두센터 한화 함께가요", size: 24 },
    },
  },
  {
    id: uid(),
    template: "exhibition",
    bgImage: "",
    fields: {
      label: { value: "현재 진행중인 전시", size: 24 },
      title: { value: "큐비스트: 시각의 혁신가들", size: 24 },
      body: {
        value:
          "한화문화재단과 프랑스 퐁피두센터의 파트너십 아래 큐비즘이 탄생한 도시 파리를 중심으로, 1907년부터 1927년까지 약 20년에 걸친 흐름을 폭넓게 조망합니다.",
        size: 14,
      },
      footLabel1: { value: "관람료", size: 14 },
      footValue1: { value: "성인 28,000원", size: 14 },
      footLabel2: { value: "예정관람일정", size: 14 },
      footValue2: { value: "6/13 12:00 타임", size: 14 },
      image: { value: "/default-exhibition.png", size: 0 },
    },
  },
  {
    id: uid(),
    template: "calendar",
    bgImage: "",
    fields: {
      title: { value: "6월 일정 안내", size: 40 },
      foot: {
        value:
          "소규모 번개 매칭에 참여하실 수 있습니다.\n지정 날짜 외에 원하시는 분이 계시다면 번개 개최 환영합니다.",
        size: 16,
      },
    },
    calendar: {
      headers: ["S", "M", "T", "W", "T", "F", "S"],
      // June 2026 starts on Monday — show week from prev Sunday May 31
      grid: [
        31, 1, 2, 3, 4, 5, 6,
        7, 8, 9, 10, 11, 12, 13,
        14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27,
        28, 29, 30, null, null, null, null,
      ],
      marker: { day: 13, label: "퐁피두센터" },
    },
  },
  {
    id: uid(),
    template: "notes",
    bgImage: "",
    fields: {
      title: { value: "안내사항", size: 40 },
      closing: { value: "자주 만나고,\n이야기 나눠요!", size: 28 },
    },
    notesItems: [
      { value: "티켓팅은 직접 해주시고 오셔야합니다!", size: 24 },
      {
        value:
          "전시 관람 후 식사 예정입니다. 불참의사가 있는 분들은 사전에 알려주세요~",
        size: 24,
      },
      {
        value:
          "정기 번개모임 외에도 언제든 카톡방에서 자유롭게 번개 모임을 추진해주세요.",
        size: 24,
      },
    ],
  },
];

export function createEmptySlide(template: TemplateType): Slide {
  switch (template) {
    case "cover":
      return {
        id: uid(),
        template,
        bgImage: "/default-cover.jpg",
        fields: {
          quarter: { value: "2026 ?분기 잡식건축가 번개", size: 24 },
          month: { value: "?월", size: 59 },
          title: { value: "새로운 모임안내", size: 59 },
        },
      };
    case "info":
      return {
        id: uid(),
        template,
        bgImage: "/default-location.jpg",
        fields: {
          place: { value: "장소 이름 / 위치", size: 32 },
          when: { value: "0/0 (요일) 00:00 – 00:00 BY 호스트", size: 24 },
          desc: { value: "이번 번개 소개 한 줄을 적어주세요", size: 24 },
        },
      };
    case "exhibition":
      return {
        id: uid(),
        template,
        bgImage: "",
        fields: {
          label: { value: "현재 진행중인 전시", size: 24 },
          title: { value: "전시 제목", size: 24 },
          body: { value: "전시 설명을 입력하세요.", size: 14 },
          footLabel1: { value: "관람료", size: 14 },
          footValue1: { value: "성인 00,000원", size: 14 },
          footLabel2: { value: "예정관람일정", size: 14 },
          footValue2: { value: "0/0 00:00 타임", size: 14 },
          image: { value: "/default-exhibition.png", size: 0 },
        },
      };
    case "calendar":
      return {
        id: uid(),
        template,
        bgImage: "",
        fields: {
          title: { value: "0월 일정 안내", size: 40 },
          foot: { value: "소규모 번개 매칭에 참여하실 수 있습니다.", size: 16 },
        },
        calendar: {
          headers: ["S", "M", "T", "W", "T", "F", "S"],
          grid: Array.from({ length: 35 }, (_, i) =>
            i < 31 ? i + 1 : null
          ) as (number | null)[],
        },
      };
    case "notes":
      return {
        id: uid(),
        template,
        bgImage: "",
        fields: {
          title: { value: "안내사항", size: 40 },
          closing: { value: "함께해요!", size: 28 },
        },
        notesItems: [{ value: "안내사항을 적어주세요.", size: 24 }],
      };
  }
}
