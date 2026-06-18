import { Clipboard } from 'lucide-react'
import { type ParseResult } from '@escpos-to-html/escpos'
import { PrintText } from '../../shared/ui/print-text'
import { Button } from '../../shared/ui/shadcn/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/shadcn/card'

type ReceiptPreviewProps = {
  result: ParseResult
  html: string
}

export function ReceiptPreview({ result, html }: ReceiptPreviewProps) {
  const copyHtml = async () => {
    await navigator.clipboard.writeText(html)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription>Preview</CardDescription>
        <CardTitle>Thermal receipt</CardTitle>
        <CardAction>
          <Button type="button" variant="outline" size="icon" onClick={copyHtml} aria-label="Copy HTML">
            <Clipboard size={18} aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="receipt-stage">
        <div className="receipt-paper" aria-label="Rendered receipt preview">
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
