#!/usr/bin/env node
// Rebuilds vendor/: TanStack Hotkeys at an upstream release, with
// patches/tanstack-hotkeys-environment.patch applied. vendor/tanstack-hotkeys
// is the core (JavaScript and types); vendor/tanstack-react-hotkeys has only
// the types of @tanstack/react-hotkeys, whose JavaScript the patch leaves
// unchanged, so apps keep using the npm package at runtime.
//
//   node scripts/vendor-core.mjs [version]
//
// The version defaults to `tanstackHotkeys.version` in package.json. Needs
// git, pnpm, and network access.
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = process.argv[2] ?? pkg.tanstackHotkeys.version
const tag = `@tanstack/hotkeys@${version}`
const patch = join(root, 'patches', 'tanstack-hotkeys-environment.patch')
const work = mkdtempSync(join(tmpdir(), 'tanstack-hotkeys-'))

const run = (cmd, args, cwd = work) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit' })

try {
  console.log(`Cloning ${tag}`)
  run('git', [
    'clone',
    '--depth=1',
    '--branch',
    tag,
    'https://github.com/TanStack/hotkeys.git',
    '.',
  ])
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: work })
    .toString()
    .trim()
  run('git', ['apply', '--3way', patch])
  run('pnpm', [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--filter',
    '@tanstack/react-hotkeys...',
  ])
  const pkgDir = join(work, 'packages', 'hotkeys')
  const reactDir = join(work, 'packages', 'react-hotkeys')
  run('pnpm', ['exec', 'vitest', 'run'], pkgDir)
  run('pnpm', ['exec', 'tsdown'], pkgDir)
  run('pnpm', ['exec', 'vitest', 'run'], reactDir)
  run('pnpm', ['exec', 'tsdown'], reactDir)

  const out = join(root, 'vendor', 'tanstack-hotkeys')
  rmSync(out, { recursive: true, force: true })
  cpSync(join(pkgDir, 'dist'), join(out, 'dist'), { recursive: true })
  cpSync(join(work, 'LICENSE'), join(out, 'LICENSE'))
  const upstream = JSON.parse(
    readFileSync(join(pkgDir, 'package.json'), 'utf8'),
  )
  writeFileSync(
    join(out, 'package.json'),
    JSON.stringify(
      {
        name: '@tanstack/hotkeys',
        version: upstream.version,
        private: true,
        description:
          'TanStack Hotkeys with the HotkeysEnvironment patch, vendored by react-native-tanstack-hotkeys',
        license: upstream.license,
        type: 'module',
        types: './dist/index.d.ts',
        exports: {
          '.': './dist/index.js',
          './adapter': './dist/adapter.js',
        },
        upstreamCommit: commit,
        dependencies: upstream.dependencies,
      },
      null,
      2,
    ) + '\n',
  )
  const reactOut = join(root, 'vendor', 'tanstack-react-hotkeys')
  rmSync(reactOut, { recursive: true, force: true })
  cpSync(join(reactDir, 'dist'), join(reactOut, 'dist'), {
    recursive: true,
    filter: (source) => !source.endsWith('.js'),
  })
  const reactUpstream = JSON.parse(
    readFileSync(join(reactDir, 'package.json'), 'utf8'),
  )
  writeFileSync(
    join(reactOut, 'package.json'),
    JSON.stringify(
      {
        name: '@tanstack/react-hotkeys',
        version: reactUpstream.version,
        private: true,
        description:
          'Types of @tanstack/react-hotkeys with the HotkeysEnvironment patch, vendored by react-native-tanstack-hotkeys',
        license: reactUpstream.license,
        types: './dist/index.d.ts',
        upstreamCommit: commit,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    `Vendored ${tag} (${commit.slice(0, 7)}): ${readdirSync(join(out, 'dist')).length} files`,
  )
} finally {
  rmSync(work, { recursive: true, force: true })
}
