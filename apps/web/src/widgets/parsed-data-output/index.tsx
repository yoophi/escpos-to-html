import { useState } from 'react'
import { Braces } from 'lucide-react'
import { type ParseResult } from '@escpos-to-html/escpos'
import { CollapsiblePanel, ScrollArea } from '@escpos-to-html/ui'

type ParsedDataOutputProps = {
  data: ParseResult
}

export function ParsedDataOutput({ data }: ParsedDataOutputProps) {
  const [collapsed, setCollapsed] = useState(false)
  const json = JSON.stringify(data, null, 2)

  return (
    <CollapsiblePanel
      className={collapsed ? undefined : 'min-h-96'}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      title={
        <span className="flex items-center gap-2 text-base">
          <Braces size={17} aria-hidden="true" />
          Parsed Data
        </span>
      }
    >
      <ScrollArea className="h-96 w-full rounded-md border bg-muted/30 p-3">
        <pre className="whitespace-pre-wrap text-sm">{json}</pre>
      </ScrollArea>
    </CollapsiblePanel>
  )
}
