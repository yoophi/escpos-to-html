import { useEffect, useMemo, useRef } from 'react'
import { type ReceiptLine, type TextStyle, isWidePrintChar } from '@escpos-to-html/escpos'

type ReceiptCanvasProps = {
  lines: ReceiptLine[]
  columns?: 21 | 42
  minHeight?: number
}

type CanvasToken = {
  text: string
  startColumns: number
  columns: number
  style: TextStyle
}

type CanvasLine = {
  align: ReceiptLine['align']
  tokens: CanvasToken[]
  columns: number
  heightScale: number
}

const cellWidth = 10
const baseFontSize = 14
const baseLineHeight = 30
const horizontalPadding = 14
const verticalPadding = 18

const styleKey = (style: TextStyle) =>
  [style.bold, style.underline, style.inverted, style.width, style.height, style.font].join(':')

const displayColumns = (text: string) =>
  Array.from(text).reduce((total, char) => total + (isWidePrintChar(char) ? 2 : 1), 0)

function pushToken(tokens: CanvasToken[], text: string, startColumns: number, columns: number, style: TextStyle) {
  if (!text) return
  const previous = tokens[tokens.length - 1]
  if (previous && previous.startColumns + previous.columns === startColumns && styleKey(previous.style) === styleKey(style)) {
    previous.text += text
    previous.columns += columns
    return
  }
  tokens.push({ text, startColumns, columns, style })
}

function buildCanvasLines(lines: ReceiptLine[], columns: number): CanvasLine[] {
  const canvasLines: CanvasLine[] = []

  lines.forEach((line) => {
    let currentTokens: CanvasToken[] = []
    let cursorColumns = 0
    let currentHeightScale = 1

    const flushLine = () => {
      canvasLines.push({
        align: line.align,
        tokens: currentTokens,
        columns: cursorColumns,
        heightScale: currentHeightScale,
      })
      currentTokens = []
      cursorColumns = 0
      currentHeightScale = 1
    }

    line.spans.forEach((span) => {
      const widthScale = Math.max(1, Math.min(3, span.style.width))
      currentHeightScale = Math.max(currentHeightScale, Math.max(1, Math.min(3, span.style.height)))

      Array.from(span.text).forEach((char) => {
        const charColumns = displayColumns(char) * widthScale
        if (cursorColumns > 0 && cursorColumns + charColumns > columns) {
          flushLine()
        }

        if (!/\s/u.test(char)) {
          pushToken(currentTokens, char, cursorColumns, charColumns, span.style)
        }
        cursorColumns += charColumns
      })
    })

    if (line.spans.length === 0 || currentTokens.length > 0 || cursorColumns > 0) {
      flushLine()
    }
  })

  return canvasLines.length > 0 ? canvasLines : [{ align: 'left', tokens: [], columns: 1, heightScale: 1 }]
}

function paperWidth(columns: number) {
  return columns * cellWidth + horizontalPadding * 2
}

function drawReceipt(ctx: CanvasRenderingContext2D, canvasLines: CanvasLine[], columns: number, cssWidth: number, cssHeight: number) {
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  ctx.fillStyle = '#fffdf4'
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  let y = verticalPadding

  canvasLines.forEach((line) => {
    const lineHeight = baseLineHeight * line.heightScale
    const baseline = y + lineHeight * 0.72
    const leadingColumns =
      line.align === 'center'
        ? Math.max(0, (columns - line.columns) / 2)
        : line.align === 'right'
          ? Math.max(0, columns - line.columns)
          : 0

    line.tokens.forEach((token) => {
      const style = token.style
      const tokenX = horizontalPadding + (leadingColumns + token.startColumns) * cellWidth
      const tokenWidth = token.columns * cellWidth
      const tokenHeightScale = Math.max(1, Math.min(3, style.height))
      const fontSize = baseFontSize * tokenHeightScale * (style.font === 'B' ? 0.88 : style.font === 'C' ? 0.78 : 1)
      const fontWeight = style.bold ? '700' : '400'

      ctx.save()
      ctx.font = `${fontWeight} ${fontSize}px "Courier New", ui-monospace, monospace`
      ctx.textBaseline = 'alphabetic'
      const measuredWidth = Math.max(1, ctx.measureText(token.text).width)
      const scaleX = tokenWidth / measuredWidth

      if (style.inverted) {
        ctx.fillStyle = '#151515'
        ctx.fillRect(tokenX - 2, y + 4, tokenWidth + 4, lineHeight - 8)
        ctx.fillStyle = '#fffdf4'
      } else {
        ctx.fillStyle = '#181713'
      }

      ctx.translate(tokenX, baseline)
      ctx.scale(scaleX, 1)
      ctx.fillText(token.text, 0, 0)

      if (style.underline > 0) {
        ctx.scale(1 / scaleX, 1)
        ctx.strokeStyle = style.inverted ? '#fffdf4' : '#181713'
        ctx.lineWidth = style.underline
        ctx.beginPath()
        ctx.moveTo(0, 3)
        ctx.lineTo(tokenWidth, 3)
        ctx.stroke()
      }

      ctx.restore()
    })

    y += lineHeight
  })
}

export function ReceiptCanvas({ lines, columns = 42, minHeight = 480 }: ReceiptCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasLines = useMemo(() => buildCanvasLines(lines, columns), [lines, columns])
  const width = paperWidth(columns)
  const height = Math.max(minHeight, canvasLines.reduce((total, line) => total + baseLineHeight * line.heightScale, verticalPadding * 2 + 40))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    drawReceipt(ctx, canvasLines, columns, width, height)
  }, [canvasLines, columns, height, width])

  return (
    <canvas
      ref={canvasRef}
      className="block flex-none bg-[#fffdf4] shadow-[0_24px_60px_rgba(30,26,18,0.18)]"
      role="img"
      aria-label="Rendered receipt canvas preview"
    />
  )
}
