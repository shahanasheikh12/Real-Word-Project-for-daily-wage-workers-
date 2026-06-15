/**
 * AdminChangePassword.jsx
 * Forced password change screen for admin accounts on first login.
 * Only shown when must_change_password = true in public.users.
 * After successful change, sets must_change_password = false and redirects to dashboard.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function AdminChangePassword() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleChangePassword(e) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    // 1. Update the password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // 2. Set must_change_password = false in public.users
    const { error: profileError } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', user.id)

    if (profileError) {
      setError('Password changed but profile update failed. Please contact support.')
      setLoading(false)
      return
    }

    // 3. Refresh context + redirect to dashboard
    await refreshProfile()
    navigate('/admin/dashboard')
    setLoading(false)
  }

  return (
    <div className="phone-frame">
      {/* Header */}
      <div className="px-6 pt-12 pb-8" style={{ background: 'var(--color-dw-blue)' }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
          style={{ background: 'var(--color-dw-yellow)' }}
        >
          🔐
        </div>
        <h1 className="font-display text-2xl font-extrabold" style={{ color: 'var(--color-dw-white)', letterSpacing: '-0.02em' }}>
          Change Your Password
        </h1>
        <p className="font-body text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          For security, you must set a new password before accessing the admin dashboard.
        </p>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col gap-6">
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm animate-fade-in" style={{ background: 'var(--color-dw-red-soft)', color: 'var(--color-dw-red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              New Password
            </label>
            <input
              id="admin-new-password"
              className="dw-input"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
              Confirm New Password
            </label>
            <input
              id="admin-confirm-password"
              className="dw-input"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {/* Password strength tips */}
          <ul className="font-mono text-[11px] space-y-1" style={{ color: 'var(--color-dw-slate)' }}>
            <li style={{ color: newPassword.length >= 8 ? 'var(--color-dw-green)' : 'inherit' }}>
              {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
            </li>
            <li style={{ color: /[A-Z]/.test(newPassword) ? 'var(--color-dw-green)' : 'inherit' }}>
              {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
            </li>
            <li style={{ color: /[0-9]/.test(newPassword) ? 'var(--color-dw-green)' : 'inherit' }}>
              {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
            </li>
          </ul>

          <button id="admin-change-password-submit" type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Updating password…' : 'Set New Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
