import { useNavigate } from 'react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="phone-frame flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🗺️</div>
      <h1 className="font-display font-extrabold text-3xl mb-2" style={{ color: 'var(--color-dw-blue)' }}>
        404
      </h1>
      <h2 className="font-display font-bold text-lg mb-3" style={{ color: 'var(--color-dw-blue)' }}>
        Page Not Found
      </h2>
      <p className="font-body text-sm mb-8" style={{ color: 'var(--color-dw-slate)' }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button 
        className="btn-primary" 
        onClick={() => navigate('/')}
      >
        Go to Homepage
      </button>
    </div>
  )
}
