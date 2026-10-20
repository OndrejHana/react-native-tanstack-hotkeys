package com.tanstackhotkeys

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TanStackHotkeysPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == TanStackHotkeysModule.NAME) TanStackHotkeysModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        TanStackHotkeysModule.NAME to
            ReactModuleInfo(
                TanStackHotkeysModule.NAME,
                TanStackHotkeysModule::class.java.name,
                false, // canOverrideExistingModule
                true, // needsEagerInit: hook the window before JavaScript asks
                false, // isCxxModule
                false, // isTurboModule
            ),
    )
  }
}
