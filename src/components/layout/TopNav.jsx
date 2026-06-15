import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../supabaseClient'

export default function TopNav({ title, showBack = false, onBack }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  
  const [notifications, setNotifications] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Get initials from the user's name for the avatar
  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  useEffect(() => {
    if (!user) return

    // Fetch initial unread notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setNotifications(data)
      }
    }

    fetchNotifications()

    // Subscribe to realtime changes
    const channel = supabase.channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // If it's unread, add to list
          if (!payload.new.is_read) {
            setNotifications(prev => [payload.new, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Close dropdown on navigation
  useEffect(() => {
    setIsDropdownOpen(false)
  }, [location.pathname])

  // Handle clicking a notification
  const handleNotificationClick = async (notif) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setIsDropdownOpen(false)

    // DB update
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif.id)

    // Navigate if there's a link
    if (notif.link) {
      navigate(notif.link)
    }
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 relative"
      style={{ background: 'var(--color-dw-white)', borderBottom: '1px solid var(--color-dw-border)' }}
    >
      {/* Left: back button OR logo */}
      {showBack ? (
        <button
          onClick={onBack || (() => navigate(-1))}
          className="flex items-center justify-center rounded-full"
          style={{
            width: '38px',
            height: '38px',
            background: 'var(--color-dw-concrete)',
            minHeight: '44px',
            minWidth: '44px',
          }}
          aria-label="Go back"
        >
          ←
        </button>
      ) : (
        <span
          className="font-display text-xl font-extrabold"
          style={{ color: 'var(--color-dw-blue)', letterSpacing: '-0.02em' }}
        >
          Daily<span style={{ color: 'var(--color-dw-yellow)' }}>Work</span>
        </span>
      )}

      {/* Center title (only when showBack) */}
      {showBack && title && (
        <h1
          className="font-display font-extrabold text-[18px]"
          style={{ color: 'var(--color-dw-blue)', letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
      )}

      {/* Right: notification bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative flex items-center justify-center rounded-full text-base transition-colors"
            style={{
              width: '38px',
              height: '38px',
              background: isDropdownOpen ? 'var(--color-dw-blue)' : 'var(--color-dw-concrete)',
              minHeight: '44px',
              minWidth: '44px',
            }}
            aria-label="Notifications"
          >
            <span style={{ filter: isDropdownOpen ? 'grayscale(100%) brightness(200%)' : 'none' }}>🔔</span>
            {/* Notification dot */}
            {notifications.length > 0 && (
              <span
                className="absolute rounded-full border-2 flex items-center justify-center"
                style={{
                  width: '14px',
                  height: '14px',
                  top: '4px',
                  right: '4px',
                  background: 'var(--color-dw-red)',
                  borderColor: 'var(--color-dw-white)',
                  color: 'white',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] bg-white rounded-lg shadow-lg border z-[999] overflow-hidden flex flex-col"
              style={{ borderColor: 'var(--color-dw-border)' }}
            >
              <div className="p-3 border-b bg-gray-50" style={{ borderColor: 'var(--color-dw-border)' }}>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-dw-blue)' }}>Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-hide py-2">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No new notifications
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className="text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        style={{ borderColor: 'var(--color-dw-border)' }}
                      >
                        <p className="font-bold text-xs mb-1" style={{ color: 'var(--color-dw-blue)' }}>{notif.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{notif.message}</p>
                        <span className="text-[9px] text-gray-400 mt-2 block">
                          {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          onClick={() => navigate(profile?.role === 'worker' ? '/worker/profile' : '/employer/profile')}
          className="flex items-center justify-center rounded-full font-display font-bold text-sm"
          style={{
            width: '38px',
            height: '38px',
            background: 'var(--color-dw-blue)',
            color: 'var(--color-dw-yellow)',
            minHeight: '44px',
            minWidth: '44px',
          }}
          aria-label="My profile"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
