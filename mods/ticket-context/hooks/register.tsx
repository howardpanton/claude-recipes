import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpToolResult, Register } from 'claude-code'

import type { Context, Pr, Ticket } from '../types'
import { githubIssue, jiraKey, linkedWorktree, parseRemote, shorten, tildify } from './parse'
import type { Remote } from './parse'

type Engine = EngineInterface

// ---------------------------------------------------------------------------
// Config: the only block to edit when adopting this mod (plus JIRA_PROJECTS in parse.ts).
// ---------------------------------------------------------------------------
const JIRA_SITE = '<jira-site>' // your Jira Cloud hostname: the part before /browse/ in a ticket URL
const JIRA_SERVER = 'claude.ai Atlassian Rovo' // the Jira MCP server's name as /mcp lists it
const BITBUCKET_SERVER = 'bitbucket' // the Bitbucket MCP server's name as /mcp lists it
const BITBUCKET_HOST = 'bitbucket.org'
const NETWORK_TTL_MS = 120_000 // how long a ticket/PR answer stays fresh while the branch is unchanged
// ---------------------------------------------------------------------------

const PANE = 'ticket'
const STATE_COLOUR: Record<string, string> = { OPEN: 'green', MERGED: 'magenta', DECLINED: 'red', CLOSED: 'red' }

const context = atom({ plugin: 'ticket-context', key: 'context' } as const, null)

// Branch and remote are one cheap git call each; the network lookups below are
// skipped while the branch is unchanged and the last answer is fresh.
async function git($: Engine, args: string[]): Promise<string | null> {
  const r = await $.process.run(['git', ...args]).catch(() => null)
  return r && r.exitCode === 0 ? r.stdout.trim() : null
}

// MCP tools answer with text blocks holding JSON; anything else is an error to show.
function json(result: McpToolResult): unknown {
  if (result.isError) throw new Error('the server reported an error')
  const text = result.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
  return JSON.parse(text)
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

async function jiraTicket($: Engine, key: string): Promise<Ticket> {
  const issue = rec(
    json(await $.mcp.call(JIRA_SERVER, 'getJiraIssue', { cloudId: JIRA_SITE, issueIdOrKey: key, fields: ['summary', 'status'] })),
  )
  const fields = rec(issue.fields)
  return { kind: 'jira', key, title: str(fields.summary), status: str(rec(fields.status).name), url: `https://${JIRA_SITE}/browse/${key}` }
}

// Bitbucket PRs of THIS repo only: the same branch, or a title naming the ticket.
async function bitbucketPrs($: Engine, remote: Remote, branch: string, key: string | null): Promise<Pr[]> {
  // Filtered server-side: the unfiltered open-PR list can exceed the MCP output limit.
  const filter = key ? { sourceBranch: branch, titleContains: key } : { sourceBranch: branch }
  const raw = json(await $.mcp.call(BITBUCKET_SERVER, 'list_pull_requests', { repoSlug: remote.repo, state: 'OPEN', ...filter }))
  const rows = Array.isArray(raw) ? raw : (rec(raw).values as unknown[] | undefined) ?? []
  return rows.flatMap(row => {
    const r = rec(row)
    const title = str(r.title) ?? ''
    const source = str(rec(rec(r.source).branch).name) ?? str(r.source_branch) ?? ''
    const isSameBranch = source === branch
    if (!isSameBranch && !(key && title.toUpperCase().includes(key))) return []
    const url =
      str(rec(rec(r.links).html).href) ?? str(r.url) ?? `https://${BITBUCKET_HOST}/${remote.owner}/${remote.repo}/pull-requests/${String(r.id)}`
    return [{ id: `#${String(r.id)}`, title, state: str(r.state) ?? 'OPEN', url, isSameBranch }]
  })
}

async function ghJson<T>($: Engine, args: string[], cwd?: string): Promise<T> {
  const r = await $.process.run(['gh', ...args], { cwd, timeoutMs: 20_000 })
  if (r.exitCode !== 0) throw new Error(`gh ${args[0]} ${args[1]}: exit ${r.exitCode}`)
  return JSON.parse(r.stdout) as T
}

async function githubContext($: Engine, branch: string, issue: string | null): Promise<{ ticket: Ticket | null; prs: Pr[] }> {
  type GhPr = { number: number; title: string; state: string; url: string }
  const fields = 'number,title,state,url'
  const [own, linked, found] = await Promise.all([
    ghJson<GhPr[]>($, ['pr', 'list', '--state', 'all', '--head', branch, '--json', fields]),
    issue ? ghJson<GhPr[]>($, ['pr', 'list', '--state', 'all', '--search', `#${issue}`, '--json', fields]) : Promise.resolve([] as GhPr[]),
    issue ? ghJson<{ title: string; state: string; url: string }>($, ['issue', 'view', issue, '--json', 'title,state,url']) : Promise.resolve(null),
  ])
  const own$ = new Set(own.map(p => p.number))
  const prs = [...own, ...linked.filter(p => !own$.has(p.number))].map(p => ({
    id: `#${p.number}`, title: p.title, state: p.state, url: p.url, isSameBranch: own$.has(p.number),
  }))
  const ticket: Ticket | null = found && issue ? { kind: 'github', key: `#${issue}`, title: found.title, status: found.state, url: found.url } : null
  return { ticket, prs }
}

async function refresh($: Engine, force = false): Promise<void> {
  const before = await read($, context)
  const rawBranch = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (rawBranch === null) {
    $.ui.status(undefined)
    await update($, context, () => null)
    return
  }
  const branch = rawBranch === 'HEAD' ? `(detached ${(await git($, ['rev-parse', '--short', 'HEAD'])) ?? ''})`.replace(' )', ')') : rawBranch
  const now = await $.clock.now()
  const remoteUrl = await git($, ['remote', 'get-url', 'origin'])
  const worktree = linkedWorktree(await git($, ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir']))
  if (!force && before && before.branch === branch && before.remote === remoteUrl && before.worktree === worktree && now - before.checkedAt < NETWORK_TTL_MS) return

  const remote = remoteUrl ? parseRemote(remoteUrl) : null
  const errors: string[] = []
  let ticket: Ticket | null = null
  let prs: Pr[] = []

  const key = jiraKey(branch)
  if (key) {
    ticket = await jiraTicket($, key).catch(e => {
      errors.push(`Jira ${key}: ${e instanceof Error ? e.message : 'failed'}`)
      return { kind: 'jira', key, title: null, status: null, url: `https://${JIRA_SITE}/browse/${key}` } satisfies Ticket
    })
  }
  if (remote?.host === 'bitbucket') {
    prs = await bitbucketPrs($, remote, branch, key).catch(e => {
      errors.push(`Bitbucket PRs: ${e instanceof Error ? e.message : 'failed'}`)
      return []
    })
  } else if (remote?.host === 'github') {
    const g = await githubContext($, branch, githubIssue(branch)).catch(e => {
      errors.push(e instanceof Error ? e.message : 'gh failed')
      return { ticket: null, prs: [] }
    })
    ticket = ticket ?? g.ticket
    prs = g.prs
  }

  const next: Context = { branch, worktree, remote: remoteUrl, ticket, prs, checkedAt: await $.clock.now(), errors }
  await update($, context, () => next)
  $.ui.status(statusLine(next))
}

function statusLine(c: Context): string {
  const parts = [
    c.ticket ? `${c.ticket.key}${c.ticket.status ? ` [${c.ticket.status}]` : ''}` : null,
    c.ticket?.title ? shorten(c.ticket.title, 48) : null,
    shorten(c.branch, 40),
    c.prs.length > 0 ? `${c.prs.length} PR${c.prs.length === 1 ? '' : 's'} ${c.prs.map(p => p.id).join(' ')}` : null,
  ]
  return parts.flatMap(p => (p ? [p] : [])).join(' · ')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({ name: 'ticket', description: 'Show the ticket, branch and related PRs for this work' })
    void refresh($, true)
    return started
  })

  // A branch switch is a tool call in a turn, so the end of the turn is the cheap place to notice it.
  on('turn.complete', async ($, e, next) => {
    void refresh($)
    return next(e)
  })

  on('command.run', { command: 'ticket' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Ticket' })
    void refresh($, true)
    return { text: 'Ticket pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Link, Text } = $.ui.resolve(e)
    const c = await read($, context)
    if (c === null) return <Text dimColor>Not in a git repository, or still checking...</Text>

    return (
      <Box flexDirection="column">
        <Box columnGap={1}>
          <Box width={8}><Text dimColor>Ticket</Text></Box>
          {c.ticket ? (
            <Box columnGap={1}>
              {c.ticket.url ? <Link href={c.ticket.url} label={c.ticket.key} /> : <Text>{c.ticket.key}</Text>}
              {c.ticket.status && <Text color="cyan">[{c.ticket.status}]</Text>}
              {c.ticket.title && <Text>{c.ticket.title}</Text>}
            </Box>
          ) : (
            <Text dimColor>none found in the branch name</Text>
          )}
        </Box>
        <Box columnGap={1}>
          <Box width={8}><Text dimColor>Branch</Text></Box>
          <Text>{c.branch}</Text>
        </Box>
        {c.worktree && (
          <Box columnGap={1}>
            <Box width={8}><Text dimColor>Worktree</Text></Box>
            <Text>{tildify(c.worktree)}</Text>
          </Box>
        )}
        <Box columnGap={1}>
          <Box width={8}><Text dimColor>PRs</Text></Box>
          {c.prs.length === 0 && <Text dimColor>none open for this branch or ticket in this repo</Text>}
        </Box>
        {c.prs.map(p => (
          <Box columnGap={1} key={p.url}>
            <Text>  </Text>
            <Link href={p.url} label={p.id} />
            <Text color={STATE_COLOUR[p.state.toUpperCase()]}>{p.state}</Text>
            <Text>{shorten(p.title, 70)}</Text>
            {!p.isSameBranch && <Text dimColor>(related)</Text>}
          </Box>
        ))}
        {c.errors.map(m => <Text key={m} color="red">{m}</Text>)}
        <Box columnGap={1}>
          <Button key="refresh" label="Refresh" hotkey="r" onPress={() => refresh($, true)} />
        </Box>
      </Box>
    )
  })
}
