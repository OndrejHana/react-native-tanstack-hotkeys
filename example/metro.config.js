const { getDefaultConfig } = require('@react-native/metro-config')
const { withTanStackHotkeys } = require('react-native-tanstack-hotkeys/metro')

module.exports = withTanStackHotkeys(getDefaultConfig(__dirname))
