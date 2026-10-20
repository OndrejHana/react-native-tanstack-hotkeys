package com.tanstackhotkeys

import android.os.Build
import android.view.KeyCharacterMap
import android.view.KeyEvent
import android.view.KeyboardShortcutGroup
import android.view.Menu
import android.view.Window
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil

/**
 * Sends every hardware key event of the app's activity to JavaScript, and
 * swallows the ones registered hotkeys handle (see `setConsumeRules`) before
 * views such as text fields, or Android's Escape-means-Back fallback, act on
 * them.
 *
 * Events are read by wrapping the activity window's `Window.Callback`, so the
 * app's `MainActivity` needs no changes. Windows of dialogs, including React
 * Native's `<Modal>`, have their own callback and are not covered. Keys an
 * input method consumes, such as during composition, never reach the window.
 */
class TanStackHotkeysModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  private class Rule(
      val keyCodes: Set<Int>,
      val scanCodes: Set<Int>,
      val chars: Set<String>,
      val modifiers: Int,
      val shiftOptional: Boolean,
      val skipInText: Boolean,
  ) {
    fun matches(event: KeyEvent, chars: Set<String>, modifiers: Int, textFocused: Boolean): Boolean {
      if (skipInText && textFocused) return false
      val ignored = if (shiftOptional) SHIFT.inv() else 0.inv()
      if ((this.modifiers and ignored) != (modifiers and ignored)) return false
      // A scan code identifies the physical key; key codes follow the layout
      val physical =
          (event.scanCode > 0 && event.scanCode in scanCodes) ||
              ((event.scanCode <= 0 || scanCodes.isEmpty()) && event.keyCode in keyCodes)
      return physical || chars.any { it in this.chars }
    }
  }

  @Volatile private var rules: List<Rule> = emptyList()

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  override fun initialize() {
    super.initialize()
    UiThreadUtil.runOnUiThread { attach() }
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    UiThreadUtil.runOnUiThread {
      val callback = reactApplicationContext.currentActivity?.window?.callback
      if (callback is KeyCallback && callback.owner === this) callback.owner = null
    }
    super.invalidate()
  }

  override fun onHostResume() = attach()

  override fun onHostPause() = emitBlur()

  override fun onHostDestroy() = Unit

  /** Replaces the keys to swallow. Called by JavaScript whenever hotkeys change. */
  @ReactMethod
  fun setConsumeRules(rules: ReadableArray) {
    this.rules =
        (0 until rules.size()).mapNotNull { index ->
          val rule = rules.getMap(index) ?: return@mapNotNull null
          Rule(
              keyCodes = rule.ints("keyCodes"),
              scanCodes = rule.ints("scanCodes"),
              chars = rule.getArray("chars")?.let { array -> (0 until array.size()).mapNotNull { array.getString(it) }.toSet() } ?: emptySet(),
              modifiers = rule.getInt("modifiers"),
              shiftOptional = rule.getBoolean("shiftOptional"),
              skipInText = rule.getBoolean("skipInText"),
          )
        }
  }

  // Required by NativeEventEmitter
  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) = Unit

  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Double) = Unit

  private fun com.facebook.react.bridge.ReadableMap.ints(name: String): Set<Int> =
      getArray(name)?.let { array -> (0 until array.size()).map { array.getInt(it) }.toSet() }
          ?: emptySet()

  /** Wraps the current activity's window callback, once per window. */
  private fun attach() {
    val window = reactApplicationContext.currentActivity?.window ?: return
    val callback = window.callback ?: return
    if (callback is KeyCallback) {
      // After a reload, a new module instance takes over the existing wrapper
      callback.owner = this
      return
    }
    window.callback = KeyCallback(callback, this)
  }

  private fun isTextFocused(): Boolean =
      reactApplicationContext.currentActivity?.currentFocus?.onCheckIsTextEditor() == true

  /** Reports a key event to JavaScript and returns whether to swallow it. */
  internal fun handle(event: KeyEvent): Boolean {
    val down =
        when (event.action) {
          KeyEvent.ACTION_DOWN -> true
          KeyEvent.ACTION_UP -> false
          else -> return false
        }
    // Fallbacks (Escape → Back, Meta+Escape → Home, …) repeat a key the app
    // did not handle, and soft keyboards send Enter and Delete to text fields
    if (event.flags and (KeyEvent.FLAG_FALLBACK or KeyEvent.FLAG_SOFT_KEYBOARD) != 0) {
      return false
    }
    val meta = event.metaState
    val shiftCaps = meta and (KeyEvent.META_SHIFT_MASK or KeyEvent.META_CAPS_LOCK_ON)
    val typed = event.getUnicodeChar(shiftCaps)
    val altGraphTyped =
        if (meta and KeyEvent.META_ALT_RIGHT_ON != 0)
            event.getUnicodeChar(shiftCaps or (meta and KeyEvent.META_ALT_MASK))
        else typed
    val deadKey = typed and KeyCharacterMap.COMBINING_ACCENT != 0
    val char = typed and KeyCharacterMap.COMBINING_ACCENT_MASK
    val textFocused = isTextFocused()

    if (reactApplicationContext.hasActiveReactInstance()) {
      val payload =
          Arguments.createMap().apply {
            putString("type", if (down) "keydown" else "keyup")
            putInt("keyCode", event.keyCode)
            putInt("scanCode", event.scanCode)
            putInt("metaState", meta)
            putInt("unicodeChar", char)
            putInt("altGraphUnicodeChar", altGraphTyped and KeyCharacterMap.COMBINING_ACCENT_MASK)
            putBoolean("deadKey", deadKey)
            putInt("repeatCount", event.repeatCount)
            putBoolean("textInputFocused", textFocused)
          }
      reactApplicationContext.emitDeviceEvent(KEY_EVENT, payload)
    }

    if (!down) return consumedKeys.remove(event.keyCode)

    // Right Alt that types another character is AltGr, as JavaScript reports it
    val altGraphChar = altGraphTyped and KeyCharacterMap.COMBINING_ACCENT_MASK
    val altGraph = altGraphChar > 0x1f && altGraphChar != char
    val modifiers =
        (if (event.isCtrlPressed) CONTROL else 0) or
            (if (event.isAltPressed && !altGraph) ALT else 0) or
            (if (event.isShiftPressed) SHIFT else 0) or
            (if (event.isMetaPressed) META else 0)
    val chars =
        listOf(
                char,
                event.getUnicodeChar(0) and KeyCharacterMap.COMBINING_ACCENT_MASK,
                if (altGraph) altGraphChar else 0,
            )
            .filter { it > 0x1f && it != 0x7f }
            .map { String(Character.toChars(it)).lowercase() }
            .toSet()
    val consume = rules.any { it.matches(event, chars, modifiers, textFocused) }
    if (consume) consumedKeys.add(event.keyCode) else consumedKeys.remove(event.keyCode)
    return consume
  }

  internal fun emitBlur() {
    UiThreadUtil.runOnUiThread { consumedKeys.clear() }
    if (reactApplicationContext.hasActiveReactInstance()) {
      reactApplicationContext.emitDeviceEvent(BLUR_EVENT, null)
    }
  }

  /** Forwards everything to the activity's callback, after offering key events to the module. */
  private class KeyCallback(
      private val wrapped: Window.Callback,
      @Volatile var owner: TanStackHotkeysModule?,
  ) : Window.Callback by wrapped {
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      val consumed = owner?.handle(event) ?: false
      return consumed || wrapped.dispatchKeyEvent(event)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
      if (!hasFocus) owner?.emitBlur()
      wrapped.onWindowFocusChanged(hasFocus)
    }

    // Java default methods, which Kotlin delegation does not always forward
    @RequiresApi(Build.VERSION_CODES.N)
    override fun onProvideKeyboardShortcuts(
        data: MutableList<KeyboardShortcutGroup>?,
        menu: Menu?,
        deviceId: Int,
    ) = wrapped.onProvideKeyboardShortcuts(data, menu, deviceId)

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onPointerCaptureChanged(hasCapture: Boolean) =
        wrapped.onPointerCaptureChanged(hasCapture)
  }

  companion object {
    /**
     * Key codes whose keydown was swallowed, so their keyup is too. Shared by
     * module instances so a JavaScript reload mid-press keeps it. UI thread only.
     */
    private val consumedKeys = mutableSetOf<Int>()

    const val NAME = "TanStackHotkeys"
    const val KEY_EVENT = "TanStackHotkeysKey"
    const val BLUR_EVENT = "TanStackHotkeysBlur"
    private const val CONTROL = 1
    private const val ALT = 2
    private const val SHIFT = 4
    private const val META = 8
  }
}
