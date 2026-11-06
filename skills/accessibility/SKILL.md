---
name: accessibility
description: Use when adding or changing any user-facing component, choosing colours for states, designing a status, severity or badge display, building icon-only controls, writing a dialog or form, or reviewing UI for accessibility - including "is this contrast enough?", "can this be colour only?", "what does this chip need?", "does this need an aria-label?".
---

# Accessibility

## Overview

Colour may reinforce meaning but never carry it alone, and every threshold here is
measurable: meet it, do not eyeball it. Rules are ordered from the ones hit most often
(colour and status display) to general WCAG practice.

## When to use

- Any new or changed UI, before it is reviewed.
- Choosing a palette for states or severities.
- Reviewing a PR that touches templates or styles.

Not for information architecture, states or copy (`ux-design`), or tokens and type scale
(the design system doc).

## 1. Never rely on colour alone (WCAG 1.4.1)

Every state must also be distinguishable by text, icon or shape. A status has a visible
label or, at minimum, an icon plus an accessible name. "Red = bad, green = good" with no
other cue fails for colour-blind users (about 8% of men) and anyone on a greyscale or
low-vision display.

## 2. Status indicators: chips, lozenges, badges

- **One foreground for every state.** Mixing light text on some chips and dark on others
  reads as inconsistent and hurts scanning. Pick one accessible foreground and use it for
  all states.
- **Two cues, not one.** Background tint is the secondary cue; label text or icon is the
  primary.
- **Escalate severity with weight, not a foreground swap.** Warning and error states add a
  more saturated fill, a coloured border and a bolder label while keeping the same text
  colour. Calm states stay quiet so urgent ones pop.

Worked example:

| State | Background | Border | Weight | Text |
| --- | --- | --- | --- | --- |
| default / success / active | pale tint | none | 500 | dark navy `#172B4D` |
| warning | vivid amber `#FFE380` | `#B38600` | 600 | `#172B4D` |
| failed | light red `#FFC7C2` | `#C9372C` | 600 | `#172B4D` |

Anti-patterns: white text on one chip and dark on another; white text on amber (fails
contrast; yellow needs dark text); a bare coloured dot as the only status cue.

## 3. Contrast thresholds (WCAG 1.4.3 / 1.4.11)

- Body and label text: >= 4.5:1 against its background (AA). Aim for 7:1 where easy.
- Large text (>= 24 px, or >= 18.66 px bold): >= 3:1.
- Non-text (borders, icons, focus rings, anything that conveys state or boundary): >= 3:1
  against adjacent colours.
- Verify with a calculator (WebAIM's contrast checker); never assume.

## 4. Icons

- Decorative: `aria-hidden="true"` so screen readers skip them.
- Meaningful (icon-only buttons, status icons without text): an accessible name via
  `aria-label` or an adjacent visually hidden label.
- Never state by icon colour alone; pair with shape or text.

## 5. Keyboard and focus

- Every interactive element reachable and operable by keyboard (Tab, Shift+Tab, Enter,
  Space; arrows for composite widgets).
- Never remove a focus outline without a replacement that meets the 3:1 non-text rule.
- Logical tab order. Trap focus only in modals, and return it to the trigger on close.

## 6. Names, roles and semantics (ARIA)

- Native elements first (`<button>`, `<a>`, `<nav>`, headings). The first rule of ARIA:
  do not use ARIA if a native element works.
- Every form control has an associated `<label>`, `aria-label` or `aria-labelledby`.
- Images have `alt`; decorative images use `alt=""`.
- `aria-live` regions for async status (toasts, async errors) so screen-reader users are
  told.

## 7. Motion and targets

- Respect `prefers-reduced-motion` for non-essential animation; spinners and looping
  motion carry an accessible status label.
- Touch targets >= 24 x 24 px (WCAG 2.5.8), ideally 44 x 44.
- Never convey information by position or sensory characteristics alone.

## Review checklist

- [ ] No information conveyed by colour alone (text or icon backup present)
- [ ] Status states share one foreground; severity shown by weight, border or fill
- [ ] Text contrast >= 4.5:1 (large >= 3:1); non-text, borders and focus >= 3:1
- [ ] Decorative icons hidden; meaningful icons have accessible names
- [ ] Fully keyboard operable; visible focus styles; dialogs return focus
- [ ] Native semantics and labels for all controls; async updates announced

In PR review these are Critical: colour-alone state, failed contrast, a missing accessible
name on an interactive control.

## Gotchas

- A chip palette copied from a light theme fails contrast on a dark surface; recheck every
  pair when the surface changes.
- `disabled` controls are exempt from contrast rules but still need a visible reason
  (tooltip), otherwise they read as broken.
- An `aria-live` region added after the content changes announces nothing; it must exist
  before the update.
- A focus ring styled only with `outline-color` disappears when a reset sets
  `outline: none`; use `:focus-visible` with an explicit outline.

## References

- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- WebAIM, Contrast and Color Accessibility: https://webaim.org/articles/contrast/
- Carbon Design System, status indicator pattern
- PatternFly, status and severity pattern

## Adapt to your repo

- The one foreground colour and the three example backgrounds: replace with your palette
  after checking each pair against your surface colour.
- Name your chip component so reviewers grep for it.
- If you have a dark and a light theme, add a second worked table.
- Delete the touch-target line if the product is desktop-only (keep focus and keyboard).

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
