/**
 * The two fold points of the tiling tree.
 *
 * Below the dock floor every collapsible pane leaves the grid. Between the dock
 * floor and the wider early fold point only panes that declare `foldsEarly`
 * leave it, so a mid-size window drops the secondary rail (the Bot Mode jobs
 * column) and keeps the chat readable while the left rail stays docked. A wide
 * window keeps every column.
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registry } from '@/contrib/registry'

import type { LayoutNode } from '../model'
import { group, split } from '../model'
import { $earlyFoldViewport, $layoutTree, $narrowViewport, declareDefaultTree } from '../store'

import { NarrowOverlays } from './narrow-overlays'
import { paneFolded } from './track-model'
import { TreeSplit } from './tree-split'

vi.mock('./tree-node', () => ({
  TreeNode: ({ node }: { node: LayoutNode }) => (node.type === 'group' ? <div data-tree-group={node.id} /> : null)
}))

const rail = { data: { collapsible: true, placement: 'left' }, id: 'rail' } as never
const jobs = { data: { collapsible: true, foldsEarly: true, placement: 'main' }, id: 'jobs' } as never
const fixed = { data: { placement: 'right' }, id: 'fixed' } as never

describe('paneFolded', () => {
  it('folds nothing on a wide window', () => {
    expect([rail, jobs, fixed].map(p => paneFolded(p, false, false))).toEqual([false, false, false])
  })

  it('folds only early panes between the two fold points', () => {
    expect([rail, jobs, fixed].map(p => paneFolded(p, false, true))).toEqual([false, true, false])
  })

  it('folds every collapsible pane below the dock floor', () => {
    expect([rail, jobs, fixed].map(p => paneFolded(p, true, true))).toEqual([true, true, false])
  })
})

const disposers: (() => void)[] = []

const tree = split(
  'row',
  [group(['rail'], { id: 'grp-rail' }), group(['workspace'], { id: 'grp-main' }), group(['jobs'], { id: 'grp-jobs' })],
  [1, 4, 1],
  'spl-root'
)

beforeEach(() => {
  for (const [id, data] of [
    ['rail', { collapsible: true, placement: 'left', width: '250px' }],
    ['workspace', { placement: 'main', uncloseable: true }],
    ['jobs', { collapsible: true, foldsEarly: true, placement: 'main', width: '240px' }]
  ] as const) {
    disposers.push(registry.register({ area: 'panes', data, id, render: () => <div>{id}</div>, title: id }))
  }

  window.localStorage.clear()
  declareDefaultTree(tree)
})

afterEach(() => {
  cleanup()
  $narrowViewport.set(false)
  $earlyFoldViewport.set(false)
  $layoutTree.set(null)
  disposers.splice(0).forEach(dispose => dispose())
})

const zone = (id: string) => globalThis.document.querySelector(`[data-tree-group="${id}"]`)

describe('the jobs column at a mid-size window', () => {
  it('leaves the grid while the left rail and the chat stay docked', () => {
    render(<TreeSplit node={tree} root rootRow />)
    expect(zone('grp-jobs')).not.toBeNull()

    act(() => $earlyFoldViewport.set(true))

    expect(zone('grp-jobs')).toBeNull()
    expect(zone('grp-rail')).not.toBeNull()
    expect(zone('grp-main')).not.toBeNull()
  })

  it('stays reachable through the right edge overlay', () => {
    ;(window as unknown as { hermesDesktop?: unknown }).hermesDesktop = {}
    render(<NarrowOverlays />)
    expect(globalThis.document.querySelector('.right-0')).toBeNull()

    act(() => $earlyFoldViewport.set(true))

    expect(globalThis.document.querySelector('.right-0')).not.toBeNull()
    expect(globalThis.document.querySelector('.left-0')).toBeNull()
    delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
  })
})
