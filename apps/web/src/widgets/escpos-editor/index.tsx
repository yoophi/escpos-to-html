import { type ParseResult, toHex } from '@escpos-to-html/escpos'
import { SourceEditor } from '../../shared/ui/source-editor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/shadcn/card'
import { ScrollArea } from '../../shared/ui/shadcn/scroll-area'

type EscposEditorProps = {
  input: string
  result: ParseResult
  onInputChange: (value: string) => void
}

export function EscposEditor({ input, result, onInputChange }: EscposEditorProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription>Input</CardDescription>
        <CardTitle>ESC/POS source</CardTitle>
      </CardHeader>

      <CardContent className="px-0">
        <SourceEditor value={input} onChange={onInputChange} />
      </CardContent>

      <CardContent className="border-t pt-4">
        <CardDescription className="mb-2">Decoded bytes</CardDescription>
        <ScrollArea className="h-40 rounded-md border bg-muted/40 p-3">
          <code className="block whitespace-pre-wrap break-words text-xs">{toHex(result.bytes) || '00'}</code>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
