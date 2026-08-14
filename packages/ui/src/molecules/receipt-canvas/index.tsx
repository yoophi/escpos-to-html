import { useEffect, useMemo, useRef } from 'react'
import type { ReceiptLine } from '@escpos-receipt-emulator/escpos'
import {
  type ReceiptLayoutBarcode,
  type ReceiptLayoutImage,
  type ReceiptLayoutLine,
  layoutReceipt,
  receiptLayoutMetrics,
} from './receipt-layout'

export type ReceiptFontId = 'd2coding' | 'default'

export type ReceiptFontPreset = {
  value: ReceiptFontId
  label: string
  description: string
  fontFamily: string
  letterSpacingEm?: number
  verticalScale?: number
}

export const receiptFontPresets = [
  {
    value: 'd2coding',
    label: 'D2Coding',
    description: 'Korean monospace',
    fontFamily:
      '"D2Coding", "D2Coding ligature", "D2KodingLigature Nerd Font", "D2CodingLigature Nerd Font", "D2 Coding", "Nanum Gothic Coding", "Noto Sans Mono CJK KR", ui-monospace, monospace',
    letterSpacingEm: -0.05,
    verticalScale: 1.2,
  },
  {
    value: 'default',
    label: '기본',
    description: 'Courier New',
    fontFamily: '"Courier New", ui-monospace, monospace',
  },
] as const satisfies readonly ReceiptFontPreset[]

const resolveFontPreset = (font: ReceiptFontId): ReceiptFontPreset =>
  receiptFontPresets.find((preset) => preset.value === font) ?? receiptFontPresets[0]

type ReceiptCanvasProps = {
  lines: ReceiptLine[]
  columns?: 21 | 42
  minHeight?: number
  font?: ReceiptFontId
}

function xForAlignedContent(align: ReceiptLine['align'], width: number, cssWidth: number) {
  if (align === 'center') return (cssWidth - width) / 2
  if (align === 'right') return cssWidth - receiptLayoutMetrics.horizontalPadding - width
  return receiptLayoutMetrics.horizontalPadding
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  image: ReceiptLayoutImage,
  align: ReceiptLine['align'],
  cssWidth: number,
  y: number,
) {
  const x = xForAlignedContent(align, image.width, cssWidth)
  const rowBytes = Math.ceil(image.info.widthDots / 8)
  const dotWidth = image.width / image.info.widthDots
  const dotHeight = image.height / image.info.heightDots

  ctx.save()
  ctx.fillStyle = '#181713'
  for (let row = 0; row < image.info.heightDots; row += 1) {
    let runStart = -1
    for (let col = 0; col <= image.info.widthDots; col += 1) {
      const isDark =
        col < image.info.widthDots &&
        (image.info.data[row * rowBytes + Math.floor(col / 8)] & (0x80 >> (col % 8))) !== 0

      if (isDark && runStart < 0) runStart = col
      if (!isDark && runStart >= 0) {
        ctx.fillRect(x + runStart * dotWidth, y + row * dotHeight, (col - runStart) * dotWidth, dotHeight)
        runStart = -1
      }
    }
  }
  ctx.restore()
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  barcode: ReceiptLayoutBarcode,
  align: ReceiptLine['align'],
  cssWidth: number,
  y: number,
  fontFamily: string,
) {
  const x = xForAlignedContent(align, barcode.width, cssWidth)
  let top = y + receiptLayoutMetrics.barcodePaddingY

  ctx.save()
  ctx.fillStyle = '#181713'
  ctx.font = '10px ' + fontFamily
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  if (barcode.qrGrid) {
    const size = barcode.moduleWidthPx
    barcode.qrGrid.forEach((row, rowIndex) => {
      row.forEach((dark, colIndex) => {
        if (dark) ctx.fillRect(x + colIndex * size, top + rowIndex * size, size, size)
      })
    })
    ctx.restore()
    return
  }

  if (barcode.modules) {
    if (barcode.hriAbove) {
      ctx.fillText(barcode.info.data, x + barcode.width / 2, top + 10)
      top += receiptLayoutMetrics.hriLineHeight
    }
    barcode.modules.forEach((bit, index) => {
      if (bit) ctx.fillRect(x + index * barcode.moduleWidthPx, top, barcode.moduleWidthPx, barcode.barHeight)
    })
    if (barcode.hriBelow) {
      ctx.fillText(barcode.info.data, x + barcode.width / 2, top + barcode.barHeight + 11)
    }
    ctx.restore()
    return
  }

  ctx.strokeStyle = '#181713'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, top + 0.5, barcode.width - 1, barcode.barHeight - 1)
  ctx.fillText(barcode.info.symbology, x + barcode.width / 2, top + barcode.barHeight / 2 - 2)
  ctx.fillText(barcode.info.data.slice(0, 28), x + barcode.width / 2, top + barcode.barHeight / 2 + 10)
  ctx.restore()
}

function drawReceipt(
  ctx: CanvasRenderingContext2D,
  layoutLines: ReceiptLayoutLine[],
  columns: number,
  cssWidth: number,
  cssHeight: number,
  fontPreset: ReceiptFontPreset,
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  ctx.fillStyle = '#fffdf4'
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  let y = receiptLayoutMetrics.verticalPadding
  layoutLines.forEach((line) => {
    const lineHeight = line.heightPx

    if (line.image) {
      drawImage(ctx, line.image, line.align, cssWidth, y)
      y += lineHeight
      return
    }

    if (line.barcode) {
      drawBarcode(ctx, line.barcode, line.align, cssWidth, y, fontPreset.fontFamily)
      y += lineHeight
      return
    }

    const baseline = y + lineHeight * 0.72
    const leadingColumns =
      line.align === 'center'
        ? Math.max(0, (columns - line.columns) / 2)
        : line.align === 'right'
          ? Math.max(0, columns - line.columns)
          : 0

    line.tokens.forEach((token) => {
      const style = token.style
      const tokenX =
        receiptLayoutMetrics.horizontalPadding +
        (leadingColumns + token.startColumns) * receiptLayoutMetrics.cellWidth
      const tokenWidth = token.columns * receiptLayoutMetrics.cellWidth
      const tokenHeightScale = Math.max(1, Math.min(3, style.height))
      const fontSize =
        receiptLayoutMetrics.baseFontSize *
        tokenHeightScale *
        (style.font === 'B' ? 0.88 : style.font === 'C' ? 0.78 : 1)
      const fontWeight = style.bold ? '700' : '400'

      ctx.save()
      ctx.font = fontWeight + ' ' + fontSize + 'px ' + fontPreset.fontFamily
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = (fontSize * (fontPreset.letterSpacingEm ?? 0)).toFixed(2) + 'px'
      }
      ctx.textBaseline = 'alphabetic'
      const measuredWidth = Math.max(1, ctx.measureText(token.text).width)
      const scaleX = tokenWidth / measuredWidth
      const scaleY = fontPreset.verticalScale ?? 1

      if (style.inverted) {
        ctx.fillStyle = '#151515'
        ctx.fillRect(tokenX - 2, y + 4, tokenWidth + 4, lineHeight - 8)
        ctx.fillStyle = '#fffdf4'
      } else {
        ctx.fillStyle = '#181713'
      }

      ctx.translate(tokenX, baseline)
      ctx.scale(scaleX, scaleY)
      ctx.fillText(token.text, 0, 0)

      if (style.underline > 0) {
        ctx.scale(1 / scaleX, 1 / scaleY)
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

export function ReceiptCanvas({ lines, columns = 42, minHeight = 480, font = 'd2coding' }: ReceiptCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const layout = useMemo(() => layoutReceipt(lines, columns), [lines, columns])
  const width = layout.width
  const height = Math.max(minHeight, layout.height)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    canvas.style.width = String(width) + 'px'
    canvas.style.height = String(height) + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    drawReceipt(ctx, layout.lines, columns, width, height, resolveFontPreset(font))
  }, [columns, font, height, layout.lines, width])

  return (
    <canvas
      ref={canvasRef}
      className="block flex-none bg-[#fffdf4] shadow-[0_24px_60px_rgba(30,26,18,0.18)]"
      role="img"
      aria-label="Rendered receipt canvas preview"
    />
  )
}
