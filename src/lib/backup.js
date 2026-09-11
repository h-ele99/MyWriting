import { supabase } from '../supabaseClient.js'
import { exportAllData } from './db.js'
import { driveConfigured, getAccessToken, uploadBackupJson } from './googleDrive.js'

const CONNECTED_KEY = 'bloom_drive_connected'
const MIN_INTERVAL_MS = 20 * 60 * 1000 // don't back up more than once every 20 minutes

export function isDriveConnected() {
  return driveConfigured && localStorage.getItem(CONNECTED_KEY) === 'true'
}

export function markDriveConnected() {
  localStorage.setItem(CONNECTED_KEY, 'true')
}

export function disconnectDrive() {
  localStorage.removeItem(CONNECTED_KEY)
}

export async function connectDrive() {
  const token = await getAccessToken({ interactive: true })
  markDriveConnected()
  return token
}

export async function getLastBackup() {
  const { data, error } = await supabase
    .from('backup_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function logBackup(status, note = '') {
  const { data: userData } = await supabase.auth.getUser()
  await supabase.from('backup_log').insert({ user_id: userData.user.id, status, note })
}

// interactive: true when triggered by a "Backup now" click (may show a
// Google consent popup); false for silent/automatic attempts.
export async function runBackup({ interactive = false } = {}) {
  const token = await getAccessToken({ interactive })
  if (!token) {
    if (interactive) throw new Error('Could not get permission to access Google Drive.')
    return { skipped: true }
  }
  const data = await exportAllData()
  const filename = `bloom-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  try {
    await uploadBackupJson(token, filename, JSON.stringify(data, null, 2))
    await logBackup('success', filename)
    return { skipped: false, filename }
  } catch (err) {
    await logBackup('error', err.message)
    throw err
  }
}

let editBackupTimer = null

// Call after any create/update/delete so a backup goes out a little while
// after you stop editing. No-ops if Drive isn't connected.
export function scheduleBackupAfterEdit() {
  if (!isDriveConnected()) return
  clearTimeout(editBackupTimer)
  editBackupTimer = setTimeout(() => {
    runBackup({ interactive: false }).catch(() => {})
  }, 60 * 1000)
}

// Call once when the app loads. Runs a silent backup if it's been more
// than a day since the last one (and less than MIN_INTERVAL_MS won't
// double-fire on quick reloads).
export async function backupIfStale() {
  if (!isDriveConnected()) return
  try {
    const last = await getLastBackup()
    const lastAt = last ? new Date(last.created_at).getTime() : 0
    const age = Date.now() - lastAt
    if (age < MIN_INTERVAL_MS) return
    if (age > 24 * 60 * 60 * 1000) {
      await runBackup({ interactive: false })
    }
  } catch {
    // silent: automatic backups should never interrupt the writing experience
  }
}
