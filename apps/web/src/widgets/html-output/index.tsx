import { Code2, ListChecks } from 'lucide-react'
import { PanelHeader } from '@escpos-to-html/ui'
import { Card, CardContent } from '@escpos-to-html/ui'
import { Checkbox } from '@escpos-to-html/ui'
import { ScrollArea } from '@escpos-to-html/ui'

type HtmlOutputProps = {
  html: string
  wrapPlainTextSpans: boolean
  onWrapPlainTextSpansChange: (value: boolean) => void
}

export function HtmlOutput({ html, wrapPlainTextSpans, onWrapPlainTextSpansChange }: HtmlOutputProps) {
  return (
    <Card className="min-h-96">
      <PanelHeader
        title={
          <span className="flex items-center gap-2 text-base">
            <Code2 size={17} aria-hidden="true" />
            HTML
          </span>
        }
        action={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={wrapPlainTextSpans} onCheckedChange={(checked) => onWrapPlainTextSpansChange(checked === true)} />
            <ListChecks size={16} aria-hidden="true" />
            <span>Plain text span</span>
          </label>
        }
      />
      <CardContent className="flex flex-1">
        <ScrollArea className="h-96 w-full rounded-md border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap text-sm">{html}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
