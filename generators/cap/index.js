import chalk from "chalk";
import mergewith from "lodash.mergewith";
import fs from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Generator from "yeoman-generator";
import {
  mergeArray,
  readJsonC,
  readJsonCSafe,
  sortPackageJson,
} from "../../utils/jsonFile.js";
import { spawnCommandSyncOrThrow } from "../../utils/spawn.js";
import { normalizeName } from "../../utils/naming.js";
import { presetFor, registerPresetOption } from "../../utils/presets.js";
import {
  applyBestPracticeDefaults,
  azureRepoUrlPrompt,
  detailedAzureDevOpsPrompts,
  parseAzureRepoUrl,
  useBestPracticesPrompt,
} from "../../utils/azureDevOps.js";
import { copyTemplateTree } from "../../utils/templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class extends Generator {
  _tplRoot = resolve(__dirname, "./templates");
  _addRoot = resolve(__dirname, "./additions");
  _capRoot = __dirname;

  constructor(args, opts) {
    super(args, opts);
    registerPresetOption(this);
  }

  async initializing() {
    const preset = presetFor(this);
    const aPrompt = [];

    aPrompt.push(
      {
        type: "input",
        name: "targetDirectory",
        message:
          "Enter the target directory for the project (use '.' to generate in the current directory):",
        default: ".",
        validate(sInput) {
          if (sInput.trim().length > 0) {
            return true;
          }
          return "Target directory must not be empty.";
        },
      },
      {
        type: "input",
        name: "projectName",
        message: "Enter the project name:",
        validate(sInput) {
          if (sInput.length > 0) {
            return true;
          }
          return "Project name must not be empty.";
        },
        default: "My new CAP project",
      },
      {
        type: "input",
        name: "customerName",
        message: "Enter the customer's name:",
        validate(sInput) {
          if (sInput.length > 0) {
            return true;
          }
          return "Customer name must not be empty.";
        },
        default: "My Customer",
      },
      {
        type: "input",
        name: "dbSchema",
        message: "Enter the database schema name?",
        validate(sInput) {
          if (sInput.length > 0) {
            return true;
          }
          return "Database schema name must not be empty.";
        },
        default(answers) {
          // Use project name in uppercase with underscores instead of special characters
          return answers.projectName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "_")
            .replace(/_+/g, "_") // Replace multiple underscores with single underscore
            .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
        },
      },
      {
        type: "checkbox",
        name: "cdsFeatures",
        message: "Select the CDS features to add (via cds add ...):",
        choices: [
          { name: "typescript", value: "typescript", checked: true },
          { name: "mta", value: "mta", checked: true },
          { name: "xsuaa", value: "xsuaa", checked: true },
          { name: "ams", value: "ams", checked: true },
          { name: "ias", value: "ias", checked: true },
          { name: "hana", value: "hana", checked: true },
          { name: "sqlite", value: "sqlite", checked: true },
          { name: "html5-repo", value: "html5-repo", checked: true },
          { name: "tiny-sample", value: "tiny-sample", checked: true },
          { name: "http", value: "http", checked: true },
          { name: "test", value: "test", checked: true },
        ],
        validate(selected) {
          if (selected.length > 0) {
            return true;
          }
          return "At least one CDS feature must be selected.";
        },
      },
      {
        type: "confirm",
        name: "useAzureDevOps",
        message: "Is Azure DevOps used for version control and CI/CD?",
        default: true,
      },
    );

    const answers = await this.prompt(aPrompt);

    // Normalize names for use in subsequent prompts and templates
    answers.projectNameNormalized = normalizeName(answers.projectName);
    answers.customerNameNormalized = normalizeName(answers.customerName);
    answers.pipelineAlias = "cap";
    answers.baseImage = preset.baseImage;

    // Change the destination root when a custom target directory is specified
    const targetDir = answers.targetDirectory.trim();
    if (targetDir !== ".") {
      const resolvedTarget = resolve(this.destinationRoot(), targetDir);
      fs.mkdirSync(resolvedTarget, { recursive: true });
      this.destinationRoot(resolvedTarget);
    }

    // If using Azure DevOps, prompt for additional configuration
    if (answers.useAzureDevOps) {
      this.log(chalk.bold("\n⚙️  Configuring Azure DevOps settings..."));

      // First, ask for repository URL
      const initialAzurePrompts = [
        azureRepoUrlPrompt(),
        {
          type: "input",
          name: "pipelineRepository",
          message:
            "Enter the shared pipeline repository path (PROJECT/REPOSITORY):",
          default: preset.pipelineRepository,
          validate(input) {
            if (/^[^/\s]+\/[^/\s]+$/.test(input.trim())) {
              return true;
            }
            return "Enter the shared pipeline repository as PROJECT/REPOSITORY.";
          },
        },
        useBestPracticesPrompt(),
      ];

      const initialAzureAnswers = await this.prompt(initialAzurePrompts);
      Object.assign(answers, initialAzureAnswers);
      answers.pipelineRepository =
        answers.pipelineRepository?.trim() || preset.pipelineRepository;

      // Parse Azure DevOps repository URL to extract organization, project, and repo names
      const parsedRepo = parseAzureRepoUrl(answers.azureRepoUrl);
      if (parsedRepo) {
        Object.assign(answers, parsedRepo);
      }

      // If not using best practices, ask for detailed configuration
      if (!answers.useBestPractices) {
        const detailedAzureAnswers = await this.prompt(
          detailedAzureDevOpsPrompts(answers.projectNameNormalized),
        );
        Object.assign(answers, detailedAzureAnswers);
      } else {
        applyBestPracticeDefaults(answers);

        this.log(
          chalk.green(
            "✓ Using best practice defaults for Azure DevOps configuration",
          ),
        );
      }
    }

    // Check if .git directory exists, if not run git init
    if (!fs.existsSync(this.destinationPath(".git"))) {
      this.log(chalk.bold("\n🔧 Initializing git repository..."));
      spawnCommandSyncOrThrow(
        this,
        "git",
        ["init"],
        undefined,
        "Failed to initialize a git repository. Ensure git is installed and on your PATH.",
      );
    }

    this.log(chalk.bold("\n🚀 Initializing CAP project..."));
    spawnCommandSyncOrThrow(
      this,
      "cds",
      ["init", "--add", answers.cdsFeatures.join(",")],
      { cwd: this.destinationPath() },
      "`cds init` failed. Ensure @sap/cds-dk is installed globally:\n  npm install -g @sap/cds-dk",
    );

    answers.npmFeedsString = "";

    this.answers = answers;
  }

  writing() {
    this.log(chalk.bold("\n✍️  Writing files..."));

    // 1) Copy CAP-specific templates
    copyTemplateTree(this, join(__dirname, "templates"), this.answers, {
      skip: (fileName) =>
        fileName === "azure-pipelines.yaml" && !this.answers.useAzureDevOps,
    });

    // 2) Copy devcontainer files from the devcontainer generator
    copyTemplateTree(
      this,
      resolve(__dirname, "../devcontainer/templates"),
      this.answers,
    );

    // 3) Copy Azure DevOps setup files from the setup-azure-devops generator
    if (this.answers.useAzureDevOps) {
      copyTemplateTree(
        this,
        resolve(__dirname, "../setup-azure-devops/templates"),
        this.answers,
      );
    }

    // 4) Merge additions into existing files
    // package.json
    const destPkgPath = this.destinationPath("package.json");
    const srcPkgPath = join(this._addRoot, "package.json");
    const destPkg = readJsonCSafe(this, destPkgPath, {});
    const addPkg = readJsonC(srcPkgPath, {});
    const mergedPkg = mergewith({}, destPkg, addPkg, mergeArray);
    mergedPkg.name = this.answers.projectNameNormalized;
    this.fs.writeJSON(destPkgPath, sortPackageJson(mergedPkg));

    // tsconfig.json
    const destTsPath = this.destinationPath("tsconfig.json");
    const srcTsPath = join(this._addRoot, "tsconfig.json");
    const destTs = readJsonCSafe(this, destTsPath, {});
    const addTs = readJsonC(srcTsPath, {});
    const mergedTs = mergewith({}, destTs, addTs, mergeArray);
    this.fs.writeJSON(destTsPath, mergedTs);

    // .vscode/settings.json
    const destVsSettingsPath = this.destinationPath(".vscode/settings.json");
    const addVsSettingsPath = join(this._addRoot, ".vscode/settings.json");
    const destVsSettings = readJsonCSafe(this, destVsSettingsPath, {});
    const addVsSettings = readJsonC(addVsSettingsPath, {});
    const mergedVsSettings = mergewith(
      {},
      destVsSettings,
      addVsSettings,
      mergeArray,
    );
    this.fs.writeJSON(destVsSettingsPath, mergedVsSettings);

    // Remove undeploy.json from db folder
    const undeployPath = this.destinationPath("db/undeploy.json");
    this.fs.delete(undeployPath);
  }

  install() {
    if (this.options.skipInstall) {
      return;
    }

    this.log(chalk.bold("\n📦 Installing npm dependencies..."));
    const dependenciesPath = join(this._capRoot, "dependencies.json");
    const dependencies = readJsonCSafe(this, dependenciesPath, {});
    const devDeps = Array.isArray(dependencies.devDependencies)
      ? dependencies.devDependencies
      : [];
    if (devDeps.length > 0) {
      this.spawnCommandSync(
        "npm",
        ["install", "--save-dev", "--save-exact"].concat(devDeps),
      );
    }
  }

  end() {
    // Only the generated scripts/ folder needs this; scanning the whole
    // project would also walk node_modules.
    const scriptsDir = this.destinationPath("scripts");
    if (os.platform() !== "win32" && fs.existsSync(scriptsDir)) {
      this.log(
        chalk.bold("\n🔧 Setting execute permissions for shell scripts..."),
      );

      this.spawnCommandSync("find", [
        scriptsDir,
        "-name",
        "*.sh",
        "-exec",
        "chmod",
        "+x",
        "{}",
        ";",
      ]);
    }

    // simple-git-hooks needs the installed package on disk, so only wire up the
    // hooks when dependencies were actually installed.
    if (!this.options.skipInstall) {
      this.log(chalk.bold("\n🪝  Initializing simple git hooks..."));
      this.spawnCommandSync("npx", ["simple-git-hooks"]);
    }

    this.log(chalk.bold.green("\n✅ CAP best practices applied."));
    this.log("Next steps:");
    this.log("1) Review/commit the changes.");

    if (this.answers.useAzureDevOps) {
      this.log("2) Configure Azure DevOps branch policies and pipeline:");
      this.log(
        "   a) Review/edit scripts/setup-azure-devops/azure-devops.env if needed",
      );
      this.log(
        "   b) Ensure you're logged in to Azure CLI: az login --allow-no-subscriptions",
      );
      this.log(
        "   c) Run the setup script: bash scripts/setup-azure-devops/setup.sh",
      );
      this.log(
        "   d) See scripts/setup-azure-devops/README.md for detailed instructions",
      );
    }
  }
}
