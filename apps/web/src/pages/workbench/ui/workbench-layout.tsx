import { type ReactNode } from 'react'
import { MetricBadges } from '@escpos-to-html/ui'

type WorkbenchLayoutProps = {
  bytes: number
  lines: number
  events: number
  sampleSelector: ReactNode
  editorPanel: ReactNode
  previewPanel: ReactNode
  htmlPanel: ReactNode
  parsedDataPanel: ReactNode
  eventsPanel: ReactNode
}

export function WorkbenchLayout({
  bytes,
  lines,
  events,
  sampleSelector,
  editorPanel,
  previewPanel,
  htmlPanel,
  parsedDataPanel,
  eventsPanel,
}: WorkbenchLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-6 lg:py-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight lg:text-6xl">ESC/POS 프리뷰</h1>
        </div>
        <MetricBadges bytes={bytes} lines={lines} events={events} />
      </section>

      {sampleSelector}

      <section className="grid gap-4 xl:grid-cols-[minmax(420px,1fr)_minmax(420px,0.95fr)]" id="workspace" aria-label="ESC/POS preview workspace">
        {editorPanel}
        {previewPanel}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.6fr)]" id="output">
        {htmlPanel}
        {parsedDataPanel}
        {eventsPanel}
      </section>
    </main>
  )
}
