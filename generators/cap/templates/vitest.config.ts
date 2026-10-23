import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: [...configDefaults.exclude, "**/__archive/**", "**/config/**", "**/gen/**"],
    globals: true,
    environment: 'node',
    // cds-plugin-ui5 starts a Fiori dev proxy during cds.test; disable it for service tests
    env: { CDS_PLUGIN_UI5_ACTIVE: 'false' },
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
    execArgv: ['--import', 'tsx'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['srv/**/*.{ts,tsx}']
    }
  },
});
