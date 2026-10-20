import { describe, expect, it } from 'vitest'
;(globalThis as { __RN_OS__?: string }).__RN_OS__ = 'web'

const { getHotkeysEnvironment, domEnvironment } = await import('@tanstack/hotkeys')
const { installNativeHotkeys } = await import('../src')

describe('on web', () => {
  it('keeps TanStack Hotkeys’ DOM environment', () => {
    expect(installNativeHotkeys()).toMatchObject({ source: 'dom', root: null })
    expect(getHotkeysEnvironment()).toBe(domEnvironment)
  })
})
