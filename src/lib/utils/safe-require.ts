/**
 * Safely require a module at runtime (not bundled/analyzed at build time)
 * This prevents Turbopack/Webpack from trying to bundle these packages
 *
 * Use this for third-party packages that should be resolved at runtime,
 * not at build time. Node.js built-ins (path, fs, child_process, etc.)
 * don't need this wrapper.
 */
export function safeRequire<T = unknown>(moduleName: string): T {
  // Using eval to prevent static analysis by bundlers
  // eslint-disable-next-line no-eval
  return eval('require')(moduleName) as T;
}
