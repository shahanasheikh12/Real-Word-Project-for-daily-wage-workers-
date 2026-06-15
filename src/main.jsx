/**
 * main.jsx
 * Entry point for the DailyWork React application.
 * Wraps the app with AuthProvider and BrowserRouter.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter enables React Router navigation */}
    <BrowserRouter>
      {/* AuthProvider gives all pages access to the current user session */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
