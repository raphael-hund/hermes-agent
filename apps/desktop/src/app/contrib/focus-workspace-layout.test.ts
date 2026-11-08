/**
 * The Focus workspace arrives once, through the real preset apply:
 * profiles left, chat center, the profile's jobs right — and a chat that was
 * open before the arrival is still open after it. A later rearrangement is the
 * user's and is never overruled on the next boot.
 */
import { beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  window.localStorage.clear()
  vi.resetModules()
})

async function boot() {
  const tree = await import('@/components/pane-shell/tree/store')
  const model = await import('@/components/pane-shell/tree/model')
  const { registry } = await import('@/contrib/registry')
  const presets = await import('./layout-presets')

  for (const [id, placement] of [
    ['sessions', 'left'],
    ['workspace', 'main'],
    ['terminal', 'bottom'],
    ['review', 'right'],
    ['files', 'right'],
    ['hermes-bots:pane', 'left'],
    ['hermes-bots:routines', 'main']
  ] as const) {
    registry.register({ id, area: 'panes', data: { placement }, render: () => null })
  }

  presets.registerLayoutPresets()
  tree.declareDefaultTree(presets.DEFAULT_TREE, presets.BASIC_TREE)

  return { model, presets, registry, tree }
}

it('seats the three columns once and keeps a chat that was already open', async () => {
  const { model, presets, registry, tree } = await boot()
  registry.register({ id: 'session-tile:open', area: 'panes', data: { placement: 'main' }, render: () => null })
  tree.adoptContributedPanes()

  presets.adoptFocusWorkspaceOnce()

  const live = tree.$layoutTree.get()!
  expect(tree.$activePresetId.get()).toBe(presets.FOCUS_WORKSPACE_ID)
  expect(model.findGroupOfPane(live, 'hermes-bots:pane')?.id).toBe(model.findGroupOfPane(live, 'sessions')?.id)
  expect(model.findGroupOfPane(live, 'hermes-bots:pane')?.active).toBe('hermes-bots:pane')
  expect(model.allPaneIds(live)).toContain('hermes-bots:routines')
  expect(model.allPaneIds(live)).toContain('session-tile:open')
})

it('never re-applies over a layout the user changed afterwards', async () => {
  const { presets, tree } = await boot()

  presets.adoptFocusWorkspaceOnce()
  tree.markActivePreset('custom')
  presets.adoptFocusWorkspaceOnce()

  expect(tree.$activePresetId.get()).toBe('custom')
})
