import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { type ParseResult, toHex } from '@escpos-receipt-emulator/escpos'
import { type InputMode } from '@escpos-receipt-emulator/escpos'
import { SourceEditor } from '@escpos-receipt-emulator/ui'
import { CodeBlock } from '@escpos-receipt-emulator/ui'
import { PanelHeader } from '@escpos-receipt-emulator/ui'
import { Button } from '@escpos-receipt-emulator/ui'
import { Card, CardContent, CardDescription } from '@escpos-receipt-emulator/ui'

type EscposEditorProps = {
  input: string
  result: ParseResult
  inputMode?: InputMode
  textEncoding?: string
  onInputChange: (value: string) => void
}

export function EscposEditor({ input, result, inputMode = 'escaped', textEncoding, onInputChange }: EscposEditorProps) {
  const [bytesCollapsed, setBytesCollapsed] = useState(false)

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
        <div className="mb-2 flex items-center justify-between">
          <CardDescription>Decoded bytes</CardDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-expanded={!bytesCollapsed}
            aria-label={bytesCollapsed ? 'Expand decoded bytes' : 'Collapse decoded bytes'}
            onClick={() => setBytesCollapsed((value) => !value)}
          >
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform ${bytesCollapsed ? '-rotate-90' : ''}`}
            />
          </Button>
        </div>
        {bytesCollapsed ? null : <CodeBlock value={toHex(result.bytes)} fallback="00" />}
      </CardContent>
    </Card>
  )
}
