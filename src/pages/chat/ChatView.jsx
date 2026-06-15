import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TopNav from '../../components/layout/TopNav'

export default function ChatView() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [application, setApplication] = useState(null)
  const [jobTitle, setJobTitle] = useState('')
  const [otherPartyName, setOtherPartyName] = useState('Loading...')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!user || !applicationId) return

    async function loadData() {
      // 1. Fetch application details
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, status, worker_id, job_id')
        .eq('id', applicationId)
        .single()

      if (appError || !appData) {
        setError('Application not found.')
        setLoading(false)
        return
      }
      setApplication(appData)

      // 2. Fetch Job Details
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title, employer_id')
        .eq('id', appData.job_id)
        .single()

      if (jobData) {
        setJobTitle(jobData.title)
      }

      // 3. Fetch Other Party's Name
      const isWorker = profile?.role !== 'employer'
      const otherPartyId = isWorker ? jobData?.employer_id : appData.worker_id

      if (otherPartyId) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', otherPartyId)
          .single()
        
        if (userData) {
          setOtherPartyName(userData.name)
        } else {
          setOtherPartyName('User')
        }
      } else {
        setOtherPartyName('User')
      }

      // 4. Fetch historical messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (!msgError && msgData) {
        setMessages(msgData)
      }

      setLoading(false)
    }

    loadData()

    // 5. Subscribe to real-time new messages
    const channel = supabase
      .channel(`chat_${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `application_id=eq.${applicationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, applicationId, profile])

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const { error } = await supabase.from('messages').insert({
      application_id: applicationId,
      sender_id: user.id,
      text: newMessage.trim()
    })

    if (!error) {
      setNewMessage('')
    } else {
      console.error('Error sending message:', error)
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="phone-frame flex flex-col h-full bg-[var(--color-dw-concrete)]">
        <TopNav title="Chat" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: 'var(--color-dw-border)', borderTopColor: 'var(--color-dw-blue)' }} />
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="phone-frame flex flex-col h-full bg-[var(--color-dw-concrete)]">
        <TopNav title="Chat" showBack />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="text-4xl">😕</div>
          <p className="font-display font-bold text-lg" style={{ color: 'var(--color-dw-blue)' }}>Chat not found</p>
          <p className="font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>{error}</p>
        </div>
      </div>
    )
  }

  const isCompleted = application.status === 'completed'

  return (
    <div className="phone-frame flex flex-col h-full" style={{ background: 'var(--color-dw-concrete)' }}>
      <TopNav title={otherPartyName} showBack />

      {/* Header Info */}
      <div className="px-4 py-3 shadow-sm z-10 bg-white border-b border-[var(--color-dw-border)] flex items-center justify-between">
        <p className="font-display font-bold text-sm truncate mr-2" style={{ color: 'var(--color-dw-blue)' }}>
          {jobTitle || 'Loading Job...'}
        </p>
        {isCompleted && (
          <span className="shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-dw-green-soft)] text-[var(--color-dw-green)]">
            ✓ Completed
          </span>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-body text-sm" style={{ color: 'var(--color-dw-slate)' }}>
              No messages yet. Say hello to {otherPartyName}!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === user.id
            return (
              <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className="px-4 py-2.5 rounded-2xl max-w-[80%]"
                  style={{
                    background: isMine ? 'var(--color-dw-blue)' : 'var(--color-dw-white)',
                    color: isMine ? 'var(--color-dw-white)' : 'var(--color-dw-blue)',
                    border: isMine ? 'none' : '1px solid var(--color-dw-border)',
                    borderBottomRightRadius: isMine ? 4 : 16,
                    borderBottomLeftRadius: !isMine ? 4 : 16,
                  }}
                >
                  <p className="font-body text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className="font-mono text-[9px] mt-1 text-right" style={{ color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--color-dw-slate)' }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-[var(--color-dw-border)]">
        {isCompleted ? (
          <div className="text-center py-3 bg-[var(--color-dw-concrete)] rounded-xl border border-[var(--color-dw-border)]">
            <p className="font-mono text-xs" style={{ color: 'var(--color-dw-slate)' }}>
              Chat is disabled for completed jobs
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-[var(--color-dw-concrete)] border border-[var(--color-dw-border)] px-4 py-3 font-body text-sm focus:outline-none focus:border-[var(--color-dw-blue)] transition-colors"
              style={{ borderRadius: 999 }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="rounded-full flex items-center justify-center shadow-sm transition-opacity hover:opacity-90 shrink-0"
              style={{
                width: 44,
                height: 44,
                background: newMessage.trim() ? 'var(--color-dw-yellow)' : 'var(--color-dw-concrete)',
                color: 'var(--color-dw-blue)',
                opacity: newMessage.trim() && !sending ? 1 : 0.5,
              }}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
