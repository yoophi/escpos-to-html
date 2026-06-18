import { useEffect, useState, type CSSProperties } from 'react'
import { Clipboard } from 'lucide-react'
import { type ParseResult } from '@escpos-to-html/escpos'
import { PrintText } from '../../shared/ui/print-text'
import { Button } from '../../shared/ui/shadcn/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/shadcn/card'

const receiptPreviewPresets = [
  {
    id: 'pc-seller-42',
    label: '42 columns',
    description: 'PC Seller default',
    columns: 42,
  },
  {
    id: 'pc-seller-21',
    label: '21 columns',
    description: 'Double width',
    columns: 21,
  },
] as const

type ReceiptPreviewPresetId = (typeof receiptPreviewPresets)[number]['id']

type ReceiptPreviewProps = {
  result: ParseResult
  html: string
  preferredColumns?: 21 | 42
}

export function ReceiptPreview({ result, html, preferredColumns }: ReceiptPreviewProps) {
  const [presetId, setPresetId] = useState<ReceiptPreviewPresetId>('pc-seller-42')
  const preset = receiptPreviewPresets.find((item) => item.id === presetId) ?? receiptPreviewPresets[0]
  const paperStyle = {
    '--receipt-paper-width': `calc(${preset.columns}ch + 48px)`,
  } as CSSProperties

  useEffect(() => {
    if (!preferredColumns) return
    setPresetId(preferredColumns === 21 ? 'pc-seller-21' : 'pc-seller-42')
  }, [preferredColumns])

  const copyHtml = async () => {
    await navigator.clipboard.writeText(html)
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="py-6">
        <CardDescription>Preview</CardDescription>
        <CardTitle>Thermal receipt</CardTitle>
        <CardAction className="flex items-start gap-2">
          <div className="flex rounded-md border bg-muted p-1" aria-label="Receipt width preset">
            {receiptPreviewPresets.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={item.id === preset.id ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setPresetId(item.id)}
                aria-pressed={item.id === preset.id}
                title={item.description}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={copyHtml} aria-label="Copy HTML">
            <Clipboard size={18} aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 px-0 pb-0">
        <div className="receipt-stage">
          <div className="receipt-paper" style={paperStyle} aria-label="Rendered receipt preview">
            {result.lines.map((line, index) => (
              <div className={`receipt-line align-${line.align}`} key={`${index}-${line.align}`}>
                {line.spans.length === 0
                  ? '\u00a0'
                  : line.spans.map((span, spanIndex) => (
                      <span
                        key={`${index}-${spanIndex}`}
                        className={[
                          span.style.bold ? 'is-bold' : '',
                          span.style.underline ? `underline-${span.style.underline}` : '',
                          span.style.inverted ? 'is-inverted' : '',
                          span.style.font !== 'A' ? `font-${span.style.font.toLowerCase()}` : '',
                        ].join(' ')}
                        style={{
                          fontSize: span.style.height > 1 ? `${span.style.height}em` : undefined,
                          lineHeight: span.style.height > 1 ? 1.05 : undefined,
                        }}
                      >
                        <PrintText text={span.text} widthMultiplier={span.style.width} />
                      </span>
                    ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
