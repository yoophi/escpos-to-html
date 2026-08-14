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

- [x] `TcpServerConfig`에 `max_receipt_bytes`(기본 1_048_576) 필드 추가
- [x] `handle_client` 버퍼 누적 시 상한 검사 → 초과분 폐기 + 절단 표시(예: payload에 `truncated: true`)
- [x] 초과 발생 시 `tcp://error` 또는 별도 이벤트로 프론트엔드에 알림
- [x] Rust 통합 테스트: 상한 초과 스트림 전송 시 절단·이벤트 발행 검증 (`cargo test`)

### 1.2 `max_receipts` 설정을 실제 동작에 연결

**현상**: UI에서 `max_receipts`(기본 200)를 설정·저장하지만, Rust `TcpServerConfig.max_receipts`는 역직렬화 후 사용되지 않고, 프론트엔드도 `useReceiptReceiver.ts:13`의 하드코딩 `MAX_RENDERED_RECEIPTS = 200`으로 잘라 설정값을 무시한다. 설정이 죽은 값이다.

**방법**: 프론트엔드 목록 절단 로직이 `config.maxReceipts`를 참조하도록 수정. Rust 쪽 필드는 사용하지 않으면 제거하거나(1.1의 config 정리와 함께) 실제 소비처를 만든다.

- [x] `useReceiptReceiver.ts`에서 `MAX_RENDERED_RECEIPTS` 상수 대신 `config.maxReceipts` 사용
- [x] Rust `TcpServerConfig.max_receipts` 제거 — 목록 상한은 프론트엔드 설정이 소비
- [x] 설정 변경 후 목록 절단이 즉시 반영되는지 테스트로 확인

### 1.3 텍스트 인코딩 하드코딩 제거

**현상**: `useReceiptReceiver.ts:71`에서 `parseEscposBytes(bytes, { textEncoding: 'euc-kr' })`로 EUC-KR을 하드코딩. UTF-8로 보내는 클라이언트의 한글이 깨지고, 사용자가 바꿀 방법이 없다.

**스펙 근거**: `parsing-data-model.md` L215 — 코드페이지는 "별도 확장 항목", 기본은 UTF-8.

**방법**: 수신기 헤더의 서버 설정에 인코딩 선택(utf-8 / euc-kr)을 추가하고 파싱 시 전달한다. 기본값은 기존 동작 보존을 위해 euc-kr 유지 여부를 결정한다(실제 POS 트래픽 특성 고려).

- [x] `ReceiverConfig`(FE)나 UI 상태에 `textEncoding: 'utf-8' | 'euc-kr'` 추가
- [x] `ReceiverHeader`에 인코딩 선택 UI(PresetSegment) 추가
- [x] `parseEscposBytes` 호출에 선택값 전달, 기본값 결정: 기존 POS 호환성을 위해 `euc-kr` 유지
- [x] UTF-8/EUC-KR 바이트 파싱 회귀 테스트 및 수신기 전달 테스트 추가

### 1.4 `ESC d 0` 동작 스펙 정합

**현상**: `packages/escpos/src/index.ts`가 `Math.max(1, args[0])`로 0줄 피드를 1줄로 강제. 스펙 표("n줄 피드")와 불일치(경미).

- [x] `ESC d 0`을 0줄(no-op 이벤트만)로 처리하고 반영
- [x] 관련 기존 테스트를 0줄 feed 동작에 맞게 갱신

**검증**: `pnpm test`, `pnpm test:rust`(= `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`)

---

## Phase 2 — 헥사고날 구조 정렬 (Rust)

TCP 수신 기능이 유스케이스 없이 adapter → infrastructure로 직결되어 CLAUDE.md Hex 규칙 1·2·4·5·6을 위반한다. 구조를 문서 규칙에 맞추거나, 규칙을 현실에 맞게 완화하거나 — **먼저 방향을 결정**한다.

### 2.0 방향 결정 (선행)

- [x] 결정: (A) 코드를 규칙에 맞춘다(아래 2.1~2.4 진행)
- 장수명 publisher의 `Arc<dyn ReceiptEventPublisher>`만 CLAUDE.md에 예외로 명문화한다.

### 2.1 TCP 서버 제어 유스케이스 도입

**현상**: `tauri_commands.rs:41-63`이 `TcpReceiptServerState`(infrastructure)를 직접 호출. `application::use_cases`에 TCP 관련 시나리오가 없다.

**방법**: `application::ports`에 `ReceiptServerControl` 트레잇(start/stop/status)을 선언하고, `TcpReceiptServerState`가 이를 구현. adapter는 유스케이스(`StartReceiptServer` 등)를 통해서만 호출.

- [x] `application::ports::receipt_server.rs`에 서버 제어 포트 트레잇 선언
- [x] `infrastructure::tcp::TcpReceiptServerState`가 포트 트레잇 구현
- [x] `application::use_cases`에 start/stop/status 유스케이스 추가 (제네릭 포트 주입, CLAUDE.md 규칙 4)
- [x] `tauri_commands.rs`가 유스케이스 경유로 변경, `invoke_handler!` 등록 유지 확인
- [x] stub 포트 기반 유스케이스 단위 테스트 추가

### 2.2 오류 타입 정리

**현상**: `TcpReceiptServerState::start()`가 `Result<_, String>` 반환, adapter는 `CommandError::from_message`로 `DomainError`를 우회 (규칙 6 위반).

- [x] `DomainError`에 `ServerStartFailed` 변형 추가, `String` 오류 제거
- [x] adapter 경계에서 `DomainError → CommandError` 매핑으로 일원화
- [x] `DomainError`의 `#[allow(dead_code)]` 제거

### 2.3 이벤트 발행 주입 방식 정리

**현상**: `Arc<dyn ReceiptEventPublisher>` 트레잇 객체 사용 — 규칙 4는 제네릭 주입 권장.

- [x] 장수명 서버의 공유 publisher 수명 때문에 트레잇 객체 주입을 사용하고 CLAUDE.md에 예외 명문화

### 2.4 죽은 Rust 파이프라인 처리

**현상**: `convert_escpos_to_html` + `NoopParser` + `SimpleHtmlRenderer`는 프론트엔드에서 호출되지 않는 스캐폴딩. 파싱은 실제로 TS(`packages/escpos`)가 수행 — CLAUDE.md FSD 규칙 3("비즈니스 로직은 Rust로 위임")과 정반대.

**방법**: 전략 결정이 핵심. (A) Rust 파서를 실제 구현해 TS 파서를 대체(장기 과제, 큰 작업) (B) TS 파서를 정본으로 인정하고 Rust 스캐폴딩 제거 + 규칙 3 문구 수정.

- [x] 결정: TS 파서 정본화 + 스캐폴딩 제거(B)
- [x] `convert_escpos_to_html`·`NoopParser`·`SimpleHtmlRenderer`·`ping` 제거, CLAUDE.md 규칙 3 문구를 "파싱은 `packages/escpos`(TS)가 정본" 으로 갱신
- [ ] (A) 선택 시: 별도 마일스톤 문서 작성 (TS 파서와 스펙 패리티 테이블 필요)

**검증**: `pnpm test:rust`, `pnpm --filter @escpos/desktop typecheck`

---

## Phase 3 — 프론트엔드 정리 (FSD·중복)

### 3.1 중복 제거

- [x] `cn()` 3중 복제 통합 — `packages/ui`의 `cn`을 공개 API로 export하고 `apps/web`·`apps/desktop`이 이를 사용
- [x] `escpos-editor`의 Decoded bytes 접기 버튼을 `CollapsiblePanel`로 정리
- [x] html-output·parsed-data-output·parse-events의 동일한 collapse 패턴을 공통 `CollapsiblePanel`로 추출

### 3.2 FSD 규칙 정리

- [x] apps/web 전체를 `@` 경로 별칭으로 통일 — CLAUDE.md 규칙 5
- [x] `formatBytes: toHex` prop 여행 제거 — 소비 위젯에서 `toHex` 직접 import
- [x] widgets 슬라이스는 현재 단일 구현체이므로 `index.tsx`를 유지하고 `index.ts` 배럴 분리는 보류하기로 결정

### 3.3 죽은 코드 제거

- [x] 미사용 `AppProviders` 제거 및 `main.tsx` 정리
- [x] 미사용 `APP_NAME`(shared/config) 제거
- [x] 순수 위임뿐인 `call()` 래퍼 제거 및 직접 `invoke()` 호출
- [x] 자명한 여러 줄 블록 주석 정리 — CLAUDE.md 주석 정책

**검증**: `pnpm --filter web exec tsc -b --force`, `pnpm --filter @escpos/desktop typecheck`, `pnpm test`

---

## Phase 4 — 문서 동기화

코드가 의도적으로 이동한 부분은 문서를 갱신하고, 문서 내부 상충은 최종안을 명시한다.

### 4.1 CLAUDE.md / AGENTS.md

- [x] CLAUDE.md 명령어 표 수정 — 루트 `pnpm dev`는 web 전용, Tauri는 `pnpm --filter @escpos/desktop tauri dev`
- [x] CLAUDE.md "라우트 진입" — ReceiverPage로 갱신하고 연결되지 않은 ConverterPage 제거
- [x] CLAUDE.md Hex 규칙 — Phase 2의 publisher trait-object 예외 반영
- [x] AGENTS.md 디렉토리 구조에 `apps/web`·`packages/escpos`·`packages/ui` 추가
- [x] `lib.rs`의 ASCII 방향 주석 제거

### 4.2 설계 문서 정리

- [x] `20260519-receipt-ingest-and-rendering.md` 상단에 **Superseded** 표기 + 대체 문서 링크
- [x] `desktop-tcp-receipt-preview-design.md` 내부 상충 해소 — 이벤트 원본 바이트 전달을 최종안으로 명시하고 조회/실패 저장 모델은 후속 결정으로 분류
- [x] `parsing-data-model.md` 갱신 — canvas 프리뷰·CodeMirror·바코드 모델·샘플 선택 필드 반영

---

## Phase 5 — 선택 개선 (여유 시)

- [ ] `parseEscposBytes`(~385줄 if-cascade)를 명령 디스패치 테이블로 재구성 — 가독성 대비 비용 검토
- [ ] GS V 컷 해석의 TS/Rust 이중 구현 — Rust 쪽 컷 감지는 스트림 절단용, TS는 표시용으로 역할이 다름을 주석/문서로 명시하거나 스펙 상수 공유 방안 검토
- [ ] desktop 수신기 위젯 Storybook 스토리 등록 (설계 문서 5단계)
- [ ] Storybook은 apps/web에만 구성됨 — desktop 위젯 커버 방안(web storybook에서 desktop 위젯 로드 or 별도 구성) 결정

---

## 완료 기준

- [x] Phase 1~4의 모든 필수 항목 체크 완료
- [x] `pnpm typecheck`(각 패키지)·`pnpm test`·`pnpm test:rust` 전부 통과
- [x] CLAUDE.md 체크리스트가 실제 코드 구조와 일치
- [x] 최종 Standards/Spec 정적 재감사 완료 — `pnpm lint`, `cargo clippy --all-targets -- -D warnings`, 타입체크·테스트·diff 검증에서 하드 위반 0건
