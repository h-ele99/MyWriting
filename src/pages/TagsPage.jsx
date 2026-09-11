import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listChaptersByTag, listTags } from '../lib/db.js'

export default function TagsPage() {
  const [tags, setTags] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [chapters, setChapters] = useState(null)

  useEffect(() => {
    listTags().then(setTags)
  }, [])

  useEffect(() => {
    if (!activeTag) {
      setChapters(null)
      return
    }
    setChapters(null)
    listChaptersByTag(activeTag).then(setChapters)
  }, [activeTag])

  return (
    <>
      <div className="page-header">
        <div className="page-title">Browse by tag</div>
      </div>

      {tags === null && <div className="spinner" />}

      {tags && tags.length === 0 && (
        <div className="empty-state">
          <div className="big">No tags yet</div>
          <p>Add hashtags to your chapters and they'll show up here.</p>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="pill-row" style={{ marginBottom: 24 }}>
          {tags.map((t) => (
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

      {activeTag && chapters === null && <div className="spinner" />}

      {activeTag && chapters && (
        <div className="chapter-list">
          {chapters.length === 0 && (
            <div className="empty-state">
              <p>No chapters tagged #{activeTag}</p>
            </div>
          )}
          {chapters.map((chapter) => (
            <Link key={chapter.id} to={`/books/${chapter.book_id}/chapters/${chapter.id}`} className="chapter-row">
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
      )}
    </>
  )
}
