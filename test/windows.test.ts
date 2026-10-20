import React from 'react'
import { describe, expect, it, vi } from 'vitest'
;(globalThis as { __RN_OS__?: string }).__RN_OS__ = 'windows'

const { useHotkey } = await import('@tanstack/react-hotkeys')
const { viewFocusCount } = await import('./react-native')
const { HotkeysRoot, installNativeHotkeys } = await import('../src')
const { act, render } = await import('./helpers')

function App({ onSave, onKey }: { onSave: () => void; onKey: () => void }) {
  useHotkey('Mod+S', onSave)
  useHotkey('K', onKey)
  return null
}

describe('React Native environment on Windows', () => {
  it('receives keys through HotkeysRoot and marks hotkeys handled', () => {
    expect(installNativeHotkeys().source).toBe('hotkeys-root')
    const onSave = vi.fn()
    const onKey = vi.fn()
    const renderer = render(
      React.createElement(HotkeysRoot, null, React.createElement(App, { onSave, onKey })),
    )
    const view = renderer.root.findByType('View' as never)
    expect(view.props.focusable).toBe(true)
    expect(viewFocusCount.current).toBe(1)
    // Text fields still receive K, so only Mod+S is handled natively
    expect(view.props.keyDownEvents).toEqual([
      {
        code: 'KeyS',
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        handledEventPhase: 1,
      },
    ])

    const nativeEvent = {
      key: 's',
      code: 'KeyS',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    }
    act(() => view.props.onKeyDownCapture({ nativeEvent }))
    act(() => view.props.onKeyUpCapture({ nativeEvent }))
    expect(onSave).toHaveBeenCalledTimes(1)

    act(() =>
      view.props.onKeyDownCapture({
        nativeEvent: { ...nativeEvent, key: 'k', code: 'KeyK', ctrlKey: false },
      }),
    )
    expect(onKey).toHaveBeenCalledTimes(1)
    act(() => renderer.unmount())
  })

  it('warns when hotkeys register without a HotkeysRoot', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // The first registration in this file happened inside a root; a new
    // module graph is needed to observe the first one outside a root.
    vi.resetModules()
    const fresh = await import('@tanstack/react-hotkeys')
    const helpers = await import('./helpers')
    function Lonely() {
      fresh.useHotkey('Mod+S', () => {})
      return null
    }
    const renderer = helpers.render(React.createElement(Lonely))
    vi.advanceTimersByTime(1000)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<HotkeysRoot>'))
    helpers.act(() => renderer.unmount())
    warn.mockRestore()
    vi.useRealTimers()
  })
})
