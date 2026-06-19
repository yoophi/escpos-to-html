import type { Meta, StoryObj } from '@storybook/react-vite'
import { CodeBlock } from '.'

const meta = {
  title: 'Atomic Design/Atoms/CodeBlock',
  component: CodeBlock,
  args: {
    value: '1B 40 1B 61 01 EB 8F 99 EB 84 A4 EB B6 84 EC 8B 9D 0A',
    fallback: '00',
  },
} satisfies Meta<typeof CodeBlock>

export default meta

type Story = StoryObj<typeof meta>

export const HexBytes: Story = {}

export const Empty: Story = {
  args: {
    value: '',
    fallback: '00',
  },
}
