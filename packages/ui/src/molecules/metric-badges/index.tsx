import { Braces, FileText, Scissors } from 'lucide-react'
import { StatBadge } from '../../atoms/stat-badge'

type MetricBadgesProps = {
  bytes: number
  lines: number
  events: number
}

export function MetricBadges({ bytes, lines, events }: MetricBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end" aria-label="Parser status">
      <StatBadge icon={Braces} label={`${bytes} bytes`} />
      <StatBadge icon={FileText} label={`${lines} lines`} />
      <StatBadge icon={Scissors} label={`${events} events`} />
    </div>
  )
}
