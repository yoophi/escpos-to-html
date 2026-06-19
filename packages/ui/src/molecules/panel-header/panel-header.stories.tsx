import { Clipboard } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../shadcn/button'
import { Card } from '../../shadcn/card'
import { PanelHeader } from '.'

const meta = {
  title: 'Atomic Design/Molecules/PanelHeader',
  component: PanelHeader,
  decorators: [
    (Story) => (
      <Card className="w-[420px]">
        <Story />
      </Card>
    ),
  ],
  args: {
    eyebrow: 'Preview',
    title: 'Thermal receipt',
  },
} satisfies Meta<typeof PanelHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const WithAction: Story = {
  args: {
    action: (
      <Button type="button" variant="outline" size="icon" aria-label="Copy">
        <Clipboard size={18} aria-hidden="true" />
      </Button>
    ),
  },
}
