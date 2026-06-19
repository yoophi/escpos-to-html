import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReceiptCanvas } from '../../molecules/receipt-canvas'
import { ReceiptStage } from '.'

const result = parseEscpos(
  '\\e@\\e a\\x01\\eE\\x01동네분식\\eE\\x00\\n서울시 마포구 샘플로 12\\n사업자 123-45-67890\\n\\e a\\x00------------------------------\\n김밥              2   8,000\\n라면              1   5,000\\n------------------------------\\n\\e a\\x02합계             13,000',
  'escaped',
)

const meta = {
  title: 'Atomic Design/Organisms/ReceiptStage',
  component: ReceiptStage,
  args: {
    children: <ReceiptCanvas lines={result.lines} columns={42} />,
  },
} satisfies Meta<typeof ReceiptStage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
