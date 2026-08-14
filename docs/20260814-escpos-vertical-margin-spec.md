# Epson ESC/POS 위·아래 여백 규약 조사

조사일: 2026-08-14

범위: Epson 공식 ESC/POS Command Reference와 Epson 기술자료를 기준으로 영수증의 이미지·텍스트 출력에서 수직 여백이 어떻게 결정되는지 확인한다. 이 문서는 코드 변경이 아닌 스펙 조사 메모다.

## 결론

Epson ESC/POS의 일반적인 Standard mode 영수증 출력에는 모든 모델에 공통으로 적용되는 `top margin`/`bottom margin` 설정 명령이 없다.

- `GS L`과 `GS W`는 각각 왼쪽 여백과 가로 인쇄 영역 폭만 설정한다.
- `ESC 2`와 `ESC 3`은 줄 간격을 설정한다. 이는 텍스트 줄과 `ESC d`의 줄 단위 급지에 영향을 주지만, 영수증 전체의 top/bottom margin을 설정하지 않는다.
- `ESC J`와 `ESC d`는 명시적으로 용지를 급지하므로, Standard mode에서 위·아래 공간을 만들고 싶을 때 사용하는 범용 수단이다.
- `GS ( L` Function 112는 그래픽을 버퍼에 저장하고 Function 50이 그래픽을 출력한다. Function 50은 줄 간격과 무관하게 그래픽에 필요한 만큼 급지하므로, 그래픽 뒤에 추가 `LF`/`ESC d`/`ESC J`를 보내면 별도 공간이 생긴다.
- Page mode의 `ESC W`는 수직 logical origin과 print area height를 지정할 수 있지만, Standard mode 영수증의 전역 top/bottom margin 명령은 아니다.
- `GS ( E` Function 5의 top margin by backfeed 및 ARP top/bottom margin reduction은 일부 모델·펌웨어의 사용자 설정이다. 범용 ESC/POS 레이아웃 규약으로 취급하면 안 된다.

따라서 이 프로젝트의 프리뷰 기본값은 수직 `margin = 0`으로 두고, 입력 스트림에 실제로 존재하는 `LF`, `ESC J`, `ESC d`, 그래픽 출력 후 급지를 그대로 반영하는 것이 가장 안전하다.

## 명령별 구분

| 항목 | 적용 모드 | 수직 동작 | 여백으로 해석할 때의 주의점 |
| --- | --- | --- | --- |
| `GS L` | Standard 중심 | 없음 | printable area의 왼쪽에서 떨어진 위치만 설정 |
| `GS W` | Standard 중심 | 없음 | 가로 print area width만 설정 |
| `ESC 2` | Standard/Page 각각 독립 | 기본 line spacing 선택. Epson 문서의 대표 기본값은 30 dots | top/bottom margin이 아니라 줄 간격 |
| `ESC 3 n` | Standard/Page 각각 독립 | line spacing을 `n`으로 설정 | `ESC d`의 1 line 급지량에도 사용 |
| `ESC J n` | Standard: 실제 출력·급지; Page: 위치만 이동 | motion unit 기준으로 `n`만큼 급지 | 명시적인 임시 수직 공간 |
| `ESC d n` | Standard: 실제 출력·급지; Page: 위치만 이동 | 현재 line spacing 기준으로 `n`줄 급지 | 명시적인 임시 수직 공간 |
| `GS ( L` Function 112 + Function 50 | Standard만 | 그래픽 출력 시 필요한 거리만큼 급지 | `ESC 2/3`의 line pitch를 따르지 않음 |
| `ESC W` | Page mode만 | `y` logical origin과 `dy` print area height 설정 | 페이지 내부 좌표계이지 Standard mode 전역 여백이 아님 |

## 가로 인쇄 영역: `GS L` / `GS W`

`GS L`은 Standard mode에서 printable area의 왼쪽 edge로부터 horizontal motion unit만큼 왼쪽 여백을 설정한다. 기본값은 0이며 Page mode에서는 효과가 없다.

`GS W`는 Standard mode의 print area width를 설정한다. 기본값은 프린터의 전체 printable area이며, Epson 문서의 모델별 기본값은 360, 432, 480, 512, 576 dots 등으로 다르다. 두 명령 모두 수직 여백을 정의하지 않는다.

- [Epson GS L — Set left margin](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_cl.html)
- [Epson GS W — Set print area width](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_cw.html)

## 줄 간격: `ESC 2` / `ESC 3`

`ESC 2`는 프린터의 default line spacing을 선택한다. Epson Command Reference는 대표적으로 약 4.23 mm 또는 3.75 mm, 모두 30 dots에 해당하는 모델별 기본값을 제시한다.

`ESC 3 n`은 line spacing을 0–255 범위의 `n`으로 설정한다. 이 설정은 Standard mode와 Page mode에서 독립적이다. `ESC d n`의 한 줄 급지량은 `ESC 2` 또는 `ESC 3`의 line spacing을 따른다.

이미지 자체의 높이 또는 그래픽 출력 후 급지는 이 줄 간격과 별개다.

- [Epson ESC 2 — Select default line spacing](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_2.html)
- [Epson ESC 3 — Set line spacing](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_3.html)
- [Epson ESC d — Print and feed n lines](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_ld.html)

## 명시적 급지: `ESC J` / `ESC d`

Standard mode에서 `ESC J n`은 버퍼의 데이터를 출력한 뒤 motion unit 기준으로 `n`만큼 급지한다. `ESC d n`은 버퍼의 데이터를 출력한 뒤 현재 line spacing 기준으로 `n`줄 급지한다. Epson 문서는 두 명령을 line spacing을 바꾸지 않고 일시적으로 특정 길이 또는 줄 수를 급지하는 명령으로 설명한다.

따라서 다음은 모두 실제 수직 공간을 만든다.

- 이미지 앞의 `ESC J`/`ESC d`: top spacing
- 이미지 뒤의 `ESC J`/`ESC d`: bottom spacing 또는 다음 콘텐츠와의 간격
- 영수증 마지막의 `ESC d`/`ESC J` 후 cut: 컷 전 여백

Page mode에서는 두 명령이 실제 인쇄·급지를 수행하지 않고 print position만 이동한다.

- [Epson ESC J — Print and feed paper](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_cj.html)
- [Epson ESC d — Print and feed n lines](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_ld.html)

## 그래픽 급지: Function 112 / Function 50

Function 112는 raster graphics data를 print buffer에 저장한다. Function 50이 이를 출력하며, Epson 문서는 Function 50이 line feed pitch 설정과 무관하게 그래픽 출력에 필요한 거리를 급지한다고 명시한다. 출력 후 print position은 printable area의 왼쪽으로 이동하고 line beginning 상태가 된다.

Function 50은 Page mode에서 사용할 수 없다. 그러므로 현재 프로젝트가 Standard mode의 영수증 프리뷰를 대상으로 할 때 이미지 높이는 그래픽 블록의 높이와 Function 50에 의해 발생하는 위치 이동으로 반영하고, Function 50 뒤에 자동 `LF`를 덧붙이지 않아야 Epson 동작과 일치한다.

- [Epson GS ( L Function 112 — Store graphics data in print buffer](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_cl_fn112.html)
- [Epson GS ( L Function 50 — Print graphics data in print buffer](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_cl_fn50.html)

## Standard mode와 Page mode

Standard mode가 기본 모드이며, 데이터 스트림 순서에 따라 출력 위치가 이동한다. Standard mode의 수직 시작 위치와 끝 위치는 일반적인 top/bottom margin 필드가 아니라 앞서 수신한 텍스트의 줄 처리, `LF`, 명시적 급지, 그래픽 급지, cut 전 급지 등에 의해 결정된다.

Page mode는 `ESC L`로 선택한다. `ESC W`는 Page mode에서 다음을 지정한다.

- horizontal logical origin `x`
- vertical logical origin `y`
- print area width `dx`
- print area height `dy`

즉 `y`는 페이지 내부의 vertical origin이므로 top offset처럼 사용할 수 있고 `dy`는 페이지 영역의 높이를 제한할 수 있다. 그러나 `ESC W`는 Standard mode에 효과가 없으며, Page mode 버퍼를 `FF`/`ESC FF`로 일괄 출력하는 페이지 레이아웃 기능이다. Page mode에서는 `LF`, `ESC J`, `ESC d`가 실제 인쇄·급지가 아닌 위치 이동만 수행한다.

- [Epson ESC L — Select Page mode](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_cl.html)
- [Epson ESC W — Set print area in Page mode](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_cw.html)
- [Epson Print in Page mode](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/pagemode.html)
- [Epson FF in Page mode](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/ff_in_page.html)

## 모델별 예외: `GS ( E` Function 5

Epson Command Reference에는 사용자 설정 명령인 `GS ( E` Function 5에 다음 항목이 일부 모델별로 등장한다.

- `a = 13`: backfeed를 이용한 top margin specification
- `a = 101`: excessive top margin reduction (ARP)
- `a = 102`: excessive bottom margin reduction (ARP)

이 항목들은 일반적인 ESC/POS 스트림에서 이미지·텍스트 블록의 정확한 위·아래 여백을 지정하는 명령이 아니다. 모델, 펌웨어, 용지 레이아웃, backfeed/label 동작에 종속된 프린터 사용자 설정이며, ARP는 여백을 특정 값으로 설정하는 것이 아니라 과도한 여백을 자동으로 줄이는 기능이다.

- [Epson GS ( E Function 5 — Set customized setting values](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_ce_fn05.html)
- [Epson GS ( E Function 3 — User setup settings](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_ce_fn03.html)
- [Epson EU-m30 Developer's Guide — top margin/backfeed context](https://download4.epson.biz/sec_pubs/bs/pdf/EU-m30_dg_en_revD.pdf)

## 프로젝트 표시 전략 결론

현재 프로젝트의 Standard mode 프리뷰에는 다음 규칙을 적용하는 것이 적절하다.

1. 애플리케이션 기본 `topMarginDots = 0`, `bottomMarginDots = 0`.
2. 이미지 전후에 프리뷰 전용 공백을 자동 삽입하지 않는다.
3. 입력에 포함된 `LF`, `ESC J`, `ESC d`는 실제 급지 이벤트로 반영한다.
4. Function 50 그래픽 출력의 내재 급지를 반영하고, 뒤에 자동 `LF`를 추가하지 않는다.
5. `ESC 2/ESC 3`은 텍스트 줄 높이와 `ESC d`의 line feed 양에만 사용한다.
6. Page mode를 나중에 지원할 경우에만 `ESC W`의 `y/dy`를 별도 페이지 좌표계로 모델링한다.
7. `GS ( E`의 backfeed/ARP는 프린터 모델 프로파일을 명시적으로 선택한 경우에만 별도 옵션으로 다룬다.

즉, “마진이 없다”는 의미는 물리 프린터의 모든 기계적 여백이 0이라는 뜻이 아니라, ESC/POS Standard mode 스트림에 공통 top/bottom margin 규약이 없다는 뜻이다. 이 프로젝트의 기본 프리뷰는 프로토콜상 명시된 급지만 표시하고, 임의의 CSS/렌더러 여백을 추가하지 않는 것으로 결정할 수 있다.
