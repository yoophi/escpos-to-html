import { describe, expect, it } from 'vitest'
import type { ReceiptLine, TextStyle } from '@escpos-receipt-emulator/escpos'
import { layoutReceipt, receiptLayoutMetrics } from './receipt-layout'

const plainStyle: TextStyle = {
  bold: false,
  underline: 0,
  inverted: false,
  width: 1,
  height: 1,
  font: 'A',
}

const textLine = (text: string): ReceiptLine => ({
  align: 'left',
  spans: [{ text, style: plainStyle }],
})

describe('layoutReceipt', () => {
  it('wraps wide Korean characters by their printed column width', () => {
    const layout = layoutReceipt([textLine('가나다라마바사아자차카')], 21)

    expect(layout.lines).toHaveLength(2)
    expect(layout.lines.map((line) => line.columns)).toEqual([20, 2])
    expect(layout.lines.map((line) => line.tokens.map((token) => token.text).join(''))).toEqual([
      '가나다라마바사아자차',
      '카',
    ])
  })

  it('scales a wide image down to the printable receipt width', () => {
    const layout = layoutReceipt(
      [
        {
          align: 'center',
          spans: [],
          image: {
            format: 'gs-v-0',
            widthDots: 1092,
            heightDots: 20,
            data: Array.from({ length: Math.ceil(1092 / 8) * 20 }, () => 0),
            scaleX: 1,
            scaleY: 1,
          },
        },
      ],
      42,
    )

    expect(layout.lines[0].image).toMatchObject({
      width: 420,
      height: 8,
    })
  })

  it('keeps a QR code within the printable receipt width', () => {
    const layout = layoutReceipt(
      [
        {
          align: 'center',
          spans: [],
          barcode: {
            kind: 'qr',
            symbology: 'QR Code',
            data: 'https://example.com/order/42',
            moduleSize: 8,
            errorCorrection: 'M',
          },
        },
      ],
      42,
    )

    const barcode = layout.lines[0].barcode
    expect(barcode?.qrGrid).not.toBeNull()
    expect(barcode?.width).toBeLessThanOrEqual(42 * receiptLayoutMetrics.cellWidth)
    expect(barcode?.barHeight).toBe(barcode?.width)
  })

  it('provides an empty printable line for an empty receipt', () => {
    const layout = layoutReceipt([], 42)

    expect(layout.lines).toHaveLength(1)
    expect(layout.lines[0].heightPx).toBe(receiptLayoutMetrics.baseLineHeight)
    expect(layout.height).toBe(receiptLayoutMetrics.verticalPadding * 2 + 40 + receiptLayoutMetrics.baseLineHeight)
  })
})
