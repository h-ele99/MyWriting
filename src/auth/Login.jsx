import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabaseConfigured } from '../supabaseClient.js'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!supabaseConfigured) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <div className="mark">Bloom</div>
          <p className="sub">Supabase isn't configured yet</p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, textAlign: 'left' }}>
            Copy <code>.env.example</code> to <code>.env</code>, fill in your Supabase project
            URL and anon key, then restart the app. See <code>README.md</code> for exact steps.
          </p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setInfo('Account created! If email confirmation is on, check your inbox before signing in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="mark">Bloom</div>
        <p className="sub">your quiet room for writing</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-error" style={{ color: 'var(--sage)' }}>{info}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'signin' ? (
            <>New here? <button onClick={() => setMode('signup')}>Create an account</button></>
          ) : (
            <>Already have one? <button onClick={() => setMode('signin')}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
