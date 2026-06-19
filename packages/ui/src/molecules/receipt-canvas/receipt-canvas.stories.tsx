import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReceiptCanvas } from '.'

const styledResult = parseEscpos(
  '\\e@\\e a\\x01\\eE\\x01동네분식\\eE\\x00\\n\\eE\\x00서울시 마포구 샘플로 12\\n\\e a\\x00------------------------------\\n김밥              2   8,000\\n라면              1   5,000\\n------------------------------\\n\\e a\\x02소계             13,000\\n\\g!\\x11합계             13,000\\g!\\x00\\n\\e a\\x01\\gB\\x01 카드결제 완료 \\gB\\x00',
  'escaped',
)

const meta = {
  title: 'Atomic Design/Molecules/ReceiptCanvas',
  component: ReceiptCanvas,
  decorators: [
    (Story) => (
      <div className="inline-block bg-[#d8d2c3] p-8">
        <Story />
      </div>
    ),
  ],
  args: {
    lines: styledResult.lines,
    columns: 42,
  },
} satisfies Meta<typeof ReceiptCanvas>

export default meta

type Story = StoryObj<typeof meta>

export const FortyTwoColumns: Story = {}

export const TwentyOneColumns: Story = {
  args: {
    columns: 21,
  },
}
