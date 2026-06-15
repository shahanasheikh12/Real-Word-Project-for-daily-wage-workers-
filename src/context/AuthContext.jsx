/**
 * AuthContext.jsx
 * Provides global authentication state throughout the app.
 * - Tracks the current Supabase session and user
 * - Exposes the user's role ('worker', 'employer', 'admin') from public.users
 * - Handles loading state while session is being checked
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Create the context
const AuthContext = createContext(null)

/**
 * AuthProvider — wrap your app root with this to enable auth state everywhere.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)      // Supabase session object
  const [user, setUser] = useState(null)            // Auth user (from auth.users)
  const [profile, setProfile] = useState(null)     // Public profile (from public.users)
  const [loading, setLoading] = useState(true)     // True while checking session

  /**
   * Fetch the user's public profile including role from public.users.
   * This is separate from auth.users because it has extra columns (role, trust_score, etc.).
   */
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch user profile:', error.message)
      return null
    }
    return data
  }

  // On mount: get current session, then subscribe to auth state changes
  useEffect(() => {
    // 1. Get the current session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    // 2. Subscribe to future auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    // 3. Cleanup subscription when component unmounts
    return () => subscription.unsubscribe()
  }, [])

  // Sign out helper
  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user,
    profile,          // Contains: id, name, phone, role, city, trust_score, id_verified, must_change_password
    loading,
    signOut,
    refreshProfile: () => user ? fetchProfile(user.id).then(setProfile) : null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth — custom hook to consume auth context.
 * Usage: const { user, profile, loading, signOut } = useAuth()
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
