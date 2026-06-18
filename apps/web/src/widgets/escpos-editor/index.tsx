import { type InputMode, type ParseResult, toHex } from '@escpos-to-html/escpos'
import { SourceEditor } from '../../shared/ui/source-editor'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/shadcn/card'
import { ScrollArea } from '../../shared/ui/shadcn/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '../../shared/ui/shadcn/tabs'

type EscposEditorProps = {
  input: string
  mode: InputMode
  result: ParseResult
  onInputChange: (value: string) => void
  onModeChange: (mode: InputMode) => void
}

export function EscposEditor({ input, mode, result, onInputChange, onModeChange }: EscposEditorProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription>Input</CardDescription>
        <CardTitle>ESC/POS source</CardTitle>
        <CardAction>
          <Tabs value={mode} onValueChange={(value) => onModeChange(value as InputMode)}>
            <TabsList>
              <TabsTrigger value="escaped">Escaped</TabsTrigger>
              <TabsTrigger value="hex">Hex</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        <SourceEditor value={input} onChange={onInputChange} />
      </CardContent>

      <CardContent className="border-t pt-4">
        <CardDescription className="mb-2">Decoded bytes</CardDescription>
        <ScrollArea className="h-20 rounded-md border bg-muted/40 p-3">
          <code className="block whitespace-pre-wrap break-words text-xs">{toHex(result.bytes) || '00'}</code>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
