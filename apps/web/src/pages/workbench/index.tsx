import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseEscposBytes, parseInput, renderHtml } from '@escpos-to-html/escpos'
import { type EscposSample, findSample } from '../../entities/sample'
import { SampleSelector } from '../../widgets/sample-selector'
import { EscposEditor } from '../../widgets/escpos-editor'
import { ReceiptPreview } from '../../widgets/receipt-preview'
import { HtmlOutput } from '../../widgets/html-output'
import { ParsedDataOutput } from '../../widgets/parsed-data-output'
import { ParseEvents } from '../../widgets/parse-events'
import { WorkbenchLayout } from './ui/workbench-layout'

export function WorkbenchPage() {
  const { sampleId } = useParams()
  const selectedSample = useMemo(() => findSample(sampleId), [sampleId])

  return <SampleWorkbench key={selectedSample.id} selectedSample={selectedSample} />
}

function SampleWorkbench({ selectedSample }: { selectedSample: EscposSample }) {
  const navigate = useNavigate()
  const [input, setInput] = useState(selectedSample.input)
  const [wrapPlainTextSpans, setWrapPlainTextSpans] = useState(true)
  const result = useMemo(() => {
    const bytes = parseInput(input, selectedSample.inputMode ?? 'escaped')
    return parseEscposBytes(bytes, { textEncoding: selectedSample.textEncoding })
  }, [input, selectedSample.inputMode, selectedSample.textEncoding])
  const html = useMemo(() => renderHtml(result, { wrapPlainTextSpans }), [result, wrapPlainTextSpans])

  return (
    <WorkbenchLayout
      bytes={result.bytes.length}
      lines={result.lines.length}
      events={result.events.length}
      sampleSelector={<SampleSelector selectedSample={selectedSample} onSelect={(nextSampleId) => navigate(`/samples/${nextSampleId}`)} />}
      editorPanel={
        <EscposEditor
          input={input}
          result={result}
          inputMode={selectedSample.inputMode}
          textEncoding={selectedSample.textEncoding}
          onInputChange={setInput}
        />
      }
      previewPanel={<ReceiptPreview result={result} html={html} preferredColumns={selectedSample.preferredPreviewColumns} />}
      htmlPanel={
        <HtmlOutput
          html={html}
          wrapPlainTextSpans={wrapPlainTextSpans}
          onWrapPlainTextSpansChange={setWrapPlainTextSpans}
        />
      }
      parsedDataPanel={<ParsedDataOutput data={result} />}
      eventsPanel={<ParseEvents events={result.events} warnings={result.warnings} />}
    />
  )
}
