---
name: generator-btp
description: >-
  Sets up SAP CAP projects with the cbs BTP Generator (@cbs-consulting/generator-btp, run as
  yo @cbs-consulting/btp). Use when the user wants to create a new CAP project, add linting and
  TypeScript settings to the UI5 apps of a CAP project, add a dev container with the SAP BTP
  toolchain, or set up Azure DevOps branch policies and a pipeline. The skill asks only the
  questions that apply, runs the generator without interactive prompts, and explains the next
  steps.
license: Apache-2.0
---

# cbs BTP Generator

The generator scaffolds SAP CAP projects with ESLint, Prettier, pre-commit hooks, MTA
extensions per environment, a dev container and an Azure DevOps setup. Each part is a
sub-generator. The [README](https://github.com/cbs-consulting/generator-btp#readme) describes
what each one writes; read it when the user asks what they will get, instead of guessing.

The generator asks its questions in an interactive terminal, which an agent cannot answer.
Run it with `--answers` instead: you ask the user, write the answers to a JSON file, and the
generator reads them from there. Never start `yo` without `--answers`; it waits for input
forever.

## 1. Pick the generator

| The user wants to                                      | Generator            | Run it in                       |
| ------------------------------------------------------ | -------------------- | ------------------------------- |
| Start a new CAP project (includes the dev container)   | `cap`                | An empty folder, or its parent  |
| Add lint and TypeScript settings to UI5 apps of CAP    | `ui5`                | The root of the CAP project     |
| Add a dev container to an existing project             | `devcontainer`       | The project root                |
| Set up Azure DevOps branch policies and the pipeline   | `setup-azure-devops` | The project root                |

`cap` already includes the dev container and, with Azure DevOps, the setup script, so do not
run those on top of it. The `ui5` generator needs apps in `app/<name>/ui5.yaml`; a fresh CAP
project has none until the user adds one, for example with the Fiori tools.

## 2. Check the prerequisites

Run these and report what is missing:

```sh
node --version            # 22.22.1 or newer
yo --version
yo @cbs-consulting/btp --help | grep -- --answers   # the generator, recent enough for --answers
cds --version             # only for the cap generator
```

If something is missing, offer the install command and run it only after the user agrees, since
it installs globally:

```sh
npm install -g yo @cbs-consulting/generator-btp @sap/cds-dk
```

`yo` refuses to run as root. If it does, tell the user to run as a normal user or inside a dev
container.

For `ui5`, `devcontainer` and `setup-azure-devops` in an existing project, check `git status`
first. The run overwrites files (see step 4), so ask the user to commit or stash their changes,
or to confirm that you go ahead without.

## 3. Ask the user

Ask everything in one message, show the default for each question, and skip what does not apply
to the chosen generator. [references/answers.md](references/answers.md) lists every answer key,
its default and when it is asked. The decisions that matter:

- **Names.** Project and customer name; they become the package name, the dev container name
  and, for CAP, the database schema.
- **CDS features** (`cap`). All are selected by default except `ams` and `ias`.
- **Azure DevOps.** Whether the project uses it, and the repository URL
  (`https://dev.azure.com/ORG/PROJECT/_git/REPO`). Never make up a URL: ask for it.
- **Pipeline** (`cap` with Azure DevOps). Self-contained, or a template from a shared pipeline
  repository (`PROJECT/REPOSITORY`).
- **Branch policies.** The recommended defaults, or custom branches, reviewers and merge types.
- **Private npm feeds** (`devcontainer` only). Scope, organization, project and feed per feed.
- **Preset.** People at cbs usually want `--preset cbs`: the cbs base image (needs
  `docker login`) and the shared cbs pipeline. Everyone else uses the default. A preset can also
  be a JSON file; the README's "Presets" section explains it.

When the user says "just use the defaults", ask only for what has no default: the Azure DevOps
repository URL, if they use Azure DevOps.

Before you run, show the user the answers as a short list and the command, and wait for a yes.

## 4. Run it

Write the answers to a file outside the project, so they are not committed, then run the
generator with it:

```sh
answers="$(mktemp -d)/answers.json"
cat > "$answers" <<'JSON'
{
  "projectName": "Bookshop",
  "customerName": "Acme",
  "useAzureDevOps": true,
  "azureRepoUrl": "https://dev.azure.com/acme/bookshop/_git/bookshop"
}
JSON
yo @cbs-consulting/btp:cap --answers "$answers" --force
```

- `--force` is needed: the CAP generator rewrites the `package.json` that `cds init` just
  created, and the other generators merge into existing files. Without it, `yo` stops at an
  "Overwrite?" prompt.
- Add `--preset cbs` (or `--preset <file.json>`) if the user chose a preset.
- Add `--skip-install` only if the user does not want `npm install` to run now.
- `cap` runs `cds init` and `npm install` and can take a few minutes. Allow for that in your
  command timeout.
- Prompts without an answer take their default. A wrong answer stops the run with a message
  that names the key, for example `--answers: "azureRepoUrl" is not valid: ...`. Fix that key and
  run again. If `cap` failed after `cds init`, the target folder holds a half-made project;
  ask the user before you delete it.
- A line `--answers: no prompt used "..."` means a key was misspelled or does not apply. Check it.

Do not commit for the user; the generated project is theirs to review.

## 5. Next steps

Summarize what was created (`git status` in the project) and go through the next steps the
generator printed:

- **Azure DevOps.** Review `scripts/setup-azure-devops/azure-devops.env`, then
  `az login --allow-no-subscriptions` and `bash scripts/setup-azure-devops/setup.sh`. The script
  creates branches, policies and a pipeline in the user's Azure DevOps project, so run it only
  when the user asks you to, and let them log in themselves.
- **Dev container.** Reopen or rebuild the folder in the container (VS Code: **Dev Containers:
  Reopen in Container**). With npm feeds, the container asks for a `PAT_<ORG>` token.
- **UI5.** Once the CAP project has UI5 apps, offer to run the `ui5` generator.
- **CAP.** `npm run watch` starts the app; the README lists the other scripts.
