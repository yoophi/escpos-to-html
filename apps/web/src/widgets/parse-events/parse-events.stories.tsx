import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { samples } from '../../entities/sample'
import { ParseEvents } from '.'

const result = parseEscpos(samples[0].input, 'escaped')

const meta = {
  title: 'Atomic Design/Organisms/ParseEvents',
  component: ParseEvents,
  args: {
    events: result.events,
    warnings: result.warnings,
  },
} satisfies Meta<typeof ParseEvents>

export default meta

type Story = StoryObj<typeof meta>

export const WithEvents: Story = {}

export const Empty: Story = {
  args: {
    events: [],
    warnings: [],
  },
}
