# ESC/POS QR 제약사항 조사

- 조사일: 2026-08-14
- 범위: Epson 공식 ESC/POS Command Reference의 `GS ( k` QR Code 명령
- 비교 대상: `packages/escpos/src/index.ts`의 현재 QR 파서와 `packages/ui/src/molecules/receipt-canvas/index.tsx`의 미리보기

이 문서는 Epson 공식 1차 자료만 근거로 작성했다. Epson 레퍼런스는 모델을 선택하면 명령별 범위가 달라질 수 있다고 안내하므로, 아래의 범위와 용량은 “모든 Epson TM 프린터의 단일 공통 보장값”으로 해석하지 않는다.

## 요약

현재 프로젝트는 `GS ( k`의 QR 설정·저장·인쇄 시퀀스를 기본적으로 인식한다. 다만 다음 제약은 아직 파서나 미리보기에 충분히 반영되지 않는다.

1. 모델 선택값(`n1`)과 모듈 크기(`n`)를 프린터별 유효 범위로 검증하지 않는다.
2. 데이터 길이와 `m=48`을 검증하지 않고, QR 데이터 바이트를 UTF-8 텍스트로 디코딩한다.
3. Standard mode의 “줄 시작/인쇄 버퍼 비어 있음” 상태를 모델링하지 않는다.
4. `GS ( k <Function 182>`의 인쇄 가능 여부 조회를 구현하지 않는다.
5. 미리보기는 선택된 QR 모델과 프린터의 실제 용량/인쇄 가능 여부를 재현하지 않으며, quiet zone을 표시하지 않는다.

따라서 현재 구현은 “유효한 일반적인 QR 프린트 스트림을 화면에서 확인하는 기능”으로는 동작하지만, Epson 프린터의 명령 수용성·실제 출력 가능성까지 보장하는 검증기는 아니다.

## 명령 시퀀스

Epson은 `GS ( k`를 2차원 코드 처리 명령으로 정의하고, QR Code는 `cn=49`를 사용한다. QR 관련 함수는 모델 선택 `165`, 모듈 크기 설정 `167`, 오류 보정 레벨 설정 `169`, 데이터 저장 `180`, 저장 데이터 인쇄 `181`, 크기 정보 조회 `182`다. [Epson GS ( k 개요](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk.html)

일반적인 순서는 다음과 같다.

```text
GS ( k  ... cn=49 fn=165  # model
GS ( k  ... cn=49 fn=167  # module size
GS ( k  ... cn=49 fn=169  # error correction
GS ( k  ... cn=49 fn=180  # store data
GS ( k  ... cn=49 fn=181  # encode and print
```

`fn=182`는 저장된 데이터로 만들 QR의 크기와 인쇄 가능 여부를 조회하는 선택 단계이며 인쇄하지 않는다. [Epson Function 182](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn182.html)

모든 함수의 `pL`, `pH`는 뒤따르는 파라미터 바이트 수를 나타내며, 명령별로 고정된 길이를 요구한다. 잘못된 길이나 인자는 프린터 모델에 따라 무시되거나 오류가 될 수 있으므로 파서는 명령을 소비하는 것과 유효한 프린터 동작을 구분해야 한다.

## 함수·파라미터 제약

| 함수 | 형식과 고정값 | Epson 공식 범위/의미 | 현재 구현 비교 |
| --- | --- | --- | --- |
| `165` 모델 선택 | `pL+pH=4`, `cn=49`, `fn=65`, `n1`, `n2=0` | `n1=49` Model 1, `50` Model 2, `51` Micro QR. 지원 모델에 따라 `n1` 범위가 달라진다. 기본값은 Model 2. | `n1`의 `49/51`만 각각 Model 1/Micro로 보존하고 그 외 값은 모두 Model 2로 취급한다. `n2`와 고정 길이를 검증하지 않는다. |
| `167` 모듈 크기 | `pL+pH=3`, `cn=49`, `fn=67`, `n` | 모듈 한 변을 `n` dots로 설정한다. 범위는 프린터별로 다르다. Epson 예시에는 `1–16` 또는 `3–16`이 있으며, 모델별 기본값도 다르다. | 모든 값을 그대로 저장한다. 화면에서는 실제 모듈 크기를 `contentWidth`에 맞춰 축소하고 최소 2px을 적용하므로 프린터와 같은 실패/출력 크기를 재현하지 않는다. |
| `169` 오류 보정 | `pL+pH=3`, `cn=49`, `fn=69`, `n` | `n=48` L(약 7%), `49` M(약 15%), `50` Q(약 25%), `51` H(약 30%). | `49/50/51`은 M/Q/H로 매핑하지만 그 밖의 값은 모두 L로 취급한다. 유효 범위 검증이 없다. |
| `180` 데이터 저장 | `cn=49`, `fn=80`, `m=48`, `d1...dk` | `pL+pH=4–7092`, `k=(pL+pH)-3`, 즉 명령 패킷의 데이터 필드는 최대 `7089`바이트다. 각 `d`는 `0–255`. 실제 인코딩 용량은 모델, 데이터 압축 모드, 오류 보정 레벨에 따라 달라진다. 숫자·영숫자·Kanji·8-bit byte 모드를 자동 선택한다. | `m=48`, 실제 데이터 길이, 모델별 용량을 검증하지 않는다. `params.slice(1)`을 UTF-8로 디코딩한다. |
| `181` 인쇄 | `pL+pH=3`, `cn=49`, `fn=81`, `m=48` | 저장된 데이터를 인코딩하여 인쇄한다. Standard mode에서는 줄 시작/인쇄 버퍼가 비어 있는 상태에서 사용해야 한다. 심볼이 현재 인쇄 영역보다 크거나 저장 데이터가 모델/압축 모드의 허용량을 넘으면 인쇄되지 않는다. | 저장 데이터가 있으면 현재 줄에 텍스트가 남아 있어도 QR 이벤트를 발생시키고 별도 라인으로 렌더링한다. 줄 시작 상태, 인쇄 영역, 모델별 용량을 검증하지 않는다. |
| `182` 크기 조회 | `pL+pH=3`, `cn=49`, `fn=82`, `m=48` | 인쇄하지 않고 인코딩된 심볼의 가로·세로 dots와 인쇄 가능 여부를 응답한다. `other information=0x30`은 가능, `0x31`은 불가능. | `fn=82`를 아무 동작 없이 소비한다. 프린터 응답을 입력으로 받는 상태 모델은 없다. |

근거: [Function 165](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn165.html), [Function 167](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn167.html), [Function 169](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn169.html), [Function 180](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn180.html), [Function 181](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn181.html), [Function 182](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn182.html)

## 모델과 실제 용량

Epson 명령 레퍼런스의 모델 선택 UI는 같은 함수라도 선택한 프린터에 따라 매개변수 범위를 정제한다. 따라서 프로젝트가 프린터 모델을 모르는 상태에서 “QR은 항상 Model 2, 모듈 1–16, 데이터 7089바이트까지 가능”이라고 단정하면 안 된다.

`7089`바이트는 `GS ( k <Function 180>` 패킷이 담을 수 있는 데이터 필드의 상한이다. QR 버전별 실제 심볼 수용량은 모델·오류 보정·자동 선택된 압축 모드에 의해 더 작아질 수 있다. Epson도 저장 데이터가 지정 모델과 압축 모드가 허용하는 양을 초과하면 비정상 데이터로 보고 인쇄하지 않는다고 명시한다. [Function 180](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn180.html), [Function 181](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn181.html)

또한 QR 심볼 크기가 현재 인쇄 영역보다 크면 인쇄되지 않는다. Epson이 제시하는 대응은 `GS W`/`ESC W`/`ESC $`로 인쇄 영역을 넓히거나, `Function 167`로 모듈 크기를 줄이거나, `Function 169`로 오류 보정 레벨을 낮추는 것이다. [Function 182의 인쇄 불가 원인과 해결책](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn182.html)

## 데이터 인코딩

`Function 180`의 데이터 바이트는 `0–255`이며, Epson은 QR 인코딩 모드별 입력을 구분한다.

- 숫자 모드: `0–9`
- 영숫자 모드: `0–9`, `A–Z`, 공백, `$ % * + - . / :`
- Kanji 모드: Shift JIS 값
- 8-bit byte 모드: `0x00–0xFF`

따라서 수신한 QR 데이터는 임의의 UTF-8 문자열이라고 가정할 수 없다. 현재 구현의 `TextDecoder('utf-8')`는 유효하지 않은 UTF-8 또는 Shift JIS/바이너리 데이터를 대체 문자로 바꿀 수 있다. 현재 `ReceiptBarcode.data: string` 모델은 화면 표시에는 편리하지만 원본 바이트 보존이나 인코딩 판별에는 부족하다. [Function 180의 데이터 모드](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn180.html)

## 인쇄 상태와 급지

Epson은 Standard mode에서 `Function 181`을 프린터가 “줄 시작” 또는 “인쇄 버퍼에 데이터가 없는 상태”일 때 사용하라고 명시한다. 심볼이 인쇄되면 필요한 양만큼 용지가 급지되고, 인쇄 위치는 printable area의 왼쪽과 줄 시작 상태로 이동한다. Page mode에서는 즉시 인쇄하지 않고 print buffer에 저장한다. [Function 181](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn181.html)

현재 프로젝트는 텍스트와 QR이 같은 입력 스트림에 섞였을 때 파싱 결과를 별도 라인으로 정리하지만, 그것이 실제 프린터의 print buffer가 비워진 상태임을 의미하지는 않는다. 따라서 이 동작은 미리보기 레이아웃 정책이지, Epson 프린터의 인쇄 가능성 검증이 아니다.

QR 인쇄 후 Epson이 필요한 급지를 자체 수행하므로, 프로젝트가 QR 뒤에 합성 `LF`나 추가 feed를 삽입해서는 안 된다. 입력 스트림에 실제로 들어온 `LF`, `ESC J`, `ESC d` 등은 별도 명령으로 보존하되, QR 이벤트 자체에서 가상의 여백을 추가하지 않는 것이 맞다.

## Quiet zone

Epson의 `Function 181` 문서는 quiet zone이 인쇄 데이터에 포함되지 않으며, 이 명령을 사용할 때 quiet zone을 반드시 포함해야 한다고 명시한다. `Function 182`의 크기 정보에도 quiet zone은 포함되지 않는다. 즉, 명령이 QR 주위 여백을 자동으로 보장한다고 가정하면 안 된다. [Function 181의 quiet zone 규정](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn181.html), [Function 182의 크기 정보 규정](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn182.html)

해당 `GS ( k` 인쇄 명령 페이지는 quiet zone의 dots 또는 모듈 수를 별도 값으로 정의하지 않는다. Epson의 별도 `US ( k` 디스플레이 명령에는 quiet zone을 켰을 때 `4 × 모듈 크기`를 상·하·좌·우에 추가하는 규칙이 있지만, 이는 `GS ( k` Standard mode 영수증 인쇄 명령이 아니다. 두 명령의 동작을 혼용하지 않는다. [Epson US ( k Function 181의 quiet zone 규정](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos_dm/us_lparen_lk_fn181.html)

현재 미리보기는 QR 심볼 모듈만 그리며 quiet zone을 별도 모델로 표현하지 않는다. 따라서 실제 프린터 출력과 동일한 판독 여백을 보장하지 않고, 향후에는 `quietZoneModules` 또는 `quietZoneDots`를 별도 정책으로 명시해야 한다. 단, Epson의 `GS ( k` 페이지에서 공통 수치를 찾을 수 없으므로 프린터 모델/제품 요구사항 없이 임의의 수치를 프로토콜 제약으로 확정하지 않는다.

## 현재 구현과 변경 필요성

### 현재 지원하는 범위

- `cn=49` QR 명령의 `fn=65`, `67`, `69`, `80`, `81` 시퀀스 인식
- Model 1/2/Micro, 모듈 크기, 오류 보정 레벨을 중간 모델에 저장
- 저장 후 인쇄되는 QR을 `qrcode` 이벤트와 별도 QR 라인으로 표시
- 텍스트와 QR이 섞인 입력을 프리뷰에서 분리하여 렌더링

### 보완이 필요한 범위

- 명령별 고정 파라미터와 `m=48`, `n2=0` 검증
- `n1`, 모듈 크기, 오류 보정 값의 유효 범위 검증 및 잘못된 값 경고
- `Function 180`의 원본 바이트 보존과 텍스트 인코딩 정책
- 저장 데이터의 길이 상한 및 모델별 QR 용량 정책
- Standard/Page mode 및 print-buffer 상태 표현
- `Function 182` 응답을 입력으로 받는 경우의 인쇄 가능 여부 표시
- 모델 선택값을 실제 QR 생성기에 전달하고, 인쇄 영역을 넘는 경우 임의 축소하지 않는 미리보기 정책
- quiet zone을 별도 렌더링/정책으로 다루기

이 중 프로토콜 파싱의 최소 보완은 잘못된 QR 명령을 조용히 정상 데이터로 바꾸지 않는 것이다. 렌더링의 정확도와 모델별 용량 검증은 프린터 모델 프로파일을 도입한 뒤 처리하는 것이 안전하다.

## 공식 1차 자료

- [Epson ESC/POS Command Reference — GS ( k](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk.html)
- [Epson — QR Code Function 165: Select the model](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn165.html)
- [Epson — QR Code Function 167: Set the size of module](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn167.html)
- [Epson — QR Code Function 169: Select the error correction level](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn169.html)
- [Epson — QR Code Function 180: Store the data](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn180.html)
- [Epson — QR Code Function 181: Print the symbol](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn181.html)
- [Epson — QR Code Function 182: Transmit size information](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_lk_fn182.html)
- [Epson ESC/POS Command Reference — US ( k Function 181](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos_dm/us_lparen_lk_fn181.html)
