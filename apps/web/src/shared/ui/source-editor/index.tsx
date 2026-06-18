import { isWidePrintChar } from '@escpos-to-html/escpos'
import { Textarea } from '../shadcn/textarea'

type SourceEditorProps = {
  value: string
  onChange: (value: string) => void
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  return (
    <div className="source-editor">
      <div className="source-mirror" aria-hidden="true">
        {value.split('\n').map((line, lineIndex) => (
          <div className="source-line" key={`${lineIndex}-${line}`}>
            {Array.from(line).map((char, charIndex) => (
              <span
                className="source-char"
                key={`${lineIndex}-${charIndex}-${char}`}
                style={{ width: `${isWidePrintChar(char) ? 2 : 1}ch` }}
              >
                {char === ' ' ? '\u00a0' : char}
              </span>
            ))}
            {'\n'}
          </div>
        ))}
      </div>
      <Textarea
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        aria-label="ESC/POS input"
      />
    </div>
  )
}
