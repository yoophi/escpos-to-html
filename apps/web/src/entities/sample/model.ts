import type { InputMode } from '@escpos-to-html/escpos'

export type EscposSample = {
  id: string
  title: string
  description: string
  mode: InputMode
  input: string
}

export const samples: EscposSample[] = [
  {
    id: 'cafe-receipt',
    title: 'Cafe receipt',
    description: '정렬, 굵게, 밑줄, 확대, 반전, 피드, 컷 명령이 포함된 기본 영수증입니다.',
    mode: 'escaped',
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
    mode: 'escaped',
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
    id: 'style-lab',
    title: 'Style lab',
    description: '텍스트 스타일 상태가 span으로 어떻게 분리되는지 보기 위한 샘플입니다.',
    mode: 'escaped',
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
    id: 'hex-minimal',
    title: 'Hex minimal',
    description: 'hex 입력 모드에서 ESC @, 가운데 정렬, 굵게, 컷 명령을 확인합니다.',
    mode: 'hex',
    input: '1B 40 1B 61 01 1B 45 01 48 45 58 20 53 41 4D 50 4C 45 1B 45 00 0A 1B 61 00 54 6F 74 61 6C 20 20 20 20 20 20 31 32 2E 33 34 0A 1D 56 00',
  },
  {
    id: 'control-events',
    title: 'Control events',
    description: '비프, 금전함 펄스, 여러 줄 피드, 컷 이벤트를 확인합니다.',
    mode: 'escaped',
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
    mode: 'escaped',
    input: String.raw`\e@Known text
\eZUnsupported ESC command
\g`,
  },
]

export const defaultSample = samples[0]

export function findSample(sampleId: string | undefined) {
  return samples.find((sample) => sample.id === sampleId) ?? defaultSample
}
