import { isWidePrintChar } from '@escpos-to-html/escpos'

type PrintTextProps = {
  text: string
  widthMultiplier: number
}

export function PrintText({ text, widthMultiplier }: PrintTextProps) {
  return Array.from(text).map((char, index) => (
    <span
      className="receipt-char"
      key={`${char}-${index}`}
      style={{ width: `${(isWidePrintChar(char) ? 2 : 1) * widthMultiplier}ch` }}
    >
      {char === ' ' ? '\u00a0' : char}
    </span>
  ))
}
