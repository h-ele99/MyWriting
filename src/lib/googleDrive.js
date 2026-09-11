// Minimal wrapper around Google Identity Services + the Drive REST API.
// Uses the narrow "drive.file" scope: this app can only see/edit files it
// creates itself, never your whole Drive.

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FOLDER_NAME = 'Bloom Backups'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const driveConfigured = Boolean(CLIENT_ID)

let tokenClient = null
let cachedToken = null // { access_token, expiresAt }

function ensureTokenClient() {
  if (!driveConfigured) throw new Error('Google Drive is not configured (missing VITE_GOOGLE_CLIENT_ID).')
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google sign-in script has not loaded yet. Check your internet connection and try again.')
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {}, // overridden per-request below
    })
  }
  return tokenClient
}

// Ask for a Drive access token. `interactive: true` may show a Google
// consent popup and MUST be called from inside a user click handler.
// `interactive: false` tries to get a token silently (works once the
// user has connected Drive before, in the same browser) and resolves to
// null instead of throwing if it can't.
export function getAccessToken({ interactive } = { interactive: false }) {
  return new Promise((resolve, reject) => {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
      resolve(cachedToken.access_token)
      return
    }
    let client
    try {
      client = ensureTokenClient()
    } catch (err) {
      if (interactive) reject(err)
      else resolve(null)
      return
    }
    client.callback = (response) => {
      if (response.error) {
        if (interactive) reject(new Error(response.error))
        else resolve(null)
        return
      }
      cachedToken = {
        access_token: response.access_token,
        expiresAt: Date.now() + response.expires_in * 1000,
      }
      resolve(response.access_token)
    }
    try {
      client.requestAccessToken({ prompt: interactive ? 'consent' : '' })
    } catch (err) {
      if (interactive) reject(err)
      else resolve(null)
    }
  })
}

async function driveFetch(url, options = {}, accessToken) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Drive request failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return res
}

async function findBackupFolder(accessToken) {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`,
  )
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    {},
    accessToken,
  )
  const { files } = await res.json()
  return files?.[0]?.id || null
}

async function createBackupFolder(accessToken) {
  const res = await driveFetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    },
    accessToken,
  )
  const folder = await res.json()
  return folder.id
}

async function ensureBackupFolder(accessToken) {
  const existing = await findBackupFolder(accessToken)
  if (existing) return existing
  return createBackupFolder(accessToken)
}

export async function uploadBackupJson(accessToken, filename, jsonString) {
  const folderId = await ensureBackupFolder(accessToken)
  const metadata = { name: filename, parents: [folderId], mimeType: 'application/json' }
  const boundary = 'bloom-backup-boundary'
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${jsonString}\r\n` +
    `--${boundary}--`

  const res = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
    accessToken,
  )
  return res.json()
}
