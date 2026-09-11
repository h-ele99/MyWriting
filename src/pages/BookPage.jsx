import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import { createChapter, deleteChapter, getBook, listChapters } from '../lib/db.js'
import { exportBookToDocx } from '../lib/docxExport.js'
import { scheduleBackupAfterEdit } from '../lib/backup.js'
import { useToast } from '../components/Toast.jsx'

export default function BookPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [chapters, setChapters] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [activeTag, setActiveTag] = useState(null)
  const [exporting, setExporting] = useState(false)
  const showToast = useToast()

  async function refresh() {
    const [b, c] = await Promise.all([getBook(bookId), listChapters(bookId)])
    setBook(b)
    setChapters(c)
  }

  useEffect(() => {
    refresh()
    setActiveTag(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  const allTags = useMemo(() => {
    if (!chapters) return []
    const set = new Map()
    chapters.forEach((c) => c.tags.forEach((t) => set.set(t.name, t)))
    return [...set.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [chapters])

  const visibleChapters = useMemo(() => {
    if (!chapters) return []
    if (!activeTag) return chapters
    return chapters.filter((c) => c.tags.some((t) => t.name === activeTag))
  }, [chapters, activeTag])

  async function handleCreateChapter(title) {
    const chapter = await createChapter({ bookId, title })
    setShowNew(false)
    scheduleBackupAfterEdit()
    navigate(`/books/${bookId}/chapters/${chapter.id}`)
  }

  async function handleDeleteChapter(chapter) {
    if (!window.confirm(`Delete "${chapter.title}"? This cannot be undone.`)) return
    await deleteChapter(chapter.id)
    showToast('Chapter deleted')
    scheduleBackupAfterEdit()
    refresh()
  }

  async function handleExportBook() {
    setExporting(true)
    try {
      await exportBookToDocx(book, chapters)
      showToast('Book exported to .docx')
    } catch (err) {
      showToast('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  if (!book || !chapters) return <div className="spinner" />

  return (
    <>
      <div className="breadcrumb">
        <Link to="/">Books</Link> / {book.title}
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">{book.title}</div>
          {book.description && <p style={{ color: 'var(--ink-soft)', marginTop: 4 }}>{book.description}</p>}
        </div>
        <div className="pill-row">
          <button className="btn btn-ghost" onClick={handleExportBook} disabled={exporting || chapters.length === 0}>
            {exporting ? 'Exporting…' : 'Export book (.docx)'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New chapter
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="pill-row" style={{ marginBottom: 18 }}>
          <span
            className={'tag-chip' + (!activeTag ? ' active' : '')}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTag(null)}
          >
            All
          </span>
          {allTags.map((t) => (
            <span
              key={t.id}
              className={'tag-chip' + (activeTag === t.name ? ' active' : '')}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTag(t.name)}
            >
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {visibleChapters.length === 0 && (
        <div className="empty-state">
          <div className="big">No chapters {activeTag ? `tagged #${activeTag}` : 'yet'}</div>
          <p>{activeTag ? 'Try another tag.' : 'Add your first chapter to get started.'}</p>
        </div>
      )}

      <div className="chapter-list">
        {visibleChapters.map((chapter) => (
          <Link key={chapter.id} to={`/books/${bookId}/chapters/${chapter.id}`} className="chapter-row">
            <div>
              <div className="chapter-title">{chapter.title}</div>
              {chapter.tags.length > 0 && (
                <div className="chapter-tags">
                  {chapter.tags.map((t) => (
                    <span key={t.id} className="tag-chip">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => {
                e.preventDefault()
                handleDeleteChapter(chapter)
              }}
            >
              Delete
            </button>
          </Link>
        ))}
      </div>

      {showNew && <NewChapterModal onClose={() => setShowNew(false)} onSubmit={handleCreateChapter} />}
    </>
  )
}

function NewChapterModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit(title || 'Untitled chapter')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="New chapter" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Title</label>
          <input
            className="input"
            autoFocus
            placeholder="Chapter One"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create & open'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
