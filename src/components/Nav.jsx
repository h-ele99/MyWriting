import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Nav() {
  const { user, signOut } = useAuth()

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
        {user && (
          <button className="nav-link" style={{ border: 'none', cursor: 'pointer' }} onClick={() => signOut()}>
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
