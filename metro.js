'use strict'

const fs = require('fs')
const path = require('path')

const vendored = require('./vendor/tanstack-hotkeys/package.json')

/** Module names that resolve to this package's patched TanStack Hotkeys. */
const ALIASES = {
  '@tanstack/hotkeys': path.join(__dirname, 'lib', 'core', 'hotkeys.js'),
  '@tanstack/hotkeys/adapter': path.join(__dirname, 'lib', 'core', 'adapter.js'),
}

/** Warns when the installed @tanstack/react-hotkeys expects another core version. */
function checkCoreVersion(projectRoot) {
  let manifest
  try {
    const file = require.resolve('@tanstack/react-hotkeys/package.json', {
      paths: [projectRoot],
    })
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return
  }
  const expected = (manifest.dependencies || {})['@tanstack/hotkeys']
  if (expected && expected.replace(/^[\^~=]/, '') !== vendored.version) {
    console.warn(
      `react-native-tanstack-hotkeys: @tanstack/react-hotkeys@${manifest.version} ` +
        `expects @tanstack/hotkeys@${expected}, but this package provides ` +
        `${vendored.version}. Install @tanstack/react-hotkeys@${require('./package.json').peerDependencies['@tanstack/react-hotkeys']}, ` +
        'or regenerate the vendored core with `npm run vendor <version>`.',
    )
  }
}

/**
 * Makes `@tanstack/hotkeys`, including inside `@tanstack/react-hotkeys`,
 * resolve to TanStack Hotkeys patched for React Native, with the native
 * environment installed.
 *
 * @example
 * // metro.config.js
 * const { getDefaultConfig } = require('@react-native/metro-config')
 * const { withTanStackHotkeys } = require('react-native-tanstack-hotkeys/metro')
 *
 * module.exports = withTanStackHotkeys(getDefaultConfig(__dirname))
 */
function withTanStackHotkeys(config) {
  checkCoreVersion(config.projectRoot || process.cwd())
  const resolver = config.resolver || {}
  const previous = resolver.resolveRequest
  return {
    ...config,
    resolver: {
      ...resolver,
      resolveRequest(context, moduleName, platform) {
        const alias = ALIASES[moduleName]
        if (alias) return { type: 'sourceFile', filePath: alias }
        return previous
          ? previous(context, moduleName, platform)
          : context.resolveRequest(context, moduleName, platform)
      },
    },
  }
}

module.exports = { withTanStackHotkeys, ALIASES }
