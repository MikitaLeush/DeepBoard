import { SlidersHorizontal } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger, Switch } from '@/components/ui'
import { buttonVariants } from '@/components/ui/Button'
import type { BoardPerm } from '../../schemas/boards-schema'

const ROWS: { key: BoardPerm; label: string; hint: string }[] = [
  { key: 'allowEditText', label: 'Write in notes', hint: 'Change the text of existing notes' },
  { key: 'allowAddDelete', label: 'Add & delete notes', hint: 'Create new notes, remove notes' },
  { key: 'allowMove', label: 'Move & recolor notes', hint: 'Drag notes, change colour' },
  { key: 'allowStructure', label: 'Use groups & arrows', hint: 'Add, edit and delete groups and arrows' },
  { key: 'allowPlan', label: 'Run “Turn into plan”', hint: 'Spend AI credits to generate the plan' },
]

/** Owner-only. `data` is the raw board row; a missing flag counts as on (old boards). */
export function BoardSettings({
  data,
  onChange,
}: {
  data: Record<string, unknown>
  onChange: (patch: Record<string, boolean>) => void
}) {
  const on = (k: string) => data[k] === undefined || data[k] === null || (data[k] !== false && Number(data[k]) !== 0)
  const locked = data.locked === true || Number(data.locked) === 1

  return (
    <Popover>
      <PopoverTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        <SlidersHorizontal weight="bold" className="size-4" /> Permissions
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold">What others can do</h3>
        <p className="mb-3 text-xs text-muted-foreground">Applies to everyone else who opens this board. You can always do everything.</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
            <span>
              <span className="block text-sm font-medium">Read-only for everyone else</span>
              <span className="block text-xs text-muted-foreground">Overrides the switches below</span>
            </span>
            <Switch checked={locked} onCheckedChange={(v) => onChange({ locked: v })} />
          </label>
          {ROWS.map((r) => (
            <label key={r.key} className="flex items-center justify-between gap-3 px-1">
              <span>
                <span className="block text-sm font-medium">{r.label}</span>
                <span className="block text-xs text-muted-foreground">{r.hint}</span>
              </span>
              <Switch checked={on(r.key)} disabled={locked} onCheckedChange={(v) => onChange({ [r.key]: v })} />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
