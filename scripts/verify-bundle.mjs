#!/usr/bin/env node
// Bundles example/ with Metro for iOS and Android, as a release build would,
// compiles each bundle to Hermes bytecode, and checks that @tanstack/hotkeys
// resolved to the patched core. Run after `npm pack` and installing
// example/ (see CONTRIBUTING.md).
//
// With HERMES=/path/to/hermes (the Hermes VM CLI), also runs example/smoke:
// hotkeys driven by a fake iOS native module, executed by Hermes.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const example = join(dirname(fileURLToPath(import.meta.url)), '..', 'example')
const require = createRequire(join(example, 'package.json'))
const Metro = require('metro')
const hermesc = join(
  dirname(require.resolve('hermes-compiler/package.json')),
  'hermesc',
  process.platform === 'darwin' ? 'osx-bin' : 'linux64-bin',
  'hermesc',
)

const out = join(example, 'build')
mkdirSync(out, { recursive: true })
const config = await Metro.loadConfig({ cwd: example })

let failed = false
for (const platform of ['ios', 'android']) {
  const bundle = join(out, `index.${platform}.js`)
  await Metro.runBuild(config, {
    entry: 'index.js',
    platform,
    dev: false,
    minify: false,
    out: bundle,
  })
  const source = readFileSync(bundle, 'utf8')
  // Release bundles drop module paths, so look for code instead
  const checks = {
    'patched core bundled': source.includes('eventReachesTarget'),
    // The unpatched core attaches listeners directly
    'unpatched core not bundled': !source.includes('group.keydown'),
    'native module wired': source.includes('TanStackHotkeysKey'),
  }
  execFileSync(hermesc, ['-O', '-emit-binary', '-out', `${bundle}.hbc`, bundle], {
    stdio: 'inherit',
  })
  checks['compiles to Hermes bytecode'] = true
  for (const [name, ok] of Object.entries(checks)) {
    console.log(`${platform}: ${ok ? 'ok  ' : 'FAIL'} ${name}`)
    failed ||= !ok
  }
}
if (process.env.HERMES) {
  const stub = join(example, 'smoke', 'react-native.js')
  const resolveRequest = config.resolver.resolveRequest
  const smokeConfig = {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) =>
        moduleName === 'react-native'
          ? { type: 'sourceFile', filePath: stub }
          : resolveRequest(context, moduleName, platform),
    },
  }
  const bundle = join(out, 'smoke.js')
  await Metro.runBuild(smokeConfig, {
    entry: 'smoke/entry.js',
    platform: 'ios',
    dev: false,
    minify: false,
    out: bundle,
  })
  execFileSync(hermesc, ['-O', '-emit-binary', '-w', '-out', `${bundle}.hbc`, bundle])
  try {
    execFileSync(process.env.HERMES, [`${bundle}.hbc`], { stdio: 'inherit' })
  } catch {
    failed = true
  }
}

process.exit(failed ? 1 : 0)
