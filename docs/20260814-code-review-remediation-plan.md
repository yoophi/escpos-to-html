# 코드 리뷰 개선 계획 (2026-08-14)

전체 코드베이스 리뷰(`4d8d7d8...HEAD`, 114개 파일) 결과를 기반으로 한 단계별 개선 계획.

- **리뷰 축**: Standards(CLAUDE.md·AGENTS.md 규칙 + Fowler 스멜 기준) / Spec(docs/ 설계 문서 3종 대비)
- **핵심 진단**: 코드 품질 자체(파서·UI 패키지)는 양호하나, **설계 문서·아키텍처 규칙과 실제 구현의 괴리**가 누적됨
- **우선순위 원칙**: 런타임 위험(메모리) → 죽은 설정/오동작 → 아키텍처 정렬 → FE 정리 → 문서 동기화 → 선택 개선

---

## Phase 1 — 안정성 핫픽스 (즉시)

런타임 위험과 사용자가 인지 가능한 오동작. 다른 단계와 독립적으로 바로 진행 가능.

### 1.1 TCP 수신 바이트 상한 도입

**현상**: `apps/desktop/src-tauri/src/infrastructure/tcp/tcp_receipt_server.rs`의 `handle_client`가 수신 버퍼를 무제한 누적한다. 컷 명령 없는 대량 스트림이 들어오면 메모리가 계속 증가하고, 그 전체가 Tauri 이벤트로 프론트엔드에 통째로 전달된다.

**스펙 근거**: `desktop-tcp-receipt-preview-design.md` "메모리 관리"(L502~510) — `max_receipt_bytes = 1MB`, 초과 시 해당 영수증을 `ParseFailed` 처리.

**방법**: `handle_client` 루프에서 버퍼 길이가 상한(기본 1MB)을 넘으면 수신을 중단하고 절단 플래그와 함께 이벤트를 발행한다. 상한은 `TcpServerConfig`에 필드로 노출한다.

- [ ] `TcpServerConfig`에 `max_receipt_bytes`(기본 1_048_576) 필드 추가
- [ ] `handle_client` 버퍼 누적 시 상한 검사 → 초과분 폐기 + 절단 표시(예: payload에 `truncated: true`)
- [ ] 초과 발생 시 `tcp://error` 또는 별도 이벤트로 프론트엔드에 알림
- [ ] Rust 통합 테스트: 상한 초과 스트림 전송 시 절단·이벤트 발행 검증 (`cargo test`)

### 1.2 `max_receipts` 설정을 실제 동작에 연결

**현상**: UI에서 `max_receipts`(기본 200)를 설정·저장하지만, Rust `TcpServerConfig.max_receipts`는 역직렬화 후 사용되지 않고, 프론트엔드도 `useReceiptReceiver.ts:13`의 하드코딩 `MAX_RENDERED_RECEIPTS = 200`으로 잘라 설정값을 무시한다. 설정이 죽은 값이다.

**방법**: 프론트엔드 목록 절단 로직이 `config.maxReceipts`를 참조하도록 수정. Rust 쪽 필드는 사용하지 않으면 제거하거나(1.1의 config 정리와 함께) 실제 소비처를 만든다.

- [ ] `useReceiptReceiver.ts`에서 `MAX_RENDERED_RECEIPTS` 상수 대신 `config.maxReceipts` 사용
- [ ] Rust `TcpServerConfig.max_receipts`: 미사용이면 제거, 유지하면 소비처 구현 — 둘 중 하나로 결정
- [ ] 설정 변경 후 목록 절단이 즉시 반영되는지 수동 확인

### 1.3 텍스트 인코딩 하드코딩 제거

**현상**: `useReceiptReceiver.ts:71`에서 `parseEscposBytes(bytes, { textEncoding: 'euc-kr' })`로 EUC-KR을 하드코딩. UTF-8로 보내는 클라이언트의 한글이 깨지고, 사용자가 바꿀 방법이 없다.

**스펙 근거**: `parsing-data-model.md` L215 — 코드페이지는 "별도 확장 항목", 기본은 UTF-8.

**방법**: 수신기 헤더의 서버 설정에 인코딩 선택(utf-8 / euc-kr)을 추가하고 파싱 시 전달한다. 기본값은 기존 동작 보존을 위해 euc-kr 유지 여부를 결정한다(실제 POS 트래픽 특성 고려).

- [ ] `ReceiverConfig`(FE)나 UI 상태에 `textEncoding: 'utf-8' | 'euc-kr'` 추가
- [ ] `ReceiverHeader`에 인코딩 선택 UI(PresetSegment) 추가
- [ ] `parseEscposBytes` 호출에 선택값 전달, 기본값 결정(제안: euc-kr 유지 + UI로 전환 가능)
- [ ] UTF-8/EUC-KR 페이로드 각각 TCP 전송해 한글 렌더링 확인

### 1.4 `ESC d 0` 동작 스펙 정합

**현상**: `packages/escpos/src/index.ts`가 `Math.max(1, args[0])`로 0줄 피드를 1줄로 강제. 스펙 표("n줄 피드")와 불일치(경미).

- [ ] `ESC d 0`을 0줄(no-op 이벤트만)로 처리할지, 프린터 실동작(기종별 상이)에 맞출지 결정 후 반영
- [ ] 관련 기존 테스트(`normalizes feed zero…`) 결정에 맞게 갱신

**검증**: `pnpm test`, `pnpm test:rust`(= `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`)

---

## Phase 2 — 헥사고날 구조 정렬 (Rust)

TCP 수신 기능이 유스케이스 없이 adapter → infrastructure로 직결되어 CLAUDE.md Hex 규칙 1·2·4·5·6을 위반한다. 구조를 문서 규칙에 맞추거나, 규칙을 현실에 맞게 완화하거나 — **먼저 방향을 결정**한다.

### 2.0 방향 결정 (선행)

- [ ] 결정: (A) 코드를 규칙에 맞춘다(아래 2.1~2.4 진행) vs (B) TCP 서버 같은 장수명 서비스는 유스케이스 예외로 CLAUDE.md에 명문화한다
- (B) 선택 시 2.1~2.3은 건너뛰고 Phase 4 문서 작업에 예외 규칙 추가

### 2.1 TCP 서버 제어 유스케이스 도입

**현상**: `tauri_commands.rs:41-63`이 `TcpReceiptServerState`(infrastructure)를 직접 호출. `application::use_cases`에 TCP 관련 시나리오가 없다.

**방법**: `application::ports`에 `ReceiptServerControl` 트레잇(start/stop/status)을 선언하고, `TcpReceiptServerState`가 이를 구현. adapter는 유스케이스(`StartReceiptServer` 등)를 통해서만 호출.

- [ ] `application::ports::receipt_server.rs`에 서버 제어 포트 트레잇 선언
- [ ] `infrastructure::tcp::TcpReceiptServerState`가 포트 트레잇 구현
- [ ] `application::use_cases`에 start/stop/status 유스케이스 추가 (제네릭 포트 주입, CLAUDE.md 규칙 4)
- [ ] `tauri_commands.rs`가 유스케이스 경유로 변경, `invoke_handler!` 등록 유지 확인
- [ ] stub 포트 기반 유스케이스 단위 테스트 추가

### 2.2 오류 타입 정리

**현상**: `TcpReceiptServerState::start()`가 `Result<_, String>` 반환, adapter는 `CommandError::from_message`로 `DomainError`를 우회 (규칙 6 위반).

- [ ] `DomainError`에 서버 오류 변형 추가(예: `ServerStartFailed`), `String` 오류 제거
- [ ] adapter 경계에서 `DomainError → CommandError` 매핑으로 일원화
- [ ] `DomainError`의 `#[allow(dead_code)]` 제거 가능해지는지 확인

### 2.3 이벤트 발행 주입 방식 정리

**현상**: `Arc<dyn ReceiptEventPublisher>` 트레잇 객체 사용 — 규칙 4는 제네릭 주입 권장.

- [ ] 장수명 서버 특성상 트레잇 객체가 타당하면 CLAUDE.md 규칙 4에 예외 각주 추가, 아니면 제네릭으로 전환 — 결정 후 반영

### 2.4 죽은 Rust 파이프라인 처리

**현상**: `convert_escpos_to_html` + `NoopParser` + `SimpleHtmlRenderer`는 프론트엔드에서 호출되지 않는 스캐폴딩. 파싱은 실제로 TS(`packages/escpos`)가 수행 — CLAUDE.md FSD 규칙 3("비즈니스 로직은 Rust로 위임")과 정반대.

**방법**: 전략 결정이 핵심. (A) Rust 파서를 실제 구현해 TS 파서를 대체(장기 과제, 큰 작업) (B) TS 파서를 정본으로 인정하고 Rust 스캐폴딩 제거 + 규칙 3 문구 수정.

- [ ] 결정: Rust 파서 실구현(A) vs TS 파서 정본화 + 스캐폴딩 제거(B)
- [ ] (B) 선택 시: `convert_escpos_to_html`·`NoopParser`·`SimpleHtmlRenderer`·`ping` 제거, CLAUDE.md 규칙 3 문구를 "파싱은 `packages/escpos`(TS)가 정본" 으로 갱신
- [ ] (A) 선택 시: 별도 마일스톤 문서 작성 (TS 파서와 스펙 패리티 테이블 필요)

**검증**: `pnpm test:rust`, `pnpm --filter @escpos/desktop typecheck`

---

## Phase 3 — 프론트엔드 정리 (FSD·중복)

### 3.1 중복 제거

- [ ] `cn()` 3중 복제 통합 — `packages/ui`의 `cn`을 공개 API로 export하고 `apps/web`·`apps/desktop`이 이를 사용 (또는 공용 util 패키지)
- [ ] `escpos-editor`의 Decoded bytes 접기 버튼을 자체 구현 대신 공통 컴포넌트로 정리 (PanelHeader 스타일 재사용)
- [ ] html-output·parsed-data-output·parse-events의 동일한 collapse 패턴을 `CollapsiblePanel` 류 래퍼로 추출할지 검토 (3곳 반복 — 판단 사항)

### 3.2 FSD 규칙 정리

- [ ] apps/web 전체를 `@` 경로 별칭으로 통일 (`app/App.tsx`, `pages/workbench/index.tsx` 등 상대경로 제거) — CLAUDE.md 규칙 5
- [ ] `formatBytes: toHex` prop 여행 제거 — 소비 위젯에서 `toHex` 직접 import
- [ ] widgets 슬라이스의 `index.tsx`=구현체 구조를 `ui/` + `index.ts` 배럴로 정리할지 결정 (규칙 6 취지)

### 3.3 죽은 코드 제거

- [ ] 미사용 `AppProviders` — 유지(향후 provider 합성 예정) 여부 결정, 제거 시 `main.tsx` 정리
- [ ] 미사용 `APP_NAME`(shared/config) 제거
- [ ] 순수 위임뿐인 `call()` 래퍼(shared/api/tauri.ts) 제거 및 직접 호출
- [ ] 자명한 여러 줄 블록 주석 정리 (`shared/api/tauri.ts:3-5`, `app/providers/index.tsx:3-5`) — CLAUDE.md 주석 정책

**검증**: `pnpm --filter web exec tsc -b --force`, `pnpm --filter @escpos/desktop typecheck`, `pnpm test`

---

## Phase 4 — 문서 동기화

코드가 의도적으로 이동한 부분은 문서를 갱신하고, 문서 내부 상충은 최종안을 명시한다.

### 4.1 CLAUDE.md / AGENTS.md

- [ ] CLAUDE.md 명령어 표 수정 — 루트 `pnpm dev`는 web 전용, Tauri는 `pnpm --filter @escpos/desktop tauri dev` (실제 package.json과 일치시키기)
- [ ] CLAUDE.md "라우트 진입" — ConverterPage → ReceiverPage로 갱신 (ConverterPage 미연결 상태 명시 또는 제거 결정)
- [ ] CLAUDE.md Hex 규칙 — Phase 2 결정 사항(예외 또는 구조 변경) 반영
- [ ] AGENTS.md 디렉토리 구조에 `apps/web`·`packages/escpos`·`packages/ui` 추가
- [ ] `lib.rs` doc comment의 ASCII 다이어그램 → Mermaid 링크 또는 제거 (AGENTS.md 다이어그램 규칙)

### 4.2 설계 문서 정리

- [ ] `20260519-receipt-ingest-and-rendering.md` 상단에 **Superseded** 표기 + 대체 문서(`desktop-tcp-receipt-preview-design.md`) 링크 (HTTP ingest·iframe CSP 설계는 폐기됨)
- [ ] `desktop-tcp-receipt-preview-design.md` 내부 상충 해소 — L324(상세는 `get_receipt(id)` 조회) vs L452(초기 구현은 이벤트에 원본 바이트 전달) 중 최종안 명시; `list_receipts`/`get_receipt`/`clear_receipts`/`ReceiptStatus`/`receipt://failed`는 구현 예정인지 폐기인지 결정
- [ ] `parsing-data-model.md` 갱신 — canvas 프리뷰·CodeMirror 에디터로의 이전 반영, `ControlEvent`의 `barcode|qrcode` 타입과 `ReceiptLine.barcode` 확장 반영, `EscposSample` 타입(선택적 `inputMode`, `textEncoding`, `preferredPreviewColumns`) 반영

---

## Phase 5 — 선택 개선 (여유 시)

- [ ] `parseEscposBytes`(~385줄 if-cascade)를 명령 디스패치 테이블로 재구성 — 가독성 대비 비용 검토
- [ ] GS V 컷 해석의 TS/Rust 이중 구현 — Rust 쪽 컷 감지는 스트림 절단용, TS는 표시용으로 역할이 다름을 주석/문서로 명시하거나 스펙 상수 공유 방안 검토
- [ ] desktop 수신기 위젯 Storybook 스토리 등록 (설계 문서 5단계)
- [ ] Storybook은 apps/web에만 구성됨 — desktop 위젯 커버 방안(web storybook에서 desktop 위젯 로드 or 별도 구성) 결정

---

## 완료 기준

- [ ] Phase 1~4의 모든 필수 항목 체크 완료
- [ ] `pnpm typecheck`(각 패키지)·`pnpm test`·`pnpm test:rust` 전부 통과
- [ ] CLAUDE.md 체크리스트가 실제 코드 구조와 일치
- [ ] /code-review 재실행 시 Standards 하드 위반 0건
