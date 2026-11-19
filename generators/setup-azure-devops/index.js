import chalk from "chalk";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Generator from "yeoman-generator";
import { normalizeName } from "../../utils/naming.js";
import { copyTemplateTree } from "../../utils/templates.js";
import {
  applyBestPracticeDefaults,
  azureRepoUrlPrompt,
  detailedAzureDevOpsPrompts,
  parseAzureRepoUrl,
  useBestPracticesPrompt,
} from "../../utils/azureDevOps.js";
import {
  registerAnswersOption,
  warnUnusedAnswers,
} from "../../utils/answers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class extends Generator {
  _tplRoot = resolve(__dirname, "./templates");

  constructor(args, opts) {
    super(args, opts);
    registerAnswersOption(this);
  }

  async initializing() {
    const aPrompt = [];

    aPrompt.push(
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
        default: "My Project",
      },
      azureRepoUrlPrompt(),
      useBestPracticesPrompt(),
    );

    const answers = await this.prompt(aPrompt);

    // Normalize project name for use in subsequent prompts and templates
    answers.projectNameNormalized = normalizeName(answers.projectName);

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

    this.answers = answers;
    warnUnusedAnswers(this);
  }

  writing() {
    this.log(chalk.bold("\n✍️  Writing Azure DevOps setup files..."));

    copyTemplateTree(this, join(__dirname, "templates"), this.answers);
  }

  end() {
    this.log(chalk.bold.green("\n✅ Azure DevOps setup files created."));
    this.log("Next steps:");
    this.log(
      "1) Review/edit scripts/setup-azure-devops/azure-devops.env if needed.",
    );
    this.log(
      "2) Ensure you're logged in to Azure CLI: az login --allow-no-subscriptions",
    );
    this.log(
      "3) Run the setup script: bash scripts/setup-azure-devops/setup.sh",
    );
    this.log(
      "4) See scripts/setup-azure-devops/README.md for detailed instructions.",
    );
  }
}
