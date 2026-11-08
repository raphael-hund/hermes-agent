/**
 * An unscoped roster row (what the roster leaves after an agents-list
 * failure) is pinned to the connection active when its query or dialog was
 * created. The request is dispatched through `host.requestProfile` with that
 * captured route — so a socket switch can neither redirect it nor re-label its
 * answer. The proof is the A → B → A race: capture A's query, switch to B,
 * start A's query, switch back to A before the answer. The answer must come
 * from A's route.
 *
 * Every RPC here is a mock; no real job is created, changed or run.
 */
import type * as HermesSdk from '@hermes/plugin-sdk'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { atom } from 'nanostores'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { translateBots } from './i18n-test-helper'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})

const { $connection, request, requestProfile } = vi.hoisted(() => ({
  $connection: { current: null as null | ReturnType<typeof atom<null | string>> },
  request: vi.fn(async (..._args: unknown[]) => ({ jobs: [] })),
  requestProfile: vi.fn(async (..._args: unknown[]) => ({ jobs: [] as unknown[] }))
}))

vi.mock('@hermes/plugin-sdk', async importOriginal => {
  const sdk = await importOriginal<typeof HermesSdk>()
  const { atom: nanoAtom } = await import('nanostores')
  $connection.current = nanoAtom<null | string>('conn-a')

  return {
    ...sdk,
    host: { ...sdk.host, request, requestProfile, state: { ...sdk.host.state, connectionId: $connection.current } },
    usePluginI18n: () => translateBots
  }
})

const { CreateRoutineDialog, pinRoutineOwner, routineQueryOptions } = await import('./cron')

const unmarkedDefault = { name: 'default' }
const connection = () => $connection.current!

/** Which connection each requestProfile call was routed to. */
const routedConnections = () =>
  requestProfile.mock.calls.map(([route]) => (route as { connectionId: string }).connectionId)

beforeEach(() => {
  vi.clearAllMocks()
  connection().set('conn-a')
})

afterEach(() => {
  cleanup()
})

describe('a routine query is bound to its owner before it asks', () => {
  it('A → B → A: the A query loads from A, never from the socket active at run time', async () => {
    let releaseAnswer: (value: unknown) => void = () => undefined

    requestProfile.mockImplementation(
      route =>
        new Promise(resolve => {
          const from = (route as { connectionId: string }).connectionId
          releaseAnswer = () => resolve({ jobs: [{ job_id: `from-${from}`, name: 'x', schedule: 'every 1h' }] })
        })
    )

    // The query exactly as the pane builds it while A is active.
    const queryA = routineQueryOptions(pinRoutineOwner(unmarkedDefault))

    connection().set('conn-b') // the switch invalidates and refetches A's query
    const pending = queryA.queryFn()
    connection().set('conn-a') // back to A before the answer arrives
    releaseAnswer(undefined)
    const answer = (await pending) as { jobs: { job_id: string }[] }

    expect(routedConnections()).toEqual(['conn-a'])
    expect(answer.jobs.map(job => job.job_id)).toEqual(['from-conn-a'])
    expect(queryA.queryKey).toEqual(['hermes-bots', 'routines', 'conn-a::default'])
    expect(request).not.toHaveBeenCalled()
  })

  it('keys the same unmarked profile on two connections apart', () => {
    const keyA = routineQueryOptions(pinRoutineOwner(unmarkedDefault)).queryKey
    connection().set('conn-b')
    const keyB = routineQueryOptions(pinRoutineOwner(unmarkedDefault)).queryKey

    expect(keyA).not.toEqual(keyB)
  })

  it('refuses to run without a proven owner', async () => {
    const query = routineQueryOptions(null)

    expect(query.enabled).toBe(false)
    await expect(Promise.resolve().then(() => query.queryFn())).rejects.toThrow()
    expect(requestProfile).not.toHaveBeenCalled()
  })
})

describe('an open create dialog keeps the owner it was opened for', () => {
  it('a dialog opened on A submits to A after the socket moved to B', async () => {
    requestProfile.mockResolvedValue({ success: true } as never)
    const pinnedOnA = pinRoutineOwner(unmarkedDefault)!

    render(<CreateRoutineDialog bot={pinnedOnA} onClose={() => undefined} open />)
    connection().set('conn-b')

    fireEvent.change(screen.getByPlaceholderText('Morning briefing'), { target: { value: 'Digest' } })
    fireEvent.change(screen.getByPlaceholderText(/Summarize my unread Slack threads/), {
      target: { value: 'Summarize.' }
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Create/ }))

    await waitFor(() => expect(requestProfile).toHaveBeenCalled())

    expect(routedConnections()).toEqual(['conn-a'])
    expect(request).not.toHaveBeenCalled()
  })
})
