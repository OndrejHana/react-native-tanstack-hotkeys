/**
 * The keyboard event hotkey callbacks receive on React Native. It has the
 * fields and methods of a DOM `KeyboardEvent` that hotkeys use, so callbacks
 * can be shared with the web.
 *
 * `preventDefault()` cannot stop the native action after the fact, because
 * events reach JavaScript asynchronously. Instead, the native modules
 * suppress keys of registered hotkeys before they reach the app; see the
 * README.
 */
export class NativeKeyboardEvent {
    constructor(type, init = {}) {
        this.composed = true;
        this.defaultPrevented = false;
        /** The focused text field the event is for, or the keyboard root. */
        this.target = null;
        /** The target whose listeners are running. */
        this.currentTarget = null;
        this.eventPhase = NativeKeyboardEvent.NONE;
        /** @internal Targets the event travels through, innermost first. */
        this._path = [];
        /** @internal */
        this._propagationStopped = false;
        /** @internal */
        this._immediatePropagationStopped = false;
        this.type = type;
        this.key = init.key ?? '';
        this.code = init.code ?? '';
        this.ctrlKey = init.ctrlKey ?? false;
        this.shiftKey = init.shiftKey ?? false;
        this.altKey = init.altKey ?? false;
        this.metaKey = init.metaKey ?? false;
        this.repeat = init.repeat ?? false;
        this.location = init.location ?? 0;
        this.isComposing = init.isComposing ?? false;
        this.bubbles = init.bubbles ?? true;
        this.cancelable = init.cancelable ?? true;
        this.altGraph = init.altGraph ?? false;
        this.capsLock = init.capsLock ?? false;
        this.textInputFocused = init.textInputFocused ?? false;
        this.isTrusted = init.isTrusted ?? false;
        this.timeStamp = Date.now();
    }
    /** Creates the event for a key from a native module. */
    static fromNative(key) {
        return new NativeKeyboardEvent(key.type, { ...key, isTrusted: true });
    }
    getModifierState(keyArg) {
        switch (keyArg) {
            case 'Control':
                return this.ctrlKey;
            case 'Shift':
                return this.shiftKey;
            case 'Alt':
                return this.altKey;
            case 'Meta':
                return this.metaKey;
            case 'AltGraph':
                return this.altGraph;
            case 'CapsLock':
                return this.capsLock;
            default:
                return false;
        }
    }
    preventDefault() {
        if (this.cancelable)
            this.defaultPrevented = true;
    }
    stopPropagation() {
        this._propagationStopped = true;
    }
    stopImmediatePropagation() {
        this._propagationStopped = true;
        this._immediatePropagationStopped = true;
    }
    composedPath() {
        return this._path.slice();
    }
}
NativeKeyboardEvent.NONE = 0;
NativeKeyboardEvent.CAPTURING_PHASE = 1;
NativeKeyboardEvent.AT_TARGET = 2;
NativeKeyboardEvent.BUBBLING_PHASE = 3;
NativeKeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0;
NativeKeyboardEvent.DOM_KEY_LOCATION_LEFT = 1;
NativeKeyboardEvent.DOM_KEY_LOCATION_RIGHT = 2;
NativeKeyboardEvent.DOM_KEY_LOCATION_NUMPAD = 3;
