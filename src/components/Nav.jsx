import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { applyTheme, getStoredTheme } from '../lib/theme.js'

export default function Nav() {
  const { user, signOut } = useAuth()
  const [theme, setTheme] = useState(getStoredTheme)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="topbar">
      <NavLink to="/" className="brand" style={{ textDecoration: 'none' }}>
        <span className="mark">Bloom</span>
        <span className="tag">writing room</span>
      </NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Books
        </NavLink>
        <NavLink to="/tags" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Tags
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Settings
        </NavLink>
        <button className="nav-link" style={{ border: 'none', cursor: 'pointer' }} onClick={toggleTheme}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        {user && (
          <button className="nav-link" style={{ border: 'none', cursor: 'pointer' }} onClick={() => signOut()}>
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
