import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReceiptRail } from '.'

const receipts = [
  {
    id: 'latest',
    title: '14:08:21',
    description: '405 bytes',
    lines: parseEscpos(
      '\\e@\\e a\\x01\\eE\\x01동네분식\\eE\\x00\\n서울시 마포구 샘플로 12\\n사업자 123-45-67890\\n\\e a\\x00------------------------------\\n김밥              2   8,000\\n라면              1   5,000\\n떡볶이            1   6,500\\n------------------------------\\n\\e a\\x02합계             19,500\\n\\g!\\x11합계             19,500\\g!\\x00\\n카드결제 완료\\n감사합니다',
      'escaped',
    ).lines,
  },
  {
    id: 'previous',
    title: '14:07:33',
    description: '348 bytes',
    lines: parseEscpos(
      '\\e@\\e a\\x01\\eE\\x01MAIN STREET CAFE\\eE\\x00\\nOrder #1842\\n\\e a\\x00------------------------------\\nAmericano         2   9.00\\nBagel Set         1   7.50\\nDiscount             -2.00\\n------------------------------\\nSubtotal             14.50\\nTax                   1.45\\n\\g!\\x11TOTAL              15.95\\g!\\x00\\nPAID BY CARD',
      'escaped',
    ).lines,
  },
]

const meta = {
  title: 'Atomic Design/Organisms/ReceiptRail',
  component: ReceiptRail,
  args: {
    receipts,
    selectedReceiptId: 'latest',
    columns: 42,
  },
} satisfies Meta<typeof ReceiptRail>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
