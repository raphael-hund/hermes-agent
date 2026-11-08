import { group, mirrorTreeHorizontal, split } from '@/components/pane-shell/tree/model'
import { applyLayoutPreset, registerBundledPresets } from '@/components/pane-shell/tree/presets'
import { readKey, writeKey } from '@/lib/storage'

// ---------------------------------------------------------------------------
// Layout presets — CHAT (main) always dominates.
// ---------------------------------------------------------------------------

// The REAL default: sessions left, chat main, and the right sidebars in column
// order main | … | review | file-browser (files outermost). Each is its OWN
// zone. Review collapses to nothing while its pane is hidden (⌘G off).
//
// Preview tiles are DYNAMIC panes (like session tiles), so no preset names one:
// they're registered by watchPreviewTiles as tabs open, and dockPaneBeside lands
// each one directly beside the file tree wherever that currently lives — so a
// file double-click still slides a preview open as its own pane next to the
// tree, never as a tab stacked into the files sidebar.
export const DEFAULT_TREE = split(
  'row',
  [
    group(['sessions'], { id: 'grp-sessions' }),
    group(['workspace'], { id: 'grp-main' }),
    split(
      'column',
      [
        split(
          'row',
          [group(['review'], { id: 'grp-review' }), group(['files'], { id: 'grp-files' })],
          [1, 1.2],
          'spl-rail'
        ),
        group(['terminal'], { id: 'grp-terminal' })
      ],
      [1.6, 1],
      'spl-right'
    )
  ],
  [1, 3.4, 1.25],
  'spl-root'
)

// Focus is one column of attention: files and review are tabs BEHIND the chat,
// the terminal a collapsed rail under it — opening the terminal must never
// cover the conversation, which a terminal tab did.
const FOCUS_TREE = split(
  'row',
  [group(['sessions']), split('column', [group(['workspace', 'files', 'review']), group(['terminal'])], [3, 1])],
  [1, 4.6]
)

// Basic is sessions and chat with the tooling RESTING in its own slots: the
// terminal a collapsed rail under the chat (its column carries the chat, so
// ⌘J folding the right side can never take the rail with it), review and
// files a right column that ⌘J / ⌘G open. A tree that simply omitted them was
// a lie — applying it adopts every missing pane back in as workspace tabs,
// which is Focus.
export const BASIC_TREE = split(
  'row',
  [
    group(['sessions']),
    split('column', [group(['workspace']), group(['terminal'])], [3, 1]),
    split('row', [group(['review']), group(['files'])], [1, 1.2])
  ],
  [1, 3.4, 1.25]
)

const BASIC_RESTING = ['terminal', 'files', 'review'] as const

const TERMINAL_TREE = split(
  'column',
  [
    split('row', [group(['sessions']), group(['workspace']), group(['files', 'review'])], [1, 3.2, 1.2]),
    group(['terminal'])
  ],
  [3, 1]
)

// Terminal deck places the tooling without opening it: the terminal rests as
// its bottom rail and files/review as a closed right column, so ⌃` and ⌘J open
// each one in its deck slot. Review rests with files: closing the file tree
// collapses their shared column, and an open review there would leave ⌘G
// reading open while nothing shows.
const TERMINAL_RESTING = ['terminal', 'files', 'review'] as const

// The first-run intro's borrowed layout: the chat alone, no tab strip. Unlisted,
// and applied while layout persistence is held (onboarding/first-run/assembly.ts).
export const DEMO_LAYOUT_ID = 'demo'

export const DEMO_TREE = group(['workspace'], { tabStrip: 'never' })

const QUAD_TREE = split(
  'column',
  [
    split('row', [group(['sessions', 'files']), group(['workspace'])], [1, 3]),
    split('row', [group(['terminal']), group(['review'])], [1.4, 1])
  ],
  [3, 1]
)

// The calm workspace: profiles left (the Bots roster fronted over Sessions in
// one zone, so ordinary chats stay one tab away), the chat in the middle, and
// the selected profile's scheduled jobs on the right. Tooling keeps its slots
// but RESTS: the terminal is a closed rail under the chat, review/files a
// closed outer column, so ⌃` / ⌘J / ⌘G still open them in place. The jobs pane
// is plugin-registered and only present while Bot Mode is on screen; an
// unregistered pane simply leaves the grid, so this tree is safe without it.
export const BOTS_PANE_ID = 'hermes-bots:pane'
export const ROUTINES_PANE_ID = 'hermes-bots:routines'
export const FOCUS_WORKSPACE_ID = 'focus-workspace'

export const FOCUS_WORKSPACE_TREE = split(
  'row',
  [
    group(['sessions', BOTS_PANE_ID], { active: BOTS_PANE_ID, id: 'grp-sessions' }),
    // The jobs zone sits beside the chat in the chat's own column, exactly
    // where its enforced dock (`workspace`, right) re-homes it — so enabling
    // Bot Mode never reshapes this tree on boot.
    split(
      'column',
      [
        split('row', [group(['workspace'], { id: 'grp-main' }), group([ROUTINES_PANE_ID], { id: 'grp-routines' })], [
          3.4, 1
        ]),
        group(['terminal'], { id: 'grp-terminal' })
      ],
      [3, 1]
    ),
    split('row', [group(['review'], { id: 'grp-review' }), group(['files'], { id: 'grp-files' })], [1, 1.2])
  ],
  [1, 4.4, 1.25],
  'spl-root'
)

export const FOCUS_WORKSPACE_RESTING = ['terminal', 'files', 'review'] as const

export function registerLayoutPresets() {
  // Simple is always the Basic arrangement; its one choice is which side the
  // sidebar sits. The decks are Advanced — arranging tooling is the point.
  return registerBundledPresets([
    {
      id: FOCUS_WORKSPACE_ID,
      title: 'Focus workspace',
      order: -1,
      tree: FOCUS_WORKSPACE_TREE,
      resting: FOCUS_WORKSPACE_RESTING
    },
    { id: 'sidebar-left', title: 'Sidebar left', order: 0, tree: BASIC_TREE, resting: BASIC_RESTING, tier: 'simple' },
    {
      id: 'sidebar-right',
      title: 'Sidebar right',
      order: 1,
      tree: mirrorTreeHorizontal(BASIC_TREE),
      resting: BASIC_RESTING,
      tier: 'simple'
    },
    { id: 'default', title: 'Default', order: 0, tree: DEFAULT_TREE, tier: 'advanced' },
    { id: 'basic', title: 'Basic', order: 5, tree: BASIC_TREE, resting: BASIC_RESTING, tier: 'advanced' },
    { id: 'focus', title: 'Focus', order: 10, tree: FOCUS_TREE, resting: ['terminal'], tier: 'advanced' },
    {
      id: 'terminal-deck',
      title: 'Terminal deck',
      order: 20,
      tree: TERMINAL_TREE,
      resting: TERMINAL_RESTING,
      tier: 'advanced'
    },
    { id: 'quad', title: 'Quad', order: 30, tree: QUAD_TREE, tier: 'advanced' },
    { id: DEMO_LAYOUT_ID, listed: false, title: 'Demo', order: 40, tree: DEMO_TREE }
  ])
}

const FOCUS_WORKSPACE_ADOPTED_KEY = 'hermes.desktop.focusWorkspaceAdopted.v1'

/**
 * Seat the Focus workspace ONCE per install, through the same preset apply a
 * picker click uses: `applyTree` adopts every pane open right now (session
 * tiles, previews) into the new geometry, so no chat, draft or attachment is
 * lost. After that the layout is the user's — rearranging, or picking another
 * preset, is never overruled on a later boot. Call after bundled plugins have
 * registered so the Bots pane can take its tab slot.
 */
export function adoptFocusWorkspaceOnce(): void {
  if (readKey(FOCUS_WORKSPACE_ADOPTED_KEY) !== null) {
    return
  }

  applyLayoutPreset(FOCUS_WORKSPACE_ID, FOCUS_WORKSPACE_TREE)
  writeKey(FOCUS_WORKSPACE_ADOPTED_KEY, 'true')
}
