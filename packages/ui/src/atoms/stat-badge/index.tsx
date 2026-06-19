import { type ComponentType } from 'react'
import { type LucideProps } from 'lucide-react'
import { Badge } from '../../shadcn/badge'

export type StatBadgeProps = {
  icon: ComponentType<LucideProps>
  label: string
}

export function StatBadge({ icon: Icon, label }: StatBadgeProps) {
  return (
    <Badge variant="outline" className="h-9 gap-2 px-3">
      <Icon width={16} height={16} aria-hidden="true" />
      {label}
    </Badge>
  )
}
