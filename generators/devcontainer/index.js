import chalk from "chalk";
import fs from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Generator from "yeoman-generator";
import { normalizeName } from "../../utils/naming.js";
import { presetFor, registerPresetOption } from "../../utils/presets.js";
import { copyTemplateTree } from "../../utils/templates.js";
import {
  answerQuestions,
  hasProvidedAnswers,
  registerAnswersOption,
  warnUnusedAnswers,
} from "../../utils/answers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function deriveTokenVar(organization) {
  return `PAT_${organization.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

export function buildFeedEntry({ scope, organization, project, feed }) {
  const registryUrl = `https://pkgs.dev.azure.com/${organization}/${project}/_packaging/${feed}/npm/registry/`;
  const tokenVar = deriveTokenVar(organization);
  return `${scope}|${registryUrl}|${tokenVar}`;
}

const FEED_QUESTIONS = [
  {
    type: "input",
    name: "scope",
    message: "npm scope (e.g. @myorg):",
    validate(v) {
      return v.startsWith("@") && v.length > 1
        ? true
        : "Scope must start with @";
    },
  },
  {
    type: "input",
    name: "organization",
    message: "Azure DevOps organization:",
    validate(v) {
      return v.trim().length > 0 ? true : "Organization must not be empty";
    },
  },
  {
    type: "input",
    name: "project",
    message: "Azure DevOps project:",
    validate(v) {
      return v.trim().length > 0 ? true : "Project must not be empty";
    },
  },
  {
    type: "input",
    name: "feed",
    message: "Azure DevOps feed name:",
    validate(v) {
      return v.trim().length > 0 ? true : "Feed name must not be empty";
    },
  },
];

// With --answers, the feeds come as an "npmFeeds" array of
// { scope, organization, project, feed } objects instead of a prompt loop.
async function npmFeedsFromAnswers(generator) {
  const provided = generator._providedAnswers;
  generator._usedAnswers.add("addFeeds");
  generator._usedAnswers.add("npmFeeds");
  const feeds = provided.npmFeeds ?? [];
  if (!Array.isArray(feeds)) {
    throw new Error(
      '--answers: "npmFeeds" must be an array of { scope, organization, project, feed } objects.',
    );
  }
  if (provided.addFeeds === true && feeds.length === 0) {
    throw new Error(
      '--answers: "addFeeds" is true, but "npmFeeds" lists no feed.',
    );
  }

  const feedEntries = [];
  for (const [index, feed] of feeds.entries()) {
    if (typeof feed !== "object" || feed === null || Array.isArray(feed)) {
      throw new Error(
        `--answers: "npmFeeds[${index}]" must be a { scope, organization, project, feed } object.`,
      );
    }
    const label = `--answers "npmFeeds[${index}]"`;
    const known = FEED_QUESTIONS.map((question) => question.name);
    const unknown = Object.keys(feed).filter((key) => !known.includes(key));
    if (unknown.length > 0) {
      throw new Error(
        `${label} has unknown key(s) ${unknown.join(", ")}. Allowed: ${known.join(", ")}.`,
      );
    }
    const answered = await answerQuestions(
      FEED_QUESTIONS,
      feed,
      new Set(),
      label,
    );
    feedEntries.push(buildFeedEntry(answered));
  }
  return feedEntries.join(";");
}

async function promptNpmFeeds(generator) {
  if (hasProvidedAnswers(generator)) {
    return npmFeedsFromAnswers(generator);
  }

  const { addFeeds } = await generator.prompt([
    {
      type: "confirm",
      name: "addFeeds",
      message: "Add private Azure DevOps npm feeds?",
      default: false,
    },
  ]);

  if (!addFeeds) {
    return "";
  }

  const feedEntries = [];
  let addMore = true;

  while (addMore) {
    const feed = await generator.prompt(FEED_QUESTIONS);

    feedEntries.push(buildFeedEntry(feed));

    const { another } = await generator.prompt([
      {
        type: "confirm",
        name: "another",
        message: "Add another feed?",
        default: false,
      },
    ]);
    addMore = another;
  }

  return feedEntries.join(";");
}

export default class extends Generator {
  _tplRoot = resolve(__dirname, "./templates");

  constructor(args, opts) {
    super(args, opts);
    registerPresetOption(this);
    registerAnswersOption(this);
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
        default: "My Project",
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
    );

    const answers = await this.prompt(aPrompt);

    answers.projectNameNormalized = normalizeName(answers.projectName);
    answers.customerNameNormalized = normalizeName(answers.customerName);
    answers.npmFeedsString = await promptNpmFeeds(this);
    answers.baseImage = preset.baseImage;

    // Change the destination root when a custom target directory is specified
    const targetDir = answers.targetDirectory.trim();
    if (targetDir !== ".") {
      const resolvedTarget = resolve(this.destinationRoot(), targetDir);
      fs.mkdirSync(resolvedTarget, { recursive: true });
      this.destinationRoot(resolvedTarget);
    }

    this.answers = answers;
    warnUnusedAnswers(this);
  }

  writing() {
    this.log(chalk.bold("\n✍️  Writing .devcontainer files..."));

    copyTemplateTree(this, join(__dirname, "templates"), this.answers);
  }

  end() {
    this.log(chalk.bold.green("\n✅ Dev container configuration added."));
    this.log("Next steps:");
    this.log("1) Review the .devcontainer/devcontainer.json.");
    this.log(
      "2) Pin feature versions (node, btp-cli-tools, cap/fiori stacks) if needed.",
    );
    if (this.answers.npmFeedsString) {
      this.log(
        "3) Set the PAT env vars (e.g. PAT_MYORG) via containerEnv or VS Code secrets,",
      );
      this.log(
        "   or let the npm-feeds post-create script prompt you interactively.",
      );
    }
  }
}
