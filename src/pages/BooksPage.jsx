import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import { createBook, deleteBook, listBooks, updateBook } from '../lib/db.js'
import { scheduleBackupAfterEdit } from '../lib/backup.js'
import { useToast } from '../components/Toast.jsx'

export default function BooksPage() {
  const [books, setBooks] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const showToast = useToast()

  async function refresh() {
    setBooks(await listBooks())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleCreate(title, description) {
    await createBook({ title, description })
    setShowNew(false)
    showToast('Book created')
    scheduleBackupAfterEdit()
    refresh()
  }

  async function handleUpdate(title, description) {
    await updateBook(editingBook.id, { title, description })
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

  return (
    <>
      <div className="page-header">
        <div className="page-title">Your books</div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New book
        </button>
      </div>

      {books === null && <div className="spinner" />}

      {books && books.length === 0 && (
        <div className="empty-state">
          <div className="big">No books yet</div>
          <p>Start your first book to begin collecting chapters.</p>
        </div>
      )}

      {books && books.length > 0 && (
        <div className="grid">
          {books.map((book) => (
            <div key={book.id} className="book-card">
              <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div className="book-title">{book.title}</div>
                <div className="book-meta">
                  {book.chapterCount} chapter{book.chapterCount === 1 ? '' : 's'}
                </div>
                {book.description && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>{book.description}</p>
                )}
              </Link>
              <div className="pill-row" style={{ marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingBook(book)}>
                  Edit
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
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit(name, description)
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
