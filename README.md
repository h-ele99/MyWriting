# Bloom — your personal writing room

A private web app for organizing your book chapters: Books → Chapters, each with a title,
long-form text, and hashtags. Includes a distraction-free editor with autosave, version
history, .docx export, and automatic backups to your own Google Drive.

This app is 100% yours: your writing lives in a Supabase project you create and control,
protected so only you can log in and see it. Nothing runs on anyone else's server.

---

## What you'll set up (about 20–30 minutes, one time)

1. A free Supabase project (your database + login)
2. A free Google Cloud OAuth client (only needed for the "backup to Google Drive" feature)
3. Your own copy of this app running locally, or deployed somewhere like Vercel/Netlify

You don't need to write any code — just copy/paste a few values.

---

## 1. Create your Supabase project

1. Go to **https://supabase.com** and click **Start your project** → sign in (GitHub or email).
2. Click **New project**. Pick any name (e.g. "bloom"), set a database password (save it
   somewhere safe — a password manager is fine), pick the region closest to you, and click
   **Create new project**. Wait ~1-2 minutes while it provisions.
3. Once it's ready, in the left sidebar click the **SQL Editor** (icon looks like `>_`).
4. Click **New query**. Open the file `supabase/schema.sql` from this project, copy its
   entire contents, and paste it into the SQL editor. Click **Run** (bottom right).
   You should see "Success. No rows returned." This creates all the tables (books,
   chapters, tags, version history, backup log) and locks them down so only you can read
   your own data.
5. In the left sidebar, click the gear icon **Project Settings** → **API**.
   - Copy the **Project URL** (looks like `https://xxxxxxxx.supabase.co`).
   - Copy the **anon public** key (a long string under "Project API keys").
6. In **Project Settings** → **Authentication** (or **Authentication** in the sidebar) →
   **Providers**, make sure **Email** is enabled (it is by default).
   - Optional but recommended for a single-user app: under **Authentication** → **Settings**,
     you can turn **off** "Enable email confirmations" so you can sign in immediately after
     creating your account without checking an inbox. If you leave it on, just check your
     email for a confirmation link after signing up.

Keep this browser tab open — you'll come back for one more thing after deciding where the
app will run (step 3).

---

## 2. (Optional, for backups) Create a Google OAuth client

You can skip this section for now and add it later — the app works fully without it,
you just won't have the "Backup to Google Drive" button working yet.

1. Go to **https://console.cloud.google.com/** and sign in with the Google account whose
   Drive you want backups saved to.
2. Click the project dropdown (top left) → **New Project**. Name it e.g. "Bloom Backups" →
   **Create**. Select it once created.
3. In the search bar at the top, search for **"Google Drive API"** and open it, then click
   **Enable**.
4. In the left sidebar go to **APIs & Services** → **OAuth consent screen**.
   - User type: **External** → **Create**.
   - Fill in the required fields (app name "Bloom", your email for support + developer
     contact). Save and continue through the next screens (you can leave scopes/test users
     as default for now — we'll add yourself as a test user next).
   - On the **Test users** step, click **Add users** and add your own Google email address.
     Save and continue, then **Back to dashboard**.
5. In the left sidebar go to **APIs & Services** → **Credentials**.
   - Click **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**. Name it "Bloom Web".
   - Under **Authorized JavaScript origins**, click **Add URI** and add the address(es)
     you'll run the app from, e.g.:
     - `http://localhost:5173` (for running it on your own computer)
     - `https://your-app-name.vercel.app` (if/when you deploy it — add this later once you
       know the URL, you can always come back and add more origins)
   - Click **Create**. Copy the **Client ID** shown (ends in `.apps.googleusercontent.com`).

Because the app only requests the narrow "drive.file" permission (it can only see files it
creates itself, never your whole Drive), and because it's just for your own account as a
"test user," Google will show an "unverified app" warning the first time you connect — that's
expected for a personal project. Click **Advanced** → **Go to Bloom (unsafe)** to continue;
this is safe because you built and control this app yourself.

---

## 3. Configure and run the app

1. In this project folder, copy `.env.example` to a new file named `.env`.
2. Open `.env` and fill in the three values:
   ```
   VITE_SUPABASE_URL=...        (from step 1.5)
   VITE_SUPABASE_ANON_KEY=...   (from step 1.5)
   VITE_GOOGLE_CLIENT_ID=...    (from step 2.5 — leave as-is/blank if you skipped step 2)
   ```
3. Install dependencies and start the app:
   ```
   npm install
   npm run dev
   ```
4. Open the URL it prints (usually `http://localhost:5173`). Click **Create an account**,
   enter your email and a password. That's your login from now on — this is a private,
   single-user app, so don't share these credentials.

### Deploying so you can use it from anywhere

The easiest option is **Vercel** or **Netlify** (both have generous free tiers):

1. Push this project to a GitHub repository.
2. On vercel.com or netlify.com, click "New project/site" → import your repository.
3. When it asks for environment variables, add the same three `VITE_...` values from your
   `.env` file.
4. Deploy. Once you have the live URL, go back to Google Cloud Console →
   **APIs & Services** → **Credentials** → your OAuth client, and add that URL under
   **Authorized JavaScript origins** so Google Drive backup works there too.

---

## Using Bloom

- **Books** — the home page. Create a book, click into it to see its chapters.
- **Chapters** — inside a book, create chapters, click one to open the editor.
- **Editor** — a clean page with just the title and text. It autosaves ~1.5 seconds after
  you stop typing (or press Cmd/Ctrl+S, or click "Save now"). Click **Focus mode** to hide
  everything except the page you're writing.
- **Tags** — add hashtags to a chapter right under its title (type a word and press Enter).
  Use the **Tags** page in the top nav to browse all your chapters by tag across every book,
  or use the tag chips at the top of a book's chapter list to filter within just that book.
- **Version history** — click "Version history" in the editor toolbar to see earlier
  snapshots of a chapter and restore any of them (your current text is saved as a version
  first, so restoring is never destructive).
- **Export to Word** — "Export .docx" in the editor exports just that chapter; "Export book
  (.docx)" on a book's page combines every chapter into one Word document.
- **Backup to Google Drive** — in **Settings**, click "Connect Google Drive" once, then
  "Backup now" any time. After that, Bloom also backs up automatically about a minute after
  you make an edit, and once a day while you have the app open. Backups are JSON files in a
  "Bloom Backups" folder in your own Drive — open any of them to see all of your books,
  chapters, and tags in plain text, in case you ever need to manually restore something.

### A note on "automatic" backups

Bloom is a browser-based app with no server of its own, so scheduled backups run while you
have the app open (on edits, and once a day) rather than on a fixed clock in the background.
For daily writing habits this covers you well; if you want a guaranteed backup even on days
you don't open the app, the simplest option is to open Bloom briefly each day, or click
"Backup now" whenever you finish a writing session.

---

## Project structure

```
supabase/schema.sql   Database schema — run once in the Supabase SQL editor
src/supabaseClient.js Supabase connection
src/auth/              Login screen + auth state
src/lib/db.js          All reads/writes to books, chapters, tags, versions
src/lib/docxExport.js  Word (.docx) export
src/lib/googleDrive.js Google Drive OAuth + file upload
src/lib/backup.js      Backup scheduling/orchestration
src/pages/             Books, Book (chapters), Chapter (editor), Tags, Settings
src/components/        Nav, Modal, TagEditor, VersionHistory, Toast
```
