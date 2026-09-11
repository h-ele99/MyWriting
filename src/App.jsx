import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Login from './auth/Login.jsx'
import Nav from './components/Nav.jsx'
import BooksPage from './pages/BooksPage.jsx'
import BookPage from './pages/BookPage.jsx'
import ChapterPage from './pages/ChapterPage.jsx'
import TagsPage from './pages/TagsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import { supabaseConfigured } from './supabaseClient.js'
import { backupIfStale } from './lib/backup.js'

function Gate({ children }) {
  const { session, loading } = useAuth()

  useEffect(() => {
    if (session) backupIfStale()
  }, [session])

  if (!supabaseConfigured) return <Login />
  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }
  if (!session) return <Login />
  return children
}

function Shell() {
  return (
    <div className="app-shell">
      <Nav />
      <Routes>
        <Route path="/" element={<BooksPage />} />
        <Route path="/books/:bookId" element={<BookPage />} />
        <Route path="/books/:bookId/chapters/:chapterId" element={<ChapterPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate>
          <Shell />
        </Gate>
      </ToastProvider>
    </AuthProvider>
  )
}
