import { type ParseResult, toHex } from '@escpos-to-html/escpos'
import { type InputMode } from '@escpos-to-html/escpos'
import { SourceEditor } from '@escpos-to-html/ui'
import { CodeBlock } from '@escpos-to-html/ui'
import { PanelHeader } from '@escpos-to-html/ui'
import { Card, CardContent, CardDescription } from '@escpos-to-html/ui'

type EscposEditorProps = {
  input: string
  result: ParseResult
  inputMode?: InputMode
  textEncoding?: string
  onInputChange: (value: string) => void
}

export function EscposEditor({ input, result, inputMode = 'escaped', textEncoding, onInputChange }: EscposEditorProps) {
  return (
    <Card className="overflow-hidden">
      <PanelHeader
        eyebrow="Input"
        title="ESC/POS source"
        action={<CardDescription>{[inputMode, textEncoding].filter(Boolean).join(' / ')}</CardDescription>}
      />

      <CardContent className="px-0">
        <SourceEditor value={input} onChange={onInputChange} />
      </CardContent>

      <CardContent className="border-t pt-4">
        <CardDescription className="mb-2">Decoded bytes</CardDescription>
        <CodeBlock value={toHex(result.bytes)} fallback="00" />
      </CardContent>
    </Card>
  )
}
