// Autolinking for react-native-tanstack-hotkeys. iOS and macOS use the podspec.
module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.tanstackhotkeys.TanStackHotkeysPackage;',
        packageInstance: 'new TanStackHotkeysPackage()',
      },
      // Windows needs no native code: <HotkeysRoot> reads key events in JavaScript
      windows: null,
    },
  },
}
