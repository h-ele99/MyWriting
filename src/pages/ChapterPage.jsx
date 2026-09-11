import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getBook,
  getChapter,
  listVersions,
  saveVersionSnapshot,
  setChapterTags,
  updateChapter,
} from '../lib/db.js'
import { exportChapterToDocx } from '../lib/docxExport.js'
import { scheduleBackupAfterEdit } from '../lib/backup.js'
import { useToast } from '../components/Toast.jsx'
import VersionHistory from '../components/VersionHistory.jsx'
import TagEditor from '../components/TagEditor.jsx'

const AUTOSAVE_DELAY = 1500
const SNAPSHOT_MIN_INTERVAL = 5 * 60 * 1000 // 5 minutes

export default function ChapterPage() {
  const { bookId, chapterId } = useParams()
  const showToast = useToast()

  const [book, setBook] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])
  const [saveState, setSaveState] = useState('saved') // saved | dirty | saving
  const [focusMode, setFocusMode] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [exporting, setExporting] = useState(false)

  const lastSaved = useRef({ title: '', body: '' })
  const lastSnapshotAt = useRef(0)
  const saveTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [c, b] = await Promise.all([getChapter(chapterId), getBook(bookId)])
      if (cancelled) return
      setChapter(c)
      setBook(b)
      setTitle(c.title)
      setBody(c.body)
      setTags(c.tags.map((t) => t.name))
      lastSaved.current = { title: c.title, body: c.body }
      const versions = await listVersions(chapterId)
      lastSnapshotAt.current = versions[0] ? new Date(versions[0].created_at).getTime() : 0
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(saveTimer.current)
    }
  }, [chapterId, bookId])

  useEffect(() => {
    document.body.classList.toggle('focus-mode', focusMode)
    return () => document.body.classList.remove('focus-mode')
  }, [focusMode])

  const doSave = useCallback(async () => {
    clearTimeout(saveTimer.current)
    setSaveState('saving')
    try {
      const now = Date.now()
      const changed = lastSaved.current.title !== title || lastSaved.current.body !== body
      if (changed && now - lastSnapshotAt.current > SNAPSHOT_MIN_INTERVAL && lastSaved.current.body) {
        await saveVersionSnapshot(chapterId, lastSaved.current)
        lastSnapshotAt.current = now
      }
      await updateChapter(chapterId, { title: title || 'Untitled chapter', body })
      lastSaved.current = { title, body }
      setSaveState('saved')
      scheduleBackupAfterEdit()
    } catch (err) {
      showToast('Could not save: ' + err.message)
      setSaveState('dirty')
    }
  }, [chapterId, title, body, showToast])

  useEffect(() => {
    if (!chapter) return
    if (title === lastSaved.current.title && body === lastSaved.current.body) return
    setSaveState('dirty')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, AUTOSAVE_DELAY)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body])

  useEffect(() => {
    function handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        doSave()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [doSave])

  async function handleTagsChange(newTags) {
    setTags(newTags)
    try {
      await setChapterTags(chapterId, newTags)
      scheduleBackupAfterEdit()
    } catch (err) {
      showToast('Could not save tags: ' + err.message)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportChapterToDocx({ title, body })
      showToast('Chapter exported to .docx')
    } catch (err) {
      showToast('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  async function handleRestore(version) {
    if (!window.confirm(`Restore the version from ${new Date(version.created_at).toLocaleString()}? Your current text will be saved as a version first.`)) {
      return
    }
    await saveVersionSnapshot(chapterId, { title, body })
    lastSnapshotAt.current = Date.now()
    lastSaved.current = { title: version.title, body: version.body }
    setTitle(version.title)
    setBody(version.body)
    await updateChapter(chapterId, { title: version.title, body: version.body })
    setSaveState('saved')
    setShowVersions(false)
    showToast('Version restored')
  }

  if (!chapter) return <div className="spinner" />

  return (
    <>
      <div className="breadcrumb">
        <Link to="/">Books</Link> / <Link to={`/books/${bookId}`}>{book?.title || 'Book'}</Link>
      </div>

      <div className="editor-shell">
        <div className="editor-titlebar">
          <input
            className="editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapter title"
          />
        </div>
        <div className="editor-tags-row" style={{ padding: '0 18px 10px' }}>
          <TagEditor tags={tags} onChange={handleTagsChange} />
        </div>
        <textarea
          className="editor-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Once upon a time…"
          spellCheck
        />
        <div className="editor-toolbar">
          <div className={'save-status ' + saveState}>
            <span className="dot" />
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'Saved'}
            {saveState === 'dirty' && 'Unsaved changes'}
          </div>
          <div className="pill-row">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowVersions(true)}>
              Version history
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export .docx'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setFocusMode((f) => !f)}>
              {focusMode ? 'Exit focus mode' : 'Focus mode'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={doSave}>
              Save now
            </button>
          </div>
        </div>
      </div>

      {showVersions && (
        <VersionHistory chapterId={chapterId} onClose={() => setShowVersions(false)} onRestore={handleRestore} />
      )}
    </>
  )
}
