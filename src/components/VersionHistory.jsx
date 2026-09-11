import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { listVersions } from '../lib/db.js'

export default function VersionHistory({ chapterId, onClose, onRestore }) {
  const [versions, setVersions] = useState(null)

  useEffect(() => {
    listVersions(chapterId).then(setVersions)
  }, [chapterId])

  return (
    <Modal title="Version history" onClose={onClose}>
      {versions === null && <div className="spinner" />}
      {versions && versions.length === 0 && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13.5 }}>
          No earlier versions yet. A snapshot is saved automatically as you keep editing this chapter over time.
        </p>
      )}
      {versions && versions.length > 0 && (
        <div className="version-list">
          {versions.map((v) => (
            <div key={v.id} className="version-item">
              <div>
                <div className="meta">{new Date(v.created_at).toLocaleString()}</div>
                <div className="snippet">{v.title} — {v.body.slice(0, 60) || '(empty)'}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onRestore(v)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
