import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { withTanStackHotkeys, ALIASES } = require('../metro.js')

describe('withTanStackHotkeys', () => {
  const context = { resolveRequest: vi.fn(() => ({ type: 'empty' })) }

  it('aliases the core and its adapter entry', () => {
    const config = withTanStackHotkeys({ projectRoot: process.cwd(), resolver: {} })
    expect(config.resolver.resolveRequest(context, '@tanstack/hotkeys', 'ios')).toEqual({
      type: 'sourceFile',
      filePath: ALIASES['@tanstack/hotkeys'],
    })
    expect(ALIASES['@tanstack/hotkeys']).toMatch(/lib\/core\/hotkeys\.js$/)
    expect(
      config.resolver.resolveRequest(context, '@tanstack/hotkeys/adapter', 'ios'),
    ).toEqual({ type: 'sourceFile', filePath: ALIASES['@tanstack/hotkeys/adapter'] })
  })

  it('defers everything else to an existing resolver, or Metro', () => {
    const previous = vi.fn(() => ({ type: 'previous' }))
    const config = withTanStackHotkeys({
      projectRoot: process.cwd(),
      resolver: { resolveRequest: previous, sourceExts: ['ts'] },
    })
    expect(config.resolver.sourceExts).toEqual(['ts'])
    expect(config.resolver.resolveRequest(context, 'react', 'ios')).toEqual({
      type: 'previous',
    })
    const plain = withTanStackHotkeys({ projectRoot: process.cwd() })
    plain.resolver.resolveRequest(context, 'react', 'android')
    expect(context.resolveRequest).toHaveBeenCalledWith(context, 'react', 'android')
  })

  it('accepts the installed @tanstack/react-hotkeys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    withTanStackHotkeys({ projectRoot: process.cwd() })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
