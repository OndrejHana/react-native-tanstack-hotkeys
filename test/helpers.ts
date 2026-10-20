import React from 'react'
import { act, create } from 'react-test-renderer'
import type { ReactTestRenderer } from 'react-test-renderer'

/** Renders an element inside act(), so effects (where hotkeys register) run. */
export function render(element: React.ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(element)
  })
  return renderer
}

/** Runs a hook in a component and returns its latest result. */
export function renderHook<T>(hook: () => T) {
  const result = { current: undefined as T }
  function Probe() {
    result.current = hook()
    return null
  }
  const renderer = render(React.createElement(Probe))
  return {
    result,
    unmount: () => act(() => renderer.unmount()),
    rerender: () => act(() => renderer.update(React.createElement(Probe))),
  }
}

export { act }
