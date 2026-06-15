import { useState } from 'react'

export default function RatingModal({ isOpen, onClose, onSubmit, rateeName, isSubmitting }) {
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
        <h3 className="font-display font-bold text-xl mb-1 text-center" style={{ color: 'var(--color-dw-blue)' }}>
          Rate {rateeName}
        </h3>
        <p className="font-body text-xs text-center mb-6" style={{ color: 'var(--color-dw-slate)' }}>
          How was your experience working with them?
        </p>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setScore(star)}
              className="text-4xl transition-transform hover:scale-110 active:scale-95 focus:outline-none"
              style={{
                color: star <= score ? 'var(--color-dw-yellow)' : 'var(--color-dw-concrete)',
              }}
            >
              ★
            </button>
          ))}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="font-mono text-[11px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-dw-slate)' }}>
            Comment (Optional)
          </label>
          <textarea
            className="dw-input w-full"
            style={{ minHeight: '80px', resize: 'vertical' }}
            placeholder="They did a great job..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 font-display font-bold text-sm py-3 rounded-xl bg-transparent border-2 transition-opacity"
            style={{ borderColor: 'var(--color-dw-concrete)', color: 'var(--color-dw-slate)', opacity: isSubmitting ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ score, comment })}
            disabled={score === 0 || isSubmitting}
            className="flex-1 font-display font-bold text-sm py-3 rounded-xl text-white transition-opacity"
            style={{
              background: 'var(--color-dw-blue)',
              opacity: score === 0 || isSubmitting ? 0.5 : 1
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}
