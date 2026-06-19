import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { samples } from '../../entities/sample'
import { ParsedDataOutput } from '.'

const result = parseEscpos(samples[1].input, 'escaped')

const meta = {
  title: 'Atomic Design/Organisms/ParsedDataOutput',
  component: ParsedDataOutput,
  args: {
    data: result,
  },
} satisfies Meta<typeof ParsedDataOutput>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
