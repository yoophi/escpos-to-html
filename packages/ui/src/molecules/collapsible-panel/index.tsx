import { type ReactNode } from 'react'
import { Card, CardContent } from '../../shadcn/card'
import { PanelHeader } from '../panel-header'

type CollapsiblePanelProps = {
  title: ReactNode
  children: ReactNode
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  action?: ReactNode
  className?: string
}

export function CollapsiblePanel({
  title,
  children,
  collapsed,
  onCollapsedChange,
  action,
  className,
}: CollapsiblePanelProps) {
  return (
    <Card className={className}>
      <PanelHeader
        title={title}
        action={action}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      />
      {collapsed ? null : <CardContent className="flex flex-1">{children}</CardContent>}
    </Card>
  )
}
