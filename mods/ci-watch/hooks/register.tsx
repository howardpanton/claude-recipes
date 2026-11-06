import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Poll, Run } from '../types'

type Engine = EngineInterface

// ---------------------------------------------------------------------------
// Config: the only block to edit when adopting this mod.
// ---------------------------------------------------------------------------
const HOST = 'https://ci.example.com' // Jenkins base URL, no trailing slash
// Job paths under HOST, as the Jenkins URL spells them: job/<folder>/job/<name>/job/<branch>.
const JOBS = [
  { label: 'Build', path: 'job/<folder>/job/<repo>/job/<integration-branch>' },
  { label: 'Deploy', path: 'job/<folder>/job/<repo>-deploy/job/<integration-branch>' },
]
// Jobs whose ABORTED result may still have deployed (see isAbortedDeploy).
const DEPLOY_LABELS = ['Deploy']
const EVERY_MS = 90_000
// Credentials: `curl -n` reads ~/.netrc. Add a line there, never a token here:
//   machine ci.example.com login <user> password <api-token>
const CURL = ['curl', '-snf', '--max-time', '15']
// ---------------------------------------------------------------------------

const PANE = 'ci'
const COMMAND = 'ci'
const MARK: Record<string, string> = { SUCCESS: '✓', FAILURE: '✗', UNSTABLE: '!', ABORTED: '⊘', NOT_BUILT: '–' }
const COLOUR: Record<string, string> = { SUCCESS: 'green', FAILURE: 'red', UNSTABLE: 'yellow' }

const poll = atom({ plugin: 'ci-watch', key: 'poll' } as const, null)

async function getJson<T>($: Engine, url: string): Promise<T> {
  const r = await $.process.run([...CURL, url], { timeoutMs: 20_000 })
  if (r.exitCode !== 0) throw new Error(`curl exit ${r.exitCode}`)
  return JSON.parse(r.stdout) as T
}

async function fetchRun($: Engine, job: { label: string; path: string }): Promise<Run> {
  type Build = { number: number; result: string | null; building: boolean; url: string; timestamp: number; duration: number }
  const b = await getJson<Build>($, `${HOST}/${job.path}/lastBuild/api/json?tree=number,result,building,url,timestamp,duration`)
  // pendingInputActions lists the input() gates a running build is paused on.
  const pending = b.building
    ? await getJson<{ message?: string }[]>($, `${b.url}wfapi/pendingInputActions`).catch(() => [])
    : []
  return {
    label: job.label,
    number: b.number,
    result: b.result,
    isBuilding: b.building,
    url: b.url,
    startedAt: b.timestamp,
    durationMs: b.duration,
    gate: pending.length > 0 ? (pending[0]?.message ?? 'input') : null,
  }
}

// Learned the hard way: an abort that lands during a deploy job's prepare stage can
// be swallowed, and the job still applies its infrastructure change. ABORTED on a
// deploy job means "check the console", never "nothing happened".
const isAbortedDeploy = (r: Run): boolean => DEPLOY_LABELS.includes(r.label) && r.result === 'ABORTED'

function announce($: Engine, before: Run | undefined, now: Run): void {
  if (!before) return
  const name = `${now.label} #${now.number}`
  if (now.gate && now.gate !== before.gate) {
    $.ui.toast(`CI ${name} is waiting for approval: ${now.gate}`, { timeoutMs: 15_000 })
  }
  const hasFinished = !now.isBuilding && (before.isBuilding || before.number !== now.number)
  if (hasFinished && isAbortedDeploy(now)) {
    $.ui.toast(`CI ${name} ABORTED, but it may still have deployed: check its console for the apply step`, {
      timeoutMs: 15_000,
    })
  } else if (hasFinished) {
    $.ui.toast(`CI ${name} finished: ${now.result}`, { timeoutMs: 8_000 })
  }
}

const runMark = (r: Run): string =>
  r.gate ? '⏸ approval' : r.isBuilding ? '…' : (MARK[r.result ?? ''] ?? r.result ?? '?')

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 90) return `${s}s`
  if (s < 5400) return `${Math.round(s / 60)}m`
  if (s < 172_800) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86_400)}d`
}

async function refresh($: Engine): Promise<void> {
  const before = await read($, poll)
  const settled = await Promise.allSettled(JOBS.map(job => fetchRun($, job)))
  const runs = settled.flatMap(s => (s.status === 'fulfilled' ? [s.value] : []))
  const failed = settled.length - runs.length
  for (const run of runs) announce($, before?.runs.find(r => r.label === run.label), run)

  const next: Poll = {
    runs,
    checkedAt: await $.clock.now(),
    error: failed > 0 ? `${failed} of ${JOBS.length} jobs unreachable (VPN, or the ~/.netrc token?)` : null,
  }
  await update($, poll, () => next)
  $.ui.status(
    runs.length > 0
      ? `CI ${runs.map(r => `${r.label} #${r.number} ${runMark(r)}`).join(' · ')}`
      : `CI: ${next.error}`,
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({ name: COMMAND, description: 'Show the CI jobs for the integration branch in a pane' })
    void refresh($)
    $.clock.every(EVERY_MS, () => void refresh($))
    return started
  })

  on('command.run', { command: COMMAND }, async $ => {
    await $.ui.open({ id: PANE, title: 'CI' })
    void refresh($)
    return { text: 'CI pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Link, Text } = $.ui.resolve(e)
    const p = await read($, poll)
    const now = await $.clock.now()

    return (
      <Box flexDirection="column">
        {p === null && <Text dimColor>Checking CI...</Text>}
        {p?.runs.map(r => (
          <Box flexDirection="column" key={r.label}>
            <Box columnGap={1}>
              <Box width={7}>
                <Text>{r.label}</Text>
              </Box>
              <Box width={6}>
                <Link href={r.url} label={`#${r.number}`} />
              </Box>
              <Box width={11}>
                <Text color={r.gate ? 'yellow' : r.isBuilding ? 'cyan' : COLOUR[r.result ?? '']} dimColor={!r.isBuilding && !COLOUR[r.result ?? '']}>
                  {r.isBuilding && !r.gate ? 'running' : r.gate ? 'paused' : (r.result ?? '?')}
                </Text>
              </Box>
              <Text dimColor>
                {r.isBuilding ? `started ${ago(now - r.startedAt)} ago` : `${ago(now - r.startedAt - r.durationMs)} ago, took ${ago(r.durationMs)}`}
              </Text>
            </Box>
            {r.gate && <Text color="yellow">  waiting for approval: {r.gate}</Text>}
            {isAbortedDeploy(r) && <Text color="yellow">  aborted deploys can still apply: check the console for the apply step</Text>}
          </Box>
        ))}
        {p?.error && <Text color="red">{p.error}</Text>}
        <Box columnGap={1}>
          {p && <Text dimColor>checked {ago(now - p.checkedAt)} ago, every {EVERY_MS / 1000}s</Text>}
          <Button key="refresh" label="Refresh" hotkey="r" onPress={() => refresh($)} />
        </Box>
      </Box>
    )
  })
}
