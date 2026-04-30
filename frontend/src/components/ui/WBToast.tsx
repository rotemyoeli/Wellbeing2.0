/**
 * WBToast — global toast notification system.
 *
 * Usage: import { showToast } from './WBToast'; showToast('Saved!')
 * Auto-dismisses after 3 seconds. Stacks from bottom.
 */
import { useEffect, useState } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let _addToast: ((msg: string, type?: 'success' | 'error' | 'info') => void) | null = null
let _nextId = 0

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  _addToast?.(message, type)
}

export default function WBToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _addToast = (message, type = 'success') => {
      const id = _nextId++
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }
    return () => { _addToast = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex flex-col items-center gap-2 px-5 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto rounded-xl px-4 py-2.5 shadow-lg text-caption font-medium
            animate-slideUp backdrop-blur-sm
            ${toast.type === 'success' ? 'bg-teal-700/95 text-white' :
              toast.type === 'error' ? 'bg-alert-low-fg/95 text-white' :
              'bg-ink-900/90 text-white'}
          `}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            )}
            {toast.type === 'error' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
