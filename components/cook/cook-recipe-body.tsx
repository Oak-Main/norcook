'use client'

/**
 * Cook companion for the recipe body.
 *
 * Replaces the plain ingredient list and step list on the recipe page with the
 * same two-column layout, the same Tailwind classes and the same authored
 * content, plus the things a cook actually needs mid-recipe: check-off lines,
 * step tracking, previous/next navigation, an optional focused view, a shopping
 * list to copy, a print action and an explicit reset.
 *
 * Design constraints honoured here
 * --------------------------------
 * - **Nothing is duplicated.** The original lists are enhanced in place rather
 *   than shadowed by a second copy, so a printed page carries the ingredients
 *   and steps exactly once.
 * - **Authored wording is rendered verbatim.** Ingredient lines and step text go
 *   to the DOM exactly as the site publishes them. No parsing, no reflowing, no
 *   truncation.
 * - **Degrades to a plain recipe.** The full ingredient list and the full step
 *   list are server-rendered. With JavaScript disabled every control that needs
 *   scripting is `hidden`, and what remains is an ordinary, readable, printable
 *   recipe.
 * - **Progressive enhancement for checkboxes.** The checkboxes are real
 *   `<input type="checkbox">` elements and stay enabled without JavaScript, so
 *   they still work as a within-page scratchpad; only *persistence* needs
 *   scripting.
 */

import { useCallback, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Lightbulb, Maximize2, Minimize2, Printer, RotateCcw } from 'lucide-react'

import { RecommendedTools } from '@/components/recommended-tools'
import { buildShoppingList, emptyProgress, saveProgress } from '@/lib/cooking'
import type { ProgressState } from '@/lib/cooking'
import {
  getBoot,
  getServerBoot,
  resetStoredProgress,
  subscribeBoot,
} from '@/lib/cooking/boot'
import type { BootState } from '@/lib/cooking/boot'
import {
  checkedIngredientCount,
  completedStepCount,
  nextStep,
  previousStep,
  setActiveStep,
  stepProgress,
  toggleIngredient,
  toggleStep,
} from '@/lib/cooking/session'
import type { CookingPacket } from '@/lib/cooking'

type Tool = { name: string; note: string; href?: string }

export type CookRecipeBodyProps = {
  packet: CookingPacket
  chefTips?: string[]
  tools?: Tool[]
}

type CopyState =
  | { kind: 'idle' }
  | { kind: 'copied' }
  | { kind: 'failed'; text: string }

type StorageNotice =
  | { kind: 'none' }
  /** Storage refused to initialise or a write failed. Progress still works in memory. */
  | { kind: 'unavailable'; reason: string }
  /** Saved progress belongs to an older content revision. Not applied. */
  | { kind: 'stale' }

/** Stable identity so an untouched panel does not allocate on every render. */
const NO_PROGRESS: ProgressState = emptyProgress()

export function CookRecipeBody({ packet, chefTips, tools }: CookRecipeBodyProps) {
  /**
   * Stored progress is read as an external store rather than in an effect, so
   * the server render, the hydration render and the first client render all
   * agree. `subscribe` is called once; the snapshot is keyed by site, recipe and
   * revision inside `getBoot`.
   */
  const subscribe = useCallback((listener: () => void) => subscribeBoot(listener), [])
  const getSnapshot = useCallback(() => getBoot(packet), [packet])
  const boot: BootState = useSyncExternalStore(subscribe, getSnapshot, getServerBoot)

  /**
   * User edits win over storage. `null` means "nothing touched yet", which is
   * what lets restored progress appear the moment the client snapshot arrives.
   */
  const [edited, setEdited] = useState<ProgressState | null>(null)
  const [focused, setFocused] = useState(false)
  const [copy, setCopy] = useState<CopyState>({ kind: 'idle' })
  const [notice, setNotice] = useState<StorageNotice>({ kind: 'none' })
  const [announcement, setAnnouncement] = useState('')

  const headingId = useId()
  const progressLabelId = useId()
  const statusId = useId()
  const fallbackId = useId()

  const steps = packet.steps
  const ingredientTotal = useMemo(
    () => packet.groups.reduce((total, group) => total + group.items.length, 0),
    [packet.groups],
  )

  const progress = edited ?? boot.progress ?? NO_PROGRESS

  /**
   * The step the cook is looking at.
   *
   * Falls back to the first step when nothing is stored, so the panel always has
   * a position. Navigation uses this same value — otherwise the first press of
   * "Next" would move from "nothing" to step 1, which is already on screen, and
   * appear to do nothing.
   */
  const activeStepId = progress.activeStepId ?? steps[0]?.id ?? null

  // Stale progress is offered as a reset and is never applied. The stored ids
  // may describe different work, so restoring them could mark the wrong steps
  // complete.
  const effectiveNotice: StorageNotice =
    notice.kind !== 'none'
      ? notice
      : boot.load.status === 'stale'
        ? { kind: 'stale' }
        : boot.load.status === 'unavailable'
          ? { kind: 'unavailable', reason: boot.load.reason }
          : { kind: 'none' }

  /**
   * Applies a change and persists it in one place.
   *
   * Persistence lives here rather than in an effect so that a freshly mounted
   * panel never writes an empty state over progress it has not read yet.
   */
  const update = useCallback(
    (next: ProgressState) => {
      setEdited(next)
      const result = saveProgress(boot.storage, packet, next)
      if (!result.ok) setNotice({ kind: 'unavailable', reason: result.reason })
    },
    [boot.storage, packet],
  )

  const shoppingList = useMemo(
    () => buildShoppingList(packet, { source: 'norcook.app' }),
    [packet],
  )

  // --- interactions -------------------------------------------------------
  const toggleIngredientLine = useCallback(
    (id: string) => update(toggleIngredient(progress, id)),
    [update, progress],
  )

  const toggleStepLine = useCallback(
    (id: string) => update(toggleStep(progress, id)),
    [update, progress],
  )

  const goTo = useCallback(
    (stepId: string) => {
      update(setActiveStep(progress, stepId, steps))
      const target = document.querySelector<HTMLElement>(
        `[data-cook-step-id="${CSS.escape(stepId)}"]`,
      )
      target?.scrollIntoView({ block: 'nearest' })
    },
    [update, progress, steps],
  )

  const goPrevious = useCallback(() => {
    const target = previousStep(activeStepId, steps)
    if (target) goTo(target.id)
  }, [activeStepId, steps, goTo])

  const goNext = useCallback(() => {
    const target = nextStep(activeStepId, steps)
    if (target) goTo(target.id)
  }, [activeStepId, steps, goTo])

  const copyShoppingList = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(shoppingList)
      // Only reached when the write actually resolved. Nothing here reports a
      // copy that did not happen.
      setCopy({ kind: 'copied' })
      setAnnouncement('Shopping list copied to the clipboard.')
    } catch {
      setCopy({ kind: 'failed', text: shoppingList })
      setAnnouncement(
        'Clipboard access was refused, so the shopping list is shown below as selectable text.',
      )
    }
  }, [shoppingList])

  const resetProgress = useCallback(() => {
    resetStoredProgress(boot.storage, packet)
    setEdited(emptyProgress())
    setCopy({ kind: 'idle' })
    setNotice({ kind: 'none' })
    setAnnouncement('Cooking progress cleared for this recipe.')
  }, [boot.storage, packet])

  const doneSteps = completedStepCount(progress)
  const checkedIngredients = checkedIngredientCount(progress, ingredientTotal)
  const canGoPrevious = previousStep(activeStepId, steps) !== null
  const canGoNext = nextStep(activeStepId, steps) !== null
  const percentComplete = Math.round(stepProgress(progress, steps.length) * 100)

  return (
    <div className="contents" data-cook-root="">
      {/* ---------------------------------------------------------------- */}
      {/* Control bar                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="cook-bar lg:col-span-2"
        data-cook-bar=""
        {...(boot.enhanced ? {} : { hidden: true })}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-[11rem] flex-1">
            <p
              id={progressLabelId}
              className="text-sm font-semibold text-foreground"
              data-cook-progress-label=""
            >
              {doneSteps} of {steps.length} steps done
              <span className="sr-only">, {checkedIngredients} of {ingredientTotal} ingredients gathered</span>
            </p>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-labelledby={progressLabelId}
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneSteps}
              aria-valuetext={`${doneSteps} of ${steps.length} steps done`}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" data-cook-controls="">
            <button
              type="button"
              onClick={goPrevious}
              disabled={!canGoPrevious}
              className="cook-button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="cook-button"
            >
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setFocused((value) => !value)}
              aria-pressed={focused}
              className="cook-button"
            >
              {focused ? (
                <Minimize2 aria-hidden="true" className="size-4" />
              ) : (
                <Maximize2 aria-hidden="true" className="size-4" />
              )}
              {focused ? 'Show full recipe' : 'Focus mode'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="cook-button"
            >
              <Printer aria-hidden="true" className="size-4" />
              Print
            </button>
            <button
              type="button"
              onClick={resetProgress}
              className="cook-button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Progress is saved in this browser on this device only. Nothing is uploaded,
          and clearing your browser data removes it.
        </p>

        {effectiveNotice.kind === 'unavailable' && (
          <p
            className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground"
            data-cook-storage-notice=""
          >
            Progress is not being saved right now ({effectiveNotice.reason}) You can still
            check items off and move through the steps for this visit.
          </p>
        )}

        {effectiveNotice.kind === 'stale' && (
          <div
            className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2"
            data-cook-stale-notice=""
          >
            <p className="text-xs leading-relaxed text-foreground">
              <strong className="font-semibold">
                This recipe has changed since your last visit.
              </strong>{' '}
              Your saved progress was not restored, because the old step numbers may
              no longer describe the same work.
            </p>
            <button
              type="button"
              onClick={resetProgress}
              className="cook-button mt-2"
            >
              Start fresh
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Ingredients rail                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="lg:sticky lg:top-24 lg:self-start" data-cook-ingredients="">
        <h2
          id={headingId}
          className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground"
        >
          Ingredients
        </h2>

        {ingredientTotal > 0 ? (
          <>
            <ul className="mt-5 flex flex-col gap-2" aria-labelledby={headingId}>
              {packet.groups.map((group) => (
                <li key={group.id}>
                  {group.title && (
                    <p
                      className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:mt-0"
                      data-cook-group-title=""
                    >
                      {group.title}
                    </p>
                  )}
                  <ul className="flex flex-col gap-2">
                    {group.items.map((item) => {
                      const checked = progress.checkedIngredients.includes(item.id)
                      return (
                        <li key={item.id}>
                          <label
                            className="cook-ingredient"
                            data-cook-ingredient-id={item.id}
                            data-checked={checked ? 'true' : 'false'}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleIngredientLine(item.id)}
                              className="cook-checkbox"
                            />
                            <span className="cook-checkbox-box" aria-hidden="true">
                              <Check className="size-3.5" />
                            </span>
                            {/* Authored line, verbatim. */}
                            <span className="flex-1">{item.text}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            <div
              className="mt-6 flex flex-col gap-2"
              data-cook-js-only=""
              {...(boot.enhanced ? {} : { hidden: true })}
            >
              <button
                type="button"
                onClick={copyShoppingList}
                className="cook-button self-start"
                data-cook-copy=""
              >
                <Copy aria-hidden="true" className="size-4" />
                Copy shopping list
              </button>
              <p className="text-xs text-muted-foreground">
                {copy.kind === 'copied' && 'Shopping list copied to your clipboard.'}
              </p>

              {copy.kind === 'failed' && (
                <div data-cook-copy-fallback="">
                  <label
                    htmlFor={fallbackId}
                    className="text-xs font-medium text-foreground"
                  >
                    Clipboard unavailable — select and copy this list manually
                  </label>
                  <textarea
                    id={fallbackId}
                    readOnly
                    rows={12}
                    value={copy.text}
                    ref={(node) => {
                      if (node) {
                        node.focus()
                        node.select()
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground"
                  />
                </div>
              )}

              {!packet.scaling.available && (
                <p
                  className="mt-3 text-xs leading-relaxed text-muted-foreground"
                  data-cook-scaling-note=""
                  data-cook-js-only=""
                  {...(boot.enhanced ? {} : { hidden: true })}
                >
                  {packet.scaling.reason}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            No ingredient list is published for this recipe.
          </p>
        )}

        {tools && tools.length > 0 && (
          <div className="mt-8">
            <RecommendedTools tools={tools} />
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Steps column                                                    */}
      {/* ---------------------------------------------------------------- */}
      <div data-cook-steps="">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Step-by-Step Instructions
        </h2>

        {focused && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Focus mode shows one step at a time. Choose{' '}
            <strong className="font-semibold text-foreground">Show full recipe</strong>{' '}
            to see every step, or print the recipe to take all of it with you.
          </p>
        )}

        <ol
          className="mt-5 flex flex-col gap-4"
          aria-label="Cooking steps"
          data-cook-focused={focused ? 'true' : 'false'}
          data-cook-active-step={activeStepId ?? ''}
        >
          {steps.map((step) => {
            const done = progress.completedSteps.includes(step.id)
            const isActive = step.id === activeStepId
            return (
              <li
                key={step.id}
                data-cook-step-id={step.id}
                data-cook-step={String(step.order)}
                data-cook-done={done ? 'true' : 'false'}
                data-cook-active={isActive ? 'true' : 'false'}
                className="cook-step"
              >
                <div className="flex gap-4">
                  <label className="cook-step-marker">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleStepLine(step.id)}
                      className="cook-checkbox"
                    />
                    <span className="cook-step-number" aria-hidden="true">
                      {step.order}
                    </span>
                    <span className="sr-only">
                      Mark step {step.order} of {steps.length} complete
                    </span>
                  </label>
                  {/* Authored instruction, verbatim. */}
                  <p className="cook-step-text">{step.text}</p>
                </div>
              </li>
            )
          })}
        </ol>

        {chefTips && chefTips.length > 0 && (
          <div className="mt-10 space-y-4">
            {chefTips.map((tip, index) => (
              <div
                key={index}
                className="flex gap-3 rounded-xl border border-accent/40 bg-accent/10 p-5"
              >
                <Lightbulb className="size-5 shrink-0 text-accent" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Chef&apos;s Tip
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {tip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite" id={statusId}>
        {announcement}
      </span>
    </div>
  )
}