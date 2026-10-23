# Changelog

What changed in each release of `@cbs-consulting/generator-btp`, newest
first. Add your change under "Unreleased" in the same pull request; a check
fails otherwise, unless the pull request has the label "no changelog". To
release, raise the version in `package.json` and rename "Unreleased" to that
version and the date. The tests fail while the version in `package.json` has
no entry here, and the Release workflow publishes the entry as the GitHub
release notes.

## Unreleased

## 1.5.0 - 2026-10-23

- Replace Jest with Vitest for testing in CAP projects
- Add script for creating a personal HDI container

## 1.4.0 - 2026-10-20

- Open source under the Apache-2.0 license, developed on
  [GitHub](https://github.com/cbs-consulting/generator-btp).
- The generated dev container uses the public
  `mcr.microsoft.com/devcontainers/base:debian` image, so no registry login is
  needed. Organisation defaults live in presets: `--preset cbs` (or
  `BTP_GENERATOR_PRESET=cbs`) uses the cbs Docker Hub mirror of the same
  image, and a preset can also be a JSON file.
- The dev container is image-based: no Dockerfile or post-create scripts. The
  tooling comes from the [cbs Dev Container Features](https://github.com/cbs-consulting/container-features),
  and MCP servers for CDS, UI5 and Fiori are preconfigured.
- Private Azure DevOps npm feeds are added through the `npm-feeds` feature;
  the token is asked for when the container is created.
- With Azure DevOps, the generated `azure-pipelines.yaml` uses a shared CAP
  pipeline repository; the generator asks for its path.
- The UI5 generator is for the UI5 apps of a CAP project only, warns when it
  finds none, and pins the apps' devDependencies to exact versions.
- The CAP generator respects `--skip-install`, stops with a clear message when
  `git init` or `cds init` fails, and only makes the scripts in `scripts/`
  executable.
- The first commit of a generated CAP project passes the pre-commit hook
  (lint-staged and tests).
- Template folders starting with `_` are renamed correctly at every level, for
  example `_.devcontainer/`.
- Needs Node.js 22.22.1 or newer.
- Releases are staged on npm with provenance and go live only when a
  maintainer approves them. `CHANGELOG.md` ships in the npm package.

## 1.3.3 - 2026-04-23

- Generated CAP projects use ts-jest again, as `cds test` no longer sets it up.
- The Cloud Foundry CLI plugins install on aarch64.
- ESLint in generated projects ignores `*.config.mjs` files.

## 1.3.0 - 2026-03-31

- New `setup-azure-devops` generator, also included in the CAP generator: a
  script that sets up branches, branch policies, merge strategies and the
  pipeline, with recommended defaults or every value asked for. It handles
  empty repositories.
- The CAP features passed to `cds init` can be chosen.
- The target directory can be chosen.

## 1.2.10 - 2026-02-12

- Git aliases: `cleanup-branches`, merge strategies with auto-completion, and
  the remote default branch as the comparison base. Fixes for opening and
  closing ticket branches.

## 1.2.7 - 2026-02-11

- The database schema name defaults to the project name.
- The Node.js memory option `max-old-space-size` is set without a unit.

## 1.2.5 - 2026-02-08

- Fixes for loading the sub-generators and `glob`.

## 1.2.1 - 2026-02-07

- Fixes for the ESLint version, the UI5 linter import path and `rootDir`.

## 1.2.0 - 2026-02-07

- Tests for every generator, with vitest.

## 1.1.3 - 2026-02-07

- ESLint is pinned to version 9, cds-typer is configured, and the database
  integrity check is enabled.

## 1.1.0 - 2026-02-06

- New `devcontainer` generator.

## 1.0.4 - 2026-02-05

- Generated projects get a `.gitattributes` with normalised line endings, and
  the dev container updates global packages.

## 1.0.0 - 2026-02-05

- First release: the CAP and UI5 generators.
