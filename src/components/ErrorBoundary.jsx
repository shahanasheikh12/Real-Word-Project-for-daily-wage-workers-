import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="phone-frame flex flex-col items-center justify-center p-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="font-display font-extrabold text-2xl mb-2" style={{ color: 'var(--color-dw-blue)' }}>
            Something went wrong
          </h1>
          <p className="font-body text-sm mb-6" style={{ color: 'var(--color-dw-slate)' }}>
            We've encountered an unexpected error. Please try refreshing the page or come back later.
          </p>
          <button 
            className="btn-primary" 
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
