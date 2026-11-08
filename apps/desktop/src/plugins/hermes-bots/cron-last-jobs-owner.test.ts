/**
 * The Scheduled jobs column's identity and outage contract.
 *
 * 1. Owner = connection + profile, always. A roster that fell back after a
 *    `host.agents` failure leaves gateway rows UNMARKED (no sourceScoped /
 *    remoteSource); those rows ride the active socket, so their key carries
 *    that socket. Two connections that both name a profile "default" never
 *    share a query key or a cached list.
 * 2. A refetch error is never live. React Query keeps the last successful
 *    `data` beside the error, so after success → error the pane must report
 *    the outage and mark the last list stale — and an earlier EMPTY answer is
 *    not re-confirmed as "no jobs" by an outage.
 */
import type * as HermesSdk from '@hermes/plugin-sdk'
import { atom } from 'nanostores'
import { describe, expect, it, vi } from 'vitest'

import type { RosterRow, RoutineJob } from './types'

const $connection = atom<null | string>('conn-a')

vi.mock('@hermes/plugin-sdk', async importOriginal => {
  const sdk = await importOriginal<typeof HermesSdk>()

  return { ...sdk, host: { ...sdk.host, state: { ...sdk.host.state, connectionId: $connection } } }
})

const { lastJobsFor, rememberJobsFor, routineOwnerKey, selectRoutineJobs } = await import('./cron')

const job = (id: string): RoutineJob => ({
  enabled: true,
  job_id: id,
  name: id,
  schedule: 'every 1h',
  state: 'scheduled'
})

// Exactly what the agents-failure fallback leaves: no source markers.
const unmarkedDefault: RosterRow = { name: 'default' }
const research: RosterRow = { name: 'research' }
const scopedRemote: RosterRow = { connectionId: 'remote-a', name: 'default', remoteSource: true }

describe('owner identity carries the connection', () => {
  it('keeps unmarked same-named rows on two connections apart', () => {
    $connection.set('conn-a')
    const keyA = routineOwnerKey(unmarkedDefault)
    rememberJobsFor(unmarkedDefault, [job('from-a')])

    $connection.set('conn-b')
    const keyB = routineOwnerKey(unmarkedDefault)

    expect(keyB).not.toBe(keyA)
    expect(lastJobsFor(unmarkedDefault)).toEqual([])

    $connection.set('conn-a')
    expect(lastJobsFor(unmarkedDefault).map(j => j.job_id)).toEqual(['from-a'])
  })

  it('never hands one profile the cached list of another', () => {
    $connection.set('conn-a')
    rememberJobsFor(research, [job('research-only')])

    const view = selectRoutineJobs(undefined, new Error('offline'), lastJobsFor(unmarkedDefault), 'default')

    expect(view.jobs).not.toContainEqual(job('research-only'))
  })

  it('keys a source-scoped row by its own connection, not the active one', () => {
    $connection.set('conn-a')
    const before = routineOwnerKey(scopedRemote)
    $connection.set('conn-b')

    expect(routineOwnerKey(scopedRemote)).toBe(before)
    expect(before).toContain('remote-a')
  })
})

describe('a refetch error after a success is an outage, not live data', () => {
  it('success with jobs → error: not live, last jobs shown as stale', () => {
    const kept = { jobs: [job('report')], scoped: 'default' }
    const view = selectRoutineJobs(kept, new Error('gateway down'), [], 'default')

    expect(view.live).toBeNull()
    expect(view.all.map(j => j.job_id)).toEqual(['report'])
  })

  it('empty success → error: not live, so the pane reports the failure', () => {
    const view = selectRoutineJobs({ jobs: [], scoped: 'default' }, new Error('gateway down'), [], 'default')

    expect(view.live).toBeNull()
    expect(view.all).toEqual([])
  })

  it('a clean answer stays live', () => {
    const view = selectRoutineJobs({ jobs: [], scoped: 'default' }, null, [job('old')], 'default')

    expect(view.live).toEqual([])
    expect(view.all).toEqual([])
  })
})
