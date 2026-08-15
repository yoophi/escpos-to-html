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

export type ReceiptLayoutToken = {
  text: string
  startColumns: number
  columns: number
  style: TextStyle
}

export type ReceiptLayoutBarcode = {
  info: ReceiptBarcode
  modules: BarcodeModules | null
  qrGrid: boolean[][] | null
  moduleWidthPx: number
  width: number
  barHeight: number
  hriAbove: boolean
  hriBelow: boolean
}

export type ReceiptLayoutImage = {
  info: ReceiptImage
  width: number
  height: number
}

export type ReceiptLayoutLine = {
  align: ReceiptLine['align']
  tokens: ReceiptLayoutToken[]
  columns: number
  heightScale: number
  heightPx: number
  barcode?: ReceiptLayoutBarcode
  image?: ReceiptLayoutImage
}

export type ReceiptLayout = {
  width: number
  lines: ReceiptLayoutLine[]
  height: number
}

export const receiptLayoutMetrics = {
  cellWidth: 10,
  baseFontSize: 14,
  baseLineHeight: 30,
  horizontalPadding: 14,
  verticalPadding: 18,
  hriLineHeight: 14,
  barcodePaddingY: 8,
  printableWidthDotsAt42Columns: 546,
} as const

const styleKey = (style: TextStyle) =>
  [style.bold, style.underline, style.inverted, style.width, style.height, style.font].join(':')

const displayColumns = (text: string) =>
  Array.from(text).reduce((total, char) => total + (isWidePrintChar(char) ? 2 : 1), 0)

function pushToken(
  tokens: ReceiptLayoutToken[],
  text: string,
  startColumns: number,
  columns: number,
  style: TextStyle,
) {
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

function buildBarcode(info: ReceiptBarcode, contentWidth: number): { barcode: ReceiptLayoutBarcode; heightPx: number } {
  if (info.kind === 'qr') {
    const qrGrid = buildQrGrid(info)
    if (qrGrid) {
      const count = qrGrid.length
      const moduleWidthPx = Math.max(2, Math.min(info.moduleSize, Math.floor(contentWidth / count)))
      const width = count * moduleWidthPx
      return {
        barcode: { info, modules: null, qrGrid, moduleWidthPx, width, barHeight: width, hriAbove: false, hriBelow: false },
        heightPx: width + receiptLayoutMetrics.barcodePaddingY * 2,
      }
    }
    const width = Math.min(contentWidth, 200)
    return {
      barcode: { info, modules: null, qrGrid: null, moduleWidthPx: 1, width, barHeight: 60, hriAbove: false, hriBelow: false },
      heightPx: 60 + receiptLayoutMetrics.barcodePaddingY * 2,
    }
  }

  const modules = encodeBarcodeModules(info.symbology, info.data)
  const barHeight = Math.max(24, Math.min(160, Math.round(info.heightDots * 0.8)))
  const hriAbove = info.hriPosition === 1 || info.hriPosition === 3
  const hriBelow = info.hriPosition === 2 || info.hriPosition === 3

  if (modules) {
    const moduleWidthPx = Math.max(1, Math.min(info.moduleWidth, Math.floor(contentWidth / modules.length)))
    const width = modules.length * moduleWidthPx
    const heightPx =
      receiptLayoutMetrics.barcodePaddingY * 2 +
      barHeight +
      (hriAbove ? receiptLayoutMetrics.hriLineHeight : 0) +
      (hriBelow ? receiptLayoutMetrics.hriLineHeight : 0)
    return { barcode: { info, modules, qrGrid: null, moduleWidthPx, width, barHeight, hriAbove, hriBelow }, heightPx }
  }

  const width = Math.min(contentWidth, 220)
  return {
    barcode: { info, modules: null, qrGrid: null, moduleWidthPx: 1, width, barHeight, hriAbove: false, hriBelow: false },
    heightPx: receiptLayoutMetrics.barcodePaddingY * 2 + barHeight,
  }
}

function buildImage(
  info: ReceiptImage,
  contentWidth: number,
  contentWidthDots: number,
): { image: ReceiptLayoutImage; heightPx: number } {
  const sourceWidth = info.widthDots * info.scaleX
  const sourceHeight = info.heightDots * info.scaleY
  const fitScale = Math.min(1, contentWidthDots / Math.max(1, sourceWidth))
  const pixelsPerDot = contentWidth / contentWidthDots
  const width = Math.max(1, Math.round(sourceWidth * fitScale * pixelsPerDot))
  const height = Math.max(1, Math.round(sourceHeight * fitScale * pixelsPerDot))
  return { image: { info, width, height }, heightPx: height }
}

export function layoutReceipt(lines: ReceiptLine[], columns: 21 | 42): ReceiptLayout {
  const contentWidth = columns * receiptLayoutMetrics.cellWidth
  const contentWidthDots = Math.round((columns / 42) * receiptLayoutMetrics.printableWidthDotsAt42Columns)
  const layoutLines: ReceiptLayoutLine[] = []

  lines.forEach((line) => {
    if (line.image) {
      const { image, heightPx } = buildImage(line.image, contentWidth, contentWidthDots)
      layoutLines.push({ align: line.align, tokens: [], columns: 0, heightScale: 1, heightPx, image })
      return
    }

    if (line.barcode) {
      const { barcode, heightPx } = buildBarcode(line.barcode, contentWidth)
      layoutLines.push({ align: line.align, tokens: [], columns: 0, heightScale: 1, heightPx, barcode })
      return
    }

    let currentTokens: ReceiptLayoutToken[] = []
    let cursorColumns = 0
    let currentHeightScale = 1

    const flushLine = () => {
      layoutLines.push({
        align: line.align,
        tokens: currentTokens,
        columns: cursorColumns,
        heightScale: currentHeightScale,
        heightPx: receiptLayoutMetrics.baseLineHeight * currentHeightScale,
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

  const normalizedLines: ReceiptLayoutLine[] =
    layoutLines.length > 0
      ? layoutLines
      : [{ align: 'left', tokens: [], columns: 1, heightScale: 1, heightPx: receiptLayoutMetrics.baseLineHeight }]

  return {
    width: contentWidth + receiptLayoutMetrics.horizontalPadding * 2,
    lines: normalizedLines,
    height: normalizedLines.reduce(
      (total, line) => total + line.heightPx,
      receiptLayoutMetrics.verticalPadding * 2 + 40,
    ),
  }
}
