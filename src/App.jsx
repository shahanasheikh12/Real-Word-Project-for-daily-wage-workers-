/**
 * App.jsx
 * Root routing configuration for DailyWork.
 * Sets up all routes and enforces auth-based redirects.
 *
 * Route structure:
 *   /                     → Home / Feed (role-aware)
 *   /login                → Shared login page
 *   /signup/worker        → Worker registration
 *   /signup/employer      → Employer registration
 *   /worker/profile       → Worker profile setup (Phase 2)
 *   /employer/profile     → Employer profile setup (Phase 2)
 *   /employer/post-job    → Post a new job (Phase 3)
 *   /jobs                 → Job feed / browse (Phase 3)
 *   /jobs/:id             → Job detail page (Phase 3)
 *   /map                  → Map view (Phase 4)
 *   /applications         → My applications / job posts (Phase 3)
 *   /admin/login          → Admin-only login
 *   /admin/dashboard      → Protected admin dashboard
 *   /admin/change-password → Forced password reset for admin
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth pages
import Login from './pages/auth/Login'
import SignupWorker from './pages/auth/SignupWorker'
import SignupEmployer from './pages/auth/SignupEmployer'
import AdminLogin from './pages/auth/AdminLogin'
import AdminChangePassword from './pages/auth/AdminChangePassword'

// Main pages
import Home from './pages/Home'
import WorkerProfile from './pages/worker/WorkerProfile'
import EmployerProfile from './pages/employer/EmployerProfile'
import PostJob from './pages/employer/PostJob'
import JobFeed from './pages/jobs/JobFeed'
import JobDetail from './pages/jobs/JobDetail'
import MapView from './pages/MapView'
import Applications from './pages/Applications'
import ChatView from './pages/chat/ChatView'

// Admin pages
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminJobs from './pages/admin/AdminJobs'
import AdminUsers from './pages/admin/AdminUsers'

// Error & Fallback
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './pages/NotFound'
import { Toaster } from 'react-hot-toast'

// Loading spinner shown while auth state is being determined
function LoadingScreen() {
  return (
    <div className="phone-frame flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full border-4 mx-auto mb-4"
          style={{
            borderColor: 'var(--color-dw-concrete)',
            borderTopColor: 'var(--color-dw-blue)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p className="font-display font-bold text-lg" style={{ color: 'var(--color-dw-blue)' }}>
          Daily<span style={{ color: 'var(--color-dw-yellow)' }}>Work</span>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Optionally restrict by role (e.g., adminOnly).
 */
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') {
    alert("Not authorized")
    return <Navigate to="/jobs" replace />
  }
  return children
}

/**
 * GuestRoute — redirects authenticated users away from auth pages.
 */
function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* ─── Auth routes (guests only) ─── */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup/worker" element={<GuestRoute><SignupWorker /></GuestRoute>} />
        <Route path="/signup/employer" element={<GuestRoute><SignupEmployer /></GuestRoute>} />
        <Route path="/admin/login" element={<GuestRoute><AdminLogin /></GuestRoute>} />

        {/* ─── Protected: Admin routes ─── */}
        <Route
          path="/admin/change-password"
          element={<ProtectedRoute adminOnly><AdminChangePassword /></ProtectedRoute>}
        />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="users" element={<AdminUsers />} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* ─── Protected: App routes ─── */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/worker/profile" element={<ProtectedRoute><WorkerProfile /></ProtectedRoute>} />
        <Route path="/employer/profile" element={<ProtectedRoute><EmployerProfile /></ProtectedRoute>} />
        <Route path="/employer/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><JobFeed /></ProtectedRoute>} />
        <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
        <Route path="/chat/:applicationId" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />

        {/* ─── Fallback ─── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" />
    </ErrorBoundary>
  )
}
