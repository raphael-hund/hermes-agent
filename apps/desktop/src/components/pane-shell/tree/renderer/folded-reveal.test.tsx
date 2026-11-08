/**
 * A pane folded out of the grid stays reachable without hover.
 *
 * Bot Mode's jobs column folds at a mid-size window (760px: only `foldsEarly`
 * panes) and at a narrow one (600px: every collapsible pane). At both widths
 * three explicit doors must open it in the real edge overlay:
 *   - the native `host.revealPane(id)` (also what the palette's tab toggle and
 *     the Screen opener call),
 *   - the right titlebar button,
 *   - the keyboard action ⌘J (`view.toggleRightSidebar` → toggleRightSide).
 * A closed profile column at 600px must not take the jobs tab out of its
 * zone's selection, which is what keeps Bot Mode (and the jobs pane) alive.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TitlebarControls } from '@/app/shell/titlebar-controls'
import { registry } from '@/contrib/registry'
import { I18nProvider } from '@/i18n'
import { host } from '@/sdk'
import { $leftSideOpen, setSidebarOpen, toggleRightSide } from '@/store/layout'

import { group, split } from '../model'
import {
  $earlyFoldViewport,
  $layoutTree,
  $narrowViewport,
  declareDefaultTree,
  isPaneSelected,
  isPaneVisible
} from '../store'

import { NarrowOverlays } from './narrow-overlays'

const JOBS = 'hermes-bots:routines'
const BOTS = 'hermes-bots:pane'
const disposers: (() => void)[] = []

const tree = split(
  'row',
  [
    group(['sessions', BOTS], { active: BOTS, id: 'grp-sessions' }),
    group(['workspace'], { id: 'grp-main' }),
    group([JOBS], { id: 'grp-routines' })
  ],
  [1, 4, 1],
  'spl-root'
)

/** Point the media queries at a window width the way Chromium would. */
function setWindowWidth(px: number) {
  const narrow = px < 640
  const early = px < 960

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      matches: query.includes('639.98') ? narrow : query.includes('959.98') ? early : false,
      removeEventListener: vi.fn()
    }))
  )
  act(() => {
    $narrowViewport.set(narrow)
    $earlyFoldViewport.set(early)
  })
}

const jobsOverlay = () => globalThis.document.querySelector(`[data-narrow-overlay="${JOBS}"]`)

beforeEach(() => {
  ;(window as unknown as { hermesDesktop?: unknown }).hermesDesktop = {}
  window.localStorage.clear()

  for (const [id, data] of [
    ['sessions', { collapsible: true, placement: 'left', revealAliases: ['chat-sidebar'], width: '250px' }],
    [BOTS, { collapsible: true, hideOnly: true, placement: 'left', width: '250px' }],
    ['workspace', { placement: 'main', uncloseable: true }],
    [JOBS, { collapsible: true, defaultCollapsed: true, foldsEarly: true, placement: 'main', width: '240px' }]
  ] as const) {
    disposers.push(
      registry.register({
        area: 'panes',
        data,
        id,
        render: () => <div data-testid={`${id}-body`}>{id}</div>,
        title: id
      })
    )
  }

  declareDefaultTree(tree)
})

afterEach(() => {
  cleanup()
  $narrowViewport.set(false)
  $earlyFoldViewport.set(false)
  $layoutTree.set(null)
  disposers.splice(0).forEach(dispose => dispose())
  vi.unstubAllGlobals()
  delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
})

describe.each([760, 600])('folded jobs column at %ipx', width => {
  it('opens on the native host.revealPane', () => {
    setWindowWidth(width)
    render(<NarrowOverlays />)
    expect(jobsOverlay()).toBeNull()

    act(() => host.revealPane(JOBS))

    expect(jobsOverlay()).not.toBeNull()
    expect(screen.getByTestId(`${JOBS}-body`)).toBeTruthy()
  })

  it('opens on the keyboard action and closes again', () => {
    setWindowWidth(width)
    render(<NarrowOverlays />)

    act(() => toggleRightSide())
    expect(jobsOverlay()).not.toBeNull()

    act(() => toggleRightSide())
    expect(jobsOverlay()).toBeNull()
  })

  it('opens from the focusable right titlebar button', () => {
    setWindowWidth(width)
    render(
      <MemoryRouter>
        <I18nProvider configClient={null} initialLocale="en">
          <NarrowOverlays />
          <TitlebarControls onOpenSettings={() => {}} />
        </I18nProvider>
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: /right sidebar/i })
    button.focus()
    expect(globalThis.document.activeElement).toBe(button)

    fireEvent.click(button)

    expect(jobsOverlay()).not.toBeNull()
  })
})

describe('the jobs column after the profile column closes at 600px', () => {
  it('keeps the Bots tab selected, so Bot Mode and the jobs stay reachable', () => {
    setWindowWidth(600)
    render(<NarrowOverlays />)

    act(() => setSidebarOpen(false))

    expect($leftSideOpen.get()).toBe(false)
    expect(isPaneVisible(BOTS)).toBe(false)
    expect(isPaneSelected(BOTS)).toBe(true)

    act(() => host.revealPane(JOBS))
    expect(jobsOverlay()).not.toBeNull()
  })
})

describe('a wide window', () => {
  it('keeps the right button on the docked column, never an overlay', () => {
    setWindowWidth(1400)
    render(<NarrowOverlays />)

    act(() => toggleRightSide())

    expect(jobsOverlay()).toBeNull()
  })
})
