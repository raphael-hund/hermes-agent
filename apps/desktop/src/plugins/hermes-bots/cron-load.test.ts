/**
 * `loadRoutines` — the pane's one read.
 *
 * 1. Profile scope (#37). cron.manage is scoped to the bot's OWN cron store
 *    through the core RPC's optional `profile` param. Older gateways ignore
 *    the unknown param, so the `[bot:]` tag filter in selectRoutineJobs stays
 *    the fallback.
 * 2. READ ONLY. The Focus workspace opens this pane at launch, so a read must
 *    never change a job. Legacy delegated routines used to be paused inline
 *    from the list path — opening the app then edited real schedules. Now the
 *    read is exactly one `list` call and returns the jobs as the gateway
 *    reported them; the row flags a legacy job and only a click pauses it.
 *
 * The RPC boundary is `host.request` rather than `requestForBot`, so the real
 * routing layer (route resolution, error coercion) runs.
 */

import type * as HermesSdk from '@hermes/plugin-sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoutineJob } from './types'

const request = vi.fn()

vi.mock('@hermes/plugin-sdk', async importOriginal => {
  const sdk = await importOriginal<typeof HermesSdk>()

  return { ...sdk, host: { ...sdk.host, request } }
})

const { loadRoutines } = await import('./cron')

const LEGACY_PREFIX = 'You are running the scheduled routine "'

/** The shape a pre-hardening routine was persisted with. */
function legacyJob(id: string, title: string, bot: string): RoutineJob {
  return {
    enabled: true,
    job_id: id,
    name: `[bot:${bot}] ${title}`,
    prompt_preview: `${LEGACY_PREFIX}${title}" for agent '${bot}'`,
    state: 'scheduled'
  }
}

/** Every cron.manage call, as `[action, name]`. */
function callLog() {
  return request.mock.calls.map(([, params]) => [params.action, params.name])
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the bot\u2019s own cron store', () => {
  it('scopes the one list call to the bot profile', async () => {
    request.mockResolvedValue({ jobs: [] })

    await loadRoutines('research')

    expect(request.mock.calls.map(([method, params]) => [method, params])).toEqual([
      ['cron.manage', { action: 'list', include_disabled: true, profile: 'research' }]
    ])
  })

  it('omits the scope entirely when no owner is resolved', async () => {
    request.mockResolvedValue({ jobs: [] })

    await loadRoutines(undefined)

    expect(request).toHaveBeenCalledWith('cron.manage', { action: 'list', include_disabled: true })
  })
})

describe('reading never changes a job', () => {
  it('sends only the list call, even for active legacy routines', async () => {
    const active = [legacyJob('legacy-a', 'Audit', 'research'), legacyJob('legacy-b', 'Build', 'research')]
    request.mockResolvedValue({ jobs: active })

    await loadRoutines('research')

    expect(callLog()).toEqual([['list', undefined]])
  })

  it('returns the states exactly as the gateway reported them', async () => {
    const reported: RoutineJob[] = [
      legacyJob('legacy-active', 'Audit', 'research'),
      { ...legacyJob('legacy-paused', 'Build', 'research'), enabled: false, state: 'paused' },
      { enabled: true, job_id: 'plain', name: '[bot:research] Report', schedule: 'every 1h', state: 'scheduled' }
    ]

    request.mockResolvedValue({ jobs: reported, scoped: 'research' })

    const result = await loadRoutines('research')

    expect(result).toEqual({ jobs: reported, scoped: 'research' })
  })
})
