import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../types'
import { bar, level, summary } from './format'

const snap = atom({ plugin: 'context-bar', key: 'snap' } as const, null)

const COLOR = { ok: 'green', warn: 'yellow', hot: 'red' } as const

// The free figures plus the local (no-API) breakdown, for the auto-compact threshold.
const refresh = async ($: EngineInterface): Promise<void> => {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const { tokens, window, breakdown } = usage.context
  if (tokens === undefined) return // no response in this window yet

  const next: Snapshot = {
    tokens,
    window,
    threshold: breakdown?.isAutoCompactEnabled ? breakdown.autoCompactThreshold : undefined,
    costUsd: usage.cost?.usd,
    limits: usage.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed })),
  }
  const seen: { prev: Snapshot | null } = { prev: null }
  await update($, snap, old => {
    seen.prev = old
    return next
  })

  // One nudge on the way into the red, not one per turn.
  if (level(next) === 'hot' && (seen.prev === null || level(seen.prev) !== 'hot')) {
    $.ui.toast(`Context ${summary(next).split(' · ')[0]} full: auto-compact is close`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snap)
    if (e.props.hasSurvey || s === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const width = Math.max(10, Math.min(30, e.props.bodyColumns - 60))

    return (
      <Box>
        <Text dimColor>ctx </Text>
        <Text color={COLOR[level(s)]}>{bar(s, width)}</Text>
        <Text wrap="truncate"> {summary(s)}</Text>
      </Box>
    )
  })
}
