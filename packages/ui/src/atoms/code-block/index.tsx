import { ScrollArea } from '../../shadcn/scroll-area'

type CodeBlockProps = {
  value: string
  fallback?: string
  className?: string
}

export function CodeBlock({ value, fallback = '', className = 'h-40' }: CodeBlockProps) {
  return (
    <ScrollArea className={`${className} rounded-md border bg-muted/40 p-3`}>
      <code className="block whitespace-pre-wrap break-words text-xs">{value || fallback}</code>
    </ScrollArea>
  )
}
