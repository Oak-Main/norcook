import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Structural guard on the print stylesheet.
 *
 * This asserts the *presence* of the rules the print behaviour depends on. It
 * is not a substitute for the Playwright print suite, which evaluates the CSS in
 * a real browser under `media: print` and proves the rendered result. This test
 * exists so that deleting a rule fails fast here rather than silently at review.
 */

const cssPath = fileURLToPath(new URL('../../app/cook.css', import.meta.url))

/**
 * Returns the `@media print { … }` body, brace-balanced.
 *
 * Matches the at-rule followed by its brace, so the mention of `@media print` in
 * the file's header comment is not mistaken for the rule itself.
 */
function printBlock(css: string): string {
  const match = /@media\s+print\s*\{/.exec(css)
  expect(match, 'no @media print block found in app/cook.css').not.toBeNull()
  const open = match!.index + match![0].length - 1
  let depth = 0
  let body = ''
  for (let i = open; i < css.length; i += 1) {
    const char = css[i]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return body
    }
    body += char
  }
  throw new Error('unbalanced @media print block')
}

const css = readFileSync(cssPath, 'utf8')
const print = printBlock(css)

describe('print stylesheet structure', () => {
  it('declares a page box with real margins', () => {
    expect(print).toMatch(/@page\s*\{[^}]*margin:/)
  })

  it('hides the site chrome', () => {
    expect(print).toMatch(/header,[\s\S]*?footer/)
  })

  it('hides the control bar without hiding recipe content', () => {
    expect(print).toContain('[data-cook-bar]')
    expect(print).toMatch(/\[data-cook-bar\][^{]*\{[^}]*display:\s*none\s*!important/)
  })

  it('forces hidden steps to print — the rule the print tests protect', () => {
    expect(print).toMatch(
      /\[data-cook-focused='true'\]\s*\.cook-step:not\(\[data-cook-active='true'\]\)\s*\{[^}]*display:\s*block\s*!important/,
    )
  })

  it('hides interactive checkboxes while keeping their text', () => {
    expect(print).toMatch(/\.cook-checkbox[^{]*\{[^}]*display:\s*none\s*!important/)
    // The authored text container is not hidden anywhere in the print block.
    expect(print).not.toMatch(/\.flex-1[^{]*\{[^}]*display:\s*none/)
  })

  it('flattens the hero instead of deleting it, and keeps its text legible', () => {
    expect(print).toContain('[data-recipe-hero]')
    expect(print).toMatch(/\[data-recipe-hero\][^{]*\{[^}]*position:\s*static\s*!important/)
    // White overlay text must be forced to black, or the title prints invisible.
    expect(print).toMatch(/\[data-recipe-hero\][^{]*\*[^{]*\{[^}]*color:\s*#000\s*!important/)
  })

  it('unpins sticky elements so paged content cannot be clipped', () => {
    expect(print).toMatch(
      /\[data-cook-ingredients\][^{]*\{[^}]*position:\s*static\s*!important/,
    )
  })

  it('keeps recipe blocks from splitting across pages', () => {
    expect(print).toContain('break-inside: avoid')
    expect(print).toContain('page-break-inside: avoid')
  })

  it('does not print the promotional block', () => {
    expect(print).toContain('[data-cook-keep-off-print]')
  })
})

describe('screen stylesheet structure', () => {
  it('never sticks the control bar on narrow viewports', () => {
    const barRule = css.slice(css.indexOf('.cook-bar {'))
    const media = css.slice(css.indexOf('@media (max-width: 1023px)'))
    expect(barRule).toMatch(/position:\s*sticky/)
    expect(media.slice(0, 200)).toMatch(/position:\s*static/)
  })

  it('gives tap targets the 44px minimum', () => {
    expect(css).toMatch(/min-height:\s*2\.75rem/)
  })

  it('keeps a visible focus ring', () => {
    expect(css).toMatch(/focus-visible[\s\S]{0,200}outline:\s*3px solid var\(--ring\)/)
  })

  it('offsets scroll targets clear of the sticky bar', () => {
    expect(css).toMatch(/\.cook-step\s*\{[^}]*scroll-margin-top:/)
  })
})