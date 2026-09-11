import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBooksByTag, listChaptersByTag, listTags } from '../lib/db.js'

export default function TagsPage() {
  const [tags, setTags] = useState(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [books, setBooks] = useState(null)
  const [chapters, setChapters] = useState(null)

  useEffect(() => {
    listTags().then(setTags)
  }, [])

  useEffect(() => {
    if (!activeTag) {
      setBooks(null)
      setChapters(null)
      return
    }
    setBooks(null)
    setChapters(null)
    Promise.all([listBooksByTag(activeTag), listChaptersByTag(activeTag)]).then(([b, c]) => {
      setBooks(b)
      setChapters(c)
    })
  }, [activeTag])

  const visibleTags = useMemo(() => {
    if (!tags) return []
    const q = query.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((t) => t.name.includes(q))
  }, [tags, query])

  const loadingResults = activeTag && (books === null || chapters === null)

  return (
    <>
      <div className="page-header">
        <div className="page-title">Browse by tag</div>
      </div>

      {tags === null && <div className="spinner" />}

      {tags && tags.length === 0 && (
        <div className="empty-state">
          <div className="big">No tags yet</div>
          <p>Add hashtags to your books or chapters and they'll show up here.</p>
        </div>
      )}

      {tags && tags.length > 0 && (
        <>
          <div className="field" style={{ maxWidth: 320 }}>
            <input
              className="input"
              placeholder="Search tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="pill-row" style={{ marginBottom: 24 }}>
            {visibleTags.length === 0 && (
              <p style={{ color: 'var(--ink-faint)', fontSize: 13.5 }}>No tags match "{query}"</p>
            )}
            {visibleTags.map((t) => (
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
        </>
      )}

      {loadingResults && <div className="spinner" />}

      {activeTag && !loadingResults && (
        <>
          {books.length === 0 && chapters.length === 0 && (
            <div className="empty-state">
              <p>Nothing tagged #{activeTag}</p>
            </div>
          )}

          {books.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 17, marginBottom: 10 }}>
                Books ({books.length})
              </h3>
              <div className="grid">
                {books.map((book) => (
                  <Link key={book.id} to={`/books/${book.id}`} className="book-card">
                    <div className="book-title">{book.title}</div>
                    <div className="chapter-tags">
                      {book.tags.map((t) => (
                        <span key={t.id} className="tag-chip">
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {chapters.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 17, marginBottom: 10 }}>
                Chapters ({chapters.length})
              </h3>
              <div className="chapter-list">
                {chapters.map((chapter) => (
                  <Link
                    key={chapter.id}
                    to={`/books/${chapter.book_id}/chapters/${chapter.id}`}
                    className="chapter-row"
                  >
                    <div>
                      <div className="chapter-title">{chapter.title}</div>
                      <div className="book-meta">from {chapter.book?.title}</div>
                      <div className="chapter-tags">
                        {chapter.tags.map((t) => (
                          <span key={t.id} className="tag-chip">
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
