import { useState } from 'react'
import { Sparkle, X } from '@phosphor-icons/react'
import { useQuery } from 'deepspace'
import { Button, useToast } from '@/components/ui'
import { callAction } from '../../lib/actions'

interface Plan {
  boardId: string
  content: string
  status: 'generating' | 'done' | 'error'
  error: string
}

const BOX = 'mt-[3px] size-3.5 shrink-0 rounded-[2px] border-[1.5px] border-foreground'

/** Renders the few Markdown shapes the prompt allows: ## / ### headings, "- " bullets and "- [ ]" checklist items. */
function PlanText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split('\n').map((l, i) => {
        if (l.startsWith('## '))
          return (
            <h3 key={i} className="mt-6 border-b border-border pb-1 font-[family-name:var(--font-display)] text-lg font-extrabold leading-tight tracking-tight first:mt-0">
              {l.slice(3)}
            </h3>
          )
        if (l.startsWith('### ')) return <h4 key={i} className="mt-3 font-semibold">{l.slice(4)}</h4>
        const task = /^- \[( |x|X)\] (.*)$/.exec(l)
        if (task)
          return (
            <p key={i} className="flex gap-2.5">
              <span className={`${BOX} ${task[1] === ' ' ? '' : 'bg-foreground'}`} aria-hidden />
              <span>{task[2]}</span>
            </p>
          )
        if (l.startsWith('- '))
          return (
            <p key={i} className="flex gap-2.5">
              <span className="mt-[9px] size-1 shrink-0 rounded-full bg-foreground" aria-hidden />
              <span>{l.slice(2)}</span>
            </p>
          )
        return l.trim() ? <p key={i}>{l}</p> : null
      })}
    </div>
  )
}

export function PlanPanel({ boardId, canRun, onClose }: { boardId: string; canRun: boolean; onClose: () => void }) {
  const { records } = useQuery<Plan>('plans', { where: { boardId } })
  const { error } = useToast()
  const [starting, setStarting] = useState(false)
  const plan = records[0]?.data
  const busy = starting || plan?.status === 'generating'

  const run = () => {
    setStarting(true)
    callAction('generatePlan', { boardId })
      .catch((e: Error) => error('Could not make a plan', e.message))
      .finally(() => setStarting(false))
  }

  return (
    <aside aria-label="Plan" className="flex w-full max-w-[400px] shrink-0 flex-col border-l border-border bg-shell sm:w-[400px]">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Plan</h2>
        <button aria-label="Close plan" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground">
          <X weight="bold" className="size-4" />
        </button>
      </div>

      {/* The plan is a printed sheet, set apart from the wall. */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        <div className="min-h-full rounded-[2px] bg-card px-5 py-6 shadow-[0_6px_16px_-8px_rgba(60,40,10,0.45)]">
          {plan?.content ? (
            <PlanText text={plan.content} />
          ) : busy ? (
            <div aria-busy="true" className="animate-pulse space-y-3">
              <div className="h-5 w-1/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ) : (
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold">No plan yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a few notes, then press the button below. The AI groups them into themes and drafts the goal, action items and open questions.</p>
            </div>
          )}
          {plan?.status === 'error' && <p role="alert" className="mt-4 text-sm text-destructive">{plan.error}</p>}
        </div>
      </div>

      <div className="border-t border-border bg-background p-3">
        <Button variant="highlighter" onClick={run} disabled={busy || !canRun} className="w-full">
          <Sparkle weight="fill" className="size-4" />
          {busy ? 'Writing the plan' : plan ? 'Write a new plan' : 'Turn into plan'}
        </Button>
        {!canRun && <p className="mt-2 text-center text-xs text-muted-foreground">The board owner has turned this off.</p>}
      </div>
    </aside>
  )
}
