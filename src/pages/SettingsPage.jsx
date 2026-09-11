import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { connectDrive, disconnectDrive, getLastBackup, isDriveConnected, runBackup } from '../lib/backup.js'
import { driveConfigured } from '../lib/googleDrive.js'
import { useToast } from '../components/Toast.jsx'

export default function SettingsPage() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(isDriveConnected())
  const [lastBackup, setLastBackup] = useState(null)
  const [busy, setBusy] = useState(false)
  const showToast = useToast()

  async function refreshLastBackup() {
    try {
      setLastBackup(await getLastBackup())
    } catch {
      setLastBackup(null)
    }
  }

  useEffect(() => {
    refreshLastBackup()
  }, [])

  async function handleConnect() {
    setBusy(true)
    try {
      await connectDrive()
      setConnected(true)
      showToast('Google Drive connected')
    } catch (err) {
      showToast('Could not connect: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleDisconnect() {
    disconnectDrive()
    setConnected(false)
    showToast('Google Drive disconnected on this device')
  }

  async function handleBackupNow() {
    setBusy(true)
    try {
      const result = await runBackup({ interactive: true })
      if (!result.skipped) {
        showToast('Backed up to Google Drive')
        refreshLastBackup()
      }
    } catch (err) {
      showToast('Backup failed: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Settings</div>
      </div>

      <div className="card settings-section">
        <h3>Account</h3>
        <p>Signed in as {user?.email}</p>
      </div>

      <div className="card settings-section">
        <h3>Google Drive backup</h3>
        {!driveConfigured && (
          <p>
            Google Drive backup isn't configured yet. Add <code>VITE_GOOGLE_CLIENT_ID</code> to your{' '}
            <code>.env</code> file — see README.md for exact setup steps.
          </p>
        )}
        {driveConfigured && (
          <>
            <p>
              Bloom can save a full JSON copy of your books, chapters, and tags into a "Bloom Backups"
              folder in your own Google Drive. It backs up automatically about a minute after you make
              edits, and once a day while you have the app open — plus you can always trigger one by hand.
            </p>
            <p style={{ fontSize: 12.5 }}>
              Last backup:{' '}
              {lastBackup ? `${new Date(lastBackup.created_at).toLocaleString()} (${lastBackup.status})` : 'never'}
            </p>
            <div className="pill-row">
              {!connected && (
                <button className="btn btn-primary" onClick={handleConnect} disabled={busy}>
                  Connect Google Drive
                </button>
              )}
              {connected && (
                <>
                  <button className="btn btn-primary" onClick={handleBackupNow} disabled={busy}>
                    {busy ? 'Backing up…' : 'Backup now'}
                  </button>
                  <button className="btn btn-ghost" onClick={handleDisconnect} disabled={busy}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card settings-section">
        <h3>About your data</h3>
        <p>
          Your writing is stored in your own Supabase project and protected by row-level security, so
          only your signed-in account can read or write it. Exports (.docx) and backups (Google Drive
          JSON) happen entirely in your browser — nothing passes through a third-party server.
        </p>
      </div>
    </>
  )
}
