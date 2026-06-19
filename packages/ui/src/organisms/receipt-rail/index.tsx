import { ReceiptCanvas } from '../../molecules/receipt-canvas'
import { cn } from '../../lib/utils'
import { type ReceiptLine } from '@escpos-to-html/escpos'

export type ReceiptRailItem = {
  id: string
  title: string
  description?: string
  lines: ReceiptLine[]
}

type ReceiptRailProps = {
  receipts: readonly ReceiptRailItem[]
  selectedReceiptId?: string | null
  columns?: 21 | 42
  onSelectReceipt?: (receiptId: string) => void
}

export function ReceiptRail({ receipts, selectedReceiptId, columns = 42, onSelectReceipt }: ReceiptRailProps) {
  const cardWidth = columns * 10 + 28 + 48

  return (
    <div
      className="flex max-w-full gap-[18px] overflow-x-auto overflow-y-hidden bg-[#d8d2c3] bg-[linear-gradient(90deg,rgba(29,29,29,0.05)_1px,transparent_1px),linear-gradient(rgba(29,29,29,0.05)_1px,transparent_1px)] bg-[length:22px_22px] p-[18px] [overscroll-behavior-x:contain]"
      aria-label="Received receipt previews"
    >
      {receipts.map((receipt) => {
        const isSelected = receipt.id === selectedReceiptId

        return (
          <article
            className={cn(
              'flex h-[clamp(520px,calc(100vh-300px),760px)] flex-none flex-col overflow-hidden rounded-lg border bg-background shadow-[0_18px_44px_rgba(30,26,18,0.12)]',
              isSelected && 'border-primary shadow-[0_0_0_1px_hsl(var(--primary)),0_18px_44px_rgba(30,26,18,0.12)]',
            )}
            style={{ width: cardWidth, maxWidth: cardWidth }}
            key={receipt.id}
          >
            <button
              type="button"
              className="flex w-full flex-none cursor-pointer items-center justify-between gap-3 border-0 border-b bg-card px-3 py-2.5 text-left text-xs text-foreground"
              onClick={() => onSelectReceipt?.(receipt.id)}
            >
              <span className="truncate">{receipt.title}</span>
              {receipt.description ? <span className="shrink-0 text-muted-foreground">{receipt.description}</span> : null}
            </button>
            <div className="flex min-h-0 flex-1 items-start justify-center overflow-x-hidden overflow-y-auto p-6">
              <ReceiptCanvas lines={receipt.lines} columns={columns} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
