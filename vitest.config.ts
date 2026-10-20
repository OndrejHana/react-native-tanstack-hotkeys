import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const path = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url))

export default defineConfig({
  resolve: {
    // The same aliases `withTanStackHotkeys` adds to Metro
    alias: [
      { find: /^@tanstack\/hotkeys$/, replacement: path('./src/core/hotkeys.ts') },
      {
        find: /^@tanstack\/hotkeys\/adapter$/,
        replacement: path('./src/core/adapter.ts'),
      },
      { find: /^react-native$/, replacement: path('./test/react-native.ts') },
    ],
  },
  test: {
    environment: 'node',
    // Run @tanstack/react-hotkeys through the aliases, as Metro does
    server: { deps: { inline: [/@tanstack\/react-hotkeys/] } },
    setupFiles: ['./test/setup.ts'],
  },
})
