# ESC/POS 이미지 출력 스펙 조사 메모

- 조사일: 2026-08-14
- 범위: Epson 공식 ESC/POS Command Reference를 기준으로 `ESC *`, `GS v 0`, `GS ( L` 그래픽 명령의 이미지 데이터 형식과 출력 상태
- 구현 반영: 이미지 파서·Canvas/SVG 프리뷰에 적용

## 결론

- 새 구현의 기본 경로는 `GS ( L` `<Function 112>`(raster 저장) + `GS ( L` `<Function 50>`(그래픽 출력)으로 잡는 것이 적절하다.
- `GS v 0`은 Epson 공식 문서에서 obsolete로 표시되고 향후 모델에서 지원되지 않을 수 있으므로 호환성 파서에서는 지원하되 신규 송신 포맷으로는 우선하지 않는다.
- `ESC *`는 column format, `GS v 0`과 `GS ( L` `<Function 112>`는 raster format이다. 세 형식은 바이트 순서가 다르므로 공통 내부 비트맵으로 정규화한 뒤 렌더링해야 한다.
- 이미지 데이터에서 비트 `1`은 인쇄점(검정), 비트 `0`은 비인쇄점(흰색)이다. Epson의 관계도 기준으로 각 바이트의 MSB가 먼저/상단 또는 좌측 픽셀에 해당하고 LSB가 마지막/하단 또는 우측 픽셀에 해당한다.
- 폭·높이 상한은 ESC/POS 전체의 단일 상수가 아니라 프린터 모델, 용지 폭, 인쇄 영역, 해상도에 따라 달라진다. 파서의 안전 상한과 출력 프로파일을 분리해야 한다.

## 명령 비교

| 명령 | 형식 | 크기 파라미터 | 데이터 길이 | 출력/상태 |
| --- | --- | --- | --- | --- |
| `ESC *` | column | `nL + nH × 256` = 가로 dot 수 | 8-dot: `n`; 24-dot: `n × 3` | `m`으로 8/24-dot 및 수평 밀도 선택. 모델별 줄/버퍼 동작에 주의 |
| `GS v 0` | raster | `xL + xH × 256` = 가로 byte 수, `yL + yH × 256` = 세로 dot 수 | `xBytes × yDots` | 이미지 출력 후 필요한 만큼 급지하고 인쇄 영역 왼쪽의 줄 시작 상태로 이동 |
| `GS ( L` fn 112 | raster | `xL + xH × 256` = 가로 dot 수, `yL + yH × 256` = 세로 dot 수 | `ceil(xDots / 8) × yDots` | 그래픽 버퍼에 저장. Standard mode에서 fn 50으로 별도 출력 |
| `GS ( L` fn 113 | column | `xL + xH × 256` = 가로 dot 수, `yL + yH × 256` = 세로 dot 수 | `xDots × ceil(yDots / 8)` | `GS ( L` fn 112의 column-format 대안. 이 메모리의 주 대상은 아님 |

모든 `nL/nH`, `xL/xH`, `yL/yH`, `pL/pH` 값은 Epson 문서의 식처럼 low byte + high byte × 256으로 해석한다. 즉 다중 바이트 정수는 little-endian이다.

## `ESC *` — Select bit-image mode

### 명령 형식

```text
ASCII: ESC * m nL nH d1 ... dk
HEX:   1B 2A m nL nH d1 ... dk
```

Epson 공식 범위는 모델별로 다르며, `m`은 다음 네 값이다.

| `m` | 모드 | 세로 데이터 | 데이터 밀도 | `k` |
| ---: | --- | ---: | --- | ---: |
| `0` | 8-dot single-density | 8 bits | 수평 single-density | `n` |
| `1` | 8-dot double-density | 8 bits | 수평 double-density | `n` |
| `32` | 24-dot single-density | 24 bits | 수평 single-density | `n × 3` |
| `33` | 24-dot double-density | 24 bits | 수평 double-density | `n × 3` |

`n = nL + nH × 256`은 가로 방향 dot 수이며, `d`는 column format이다. 8-dot 모드에서는 바이트 하나가 세로 8-dot column 하나다. 24-dot 모드에서는 같은 가로 위치에 대해 8-dot 세로 묶음 3개를 순서대로 보내므로, 가로 위치별 데이터가 3바이트씩 배치된다. Epson 관계도 기준으로 각 바이트는 MSB부터 LSB 방향으로 위에서 아래로 소비된다.

예를 들어 24-dot 모드에서 가로 dot 수가 `n`이면 데이터 순서는 개념적으로 다음과 같다.

```text
x=0: d1 d2 d3   (세로 0..7, 8..15, 16..23)
x=1: d4 d5 d6
x=2: d7 d8 d9
...
```

각 바이트의 `0b10000000`은 해당 8-dot 묶음의 첫 dot을, `0b00000001`은 마지막 dot을 인쇄한다.

### 폭 제한과 줄바꿈

- Epson 문서에는 모델별로 `n`의 예시 범위가 `1–1023`, `1–2400`, `1–2047`로 제시된다. 이 값을 모든 프린터에 공통 적용하면 안 된다.
- 한 줄의 인쇄 가능 dot 수를 넘은 데이터는 무시된다.
- `d1...dk` 안에 `LF`를 넣는 방식이 아니다. `d`는 명령이 선언한 정확한 이미지 바이트 수다.
- Standard mode에서 여러 이미지 조각을 이어 붙일 때는 모델의 줄 간격/인쇄 버퍼 동작을 확인해야 한다. Epson은 여러 줄 bit image의 세로 정렬이 중요하면 `ESC U` 단방향 인쇄를 사용할 수 있다고 안내한다.
- Page mode에서는 이미지가 즉시 종이에 인쇄되지 않고 print buffer에 저장되며, `LF`도 실제 급지가 아니라 print position 이동으로 처리된다.

## `GS v 0` — Print raster bit image

### 명령 형식

```text
ASCII: GS v 0 m xL xH yL yH d1 ... dk
HEX:   1D 76 30 m xL xH yL yH d1 ... dk
```

파라미터는 다음과 같다.

| 파라미터 | 의미 |
| --- | --- |
| `m` | `0/48` normal, `1/49` double-width, `2/50` double-height, `3/51` 가로·세로 2배 |
| `xL/xH` | 가로 방향 byte 수 `xBytes` |
| `yL/yH` | 세로 방향 dot 수 `yDots` |
| `d1...dk` | raster data, `k = xBytes × yDots` |

### raster 바이트 순서

각 행은 `xBytes` 바이트이고, 행은 위에서 아래로 이어진다.

```text
row 0: byte[0] ... byte[xBytes-1]
row 1: byte[0] ... byte[xBytes-1]
...
row yDots-1
```

각 행의 첫 바이트의 MSB가 가장 왼쪽 dot이고, 같은 바이트의 LSB가 그 다음 8-dot 묶음의 가장 오른쪽 dot이다. `xBytes = ceil(widthDots / 8)`로 계산되는 구현이 일반적이지만, Epson 명령 자체의 파라미터는 가로 byte 수이므로 마지막 바이트의 사용하지 않는 bit는 0으로 채우는 것이 안전하다.

### Epson 공식 상태 규칙

- Standard mode에서는 print buffer가 비어 있고 줄 시작 상태일 때만 명령이 활성화된다. 그렇지 않으면 `m` 이후 데이터가 일반 데이터로 처리될 수 있다.
- Page mode에서는 즉시 인쇄되지 않고 print buffer에 저장된다.
- 출력 시 `ESC 2`/`ESC 3`으로 설정한 일반 line spacing과 무관하게 이미지 높이에 필요한 만큼 급지한다.
- 출력 후 인쇄 위치는 printable area의 왼쪽이 되고 줄 시작 상태가 된다. 따라서 일반적인 Standard mode에서는 이미지 뒤에 추가 `LF`를 넣으면 의도보다 더 많이 급지될 수 있다.
- Epson은 이 명령을 obsolete로 표시하며, 일부 모델만 지원하고 미래 모델에서는 지원하지 않을 수 있다고 명시한다. 그래픽 함수 `GS ( L` fn 50 + fn 112를 대안으로 권장한다.

## `GS ( L` graphics — raster 함수 112 + 출력 함수 50

### raster 저장: Function 112

```text
GS ( L:
1D 28 4C pL pH 30 70 a bx by c xL xH yL yH d1 ... dk

GS 8 L:
1D 38 4C p1 p2 p3 p4 30 70 a bx by c xL xH yL yH d1 ... dk
```

`GS ( L`은 2-byte 길이 `pL/pH`, `GS 8 L`은 4-byte 길이 `p1..p4`를 사용한다. 길이 값은 뒤따르는 `m`부터 이미지 데이터 끝까지의 바이트 수로 계산해야 한다. Epson 문서의 최소 길이가 11인 이유는 `m..yH` 10바이트와 최소 이미지 데이터 1바이트를 포함하기 때문이다.

| 파라미터 | 의미 |
| --- | --- |
| `a` | `48` = monochrome/digital, `52` = multiple tone. 일반 영수증 흑백은 `48` |
| `bx`, `by` | 가로·세로 배율. Epson 문서 범위는 각각 `1` 또는 `2` |
| `c` | color 1=`49`, color 2=`50` 등. 단색은 보통 `49` |
| `xL/xH` | 실제 가로 dot 수 |
| `yL/yH` | 실제 세로 dot 수 |
| `d` | raster data |
| `k` | `ceil(xDots / 8) × yDots` |

이 명령의 raster 데이터는 `GS v 0`처럼 행 우선이다. Epson 공식 그래픽 예제도 `128 (= 8 × 16)` dot 폭을 16바이트 단위로, 높이 방향 행을 차례로 나열한다. 공식 barcode 예제의 30×8 dot 단위도 한 행의 30바이트를 먼저 보내고 다음 행으로 넘어간다.

### 그래픽 출력: Function 50

```text
GS ( L 02 00 30 32
HEX: 1D 28 4C 02 00 30 32
```

Epson 문서의 `fn=50`은 print buffer에 저장된 graphics data를 출력한다. 저장 함수 112/113만 보낸 것으로는 Standard mode에서 종이에 출력되지 않는다.

- fn 50은 Page mode에서 사용할 수 없다.
- 일반 line spacing과 무관하게 그래픽 높이에 필요한 만큼 급지한다.
- 출력 후 printable area 왼쪽의 줄 시작 상태가 된다.
- 저장 함수 112 자체는 출력 위치를 바꾸지 않는다. 따라서 여러 조각을 저장한 뒤 한 번 fn 50을 호출하거나, 프린터 모델의 버퍼 한계에 맞춰 저장·출력을 반복해야 한다.
- 한 번의 graphics data가 한 줄 인쇄 영역을 넘으면 출력되지 않는다. 더 큰 이미지는 세로 조각을 나눠 112 + 50 조합으로 처리할 수 있지만, 조각 경계와 급지 상태를 테스트해야 한다.
- Epson은 일부 모델에서 horizontal position과 left margin을 8의 배수로 맞추고, 원본 배율(`bx=1`, `by=1`)을 사용하면 처리 성능이 좋아진다고 안내한다. 이는 문법상 필수는 아니며 모델별 최적화 조건이다.

### Function 113과의 구분

`GS ( L` fn 113은 같은 graphics buffer를 column format으로 채우는 대안이다. fn 112는 raster format이고 fn 113은 column format이라는 점만 다르며, 한 프린터에서 두 함수를 모두 지원하더라도 한 종류만 데이터 정의에 사용하는 것이 Epson 권장사항이다.

## 구현 시 주의점

1. **명령별 디코더를 분리한다.** `ESC *`는 column format, `GS v 0`/fn 112는 raster format이므로 raw payload를 동일한 2차원 배열로 직접 해석하지 않는다.
2. **정수는 little-endian으로 읽는다.** `x = xL | (xH << 8)`, `y = yL | (yH << 8)`에 해당한다. `GS 8 L`의 길이는 4바이트 little-endian이다.
3. **payload 길이를 먼저 검증한다.** `ESC *`: `n` 또는 `n×3`, `GS v 0`: `xBytes×yDots`, fn 112: `ceil(xDots/8)×yDots`를 checked arithmetic로 계산하고, 스트림에 실제 바이트가 부족하면 불완전 이미지로 표시한다.
4. **비트 극성을 고정한다.** `1 = print`, `0 = blank`; PNG/Canvas의 일반적인 `1 = white` 표현과 뒤집히지 않도록 변환 경계를 명확히 한다.
5. **마지막 raster byte를 마스킹한다.** 폭이 8의 배수가 아니면 마지막 byte의 남는 bit는 무시하거나 0이어야 한다.
6. **스케일을 별도 메타데이터로 보존한다.** `GS v 0`의 `m`과 fn 112의 `bx/by`는 원본 bitmap 크기와 출력 크기를 바꾼다. 파서 내부에는 원본 dot 크기와 출력 배율을 모두 남기는 편이 프리뷰 검증에 유리하다.
7. **줄바꿈을 이미지 payload와 혼동하지 않는다.** 이미지 payload 안의 `0x0A`는 단순한 데이터 byte일 수 있다. `LF`는 명령 길이가 끝난 뒤에만 별도 ESC/POS command로 해석한다.
8. **이미지 뒤의 급지를 중복하지 않는다.** `GS v 0`과 fn 50은 출력 후 필요한 만큼 급지하고 줄 시작 상태로 돌아온다. 후속 `LF`/`ESC d`는 실제로 추가 여백을 만든다.
9. **프린터 모델 프로파일을 둔다.** Epson 문서의 명령 지원 여부·최대 폭·높이·dot density가 모델 선택에 따라 달라진다. `384/576/640` 같은 폭을 ESC/POS 공통 스펙으로 하드코딩하지 않는다.
10. **호환성과 신규 출력 경로를 구분한다.** 수신 파서는 `ESC *`와 `GS v 0`을 지원하는 것이 현실적이지만, 신규 raw 출력 생성은 모델 호환성을 확인한 `GS ( L` fn 112/50을 우선한다.

## 이미지 폭·크기 제한 상세 조사

### 먼저 구분할 것: 명령 필드의 표현 범위와 실제 인쇄 가능 폭

ESC/POS 명령의 `n`, `x`, `y` 필드는 16-bit 형태로 표현되더라도 실제로 프린터가 받아 인쇄할 수 있는 범위는 모델별로 더 작다. Epson은 세 명령 모두에서 모델별 범위를 별도로 제시하며, 이미지가 현재 한 줄의 인쇄 영역을 넘으면 초과분을 무시하거나 출력하지 않을 수 있다고 설명한다.

따라서 표시 전략은 다음 두 값을 분리해야 한다.

- `commandMax`: 명령/모델이 수락하는 파라미터 상한
- `printableWidth`: 현재 용지 폭과 column mode에서 실제 한 줄에 인쇄 가능한 dot 수

### `ESC *`의 `n` 범위와 모델별 최대 dot 수

공식 `ESC *` 페이지의 공통 형식은 다음과 같다.

- `m = 0, 1, 32, 33`
- `n = nL + nH × 256`
- `n`은 가로 dot 수
- `m = 0, 1`이면 `k = n`
- `m = 32, 33`이면 `k = n × 3`

Epson은 모델별 `n` 상한을 다음과 같이 제시한다.

| Epson 공식 모델군 표기 | `n` 범위 | 의미 |
| --- | ---: | --- |
| 모델군 A | `1–1023` | `m` 네 값 공통 |
| 모델군 B | `1–2400` | `m` 네 값 공통 |
| 모델군 C | `1–2047` | `m` 네 값 공통 |

이 수치는 “이미지 폭으로 사용해도 되는 공통 폭”이 아니다. 예를 들어 203 dpi 계열의 80mm 영수증은 실제 printable area가 보통 `576` dot 또는 42-column emulation에서 `546` dot이므로, `n = 1023`을 허용해도 한 줄에 그대로 표시할 수 없다.

Epson의 203 dpi 계열 표에는 다음과 같은 대표 폭이 나온다.

| 용지/모드 사례 | `m=0,32` | `m=1,33` | 비고 |
| --- | ---: | ---: | --- |
| 80mm, 48 column mode | 288 | 576 | single/double horizontal density |
| 80mm, 42 column mode | 273 | 546 | 42-column emulation |
| 58mm, 48/42 column mode가 함께 적용되는 모델 | 192 | 384 | 일부 autocutter 모델 |
| 80mm, 표준 column + 58mm, 42 column mode 표 | 288/273 | 576/546 | 모델에 따라 표준/42-column 폭이 함께 제시됨 |
| 58mm, 표준 column + 42 column mode 표 | 210/189 | 420/378 | 203 dpi 계열 사례 |

`ESC *` 표의 `m=1` 또는 `m=33` 행을 흑백 이미지의 최대 가로 폭으로 사용할 때, 80mm는 모델에 따라 `576` 또는 `546` dot, 58mm는 `420`, `378`, `384` 등으로 달라진다. Epson은 58mm 지원 자체도 모델별로 다르며, 어떤 표에서는 autocutter 모델에만 가능하다고 명시한다.

### `GS v 0`의 `x/y` 범위

공식 명령 형식은 다음과 같다.

```text
GS v 0 m xL xH yL yH d1 ... dk
```

Epson이 명시한 범위와 의미는 다음과 같다.

| 필드 | 공식 의미/범위 |
| --- | --- |
| `m` | `0–3`, `48–51` |
| `x = xL + xH × 256` | 가로 방향 byte 수. 실제 범위는 프린터별 상이 |
| `y = yL + yH × 256` | 세로 dot 수. 실제 범위는 프린터별 상이 |
| `d` | `0–255` |
| `k` | `x × y` |

`m`은 `0/48 = 1×1`, `1/49 = 2×1`, `2/50 = 1×2`, `3/51 = 2×2` 배율이다. 즉 `x`는 dot 수가 아니라 가로 byte 수이므로, 논리 이미지 폭이 `widthDots`라면 payload 폭은 `ceil(widthDots / 8)` byte이다.

Epson은 `GS v 0`을 obsolete command로 표시하고, 일부 모델만 지원하며 미래 모델에서 지원되지 않을 수 있다고 명시한다. 또한 한 줄 인쇄 영역을 넘는 raster 이미지는 초과 데이터가 인쇄되지 않을 수 있으므로, 실질적인 폭 제한은 `x × 8 <= printableWidth`로 판단해야 한다.

### `GS ( L` Function 112의 `x/y` 범위

Function 112는 raster graphics를 print buffer에 저장하는 명령이다.

```text
GS ( L pL pH 30 70 a bx by c xL xH yL yH d1 ... dk
```

공통 필드 범위는 다음과 같다.

| 필드 | 공식 범위/의미 |
| --- | --- |
| `pL + pH × 256` | `11–65535` (`GS ( L`) |
| `p1 + p2×256 + p3×65536 + p4×16777216` | `11–4294967295` (`GS 8 L`) |
| `m` | `48` |
| `fn` | `112` |
| `bx`, `by` | 각각 `1` 또는 `2` |
| `d` | `0–255` |
| `x = xL + xH × 256` | 가로 dot 수, 모델별 상이 |
| `y = yL + yH × 256` | 세로 dot 수, 모델별 상이 |
| `k` | `ceil(x / 8) × y` |

Epson 공식 모델별 예시는 다음과 같다.

| 공식 문서의 모델 사례 | `x` 범위 | `y` 범위 |
| --- | ---: | ---: |
| TM-J2000/J2100 계열 | `1–2048` | `1–128` |
| TM-L90 4** 계열, `by=1/2` | `1–1024` | `1–1476` / `1–738` |
| TM-L90 65* 계열 | `1–8192` | `1–2304` |
| 일부 203 dpi 영수증 모델 사례 | `1–2400` | `1–2400` (`by=1`) / `1–1200` (`by=2`) |
| 일부 203 dpi 모델 사례 | `1–2047` | `1–1662` (`by=1`) / `1–831` (`by=2`) |
| 일부 180 dpi 모델 사례 | `1–1024` | `1–1200` (`by=1`) / `1–600` (`by=2`) |

Function 112 페이지는 이미지의 실제 최대 인쇄 영역과 dot density는 `GS ( L` Function 69의 모델 정보와 같다고 안내한다. 대표적인 203 dpi 80mm/58mm 사례는 다음과 같다.

| 용지/column mode | ×1 가로 printable area | ×2 가로 printable area | 세로 방향 표기 |
| --- | ---: | ---: | --- |
| 80mm, 표준 column mode | 576 dot | 288 dot | 203 dpi / 203÷2 dpi |
| 80mm, 42 column mode | 546 dot | 273 dot | 203 dpi / 203÷2 dpi |
| 58mm, 표준 column mode | 420 dot | 210 dot | 203 dpi / 203÷2 dpi |
| 58mm, 42 column mode | 378 dot | 189 dot | 203 dpi / 203÷2 dpi |
| 일부 58mm 48/42 column mode 모델 | 384 dot | 192 dot | 모델의 column emulation에 따름 |

또 다른 Epson 모델군은 180 dpi 기준으로 80mm `512` dot, 58mm `360` dot 또는 80mm `512` dot, 58mm `480` dot처럼 다른 값을 갖는다. 그러므로 `576`/`420`은 모든 Epson 프린터에 대한 절대 상수가 아니다.

### 42자 기본 폭에 대한 표시 전략 제안

Epson TM-T20III/T82 계열 Technical Reference Guide는 203 dpi에서 다음을 명시한다.

- 80mm 표준 모드: `72.0mm = 576 dots`
- 58mm 표준 모드: `52.5mm = 420 dots`
- 80mm 42-column mode: `68.3mm = 546 dots`
- 58mm 42-column mode: `47.3mm = 378 dots`

따라서 “영문 42자 출력이 기본”이라는 제품 요구사항은 두 가지 중 어느 의미인지 분리해야 한다.

1. **표시 격자 기준으로 42자**: 80mm 이미지 폭을 `546 dots`, 58mm를 `378 dots`로 잡는다. Epson의 42-column mode와 직접 대응한다.
2. **80mm 영수증의 전체 표준 printable area를 기준으로 42자 텍스트를 배치**: 80mm `576 dots`, 58mm `420 dots`를 잡고, 텍스트는 별도의 42-column layout으로 배치한다.

현재 프로젝트의 기본 표시 전략으로는 1번이 더 안전하다. 다만 프린터 명령 자체와 일치하는 것은 “42자”가 아니라 `42-column mode의 printableWidth`이므로, 표시 프로파일은 다음처럼 dot 폭을 명시하는 형태가 적절하다.

| 표시 프로파일 | 기본 이미지 폭 | 정렬 |
| --- | ---: | --- |
| `receipt-80mm-42col` | `546 dots` | 가운데 정렬 |
| `receipt-58mm-42col` | `378 dots` | 가운데 정렬 |
| `receipt-80mm-standard` | `576 dots` | 가운데 정렬 |
| `receipt-58mm-standard` | `420 dots` | 가운데 정렬 |

이미지가 기본 폭보다 넓으면 축소하지 않고 잘라내기보다는, `maxWidth = printableWidth` 안에서 종횡비를 유지해 축소하는 것이 실제 프린터의 “한 줄 초과분 무시” 동작보다 예측 가능하다. 이미지 폭이 기본 폭보다 좁으면 좌우 여백을 동일하게 두어 `offsetX = (printableWidth - imageWidth) / 2`로 가운데 정렬한다. 이 가운데 정렬은 Epson 명령의 기본 동작이 아니라 애플리케이션 표시 정책이므로, 프린터 출력에서 동일하게 보장하려면 이미지 전송 전에 좌측 여백/수평 위치를 명시적으로 계산해야 한다.

### 크기 제한에 대한 최종 판단

- **가로**: 명령 필드의 표현 범위보다 현재 모델의 printable area가 실질적인 제한이다. 203 dpi 영수증 기본 프로파일은 `576/546/420/378 dots` 사례를 우선 지원하는 것이 현실적이다.
- **세로**: 일반 Standard mode 영수증에서는 “전체 영수증 높이”의 고정 상한보다 그래픽 버퍼/수신 버퍼 및 명령별 `y` 상한이 제한이 된다. Function 112는 모델별 `y` 상한을 가지며, 큰 이미지는 여러 세로 band로 나누어 Function 112 + Function 50을 반복할 수 있다.
- **`GS v 0`**: `x`는 byte 수, `y`는 dot 수이고, 한 줄 영역을 넘는 raster는 출력되지 않을 수 있다. 신규 출력 포맷으로는 사용하지 않는 편이 좋다.
- **Function 112**: Epson은 실제 current print area를 넘지 않도록 `x/y`를 지정하고, 큰 그래픽은 여러 조각으로 나누라고 안내한다. `by=1` 원본 배율을 기본으로 두는 것이 모델 간 비교와 프리뷰 일치에 유리하다.

## 위아래 여백 정책

일반 ESC/POS에는 모든 프린터에 공통으로 적용되는 이미지 전용 상단·하단 마진 명령이 없다.

- `ESC 2`와 `ESC 3`은 각각 기본 줄 간격과 줄 간격을 설정하는 명령이지, 이미지 블록의 마진을 설정하는 명령이 아니다.
- `GS L`과 `GS W`는 수평 인쇄 위치와 인쇄 영역을 다루므로 위아래 마진 규약이 아니다.
- `ESC W`는 Page mode의 인쇄 영역 설정이며 Standard mode 영수증에 적용되는 공통 상하단 마진으로 해석하지 않는다.
- 그래픽 출력 명령은 이미지 데이터를 출력하는 데 필요한 거리를 자동으로 급지한다. 이미지 뒤에 애플리케이션이 `LF`나 `ESC d`를 자동으로 추가하면 의도하지 않은 중복 세로 여백이 생길 수 있다.
- 일부 Epson 모델에는 후방 급지 기반 top margin이나 과도한 상하단 여백을 줄이는 모델별 설정이 있지만, 이는 공통 ESC/POS 이미지 규격이 아니므로 기본 표시 정책에 포함하지 않는다.

따라서 이 프로젝트의 이미지 표시 정책은 다음과 같다.

1. 이미지 블록 자체에는 위아래 마진을 추가하지 않는다.
2. 이미지 전후의 추가 공간은 입력 데이터에 실제로 포함된 `LF`, `ESC d` 등의 급지 명령으로만 표현한다.
3. Canvas의 용지 외곽 padding은 화면상의 용지 표현을 위한 장식이며, 이미지 출력 마진으로 사용하지 않는다.
4. 이미지 파싱 직후 합성 `LF` 또는 별도 feed 이벤트를 만들지 않는다.

## 공식/1차 자료

- [Epson ESC/POS Command Reference — Introduction](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos_dm/): Command Reference Revision 2.10 및 문서 범위.
- [Epson — ESC *](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_asterisk.html): column format, `m`별 8/24-dot 모드, 모델별 범위, 관계도.
- [Epson — GS v 0](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html): raster 형식, `m/x/y` 파라미터, 데이터 길이, obsolete 판정.
- [Epson — GS ( L / GS 8 L Function 112](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_cl_fn112.html): raster graphics 저장 형식, 길이·폭·높이·배율·색상, 모델별 제한.
- [Epson — GS ( L Function 50](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_cl_fn50.html): graphics buffer 출력, 급지 및 줄 시작 상태.
- [Epson — GS ( L / GS 8 L Function 113](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_cl_fn113.html): column-format graphics 대안.
- [Epson — GS ( L Function 69](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_cl_fn69.html): 모델별 dot density와 maximum print area. Function 112는 이 모델 정보를 사용한다고 명시.
- [Epson — GS W](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_cw.html): 모델/column mode별 printable width와 column 수.
- [Epson TM-T20III Technical Reference Guide](https://download4.epson.biz/sec_pubs/bs/pdf/TM-T20III_trg_en_revF.pdf): 203 dpi 80mm/58mm 및 표준/42-column mode의 실제 `576/420/546/378 dots` 사례.
- [Epson TM-T82IV Technical Reference Guide](https://download4.epson.biz/sec_pubs/bs/pdf/TM-T82IV_trg_en_revB.pdf): 80mm/58mm 용지의 실제 printable width와 column 수 사례.
- [Epson — Print Graphics programming example](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/graphics.html): raster graphics의 실제 데이터 배치 예.
- [Epson — Issuing Receipts with Barcodes](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/receipt_with_barcode.html): 30×8 dot 단위 raster graphics 데이터 예.
- [Epson — Epson ePOS SDK](https://download4.epson.biz/sec_pubs/pos/reference_en/technology/epson_epos_sdk.html): JavaScript SDK는 Canvas 이미지를 출력할 수 있는 고수준 API이며, raw ESC/POS 명령의 대체 규격 문서는 아님.
