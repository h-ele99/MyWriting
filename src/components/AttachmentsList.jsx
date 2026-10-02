import { useEffect, useState } from 'react'
import { deleteAttachment, getAttachmentDownloadUrl, listAttachments, uploadAttachment } from '../lib/db.js'
import { useToast } from './Toast.jsx'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AttachmentsList({ bookId, chapterId }) {
  const [attachments, setAttachments] = useState(null)
  const [uploading, setUploading] = useState(false)
  const showToast = useToast()

  async function refresh() {
    setAttachments(await listAttachments({ bookId, chapterId }))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapterId])

  async function handleFileChange(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await uploadAttachment({ bookId, chapterId, file })
      refresh()
    } catch (err) {
      showToast('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(attachment) {
    try {
      const url = await getAttachmentDownloadUrl(attachment)
      window.open(url, '_blank')
    } catch (err) {
      showToast('Could not open file: ' + err.message)
    }
  }

  async function handleDelete(attachment) {
    if (!window.confirm(`Delete "${attachment.file_name}"? This cannot be undone.`)) return
    try {
      await deleteAttachment(attachment)
      refresh()
    } catch (err) {
      showToast('Could not delete: ' + err.message)
    }
  }

  return (
    <div className="field">
      <label>Attachments</label>
      {attachments === null && <div className="spinner" />}
      {attachments && attachments.length > 0 && (
        <div className="version-list" style={{ maxHeight: 'none', marginBottom: 10 }}>
          {attachments.map((a) => (
            <div key={a.id} className="version-item">
              <div>
                <div className="meta">{a.file_name}</div>
                <div className="snippet">{formatSize(a.size_bytes)}</div>
              </div>
              <div className="pill-row">
                <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(a)}>
                  Download
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <label className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
        {uploading ? 'Uploading…' : '+ Add attachment'}
        <input type="file" onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
      </label>
    </div>
  )
}
