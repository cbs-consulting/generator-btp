/**
 * Runs a command via the generator's `spawnSync` and, if it fails,
 * rethrows with an actionable message.
 *
 * `spawnSync(file, args, options)` delegates to execa's `execaSync`, which
 * throws on a non-zero exit (or a missing binary) rather than returning a
 * status. This wrapper turns that low-level throw into a clear, user-facing
 * error while preserving the underlying detail. (Not `spawnCommandSync`: in
 * yeoman-generator 10 it takes a single command string and ignores an args
 * array, so `git init` would run as a bare `git`.)
 *
 * @param {object} generator - Yeoman generator (provides `spawnSync`)
 * @param {string} command
 * @param {string[]} args
 * @param {object|undefined} options - passed through to `spawnSync`
 * @param {string} friendlyMessage - actionable message prepended to the error
 */
export function spawnSyncOrThrow(
  generator,
  command,
  args,
  options,
  friendlyMessage,
) {
  try {
    return generator.spawnSync(command, args, options);
  } catch (error) {
    const detail = error?.shortMessage ?? error?.message ?? String(error);
    throw new Error(`${friendlyMessage}\n${detail}`, { cause: error });
  }
}
