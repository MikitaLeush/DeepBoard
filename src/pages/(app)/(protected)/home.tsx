import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Plus } from '@phosphor-icons/react'
import { useAuthProfileReady, useMutations, useQuery } from 'deepspace'
import { Button, useToast } from '@/components/ui'
import { NOTE_STYLE } from '../../../lib/note-style'
import { NOTE_COLORS } from '../../../schemas/notes-schema'

interface Board {
  title: string
  locked: boolean | number
}

/** Two stuck notes, coloured from the board id so each board is recognisable at a glance. */
function BoardGlyph({ id }: { id: string }) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const back = NOTE_STYLE[NOTE_COLORS[h % NOTE_COLORS.length]]
  const front = NOTE_STYLE[NOTE_COLORS[(h >>> 4) % NOTE_COLORS.length]]
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="3" y="6" width="18" height="18" rx="2" fill={back.bg} transform="rotate(-7 12 15)" />
      <rect x="11" y="9" width="18" height="18" rx="2" fill={front.bg} stroke="#1f1b16" strokeOpacity="0.75" strokeWidth="1.2" />
    </svg>
  )
}

function RowSkeleton() {
  return (
    <li className="flex animate-pulse items-center gap-4 py-4">
      <div className="size-8 rounded bg-muted" />
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="ml-auto h-4 w-14 rounded bg-muted" />
    </li>
  )
}

export default function HomePage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const navigate = useNavigate()
  const { error } = useToast()
  const { records, status } = useQuery<Board>('boards', { orderBy: 'createdAt', orderDir: 'desc' })
  const { ready, createConfirmed } = useMutations<Board>('boards')
  const [creating, setCreating] = useState(false)

  // Boards are reached by link; this list is only the ones you own.
  const mine = records.filter((r) => r.createdBy === user?.id)

  const create = async () => {
    setCreating(true)
    try {
      const id = await createConfirmed({ title: 'Untitled board', locked: false })
      navigate(`/b/${id}`)
    } catch (e) {
      error('Could not create the board', e instanceof Error ? e.message : 'Try again in a moment.')
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <div className="flex max-w-3xl flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none tracking-tight">Your boards</h1>
          <p className="mt-3 max-w-[48ch] text-muted-foreground">Boards you create show up here. A board someone shares with you opens from their link.</p>
        </div>
        <Button onClick={create} disabled={!ready} loading={creating}>
          <Plus weight="bold" /> New board
        </Button>
      </div>

      <div className="mt-10 max-w-3xl">
        {status === 'loading' ? (
          <ul aria-busy="true" className="divide-y divide-border border-y border-border">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </ul>
        ) : mine.length === 0 ? (
          <div className="flex flex-col items-start gap-5 border-y border-border py-12 sm:flex-row sm:items-center sm:gap-10">
            <div className="relative shrink-0 rotate-[-2deg] rounded-[2px] p-4 pt-5 shadow-[0_10px_16px_-10px_rgba(60,40,10,0.6)]" style={{ background: NOTE_STYLE.yellow.bg, width: 190 }}>
              <div className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 bg-tape/90 [clip-path:polygon(0_0,100%_0,98%_50%,100%_100%,0_100%,2%_50%)]" />
              <p className="font-[family-name:var(--font-hand)] text-2xl leading-[1.1]">Your first idea goes here</p>
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">The wall is empty</h2>
              <p className="mt-1.5 max-w-[44ch] text-muted-foreground">Make a board, add a few notes, and ask for a plan. Share the link to write on it together.</p>
              <Button onClick={create} disabled={!ready} loading={creating} className="mt-4">
                Start your first board
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {mine.map((b) => {
              const locked = Number(b.data.locked) === 1 || b.data.locked === true
              return (
                <li key={b.recordId}>
                  <Link
                    to={`/b/${b.recordId}`}
                    className="-mx-3 flex items-center gap-4 rounded-md px-3 py-4 transition-colors duration-150 hover:bg-secondary"
                  >
                    <BoardGlyph id={b.recordId} />
                    <span className="min-w-0 flex-1 truncate font-medium">{b.data.title}</span>
                    {locked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        <Lock weight="bold" className="size-3" aria-hidden /> Read-only for others
                      </span>
                    )}
                    <time dateTime={b.createdAt} className="shrink-0 text-sm text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </time>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
