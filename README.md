<div align="center">

<img src=".github/assets/logo.svg" alt="" width="120" />

# cbs BTP Generator

**Start SAP CAP and UI5 projects with linting, tests, dev containers and CI already set up.**

[![npm](https://img.shields.io/npm/v/@cbs-consulting/generator-btp?logo=npm)](https://www.npmjs.com/package/@cbs-consulting/generator-btp)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.22.1-339933?logo=nodedotjs&logoColor=white)](package.json)
[![Yeoman](https://img.shields.io/badge/yeoman-generator-0F4C5C?logo=yeoman&logoColor=white)](https://yeoman.io)

</div>

---

generator-btp is a [Yeoman](https://yeoman.io) generator that bootstraps SAP
CAP projects, and adds best practices to existing ones: TypeScript, ESLint and
Prettier, pre-commit hooks, MTA descriptors per environment, a dev container
with the full SAP BTP toolchain, and Azure DevOps branch policies and
pipelines. Each part is its own sub-generator, so you can use them together or
one at a time.

Needs Node.js 22.22.1 or newer. The CAP generator also needs
[`@sap/cds-dk`](https://www.npmjs.com/package/@sap/cds-dk) installed globally.

## 🚀 Quick start

```sh
npm install -g yo @cbs-consulting/generator-btp @sap/cds-dk

mkdir my-cap-project && cd my-cap-project
yo @cbs-consulting/btp
```

The generator asks what you want to do and then asks only the questions that
apply. To skip the menu, call a sub-generator directly (see
[Generators](#generators)).

### In a dev container

The [`btp-generator`](https://github.com/cbs-consulting/container-templates/tree/main/src/btp-generator)
Dev Container Template sets up `yo`, this generator and `@sap/cds-dk`, and
starts the generator on first launch. Nothing has to be installed locally:

```sh
mkdir my-btp-app && cd my-btp-app
devcontainer templates apply \
  --template-id ghcr.io/cbs-consulting/container-templates/btp-generator \
  --workspace-folder .
devcontainer up --workspace-folder .
```

In VS Code, run **Dev Containers: Add Dev Container Configuration Files…** in
an empty folder and enter `ghcr.io/cbs-consulting/container-templates/btp-generator`
instead. When the generator has finished, rebuild the container to switch to
the project's own dev container.

<a id="generators"></a>

## 🧩 Generators

| Generator                           | Command                                     | What it does                                                          |
| ----------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| [CAP](#cap)                         | `yo @cbs-consulting/btp:cap`                | Creates a new CAP project with everything below included              |
| [UI5](#ui5)                         | `yo @cbs-consulting/btp:ui5`                | Adds linting and TypeScript settings to the UI5 apps of a CAP project |
| [Dev container](#devcontainer)      | `yo @cbs-consulting/btp:devcontainer`       | Adds a `.devcontainer/` with the SAP BTP toolchain                    |
| [Azure DevOps setup](#azure-devops) | `yo @cbs-consulting/btp:setup-azure-devops` | Adds a script that sets up branch policies and the pipeline           |

<a id="cap"></a>

### 🚀 CAP

Runs `cds init` with the CDS features you choose (TypeScript, MTA, XSUAA, HANA,
SQLite, HTML5 repo, sample content, HTTP, tests; all selected by default) and
then adds:

- ESLint and Prettier, configured through [`@cbs-consulting/tools`](https://www.npmjs.com/package/@cbs-consulting/tools)
- pre-commit hooks (`simple-git-hooks` + `lint-staged`) that lint, format and test
- `mta.yaml` with extensions for dev, test and prod in `mta-ext/`
- git aliases for ticket-based branches and pull requests (`.gitconfig.aliases`)
- the [dev container](#devcontainer), always
- the [Azure DevOps setup](#azure-devops) and an `azure-pipelines.yaml` that
  uses a shared CAP pipeline repository, if you use Azure DevOps

```text
my-cap-project/
├── .devcontainer/devcontainer.json
├── .vscode/settings.json
├── app/  db/  srv/                # from cds init
├── mta-ext/{dev,test,prod}.mtaext
├── scripts/setup-azure-devops/    # if Azure DevOps is used
├── .gitconfig.aliases  .gitattributes  .gitignore  .npmrc
├── azure-pipelines.yaml           # if Azure DevOps is used
├── eslint.config.mjs  prettier.config.mjs
├── mta.yaml  package.json  tsconfig.json
```

The generated project gets these npm scripts:

| Script                                               | What it does                                               |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `npm start`                                          | Serve the CAP app (`cds-serve`)                            |
| `npm run watch` / `hybrid`                           | `cds watch`, locally or with the `hybrid` profile          |
| `npm test`                                           | Tests, added by the `test` feature of `cds init`           |
| `npm run lint` / `lint-fix` / `lint-quiet`           | ESLint, with fixes, or errors only                         |
| `npm run format`                                     | Prettier                                                   |
| `npm run build`                                      | Production CAP build                                       |
| `npm run deploy-dev`                                 | Build and blue-green deploy to the dev space               |
| `npm run create-ownHDI` / `deploy-ownHDI` / `ownHDI` | Create, deploy to and watch against your own HDI container |
| `npm run coverage-report`                            | Serve the HTML coverage report                             |
| `npm run git-config`                                 | Install the git aliases locally                            |
| `npm run check-deps` / `upgrade-deps`                | Check or upgrade dependencies                              |

<a id="ui5"></a>

### 🎨 UI5

Run it from the root of a CAP project. It finds the UI5 apps by their
`app/<name>/ui5.yaml` and, in each app, adds `eslint.config.mjs`,
`ui5lint.config.mjs`, lint scripts in `package.json`, and `tsconfig.json`
settings that make the CAP-generated types available. It warns if it finds no
apps. Standalone UI5 projects (without CAP) are not supported.

<a id="devcontainer"></a>

### 🐳 Dev container

Writes an image-based `.devcontainer/devcontainer.json` (no Dockerfile, no
post-create script) with:

- the base image from the [preset](#presets), `mcr.microsoft.com/devcontainers/base:debian` by default
- Node.js, the Azure CLI, and the [cbs Dev Container Features](https://github.com/cbs-consulting/container-features)
  for the Cloud Foundry CLI, the CAP and Fiori tooling, TypeScript, and VS Code
  extensions and settings
- MCP servers for CDS, UI5 and Fiori, preconfigured for VS Code

If you answer yes to **"Add private Azure DevOps npm feeds?"**, it asks for
each feed's scope, organization, project and name and adds them to the
[`npm-feeds`](https://github.com/cbs-consulting/container-features/tree/main/src/npm-feeds)
feature. The container then asks for a personal access token (`PAT_<ORG>`)
when it is created.

<a id="azure-devops"></a>

### ☁️ Azure DevOps setup

Writes `scripts/setup-azure-devops/` with a `setup.sh` that uses the Azure CLI
to create the `main` and `development` branches, set their review and merge
policies and build validation, and create the pipeline from
`azure-pipelines.yaml`. The settings are in `azure-devops.env`; answer no to
"Use recommended best practices" to choose them yourself.

```sh
az login --allow-no-subscriptions
bash scripts/setup-azure-devops/setup.sh
```

<a id="presets"></a>

## ⚙️ Presets

Defaults that belong to one organization, such as a base image from a private
registry, are kept in a preset. Without one, the generator only uses images
and packages that anyone can pull without logging in.

Choose a preset with `--preset`, or with the `BTP_GENERATOR_PRESET`
environment variable for every run:

```sh
yo @cbs-consulting/btp --preset cbs
BTP_GENERATOR_PRESET=./acme-preset.json yo @cbs-consulting/btp:devcontainer
```

| Key                  | `default`                                     | `cbs`                                                     |
| -------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `baseImage`          | `mcr.microsoft.com/devcontainers/base:debian` | `cbsgroupdocker/cbs-debian:latest` (needs `docker login`) |
| `pipelineRepository` | `Central-Pipelines/central-cap-pipeline`      | same                                                      |

A preset can also be a JSON file. Its keys override the `default` preset, and
an unknown key stops the run, so a typo does not go unnoticed:

```json
{
  "baseImage": "registry.acme.example/devcontainers/debian:latest"
}
```

<a id="releases"></a>

## 📌 Releases

The generator is published to npm as
[`@cbs-consulting/generator-btp`](https://www.npmjs.com/package/@cbs-consulting/generator-btp),
following [semantic versioning](https://semver.org).
[`CHANGELOG.md`](CHANGELOG.md) lists what changed in each release.

Releases are made by the "Release" workflow in the Actions tab, which

1. runs the lint checks and tests on the commit to release,
2. requires a higher version in `package.json` than the latest one on npm,
3. stages it on npm, with a provenance statement that ties the package to
   this repository and commit, and
4. publishes that commit as the GitHub release `v<version>`, with the
   version's entry in `CHANGELOG.md` as the release notes.

A staged version goes live, and becomes `@latest`, when a maintainer approves
it with two-factor authentication. [DEVELOPMENT.md](DEVELOPMENT.md#publishing)
describes the steps.

## 🛠️ Contributing

```sh
git clone https://github.com/cbs-consulting/generator-btp.git
cd generator-btp
npm install
npm run hooks            # lints and formats staged files before each commit
npm link                 # makes `yo @cbs-consulting/btp` run your checkout
```

```sh
npm test                    # unit and generator tests (vitest)
npm run test:devcontainer   # scaffolds a CAP project and makes its first commit inside the real dev container (needs Docker)
npm run lint
```

Every change goes into the "Unreleased" section of `CHANGELOG.md` in its pull
request. The "Changelog entry" check fails on pull requests that do not change
`CHANGELOG.md`; give those that change nothing a user notices (chores, CI,
typos) the label "no changelog". [DEVELOPMENT.md](DEVELOPMENT.md) explains how
the generators are put together and how to add one.

The repository has its own dev container with Node.js and Docker, so all of
the above, including the dev container test, runs in it unchanged.

## 📄 License

Copyright © 2026 cbs Corporate Business Solutions Unternehmensberatung GmbH.
Licensed under the [Apache License 2.0](LICENSE).

<sub>SAP, SAP BTP, SAP Fiori, SAPUI5 and SAP HANA are trademarks of SAP SE. This project is not affiliated with or endorsed by SAP.</sub>
