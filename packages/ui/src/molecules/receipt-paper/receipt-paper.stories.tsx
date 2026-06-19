import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReceiptPaper } from '.'

const fortyTwoColumnResult = parseEscpos(
  '\\e@\\e a\\x01\\eE\\x01동네분식\\eE\\x00\\n\\e a\\x01서울시 마포구 샘플로 12\\n사업자 123-45-67890\\n\\e a\\x00------------------------------\\n김밥              2   8,000\\n라면              1   5,000\\n------------------------------\\n\\e a\\x02합계             13,000\\n\\g!\\x11합계             13,000\\g!\\x00',
  'escaped',
)
const twentyOneColumnResult = parseEscpos(
  '\\e@\\e a\\x01\\eE\\x01동네분식\\eE\\x00\\n\\e a\\x01좁은 영수증\\n\\e a\\x00---------------------\\n김밥      2  8,000\\n라면      1  5,000\\n---------------------\\n\\e a\\x02합계     13,000',
  'escaped',
)

const meta = {
  title: 'Atomic Design/Molecules/ReceiptPaper',
  component: ReceiptPaper,
  decorators: [
    (Story) => (
      <div className="inline-block bg-muted p-8">
        <Story />
      </div>
    ),
  ],
  args: {
    lines: fortyTwoColumnResult.lines,
    columns: 42,
  },
} satisfies Meta<typeof ReceiptPaper>

export default meta

type Story = StoryObj<typeof meta>

export const FortyTwoColumns: Story = {}

export const TwentyOneColumns: Story = {
  args: {
    lines: twentyOneColumnResult.lines,
    columns: 21,
  },
}
