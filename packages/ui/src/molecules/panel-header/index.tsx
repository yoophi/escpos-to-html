import { type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { CardAction, CardDescription, CardHeader, CardTitle } from '../../shadcn/card'
import { Button } from '../../shadcn/button'
import { cn } from '../../lib/utils'

type PanelHeaderProps = {
  eyebrow?: string
  title: ReactNode
  action?: ReactNode
  className?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function PanelHeader({ eyebrow, title, action, className, collapsed = false, onCollapsedChange }: PanelHeaderProps) {
  return (
    <CardHeader className={className}>
      {eyebrow ? <CardDescription>{eyebrow}</CardDescription> : null}
      <CardTitle>{title}</CardTitle>
      {action || onCollapsedChange ? (
        <CardAction className="flex items-center gap-2">
          {action}
          {onCollapsedChange ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              onClick={() => onCollapsedChange(!collapsed)}
            >
              <ChevronDown size={16} aria-hidden="true" className={cn('transition-transform', collapsed && '-rotate-90')} />
            </Button>
          ) : null}
        </CardAction>
      ) : null}
    </CardHeader>
  )
}
