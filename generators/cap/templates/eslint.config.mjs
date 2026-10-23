import capTsConfig from "@cbs-consulting/tools/eslint/cap/ts/eslint.config.mjs"

export default [
  { ignores: ["**/*.config.mjs", "**/*.config.js"] },
  ...(Array.isArray(capTsConfig) ? capTsConfig : [capTsConfig]),
]
