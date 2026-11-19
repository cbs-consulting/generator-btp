# Answer keys for `--answers`

`--answers` takes a JSON file or a JSON string. Every key is optional unless it has no default;
a missing key takes the default, as if the user pressed Enter. Keys are checked: a wrong type
or an invalid value stops the run with the key's name, and a key no prompt used is reported.

## `app` (`yo @cbs-consulting/btp`)

| Key    | Type   | Default | Values                                                 |
| ------ | ------ | ------- | ------------------------------------------------------ |
| `kind` | string | none    | `cap`, `ui5`, `devcontainer`, `setup-azure-devops`     |

The same file is passed on to the chosen generator, so it holds that generator's keys too.
Calling the generator directly (`yo @cbs-consulting/btp:cap`) needs no `kind`.

## `cap`

| Key                  | Type     | Default                                     | Asked when             |
| -------------------- | -------- | ------------------------------------------- | ---------------------- |
| `targetDirectory`    | string   | `.` (created if missing)                    | always                 |
| `projectName`        | string   | `My new CAP project`                        | always                 |
| `customerName`       | string   | `My Customer`                               | always                 |
| `dbSchema`           | string   | project name in upper case, `_` for others  | always                 |
| `cdsFeatures`        | string[] | all of the list below except `ams`, `ias`   | always                 |
| `useAzureDevOps`     | boolean  | `true`                                      | always                 |
| `azureRepoUrl`       | string   | none: `https://dev.azure.com/ORG/PROJECT/_git/REPO` | `useAzureDevOps` |
| `pipelineRepository` | string   | the preset's (`""` = self-contained)        | `useAzureDevOps`       |
| `useBestPractices`   | boolean  | `true`                                      | `useAzureDevOps`       |
| branch policy keys   |          | see below                                   | `useBestPractices` is `false` |

CDS features: `typescript`, `mta`, `xsuaa`, `ams`, `ias`, `hana`, `sqlite`, `html5-repo`,
`tiny-sample`, `http`, `test`. At least one is needed.

## `devcontainer`

| Key               | Type     | Default       | Notes                                              |
| ----------------- | -------- | ------------- | -------------------------------------------------- |
| `targetDirectory` | string   | `.`           |                                                    |
| `projectName`     | string   | `My Project`  |                                                    |
| `customerName`    | string   | `My Customer` |                                                    |
| `npmFeeds`        | object[] | `[]`          | `{ "scope", "organization", "project", "feed" }`   |

Each feed's `scope` starts with `@`, for example
`{ "scope": "@acme", "organization": "acme", "project": "shared", "feed": "npm" }`.
The container reads its token from `PAT_<ORGANIZATION>`.

## `setup-azure-devops`

| Key                | Type    | Default      | Asked when                    |
| ------------------ | ------- | ------------ | ----------------------------- |
| `projectName`      | string  | `My Project` | always                        |
| `azureRepoUrl`     | string  | none         | always                        |
| `useBestPractices` | boolean | `true`       | always                        |
| branch policy keys |         | see below    | `useBestPractices` is `false` |

## `ui5`

Asks nothing.

## Branch policy keys

Read only when `useBestPractices` is `false`. The defaults are the recommended values.

| Key                      | Type    | Default                      |
| ------------------------ | ------- | ---------------------------- |
| `mainBranch`             | string  | `main`                       |
| `devBranch`              | string  | `development`                |
| `setDevBranchAsDefault`  | boolean | `true`                       |
| `minReviewers`           | number  | `1`                          |
| `mainResetOnSourcePush`  | boolean | `true`                       |
| `mainAllowSquashMerge`   | boolean | `true`                       |
| `mainAllowRebaseMerge`   | boolean | `true`                       |
| `mainAllowRebase`        | boolean | `false`                      |
| `mainAllowNoFastForward` | boolean | `false`                      |
| `devAllowSquashMerge`    | boolean | `true`                       |
| `devAllowRebaseMerge`    | boolean | `true`                       |
| `devAllowRebase`         | boolean | `false`                      |
| `devAllowNoFastForward`  | boolean | `false`                      |
| `pipelineName`           | string  | the normalized project name  |
| `pipelineYamlPath`       | string  | `azure-pipelines.yml`        |
