import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBook, listChapters } from '../lib/db.js'

export default function ReadPage() {
  const { bookId, chapterId } = useParams()
  const [book, setBook] = useState(null)
  const [chapters, setChapters] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(chapterId || null)
  const chapterRefs = useRef({})
  const hasScrolledToStart = useRef(false)

  useEffect(() => {
    document.body.classList.add('reading')
    return () => document.body.classList.remove('reading')
  }, [])

  useEffect(() => {
    Promise.all([getBook(bookId), listChapters(bookId)]).then(([b, c]) => {
      setBook(b)
      setChapters(c)
    })
  }, [bookId])

  useEffect(() => {
    if (!chapters || chapters.length === 0 || hasScrolledToStart.current) return
    const targetId = chapterId || chapters[0].id
    const el = chapterRefs.current[targetId]
    if (el) {
      el.scrollIntoView({ block: 'start' })
      setActiveChapterId(targetId)
      hasScrolledToStart.current = true
    }
  }, [chapters, chapterId])

  useEffect(() => {
    if (!chapters || chapters.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveChapterId(visible[0].target.dataset.chapterId)
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    Object.values(chapterRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [chapters])

  if (!book || !chapters) return <div className="spinner" />

  if (chapters.length === 0) {
    return (
      <div className="empty-state">
        <div className="big">Nothing to read yet</div>
        <p>
          <Link to={`/books/${bookId}`}>Go back to {book.title}</Link> and add a chapter first.
        </p>
      </div>
    )
  }

  const activeChapter = chapters.find((c) => c.id === activeChapterId) || chapters[0]

  return (
    <div className="read-mode">
      <div className="read-topbar">
        <Link to={`/books/${bookId}`} className="btn btn-ghost btn-sm">
          ← {book.title}
        </Link>
        <div className="read-chapter-name">{activeChapter.title}</div>
      </div>
      <div className="read-scroll">
        {chapters.map((chapter, i) => (
          <section
            key={chapter.id}
            data-chapter-id={chapter.id}
            ref={(el) => {
              chapterRefs.current[chapter.id] = el
            }}
            className="read-chapter"
          >
            <h2 className="read-chapter-title">{chapter.title}</h2>
            {chapter.body.split('\n').map((line, idx) => (
              <p key={idx}>{line || ' '}</p>
            ))}
            {i === chapters.length - 1 && <div className="read-end">— End of {book.title} —</div>}
          </section>
        ))}
      </div>
    </div>
  )
}
