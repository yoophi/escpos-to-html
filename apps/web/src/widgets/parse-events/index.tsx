import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { type ControlEvent } from '@escpos-to-html/escpos'
import { Badge } from '@escpos-to-html/ui'
import { CollapsiblePanel, Separator } from '@escpos-to-html/ui'

type ParseEventsProps = {
  events: ControlEvent[]
  warnings: string[]
}

export function ParseEvents({ events, warnings }: ParseEventsProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <CollapsiblePanel title="Parsed controls" collapsed={collapsed} onCollapsedChange={setCollapsed}>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No printer control events detected.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li className="flex items-center justify-between gap-4 border-b pb-2 text-sm" key={`${event.offset}-${event.label}`}>
                  <Badge variant="outline">{event.type}</Badge>
                  <span className="text-muted-foreground">{event.label}</span>
                </li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <div className="mt-4 space-y-2" role="status">
              <Separator />
              <div className="flex items-center gap-2 pt-2 text-sm font-medium">
                <AlertTriangle size={17} aria-hidden="true" />
                Warnings
              </div>
              {warnings.map((warning) => (
                <p className="text-sm text-muted-foreground" key={warning}>{warning}</p>
              ))}
            </div>
          )}
    </CollapsiblePanel>
  )
}
