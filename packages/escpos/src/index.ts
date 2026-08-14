export { encodeBarcodeModules, encodeCode128, encodeEan13, type BarcodeModules } from './barcode'

export type InputMode = 'escaped' | 'hex'

export type Align = 'left' | 'center' | 'right'

export type ControlEvent = {
  type: 'cut' | 'drawer' | 'beep' | 'feed' | 'barcode' | 'qrcode' | 'unknown'
  label: string
  offset: number
  data?: string
  symbology?: string
}

export type TextStyle = {
  bold: boolean
  underline: 0 | 1 | 2
  inverted: boolean
  width: number
  height: number
  font: 'A' | 'B' | 'C'
}

export type ReceiptSpan = {
  text: string
  style: TextStyle
}

export type ReceiptBarcode =
  | {
      kind: '1d'
      symbology: string
      data: string
      heightDots: number
      moduleWidth: number
      hriPosition: 0 | 1 | 2 | 3
    }
  | {
      kind: 'qr'
      symbology: 'QR Code'
      data: string
      moduleSize: number
      errorCorrection: 'L' | 'M' | 'Q' | 'H'
    }

export type ReceiptLine = {
  align: Align
  spans: ReceiptSpan[]
  barcode?: ReceiptBarcode
}

export type ParseResult = {
  lines: ReceiptLine[]
  events: ControlEvent[]
  warnings: string[]
  bytes: number[]
}

export type HtmlRenderOptions = {
  wrapPlainTextSpans: boolean
}

export type EscposParseOptions = {
  textEncoding?: string
}

const ESC = 0x1b
const FS = 0x1c
const GS = 0x1d
const BEL = 0x07
const LF = 0x0a
const CR = 0x0d

const defaultStyle = (): TextStyle => ({
  bold: false,
  underline: 0,
  inverted: false,
  width: 1,
  height: 1,
  font: 'A',
})

const cloneStyle = (style: TextStyle): TextStyle => ({ ...style })

const sameStyle = (a: TextStyle, b: TextStyle) =>
  a.bold === b.bold &&
  a.underline === b.underline &&
  a.inverted === b.inverted &&
  a.width === b.width &&
  a.height === b.height &&
  a.font === b.font

const isDefaultStyle = (style: TextStyle) => sameStyle(style, defaultStyle())

// GS k 심볼로지: 포맷 A(0-6)와 포맷 B(65-71)는 동일 체계, 72+는 포맷 B 전용
const BARCODE_SYMBOLOGIES: Record<number, string> = {
  0: 'UPC-A',
  1: 'UPC-E',
  2: 'EAN13',
  3: 'EAN8',
  4: 'CODE39',
  5: 'ITF',
  6: 'CODABAR',
  65: 'UPC-A',
  66: 'UPC-E',
  67: 'EAN13',
  68: 'EAN8',
  69: 'CODE39',
  70: 'ITF',
  71: 'CODABAR',
  72: 'CODE93',
  73: 'CODE128',
  74: 'GS1-128',
  75: 'GS1 DataBar Omnidirectional',
  76: 'GS1 DataBar Truncated',
  77: 'GS1 DataBar Limited',
  78: 'GS1 DataBar Expanded',
}

const decodeBarcodeData = (data: number[]) =>
  data.map((byte) => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : `\\x${byte.toString(16).padStart(2, '0')}`)).join('')

export function parseInput(input: string, mode: InputMode): number[] {
  if (mode === 'hex') {
    const pairs = input.match(/[0-9a-fA-F]{2}/g) ?? []
    return pairs.map((pair) => Number.parseInt(pair, 16))
  }

  const bytes: number[] = []

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (char !== '\\') {
      bytes.push(...new TextEncoder().encode(char))
      continue
    }

    const next = input[i + 1]
    if (!next) {
      bytes.push(0x5c)
      continue
    }

    if (next === 'x') {
      const hex = input.slice(i + 2, i + 4)
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        bytes.push(Number.parseInt(hex, 16))
        i += 3
        continue
      }
    }

    if (next === 'u') {
      const hex = input.slice(i + 2, i + 6)
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        bytes.push(...new TextEncoder().encode(String.fromCharCode(Number.parseInt(hex, 16))))
        i += 5
        continue
      }
    }

    const mapped: Record<string, number> = {
      '0': 0x00,
      b: 0x08,
      t: 0x09,
      n: LF,
      r: CR,
      e: ESC,
      E: ESC,
      g: GS,
      G: GS,
      '\\': 0x5c,
    }

    if (next in mapped) {
      bytes.push(mapped[next])
      i += 1
      if (next === 'e' || next === 'E' || next === 'g' || next === 'G') {
        while (input[i + 1] === ' ' || input[i + 1] === '\t') {
          i += 1
        }
      }
      continue
    }

    bytes.push(0x5c)
  }

  return bytes
}

export function parseEscpos(input: string, mode: InputMode): ParseResult {
  const bytes = parseInput(input, mode)
  return parseEscposBytes(bytes)
}

export function parseEscposBytes(bytes: number[], options: EscposParseOptions = {}): ParseResult {
  const decoder = new TextDecoder(options.textEncoding ?? 'utf-8', { fatal: false })
  const lines: ReceiptLine[] = [{ align: 'left', spans: [] }]
  const events: ControlEvent[] = []
  const warnings: string[] = []
  let style = defaultStyle()
  let align: Align = 'left'
  let textBuffer: number[] = []
  const barcodeSettings = { heightDots: 162, moduleWidth: 3, hriPosition: 0 as 0 | 1 | 2 | 3 }
  const qr = { model: '2', moduleSize: 3, errorCorrection: 'L' as 'L' | 'M' | 'Q' | 'H', data: null as string | null }

  const currentLine = () => lines[lines.length - 1]

  const flushText = () => {
    if (textBuffer.length === 0) return
    const text = decoder.decode(new Uint8Array(textBuffer))
    const line = currentLine()
    const last = line.spans[line.spans.length - 1]
    if (last && sameStyle(last.style, style)) {
      last.text += text
    } else {
      line.spans.push({ text, style: cloneStyle(style) })
    }
    textBuffer = []
  }

  const newLine = () => {
    flushText()
    lines.push({ align, spans: [] })
  }

  const emitBarcodeLine = (barcode: ReceiptBarcode) => {
    flushText()
    if (currentLine().spans.length > 0 || currentLine().barcode) {
      lines.push({ align, spans: [] })
    }
    currentLine().barcode = barcode
    lines.push({ align, spans: [] })
  }

  const reset = () => {
    style = defaultStyle()
    align = 'left'
  }

  const warn = (offset: number, label: string) => {
    warnings.push(`0x${offset.toString(16).padStart(4, '0')}: ${label}`)
  }

  const consume = (offset: number, count: number) => {
    if (offset + count > bytes.length) {
      warn(offset, '명령 인자가 부족합니다.')
      return null
    }
    return bytes.slice(offset, offset + count)
  }

  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i]

    if (byte === LF) {
      newLine()
      continue
    }

    if (byte === CR) {
      continue
    }

    if (byte === BEL) {
      flushText()
      events.push({ type: 'beep', label: 'BEL beep', offset: i })
      continue
    }

    if (byte === ESC) {
      const command = bytes[i + 1]
      if (command === undefined) {
        warn(i, 'ESC 뒤에 명령 바이트가 없습니다.')
        break
      }

      flushText()

      if (command === 0x40) {
        reset()
        i += 1
        continue
      }

      if (command === 0x21) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.bold = (args[0] & 0x08) !== 0
        style.underline = (args[0] & 0x80) !== 0 ? 1 : 0
        style.width = (args[0] & 0x20) !== 0 ? 2 : 1
        style.height = (args[0] & 0x10) !== 0 ? 2 : 1
        style.font = (args[0] & 0x01) !== 0 ? 'B' : 'A'
        i += 2
        continue
      }

      if (command === 0x45) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.bold = (args[0] & 0x01) === 1
        i += 2
        continue
      }

      if (command === 0x2d) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.underline = args[0] === 2 ? 2 : args[0] > 0 ? 1 : 0
        i += 2
        continue
      }

      if (command === 0x61) {
        const args = consume(i + 2, 1)
        if (!args) break
        align = args[0] === 1 ? 'center' : args[0] === 2 ? 'right' : 'left'
        currentLine().align = align
        i += 2
        continue
      }

      if (command === 0x4d) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.font = args[0] === 1 ? 'B' : args[0] === 2 ? 'C' : 'A'
        i += 2
        continue
      }

      if (command === 0x64) {
        const args = consume(i + 2, 1)
        if (!args) break
        const count = args[0]
        for (let n = 0; n < count; n += 1) newLine()
        events.push({ type: 'feed', label: `Feed ${count} line${count === 1 ? '' : 's'}`, offset: i })
        i += 2
        continue
      }

      if (command === 0x70) {
        const args = consume(i + 2, 3)
        if (!args) break
        events.push({ type: 'drawer', label: `Cash drawer pulse m=${args[0]}`, offset: i })
        i += 4
        continue
      }

      warn(i, `지원하지 않는 ESC 명령 0x${command.toString(16).padStart(2, '0')}`)
      i += 1
      continue
    }

    if (byte === GS) {
      const command = bytes[i + 1]
      if (command === undefined) {
        warn(i, 'GS 뒤에 명령 바이트가 없습니다.')
        break
      }

      flushText()

      if (command === 0x21) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.width = ((args[0] >> 4) & 0x07) + 1
        style.height = (args[0] & 0x07) + 1
        i += 2
        continue
      }

      if (command === 0x42) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.inverted = args[0] > 0
        i += 2
        continue
      }

      if (command === 0x56) {
        const modeByte = bytes[i + 2]
        const hasFeedArg = modeByte === 0x41 || modeByte === 0x42
        if (modeByte === undefined || (hasFeedArg && bytes[i + 3] === undefined)) {
          warn(i, '컷 명령 인자가 부족합니다.')
          break
        }
        events.push({
          type: 'cut',
          label: hasFeedArg ? `Cut with feed ${bytes[i + 3]} dot rows` : `Cut mode ${modeByte}`,
          offset: i,
        })
        i += hasFeedArg ? 3 : 2
        continue
      }

      if (command === 0x68) {
        const args = consume(i + 2, 1)
        if (!args) break
        if (args[0] >= 1) barcodeSettings.heightDots = args[0]
        i += 2
        continue
      }

      if (command === 0x77) {
        const args = consume(i + 2, 1)
        if (!args) break
        // 스펙 범위(1-6) 밖 값은 프린터처럼 무시하고 이전 설정 유지
        if (args[0] >= 1 && args[0] <= 6) barcodeSettings.moduleWidth = args[0]
        i += 2
        continue
      }

      if (command === 0x48) {
        const args = consume(i + 2, 1)
        if (!args) break
        const position = args[0] >= 48 ? args[0] - 48 : args[0]
        if (position >= 0 && position <= 3) barcodeSettings.hriPosition = position as 0 | 1 | 2 | 3
        i += 2
        continue
      }

      if (command === 0x66) {
        const args = consume(i + 2, 1)
        if (!args) break
        i += 2
        continue
      }

      if (command === 0x6b) {
        const m = bytes[i + 2]
        if (m === undefined) {
          warn(i, '바코드 명령 인자가 부족합니다.')
          break
        }

        if (m <= 6) {
          let end = i + 3
          while (end < bytes.length && bytes[end] !== 0x00) end += 1
          if (end >= bytes.length) {
            warn(i, '바코드 데이터가 NUL로 종료되지 않았습니다.')
            break
          }
          const data = decodeBarcodeData(bytes.slice(i + 3, end))
          const symbology = BARCODE_SYMBOLOGIES[m]
          events.push({ type: 'barcode', label: `${symbology} barcode: ${data}`, offset: i, data, symbology })
          emitBarcodeLine({ kind: '1d', symbology, data, ...barcodeSettings })
          i = end
          continue
        }

        if (m >= 65) {
          const n = bytes[i + 3]
          if (n === undefined) {
            warn(i, '바코드 명령 인자가 부족합니다.')
            break
          }
          const args = consume(i + 4, n)
          if (!args) break
          const data = decodeBarcodeData(args)
          const symbology = BARCODE_SYMBOLOGIES[m] ?? `barcode m=${m}`
          events.push({ type: 'barcode', label: `${symbology} barcode: ${data}`, offset: i, data, symbology })
          emitBarcodeLine({ kind: '1d', symbology, data, ...barcodeSettings })
          i += 3 + n
          continue
        }

        warn(i, `잘못된 바코드 심볼로지 m=${m}`)
        i += 2
        continue
      }

      if (command === 0x28 && bytes[i + 2] === 0x6b) {
        const header = consume(i + 3, 4)
        if (!header) break
        const [pL, pH, cn, fn] = header
        const paramLength = pL + pH * 256 - 2
        if (paramLength < 0) {
          warn(i, '2D 코드 명령 길이가 잘못되었습니다.')
          i += 6
          continue
        }
        const params = consume(i + 7, paramLength)
        if (!params) break

        if (cn === 49) {
          if (fn === 65 && params.length >= 1) {
            qr.model = params[0] === 49 ? '1' : params[0] === 51 ? 'Micro' : '2'
          } else if (fn === 67 && params.length >= 1) {
            qr.moduleSize = params[0]
          } else if (fn === 69 && params.length >= 1) {
            qr.errorCorrection = params[0] === 49 ? 'M' : params[0] === 50 ? 'Q' : params[0] === 51 ? 'H' : 'L'
          } else if (fn === 80) {
            qr.data = decoder.decode(new Uint8Array(params.slice(1)))
          } else if (fn === 81) {
            if (qr.data === null) {
              warn(i, '저장된 QR 데이터가 없습니다.')
            } else {
              events.push({
                type: 'qrcode',
                label: `QR Code (model ${qr.model}, module ${qr.moduleSize}, EC ${qr.errorCorrection}): ${qr.data}`,
                offset: i,
                data: qr.data,
                symbology: 'QR Code',
              })
              emitBarcodeLine({
                kind: 'qr',
                symbology: 'QR Code',
                data: qr.data,
                moduleSize: qr.moduleSize,
                errorCorrection: qr.errorCorrection,
              })
            }
          } else if (fn !== 82) {
            warn(i, `지원하지 않는 QR 함수 fn=${fn}`)
          }
        } else {
          warn(i, `지원하지 않는 2D 코드 종류 cn=${cn}`)
        }

        i += 6 + paramLength
        continue
      }

      warn(i, `지원하지 않는 GS 명령 0x${command.toString(16).padStart(2, '0')}`)
      i += 1
      continue
    }

    if (byte === FS) {
      const command = bytes[i + 1]
      if (command === undefined) {
        warn(i, 'FS 뒤에 명령 바이트가 없습니다.')
        break
      }

      flushText()

      if (command === 0x21) {
        const args = consume(i + 2, 1)
        if (!args) break
        style.underline = (args[0] & 0x80) !== 0 ? 1 : 0
        if ((args[0] & 0x04) !== 0) style.width = 2
        if ((args[0] & 0x08) !== 0) style.height = 2
        i += 2
        continue
      }

      if (command === 0x26 || command === 0x2e) {
        i += 1
        continue
      }

      if (command === 0x43 || command === 0x2d) {
        const args = consume(i + 2, 1)
        if (!args) break
        i += 2
        continue
      }

      warn(i, `지원하지 않는 FS 명령 0x${command.toString(16).padStart(2, '0')}`)
      i += 1
      continue
    }

    if (byte < 0x20 && byte !== 0x09) {
      warn(i, `제어 문자 0x${byte.toString(16).padStart(2, '0')} 무시`)
      continue
    }

    textBuffer.push(byte)
  }

  flushText()

  while (lines.length > 1 && lines[lines.length - 1].spans.length === 0 && !lines[lines.length - 1].barcode) {
    lines.pop()
  }

  return { lines, events, warnings, bytes: [...bytes] }
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const styleToCss = (style: TextStyle) => {
  const css = [
    style.bold ? 'font-weight: 800' : '',
    style.underline ? `text-decoration: underline; text-decoration-thickness: ${style.underline}px` : '',
    style.inverted ? 'background: #111; color: #fff' : '',
    style.width > 1 ? `font-stretch: expanded; transform: scaleX(${style.width}); transform-origin: left center; display: inline-block` : '',
    style.height > 1 ? `font-size: ${style.height}em; line-height: 1.05` : '',
    style.font === 'B' ? 'font-size: .88em' : '',
    style.font === 'C' ? 'font-size: .78em' : '',
  ].filter(Boolean)

  return css.length > 0 ? ` style="${css.join('; ')}"` : ''
}

export function renderHtml(result: ParseResult, options: HtmlRenderOptions = { wrapPlainTextSpans: true }) {
  const lines = result.lines
    .map((line) => {
      if (line.barcode) {
        const { kind, symbology, data } = line.barcode
        return `<div class="receipt-line align-${line.align} receipt-barcode" data-kind="${kind}" data-symbology="${escapeHtml(symbology)}" data-value="${escapeHtml(data)}">[${escapeHtml(symbology)}] ${escapeHtml(data)}</div>`
      }
      const content = line.spans
        .map((span) => {
          const text = escapeHtml(span.text)
          if (!options.wrapPlainTextSpans && isDefaultStyle(span.style)) {
            return text
          }
          return `<span${styleToCss(span.style)}>${text}</span>`
        })
        .join('')
      return `<div class="receipt-line align-${line.align}">${content || '&nbsp;'}</div>`
    })
    .join('\n')

  return `<div class="escpos-receipt">\n${lines}\n</div>`
}

export function toHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

export function isWidePrintChar(char: string) {
  const codePoint = char.codePointAt(0)
  if (codePoint === undefined) return false

  return (
    (codePoint >= 0x1100 && codePoint <= 0x11ff) ||
    (codePoint >= 0x2190 && codePoint <= 0x21ff) ||
    (codePoint >= 0x2500 && codePoint <= 0x257f) ||
    (codePoint >= 0x25a0 && codePoint <= 0x25ff) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  )
}
