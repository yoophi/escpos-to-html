import { Button } from '../../shadcn/button'

export type PresetSegmentItem<TValue extends string> = {
  value: TValue
  label: string
  description?: string
}

type PresetSegmentProps<TValue extends string> = {
  items: readonly PresetSegmentItem<TValue>[]
  value: TValue
  ariaLabel: string
  onValueChange: (value: TValue) => void
}

export function PresetSegment<TValue extends string>({ items, value, ariaLabel, onValueChange }: PresetSegmentProps<TValue>) {
  return (
    <div className="flex rounded-md border bg-muted p-1" aria-label={ariaLabel}>
      {items.map((item) => (
        <Button
          key={item.value}
          type="button"
          variant={item.value === value ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-3"
          onClick={() => onValueChange(item.value)}
          aria-pressed={item.value === value}
          title={item.description}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
