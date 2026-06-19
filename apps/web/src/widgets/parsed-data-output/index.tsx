import { Braces } from 'lucide-react'
import { type ParseResult } from '@escpos-to-html/escpos'
import { PanelHeader } from '@escpos-to-html/ui'
import { Card, CardContent } from '@escpos-to-html/ui'
import { ScrollArea } from '@escpos-to-html/ui'

type ParsedDataOutputProps = {
  data: ParseResult
}

export function ParsedDataOutput({ data }: ParsedDataOutputProps) {
  const json = JSON.stringify(data, null, 2)

  return (
    <Card className="min-h-96">
      <PanelHeader
        title={
          <span className="flex items-center gap-2 text-base">
            <Braces size={17} aria-hidden="true" />
            Parsed Data
          </span>
        }
      />
      <CardContent className="flex flex-1">
        <ScrollArea className="h-96 w-full rounded-md border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap text-sm">{json}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
