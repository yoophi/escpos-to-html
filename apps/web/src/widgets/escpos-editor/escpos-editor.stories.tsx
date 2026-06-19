import { parseEscpos } from '@escpos-to-html/escpos'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { samples } from '../../entities/sample'
import { EscposEditor } from '.'

const input = samples[2].input

const meta = {
  title: 'Atomic Design/Organisms/EscposEditor',
  component: EscposEditor,
  args: {
    input,
    result: parseEscpos(input, 'escaped'),
    onInputChange: () => undefined,
  },
} satisfies Meta<typeof EscposEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
