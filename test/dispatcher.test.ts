import { describe, expect, it, vi } from 'vitest'
import { KeyboardDispatcher, createNativeEnvironment } from '../src/environment'
import { NativeKeyboardEvent } from '../src/event'

function setup() {
  let focused: object | null = null
  const dispatcher = new KeyboardDispatcher({ focusedTextInput: () => focused })
  return {
    dispatcher,
    focus: (target: object | null) => {
      focused = target
    },
  }
}

const keydown = (init = {}) =>
  new NativeKeyboardEvent('keydown', { key: 'a', code: 'KeyA', ...init })

describe('KeyboardDispatcher', () => {
  it('runs capture outermost first, then bubble innermost first', () => {
    const { dispatcher, focus } = setup()
    const input = { name: 'input' }
    const form = { contains: (node: unknown) => node === input }
    const order: Array<string> = []
    const log = (name: string) => (event: NativeKeyboardEvent) =>
      order.push(`${name}:${event.eventPhase}`)
    dispatcher.listen(dispatcher.root, 'keydown', log('root-capture'), true)
    dispatcher.listen(dispatcher.root, 'keydown', log('root-bubble'), false)
    dispatcher.listen(form, 'keydown', log('form-capture'), true)
    dispatcher.listen(form, 'keydown', log('form-bubble'), false)
    dispatcher.listen(input, 'keydown', log('input-bubble'), false)
    focus(input)

    const event = keydown()
    dispatcher.dispatch(event)
    expect(order).toEqual([
      'root-capture:1',
      'form-capture:1',
      'input-bubble:2',
      'form-bubble:3',
      'root-bubble:3',
    ])
    expect(event.target).toBe(input)
    expect(event.composedPath()).toEqual([input, form, dispatcher.root])
    expect(event.currentTarget).toBeNull()
  })

  it('stops at the current target on stopPropagation', () => {
    const { dispatcher } = setup()
    const later = vi.fn()
    dispatcher.listen(
      dispatcher.root,
      'keydown',
      (event: NativeKeyboardEvent) => event.stopPropagation(),
      true,
    )
    const sameTarget = vi.fn()
    dispatcher.listen(dispatcher.root, 'keydown', sameTarget, true)
    dispatcher.listen(dispatcher.root, 'keydown', later, false)
    dispatcher.dispatch(keydown())
    expect(sameTarget).toHaveBeenCalled()
    expect(later).not.toHaveBeenCalled()
  })

  it('stops immediately on stopImmediatePropagation', () => {
    const { dispatcher } = setup()
    const next = vi.fn()
    dispatcher.listen(
      dispatcher.root,
      'keydown',
      (event: NativeKeyboardEvent) => event.stopImmediatePropagation(),
      false,
    )
    dispatcher.listen(dispatcher.root, 'keydown', next, false)
    dispatcher.dispatch(keydown())
    expect(next).not.toHaveBeenCalled()
  })

  it('reports listener errors without stopping dispatch', () => {
    vi.useFakeTimers()
    const { dispatcher } = setup()
    const next = vi.fn()
    dispatcher.listen(
      dispatcher.root,
      'keydown',
      () => {
        throw new Error('boom')
      },
      false,
    )
    dispatcher.listen(dispatcher.root, 'keydown', next, false)
    dispatcher.dispatch(keydown())
    expect(next).toHaveBeenCalled()
    expect(() => vi.runAllTimers()).toThrow('boom')
    vi.useRealTimers()
  })

  it('does not run listeners added or removed during dispatch', () => {
    const { dispatcher } = setup()
    const added = vi.fn()
    const removed = vi.fn()
    let remove = () => {}
    dispatcher.listen(
      dispatcher.root,
      'keydown',
      () => {
        dispatcher.listen(dispatcher.root, 'keydown', added, false)
        remove()
      },
      false,
    )
    remove = dispatcher.listen(dispatcher.root, 'keydown', removed, false)
    dispatcher.dispatch(keydown())
    expect(added).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
  })

  it('cleans up targets without listeners', () => {
    const { dispatcher } = setup()
    const remove = dispatcher.listen({}, 'keydown', () => {}, false)
    expect(dispatcher.hasListeners('keydown')).toBe(true)
    remove()
    remove()
    expect(dispatcher.hasListeners('keydown')).toBe(false)
  })
})

describe('createNativeEnvironment', () => {
  it('ignores text input only within the registration target', () => {
    const { dispatcher, focus } = setup()
    const env = createNativeEnvironment(dispatcher, 'mac')
    const input = { name: 'input' }
    const form = { contains: (node: unknown) => node === input }
    const sidebar = { contains: () => false }
    const root = dispatcher.root as never

    const event = keydown()
    dispatcher.dispatch(event)
    expect(env.shouldIgnoreInputEvent(event as never, root, root)).toBe(false)

    focus(input)
    const typing = keydown()
    dispatcher.dispatch(typing)
    expect(env.shouldIgnoreInputEvent(typing as never, root, root)).toBe(true)
    expect(env.shouldIgnoreInputEvent(typing as never, root, form as never)).toBe(true)
    expect(env.shouldIgnoreInputEvent(typing as never, root, input as never)).toBe(false)
    expect(env.shouldIgnoreInputEvent(typing as never, root, sidebar as never)).toBe(false)

    expect(env.targetsOverlap(form as never, input as never)).toBe(true)
    expect(env.targetsOverlap(sidebar as never, input as never)).toBe(false)
    expect(env.targetsOverlap(root, sidebar as never)).toBe(true)
  })
})
