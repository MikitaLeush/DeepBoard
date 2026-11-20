import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eraser, LinkSimple, Lock, Sparkle } from '@phosphor-icons/react'
import { useAuthProfileReady, useMutations, useQuery } from 'deepspace'
import { Button, useToast } from '@/components/ui'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Canvas } from '../../../../components/board/Canvas'
import { PlanPanel } from '../../../../components/board/PlanPanel'
import { BoardSettings } from '../../../../components/board/BoardSettings'
import { callAction } from '../../../../lib/actions'
import type { BoardPerm } from '../../../../schemas/boards-schema'

type Board = { title: string; locked: boolean | number } & Partial<Record<BoardPerm, boolean | number>>

export default function BoardPage() {
  const { boardId = '' } = useParams()
  const { user } = useAuthProfileReady({ requireUser: true })
  const { records, status } = useQuery<Board>('boards')
  const { put } = useMutations<Board>('boards')
  const { success, error } = useToast()
  const [editing, setEditing] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Two-click confirm (3s window) instead of a blocking browser dialog.
  const onClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    setConfirmClear(false)
    callAction('clearBoard', { boardId }).catch((e: Error) => error('Could not clear the board', e.message))
  }

  const board = records.find((r) => r.recordId === boardId)
  if (status === 'loading')
    return (
      <div aria-busy="true" className="flex h-full flex-col">
        <div className="flex h-12 items-center gap-3 border-b border-border px-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex-1 animate-pulse bg-kraft/50" />
      </div>
    )
  if (!board)
    return (
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none tracking-tight">Board not found</h1>
        <p className="mt-3 max-w-[44ch] text-muted-foreground">The link may be wrong, or the owner may have removed it. Boards you own are listed on your boards page.</p>
        <Link to="/home" className={cn(buttonVariants(), 'mt-6')}>
          Back to my boards
        </Link>
      </div>
    )

  const isOwner = board.createdBy === user?.id
  const locked = board.data.locked === true || Number(board.data.locked) === 1
  // Same rule as the server (canWriteBoard): UI only mirrors it, the actions enforce it.
  const allowed = (k: BoardPerm) =>
    isOwner || (!locked && board.data[k] !== false && !(board.data[k] !== undefined && board.data[k] !== null && Number(board.data[k]) === 0))
  const can = { editText: allowed('allowEditText'), addDelete: allowed('allowAddDelete'), move: allowed('allowMove'), structure: allowed('allowStructure') }

  return (
    <div className="flex h-full flex-col">
      {/* Same 80rem column as the top nav (padding keeps it a single element). */}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-background py-1.5 pl-[max(1rem,calc((100%-80rem)/2+1rem))] pr-[max(1rem,calc((100%-80rem)/2+1rem))]">
        <Link to="/home" aria-label="Back to my boards" className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground">
          <ArrowLeft weight="bold" className="size-4" />
        </Link>
        {isOwner && editing !== null ? (
          <input
            autoFocus
            value={editing}
            maxLength={80}
            aria-label="Board title"
            onChange={(e) => setEditing(e.target.value)}
            onBlur={() => {
              if (editing.trim() && editing !== board.data.title) put(boardId, { title: editing.trim() })
              setEditing(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="h-8 min-w-0 rounded-md border border-input bg-card px-2 font-[family-name:var(--font-display)] text-lg font-bold"
          />
        ) : (
          <h1
            className={`min-w-0 truncate rounded-md px-1.5 font-[family-name:var(--font-display)] text-lg font-bold ${isOwner ? 'cursor-text hover:bg-secondary' : ''}`}
            onClick={() => isOwner && setEditing(board.data.title)}
            title={isOwner ? 'Click to rename' : undefined}
          >
            {board.data.title}
          </h1>
        )}
        {locked && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            <Lock weight="bold" className="size-3" aria-hidden /> {isOwner ? 'Read-only for others' : 'Read-only, locked by the owner'}
          </span>
        )}
        <div className="flex-1" />
        {isOwner && (
          <>
            <BoardSettings data={board.data as unknown as Record<string, unknown>} onChange={(patch) => put(boardId, patch)} />
            <Button variant={confirmClear ? 'destructive' : 'outline'} size="sm" onClick={onClear}>
              <Eraser className="size-4" /> {confirmClear ? 'Click again to clear everything' : 'Clear'}
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(window.location.href).then(() => success('Link copied', 'Anyone signed in can open it.'))}
        >
          <LinkSimple weight="bold" className="size-4" /> Share
        </Button>
        <Button variant="highlighter" size="sm" aria-pressed={showPlan} onClick={() => setShowPlan((s) => !s)}>
          <Sparkle weight="fill" className="size-4" /> Plan
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <Canvas boardId={boardId} can={can} />
        </div>
        {showPlan && <PlanPanel boardId={boardId} canRun={allowed('allowPlan')} onClose={() => setShowPlan(false)} />}
      </div>
    </div>
  )
}
