# Omnivore Architect — 번개 모임 카드 에디터

잡식건축가(Omnivore Architect) 번개 모임 안내 카드를 직접 편집·생성할 수 있는 웹앱입니다.
원본 PDF의 디자인(네이비 컬러, SUIT 폰트, 1:1 카드 레이아웃)을 그대로 재현하면서
브라우저에서 바로 내용을 고칠 수 있습니다.

🔗 **배포 주소:** https://auagna.github.io/omnivore-architect-cards/

## 주요 기능

- **인라인 텍스트 편집** — 슬라이드 위 글자를 직접 클릭해서 수정
- **글자 크기 조정** — 선택한 텍스트의 크기를 슬라이더로 조절
- **배경 사진 변경** — 페이지별 배경 이미지 업로드 / 초기화
- **페이지 추가·삭제·순서 변경** — 5종 템플릿(표지/장소/전시/일정/안내) 중 선택해 추가
- **자동 저장** — 작업 내용이 브라우저(localStorage)에 자동 보관
- **달력·안내 항목 편집** — 일정 표시 날짜/라벨, 안내사항 항목 추가

## 템플릿

| 템플릿 | 용도 |
| --- | --- |
| 표지 | 월/제목/분기 표지 (인물 사진 배경) |
| 장소 안내 | 장소·일시·소개 카드 |
| 전시 소개 | 전시 이미지 + 설명 + 관람 정보 |
| 월 일정 | 달력 그리드 + 날짜 마커 |
| 안내사항 | 번호 목록 + 마무리 문구 |

## 폰트

제목/본문은 [SUIT](https://github.com/sun-typeface/SUIT) 가변 폰트, 달력 숫자는 Montserrat를 사용합니다.
원본 PDF와 동일한 글꼴 느낌을 유지합니다.

## 로컬 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
```

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 자동으로 빌드 후 GitHub Pages에 배포합니다
(`.github/workflows/deploy.yml`). Pages용 base 경로는 빌드 시 `VITE_BASE` 환경변수로 주입됩니다.

## 기술 스택

Vite · React · TypeScript · CSS Container Queries (텍스트 비례 스케일링)
