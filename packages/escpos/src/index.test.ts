import { describe, expect, it } from 'vitest'
import { isWidePrintChar, parseEscpos, parseEscposBytes, parseInput, renderHtml, toHex } from './index'

describe('parseInput', () => {
  it('decodes escaped text and command separator spaces', () => {
    expect(parseInput('\\e a\\x01A\\n\\g V\\x00', 'escaped')).toEqual([
      0x1b,
      0x61,
      0x01,
      0x41,
      0x0a,
      0x1d,
      0x56,
      0x00,
    ])
  })

  it('decodes unicode, control escapes, slash escapes, and trailing slash', () => {
    expect(parseInput('\\uAC00\\t\\b\\0\\\\\\z\\', 'escaped')).toEqual([
      ...Array.from(new TextEncoder().encode('가')),
      0x09,
      0x08,
      0x00,
      0x5c,
      0x5c,
      0x7a,
      0x5c,
    ])
  })

  it('keeps invalid hex and unicode escapes as literal slash sequences', () => {
    expect(parseInput('\\xZZ\\u12X4', 'escaped')).toEqual([
      0x5c,
      0x78,
      0x5a,
      0x5a,
      0x5c,
      0x75,
      0x31,
      0x32,
      0x58,
      0x34,
    ])
  })

  it('extracts hex byte pairs while ignoring separators and odd nibbles', () => {
    expect(parseInput('1B 40-61:01 Z F', 'hex')).toEqual([0x1b, 0x40, 0x61, 0x01])
  })
})

describe('parseEscpos', () => {
  it('parses raw byte arrays without escaped text conversion', () => {
    const bytes = [
      0x1b,
      0x40,
      0x1b,
      0x61,
      0x01,
      ...Array.from(new TextEncoder().encode('동네분식')),
      0x0a,
      0x1d,
      0x56,
      0x00,
    ]
    const result = parseEscposBytes(bytes)

    expect(result.bytes).toEqual(bytes)
    expect(result.lines[0].align).toBe('center')
    expect(result.lines[0].spans[0].text).toBe('동네분식')
    expect(result.events).toEqual([{ type: 'cut', label: 'Cut mode 0', offset: bytes.length - 3 }])
  })

  it('decodes EUC-KR Korean text from raw printer bytes', () => {
    const bytes = [
      0x1b,
      0x40,
      0x1b,
      0x61,
      0x01,
      0xb5,
      0xbf,
      0xb3,
      0xd7,
      0xba,
      0xd0,
      0xbd,
      0xc4,
      0x0a,
      0x1d,
      0x56,
      0x00,
    ]
    const result = parseEscposBytes(bytes, { textEncoding: 'euc-kr' })

    expect(result.lines[0].spans[0].text).toBe('동네분식')
    expect(result.events).toEqual([{ type: 'cut', label: 'Cut mode 0', offset: bytes.length - 3 }])
  })

  it('parses common ESC/POS text styles and line alignment', () => {
    const result = parseEscpos(
      ['\\e@\\e a\\x01\\eE\\x01TITLE\\eE\\x00', '\\e a\\x00\\e-\\x02Under\\e-\\x00', '\\eM\\x01Small\\eM\\x02Tiny\\eM\\x00Base'].join('\n'),
      'escaped',
    )

    expect(result.warnings).toEqual([])
    expect(result.lines).toHaveLength(3)
    expect(result.lines[0].align).toBe('center')
    expect(result.lines[0].spans[0]).toMatchObject({
      text: 'TITLE',
      style: { bold: true, underline: 0, width: 1, height: 1, font: 'A' },
    })
    expect(result.lines[1].align).toBe('left')
    expect(result.lines[1].spans[0]).toMatchObject({
      text: 'Under',
      style: { underline: 2 },
    })
    expect(result.lines[2].spans.map((span) => [span.text, span.style.font])).toEqual([
      ['Small', 'B'],
      ['Tiny', 'C'],
      ['Base', 'A'],
    ])
  })

  it('parses GS style commands, inverse mode, feed, cut, drawer, and beep events', () => {
    const result = parseEscpos('\\e@A\\x07\\g!\\x11Big\\g!\\x00\\gB\\x01Inv\\gB\\x00\\e d\\x02\\e p\\x00\\x19\\xfa\\gV\\x41\\x10', 'escaped')

    expect(result.lines.map((line) => line.spans.map((span) => span.text).join(''))).toEqual(['ABigInv'])
    expect(result.lines[0].spans[1].style).toMatchObject({ width: 2, height: 2 })
    expect(result.lines[0].spans[2].style).toMatchObject({ inverted: true })
    expect(result.events.map((event) => event.type)).toEqual(['beep', 'feed', 'drawer', 'cut'])
    expect(result.events.map((event) => event.label)).toEqual([
      'BEL beep',
      'Feed 2 lines',
      'Cash drawer pulse m=0',
      'Cut with feed 16 dot rows',
    ])
  })

  it('supports ESC ! print mode without leaking its mode byte as text', () => {
    const result = parseEscpos('\\e a\\x01\\e!\\x30현금결제승인\\e!\\x00', 'escaped')

    expect(result.lines[0].align).toBe('center')
    expect(result.lines[0].spans[0]).toMatchObject({
      text: '현금결제승인',
      style: { width: 2, height: 2 },
    })
    expect(result.lines[0].spans.map((span) => span.text).join('')).not.toContain('0')
  })

  it('handles right alignment, line trimming, carriage returns, and cut mode without feed arg', () => {
    const result = parseEscpos('\\e a\\x02Total\\r\\n\\gV\\x00\\n', 'escaped')

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].align).toBe('right')
    expect(result.lines[0].spans[0].text).toBe('Total')
    expect(result.events).toEqual([{ type: 'cut', label: 'Cut mode 0', offset: 10 }])
  })

  it('emits warnings for unsupported commands and ignored control bytes', () => {
    const result = parseEscpos('A\\x01\\eZB\\gZC', 'escaped')

    expect(result.lines[0].spans.map((span) => span.text).join('')).toBe('ABC')
    expect(result.warnings).toEqual([
      '0x0001: 제어 문자 0x01 무시',
      '0x0002: 지원하지 않는 ESC 명령 0x5a',
      '0x0005: 지원하지 않는 GS 명령 0x5a',
    ])
  })

  it('consumes unsupported FS commands without leaking the command byte as text', () => {
    const result = parseEscpos('\\x1cO현금결제승인', 'escaped')

    expect(result.lines[0].spans.map((span) => span.text).join('')).toBe('현금결제승인')
    expect(result.warnings).toEqual(['0x0000: 지원하지 않는 FS 명령 0x4f'])
  })

  it('supports FS character style commands used by East Asian printer modes', () => {
    const result = parseEscpos('\\x1c!\\x0c확대', 'escaped')

    expect(result.lines[0].spans[0]).toMatchObject({
      text: '확대',
      style: { width: 2, height: 2 },
    })
  })

  it('warns and stops on incomplete commands', () => {
    expect(parseEscpos('A\\e', 'escaped').warnings).toEqual(['0x0001: ESC 뒤에 명령 바이트가 없습니다.'])
    expect(parseEscpos('A\\g', 'escaped').warnings).toEqual(['0x0001: GS 뒤에 명령 바이트가 없습니다.'])
    expect(parseEscpos('\\eE', 'escaped').warnings).toEqual(['0x0002: 명령 인자가 부족합니다.'])
    expect(parseEscpos('\\gV\\x41', 'escaped').warnings).toEqual(['0x0000: 컷 명령 인자가 부족합니다.'])
  })

  it('normalizes feed zero to one blank line and merges adjacent same-style spans', () => {
    const result = parseEscpos('A\\e@\\e d\\x00B', 'escaped')

    expect(result.lines.map((line) => line.spans.map((span) => span.text).join(''))).toEqual(['A', 'B'])
    expect(result.events).toEqual([{ type: 'feed', label: 'Feed 1 line', offset: 3 }])
    expect(parseEscpos('AB', 'escaped').lines[0].spans).toEqual([
      {
        text: 'AB',
        style: { bold: false, underline: 0, inverted: false, width: 1, height: 1, font: 'A' },
      },
    ])
  })
})

describe('renderHtml', () => {
  it('renders escaped text, line alignment, and styled spans', () => {
    const html = renderHtml(parseEscpos(['\\e a\\x01A&B <tag> "quote" \'apostrophe\'', '\\eE\\x01Bold\\eE\\x00'].join('\n'), 'escaped'))

    expect(html).toContain('<div class="receipt-line align-center"><span>A&amp;B &lt;tag&gt; &quot;quote&quot; &#039;apostrophe&#039;</span></div>')
    expect(html).toContain('<span style="font-weight: 800">Bold</span>')
  })

  it('can omit plain text span wrappers while preserving styled spans and empty lines', () => {
    const result = parseEscpos(['Plain', '\\eE\\x01Bold\\eE\\x00', ''].join('\n'), 'escaped')
    const html = renderHtml(result, { wrapPlainTextSpans: false })

    expect(html).toContain('<div class="receipt-line align-left">Plain</div>')
    expect(html).toContain('<span style="font-weight: 800">Bold</span>')
    expect(html).not.toContain('<span>Plain</span>')
  })

  it('renders all inline CSS variants for non-default styles', () => {
    const html = renderHtml(parseEscpos('\\e-\\x01U\\e-\\x00\\gB\\x01I\\gB\\x00\\g!\\x21W\\eM\\x01F\\eM\\x02C', 'escaped'))

    expect(html).toContain('text-decoration: underline; text-decoration-thickness: 1px')
    expect(html).toContain('background: #111; color: #fff')
    expect(html).toContain('transform: scaleX(3)')
    expect(html).toContain('font-size: 2em; line-height: 1.05')
    expect(html).toContain('font-size: .88em')
    expect(html).toContain('font-size: .78em')
  })
})

describe('format helpers', () => {
  it('formats bytes as uppercase hex', () => {
    expect(toHex([0x00, 0x0a, 0x1b, 0xff])).toBe('00 0A 1B FF')
  })

  it('detects wide print characters', () => {
    expect(isWidePrintChar('A')).toBe(false)
    expect(isWidePrintChar('가')).toBe(true)
    expect(isWidePrintChar('漢')).toBe(true)
    expect(isWidePrintChar('！')).toBe(true)
    expect(isWidePrintChar('▶')).toBe(true)
    expect(isWidePrintChar('└')).toBe(true)
    expect(isWidePrintChar('─')).toBe(true)
    expect(isWidePrintChar('')).toBe(false)
  })
})
