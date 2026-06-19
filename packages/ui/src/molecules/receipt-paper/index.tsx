import { type CSSProperties } from 'react'
import { type ReceiptLine } from '@escpos-to-html/escpos'
import { cn } from '../../lib/utils'
import { PrintText } from '../../print-text'

type ReceiptPaperProps = {
  lines: ReceiptLine[]
  columns?: 21 | 42
}

export function ReceiptPaper({ lines, columns = 42 }: ReceiptPaperProps) {
  const paperStyle = {
    width: `calc(${columns}ch + 48px)`,
  } as CSSProperties

  return (
    <div
      className="box-border min-h-[480px] max-w-none flex-none whitespace-pre-wrap bg-[#fffdf4] bg-[linear-gradient(135deg,rgba(0,0,0,0.035),transparent_18%)] px-6 pb-10 pt-7 font-mono text-sm leading-[1.35] text-[#181713] shadow-[0_24px_60px_rgba(30,26,18,0.18)] after:mt-[34px] after:block after:h-3.5 after:bg-[#fffdf4] after:bg-[linear-gradient(135deg,transparent_75%,#d8d2c3_75%),linear-gradient(225deg,transparent_75%,#d8d2c3_75%)] after:bg-[length:18px_18px,18px_18px] after:content-[''] after:[margin-left:-24px] after:[margin-right:-24px] after:[margin-bottom:-40px]"
      style={paperStyle}
      aria-label="Rendered receipt preview"
    >
      {lines.map((line, index) => (
        <div className="min-h-[18px]" key={`${index}-${line.align}`} style={{ textAlign: line.align }}>
          {line.spans.length === 0
            ? '\u00a0'
            : line.spans.map((span, spanIndex) => (
                <span
                  key={`${index}-${spanIndex}`}
                  className={cn(
                    span.style.bold && 'font-black',
                    span.style.underline === 1 && 'underline',
                    span.style.underline === 2 && 'underline decoration-2',
                    span.style.inverted && 'bg-[#151515] px-[3px] py-px text-[#fffdf4]',
                    span.style.font === 'B' && 'text-[0.88em]',
                    span.style.font === 'C' && 'text-[0.78em]',
                  )}
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
  )
}
