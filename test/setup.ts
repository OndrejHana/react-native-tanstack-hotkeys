;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

// react-test-renderer still works with React 19; its deprecation notice is noise here
const error = console.error
console.error = (...args: Array<unknown>) => {
  if (String(args[0]).includes('react-test-renderer is deprecated')) return
  error(...args)
}
