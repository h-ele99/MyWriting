import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

function FormatButton({ active, onClick, label, style }) {
  return (
    <button
      type="button"
      className={'format-btn' + (active ? ' active' : '')}
      style={style}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

const RichTextEditor = forwardRef(function RichTextEditor(
  { initialContent, onChange, placeholder = 'Once upon a time…' },
  ref,
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        heading: { levels: [2] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: { attributes: { class: 'editor-body', spellcheck: 'true' } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useImperativeHandle(ref, () => ({
    setContent: (html) => editor?.commands.setContent(html, false),
  }))

  if (!editor) return null

  return (
    <>
      <div className="editor-format-toolbar">
        <FormatButton
          label="B"
          style={{ fontWeight: 700 }}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <FormatButton
          label="I"
          style={{ fontStyle: 'italic' }}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <FormatButton
          label="U"
          style={{ textDecoration: 'underline' }}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <span className="format-sep" />
        <FormatButton
          label="•"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <FormatButton
          label="1."
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <span className="format-sep" />
        <FormatButton
          label="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
      </div>
      <EditorContent editor={editor} />
    </>
  )
})

export default RichTextEditor
