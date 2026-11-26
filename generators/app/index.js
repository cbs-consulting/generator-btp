import Generator from "yeoman-generator";
import chalk from "chalk";
import yosay from "yosay";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { registerPresetOption } from "../../utils/presets.js";
import { registerAnswersOption } from "../../utils/answers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    registerPresetOption(this);
    registerAnswersOption(this);
  }

  async prompting() {
    this.log(
      yosay(
        `Hey, welcome to the ${chalk.hex("e38330")("@cbs-consulting/generator-btp")}. I'm pretty sure, you will love me!`,
      ),
    );

    const { kind } = await this.prompt([
      {
        type: "select",
        name: "kind",
        message: "What do you want to do?",
        choices: [
          {
            name: "Bootstrap a new CAP project",
            value: "cap",
          },
          {
            name: "Add best practices to UI5 apps in a CAP project",
            value: "ui5",
          },
          {
            name: "Add devcontainer configuration",
            value: "devcontainer",
          },
          {
            name: "Setup Azure DevOps configuration",
            value: "setup-azure-devops",
          },
        ],
      },
    ]);

    this.kind = kind;
  }

  async writing() {
    if (this.kind === "cap") {
      const { default: CapGenerator } = await import("../cap/index.js");
      await this.composeWith(
        {
          Generator: CapGenerator,
          path: resolve(__dirname, "../cap"),
        },
        { preset: this.options.preset, answers: this.options.answers },
      );
    } else if (this.kind === "ui5") {
      const { default: Ui5Generator } = await import("../ui5/index.js");
      await this.composeWith(
        {
          Generator: Ui5Generator,
          path: resolve(__dirname, "../ui5"),
        },
        { answers: this.options.answers },
      );
    } else if (this.kind === "devcontainer") {
      const { default: DevcontainerGenerator } =
        await import("../devcontainer/index.js");
      await this.composeWith(
        {
          Generator: DevcontainerGenerator,
          path: resolve(__dirname, "../devcontainer"),
        },
        { preset: this.options.preset, answers: this.options.answers },
      );
    } else if (this.kind === "setup-azure-devops") {
      const { default: SetupAzureDevOpsGenerator } =
        await import("../setup-azure-devops/index.js");
      await this.composeWith(
        {
          Generator: SetupAzureDevOpsGenerator,
          path: resolve(__dirname, "../setup-azure-devops"),
        },
        { answers: this.options.answers },
      );
    } else {
      this.log(chalk.red("Unknown selection"));
    }
  }

  end() {
    this.log(chalk.green("Done."));
  }
}
