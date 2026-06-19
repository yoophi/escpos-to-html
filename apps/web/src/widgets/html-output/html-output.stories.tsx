import { parseEscpos, renderHtml } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { samples } from '../../entities/sample'
import { HtmlOutput } from '.'

const result = parseEscpos(samples[1].input, 'escaped')

const meta = {
  title: 'Atomic Design/Organisms/HtmlOutput',
  component: HtmlOutput,
  args: {
    html: renderHtml(result, { wrapPlainTextSpans: true }),
    wrapPlainTextSpans: true,
    onWrapPlainTextSpansChange: () => undefined,
  },
} satisfies Meta<typeof HtmlOutput>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
