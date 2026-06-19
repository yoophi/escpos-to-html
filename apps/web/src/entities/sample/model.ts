import { type InputMode } from '@escpos-to-html/escpos'

export type EscposSample = {
  id: string
  title: string
  description: string
  input: string
  inputMode?: InputMode
  textEncoding?: string
  preferredPreviewColumns?: 21 | 42
}

const paymentApprovalReceiptHex = `
1B 61 01 1B 21 30 C7 F6 B1 DD B0 E1 C1 A6 BD C2 C0 CE 1B 21 00 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
C6 E4 C0 CC C8 F7 BE EE 2D C0 AF BA B4 C7 F5 2D C5 E4 BD BA C7 C1 B7 D0 C6 AE 4D 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 0A
38 36 31 2D 38 31 2D 30 31 34 37 35 20 20 20 20 20 20 20 20 54 45 4C 3A 20 20 20 20 20 20 20 20 20 20 20 20 C0 AF BA B4 C7 F5 0A
BC AD BF EF 20 B0 AD B3 B2 B1 B8 20 B0 AD B3 B2 B4 EB B7 CE 20 33 37 34 20 31 36 C3 FE 20 20 20 20 20 20 20 20 20 20 20 20 20 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
B0 C5 B7 A1 20 C0 CF BD C3 20 20 20 20 20 20 20 20 20 20 20 20 20 20 32 30 32 36 2D 30 36 2D 31 39 20 31 36 3A 30 31 3A 30 31 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
BB F3 C7 B0 B8 ED 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 B4 DC B0 A1 20 BC F6 B7 AE 20 20 20 20 20 20 20 B1 DD BE D7 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
BB F7 B5 E5 C0 A7 C4 A1 20 BC BC C6 AE 20 20 20 20 20 20 20 31 35 2C 30 30 30 20 20 20 20 31 20 20 20 20 20 31 35 2C 30 30 30 0A
A2 BA BB F7 B5 E5 C0 A7 C4 A1 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 30 20 20 20 20 32 20 20 20 20 20 20 20 20 20 20 30 0A
20 20 A4 A4 20 B0 ED B1 E2 20 20 20 20 20 20 20 20 20 20 20 20 32 2C 30 30 30 20 20 20 20 32 20 20 20 20 20 20 34 2C 30 30 30 0A
A2 BA BE C6 B8 DE B8 AE C4 AB B3 EB 20 20 20 20 20 20 20 20 20 20 20 20 20 30 20 20 20 20 31 20 20 20 20 20 20 20 20 20 20 30 0A
20 20 A4 A4 20 4C 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 31 2C 30 30 30 20 20 20 20 31 20 20 20 20 20 20 31 2C 30 30 30 0A
C4 AB C6 E4 B6 F3 B6 BC 20 20 20 20 20 20 20 20 20 20 20 20 20 34 2C 35 30 30 20 20 20 20 31 20 20 20 20 20 20 34 2C 35 30 30 0A
0A
BB F7 B5 E5 C0 A7 C4 A1 20 20 20 20 20 20 20 20 20 20 20 20 31 30 2C 30 30 30 20 20 20 20 31 20 20 20 20 20 31 30 2C 30 30 30 0A
2D 20 B0 ED B1 E2 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 32 2C 30 30 30 20 20 20 20 31 20 20 20 20 20 20 32 2C 30 30 30 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
C7 D5 B0 E8 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 33 36 2C 35 30 30 BF F8 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
5B B0 E1 C1 A6 20 B3 BB BF AA 5D 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 0A
B0 F8 B1 DE B0 A1 BE D7 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 33 33 2C 31 38 33 BF F8 0A
BA CE B0 A1 BC BC 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 33 2C 33 31 37 BF F8 0A
1B 21 20 B0 E1 C1 A6 B1 DD BE D7 20 20 20 20 20 33 36 2C 35 30 30 BF F8 1B 21 00 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
5B C0 E7 C3 E2 B7 C2 5D 20 32 30 32 36 2D 30 36 2D 31 39 20 31 36 3A 33 32 3A 31 38 20 20 20 20 20 20 20 20 20 20 20 20 20 20 0A
2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 2D 0A
0A 0A 20 0A 0A 1B 69 1B 40
`.trim()

export const samples: EscposSample[] = [
  {
    id: 'cafe-receipt',
    title: 'Cafe receipt',
    description: '정렬, 굵게, 밑줄, 확대, 반전, 피드, 컷 명령이 포함된 기본 영수증입니다.',
    input: String.raw`\e@\e a\x01\eE\x01MAIN STREET CAFE\eE\x00
\e a\x01Order #1842
\e a\x00--------------------------------
Americano              2   9.00
\eE\x01Bagel Set\eE\x00              1   7.50
\e-\x01Discount\e-\x00                  -2.00
--------------------------------
\e a\x02Subtotal              14.50
Tax                    1.45
\g!\x11TOTAL                15.95\g!\x00
\e a\x01\gB\x01 PAID BY CARD \gB\x00
\e d\x02\gV\x00`,
  },
  {
    id: 'korean-receipt',
    title: 'Korean receipt',
    description: '한글 텍스트, 가운데 정렬, 합계 강조를 확인하는 샘플입니다.',
    input: String.raw`\e@\e a\x01\eE\x01동네분식\eE\x00
\e a\x01서울시 마포구 샘플로 12
사업자 123-45-67890
\e a\x00--------------------------------
김밥                  2   8,000
라면                  1   5,000
떡볶이                1   6,500
--------------------------------
\e a\x02소계                19,500
부가세               1,773
\g!\x11합계                19,500\g!\x00
\e a\x01\gB\x01 카드결제 완료 \gB\x00
감사합니다
\e d\x02\gV\x00`,
  },
  {
    id: 'payment-approval-receipt',
    title: 'Payment approval',
    description: 'EUC-KR 실데이터 기반 결제승인 영수증입니다. ESC !, 기호 폭, 컬럼 정렬 회귀 확인에 사용합니다.',
    input: paymentApprovalReceiptHex,
    inputMode: 'hex',
    textEncoding: 'euc-kr',
  },
  {
    id: 'korean-21-column',
    title: '21-column receipt',
    description: '21컬럼 폭에서 한글 2칸 기준으로 줄이 깨지지 않도록 구성한 영수증입니다.',
    preferredPreviewColumns: 21,
    input: String.raw`\e@\e a\x01\eE\x01작은가게\eE\x00
2.5IN RECEIPT
\e a\x00---------------------
김밥       1 4,000
라면       1 5,000
콜라       1 1,500
---------------------
\e a\x02합계      10,500
\e a\x01\gB\x01 결제완료 \gB\x00
감사합니다
\e d\x02\gV\x00`,
  },
  {
    id: 'style-lab',
    title: 'Style lab',
    description: '텍스트 스타일 상태가 span으로 어떻게 분리되는지 보기 위한 샘플입니다.',
    input: String.raw`\e@Normal text
\eE\x01Bold text\eE\x00
\e-\x01Underline text\e-\x00
\e-\x02Thick underline\e-\x00
\gB\x01Inverse mode\gB\x00
\g!\x01Double height\g!\x00
\g!\x10Double width\g!\x00
\g!\x11Double width and height\g!\x00`,
  },
  {
    id: 'control-events',
    title: 'Control events',
    description: '비프, 금전함 펄스, 여러 줄 피드, 컷 이벤트를 확인합니다.',
    input: String.raw`\e@CONTROL TEST
\x07Bell emitted
\e p\x00\x19\xfaDrawer pulse
\e d\x03After three feed lines
\gV\x41\x10`,
  },
  {
    id: 'warnings',
    title: 'Warnings',
    description: '지원하지 않는 명령과 불완전한 명령이 경고로 표시되는지 확인합니다.',
    input: String.raw`\e@Known text
\eZUnsupported ESC command
\g`,
  },
]

export const defaultSample = samples[0]

export function findSample(sampleId: string | undefined) {
  return samples.find((sample) => sample.id === sampleId) ?? defaultSample
}
