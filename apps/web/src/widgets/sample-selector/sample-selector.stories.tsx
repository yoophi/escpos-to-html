import type { Meta, StoryObj } from '@storybook/react-vite'
import { samples } from '../../entities/sample'
import { SampleSelector } from '.'

const meta = {
  title: 'Atomic Design/Organisms/SampleSelector',
  component: SampleSelector,
  args: {
    selectedSample: samples[1],
    onSelect: () => undefined,
  },
} satisfies Meta<typeof SampleSelector>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
