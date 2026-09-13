import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import TagEditor from '../components/TagEditor.jsx'
import { createBook, deleteBook, listBooks, listChapters, setBookTags, updateBook } from '../lib/db.js'
import { exportBookToDocx } from '../lib/docxExport.js'
import { scheduleBackupAfterEdit } from '../lib/backup.js'
import { useToast } from '../components/Toast.jsx'

export default function BooksPage() {
  const [books, setBooks] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [exportingId, setExportingId] = useState(null)
  const showToast = useToast()

  async function refresh() {
    try {
      setLoadError(null)
      setBooks(await listBooks())
    } catch (err) {
      setLoadError(err.message || String(err))
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const allTags = useMemo(() => {
    if (!books) return []
    const set = new Map()
    books.forEach((b) => b.tags.forEach((t) => set.set(t.name, t)))
    return [...set.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [books])

  const visibleBooks = useMemo(() => {
    if (!books) return []
    if (!activeTag) return books
    return books.filter((b) => b.tags.some((t) => t.name === activeTag))
  }, [books, activeTag])

  async function handleCreate(title, description, tags) {
    const book = await createBook({ title, description })
    await setBookTags(book.id, tags)
    setShowNew(false)
    showToast('Book created')
    scheduleBackupAfterEdit()
    refresh()
  }

  async function handleUpdate(title, description, tags) {
    await updateBook(editingBook.id, { title, description })
    await setBookTags(editingBook.id, tags)
    setEditingBook(null)
    showToast('Book updated')
    scheduleBackupAfterEdit()
    refresh()
  }

  async function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}" and all its chapters? This cannot be undone.`)) return
    await deleteBook(book.id)
    showToast('Book deleted')
    scheduleBackupAfterEdit()
    refresh()
  }

  async function handleExport(book) {
    setExportingId(book.id)
    try {
      const chapters = await listChapters(book.id)
      await exportBookToDocx(book, chapters)
      showToast('Book exported to .docx')
    } catch (err) {
      showToast('Export failed: ' + err.message)
    } finally {
      setExportingId(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Your books</div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New book
        </button>
      </div>

      {books === null && !loadError && <div className="spinner" />}

      {loadError && (
        <div className="empty-state">
          <div className="big">Couldn't load your books</div>
          <p style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{loadError}</p>
          <button className="btn btn-ghost" onClick={refresh} style={{ marginTop: 10 }}>
            Try again
          </button>
        </div>
      )}

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

      {books && books.length === 0 && (
        <div className="empty-state">
          <div className="big">No books yet</div>
          <p>Start your first book to begin collecting chapters.</p>
        </div>
      )}

      {books && books.length > 0 && visibleBooks.length === 0 && (
        <div className="empty-state">
          <div className="big">No books tagged #{activeTag}</div>
          <p>Try another tag.</p>
        </div>
      )}

      {visibleBooks.length > 0 && (
        <div className="grid">
          {visibleBooks.map((book) => (
            <div key={book.id} className="book-card">
              <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div className="book-title">{book.title}</div>
                <div className="book-meta">
                  {book.chapterCount} chapter{book.chapterCount === 1 ? '' : 's'}
                </div>
                {book.description && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>{book.description}</p>
                )}
                {book.tags.length > 0 && (
                  <div className="chapter-tags" style={{ marginTop: 6 }}>
                    {book.tags.map((t) => (
                      <span key={t.id} className="tag-chip">
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
              <div className="pill-row" style={{ marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingBook(book)}>
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExport(book)}
                  disabled={exportingId === book.id || book.chapterCount === 0}
                >
                  {exportingId === book.id ? 'Exporting…' : 'Export .docx'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(book)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <BookFormModal title="New book" onClose={() => setShowNew(false)} onSubmit={handleCreate} />
      )}
      {editingBook && (
        <BookFormModal
          title="Edit book"
          initial={editingBook}
          onClose={() => setEditingBook(null)}
          onSubmit={handleUpdate}
        />
      )}
    </>
  )
}

function BookFormModal({ title, initial, onClose, onSubmit }) {
  const [name, setName] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [tags, setTags] = useState(initial?.tags?.map((t) => t.name) || [])
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit(name, description, tags)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Title</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Tags</label>
          <TagEditor tags={tags} onChange={setTags} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
