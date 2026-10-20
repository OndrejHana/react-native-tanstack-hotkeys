import { describe, expect, it, vi } from 'vitest'
;(globalThis as { __RN_NO_MODULE__?: boolean }).__RN_NO_MODULE__ = true

describe('without the native module', () => {
  it('warns that the app needs a rebuild', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { installNativeHotkeys } = await import('../src')
    expect(installNativeHotkeys().source).toBe('unavailable')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('pod install'))
    warn.mockRestore()
  })
})
