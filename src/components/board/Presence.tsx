import { useRef } from 'react'
import { getUserColor, usePresenceRoom } from 'deepspace'

type Pt = { x: number; y: number }
type Peers = ReturnType<typeof usePresenceRoom>['peers']

/** Broadcasts my pointer (board coordinates, rAF-throttled) and exposes everyone else. */
export function useBoardPresence(boardId: string) {
  const { peers, updateState } = usePresenceRoom(`board:${boardId}`)
  const pending = useRef<Pt | null>(null)
  const scheduled = useRef(false)

  const onMove = (p: Pt) => {
    pending.current = p
    if (scheduled.current) return
    scheduled.current = true
    requestAnimationFrame(() => {
      scheduled.current = false
      if (pending.current) updateState({ cursor: pending.current })
    })
  }
  const onLeave = () => {
    pending.current = null
    updateState({ cursor: null })
  }
  // noteId of the note I'm typing in, or null.
  const setTyping = (noteId: string | null) => updateState({ typing: noteId })
  return { peers, onMove, onLeave, setTyping }
}

export function Cursors({ peers }: { peers: Peers }) {
  return (
    <>
      {peers.map((p) => {
        const c = p.state.cursor as Pt | null | undefined
        if (!c) return null
        const color = getUserColor(p.userId)
        return (
          <div key={p.userId} className="pointer-events-none absolute z-50" style={{ left: c.x, top: c.y }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill={color} stroke="white" strokeWidth="1">
              <path d="M1 1l5 13 2-5 5-2z" />
            </svg>
            <span className="ml-3 rounded px-1.5 py-0.5 text-xs text-white" style={{ background: color }}>
              {p.userName}
            </span>
          </div>
        )
      })}
    </>
  )
}

export function PeerChips({ peers }: { peers: Peers }) {
  if (peers.length === 0) return null
  return (
    <div className="absolute right-5 top-4 z-50 flex gap-1.5">
      {peers.map((p) => (
        <span
          key={p.userId}
          title={p.userName}
          className="flex size-8 items-center justify-center rounded-full text-sm font-medium text-white shadow-[0_2px_5px_-1px_rgba(60,40,10,0.5)] ring-2 ring-card"
          style={{ background: getUserColor(p.userId) }}
        >
          {(p.userName || '?').slice(0, 1).toUpperCase()}
        </span>
      ))}
    </div>
  )
}
