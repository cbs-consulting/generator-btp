#!/usr/bin/env node
// Headless scaffolder used by scripts/test-in-devcontainer.sh.
//
// Generates a real CAP project (same answers as the "first commit should pass
// linting" suite in generators/cap/__tests__/index.test.js) into the directory
// passed as the first CLI argument, so the .devcontainer/ the generator emits
// can be booted with the @devcontainers/cli and exercised end-to-end.
//
// Run with plain `node` (not vitest): the default export carries `.run`; the
// `import * as helpers` form the test files use only works under vitest's interop.
import { rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import helpers from "yeoman-test";

const __dirname = dirname(fileURLToPath(import.meta.url));

const targetArg = process.argv[2];
if (!targetArg) {
  console.error("usage: node scripts/generate-sample.mjs <target-directory>");
  process.exit(1);
}
const targetDir = resolve(targetArg);

const runResult = await helpers
  .run(join(__dirname, "../generators/cap/index.js"))
  // Clean + generate into a known directory instead of a throwaway tmp dir.
  .inDir(targetDir)
  .withPrompts({
    targetDirectory: ".",
    projectName: "Devcontainer Smoke Test",
    customerName: "cbs",
    dbSchema: "DC_SMOKE",
    cdsFeatures: [
      "typescript",
      "sqlite",
      "hana",
      "xsuaa",
      "tiny-sample",
      "test",
    ],
    useAzureDevOps: false,
  })
  // yeoman-test defaults skipInstall to true; opt in explicitly so install()
  // records the devDependencies (lint-staged, simple-git-hooks, eslint, ...) into
  // the generated package.json. Without them, the in-container first commit's
  // `npx lint-staged` would try to download lint-staged and block on a prompt.
  .withOptions({ skipInstall: false });

// install() recorded the devDependencies in package.json AND populated
// node_modules on THIS host. We want the install to happen inside the generated
// devcontainer instead, so drop the host-built node_modules. The package.json /
// package-lock.json (the configs we actually want to validate) are kept.
const projectRoot = runResult.generator.destinationRoot();
rmSync(join(projectRoot, "node_modules"), { recursive: true, force: true });

// Do NOT call runResult.restore()/cleanup(): the generated files must persist so
// the orchestrator can mount them into the container.
console.error(`\n✅ Generated sample CAP project at: ${projectRoot}`);
