import type { Meta, StoryObj } from '@storybook/react-vite'
import { MetricBadges } from '.'

const meta = {
  title: 'Atomic Design/Molecules/MetricBadges',
  component: MetricBadges,
  args: {
    bytes: 405,
    lines: 13,
    events: 2,
  },
} satisfies Meta<typeof MetricBadges>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
