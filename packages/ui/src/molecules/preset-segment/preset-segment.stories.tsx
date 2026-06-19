import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PresetSegment } from '.'

const items = [
  { value: 'pc-seller-42', label: '42 columns', description: 'PC Seller default' },
  { value: 'pc-seller-21', label: '21 columns', description: 'Double width' },
] as const

function PresetSegmentStory() {
  const [value, setValue] = useState<(typeof items)[number]['value']>('pc-seller-42')

  return <PresetSegment ariaLabel="Receipt width preset" items={items} value={value} onValueChange={setValue} />
}

const meta = {
  title: 'Atomic Design/Molecules/PresetSegment',
  component: PresetSegmentStory,
} satisfies Meta<typeof PresetSegmentStory>

export default meta

type Story = StoryObj<typeof meta>

export const ReceiptWidth: Story = {}
