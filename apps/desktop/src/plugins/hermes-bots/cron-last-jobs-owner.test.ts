/**
 * The Scheduled jobs column keeps a last-good list so a failed refresh shows
 * stale data instead of an error. That list is per OWNER: one shared slot let
 * a refresh failing right after a profile switch paint the previous profile's
 * jobs under the new profile's header. Two sources that both name a profile
 * "default" are two owners.
 */
import { describe, expect, it } from 'vitest'

import { lastJobsFor, rememberJobsFor, selectRoutineJobs } from './cron'
import type { RosterRow, RoutineJob } from './types'

const job = (id: string): RoutineJob => ({ enabled: true, job_id: id, name: id, schedule: 'every 1h', state: 'scheduled' })

const localDefault: RosterRow = { connectionId: 'local', name: 'default' }
const remoteDefault: RosterRow = { connectionId: 'remote-a', name: 'default', remoteSource: true }
const research: RosterRow = { connectionId: 'local', name: 'research' }

describe('last-good jobs are owner-scoped', () => {
  it('never hands one profile the cached list of another', () => {
    rememberJobsFor(research, [job('research-only')])

    const view = selectRoutineJobs(undefined, new Error('offline'), lastJobsFor(localDefault), 'default')

    expect(view.jobs).toEqual([])
    expect(lastJobsFor(research).map(j => j.job_id)).toEqual(['research-only'])
  })

  it('keeps two same-named profiles on different sources apart', () => {
    rememberJobsFor(localDefault, [job('local')])
    rememberJobsFor(remoteDefault, [job('remote')])

    expect(lastJobsFor(localDefault).map(j => j.job_id)).toEqual(['local'])
    expect(lastJobsFor(remoteDefault).map(j => j.job_id)).toEqual(['remote'])
  })
})
