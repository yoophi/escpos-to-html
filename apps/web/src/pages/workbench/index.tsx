import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Braces, FileText, Scissors } from 'lucide-react'
import { parseEscpos, renderHtml } from '@escpos-to-html/escpos'
import { type EscposSample, findSample } from '../../entities/sample'
import { Badge } from '../../shared/ui/shadcn/badge'
import { SampleSelector } from '../../widgets/sample-selector'
import { EscposEditor } from '../../widgets/escpos-editor'
import { ReceiptPreview } from '../../widgets/receipt-preview'
import { HtmlOutput } from '../../widgets/html-output'
import { ParseEvents } from '../../widgets/parse-events'

export function WorkbenchPage() {
  const { sampleId } = useParams()
  const selectedSample = useMemo(() => findSample(sampleId), [sampleId])

  return <SampleWorkbench key={selectedSample.id} selectedSample={selectedSample} />
}

function SampleWorkbench({ selectedSample }: { selectedSample: EscposSample }) {
  const navigate = useNavigate()
  const [input, setInput] = useState(selectedSample.input)
  const [wrapPlainTextSpans, setWrapPlainTextSpans] = useState(true)
  const result = useMemo(() => parseEscpos(input, 'escaped'), [input])
  const html = useMemo(() => renderHtml(result, { wrapPlainTextSpans }), [result, wrapPlainTextSpans])

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-6 lg:py-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight lg:text-6xl">ESC/POS 프리뷰</h1>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end" aria-label="Parser status">
          <Badge variant="outline" className="h-9 gap-2 px-3">
            <Braces size={16} aria-hidden="true" />
            {result.bytes.length} bytes
          </Badge>
          <Badge variant="outline" className="h-9 gap-2 px-3">
            <FileText size={16} aria-hidden="true" />
            {result.lines.length} lines
          </Badge>
          <Badge variant="outline" className="h-9 gap-2 px-3">
            <Scissors size={16} aria-hidden="true" />
            {result.events.length} events
          </Badge>
        </div>
      </section>

      <SampleSelector
        selectedSample={selectedSample}
        onSelect={(nextSampleId) => navigate(`/samples/${nextSampleId}`)}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(420px,1fr)_minmax(420px,0.95fr)]" id="workspace" aria-label="ESC/POS preview workspace">
        <EscposEditor input={input} result={result} onInputChange={setInput} />
        <ReceiptPreview result={result} html={html} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.6fr)]" id="output">
        <HtmlOutput
          html={html}
          wrapPlainTextSpans={wrapPlainTextSpans}
          onWrapPlainTextSpansChange={setWrapPlainTextSpans}
        />
        <ParseEvents events={result.events} warnings={result.warnings} />
      </section>
    </main>
  )
}
