import CodeMirror from '@uiw/react-codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

type SourceEditorProps = {
  value: string
  onChange: (value: string) => void
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  const editorTheme = EditorView.theme({
    '&': {
      minHeight: '464px',
      backgroundColor: '#111111',
      color: '#f4f0df',
      fontSize: '15px',
    },
    '.cm-scroller': {
      minHeight: '464px',
      overflow: 'auto',
    },
    '.cm-content': {
      width: '100%',
      padding: '18px',
      boxSizing: 'border-box',
      lineHeight: '1.55',
      tabSize: '2',
      fontFamily:
        'var(--font-code, "Nanum Gothic Coding", "D2Coding", "Noto Sans Mono CJK KR", ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace)',
    },
    '.cm-gutters': {
      backgroundColor: '#111111',
      color: '#8d97a5',
      border: '0',
      fontFamily:
        'var(--font-code, "Nanum Gothic Coding", "D2Coding", "Noto Sans Mono CJK KR", ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace)',
    },
    '.cm-line': {
      fontFamily:
        'var(--font-code, "Nanum Gothic Coding", "D2Coding", "Noto Sans Mono CJK KR", ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace)',
    },
  })

  return (
    <CodeMirror
      value={value}
      height="464px"
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      extensions={[EditorState.tabSize.of(2), EditorView.lineWrapping, editorTheme]}
      onChange={onChange}
      aria-label="ESC/POS input"
      className="bg-[#111111]"
      theme="dark"
    />
  )
}
