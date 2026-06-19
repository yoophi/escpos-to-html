# Tauri TCP 영수증 프리뷰 앱 기능 설계

## 목적

Tauri 데스크탑 앱이 로컬 TCP 소켓을 열고, 외부 POS/프린터 클라이언트가 전송하는 ESC/POS 바이트 스트림을 받아 화면에 영수증으로 표시한다.

앱은 실제 프린터처럼 동작하는 미리보기 수신기이며, 여러 건의 영수증을 누적 표시하고 사용자가 스크롤하면서 확인할 수 있어야 한다.

## 범위

### 포함

- TCP 서버 시작/중지
- 포트 설정
- 다중 TCP 연결 수신
- ESC/POS 바이트 스트림 수집
- 영수증 단위 분리
- ESC/POS 파싱
- 파싱 결과를 프론트엔드로 이벤트 전달
- 여러 영수증 목록 표시
- 각 영수증 상세 프리뷰 표시
- 수신 로그, 파싱 경고, 원본 바이트 확인

### 제외

- 실제 프린터 출력
- 원격 서버 동기화
- 영수증 영구 저장소
- 이미지, QR, 바코드의 완전한 렌더링
- TCP TLS 인증

단, 제외 항목은 후속 확장 포인트로 고려한다.

## 전체 구조

현재 `apps/desktop`은 헥사고날 구조를 사용한다.

```text
adapter
  └─ tauri_commands / tauri_events

application
  ├─ use_cases
  └─ ports

domain
  ├─ receipt
  ├─ escpos_document
  └─ errors

infrastructure
  ├─ tcp
  ├─ parsers
  └─ renderers
```

TCP 서버와 Tauri 이벤트는 외부 입출력이므로 `adapter` 또는 `infrastructure`에 둔다. ESC/POS 파싱 결과와 영수증 세션 모델은 `domain`에 둔다.

## 데이터 흐름

```text
POS / client
  ↓ TCP bytes
TcpReceiptServer
  ↓ RawReceiptJob
ReceiptAssembler
  ↓ ReceiptFrame
EscPosParser
  ↓ ParsedReceipt
ReceiptStore
  ↓ tauri event
React UI
  ↓
Receipt list + preview
```

## 주요 도메인 모델

### ReceiptId

수신된 영수증 하나를 식별하는 ID.

```rust
pub struct ReceiptId(String);
```

권장 생성 방식:

- `uuid` 또는 `timestamp + sequence`
- 정렬 가능한 값이면 UI에서 최신순 표시가 쉽다.

### TcpClientInfo

TCP 송신 클라이언트 정보.

```rust
pub struct TcpClientInfo {
    pub peer_addr: String,
    pub connected_at: DateTime,
}
```

### RawReceiptJob

TCP에서 수신한 원본 바이트 묶음.

```rust
pub struct RawReceiptJob {
    pub id: ReceiptId,
    pub client: TcpClientInfo,
    pub bytes: Vec<u8>,
    pub received_at: DateTime,
}
```

### ParsedReceipt

프론트엔드로 전달할 최종 데이터.

```rust
pub struct ParsedReceipt {
    pub id: ReceiptId,
    pub status: ReceiptStatus,
    pub received_at: DateTime,
    pub client: TcpClientInfo,
    pub bytes: Vec<u8>,
    pub document: EscPosDocument,
    pub html: String,
    pub warnings: Vec<String>,
    pub events: Vec<ControlEvent>,
}
```

### ReceiptStatus

```rust
pub enum ReceiptStatus {
    Receiving,
    Parsed,
    ParseFailed,
}
```

## 영수증 단위 분리 전략

TCP는 메시지 경계가 없는 스트림이다. 따라서 앱이 임의로 `read()` 1회분을 영수증 1건으로 보면 안 된다.

영수증 분리 기준은 단계적으로 지원한다.

### 1차 기준: 컷 명령

ESC/POS 컷 명령을 영수증 종료 신호로 본다.

대상 명령:

- `GS V m`
- `GS V m n`

현재 샘플에서도 `\gV\x00`이 영수증 종료 명령으로 사용된다.

### 2차 기준: 유휴 타임아웃

컷 명령 없이 데이터 전송이 멈추는 경우를 처리한다.

예:

- 마지막 바이트 수신 후 `500ms ~ 1000ms` 동안 추가 데이터가 없으면 하나의 영수증으로 확정

설정값:

```text
receipt_idle_timeout_ms = 800
```

### 3차 기준: 연결 종료

클라이언트가 연결을 닫으면 현재 버퍼를 영수증으로 확정한다.

### 분리 우선순위

```text
cut command > connection closed > idle timeout
```

## TCP 서버 설계

### 책임

- 지정 포트에 bind
- 연결 accept
- 각 연결을 비동기 태스크로 처리
- 수신 바이트를 `ReceiptAssembler`로 전달
- 서버 상태를 Tauri 이벤트로 송신

### 권장 런타임

Tauri 2 환경에서는 Rust async 처리를 위해 다음 중 하나를 선택한다.

1. `tauri::async_runtime`
2. 명시적 `tokio` dependency 추가

권장:

- 단순 TCP 서버는 `tauri::async_runtime`으로 시작
- `tokio::net::TcpListener`가 필요하면 `tokio`를 명시 dependency로 추가

### 서버 상태

```rust
pub enum TcpServerStatus {
    Stopped,
    Starting,
    Listening { host: String, port: u16 },
    Failed { message: String },
}
```

## Tauri 명령 설계

### start_tcp_server

TCP 서버를 시작한다.

```rust
#[tauri::command]
async fn start_tcp_server(config: TcpServerConfig) -> Result<TcpServerStatus, CommandError>
```

입력:

```rust
pub struct TcpServerConfig {
    pub host: String,
    pub port: u16,
    pub receipt_idle_timeout_ms: u64,
    pub max_receipts: usize,
}
```

기본값:

```text
host = "127.0.0.1"
port = 9100
receipt_idle_timeout_ms = 800
max_receipts = 200
```

### stop_tcp_server

TCP 서버를 중지한다.

```rust
#[tauri::command]
async fn stop_tcp_server() -> Result<TcpServerStatus, CommandError>
```

### get_tcp_server_status

현재 서버 상태를 반환한다.

```rust
#[tauri::command]
async fn get_tcp_server_status() -> Result<TcpServerStatus, CommandError>
```

### list_receipts

메모리에 보관 중인 영수증 목록을 반환한다.

```rust
#[tauri::command]
async fn list_receipts() -> Result<Vec<ReceiptSummary>, CommandError>
```

### get_receipt

특정 영수증 상세 데이터를 반환한다.

```rust
#[tauri::command]
async fn get_receipt(id: String) -> Result<ParsedReceipt, CommandError>
```

### clear_receipts

수신된 영수증 목록을 비운다.

```rust
#[tauri::command]
async fn clear_receipts() -> Result<(), CommandError>
```

## Tauri 이벤트 설계

프론트엔드는 이벤트를 구독해 실시간으로 UI를 갱신한다.

### tcp://status-changed

서버 상태가 바뀔 때 발생.

```json
{
  "status": "listening",
  "host": "127.0.0.1",
  "port": 9100
}
```

### receipt://received

영수증 하나가 파싱 완료됐을 때 발생.

```json
{
  "id": "receipt_20260619_000001",
  "receivedAt": "2026-06-19T10:00:00+09:00",
  "byteLength": 405,
  "lineCount": 13,
  "warningCount": 0
}
```

상세 데이터는 이벤트 payload에 모두 싣지 않고 `get_receipt(id)`로 조회한다. 대량 데이터 이벤트 전송을 피하기 위해서다.

### receipt://failed

파싱 실패 시 발생.

```json
{
  "id": "receipt_20260619_000002",
  "message": "invalid escpos input"
}
```

## 프론트엔드 화면 설계

### 화면 구성

```text
┌──────────────────────────────────────────────┐
│ TCP server toolbar                            │
│ host / port / start / stop / status           │
├───────────────┬──────────────────────────────┤
│ Receipt list  │ Selected receipt preview      │
│               │                              │
│ - latest      │ ReceiptPaper                  │
│ - timestamp   │                              │
│ - byte count  │ Tabs: Preview / Data / Bytes  │
└───────────────┴──────────────────────────────┘
```

### 주요 컴포넌트

FSD 기준 추천 배치:

```text
apps/desktop/src/entities/receipt
  model.ts
  api.ts

apps/desktop/src/features/tcp-server-control
  ui/TcpServerToolbar.tsx
  model/useTcpServer.ts

apps/desktop/src/features/receipt-selection
  model/useSelectedReceipt.ts

apps/desktop/src/widgets/receipt-inbox
  ui/ReceiptList.tsx

apps/desktop/src/widgets/receipt-viewer
  ui/ReceiptViewer.tsx
  ui/ReceiptPreviewTab.tsx
  ui/ReceiptDataTab.tsx
  ui/ReceiptBytesTab.tsx

apps/desktop/src/pages/receiver
  ui/ReceiverPage.tsx
```

### 기존 web 컴포넌트 재사용

`apps/web`에서 분리한 다음 개념은 데스크탑에도 동일하게 필요하다.

- `ReceiptPaper`
- `PrintText`
- `ParsedDataOutput`
- `CodeBlock`
- `MetricBadges`

장기적으로는 앱 간 공유를 위해 `packages/ui`를 추가하는 것이 좋다.

초기에는 중복 구현을 피하려면 다음 중 하나를 선택한다.

1. `packages/ui` 생성 후 web/desktop이 함께 사용
2. desktop에 필요한 컴포넌트만 우선 복사 후 추후 통합

권장안은 `packages/ui`다.

## ESC/POS 파서 위치

현재 web은 `packages/escpos`의 TypeScript 파서를 사용한다.

Tauri 백엔드는 Rust이므로 선택지가 있다.

### 선택지 A: Rust 백엔드에서 파싱

TCP 수신 후 Rust에서 ESC/POS를 파싱하고, 프론트엔드에는 `ParsedReceipt`만 전달한다.

장점:

- TCP, 영수증 단위 분리, 파싱이 모두 백엔드에서 닫힘
- 프론트엔드는 렌더링만 담당
- 대용량 처리와 백그라운드 처리에 유리

단점:

- 기존 TypeScript 파서를 Rust로 이식해야 함
- web/desktop 파서 동작 일치 테스트가 필요

### 선택지 B: Rust는 TCP 수신만, 프론트엔드에서 파싱

Rust가 원본 바이트만 프론트엔드로 보내고, React가 `packages/escpos`로 파싱한다.

장점:

- 기존 TypeScript 파서를 그대로 사용
- web과 desktop 렌더링 결과 일치가 쉬움

단점:

- 대량 바이트를 이벤트로 전송해야 함
- 영수증 단위 분리는 여전히 Rust에서 해야 함
- 파싱 실패/경고 처리가 UI 스레드에 가까워짐

### 권장안

초기 구현은 **선택지 B**를 권장한다.

이유:

- 현재 `packages/escpos` 파서와 `ReceiptPaper` 렌더러가 이미 동작한다.
- 목표는 데스크탑 앱의 TCP 수신과 프리뷰 UX 검증이다.
- 파서 이식은 이후 안정화 단계에서 진행해도 된다.

단, Rust domain에는 장기적으로 `EscPosParser` 포트를 유지한다. 나중에 Rust 파서로 교체할 수 있게 하기 위해서다.

## 프론트엔드 수신 데이터 모델

초기 구현에서 Tauri 이벤트는 원본 바이트 중심으로 전달한다.

```ts
type ReceivedReceipt = {
  id: string
  receivedAt: string
  client: {
    peerAddr: string
  }
  bytes: number[]
  reason: 'cut' | 'idle_timeout' | 'connection_closed'
}
```

프론트엔드는 다음 흐름으로 처리한다.

```ts
const input = bytesToEscapedText(receipt.bytes)
const parsed = parseEscpos(input, 'escaped')
const html = renderHtml(parsed, { wrapPlainTextSpans: true })
```

더 좋은 방식은 `packages/escpos`에 `parseEscposBytes(bytes: number[])` API를 추가하는 것이다. 그러면 escaped 문자열 변환 없이 직접 파싱할 수 있다.

권장 추가 API:

```ts
parseEscposBytes(bytes: number[]): ParseResult
```

## 영수증 목록 정책

### 정렬

- 기본 최신순
- 수신 시간이 같은 경우 sequence 기준

### 최대 보관 개수

기본 `200`개.

초과 시 오래된 영수증부터 제거한다.

### 메모리 관리

각 영수증은 원본 바이트와 파싱 결과를 보관한다.

대량 수신을 고려해 다음 제한을 둔다.

```text
max_receipts = 200
max_receipt_bytes = 1MB
```

`max_receipt_bytes` 초과 시:

- 해당 receipt는 `ParseFailed` 처리
- UI에 오류 표시
- 원본 앞부분 일부만 보관하거나 전체 폐기

## 오류 처리

### 포트 바인딩 실패

예:

- 이미 사용 중인 포트
- 권한 부족

UI 표시:

```text
포트 9100을 열 수 없습니다. 이미 사용 중인지 확인해주세요.
```

### 파싱 실패

수신 목록에는 실패 항목도 표시한다.

상세 화면:

- 오류 메시지
- 원본 bytes
- 가능한 경우 부분 파싱 결과

### 연결 중단

클라이언트 연결 종료는 오류가 아니다. 현재 버퍼가 있으면 영수증으로 확정한다.

## 보안 고려

- 기본 bind 주소는 `127.0.0.1`로 제한한다.
- `0.0.0.0` 바인딩은 명시 옵션으로만 허용한다.
- 수신 바이트 최대 크기를 제한한다.
- HTML 렌더링 시 모든 텍스트는 escape한다.
- 외부에서 받은 ESC/POS 데이터는 절대 `dangerouslySetInnerHTML`로 직접 삽입하지 않는다.

## 테스트 계획

### Rust 단위 테스트

- 컷 명령으로 영수증 분리
- idle timeout 분리
- 연결 종료 분리
- max size 초과 처리
- 서버 시작/중지 상태 전이

### TypeScript 단위 테스트

- bytes → parse result 변환
- 여러 영수증 리스트 추가/제거
- 최신순 정렬
- 선택된 receipt 유지

### 통합 테스트

로컬 TCP 클라이언트로 샘플 ESC/POS 전송.

```bash
printf '\\x1b@hello\\n\\x1dV\\x00' | nc 127.0.0.1 9100
```

확인:

- 앱에 receipt 추가
- preview 표시
- bytes 표시
- cut event 표시

## 구현 단계

### 1단계: TCP 수신 골격

- `TcpReceiptServer` 추가
- start/stop/status Tauri command 추가
- TCP 수신 이벤트를 UI에 표시

### 2단계: 영수증 단위 분리

- `ReceiptAssembler` 추가
- cut / timeout / connection close 기준 구현
- 원본 bytes 기반 receipt 생성

### 3단계: UI 수신함

- `ReceiverPage` 추가
- 서버 toolbar
- receipt list
- selected receipt detail

### 4단계: 파싱/프리뷰 연결

- `packages/escpos`에 `parseEscposBytes` 추가
- `ReceiptPaper` 또는 공용 UI 패키지로 preview 표시
- parsed data / html / bytes 탭 추가

### 5단계: 안정화

- max receipt count
- max byte size
- 오류 UI
- 설정 저장
- Storybook에 receiver 관련 컴포넌트 등록

## 권장 최종 의존 방향

```text
apps/desktop/src-tauri
  TCP 수신, 영수증 단위 분리, 상태 관리

packages/escpos
  ESC/POS bytes 파싱, HTML 렌더링

packages/ui
  ReceiptPaper, CodeBlock, MetricBadges 등 공용 UI

apps/desktop/src
  Tauri event 구독, receipt list 상태, 화면 렌더링
```

이 구조를 사용하면 web 앱과 desktop 앱이 같은 파서와 같은 영수증 렌더러를 공유할 수 있다.

