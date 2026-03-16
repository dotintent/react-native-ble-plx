package com.bleplx

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * TurboModule ReactPackage registration for BlePlx.
 */
class BlePlxPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            BlePlxModule.NAME -> BlePlxModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                BlePlxModule.NAME to ReactModuleInfo(
                    BlePlxModule.NAME,
                    BlePlxModule.NAME,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    false, // isCxxModule
                    true   // isTurboModule
                )
            )
        }
    }
}
