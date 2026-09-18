package expo.modules.androidinstalledgames

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidInstalledGamesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidInstalledGames")

    // Returns the subset of `packages` actually installed on this device. Requires each
    // package to be declared in AndroidManifest.xml's <queries> block (Android 11+ Package
    // Visibility) — see plugins/withAndroidPackageQueries.js — or getPackageInfo throws
    // NameNotFoundException for every one of them regardless of whether it's installed.
    AsyncFunction("getInstalledPackages") { packages: List<String> ->
      val packageManager = appContext.reactContext?.packageManager
        ?: return@AsyncFunction emptyList<String>()

      packages.filter { packageName ->
        try {
          packageManager.getPackageInfo(packageName, 0)
          true
        } catch (error: Exception) {
          false
        }
      }
    }
  }
}
