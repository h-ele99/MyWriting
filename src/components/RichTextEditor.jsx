import { forwardRef, useImperativeHandle, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { uploadChapterImage } from '../lib/db.js'
import { useToast } from './Toast.jsx'

const FONT_SCALE_KEY = 'bloom_editor_font_scale'
const FONT_SCALE_MIN = 0.8
const FONT_SCALE_MAX = 1.5
const FONT_SCALE_STEP = 0.1

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function plainTextToHtml(text) {
  return text
    .split('\n')
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('')
}

function FormatButton({ active, onClick, label, title, style, children }) {
  return (
    <button
      type="button"
      className={'format-btn' + (active ? ' active' : '')}
      style={style}
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children || label}
    </button>
  )
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}

const RichTextEditor = forwardRef(function RichTextEditor(
  { initialContent, onChange, placeholder = 'Once upon a time…' },
  ref,
) {
  const showToast = useToast()
  const [fontScale, setFontScale] = useState(() => {
    const saved = parseFloat(localStorage.getItem(FONT_SCALE_KEY))
    return Number.isFinite(saved) ? saved : 1
  })

  function adjustFont(delta) {
    setFontScale((s) => {
      const next = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, +(s + delta).toFixed(2)))
      localStorage.setItem(FONT_SCALE_KEY, String(next))
      return next
    })
  }

  async function uploadAndInsertImage(file, view, pos) {
    try {
      const url = await uploadChapterImage(file)
      const node = view.state.schema.nodes.image.create({ src: url })
      const tr = view.state.tr.insert(pos ?? view.state.selection.from, node)
      view.dispatch(tr)
    } catch (err) {
      showToast('Image upload failed: ' + err.message)
    }
  }

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
      Image,
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: 'editor-body', spellcheck: 'true' },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        files.forEach((file) => uploadAndInsertImage(file, view))
        return true
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useImperativeHandle(ref, () => ({
    setContent: (html) => editor?.commands.setContent(html, false),
  }))

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editor.getText())
      showToast('Copied chapter text')
    } catch (err) {
      showToast('Could not copy: ' + err.message)
    }
  }

  async function handlePasteClick() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) editor.chain().focus().insertContent(plainTextToHtml(text)).run()
    } catch {
      showToast("Couldn't read clipboard — try Ctrl/Cmd+V instead")
    }
  }

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
        <span className="format-sep" />
        <FormatButton title="Copy chapter text" onClick={handleCopy}>
          <CopyIcon />
        </FormatButton>
        <FormatButton title="Paste text" onClick={handlePasteClick}>
          <PasteIcon />
        </FormatButton>
        <span className="format-sep" />
        <FormatButton title="Smaller text" onClick={() => adjustFont(-FONT_SCALE_STEP)}>
          A−
        </FormatButton>
        <FormatButton title="Larger text" onClick={() => adjustFont(FONT_SCALE_STEP)}>
          A+
        </FormatButton>
      </div>
      <EditorContent editor={editor} style={{ '--editor-font-scale': fontScale }} />
    </>
  )
})

export default RichTextEditor
