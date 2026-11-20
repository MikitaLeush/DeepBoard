import { NOTE_STYLE } from '../lib/note-style'

/** Three notes stuck on top of each other, plus the name. Static: safe on the prerendered landing page. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1" y="5" width="13" height="13" rx="1.5" fill={NOTE_STYLE.blue.bg} transform="rotate(-8 7.5 11.5)" />
        <rect x="5" y="2.5" width="13" height="13" rx="1.5" fill={NOTE_STYLE.pink.bg} transform="rotate(5 11.5 9)" />
        <rect x="7.5" y="7.5" width="13" height="13" rx="1.5" fill={NOTE_STYLE.yellow.bg} stroke="#1f1b16" strokeWidth="1.2" />
      </svg>
      <span className="font-[family-name:var(--font-display)] text-lg font-extrabold leading-none tracking-tight">DeepBoard</span>
    </span>
  )
}
