import { AlertTriangle } from 'lucide-react'
import { type ControlEvent } from '@escpos-to-html/escpos'
import { PanelHeader } from '@escpos-to-html/ui'
import { Badge } from '@escpos-to-html/ui'
import { Card, CardContent } from '@escpos-to-html/ui'
import { Separator } from '@escpos-to-html/ui'

type ParseEventsProps = {
  events: ControlEvent[]
  warnings: string[]
}

export function ParseEvents({ events, warnings }: ParseEventsProps) {
  return (
    <Card>
      <PanelHeader title="Parsed controls" />
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
