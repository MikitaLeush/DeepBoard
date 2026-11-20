/**
 * Landing — STATIC page (no providers, prerendered). Keep it free of data/auth hooks.
 *
 * The hero is the wall itself: kraft paper, a group labelled with masking tape, notes, an arrow and the
 * printed plan. On desktop it is one absolutely-positioned composition; below 768px it is a plain grid
 * with no rotation or overlap.
 */

import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { Wordmark } from '../components/Wordmark'
import { NOTE_STYLE } from '../lib/note-style'
import type { NoteColor, NoteType } from '../schemas/notes-schema'
import { seo } from '../seo'

interface WallNote {
  text: string
  color: NoteColor
  type: NoteType
  x: number
  y: number
  w: number
  rot: number
}

// Coordinates are px inside the 560 x 470 wall (desktop only).
const WALL: WallNote[] = [
  { text: 'Send invites before launch', color: 'yellow', type: 'task', x: 18, y: 66, w: 150, rot: -3 },
  { text: 'Who owns the onboarding emails?', color: 'blue', type: 'question', x: 148, y: 150, w: 146, rot: 2 },
  { text: 'Talk to five users this week', color: 'green', type: 'idea', x: 366, y: 8, w: 150, rot: 4 },
  { text: 'Invite emails land in spam?', color: 'orange', type: 'risk', x: 372, y: 166, w: 150, rot: -2 },
]

const TYPE_LABEL: Record<NoteType, string> = { idea: 'Idea', question: 'Question', task: 'Task', risk: 'Risk' }

const STEPS = [
  {
    title: 'Write fast',
    body: 'Double-click anywhere to add a note, then mark it as an idea, question, task or risk. Everyone on the board types at the same time and sees each other’s cursors.',
  },
  {
    title: 'Show how it fits together',
    body: 'Right-click and drag to draw a box around notes that belong together. Drag from the dot on a note’s edge to another note to link them with an arrow.',
  },
  {
    title: 'Turn it into a plan',
    body: 'The AI reads the notes, boxes and arrows, then writes the goal, themes, action items and open questions. You watch it appear, and so does everyone else.',
  },
]

/** Masking-tape strip with torn ends. */
const TAPE = 'bg-tape/90 [clip-path:polygon(0_0,100%_0,98%_50%,100%_100%,0_100%,2%_50%)]'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-[100dvh] bg-background text-foreground">
        <section className="bg-kraft">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <header className="flex items-center justify-between py-5">
              <Wordmark />
              <Link to="/home" className="rounded-md px-3 py-1.5 text-sm font-medium underline-offset-4 hover:underline">
                Open your boards
              </Link>
            </header>

            <div className="grid items-center gap-12 pb-16 pt-8 md:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-8 lg:pb-12 lg:pt-0">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-balance text-[2.75rem] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                  Stick up the mess.
                  <br />
                  Get the plan.
                </h1>
                <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-foreground/85">
                  Your team puts notes on one shared wall, live. When it is full, one click groups them into themes and
                  drafts the goal, action items and open questions.
                </p>
                <Link
                  to="/home"
                  className="mt-8 inline-flex items-center rounded-md bg-foreground px-5 py-3 text-base font-medium text-background shadow-[0_6px_0_-3px_rgba(31,27,22,0.35)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px active:translate-y-px active:shadow-none"
                >
                  Start a board
                </Link>
                <p className="mt-3 text-sm text-foreground/70">Share the link. Anyone signed in can join.</p>
              </div>

              <div
                aria-hidden="true"
                className="grid grid-cols-2 gap-3 md:relative md:left-1/2 md:block md:h-[470px] md:w-[560px] md:-translate-x-1/2 lg:left-0 lg:translate-x-0"
              >
                {/* The group, outlined in marker and labelled with tape. */}
                <div className="absolute left-0 top-[22px] hidden h-[268px] w-[306px] rounded-lg border-2 border-dashed border-foreground/55 bg-foreground/[0.04] md:block" />
                <div className={`hero-stick absolute left-3.5 top-[8px] hidden px-4 py-1.5 font-[family-name:var(--font-hand)] text-lg leading-none md:block ${TAPE}`} style={{ '--rd': '-2deg', '--i': 0 } as CSSProperties}>
                  Launch week
                </div>

                {WALL.map((n, i) => (
                  <div
                    key={n.text}
                    className="hero-stick rounded-[2px] p-3 shadow-[0_8px_14px_-8px_rgba(60,40,10,0.65)] md:absolute md:left-(--x) md:top-(--y) md:w-(--w)"
                    style={{ background: NOTE_STYLE[n.color].bg, '--x': `${n.x}px`, '--y': `${n.y}px`, '--w': `${n.w}px`, '--rd': `${n.rot}deg`, '--i': i + 1 } as CSSProperties}
                  >
                    <span className="mb-1.5 inline-flex rounded-[2px] bg-foreground px-1.5 py-0.5 text-[10px] font-medium leading-none text-background">
                      {TYPE_LABEL[n.type]}
                    </span>
                    <p className="font-[family-name:var(--font-hand)] text-xl leading-[1.15]">{n.text}</p>
                  </div>
                ))}

                {/* One marker arrow, drawn in. */}
                <svg className="hero-draw pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 560 470">
                  <defs>
                    <marker id="lp-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="#1f1b16" />
                    </marker>
                  </defs>
                  <path d="M294,205 C338,205 328,222 372,222" fill="none" stroke="#1f1b16" strokeWidth="3" strokeLinecap="round" markerEnd="url(#lp-head)" />
                </svg>

                {/* The printed plan. */}
                <div className="hero-print relative col-span-2 rounded-[2px] bg-card p-4 pt-5 shadow-[0_14px_22px_-12px_rgba(60,40,10,0.7)] md:absolute md:left-[212px] md:top-[300px] md:w-[320px] md:rotate-[1.5deg]">
                  <div className={`absolute -top-2 left-6 hidden h-4 w-16 md:block ${TAPE}`} />
                  <div className={`absolute -top-2 right-6 hidden h-4 w-16 md:block ${TAPE}`} />
                  <p className="font-[family-name:var(--font-display)] text-base font-extrabold leading-tight">Plan: launch week</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">Goal: get the first 50 invited users in without losing the invite emails.</p>
                  <ul className="mt-2.5 space-y-1.5 text-[13px] leading-snug">
                    <li className="flex gap-2"><span className="mt-[3px] size-3 shrink-0 rounded-[2px] border-[1.5px] border-foreground" />Fix the invite emails before sending any</li>
                    <li className="flex gap-2"><span className="mt-[3px] size-3 shrink-0 rounded-[2px] border-[1.5px] border-foreground" />Talk to five users</li>
                  </ul>
                  <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">Open question: who owns the onboarding emails?</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                From pile to plan
              </h2>
              <p className="mt-3 max-w-[34ch] text-muted-foreground">Three steps, and the last one is a single click.</p>
            </div>
            <ol className="divide-y divide-border border-y border-border">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-5 py-7 lg:py-9" style={{ paddingLeft: `min(${i * 2.5}rem, 6vw)` }}>
                  <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none text-kraft-deep">{i + 1}</span>
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">{s.title}</h3>
                    <p className="mt-1.5 max-w-[56ch] leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:px-8">
            <Wordmark className="text-foreground" />
            <p>The plan is written by AI and uses the credits of whoever clicks the button.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
