import { parseEscpos, renderHtml } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { samples } from '../../entities/sample'
import { ReceiptPreview } from '.'

const result = parseEscpos(samples[2].input, 'escaped')

const meta = {
  title: 'Atomic Design/Organisms/ReceiptPreview',
  component: ReceiptPreview,
  args: {
    result,
    html: renderHtml(result, { wrapPlainTextSpans: true }),
  },
} satisfies Meta<typeof ReceiptPreview>

export default meta

type Story = StoryObj<typeof meta>

export const FortyTwoColumns: Story = {}

export const TwentyOneColumns: Story = {
  args: {
    result: parseEscpos(samples[2].input, 'escaped'),
    html: renderHtml(parseEscpos(samples[2].input, 'escaped'), { wrapPlainTextSpans: true }),
    preferredColumns: 21,
  },
}
