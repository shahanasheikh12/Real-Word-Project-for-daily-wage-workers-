/**
 * AdminLogin.jsx
 * Admin-only login page at /admin/login.
 * After sign-in, checks if role === 'admin'.
 * If not admin: immediately signs out and shows "This login is for administrators only".
 * If admin + must_change_password: redirects to /admin/change-password.
 * If admin: redirects to /admin/dashboard.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAdminLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // 1. Sign in
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 2. Check role
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('role, must_change_password')
      .eq('id', data.user.id)
      .single()

    if (profileError || !userData) {
      await supabase.auth.signOut()
      setError('Account not found. Please contact support.')
      setLoading(false)
      return
    }

    // 3. Reject non-admin accounts immediately
    if (userData.role !== 'admin') {
      await supabase.auth.signOut()
      setError('This login is for administrators only.')
      setLoading(false)
      return
    }

    // 4. Admin redirect
    navigate(userData.must_change_password ? '/admin/change-password' : '/admin/dashboard')
    setLoading(false)
  }

  return (
    <div className="phone-frame">
      {/* Dark admin header */}
      <div className="px-6 pt-12 pb-8" style={{ background: 'var(--color-dw-blue)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm"
            style={{ background: 'var(--color-dw-yellow)', color: 'var(--color-dw-blue)' }}
          >
            A
          </div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--color-dw-white)' }}>
            Admin Portal
          </span>
        </div>
        <p className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Restricted access only
        </p>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-dw-blue)' }}>
            Administrator Login
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: 'var(--color-dw-slate)' }}>
            This area is for DailyWork administrators only.
          </p>
        </div>

        {/* Error — styled as a prominent warning */}
        {error && (
          <div
            className="rounded-xl px-4 py-4 flex items-start gap-3 animate-fade-in"
            style={{ background: 'var(--color-dw-red-soft)', border: '1.5px solid var(--color-dw-red)' }}
          >
            <span className="text-xl">🚫</span>
            <p className="font-body text-sm font-medium" style={{ color: 'var(--color-dw-red)' }}>
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Admin Email
            </label>
            <input
              id="admin-email"
              className="dw-input"
              type="email"
              placeholder="admin@dailywork.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Password
            </label>
            <input
              id="admin-password"
              className="dw-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button id="admin-login-submit" type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Verifying…' : 'Admin Sign In'}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="font-mono text-[11px] underline" style={{ color: 'var(--color-dw-slate)' }}>
            ← Back to regular login
          </Link>
        </div>
      </div>
    </div>
  )
}
