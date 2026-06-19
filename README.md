# ESC/POS to HTML

ESC/POS 문법으로 작성된 텍스트, hex 바이트, TCP로 수신한 프린터 데이터를 영수증 형태로 프리뷰하는 모노레포입니다.

웹앱은 ESC/POS 샘플을 브라우저에서 빠르게 확인하는 용도이고, 데스크탑 앱은 Tauri 기반 가상 프린터로 TCP 소켓을 열어 실제 POS 출력 데이터를 수신합니다.

## 실행

```sh
pnpm install
pnpm dev
```

개별 앱만 실행하려면 다음 명령을 사용할 수 있습니다.

```sh
pnpm --filter web dev
pnpm --filter @escpos/desktop tauri dev
pnpm --filter web storybook
```

## 프로젝트 구조

```text
apps/
  web/                 # Vite + React 웹앱
  desktop/             # Tauri + React 데스크탑 앱
packages/
  escpos/              # ESC/POS 파싱과 HTML 렌더링 라이브러리
  ui/                  # web/desktop 공용 Tailwind UI 컴포넌트
docs/
  parsing-data-model.md
  desktop-tcp-receipt-preview-design.md
```

웹앱과 데스크탑 웹 영역은 Feature-Sliced Design 형태로 구성합니다.

```text
apps/{web,desktop}/src/
  app/                 # 앱 라우터와 전역 스타일
  pages/               # 라우트 단위 화면
  widgets/             # 독립적인 화면 블록
  features/            # 사용자 행위 단위 상태/상호작용
  entities/            # 도메인 엔티티와 샘플 데이터
  shared/              # 재사용 API, 설정, 유틸
```

## 주요 기능

- 이스케이프 텍스트 입력과 hex 입력 지원
- ESC/POS 스타일 명령을 중간 데이터로 파싱
- Canvas 기반 영수증 프리뷰와 HTML 출력 동시 제공
- 기본 텍스트의 `<span>` 래핑 표시/미표시 옵션
- 컷, 피드, 비프, 금전함 펄스 같은 제어 명령 이벤트 표시
- `react-router-dom` 기반 샘플 라우팅
- EUC-KR 한글 영수증을 포함한 다양한 ESC/POS 샘플 제공
- Storybook 기반 Atomic Design 컴포넌트 확인

## 웹앱

웹앱은 ESC/POS 입력을 샘플별로 확인하는 개발/디버그 도구입니다.

```sh
pnpm --filter web dev
```

기본 주소는 [http://localhost:5173](http://localhost:5173) 입니다.

### 라우트

- `/`: 기본 샘플로 이동
- `/samples/:sampleId`: 선택한 샘플을 에디터와 프리뷰에 로드
- `/docs`: 파싱 중간 데이터 모델 요약

### 샘플

- `Cafe receipt`: 기본 ESC/POS 스타일 명령 샘플
- `Korean receipt`: 한글/전각 문자 컬럼 정렬 샘플
- `21-column receipt`: 2.5인치 폭에 맞춘 21컬럼 샘플
- `Payment approval`: EUC-KR hex 실데이터 기반 결제승인 영수증 샘플
- `Style lab`: 확대, 굵게, 밑줄, 반전 표시 확인
- `Control events`: 피드, 컷, 비프, 금전함 이벤트 확인
- `Warnings`: 미지원 명령 경고 확인

## 데스크탑 앱

데스크탑 앱은 Tauri 기반 ESC/POS 가상 프린터입니다. TCP 소켓을 열고 POS 또는 테스트 클라이언트가 전송한 ESC/POS bytes를 수신해 화면에 영수증으로 표시합니다.

```sh
pnpm --filter @escpos/desktop tauri dev
```

개발 서버 주소는 [http://localhost:1420](http://localhost:1420) 입니다. 실제 앱 창은 Tauri가 별도로 띄웁니다.

### TCP 수신

- 기본 host: `127.0.0.1`
- 기본 port: `9100`
- 앱에서 `Start`를 누르면 TCP 서버가 시작됩니다.
- 컷 명령(`GS V`)을 만나거나 idle timeout이 지나면 하나의 영수증으로 완료 처리합니다.
- 여러 영수증은 최신순으로 왼쪽에 표시되며, 좌우 스크롤로 이전 영수증을 볼 수 있습니다.
- 각 영수증 박스 내부는 세로 스크롤을 지원합니다.

테스트 전송 예시:

```sh
python3 - <<'PY' | nc 127.0.0.1 9100
import sys

body = b'\x1b@\x1ba\x01\x1b!\x30' + '현금결제승인'.encode('euc-kr') + b'\x1b!\x00\n'
body += b'------------------------------------------\n'
body += '합계'.encode('euc-kr') + b'                              36,500' + '원'.encode('euc-kr') + b'\n'
body += b'\x1dV\x00'
sys.stdout.buffer.write(body)
PY
```

### 설정 저장

TCP `host`, `port`, idle timeout, 최대 영수증 수 설정은 데스크탑 앱의 `localStorage`에 저장됩니다. 앱을 다시 실행하면 마지막 설정을 자동으로 불러옵니다.

### 데스크탑 앱 구조

데스크탑 앱은 Rust main 영역과 React 웹 영역을 분리합니다.

Rust 영역은 hexagonal architecture로 구성합니다.

```text
apps/desktop/src-tauri/src/
  domain/              # TCP 영수증 도메인 모델과 오류
  application/ports/   # ReceiptEventPublisher 등 application port
  infrastructure/      # TCP 서버, parser/renderer 구현체
  adapter/             # Tauri command, Tauri event publisher
```

의존 방향:

```text
adapter -> application ports/domain <- infrastructure
```

React 웹 영역은 FSD로 구성합니다.

```text
apps/desktop/src/
  app/
  pages/receiver/      # 라우트 조립
  features/receipt-receiver/
  widgets/receiver-header/
  widgets/receipt-sidebar/
  widgets/receipt-preview-panel/
  widgets/receipt-detail-panels/
  entities/receipt/
  shared/
```

## Storybook

공용 UI 컴포넌트는 `packages/ui`에 있으며 Storybook에서 Atomic Design 트리로 확인할 수 있습니다.

```sh
pnpm --filter web storybook
```

기본 주소는 [http://localhost:6006](http://localhost:6006) 입니다.

## 파싱 계획 문서

중간 데이터 모델과 ESC/POS 처리 흐름은 [docs/parsing-data-model.md](docs/parsing-data-model.md)에 정리되어 있습니다.

데스크탑 TCP 수신 앱 설계는 [docs/desktop-tcp-receipt-preview-design.md](docs/desktop-tcp-receipt-preview-design.md)에 정리되어 있습니다.
