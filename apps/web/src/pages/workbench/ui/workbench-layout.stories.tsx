import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardContent } from '@escpos-to-html/ui'
import { WorkbenchLayout } from './workbench-layout'

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <Card className="min-h-48">
      <CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  )
}

const meta = {
  title: 'Atomic Design/Templates/WorkbenchLayout',
  component: WorkbenchLayout,
  args: {
    bytes: 405,
    lines: 13,
    events: 2,
    sampleSelector: <PlaceholderPanel label="Sample selector" />,
    editorPanel: <PlaceholderPanel label="ESC/POS editor" />,
    previewPanel: <PlaceholderPanel label="Receipt preview" />,
    htmlPanel: <PlaceholderPanel label="HTML output" />,
    parsedDataPanel: <PlaceholderPanel label="Parsed data" />,
    eventsPanel: <PlaceholderPanel label="Parsed controls" />,
  },
} satisfies Meta<typeof WorkbenchLayout>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
