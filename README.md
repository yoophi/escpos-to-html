# ESC/POS to HTML

ESC/POS 문법으로 작성된 텍스트 또는 hex 바이트를 브라우저에서 영수증 형태로 프리뷰하는 웹앱입니다.

## 실행

```sh
pnpm install
pnpm dev
```

개별 앱만 실행하려면 다음 명령을 사용할 수 있습니다.

```sh
pnpm --filter web dev
```

## 프로젝트 구조

```text
apps/
  web/                 # Vite + React 웹앱
packages/
  escpos/              # ESC/POS 파싱과 HTML 렌더링 라이브러리
docs/
  parsing-data-model.md
```

웹앱은 Feature-Sliced Design 형태로 구성합니다.

```text
apps/web/src/
  app/                 # 앱 라우터와 전역 스타일
  pages/               # 라우트 단위 화면
  widgets/             # 독립적인 화면 블록
  entities/            # 도메인 엔티티와 샘플 데이터
  shared/              # 재사용 UI
```

## 주요 기능

- 이스케이프 텍스트 입력과 hex 입력 지원
- ESC/POS 스타일 명령을 중간 데이터로 파싱
- 영수증 프리뷰와 HTML 출력 동시 제공
- 기본 텍스트의 `<span>` 래핑 표시/미표시 옵션
- 컷, 피드, 비프, 금전함 펄스 같은 제어 명령 이벤트 표시
- `react-router-dom` 기반 샘플 라우팅
- 한글 영수증을 포함한 다양한 ESC/POS 샘플 제공

## 라우트

- `/`: 기본 샘플로 이동
- `/samples/:sampleId`: 선택한 샘플을 에디터와 프리뷰에 로드
- `/docs`: 파싱 중간 데이터 모델 요약

## 파싱 계획 문서

중간 데이터 모델과 ESC/POS 처리 흐름은 [docs/parsing-data-model.md](docs/parsing-data-model.md)에 정리되어 있습니다.
