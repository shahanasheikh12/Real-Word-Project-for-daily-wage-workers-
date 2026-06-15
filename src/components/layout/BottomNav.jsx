/**
 * BottomNav.jsx
 * Sticky bottom navigation bar — the primary navigation for DailyWork.
 * Shows different tabs based on user role (worker vs employer).
 * Matches the bottom-nav style from dailywork-ui-design.html exactly.
 */
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Nav item definitions by role
const WORKER_NAV = [
  { label: 'Feed',  icon: '🏠', path: '/' },
  { label: 'Jobs',  icon: '🔍', path: '/jobs' },
  { label: 'Map',   icon: '📍', path: '/map' },
  { label: 'Apps',  icon: '📋', path: '/applications' },
  { label: 'Me',    icon: '👤', path: '/worker/profile' },
]

const EMPLOYER_NAV = [
  { label: 'Posts', icon: '🏠', path: '/' },
  { label: 'Post',  icon: '➕', path: '/employer/post-job', center: true },
  { label: 'Apps',  icon: '📋', path: '/applications' },
  { label: 'Me',    icon: '👤', path: '/employer/profile' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()

  const navItems = profile?.role === 'employer' ? EMPLOYER_NAV : WORKER_NAV

  return (
    <nav className="bottom-nav flex justify-around items-center px-2 py-2 pb-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path

        // Center "Post" button (employer) gets a special yellow circle
        if (item.center) {
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 flex-1"
              style={{ minHeight: '44px' }}
              aria-label={item.label}
            >
              <div
                className="flex items-center justify-center text-2xl rounded-full border-4"
                style={{
                  width: '52px',
                  height: '52px',
                  background: 'var(--color-dw-yellow)',
                  borderColor: 'var(--color-dw-white)',
                  boxShadow: '0 4px 12px rgba(245,197,24,0.45)',
                  marginTop: '-22px',
                }}
              >
                {item.icon}
              </div>
              <span
                className="font-mono text-[10px]"
                style={{ color: isActive ? 'var(--color-dw-blue)' : 'var(--color-dw-slate)' }}
              >
                {item.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 flex-1"
            style={{ minHeight: '44px' }}
            aria-label={item.label}
          >
            <span
              className="text-xl"
              style={{ filter: isActive ? 'none' : 'grayscale(1) opacity(0.4)' }}
            >
              {item.icon}
            </span>
            <span
              className="font-mono text-[10px]"
              style={{
                color: isActive ? 'var(--color-dw-blue)' : 'var(--color-dw-slate)',
                fontWeight: isActive ? '500' : '400',
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
