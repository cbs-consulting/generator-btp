# Development Guide

This guide explains how to develop and test the cbs Best Practice Generator.

## Project Structure

```
@cbs-consulting/generator-btp/
├── generators/
│   ├── __tests__/
│   │   └── helpers.js                    # Test utilities
│   ├── app/
│   │   ├── index.js                      # Main entry point (interactive menu)
│   │   └── __tests__/
│   │       └── index.test.js
│   ├── cap/
│   │   ├── index.js                      # CAP project generator
│   │   ├── dependencies.json             # npm dependencies to install
│   │   ├── additions/                    # Files to merge into existing files
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── .vscode/
│   │   │       └── settings.json
│   │   ├── templates/                    # Template files to copy
│   │   │   ├── _.gitignore
│   │   │   ├── _.gitconfig.aliases
│   │   │   ├── _.gitattributes
│   │   │   ├── _.npmrc
│   │   │   ├── eslint.config.mjs
│   │   │   ├── prettier.config.mjs
│   │   │   ├── jest.config.json
│   │   │   ├── mta.yaml
│   │   │   ├── azure-pipelines.yaml
│   │   │   ├── mta-ext/
│   │   │   │   ├── dev.mtaext
│   │   │   │   ├── test.mtaext
│   │   │   │   └── prod.mtaext
│   │   │   ├── srv/
│   │   │   │   └── cat-service.ts
│   │   │   └── test/
│   │   │       └── CatalogService.test.ts
│   │   └── __tests__/
│   │       └── index.test.js
│   ├── ui5/
│   │   ├── index.js                      # UI5 best practices generator
│   │   ├── dependencies.json
│   │   ├── additions/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── templates/
│   │   │   ├── eslint.config.mjs
│   │   │   └── ui5lint.config.mjs
│   │   └── __tests__/
│   │       └── index.test.js
│   ├── devcontainer/
│   │   ├── index.js                      # Dev container generator
│   │   ├── templates/
│   │   │   └── _.devcontainer/
│   │   │       └── devcontainer.json     # Image-based (no Dockerfile/post-create)
│   │   └── __tests__/
│   │       └── index.test.js
│   └── setup-azure-devops/
│       ├── index.js                      # Azure DevOps setup generator
│       ├── templates/
│       │   └── scripts/
│       │       └── setup-azure-devops/
│       │           ├── setup.sh
│       │           ├── azure-devops.env
│       │           └── README.md
│       └── __tests__/
│           └── index.test.js
├── utils/
│   ├── azureDevOps.js                    # Shared Azure DevOps prompts and repo URL parsing
│   ├── jsonFile.js                       # JSON/JSONC merge utilities
│   ├── naming.js                         # Project/customer name normalization
│   ├── presets.js                        # Organisation presets (--preset / BTP_GENERATOR_PRESET)
│   ├── spawn.js                          # spawnSync wrapper with friendly errors
│   ├── templates.js                      # Template tree copying with _-prefix renaming
│   └── __tests__/
├── scripts/
│   ├── generate-sample.mjs               # Headless scaffolder for the devcontainer smoke test
│   └── test-in-devcontainer.sh           # Boots the generated devcontainer & runs first commit
├── package.json
├── README.md
├── DEVELOPMENT.md
└── vitest.config.js
```

## Generator Architecture

The cbs Best Practice Generator follows a **modular design**:

- **App Generator** - Entry point router that presents an interactive menu
- **CAP Generator** - Comprehensive generator that includes devcontainer and optionally setup-azure-devops
- **UI5 Generator** - Standalone generator for enhancing existing UI5 apps
- **Devcontainer Generator** - Can be used standalone or is included by CAP
- **Setup Azure DevOps Generator** - Can be used standalone or is included by CAP

### Key Design Patterns

1. **Composition over Inheritance**: CAP generator directly copies templates from devcontainer and setup-azure-devops generators
2. **Merging Strategy**: Uses `lodash.mergewith` with custom `mergeArray` function for intelligent JSON configuration merging
3. **Template Processing**: EJS template variables available via `this.answers` in each generator
4. **Dependencies Management**: Each generator has a `dependencies.json` file listing npm packages to install

## Development Workflow

### 1. Set up development environment

```bash
# Clone the repository
git clone https://github.com/cbs-consulting/generator-btp.git
cd generator-btp

# Install dependencies and enable the pre-commit hook
npm install
npm run hooks
```

### 2. Run tests

```bash
# Run full test suite with Vitest
npm test

# Run tests in watch mode
npm run test:watch
```

### 3. Validate the generated devcontainer

The vitest suite runs in **this repo's** environment, so a generated project can
pass here yet behave differently in the devcontainer the CAP generator actually
emits (different base image, `node` feature version, CAP stack). To catch that,
scaffold a sample project and run its **first commit inside the generated
devcontainer**:

```bash
npm run test:devcontainer
```

This scaffolds a sample CAP project into a temp dir, boots its `.devcontainer/`
with the [`@devcontainers/cli`](https://github.com/devcontainers/cli), and inside
the container runs `npm install` → `cds-typer` → `git commit`. The commit fires
`simple-git-hooks`' pre-commit (`npx lint-staged && npm test`), so prettier,
eslint and the ts-jest/`cds.test` suite all execute against the real image and
features. A clean commit (exit 0) means the generated configs work in the
container.

Requirements:

- **Docker.** Inside this repo's dev container it's provided by the
  `docker-in-docker` feature in [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json)
  — run **Dev Containers: Rebuild Container** once to pick it up. In CI it runs
  on the Docker-enabled `ubuntu-latest` host (`devcontainer` job in
  [.github/workflows/ci.yml](.github/workflows/ci.yml)).
- **No registry login.** The test uses the `default` preset, whose base image
  (`mcr.microsoft.com/devcontainers/base:debian`) and the
  `ghcr.io/cbs-consulting/container-features/*` features are all public. To test
  the `cbs` preset's private image instead, `docker login` and run
  `BTP_GENERATOR_PRESET=cbs npm run test:devcontainer`.

The orchestrator lives in [scripts/test-in-devcontainer.sh](scripts/test-in-devcontainer.sh)
and the headless scaffolder in [scripts/generate-sample.mjs](scripts/generate-sample.mjs).
First runs are slow (image + features build, then a full in-container install).

### 4. Test generators locally

```bash
# Link the generator globally
npm link

# Test the interactive menu
mkdir test-project && cd test-project
yo @cbs-consulting/btp

# Test specific generators directly
yo @cbs-consulting/btp:cap
yo @cbs-consulting/btp:ui5
yo @cbs-consulting/btp:devcontainer
yo @cbs-consulting/btp:setup-azure-devops

# Unlink when done
npm unlink @cbs-consulting/generator-btp
```

### 5. Alternative local testing (without npm link)

```bash
# Run generator directly using path
yo /path/to/generator-btp/generators/app
```

## Adding New Features

### 1. Add new template files

Create template files in the appropriate generator's `templates/` folder:

```bash
# Example: Adding a new config to CAP generator
touch generators/cap/templates/my-config.json

# Files starting with _ will have the underscore removed in destination
touch generators/cap/templates/_my-hidden-file
```

### 2. Add files to be merged

For JSON files that should be merged with existing files (not replaced), add them to the `additions/` folder:

```bash
# Example: Adding VS Code settings to CAP generator
# Edit generators/cap/additions/.vscode/settings.json
```

### 3. Update dependencies

Add npm packages to the generator's `dependencies.json`:

```json
{
  "devDependencies": [
    "my-new-package@^1.0.0"
  ]
}
```

### 4. Update generator logic

In the generator's `index.js`:

1. **Add prompts** in the `initializing()` or `prompting()` method
2. **Process templates** in the `writing()` method
3. **Install dependencies** in the `install()` method (reads from dependencies.json)
4. **Post-generation tasks** in the `end()` method

### 5. Write tests

Add test cases in the generator's `__tests__/index.test.js`:

```javascript
describe("My New Feature", () => {
  it("should create the expected file", async () => {
    const result = await helpers
      .run(Generator)
      .withPrompts({ /* your prompts */ });
    
    result.assertFile(["my-expected-file.json"]);
  });
});
```

### 6. Update documentation

Update [README.md](README.md) to document your new feature in the appropriate generator section.

## Testing Guidelines

### Test Structure

Each generator has its own test file in `generators/<name>/__tests__/index.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import helpers from "yeoman-test";
import Generator from "../index.js";

describe("generator-btp:my-generator", () => {
  let result;

  beforeAll(async () => {
    result = await helpers
      .run(Generator)
      .withPrompts({
        projectName: "Test Project",
        // ... other prompts
      });
  });

  afterAll(() => {
    if (result) {
      result.restore();
    }
  });

  it("should create expected files", () => {
    result.assertFile(["expected-file.json"]);
  });

  it("should have correct content", () => {
    const content = result.readJSON("expected-file.json");
    expect(content.someProperty).toBe("expectedValue");
  });
});
```

### Running Specific Tests

```bash
# Test a specific generator
npx vitest generators/cap/__tests__

# Run tests matching a pattern
npx vitest -t "CAP generator"
```

## Template File Guidelines

### Using EJS Templates

Template files support EJS syntax for dynamic content:

```ejs
{
  "name": "<%= projectNameNormalized %>",
  "customer": "<%= customerName %>",
  <% if (useAzureDevOps) { %>
  "repository": "<%= azureRepoUrl %>"
  <% } %>
}
```

### Available Template Variables

Variables from prompts are available via `this.answers`:

**CAP Generator**:
- `projectName`, `projectNameNormalized`
- `customerName`, `customerNameNormalized`
- `dbSchema`
- `useAzureDevOps`
- `azureRepoUrl`, `azureDevOpsOrgUrl`, `azureProjectName`, `repoName`
- Branch policy and merge strategy settings

**UI5 Generator**:
- Auto-detects apps, no user prompts

**Devcontainer Generator**:
- `projectName`, `projectNameNormalized`
- `customerName`, `customerNameNormalized`

**Setup Azure DevOps Generator**:
- `projectName`, `projectNameNormalized`
- All Azure DevOps-related settings

### File Naming Conventions

- The leading `_` is removed from every file and directory name in the path
  (e.g., `_.gitignore` → `.gitignore`, `_.devcontainer/devcontainer.json` → `.devcontainer/devcontainer.json`)

## Merging JSON Files

The `jsonFile.js` utility provides functions for merging JSON configurations:

```javascript
import { readJsonC, mergeArray } from "../../utils/jsonFile.js";
import mergewith from "lodash.mergewith";

// Read JSON with comments
const destPkg = readJsonCSafe(this, destPath, {});
const addPkg = readJsonC(srcPath, {});

// Merge with custom array union strategy
const mergedPkg = mergewith({}, destPkg, addPkg, mergeArray);
```

**Merge Strategy**:
- Arrays are unioned (duplicates removed)
- Objects are deeply merged
- Primitive values from source override destination

## Publishing

Releases are made by hand with the "Release" workflow in the Actions tab
([.github/workflows/release.yml](.github/workflows/release.yml)). Do not run
`npm publish` yourself.

1. Every pull request adds a line under "Unreleased" in
   [CHANGELOG.md](CHANGELOG.md), describing the change as a user of the
   generator sees it. The "Changelog entry" check fails otherwise; give pull
   requests that change nothing a user notices (chores, CI, typos) the label
   "no changelog".
2. To prepare a release, raise the version in `package.json` (semantic
   versioning: breaking change = major, feature = minor, fix = patch) and
   rename "Unreleased" to `<version> - <date>`. The tests fail while the
   version in `package.json` has no entry, so neither the pull request nor
   the release can go through without one.
3. After merging to `main`, run the Release workflow on `main` and approve
   the run when GitHub asks for it. The job runs in the `npm` environment,
   which only allows `main` and needs a maintainer's approval. It releases
   the tip of `main`, runs lint and tests, requires a version higher than
   the latest one on npm, stages it on npm with a provenance statement, and
   publishes the GitHub release `v<version>` with the changelog entry as
   notes. Its "dry run" option only runs the checks.
4. A staged version goes live, and becomes `@latest`, when a maintainer
   approves it with two-factor authentication: on npmjs.com under the
   package's staged versions, or with `npm stage approve <stage-id>`.

npm accepts the upload because the workflow is registered as the package's
trusted publisher on npmjs.com (Trusted publishing: GitHub Actions,
organization `cbs-consulting`, repository `generator-btp`, workflow
`release.yml`, environment `npm`, permission "stage publish"). No npm token is
stored anywhere. npm rejects uploads from any other workflow or environment.

The `npm` environment is set up in the repository settings (Settings →
Environments → `npm`): deployment branches limited to `main`, and the
maintainers as required reviewers.

### Verify a published version

```bash
npm install -g @cbs-consulting/generator-btp@latest
yo @cbs-consulting/btp
```

## Troubleshooting

### Generator not found

```bash
# Check if generator is linked
npm ls -g @cbs-consulting/generator-btp

# List all available generators
yo --generators

# Should show: @cbs-consulting/btp, @cbs-consulting/btp:cap, etc.
```

### Template files not copying

Check:
1. Files exist in `generators/<name>/templates/`
2. `globSync` pattern in `writing()` method includes the files
3. File paths use correct replacement pattern
4. Template variables are defined in `this.answers`

### Dependencies not installing

Check:
1. `dependencies.json` exists in generator folder
2. Format is correct: `{ "devDependencies": ["pkg@version"] }`
3. `install()` method reads and processes `dependencies.json`
4. npm install command is correct in generator

### Tests failing

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npx vitest generators/cap/__tests__/index.test.js

# Debug test in watch mode
npm run test:watch
```

### Merge conflicts in JSON files

The `mergeArray` utility unions arrays. To override instead:
1. Delete the key from destination before merging, or
2. Use a different merge strategy in the generator

## Best Practices

1. **Test locally** before releasing - run `npm link` and try the change in a real project
2. **Keep templates minimal** - focus on essential configurations, avoid bloat
3. **Use meaningful prompts** - provide clear descriptions and validation
4. **Document thoroughly** - update README.md and add inline comments
5. **Write the changelog entry** - one line under "Unreleased" in `CHANGELOG.md` per user-visible change
6. **Centralize configs** - use `@cbs-consulting/tools` package for shared ESLint/Prettier configs
7. **Write comprehensive tests** - test file creation, merging, and content
8. **Handle errors gracefully** - validate inputs, check file existence before copying

## Code Style

This project uses:
- **ESLint** (flat config in `eslint.config.mjs`) for linting the generator's own source
- **Prettier** for code formatting
- **ESM modules** (`import`/`export`, not `require`)
- **Modern JavaScript** (async/await, destructuring, etc.)

Lint and format scripts:
```bash
npm run lint          # report lint errors
npm run lint:fix      # auto-fix lint errors
npm run format        # format JS/MJS with Prettier
npm run format:check  # verify formatting without writing
```

A **pre-commit hook** ([.githooks/pre-commit](.githooks/pre-commit)) runs
`lint-staged`, which applies `eslint --fix` and `prettier --write` to staged
`*.{js,mjs}` files. Enable it once per clone with `npm run hooks`. CI runs the
same lint and format checks on every pull request.

> These tools lint/format the generator's **own** source. Generated projects get
> their own ESLint/Prettier setup from `@cbs-consulting/tools` via the templates.

## Contributing

1. Fork the repository and create a branch
2. Make your changes, with tests
3. Add a line under "Unreleased" in [CHANGELOG.md](CHANGELOG.md), and update the README if the behaviour changes
4. Run `npm test` and `npm run lint` (the pre-commit hook lints and formats staged files)
5. Open a pull request against `main`

Pull requests are merged through a merge queue. Once the checks pass and the
pull request is approved, choose **Merge when ready**: GitHub tests it on top
of `main` and the pull requests queued ahead of it, and merges it when the
checks pass there too. You don't have to update your branch with `main`
first.

Commit messages are free-form; describe what changed and why. The changelog,
not the commit history, is what users read.
