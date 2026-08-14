import { useEffect, useMemo, useRef } from 'react'
import qrcode from 'qrcode-generator'
import {
  type BarcodeModules,
  type ReceiptBarcode,
  type ReceiptImage,
  type ReceiptLine,
  type TextStyle,
  encodeBarcodeModules,
  isWidePrintChar,
} from '@escpos-receipt-emulator/escpos'

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

type CanvasToken = {
  text: string
  startColumns: number
  columns: number
  style: TextStyle
}

type CanvasBarcode = {
  info: ReceiptBarcode
  modules: BarcodeModules | null
  qrGrid: boolean[][] | null
  moduleWidthPx: number
  width: number
  barHeight: number
  hriAbove: boolean
  hriBelow: boolean
}

type CanvasImage = {
  info: ReceiptImage
  width: number
  height: number
}

type CanvasLine = {
  align: ReceiptLine['align']
  tokens: CanvasToken[]
  columns: number
  heightScale: number
  heightPx: number
  barcode?: CanvasBarcode
  image?: CanvasImage
}

const cellWidth = 10
const baseFontSize = 14
const baseLineHeight = 30
const horizontalPadding = 14
const verticalPadding = 18
const hriLineHeight = 14
const barcodePaddingY = 8
const defaultPrintableWidthDots = 546 // Epson 80 mm, 42-column mode

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

function buildQrGrid(info: Extract<ReceiptBarcode, { kind: 'qr' }>): boolean[][] | null {
  try {
    const qr = qrcode(0, info.errorCorrection)
    qr.addData(info.data)
    qr.make()
    const count = qr.getModuleCount()
    return Array.from({ length: count }, (_, row) =>
      Array.from({ length: count }, (_, col) => qr.isDark(row, col)),
    )
  } catch {
    return null
  }
}

function buildCanvasBarcode(info: ReceiptBarcode, contentWidth: number): { barcode: CanvasBarcode; heightPx: number } {
  if (info.kind === 'qr') {
    const qrGrid = buildQrGrid(info)
    if (qrGrid) {
      const count = qrGrid.length
      const moduleWidthPx = Math.max(2, Math.min(info.moduleSize, Math.floor(contentWidth / count)))
      const width = count * moduleWidthPx
      return {
        barcode: { info, modules: null, qrGrid, moduleWidthPx, width, barHeight: width, hriAbove: false, hriBelow: false },
        heightPx: width + barcodePaddingY * 2,
      }
    }
    const width = Math.min(contentWidth, 200)
    return {
      barcode: { info, modules: null, qrGrid: null, moduleWidthPx: 1, width, barHeight: 60, hriAbove: false, hriBelow: false },
      heightPx: 60 + barcodePaddingY * 2,
    }
  }

  const modules = encodeBarcodeModules(info.symbology, info.data)
  const barHeight = Math.max(24, Math.min(160, Math.round(info.heightDots * 0.8)))
  const hriAbove = info.hriPosition === 1 || info.hriPosition === 3
  const hriBelow = info.hriPosition === 2 || info.hriPosition === 3

  if (modules) {
    const moduleWidthPx = Math.max(1, Math.min(info.moduleWidth, Math.floor(contentWidth / modules.length)))
    const width = modules.length * moduleWidthPx
    const heightPx = barcodePaddingY * 2 + barHeight + (hriAbove ? hriLineHeight : 0) + (hriBelow ? hriLineHeight : 0)
    return { barcode: { info, modules, qrGrid: null, moduleWidthPx, width, barHeight, hriAbove, hriBelow }, heightPx }
  }

  const width = Math.min(contentWidth, 220)
  return {
    barcode: { info, modules: null, qrGrid: null, moduleWidthPx: 1, width, barHeight, hriAbove: false, hriBelow: false },
    heightPx: barcodePaddingY * 2 + barHeight,
  }
}

function buildCanvasImage(info: ReceiptImage, contentWidth: number, contentWidthDots: number): { image: CanvasImage; heightPx: number } {
  const sourceWidth = info.widthDots * info.scaleX
  const sourceHeight = info.heightDots * info.scaleY
  const fitScale = Math.min(1, contentWidthDots / Math.max(1, sourceWidth))
  const pixelsPerDot = contentWidth / contentWidthDots
  const width = Math.max(1, Math.round(sourceWidth * fitScale * pixelsPerDot))
  const height = Math.max(1, Math.round(sourceHeight * fitScale * pixelsPerDot))
  return { image: { info, width, height }, heightPx: height }
}

function buildCanvasLines(lines: ReceiptLine[], columns: number): CanvasLine[] {
  const canvasLines: CanvasLine[] = []
  const contentWidth = columns * cellWidth
  const contentWidthDots = Math.round((columns / 42) * defaultPrintableWidthDots)

  lines.forEach((line) => {
    if (line.image) {
      const { image, heightPx } = buildCanvasImage(line.image, contentWidth, contentWidthDots)
      canvasLines.push({ align: line.align, tokens: [], columns: 0, heightScale: 1, heightPx, image })
      return
    }

    if (line.barcode) {
      const { barcode, heightPx } = buildCanvasBarcode(line.barcode, contentWidth)
      canvasLines.push({ align: line.align, tokens: [], columns: 0, heightScale: 1, heightPx, barcode })
      return
    }

    let currentTokens: CanvasToken[] = []
    let cursorColumns = 0
    let currentHeightScale = 1

    const flushLine = () => {
      canvasLines.push({
        align: line.align,
        tokens: currentTokens,
        columns: cursorColumns,
        heightScale: currentHeightScale,
        heightPx: baseLineHeight * currentHeightScale,
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

  return canvasLines.length > 0
    ? canvasLines
    : [{ align: 'left', tokens: [], columns: 1, heightScale: 1, heightPx: baseLineHeight }]
}

function paperWidth(columns: number) {
  return columns * cellWidth + horizontalPadding * 2
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImage,
  align: ReceiptLine['align'],
  cssWidth: number,
  y: number,
) {
  const x =
    align === 'center'
      ? (cssWidth - image.width) / 2
      : align === 'right'
        ? cssWidth - horizontalPadding - image.width
        : horizontalPadding
  const top = y
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
        ctx.fillRect(x + runStart * dotWidth, top + row * dotHeight, (col - runStart) * dotWidth, dotHeight)
        runStart = -1
      }
    }
  }
  ctx.restore()
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  barcode: CanvasBarcode,
  align: ReceiptLine['align'],
  cssWidth: number,
  y: number,
  fontFamily: string,
) {
  const x =
    align === 'center'
      ? (cssWidth - barcode.width) / 2
      : align === 'right'
        ? cssWidth - horizontalPadding - barcode.width
        : horizontalPadding
  let top = y + barcodePaddingY

  ctx.save()
  ctx.fillStyle = '#181713'
  ctx.font = `10px ${fontFamily}`
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
      top += hriLineHeight
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
  canvasLines: CanvasLine[],
  columns: number,
  cssWidth: number,
  cssHeight: number,
  fontPreset: ReceiptFontPreset,
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  ctx.fillStyle = '#fffdf4'
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  let y = verticalPadding

  canvasLines.forEach((line) => {
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
      const tokenX = horizontalPadding + (leadingColumns + token.startColumns) * cellWidth
      const tokenWidth = token.columns * cellWidth
      const tokenHeightScale = Math.max(1, Math.min(3, style.height))
      const fontSize = baseFontSize * tokenHeightScale * (style.font === 'B' ? 0.88 : style.font === 'C' ? 0.78 : 1)
      const fontWeight = style.bold ? '700' : '400'

      ctx.save()
      ctx.font = `${fontWeight} ${fontSize}px ${fontPreset.fontFamily}`
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${(fontSize * (fontPreset.letterSpacingEm ?? 0)).toFixed(2)}px`
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
  const canvasLines = useMemo(() => buildCanvasLines(lines, columns), [lines, columns])
  const width = paperWidth(columns)
  const height = Math.max(minHeight, canvasLines.reduce((total, line) => total + line.heightPx, verticalPadding * 2 + 40))

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
    drawReceipt(ctx, canvasLines, columns, width, height, resolveFontPreset(font))
  }, [canvasLines, columns, font, height, width])

  return (
    <canvas
      ref={canvasRef}
      className="block flex-none bg-[#fffdf4] shadow-[0_24px_60px_rgba(30,26,18,0.18)]"
      role="img"
      aria-label="Rendered receipt canvas preview"
    />
  )
}
