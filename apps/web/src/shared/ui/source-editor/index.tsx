import CodeMirror from '@uiw/react-codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

type SourceEditorProps = {
  value: string
  onChange: (value: string) => void
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="464px"
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      extensions={[EditorState.tabSize.of(2), EditorView.lineWrapping]}
      onChange={onChange}
      aria-label="ESC/POS input"
      className="source-editor"
      theme="dark"
    />
  )
}
