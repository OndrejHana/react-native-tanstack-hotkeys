import { NativeKeyboardEvent } from './event';
/**
 * The default hotkey target on React Native, in place of the browser's
 * `document` and `window`: it receives every key press.
 */
export class NativeKeyboardRoot {
    toString() {
        return '[NativeKeyboardRoot]';
    }
}
/** Whether `ancestor` is `node` or contains it, for host instances with the DOM traversal API. */
function contains(ancestor, node) {
    if (ancestor === node)
        return true;
    const candidate = ancestor;
    if (typeof candidate.contains !== 'function')
        return false;
    try {
        return candidate.contains(node);
    }
    catch {
        // An unmounted host instance
        return false;
    }
}
/** Reports a listener error without interrupting dispatch, as the DOM does. */
function report(error) {
    setTimeout(() => {
        throw error;
    }, 0);
}
/**
 * Routes key events from the native modules to hotkey listeners. Events go
 * through the root and any targets around the focused text field, in DOM
 * order: capture listeners outermost first, then bubble listeners innermost
 * first.
 */
export class KeyboardDispatcher {
    constructor(focus) {
        this.focus = focus;
        this.root = new NativeKeyboardRoot();
        this.listeners = new Map();
    }
    /** Adds a listener and returns a function that removes it. */
    listen(target, type, listener, capture) {
        let entries = this.listeners.get(target);
        if (!entries) {
            entries = [];
            this.listeners.set(target, entries);
        }
        const entry = { type, listener, capture, removed: false };
        entries.push(entry);
        return () => {
            if (entry.removed)
                return;
            entry.removed = true;
            const list = this.listeners.get(target);
            if (!list)
                return;
            list.splice(list.indexOf(entry), 1);
            if (list.length === 0)
                this.listeners.delete(target);
        };
    }
    /** Whether any listener for `type` is attached. */
    hasListeners(type) {
        for (const entries of this.listeners.values()) {
            if (entries.some((entry) => entry.type === type))
                return true;
        }
        return false;
    }
    /** Dispatches a key event through the root and the targets around the focused text field. */
    dispatch(event) {
        const focused = this.focus.focusedTextInput();
        const around = [];
        if (focused) {
            for (const target of this.listeners.keys()) {
                if (target !== this.root && contains(target, focused)) {
                    around.push(target);
                }
            }
            // Innermost first
            around.sort((a, b) => (contains(a, b) ? 1 : contains(b, a) ? -1 : 0));
        }
        const path = focused && around[0] !== focused
            ? [focused, ...around, this.root]
            : [...around, this.root];
        event.target = focused ?? this.root;
        event._path = path;
        for (let index = path.length - 1; index >= 0; index--) {
            if (!this.invoke(event, path[index], true))
                break;
        }
        if (!event._propagationStopped) {
            for (const target of path) {
                if (!event.bubbles && target !== event.target)
                    break;
                if (!this.invoke(event, target, false))
                    break;
            }
        }
        event.currentTarget = null;
        event.eventPhase = NativeKeyboardEvent.NONE;
    }
    /** Tells root listeners that the app lost focus, so held keys are released. */
    blur() {
        const event = { type: 'blur', target: this.root, currentTarget: this.root };
        for (const entry of this.listeners.get(this.root)?.slice() ?? []) {
            if (entry.type !== 'blur' || entry.removed)
                continue;
            try {
                ;
                entry.listener(event);
            }
            catch (error) {
                report(error);
            }
        }
    }
    /** Runs one target's listeners for a phase. Returns false once propagation stops. */
    invoke(event, target, capture) {
        const entries = this.listeners.get(target);
        if (entries) {
            event.currentTarget = target;
            event.eventPhase =
                target === event.target
                    ? NativeKeyboardEvent.AT_TARGET
                    : capture
                        ? NativeKeyboardEvent.CAPTURING_PHASE
                        : NativeKeyboardEvent.BUBBLING_PHASE;
            // Listeners added during dispatch wait for the next event
            for (const entry of entries.slice()) {
                if (entry.removed ||
                    entry.type !== event.type ||
                    entry.capture !== capture) {
                    continue;
                }
                try {
                    ;
                    entry.listener(event);
                }
                catch (error) {
                    report(error);
                }
                if (event._immediatePropagationStopped)
                    return false;
            }
        }
        return !event._propagationStopped;
    }
}
/** Whether a text field had focus for this event, by the native report or the focused `TextInput`. */
function isTextEntry(event, root) {
    const native = event;
    return (native.textInputFocused ||
        (native.target !== null && native.target !== root));
}
/**
 * Creates the `HotkeysEnvironment` for React Native. Element targets are
 * host instances, such as a `TextInput` ref: their hotkeys fire while that
 * text field, or one inside them, has focus.
 */
export function createNativeEnvironment(dispatcher, platform) {
    const root = dispatcher.root;
    const shouldIgnore = (event, registrationTarget) => {
        if (!isTextEntry(event, dispatcher.root))
            return false;
        if (registrationTarget === root)
            return true;
        const focused = event.target;
        // A hotkey targeted at the text field itself receives its keys
        if (!focused || focused === dispatcher.root)
            return false;
        if (focused === registrationTarget)
            return false;
        return contains(registrationTarget, focused);
    };
    return {
        defaultTarget: () => root,
        globalTarget: () => root,
        listen: (target, type, listener, capture) => dispatcher.listen(target, type, listener, capture),
        detectPlatform: () => platform,
        isEventForTarget: (event, target) => event.currentTarget === target,
        eventReachesTarget: (event, target) => target === root ||
            event._path.includes(target),
        shouldIgnoreInputEvent: (event, _listenerTarget, registrationTarget) => shouldIgnore(event, registrationTarget),
        isTypingEvent: (event, target) => shouldIgnore(event, target),
        targetsOverlap: (a, b) => a === root || b === root || contains(a, b) || contains(b, a),
        createKeyboardEvent: (type, init) => new NativeKeyboardEvent(type, init),
    };
}
