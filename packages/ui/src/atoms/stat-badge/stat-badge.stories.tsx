import { Braces } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatBadge } from '.'

const meta = {
  title: 'Atomic Design/Atoms/StatBadge',
  component: StatBadge,
  args: {
    icon: Braces,
    label: '405 bytes',
  },
} satisfies Meta<typeof StatBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
