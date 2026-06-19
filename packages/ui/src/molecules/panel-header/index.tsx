import { type ReactNode } from 'react'
import { CardAction, CardDescription, CardHeader, CardTitle } from '../../shadcn/card'

type PanelHeaderProps = {
  eyebrow?: string
  title: ReactNode
  action?: ReactNode
  className?: string
}

export function PanelHeader({ eyebrow, title, action, className }: PanelHeaderProps) {
  return (
    <CardHeader className={className}>
      {eyebrow ? <CardDescription>{eyebrow}</CardDescription> : null}
      <CardTitle>{title}</CardTitle>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
  )
}
